from supabase import create_client, Client
import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import StandardScaler
from typing import Dict
import os
from dotenv import load_dotenv
import warnings
warnings.filterwarnings('ignore')

class EfficiencyAnalyzer:
    def __init__(self):
        load_dotenv('../.env.local')
        
        url = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
        key = os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY")
        
        if not url or not key:
            raise ValueError("Missing Supabase credentials")
        
        self.supabase: Client = create_client(url, key)
        self.model = RandomForestRegressor(n_estimators=50, random_state=42)
        self.scaler = StandardScaler()
        self.is_trained = False
        
    def _create_features(self, operation_data: Dict) -> np.ndarray:
        """Create features for efficiency prediction"""
        features = [
            operation_data['avg_labor_variance'],
            operation_data['avg_cost_variance'], 
            operation_data['total_orders'],
            operation_data['labor_efficiency'],
            operation_data['cost_efficiency'],
            operation_data['consistency_score']
        ]
        return np.array([features])
    
    def train_model(self, facility_id: int = 1, batch_id: str = None, labor_rate: float = 200):
        """Train the efficiency prediction model"""
        query = self.supabase.table('work_orders')\
            .select('*')\
            .eq('facility_id', facility_id)\
            .eq('demo_mode', True)
        
        if batch_id:
            query = query.eq('uploaded_csv_batch', batch_id)
            
        response = query.execute()
        
        if not response.data or len(response.data) < 10:
            return False
        
        df = pd.DataFrame(response.data)
        
        operation_data = {}
        for _, order in df.iterrows():
            parts = order['work_order_number'].split('-')
            op_type = parts[1] if len(parts) > 1 else 'UNKNOWN'
            
            if op_type not in operation_data:
                operation_data[op_type] = {
                    'labor_variances': [],
                    'cost_variances': [],
                    'efficiencies': []
                }
            
            labor_var = (order['actual_labor_hours'] or 0) - (order['planned_labor_hours'] or 0)
            cost_var = (order['actual_material_cost'] or 0) - (order['planned_material_cost'] or 0)
            
            if order['actual_labor_hours'] and order['actual_labor_hours'] > 0:
                efficiency = (order['planned_labor_hours'] or 0) / order['actual_labor_hours'] * 100
            else:
                efficiency = 100
            
            operation_data[op_type]['labor_variances'].append(labor_var)
            operation_data[op_type]['cost_variances'].append(cost_var)
            operation_data[op_type]['efficiencies'].append(efficiency)
        
        X = []
        y = []
        
        for op_type, data in operation_data.items():
            if len(data['labor_variances']) < 2:
                continue
            
            avg_labor_var = np.mean(data['labor_variances'])
            avg_cost_var = np.mean(data['cost_variances'])
            avg_efficiency = np.mean(data['efficiencies'])
            total_orders = len(data['labor_variances'])
            consistency = np.std(data['labor_variances'])
            
            labor_eff = max(0, avg_efficiency)
            cost_eff = max(0, 100 - abs(avg_cost_var) / 100)
            
            features = [avg_labor_var, avg_cost_var, total_orders, labor_eff, cost_eff, consistency]
            potential_savings = abs(avg_labor_var) * labor_rate * total_orders + abs(avg_cost_var) * 0.3 * total_orders
            
            X.append(features)
            y.append(potential_savings)
        
        if len(X) == 0:
            return False
        
        X = np.array(X)
        y = np.array(y)
        
        X_scaled = self.scaler.fit_transform(X)
        self.model.fit(X_scaled, y)
        self.is_trained = True
        
        return True
    
    def analyze_efficiency_patterns(self, facility_id: int = 1, batch_id: str = None, config: dict = None) -> Dict:
        """Analyze efficiency patterns with breakdown"""
        
        # Extract config or use defaults
        if config is None:
            config = {}
        
        labor_rate = config.get('labor_rate_hourly', 200)
        scrap_cost_per_unit = config.get('scrap_cost_per_unit', 75)
        
        if not self.is_trained:
            self.train_model(facility_id, batch_id, labor_rate)
        
        query = self.supabase.table('work_orders')\
            .select('*')\
            .eq('facility_id', facility_id)\
            .eq('demo_mode', True)
        
        if batch_id:
            query = query.eq('uploaded_csv_batch', batch_id)
            
        response = query.execute()
        
        if not response.data:
            return {"efficiency_insights": [], "overall_efficiency": 0, "total_savings_opportunity": 0}
        
        df = pd.DataFrame(response.data)
        
        overall_labor_efficiency = []
        for _, order in df.iterrows():
            if order['actual_labor_hours'] and order['actual_labor_hours'] > 0:
                eff = (order['planned_labor_hours'] or 0) / order['actual_labor_hours'] * 100
                overall_labor_efficiency.append(min(150, max(0, eff)))
        
        overall_efficiency = np.mean(overall_labor_efficiency) if overall_labor_efficiency else 0
        
        efficiency_insights = []
        operation_performance = {}
        
        for _, order in df.iterrows():
            parts = order['work_order_number'].split('-')
            op_type = parts[1] if len(parts) > 1 else 'UNKNOWN'
            
            if op_type not in operation_performance:
                operation_performance[op_type] = {
                    'total_orders': 0,
                    'labor_variances': [],
                    'cost_variances': [],
                    'labor_efficiencies': [],
                    'cost_efficiencies': [],
                    'quality_issues': 0
                }
            
            op_data = operation_performance[op_type]
            op_data['total_orders'] += 1
            
            labor_var = (order['actual_labor_hours'] or 0) - (order['planned_labor_hours'] or 0)
            cost_var = (order['actual_material_cost'] or 0) - (order['planned_material_cost'] or 0)
            
            op_data['labor_variances'].append(labor_var)
            op_data['cost_variances'].append(cost_var)
            
            if order['actual_labor_hours'] and order['actual_labor_hours'] > 0:
                labor_eff = (order['planned_labor_hours'] or 0) / order['actual_labor_hours'] * 100
            else:
                labor_eff = 100
                
            if order['actual_material_cost'] and order['actual_material_cost'] > 0:
                cost_eff = (order['planned_material_cost'] or 0) / order['actual_material_cost'] * 100
            else:
                cost_eff = 100
                
            op_data['labor_efficiencies'].append(min(150, max(0, labor_eff)))
            op_data['cost_efficiencies'].append(min(150, max(0, cost_eff)))
            
            if str(order.get('quality_issues', '')).lower() == 'true':
                op_data['quality_issues'] += 1
        
        for op_type, data in operation_performance.items():
            if data['total_orders'] < 2:
                continue
            
            try:
                breakdown = self._calculate_efficiency_breakdown(
                    data,
                    labor_rate,
                    scrap_cost_per_unit
                )
                
                avg_labor_eff = np.mean(data['labor_efficiencies'])
                avg_cost_eff = np.mean(data['cost_efficiencies'])
                efficiency_score = (avg_labor_eff + avg_cost_eff) / 2
                
                if breakdown['total_savings'] > 1000 or efficiency_score < 85:
                    efficiency_insights.append({
                        'operation_type': op_type,
                        'efficiency_score': round(efficiency_score, 1),
                        'labor_efficiency': round(avg_labor_eff, 1),
                        'cost_efficiency': round(avg_cost_eff, 1),
                        'orders_analyzed': data['total_orders'],
                        'potential_savings': breakdown['total_savings'],
                        'analysis': breakdown
                    })
            except Exception as e:
                import traceback
                traceback.print_exc()
                continue
        
        efficiency_insights.sort(key=lambda x: x['potential_savings'], reverse=True)
        total_savings = sum(insight['potential_savings'] for insight in efficiency_insights[:3])
        
        return {
            "efficiency_insights": efficiency_insights[:3],
            "overall_efficiency": round(overall_efficiency, 1),
            "total_savings_opportunity": int(total_savings)
        }
    
    def _calculate_efficiency_breakdown(
        self,
        operation_data: dict,
        labor_rate: float,
        scrap_cost_per_unit: float
    ) -> dict:
        """Calculate detailed efficiency breakdown"""
        
        avg_labor_var = np.mean(operation_data['labor_variances'])
        avg_cost_var = np.mean(operation_data['cost_variances'])
        total_orders = operation_data['total_orders']
        quality_issues = operation_data['quality_issues']
        consistency = np.std(operation_data['labor_variances'])
        
        labor_impact = int(max(0, avg_labor_var) * labor_rate * total_orders)
        material_impact = int(max(0, avg_cost_var) * total_orders)
        quality_impact = int(quality_issues * scrap_cost_per_unit * 5)
        
        total_savings = labor_impact + material_impact + quality_impact
        
        if total_savings > 0:
            labor_pct = (labor_impact / total_savings) * 100
            material_pct = (material_impact / total_savings) * 100
            quality_pct = (quality_impact / total_savings) * 100
        else:
            labor_pct = material_pct = quality_pct = 0
        
        impacts = {
            'labor': labor_impact,
            'material': material_impact,
            'quality': quality_impact
        }
        primary_driver = max(impacts.items(), key=lambda x: x[1])[0]
        
        labor_driver = self._determine_labor_driver(avg_labor_var)
        material_driver = self._determine_material_driver(avg_cost_var)
        quality_driver = self._determine_quality_driver(quality_issues, total_orders)
        consistency_driver = self._determine_consistency_driver(consistency)
        
        return {
            'total_savings': total_savings,
            'breakdown': {
                'labor': {
                    'impact': labor_impact,
                    'percentage': round(labor_pct, 1),
                    'avg_hours_over': round(avg_labor_var, 1),
                    'driver': labor_driver
                },
                'material': {
                    'impact': material_impact,
                    'percentage': round(material_pct, 1),
                    'avg_cost_over': round(avg_cost_var, 0),
                    'driver': material_driver
                },
                'quality': {
                    'impact': quality_impact,
                    'percentage': round(quality_pct, 1),
                    'issue_count': quality_issues,
                    'driver': quality_driver
                }
            },
            'primary_driver': primary_driver,
            'consistency_score': round(consistency, 2),
            'consistency_driver': consistency_driver
        }
    
    def _determine_labor_driver(self, avg_variance: float) -> str:
        """Determine labor inefficiency description"""
        if avg_variance > 10:
            return f"Severe labor overruns (avg +{avg_variance:.1f} hrs/order)"
        elif avg_variance > 5:
            return f"Moderate labor inefficiency (avg +{avg_variance:.1f} hrs/order)"
        elif avg_variance > 2:
            return f"Minor labor variance (avg +{avg_variance:.1f} hrs/order)"
        else:
            return "Labor efficiency acceptable"
    
    def _determine_material_driver(self, avg_variance: float) -> str:
        """Determine material inefficiency description"""
        if avg_variance > 1000:
            return f"Significant material cost overruns (avg +${avg_variance:.0f}/order)"
        elif avg_variance > 500:
            return f"Moderate material cost variance (avg +${avg_variance:.0f}/order)"
        elif avg_variance > 100:
            return f"Minor material cost fluctuation (avg +${avg_variance:.0f}/order)"
        else:
            return "Material costs well-controlled"
    
    def _determine_quality_driver(self, issue_count: int, total_orders: int) -> str:
        """Determine quality impact on efficiency"""
        issue_rate = (issue_count / total_orders) * 100 if total_orders > 0 else 0
        
        if issue_rate > 30:
            return f"Critical quality impact ({issue_rate:.0f}% orders affected)"
        elif issue_rate > 15:
            return f"Moderate quality impact ({issue_rate:.0f}% orders affected)"
        elif issue_rate > 5:
            return f"Minor quality impact ({issue_rate:.0f}% orders affected)"
        else:
            return "Quality not impacting efficiency"
    
    def _determine_consistency_driver(self, std_dev: float) -> str:
        """Determine process consistency"""
        if std_dev > 5:
            return f"Highly inconsistent performance (std dev={std_dev:.1f})"
        elif std_dev > 3:
            return f"Moderate variability (std dev={std_dev:.1f})"
        elif std_dev > 1:
            return f"Good consistency (std dev={std_dev:.1f})"
        else:
            return "Excellent process consistency"