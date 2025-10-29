from supabase import create_client, Client
import pandas as pd
import numpy as np
from typing import Dict
import os
from dotenv import load_dotenv
import warnings
from analytics.degradation_detector import DegradationDetector
from analytics.correlation_analyzer import CorrelationAnalyzer
warnings.filterwarnings('ignore')

class QualityAnalyzer:
    def __init__(self):
        load_dotenv('../.env.local')
        
        url = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
        key = os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY")
        
        if not url or not key:
            raise ValueError("Missing Supabase credentials")
        
        self.supabase: Client = create_client(url, key)
        self.degradation_detector = DegradationDetector(self.supabase)
        self.correlation_analyzer = CorrelationAnalyzer(self.supabase)
    
    def analyze_quality_patterns(self, facility_id: int = 1, batch_id: str = None, config: dict = None) -> Dict:
        """Analyze quality patterns with breakdown, pattern detection, and drift analysis"""
        
        # Extract config or use defaults
        if config is None:
            config = {}
        
        labor_rate = config.get('labor_rate_hourly', 200)
        scrap_cost_per_unit = config.get('scrap_cost_per_unit', 75)
        pattern_min_count = config.get('pattern_min_orders', 3)
        min_issue_rate = config.get('quality_min_issue_rate_pct', 10)
        scrap_interpretations = config.get('quality_scrap_interpretations', {
            'critical': 20,
            'high': 10,
            'moderate': 5
        })
        
        query = self.supabase.table("work_orders").select("*").eq("facility_id", facility_id)

        if batch_id:
            query = query.eq("uploaded_csv_batch", batch_id)
        else:
            # Get most recent batch if no batch_id specified
            recent_batch = self.supabase.table("work_orders")\
                .select("uploaded_csv_batch")\
                .eq("facility_id", facility_id)\
                .order("uploaded_csv_batch")\
                .execute()
            
            if recent_batch.data and len(recent_batch.data) > 0:
                batch_id = recent_batch.data[-1]["uploaded_csv_batch"]
                query = query.eq("uploaded_csv_batch", batch_id)
        
        response = query.execute()
        
        if not response.data:
            return {
                "insights": [],
                "patterns": [],
                "overall_scrap_rate": 0,
                "total_impact": 0
            }
        
        df = pd.DataFrame(response.data)
        
        total_scrap = int(df['units_scrapped'].fillna(0).sum())
        total_orders = len(df)
        overall_scrap_rate = total_scrap / total_orders if total_orders > 0 else 0
        
        insights = []
        
        if 'material_code' in df.columns:
            unique_materials = df['material_code'].dropna().unique()
            
            for material_code in unique_materials:
                material_data = df[df['material_code'] == material_code]
                
                if len(material_data) < 2:
                    continue
                
                try:
                    breakdown = self._calculate_quality_breakdown(
                        material_data,
                        labor_rate,
                        scrap_cost_per_unit
                    )
                    
                    # Add quality drift analysis (30-day trend)
                    drift = self.degradation_detector.detect_quality_drift(
                        facility_id, material_code, window_days=30
                    )
                    
                    # Add correlation analysis if drifting
                    correlations = []
                    if drift:
                        correlations = self.correlation_analyzer.find_quality_correlations(
                            facility_id, material_code,
                            inflection_date=drift.get('inflection_date'),
                            window_days=30
                        )
                    
                    if breakdown['total_impact'] > 500 or breakdown['issue_rate'] > min_issue_rate or drift:
                        insight = {
                            'material_code': material_code,
                            'scrap_rate_per_order': breakdown['scrap_per_order'],
                            'quality_issue_rate': breakdown['issue_rate'],
                            'estimated_cost_impact': breakdown['total_impact'],
                            'orders_analyzed': len(material_data),
                            'analysis': breakdown
                        }
                        
                        # Add drift context if detected
                        if drift:
                            insight['drift'] = drift
                            # Increase impact estimate based on trend
                            if drift['drift_pct'] > 5:
                                insight['estimated_cost_impact'] = int(breakdown['total_impact'] * 1.5)
                        
                        # Add correlations
                        if correlations:
                            insight['correlations'] = correlations
                        
                        insights.append(insight)
                except Exception as e:
                    import traceback
                    traceback.print_exc()
                    continue
        
        # Detect patterns - materials with high defect rates
        patterns = []
        if 'material_code' in df.columns:
            material_quality = []
            
            for material_code in df['material_code'].dropna().unique():
                material_orders = df[df['material_code'] == material_code]
                quality_issues = (material_orders['quality_issues'].astype(str).str.lower() == 'true').sum()
                
                if quality_issues >= pattern_min_count:
                    total_scrap = int(material_orders['units_scrapped'].fillna(0).sum())
                    defect_rate = (quality_issues / len(material_orders)) * 100
                    scrap_cost = total_scrap * scrap_cost_per_unit
                    
                    material_quality.append({
                        'material_code': material_code,
                        'defect_count': int(quality_issues),
                        'total_orders': len(material_orders),
                        'defect_rate': defect_rate,
                        'scrap_units': int(total_scrap),
                        'estimated_impact': int(scrap_cost),
                        'work_orders': list(material_orders['work_order_number'])
                    })
            
            if material_quality:
                material_quality.sort(key=lambda x: x['defect_rate'], reverse=True)
                for mat in material_quality:
                    patterns.append({
                        'type': 'material_quality',
                        'identifier': mat['material_code'],
                        'order_count': mat['defect_count'],
                        'total_impact': mat['estimated_impact'],
                        'defect_rate': mat['defect_rate'],
                        'work_orders': mat['work_orders'][:10]
                    })
        
        insights.sort(key=lambda x: x['estimated_cost_impact'], reverse=True)
        total_cost = sum(q['estimated_cost_impact'] for q in insights)
        
        return {
            "insights": insights[:10],
            "patterns": patterns,
            "overall_scrap_rate": round(overall_scrap_rate, 3),
            "total_impact": total_cost,
            "message": f"Found {len(insights)} quality issues and {len(patterns)} patterns"
        }
    
    def _calculate_quality_breakdown(
        self,
        material_data: pd.DataFrame,
        labor_rate: float,
        scrap_cost_per_unit: float
    ) -> dict:
        """Calculate detailed quality issue breakdown"""
        
        total_scrap = int(material_data['units_scrapped'].fillna(0).sum())
        scrap_per_order = total_scrap / len(material_data)
        
        quality_issue_orders = (material_data['quality_issues'].astype(str).str.lower() == 'true').sum()
        issue_rate = (quality_issue_orders / len(material_data)) * 100
        
        scrap_cost = int(total_scrap * scrap_cost_per_unit)
        
        rework_labor = 0
        for _, row in material_data.iterrows():
            if str(row.get('quality_issues', '')).lower() == 'true':
                planned = row.get('planned_labor_hours', 0) or 0
                actual = row.get('actual_labor_hours', 0) or 0
                if actual > planned:
                    rework_labor += (actual - planned)
        
        rework_cost = int(rework_labor * labor_rate)
        
        material_waste_cost = 0
        for _, row in material_data.iterrows():
            if str(row.get('quality_issues', '')).lower() == 'true':
                planned_mat = row.get('planned_material_cost', 0) or 0
                actual_mat = row.get('actual_material_cost', 0) or 0
                if actual_mat > planned_mat:
                    material_waste_cost += (actual_mat - planned_mat)
        
        material_waste_cost = int(material_waste_cost)
        
        total_impact = scrap_cost + rework_cost + material_waste_cost
        
        if total_impact > 0:
            scrap_pct = (scrap_cost / total_impact) * 100
            rework_pct = (rework_cost / total_impact) * 100
            waste_pct = (material_waste_cost / total_impact) * 100
        else:
            scrap_pct = rework_pct = waste_pct = 0
        
        impacts = {
            'scrap': scrap_cost,
            'rework': rework_cost,
            'waste': material_waste_cost
        }
        primary_driver = max(impacts.items(), key=lambda x: x[1])[0]
        
        scrap_driver = self._determine_scrap_driver(scrap_per_order)
        rework_driver = self._determine_rework_driver(rework_labor, len(material_data))
        
        return {
            'total_impact': total_impact,
            'issue_rate': round(issue_rate, 1),
            'scrap_per_order': round(scrap_per_order, 1),
            'breakdown': {
                'scrap': {
                    'cost': scrap_cost,
                    'percentage': round(scrap_pct, 1),
                    'units': int(total_scrap),
                    'driver': scrap_driver
                },
                'rework': {
                    'cost': rework_cost,
                    'percentage': round(rework_pct, 1),
                    'hours': round(rework_labor, 1),
                    'driver': rework_driver
                },
                'material_waste': {
                    'cost': material_waste_cost,
                    'percentage': round(waste_pct, 1),
                    'driver': 'Excess material due to quality issues' if material_waste_cost > 0 else 'No material waste'
                }
            },
            'primary_driver': primary_driver,
            'orders_affected': int(quality_issue_orders)
        }
    
    def _determine_scrap_driver(self, scrap_per_order: float) -> str:
        """Determine scrap impact description"""
        if scrap_per_order > 20:
            return f"Critical scrap rate ({scrap_per_order:.1f} units/order)"
        elif scrap_per_order > 10:
            return f"High scrap rate ({scrap_per_order:.1f} units/order)"
        elif scrap_per_order > 5:
            return f"Moderate scrap rate ({scrap_per_order:.1f} units/order)"
        else:
            return f"Low scrap rate ({scrap_per_order:.1f} units/order)"
    
    def _determine_rework_driver(self, total_rework_hours: float, order_count: int) -> str:
        """Determine rework impact description"""
        avg_rework = total_rework_hours / order_count if order_count > 0 else 0
        
        if avg_rework > 10:
            return f"Extensive rework required (avg {avg_rework:.1f} hrs/order)"
        elif avg_rework > 5:
            return f"Significant rework time (avg {avg_rework:.1f} hrs/order)"
        elif avg_rework > 2:
            return f"Moderate rework needed (avg {avg_rework:.1f} hrs/order)"
        else:
            return "Minimal rework required"
