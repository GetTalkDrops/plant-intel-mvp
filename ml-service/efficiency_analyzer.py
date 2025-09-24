from supabase import create_client, Client
import pandas as pd
import numpy as np
from typing import List, Dict
import os
from dotenv import load_dotenv

class EfficiencyAnalyzer:
    def __init__(self):
        load_dotenv('../.env.local')
        url = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
        key = os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY")
        
        if not url or not key:
            raise ValueError("Missing Supabase credentials in environment variables")
        
        self.supabase: Client = create_client(url, key)
    
    def analyze_efficiency_patterns(self, facility_id: int) -> Dict:
        # Get work orders to analyze efficiency patterns
        response = self.supabase.table('work_orders').select('*').eq('facility_id', facility_id).eq('demo_mode', True).execute()
        
        if not response.data:
            return {"efficiency_insights": [], "overall_efficiency": 0}
        
        df = pd.DataFrame(response.data)
        
        # Calculate efficiency metrics
        df['labor_efficiency'] = df.apply(lambda row: 
            (row['planned_labor_hours'] / row['actual_labor_hours'] * 100) 
            if row['actual_labor_hours'] and row['actual_labor_hours'] > 0 
            else 100, axis=1)
        
        df['cost_efficiency'] = df.apply(lambda row: 
            (row['planned_material_cost'] / row['actual_material_cost'] * 100) 
            if row['actual_material_cost'] and row['actual_material_cost'] > 0 
            else 100, axis=1)
        
        # Overall facility efficiency
        overall_efficiency = df['labor_efficiency'].mean()
        
        # Analyze by operation type (extracted from work order number)
        operation_efficiency = {}
        for _, order in df.iterrows():
            # Extract operation type from work order number (WO-PROD-0001 -> PROD)
            parts = order['work_order_number'].split('-')
            operation_type = parts[1] if len(parts) > 1 else 'UNKNOWN'
            
            if operation_type not in operation_efficiency:
                operation_efficiency[operation_type] = {
                    'total_orders': 0,
                    'labor_efficiency_sum': 0,
                    'cost_efficiency_sum': 0,
                    'labor_hours_variance': 0,
                    'cost_variance': 0
                }
            
            op_data = operation_efficiency[operation_type]
            op_data['total_orders'] += 1
            op_data['labor_efficiency_sum'] += order['labor_efficiency']
            op_data['cost_efficiency_sum'] += order['cost_efficiency']
            
            # Calculate variances
            labor_variance = (order['actual_labor_hours'] or 0) - (order['planned_labor_hours'] or 0)
            cost_variance = (order['actual_material_cost'] or 0) - (order['planned_material_cost'] or 0)
            op_data['labor_hours_variance'] += abs(labor_variance)
            op_data['cost_variance'] += abs(cost_variance)
        
        # Generate efficiency insights
        efficiency_insights = []
        for operation_type, data in operation_efficiency.items():
            if data['total_orders'] < 2:  # Need minimum data
                continue
                
            avg_labor_efficiency = data['labor_efficiency_sum'] / data['total_orders']
            avg_cost_efficiency = data['cost_efficiency_sum'] / data['total_orders']
            avg_labor_variance = data['labor_hours_variance'] / data['total_orders']
            avg_cost_variance = data['cost_variance'] / data['total_orders']
            
            # Calculate efficiency score
            efficiency_score = (avg_labor_efficiency + avg_cost_efficiency) / 2
            
            # Identify improvement opportunities
            improvement_factors = []
            if avg_labor_efficiency < 85:
                improvement_factors.append('labor_productivity_below_target')
            if avg_cost_efficiency < 90:
                improvement_factors.append('cost_overruns_frequent')
            if avg_labor_variance > 3:
                improvement_factors.append('inconsistent_labor_planning')
            if avg_cost_variance > 500:
                improvement_factors.append('material_cost_volatility')
            
            # Only include operations with improvement opportunities
            if improvement_factors:
                # Calculate potential savings
                potential_labor_savings = (100 - avg_labor_efficiency) * data['total_orders'] * 25 * 2  # $25/hr, 2hr avg improvement
                potential_cost_savings = avg_cost_variance * data['total_orders'] * 0.3  # 30% of variance recoverable
                total_savings = potential_labor_savings + potential_cost_savings
                
                efficiency_insights.append({
                    'operation_type': operation_type,
                    'efficiency_score': round(efficiency_score, 1),
                    'labor_efficiency': round(avg_labor_efficiency, 1),
                    'cost_efficiency': round(avg_cost_efficiency, 1),
                    'improvement_factors': improvement_factors,
                    'orders_analyzed': data['total_orders'],
                    'potential_savings': round(total_savings, 0),
                    'avg_labor_variance_hours': round(avg_labor_variance, 1),
                    'avg_cost_variance': round(avg_cost_variance, 0)
                })
        
        # Sort by potential savings
        efficiency_insights.sort(key=lambda x: x['potential_savings'], reverse=True)
        
        total_savings_opportunity = sum(insight['potential_savings'] for insight in efficiency_insights[:3])
        
        return {
            "efficiency_insights": efficiency_insights[:3],  # Top 3 improvement opportunities
            "overall_efficiency": round(overall_efficiency, 1),
            "total_savings_opportunity": total_savings_opportunity
        }