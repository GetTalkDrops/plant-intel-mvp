import os
from typing import List, Dict, Optional
from supabase import create_client
from dotenv import load_dotenv
import pandas as pd
import numpy as np
from ai.pattern_explainer import PatternExplainer
from analytics.baseline_tracker import BaselineTracker
from analytics.trend_detector import TrendDetector
from analytics.degradation_detector import DegradationDetector
from analytics.correlation_analyzer import CorrelationAnalyzer

class CostAnalyzer:
    def __init__(self):
        load_dotenv('../.env.local')
        
        url = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
        key = os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY")
        
        if not url or not key:
            raise ValueError("Missing Supabase credentials")
        
        self.supabase = create_client(url, key)
        self.LABOR_RATE_PER_HOUR = 200
        self.explainer = PatternExplainer(labor_rate_per_hour=self.LABOR_RATE_PER_HOUR)
        self.baseline_tracker = BaselineTracker(self.supabase)
        self.trend_detector = TrendDetector(self.supabase)
        self.degradation_detector = DegradationDetector(self.supabase)
        self.correlation_analyzer = CorrelationAnalyzer(self.supabase)

    def _calculate_confidence(self, row, df, all_patterns):
        """Calculate dynamic confidence based on pattern strength and data quality"""
        confidence = 60
        
        material_code = row.get('material_code')
        if material_code and pd.notna(material_code):
            pattern_size = len(df[df['material_code'] == material_code])
            if pattern_size >= 8:
                confidence += 20
            elif pattern_size >= 5:
                confidence += 15
            elif pattern_size >= 3:
                confidence += 10
        
        complete_fields = sum([
            bool(row.get('material_code')) and pd.notna(row.get('material_code')),
            bool(row.get('supplier_id')) and pd.notna(row.get('supplier_id')),
            row.get('planned_material_cost', 0) > 0,
            row.get('actual_material_cost', 0) > 0,
            row.get('planned_labor_hours', 0) > 0,
            row.get('actual_labor_hours', 0) > 0
        ])
        confidence += complete_fields * 2
        
        variance_pct = abs(row['total_variance']) / row['total_planned'] * 100 if row['total_planned'] > 0 else 0
        if variance_pct > 30:
            confidence += 8
        elif variance_pct > 15:
            confidence += 5
        
        return min(92, confidence) / 100
        
    def _calculate_variance_context(self, row, df):
        """Calculate how variance compares to historical average for this work order type"""
        
        wo_number = str(row.get('work_order_number', ''))
        if '-' in wo_number:
            wo_type = wo_number.split('-')[1]
        else:
            return {'material': None, 'labor': None}
        
        similar_orders = df[df['work_order_number'].str.contains(wo_type, na=False)]
        
        if len(similar_orders) < 5:
            return {'material': None, 'labor': None}
        
        avg_material_var = abs(similar_orders['material_variance']).mean()
        avg_labor_var = abs(similar_orders['labor_variance']).mean()
        
        material_ratio = abs(row['material_variance']) / avg_material_var if avg_material_var > 0 else 1.0
        labor_ratio = abs(row['labor_variance']) / avg_labor_var if avg_labor_var > 0 else 1.0
        
        def format_context(ratio):
            if ratio > 2.5:
                return f"{ratio:.1f}x higher than typical"
            elif ratio > 1.5:
                return f"{ratio:.1f}x above average"
            elif ratio > 0.7:
                return "within normal range"
            else:
                return f"{ratio:.1f}x below typical"
        
        return {
            'material': format_context(material_ratio),
            'labor': format_context(labor_ratio)
        }
    
    def _add_baseline_context(self, row, facility_id: int, baselines_cache: Dict) -> Dict:
        """Add baseline comparison context to a work order row"""
        context = {}
        
        # Material cost baseline
        material_code = row.get('material_code')
        if material_code and pd.notna(material_code):
            baseline_key = f"material_cost_{material_code}"
            if baseline_key not in baselines_cache:
                baselines_cache[baseline_key] = self.baseline_tracker.get_baseline(
                    facility_id, 'material_cost', material_code
                )
            
            baseline = baselines_cache[baseline_key]
            if baseline:
                current_cost = row.get('actual_material_cost', 0)
                baseline_avg = baseline['rolling_avg']
                
                deviation = self.trend_detector.calculate_deviation(current_cost, baseline_avg)
                trend_info = self.trend_detector.detect_trend_start(
                    facility_id, 'material_cost', material_code,
                    current_cost, baseline_avg, baseline.get('rolling_std', 0)
                )
                
                context['material_baseline'] = {
                    'current': current_cost,
                    'baseline': baseline_avg,
                    'deviation_pct': deviation['deviation_pct'],
                    'direction': deviation['direction'],
                    'multiplier': deviation['multiplier'],
                    'narrative': self.trend_detector.format_comparative_text(
                        current_cost, baseline_avg, f"Material {material_code}", trend_info
                    ),
                    'trend_start': trend_info
                }
        
        # Labor hours baseline
        operation_type = row.get('operation_type', 'general')
        baseline_key = f"labor_hours_{operation_type}"
        if baseline_key not in baselines_cache:
            baselines_cache[baseline_key] = self.baseline_tracker.get_baseline(
                facility_id, 'labor_hours', operation_type
            )
        
        baseline = baselines_cache[baseline_key]
        if baseline:
            current_hours = row.get('actual_labor_hours', 0)
            baseline_avg = baseline['rolling_avg']
            
            deviation = self.trend_detector.calculate_deviation(current_hours, baseline_avg)
            trend_info = self.trend_detector.detect_trend_start(
                facility_id, 'labor_hours', operation_type,
                current_hours, baseline_avg, baseline.get('rolling_std', 0)
            )
            
            context['labor_baseline'] = {
                'current': current_hours,
                'baseline': baseline_avg,
                'deviation_pct': deviation['deviation_pct'],
                'direction': deviation['direction'],
                'multiplier': deviation['multiplier'],
                'narrative': self.trend_detector.format_comparative_text(
                    current_hours, baseline_avg, "Labor hours", trend_info
                ),
                'trend_start': trend_info
            }
        
        return context
    
    def predict_cost_variance(self, facility_id: int = 1, batch_id: Optional[str] = None, config: dict = None) -> Dict:
        """Analyze cost variances with rich pattern narratives and baseline comparisons"""
        
        if config is None:
            config = {}
        
        labor_rate = config.get('labor_rate_hourly', 200)
        variance_threshold_pct = config.get('variance_threshold_pct', 5)
        min_variance_amount = config.get('min_variance_amount', 1000)
        pattern_min_orders = config.get('pattern_min_orders', 3)
        excluded_suppliers = config.get('excluded_suppliers', [])
        excluded_materials = config.get('excluded_materials', [])
        
        query = self.supabase.table("work_orders").select("*").eq("facility_id", facility_id)
        
        if batch_id:
            query = query.eq("uploaded_csv_batch", batch_id)
        else:
            recent_batch = self.supabase.table("work_orders")\
                .select("uploaded_csv_batch")\
                .eq("facility_id", facility_id)\
                .order("uploaded_csv_batch")\
                .execute()
            
            if recent_batch.data and len(recent_batch.data) > 0:
                batch_id = recent_batch.data[-1]["uploaded_csv_batch"]
                query = query.eq("uploaded_csv_batch", batch_id)
        
        response = query.execute()
        
        if not response.data or len(response.data) == 0:
            return {
                "status": "error",
                "error": "no_data",
                "message": "No work order data found for analysis.",
            }
        
        df = pd.DataFrame(response.data)
        
        if excluded_suppliers and 'supplier_id' in df.columns:
            df = df[~df['supplier_id'].isin(excluded_suppliers)]
        if excluded_materials and 'material_code' in df.columns:
            df = df[~df['material_code'].isin(excluded_materials)]
        
        required_fields = [
            "planned_material_cost",
            "actual_material_cost",
            "planned_labor_hours",
            "actual_labor_hours",
        ]
        
        missing_fields = []
        empty_fields = []
        
        for field in required_fields:
            if field not in df.columns:
                missing_fields.append(field)
            elif df[field].isna().all() or (df[field] == 0).all():
                empty_fields.append(field)
        
        if missing_fields or empty_fields:
            all_missing = missing_fields + empty_fields
            return {
                "status": "insufficient_data",
                "error": "insufficient_data",
                "message": f"Cannot analyze cost variance. Missing or empty fields: {', '.join(all_missing)}",
                "missing_fields": all_missing,
            }
        
        df["material_variance"] = df["actual_material_cost"] - df["planned_material_cost"]
        df["labor_cost_planned"] = df["planned_labor_hours"] * labor_rate
        df["labor_cost_actual"] = df["actual_labor_hours"] * labor_rate
        df["labor_variance"] = df["labor_cost_actual"] - df["labor_cost_planned"]
        df["total_variance"] = df["material_variance"] + df["labor_variance"]
        
        df["total_planned"] = df["planned_material_cost"] + df["labor_cost_planned"]
        avg_order_value = df["total_planned"].mean()
        variance_threshold = max(min_variance_amount, avg_order_value * (variance_threshold_pct / 100))
        
        significant = df[abs(df["total_variance"]) > variance_threshold].copy()
        
        if len(significant) == 0:
            return {
                "status": "success",
                "predictions": [],
                "patterns": [],
                "total_impact": 0,
                "message": f"No significant cost variances detected (threshold: ${variance_threshold:,.0f})",
            }
        
        # Cache for baseline lookups
        baselines_cache = {}
        
        # Detect patterns - Material codes WITH NARRATIVES AND BASELINES
        material_patterns = []
        if "material_code" in df.columns and df["material_code"].notna().any():
            material_groups = significant.groupby("material_code").agg({
                "total_variance": ["count", "sum", "mean"],
                "work_order_number": lambda x: list(x),
                "actual_material_cost": "mean"
            }).reset_index()
            
            material_groups.columns = ["material_code", "order_count", "total_impact", "avg_variance", "work_orders", "avg_cost"]
            material_groups = material_groups[material_groups["order_count"] >= pattern_min_orders]
            
            for _, row in material_groups.iterrows():
                material_work_orders = significant[
                    significant["material_code"] == row["material_code"]
                ].to_dict('records')
                
                pattern_data = {
                    "identifier": row["material_code"],
                    "order_count": int(row["order_count"]),
                    "total_impact": float(row["total_impact"]),
                    "avg_variance": float(row["avg_variance"]),
                    "work_orders": row["work_orders"]
                }
                
                narrative = self.explainer.explain_material_pattern(
                    pattern_data,
                    material_work_orders,
                    df
                )
                
                # Add baseline context
                baseline = self.baseline_tracker.get_baseline(facility_id, 'material_cost', row["material_code"])
                baseline_context = None
                if baseline:
                    current_avg = row["avg_cost"]
                    baseline_avg = baseline['rolling_avg']
                    deviation = self.trend_detector.calculate_deviation(current_avg, baseline_avg)
                    trend_info = self.trend_detector.detect_trend_start(
                        facility_id, 'material_cost', row["material_code"],
                        current_avg, baseline_avg, baseline.get('rolling_std', 0)
                    )
                    baseline_context = {
                        'baseline_avg': baseline_avg,
                        'current_avg': current_avg,
                        'deviation_pct': deviation['deviation_pct'],
                        'direction': deviation['direction'],
                        'narrative': self.trend_detector.format_comparative_text(
                            current_avg, baseline_avg, f"Material {row['material_code']}", trend_info
                        ),
                        'trend_start': trend_info
                    }
                
                # Add cost trend analysis (30-day window)
                cost_trend = self.degradation_detector.detect_cost_trend(
                    facility_id, row["material_code"], window_days=30
                )
                
                # Add correlation analysis if cost is trending
                correlations = []
                if cost_trend:
                    correlations = self.correlation_analyzer.find_cost_correlations(
                        facility_id, row["material_code"],
                        inflection_date=cost_trend.get('inflection_date'),
                        window_days=30
                    )
                
                pattern_dict = {
                    "type": "material",
                    "identifier": row["material_code"],
                    "order_count": int(row["order_count"]),
                    "total_impact": float(row["total_impact"]),
                    "avg_variance": float(row["avg_variance"]),
                    "work_orders": row["work_orders"],
                    "narrative": narrative,
                    "baseline_context": baseline_context
                }
                
                # Add optional fields if present
                if cost_trend:
                    pattern_dict['cost_trend'] = cost_trend
                if correlations:
                    pattern_dict['correlations'] = correlations
                
                material_patterns.append(pattern_dict)
        
        # Detect patterns - Supplier IDs WITH NARRATIVES
        supplier_patterns = []
        if "supplier_id" in df.columns and df["supplier_id"].notna().any():
            supplier_groups = significant.groupby("supplier_id").agg({
                "total_variance": ["count", "sum", "mean"],
                "work_order_number": lambda x: list(x)
            }).reset_index()
            
            supplier_groups.columns = ["supplier_id", "order_count", "total_impact", "avg_variance", "work_orders"]
            supplier_groups = supplier_groups[supplier_groups["order_count"] >= pattern_min_orders]
            
            for _, row in supplier_groups.iterrows():
                supplier_work_orders = significant[
                    significant["supplier_id"] == row["supplier_id"]
                ].to_dict('records')
                
                pattern_data = {
                    "identifier": row["supplier_id"],
                    "order_count": int(row["order_count"]),
                    "total_impact": float(row["total_impact"]),
                    "avg_variance": float(row["avg_variance"]),
                    "work_orders": row["work_orders"]
                }
                
                narrative = self.explainer.explain_supplier_pattern(
                    pattern_data,
                    supplier_work_orders,
                    df
                )
                
                supplier_patterns.append({
                    "type": "supplier",
                    "identifier": row["supplier_id"],
                    "order_count": int(row["order_count"]),
                    "total_impact": float(row["total_impact"]),
                    "avg_variance": float(row["avg_variance"]),
                    "work_orders": row["work_orders"],
                    "narrative": narrative
                })
        
        all_patterns = material_patterns + supplier_patterns
        all_patterns.sort(key=lambda x: abs(x["total_impact"]), reverse=True)
        
        # Build predictions for individual work orders WITH BASELINE CONTEXT
        predictions = []
        for _, row in significant.nlargest(20, "total_variance", keep="all").iterrows():
            material_pct = (abs(row["material_variance"]) / abs(row["total_variance"]) * 100) if row["total_variance"] != 0 else 50
            labor_pct = 100 - material_pct
            
            risk_level = "critical" if abs(row["total_variance"]) > variance_threshold * 5 else \
                         "high" if abs(row["total_variance"]) > variance_threshold * 2 else \
                         "medium"
            
            variance_context = self._calculate_variance_context(row, df)
            baseline_context = self._add_baseline_context(row, facility_id, baselines_cache)
            
            predictions.append({
                "work_order_number": row["work_order_number"],
                "predicted_variance": float(row["total_variance"]),
                "confidence": self._calculate_confidence(row, df, all_patterns),
                "risk_level": risk_level,
                "analysis": {
                    "variance_breakdown": {
                        "material": {
                            "planned": float(row["planned_material_cost"]),
                            "actual": float(row["actual_material_cost"]),
                            "variance": float(row["material_variance"]),
                            "percentage": float(material_pct),
                            "variance_pct": float(material_pct),
                            "driver": "Material cost variance",
                            "context": variance_context['material']
                        },
                        "labor": {
                            "planned": float(row["labor_cost_planned"]),
                            "actual": float(row["labor_cost_actual"]),
                            "variance": float(row["labor_variance"]),
                            "percentage": float(labor_pct),
                            "variance_pct": float(labor_pct),
                            "hours_variance": float(row["actual_labor_hours"] - row["planned_labor_hours"]),
                            "driver": "Labor hours variance",
                            "context": variance_context['labor']
                        }
                    },
                    "primary_driver": "material" if material_pct > 50 else "labor",
                    "baseline_context": baseline_context
                }
            })
        
        total_impact = float(significant["total_variance"].sum())
        
        total_savings = 0
        for pattern in all_patterns:
            if pattern.get('narrative'):
                if pattern['narrative'].get('recommended_actions'):
                    actions = pattern['narrative']['recommended_actions']
                    for action in actions:
                        savings = action.get('estimated_monthly_savings', 0)
                        if savings:
                            total_savings += savings
        
        return {
            "status": "success",
            "predictions": predictions,
            "patterns": all_patterns,
            "total_impact": total_impact,
            "total_savings_opportunity": total_savings,
            "message": f"Found {len(predictions)} work orders with significant cost variances and {len(all_patterns)} patterns"
        }
