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
    
    def train_model(self, facility_id: int = 1, batch_id: str = None):
        """Train the efficiency prediction model"""
        query = self.supabase.table('work_orders')\
            .select('*')\
            .eq('facility_id', facility_id)\
            .eq('demo_mode', True)
        
        if batch_id:
            query = query.eq('uploaded_csv_batch', batch_id)
            
        response = query.execute()
        
        if not response.data or len(response.data) < 10:
            pass  # Insufficient training data
            return False
        
        df = pd.DataFrame(response.data)
        
        # Analyze by operation type
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
            
            # Calculate variances
            labor_var = (order['actual_labor_hours'] or 0) - (order['planned_labor_hours'] or 0)
            cost_var = (order['actual_material_cost'] or 0) - (order['planned_material_cost'] or 0)
            
            # Calculate efficiency
            if order['actual_labor_hours'] and order['actual_labor_hours'] > 0:
                efficiency = (order['planned_labor_hours'] or 0) / order['actual_labor_hours'] * 100
            else:
                efficiency = 100
            
            operation_data[op_type]['labor_variances'].append(labor_var)
            operation_data[op_type]['cost_variances'].append(cost_var)
            operation_data[op_type]['efficiencies'].append(efficiency)
        
        # Prepare training data
        X = []
        y = []  # Target: potential savings opportunity
        
        for op_type, data in operation_data.items():
            if len(data['labor_variances']) < 2:
                continue
            
            avg_labor_var = np.mean(data['labor_variances'])
            avg_cost_var = np.mean(data['cost_variances'])
            avg_efficiency = np.mean(data['efficiencies'])
            total_orders = len(data['labor_variances'])
            consistency = np.std(data['labor_variances'])
            
            # Calculate efficiency metrics
            labor_eff = max(0, avg_efficiency)
            cost_eff = max(0, 100 - abs(avg_cost_var) / 100)
            
            features = [avg_labor_var, avg_cost_var, total_orders, labor_eff, cost_eff, consistency]
            
            # Target: potential savings (higher variance = more savings opportunity)
            potential_savings = abs(avg_labor_var) * 25 * total_orders + abs(avg_cost_var) * 0.3 * total_orders
            
            X.append(features)
            y.append(potential_savings)
        
        if len(X) == 0:
            print("No valid operation data for training")
            return False
        
        X = np.array(X)
        y = np.array(y)
        
        # Train model
        X_scaled = self.scaler.fit_transform(X)
        self.model.fit(X_scaled, y)
        self.is_trained = True
        
        pass  # Model training complete
        return True
    
    def analyze_efficiency_patterns(self, facility_id: int = 1, batch_id: str = None) -> Dict:
        """Analyze efficiency patterns using ML model"""
        if not self.is_trained:
            self.train_model(facility_id, batch_id)
        
        query = self.supabase.table('work_orders')\
            .select('*')\
            .eq('facility_id', facility_id)\
            .eq('demo_mode', True)
        
        if batch_id:
            query = query.eq('uploaded_csv_batch', batch_id)
            print(f"Filtering efficiency analysis to batch: {batch_id}")
            
        response = query.execute()
        
        if not response.data:
            return {"efficiency_insights": [], "overall_efficiency": 0, "total_savings_opportunity": 0}
        
        df = pd.DataFrame(response.data)
        
        # Calculate overall efficiency
        overall_labor_efficiency = []
        for _, order in df.iterrows():
            if order['actual_labor_hours'] and order['actual_labor_hours'] > 0:
                eff = (order['planned_labor_hours'] or 0) / order['actual_labor_hours'] * 100
                overall_labor_efficiency.append(min(150, max(0, eff)))
        
        overall_efficiency = np.mean(overall_labor_efficiency) if overall_labor_efficiency else 0
        
        # Analyze by operation type
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
                    'cost_efficiencies': []
                }
            
            op_data = operation_performance[op_type]
            op_data['total_orders'] += 1
            
            # Calculate metrics
            labor_var = (order['actual_labor_hours'] or 0) - (order['planned_labor_hours'] or 0)
            cost_var = (order['actual_material_cost'] or 0) - (order['planned_material_cost'] or 0)
            
            op_data['labor_variances'].append(labor_var)
            op_data['cost_variances'].append(cost_var)
            
            # Efficiency calculations
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
        
        # Generate insights for each operation
        for op_type, data in operation_performance.items():
            if data['total_orders'] < 2:
                continue
            
            avg_labor_var = np.mean(data['labor_variances'])
            avg_cost_var = np.mean(data['cost_variances'])
            avg_labor_eff = np.mean(data['labor_efficiencies'])
            avg_cost_eff = np.mean(data['cost_efficiencies'])
            consistency = np.std(data['labor_variances'])
            
            # Create features for ML prediction
            features = np.array([[avg_labor_var, avg_cost_var, data['total_orders'], 
                                avg_labor_eff, avg_cost_eff, consistency]])
            
            try:
                X_scaled = self.scaler.transform(features)
                predicted_savings = self.model.predict(X_scaled)[0]
                
                # Only include operations with significant improvement opportunity
                if predicted_savings > 1000 or avg_labor_eff < 85:
                    improvement_factors = []
                    if avg_labor_eff < 85:
                        improvement_factors.append('labor_productivity_below_target')
                    if avg_cost_eff < 90:
                        improvement_factors.append('cost_overruns_frequent')
                    if consistency > 3:
                        improvement_factors.append('inconsistent_performance')
                    if abs(avg_cost_var) > 500:
                        improvement_factors.append('material_cost_volatility')
                    
                    efficiency_score = (avg_labor_eff + avg_cost_eff) / 2
                    
                    efficiency_insights.append({
                        'operation_type': op_type,
                        'efficiency_score': round(efficiency_score, 1),
                        'labor_efficiency': round(avg_labor_eff, 1),
                        'cost_efficiency': round(avg_cost_eff, 1),
                        'improvement_factors': improvement_factors,
                        'orders_analyzed': data['total_orders'],
                        'potential_savings': round(predicted_savings, 0),
                        'avg_labor_variance_hours': round(avg_labor_var, 1),
                        'avg_cost_variance': round(avg_cost_var, 0)
                    })
            except:
                continue
        
        # Sort by potential savings
        efficiency_insights.sort(key=lambda x: x['potential_savings'], reverse=True)
        
        total_savings = sum(insight['potential_savings'] for insight in efficiency_insights[:3])
        
        return {
            "efficiency_insights": efficiency_insights[:3],
            "overall_efficiency": round(overall_efficiency, 1),
            "total_savings_opportunity": int(total_savings)
        }