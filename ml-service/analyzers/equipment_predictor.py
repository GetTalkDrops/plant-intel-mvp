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

class EquipmentPredictor:
    def __init__(self):
        load_dotenv('../.env.local')
        
        url = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
        key = os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY")
        
        if not url or not key:
            raise ValueError("Missing Supabase credentials")
        
        self.supabase: Client = create_client(url, key)
        self.degradation_detector = DegradationDetector(self.supabase)
        self.correlation_analyzer = CorrelationAnalyzer(self.supabase)
    
    def predict_failures(self, facility_id: int = 1, batch_id: str = None, config: dict = None) -> Dict:
        """Predict equipment failures with pattern detection, breakdown analysis, and degradation trends"""
        
        # Extract config or use defaults
        if config is None:
            config = {}
        
        labor_rate = config.get('labor_rate_hourly', 200)
        scrap_cost_per_unit = config.get('scrap_cost_per_unit', 75)
        pattern_min_count = config.get('pattern_min_orders', 3)
        excluded_machines = config.get('excluded_machines', [])
        
        # Risk thresholds
        risk_thresholds = config.get('equipment_risk_thresholds', {
            'labor_variance': 5,
            'quality_rate': 0.3,
            'scrap_ratio': 3
        })
        
        # Labor interpretation thresholds
        labor_interpretations = config.get('equipment_labor_interpretations', {
            'severe': 10,
            'moderate': 5,
            'minor': 2
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
            return {"insights": [], "patterns": [], "total_impact": 0}
        
        df = pd.DataFrame(response.data)
        
        # Apply exclusions
        if excluded_machines and 'machine_id' in df.columns:
            df = df[~df['machine_id'].isin(excluded_machines)]
        
        if 'machine_id' not in df.columns or df['machine_id'].isna().all():
            if 'equipment_id' not in df.columns or df['equipment_id'].isna().all():
                return {
                    "insights": [],
                    "patterns": [],
                    "total_impact": 0,
                }
        
        # Get unique machines from both columns
        unique_machines = set()
        if 'machine_id' in df.columns:
            unique_machines.update(df['machine_id'].dropna().unique())
        if 'equipment_id' in df.columns:
            unique_machines.update(df['equipment_id'].dropna().unique())
        
        insights = []
        
        for machine_id in unique_machines:
            # Get data for this machine from either column
            machine_data = df[(df['machine_id'] == machine_id) | (df['equipment_id'] == machine_id)]
            
            if len(machine_data) < 2:
                continue
            
            try:
                breakdown = self._calculate_equipment_breakdown(
                    machine_data,
                    labor_rate,
                    scrap_cost_per_unit,
                    risk_thresholds,
                    labor_interpretations
                )
                
                # Add degradation analysis (looks at 30-day trend)
                degradation = self.degradation_detector.detect_equipment_degradation(
                    facility_id, machine_id, window_days=30
                )
                
                # Add correlation analysis if degrading
                correlations = []
                if degradation:
                    correlations = self.correlation_analyzer.find_equipment_correlations(
                        facility_id, machine_id, window_days=30
                    )
                
                if breakdown['total_impact'] > 500 or degradation:
                    insight = {
                        'equipment_id': machine_id,
                        'failure_probability': breakdown['risk_score'],
                        'estimated_downtime_cost': breakdown['total_impact'],
                        'orders_analyzed': len(machine_data),
                        'analysis': breakdown
                    }
                    
                    # Add degradation context if detected
                    if degradation:
                        insight['degradation'] = degradation
                        insight['failure_probability'] = min(95, breakdown['risk_score'] + 15)  # Increase risk if degrading
                    
                    # Add correlations
                    if correlations:
                        insight['correlations'] = correlations
                    
                    insights.append(insight)
            except Exception as e:
                import traceback
                traceback.print_exc()
                continue
        
        # Detect patterns - machines with quality issues
        patterns = []
        quality_machines = []
        
        for machine_id in unique_machines:
            machine_data = df[(df['machine_id'] == machine_id) | (df['equipment_id'] == machine_id)]
            quality_issue_count = (machine_data['quality_issues'].astype(str).str.lower() == 'true').sum()
            
            if quality_issue_count >= pattern_min_count:
                total_scrap = int(machine_data['units_scrapped'].fillna(0).sum())
                scrap_cost = total_scrap * scrap_cost_per_unit
                
                quality_machines.append({
                    'machine_id': machine_id,
                    'quality_issue_count': int(quality_issue_count),
                    'total_orders': len(machine_data),
                    'scrap_units': int(total_scrap),
                    'estimated_impact': int(scrap_cost),
                    'work_orders': list(machine_data['work_order_number'])
                })
        
        if quality_machines:
            quality_machines.sort(key=lambda x: x['quality_issue_count'], reverse=True)
            for machine in quality_machines:
                patterns.append({
                    'type': 'equipment_quality',
                    'identifier': machine['machine_id'],
                    'order_count': machine['quality_issue_count'],
                    'total_impact': machine['estimated_impact'],
                    'issue_rate': (machine['quality_issue_count'] / machine['total_orders']) * 100,
                    'work_orders': machine['work_orders'][:10]
                })
        
        insights.sort(key=lambda x: x['estimated_downtime_cost'], reverse=True)
        total_cost = sum(p['estimated_downtime_cost'] for p in insights)
        
        return {
            "insights": insights[:10],
            "patterns": patterns,
            "total_impact": total_cost,
            "message": f"Found {len(insights)} equipment issues and {len(patterns)} patterns"
        }
    
    def _calculate_equipment_breakdown(
        self,
        machine_data: pd.DataFrame,
        labor_rate: float,
        scrap_cost_per_unit: float,
        risk_thresholds: dict,
        labor_interpretations: dict
    ) -> dict:
        """Calculate detailed breakdown of equipment issues"""
        
        labor_variances = []
        for _, row in machine_data.iterrows():
            planned = row.get('planned_labor_hours', 0) or 0
            actual = row.get('actual_labor_hours', 0) or 0
            labor_variances.append(actual - planned)
        
        avg_labor_variance = np.mean(labor_variances)
        total_labor_hours_over = sum(max(0, v) for v in labor_variances)
        labor_cost_impact = int(total_labor_hours_over * labor_rate)
        
        total_scrap = int(machine_data['units_scrapped'].fillna(0).sum())
        scrap_cost_impact = int(total_scrap * scrap_cost_per_unit)
        quality_issue_count = (machine_data['quality_issues'].astype(str).str.lower() == 'true').sum()
        
        material_waste = 0
        for _, row in machine_data.iterrows():
            if str(row.get('quality_issues', '')).lower() == 'true':
                planned = row.get('planned_material_cost', 0) or 0
                actual = row.get('actual_material_cost', 0) or 0
                material_waste += max(0, actual - planned)
        
        total_impact = labor_cost_impact + scrap_cost_impact + material_waste
        
        if total_impact > 0:
            labor_pct = (labor_cost_impact / total_impact) * 100
            quality_pct = (scrap_cost_impact / total_impact) * 100
            material_pct = (material_waste / total_impact) * 100
        else:
            labor_pct = quality_pct = material_pct = 0
        
        impacts = {
            'labor': labor_cost_impact,
            'quality': scrap_cost_impact,
            'material_waste': material_waste
        }
        primary_issue = max(impacts.items(), key=lambda x: x[1])[0]
        
        # Calculate risk score using config thresholds
        risk_factors = 0
        if avg_labor_variance > risk_thresholds.get('labor_variance', 5):
            risk_factors += 30
        if quality_issue_count > len(machine_data) * risk_thresholds.get('quality_rate', 0.3):
            risk_factors += 40
        if total_scrap > len(machine_data) * risk_thresholds.get('scrap_ratio', 3):
            risk_factors += 30
        
        risk_score = min(95, 40 + risk_factors)
        
        labor_driver = self._determine_labor_driver(avg_labor_variance, len(machine_data), labor_interpretations)
        quality_driver = self._determine_quality_driver(quality_issue_count, total_scrap, len(machine_data))
        
        return {
            'total_impact': int(total_impact),
            'risk_score': risk_score,
            'breakdown': {
                'labor': {
                    'impact': labor_cost_impact,
                    'percentage': round(labor_pct, 1),
                    'avg_hours_over': round(avg_labor_variance, 1),
                    'driver': labor_driver
                },
                'quality': {
                    'impact': scrap_cost_impact,
                    'percentage': round(quality_pct, 1),
                    'scrap_units': int(total_scrap),
                    'affected_orders': int(quality_issue_count),
                    'driver': quality_driver
                },
                'material_waste': {
                    'impact': int(material_waste),
                    'percentage': round(material_pct, 1),
                    'driver': 'Material waste from quality issues' if material_waste > 0 else 'No material waste'
                }
            },
            'primary_issue': primary_issue,
            'orders_affected': len(machine_data)
        }
    
    def _determine_labor_driver(self, avg_variance: float, order_count: int, thresholds: dict) -> str:
        """Determine labor impact description using config thresholds"""
        severe = thresholds.get('severe', 10)
        moderate = thresholds.get('moderate', 5)
        minor = thresholds.get('minor', 2)
        
        if avg_variance > severe:
            return f"Severe performance degradation (avg +{avg_variance:.1f} hrs/order)"
        elif avg_variance > moderate:
            return f"Moderate performance issues (avg +{avg_variance:.1f} hrs/order)"
        elif avg_variance > minor:
            return f"Minor inefficiency (avg +{avg_variance:.1f} hrs/order)"
        else:
            return "Labor performance within normal range"
    
    def _determine_quality_driver(self, issue_count: int, scrap_units: int, order_count: int) -> str:
        """Determine quality impact description"""
        issue_rate = (issue_count / order_count) * 100
        scrap_per_order = scrap_units / order_count
        
        if issue_rate > 40:
            return f"Critical quality problems ({issue_rate:.0f}% orders affected, {scrap_per_order:.1f} scrap/order)"
        elif issue_rate > 25:
            return f"Frequent quality issues ({issue_rate:.0f}% orders affected, {scrap_per_order:.1f} scrap/order)"
        elif issue_rate > 10:
            return f"Occasional quality issues ({issue_rate:.0f}% orders affected)"
        else:
            return "Quality within acceptable range"
