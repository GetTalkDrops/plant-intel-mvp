from supabase import create_client, Client
import pandas as pd
import numpy as np
from typing import List, Dict
import os
from dotenv import load_dotenv

class EquipmentPredictor:
    def __init__(self):
        load_dotenv('../.env.local')
        url = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
        key = os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY")
        
        if not url or not key:
            raise ValueError("Missing Supabase credentials in environment variables")
        
        self.supabase: Client = create_client(url, key)
    
    def predict_failures(self, facility_id: int) -> Dict:
        # Get work orders to analyze equipment performance patterns
        response = self.supabase.table('work_orders').select('*').eq('facility_id', facility_id).eq('demo_mode', True).execute()
        
        if not response.data:
            return {"predictions": [], "total_downtime_cost": 0}
        
        df = pd.DataFrame(response.data)
        
        # Analyze equipment patterns (using material_code as equipment proxy for demo)
        equipment_performance = {}
        
        for _, order in df.iterrows():
            equipment_id = order['material_code']  # Using this as equipment identifier for demo
            
            if equipment_id not in equipment_performance:
                equipment_performance[equipment_id] = {
                    'total_orders': 0,
                    'labor_overruns': 0,
                    'quality_issues': 0,
                    'avg_labor_variance': 0,
                    'total_labor_variance': 0
                }
            
            eq_data = equipment_performance[equipment_id]
            eq_data['total_orders'] += 1
            
            # Calculate labor efficiency as equipment health indicator
            labor_variance = (order['actual_labor_hours'] or 0) - (order['planned_labor_hours'] or 0)
            eq_data['total_labor_variance'] += labor_variance
            
            if labor_variance > 2:  # More than 2 hours over planned
                eq_data['labor_overruns'] += 1
                
            if order['units_scrapped'] and order['units_scrapped'] > 3:
                eq_data['quality_issues'] += 1
        
        # Generate failure predictions
        predictions = []
        for equipment_id, data in equipment_performance.items():
            if data['total_orders'] < 3:  # Need minimum data
                continue
                
            # Calculate risk indicators with NaN handling
            labor_overrun_rate = data['labor_overruns'] / data['total_orders'] if data['total_orders'] > 0 else 0
            quality_issue_rate = data['quality_issues'] / data['total_orders'] if data['total_orders'] > 0 else 0
            
            # Handle NaN in labor variance calculation
            if data['total_orders'] > 0 and not pd.isna(data['total_labor_variance']):
                avg_labor_variance = data['total_labor_variance'] / data['total_orders']
            else:
                avg_labor_variance = 0
            
            # Skip if we have invalid data
            if pd.isna(avg_labor_variance) or pd.isna(labor_overrun_rate):
                continue
            
            # Equipment showing consistent performance degradation
            if labor_overrun_rate > 0.4 or avg_labor_variance > 3:
                # Calculate failure probability - ensure no NaN values
                prob_calc = (labor_overrun_rate * 60) + (avg_labor_variance * 10) + (quality_issue_rate * 25)
                failure_prob = min(95, max(50, int(prob_calc))) if not pd.isna(prob_calc) else 50
                
                # Estimate downtime cost
                cost_calc = avg_labor_variance * 500 * 8
                downtime_cost = max(1000, int(cost_calc)) if not pd.isna(cost_calc) else 1000
                
                risk_factors = []
                if labor_overrun_rate > 0.4:
                    risk_factors.append('consistent_performance_degradation')
                if avg_labor_variance > 4:
                    risk_factors.append('significant_efficiency_loss')
                if quality_issue_rate > 0.3:
                    risk_factors.append('quality_degradation_pattern')
                
                predictions.append({
                    'equipment_id': equipment_id,
                    'failure_probability': failure_prob,
                    'estimated_downtime_cost': downtime_cost,
                    'risk_factors': risk_factors,
                    'orders_analyzed': data['total_orders']
                })

        # Sort by failure probability
        predictions.sort(key=lambda x: x['failure_probability'], reverse=True)

        total_cost = sum(p['estimated_downtime_cost'] for p in predictions[:3])

        return {
            "predictions": predictions[:3],
            "total_downtime_cost": total_cost
        }