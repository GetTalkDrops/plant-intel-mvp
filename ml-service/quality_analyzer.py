from supabase import create_client, Client
import pandas as pd
import numpy as np
from typing import List, Dict
import os
from dotenv import load_dotenv

class QualityAnalyzer:
    def __init__(self):
        load_dotenv('../.env.local')
        url = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
        key = os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY")
        
        if not url or not key:
            raise ValueError("Missing Supabase credentials in environment variables")
        
        self.supabase: Client = create_client(url, key)
    
    def analyze_quality_patterns(self, facility_id: int) -> Dict:
        # Get work orders to analyze quality patterns
        response = self.supabase.table('work_orders').select('*').eq('facility_id', facility_id).eq('demo_mode', True).execute()
        
        if not response.data:
            return {"quality_issues": [], "total_scrap_cost": 0}
        
        df = pd.DataFrame(response.data)
        
        # Calculate quality metrics
        total_orders = len(df)
        orders_with_scrap = df[df['units_scrapped'] > 0]
        orders_with_issues = df[df['quality_issues'].notna()]
        
        # Calculate scrap rate and cost
        total_scrap = df['units_scrapped'].sum()
        scrap_rate = (total_scrap / total_orders) if total_orders > 0 else 0
        estimated_scrap_cost = total_scrap * 50  # $50 per scrapped unit estimate
        
        # Analyze material patterns for quality issues
        material_quality = {}
        for _, order in df.iterrows():
            material = order['material_code']
            scrap_count = order['units_scrapped'] or 0
            has_quality_issue = pd.notna(order['quality_issues'])
            
            if material not in material_quality:
                material_quality[material] = {
                    'total_orders': 0,
                    'scrap_count': 0,
                    'quality_issues': 0
                }
            
            material_quality[material]['total_orders'] += 1
            material_quality[material]['scrap_count'] += scrap_count
            if has_quality_issue:
                material_quality[material]['quality_issues'] += 1
        
        # Identify problematic materials
        quality_issues = []
        for material, data in material_quality.items():
            if data['total_orders'] < 3:  # Need minimum data
                continue
                
            scrap_rate_material = data['scrap_count'] / data['total_orders']
            issue_rate = data['quality_issues'] / data['total_orders']
            
            # Flag materials with high scrap or quality issue rates
            if scrap_rate_material > 2 or issue_rate > 0.3:  # More than 2 scrap per order or 30% issue rate
                risk_score = min(95, int((scrap_rate_material * 20) + (issue_rate * 50)))
                
                risk_factors = []
                if scrap_rate_material > 3:
                    risk_factors.append('high_scrap_rate')
                if issue_rate > 0.4:
                    risk_factors.append('frequent_quality_issues')
                if data['scrap_count'] > 20:
                    risk_factors.append('significant_waste_volume')
                
                estimated_impact = data['scrap_count'] * 50  # Cost impact
                
                quality_issues.append({
                    'material_code': material,
                    'risk_score': risk_score,
                    'scrap_rate_per_order': round(scrap_rate_material, 2),
                    'quality_issue_rate': round(issue_rate * 100, 1),
                    'total_scrap_units': data['scrap_count'],
                    'estimated_cost_impact': estimated_impact,
                    'risk_factors': risk_factors,
                    'orders_analyzed': data['total_orders']
                })
        
        # Sort by risk score
        quality_issues.sort(key=lambda x: x['risk_score'], reverse=True)
        
        total_cost_impact = sum(issue['estimated_cost_impact'] for issue in quality_issues[:3])
        
        return {
            "quality_issues": quality_issues[:3],  # Top 3 problematic materials
            "total_scrap_cost": total_cost_impact,
            "overall_scrap_rate": round(scrap_rate, 3)
        }