from supabase import create_client, Client
import pandas as pd
import numpy as np
from typing import Dict
import os
from dotenv import load_dotenv
import warnings
warnings.filterwarnings('ignore')

class EquipmentPredictor:
    def __init__(self):
        load_dotenv('../.env.local')
        
        url = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
        key = os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY")
        
        if not url or not key:
            raise ValueError("Missing Supabase credentials")
        
        self.supabase: Client = create_client(url, key)
    
    def predict_failures(self, facility_id: int = 1, batch_id: str = None) -> Dict:
        """Predict equipment failures with breakdown analysis"""
        
        query = self.supabase.table('work_orders')\
            .select('*')\
            .eq('facility_id', facility_id)\
            .eq('demo_mode', True)
        
        if batch_id:
            query = query.eq('uploaded_csv_batch', batch_id)
            print(f"Filtering equipment analysis to batch: {batch_id}")
            
        response = query.execute()
        
        if not response.data:
            return {"predictions": [], "total_downtime_cost": 0}
        
        df = pd.DataFrame(response.data)
        
        # Check if machine_id column exists
        if 'machine_id' not in df.columns or df['machine_id'].isna().all():
            return {
                "predictions": [],
                "total_downtime_cost": 0,
                "message": "No equipment data available. Upload data with machine_id field for equipment analysis."
            }
        
        predictions = []
        
        # Analyze each machine
        for machine_id in df['machine_id'].dropna().unique():
            machine_data = df[df['machine_id'] == machine_id]
            
            if len(machine_data) < 2:
                continue
            
            # Calculate breakdown
            breakdown = self._calculate_equipment_breakdown(machine_data)
            
            # Only include machines with issues
            if breakdown['total_impact'] > 1000:
                predictions.append({
                    'equipment_id': machine_id,
                    'failure_probability': breakdown['risk_score'],
                    'estimated_downtime_cost': breakdown['total_impact'],
                    'orders_analyzed': len(machine_data),
                    'analysis': breakdown
                })
        
        # Sort by impact
        predictions.sort(key=lambda x: x['estimated_downtime_cost'], reverse=True)
        
        total_cost = sum(p['estimated_downtime_cost'] for p in predictions)
        
        return {
            "predictions": predictions[:10],
            "total_downtime_cost": total_cost
        }
    
    def _calculate_equipment_breakdown(self, machine_data: pd.DataFrame) -> dict:
        """Calculate detailed breakdown of equipment issues"""
        
        # Labor impact
        labor_variances = []
        for _, row in machine_data.iterrows():
            planned = row.get('planned_labor_hours', 0) or 0
            actual = row.get('actual_labor_hours', 0) or 0
            labor_variances.append(actual - planned)
        
        avg_labor_variance = np.mean(labor_variances)
        total_labor_hours_over = sum(max(0, v) for v in labor_variances)
        labor_cost_impact = int(total_labor_hours_over * 200)
        
        # Quality impact
        total_scrap = machine_data['units_scrapped'].fillna(0).sum()
        scrap_cost_impact = int(total_scrap * 75)
        quality_issue_count = machine_data['quality_issues'].fillna(False).sum()
        
        # Material waste from quality issues
        material_waste = 0
        for _, row in machine_data.iterrows():
            if row.get('quality_issues'):
                planned = row.get('planned_material_cost', 0) or 0
                actual = row.get('actual_material_cost', 0) or 0
                material_waste += max(0, actual - planned)
        
        total_impact = labor_cost_impact + scrap_cost_impact + material_waste
        
        # Calculate percentages
        if total_impact > 0:
            labor_pct = (labor_cost_impact / total_impact) * 100
            quality_pct = (scrap_cost_impact / total_impact) * 100
            material_pct = (material_waste / total_impact) * 100
        else:
            labor_pct = quality_pct = material_pct = 0
        
        # Determine primary issue
        impacts = {
            'labor': labor_cost_impact,
            'quality': scrap_cost_impact,
            'material_waste': material_waste
        }
        primary_issue = max(impacts.items(), key=lambda x: x[1])[0]
        
        # Risk score (0-100)
        risk_factors = 0
        if avg_labor_variance > 5:
            risk_factors += 30
        if quality_issue_count > len(machine_data) * 0.3:
            risk_factors += 40
        if total_scrap > len(machine_data) * 3:
            risk_factors += 30
        
        risk_score = min(95, 40 + risk_factors)
        
        # Driver descriptions
        labor_driver = self._determine_labor_driver(avg_labor_variance, len(machine_data))
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
    
    def _determine_labor_driver(self, avg_variance: float, order_count: int) -> str:
        """Determine labor impact description"""
        if avg_variance > 10:
            return f"Severe performance degradation (avg +{avg_variance:.1f} hrs/order)"
        elif avg_variance > 5:
            return f"Moderate performance issues (avg +{avg_variance:.1f} hrs/order)"
        elif avg_variance > 2:
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