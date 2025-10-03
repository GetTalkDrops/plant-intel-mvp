from supabase import create_client, Client
import pandas as pd
import numpy as np
from typing import Dict
import os
from dotenv import load_dotenv
import warnings
warnings.filterwarnings('ignore')

class QualityAnalyzer:
    def __init__(self):
        load_dotenv('../.env.local')
        
        url = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
        key = os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY")
        
        if not url or not key:
            raise ValueError("Missing Supabase credentials")
        
        self.supabase: Client = create_client(url, key)
    
    def analyze_quality_patterns(self, facility_id: int = 1, batch_id: str = None) -> Dict:
        """Analyze quality patterns with breakdown"""
        
        query = self.supabase.table('work_orders')\
            .select('*')\
            .eq('facility_id', facility_id)\
            .eq('demo_mode', True)
        
        if batch_id:
            query = query.eq('uploaded_csv_batch', batch_id)
            print(f"Filtering quality analysis to batch: {batch_id}")
            
        response = query.execute()
        
        if not response.data:
            return {
                "quality_issues": [],
                "overall_scrap_rate": 0,
                "total_scrap_cost": 0
            }
        
        df = pd.DataFrame(response.data)
        
        # Overall metrics
        total_scrap = df['units_scrapped'].fillna(0).sum()
        total_orders = len(df)
        overall_scrap_rate = total_scrap / total_orders if total_orders > 0 else 0
        
        quality_issues = []
        
        # Analyze by material
        if 'material_code' in df.columns:
            for material_code in df['material_code'].dropna().unique():
                material_data = df[df['material_code'] == material_code]
                
                if len(material_data) < 2:
                    continue
                
                breakdown = self._calculate_quality_breakdown(material_data)
                
                # Only include materials with significant issues
                if breakdown['total_impact'] > 500 or breakdown['issue_rate'] > 15:
                    quality_issues.append({
                        'material_code': material_code,
                        'scrap_rate_per_order': breakdown['scrap_per_order'],
                        'quality_issue_rate': breakdown['issue_rate'],
                        'estimated_cost_impact': breakdown['total_impact'],
                        'orders_analyzed': len(material_data),
                        'analysis': breakdown
                    })
        
        # Sort by cost impact
        quality_issues.sort(key=lambda x: x['estimated_cost_impact'], reverse=True)
        
        total_scrap_cost = sum(q['estimated_cost_impact'] for q in quality_issues)
        
        return {
            "quality_issues": quality_issues[:10],
            "overall_scrap_rate": round(overall_scrap_rate, 3),
            "total_scrap_cost": total_scrap_cost
        }
    
    def _calculate_quality_breakdown(self, material_data: pd.DataFrame) -> dict:
        """Calculate detailed quality issue breakdown"""
        
        total_scrap = material_data['units_scrapped'].fillna(0).sum()
        scrap_per_order = total_scrap / len(material_data)
        
        # Quality issue frequency
        quality_issue_orders = material_data['quality_issues'].fillna(False).sum()
        issue_rate = (quality_issue_orders / len(material_data)) * 100
        
        # Cost impacts
        scrap_cost = int(total_scrap * 75)  # $75 per scrapped unit
        
        # Labor impact from rework
        rework_labor = 0
        for _, row in material_data.iterrows():
            if row.get('quality_issues'):
                planned = row.get('planned_labor_hours', 0) or 0
                actual = row.get('actual_labor_hours', 0) or 0
                if actual > planned:
                    rework_labor += (actual - planned)
        
        rework_cost = int(rework_labor * 200)
        
        # Material waste
        material_waste_cost = 0
        for _, row in material_data.iterrows():
            if row.get('quality_issues'):
                planned_mat = row.get('planned_material_cost', 0) or 0
                actual_mat = row.get('actual_material_cost', 0) or 0
                if actual_mat > planned_mat:
                    material_waste_cost += (actual_mat - planned_mat)
        
        material_waste_cost = int(material_waste_cost)
        
        total_impact = scrap_cost + rework_cost + material_waste_cost
        
        # Calculate percentages
        if total_impact > 0:
            scrap_pct = (scrap_cost / total_impact) * 100
            rework_pct = (rework_cost / total_impact) * 100
            waste_pct = (material_waste_cost / total_impact) * 100
        else:
            scrap_pct = rework_pct = waste_pct = 0
        
        # Primary driver
        impacts = {
            'scrap': scrap_cost,
            'rework': rework_cost,
            'waste': material_waste_cost
        }
        primary_driver = max(impacts.items(), key=lambda x: x[1])[0]
        
        # Driver descriptions
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