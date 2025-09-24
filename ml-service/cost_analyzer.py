from supabase import create_client, Client
import pandas as pd
import numpy as np
from typing import List, Dict
import os
from dotenv import load_dotenv

class CostAnalyzer:
    def __init__(self):
        # Load environment variables from parent directory
        load_dotenv('../.env.local')
        
        url = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
        key = os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY")
        
        if not url or not key:
            raise ValueError("Missing Supabase credentials in environment variables")
        
        self.supabase: Client = create_client(url, key)
    
    def predict_cost_variance(self, facility_id: int) -> Dict:
        # Get work orders from Supabase
        response = self.supabase.table('work_orders').select('*').eq('facility_id', facility_id).eq('demo_mode', True).execute()
        
        if not response.data:
            return {"predictions": [], "total_impact": 0}
        
        # Convert to DataFrame for analysis
        df = pd.DataFrame(response.data)
        
        # Calculate variances
        df['material_variance'] = df['actual_material_cost'].fillna(0) - df['planned_material_cost'].fillna(0)
        df['labor_variance'] = (df['actual_labor_hours'].fillna(0) - df['planned_labor_hours'].fillna(0)) * 25
        df['total_variance'] = df['material_variance'] + df['labor_variance']
        
        # Find high-risk orders (variance > $1000)
        high_risk = df[df['total_variance'].abs() > 1000].copy()
        
        # Calculate risk factors and confidence
        predictions = []
        for _, order in high_risk.iterrows():
            factors = []
            if order['material_variance'] > 1000:
                factors.append('material_price_spike')
            if order['labor_variance'] > 500:
                factors.append('labor_inefficiency')
            if order['units_scrapped'] > 5:
                factors.append('quality_issues')
            
            confidence = min(95, 70 + len(factors) * 8)
            
            predictions.append({
                'work_order_number': order['work_order_number'],
                'predicted_overrun': abs(order['total_variance']),
                'confidence': confidence,
                'factors': factors
            })
        
        return {
            "predictions": predictions[:5],
            "total_impact": sum(p['predicted_overrun'] for p in predictions[:5])
        }