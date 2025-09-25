from supabase import create_client, Client
import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import StandardScaler
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
        self.model = RandomForestClassifier(n_estimators=50, random_state=42)
        self.scaler = StandardScaler()
        self.is_trained = False
        
    def _create_features(self, df: pd.DataFrame) -> np.ndarray:
        """Create features for equipment failure prediction"""
        # Group by equipment (using material_code as proxy)
        equipment_features = []
        
        for equipment_id in df['material_code'].unique():
            if pd.isna(equipment_id):
                continue
                
            equip_data = df[df['material_code'] == equipment_id]
            
            # Calculate performance metrics
            labor_variances = []
            for _, row in equip_data.iterrows():
                planned = row['planned_labor_hours'] or 0
                actual = row['actual_labor_hours'] or 0
                labor_variances.append(actual - planned)
            
            avg_labor_variance = np.mean(labor_variances) if labor_variances else 0
            labor_variance_trend = np.std(labor_variances) if len(labor_variances) > 1 else 0
            
            # Quality indicators
            total_scrap = equip_data['units_scrapped'].fillna(0).sum()
            avg_scrap_rate = total_scrap / len(equip_data)
            
            # Usage intensity
            total_orders = len(equip_data)
            avg_planned_hours = equip_data['planned_labor_hours'].fillna(0).mean()
            
            features = [
                avg_labor_variance,
                labor_variance_trend,
                avg_scrap_rate,
                total_orders,
                avg_planned_hours
            ]
            
            equipment_features.append(features)
        
        return np.array(equipment_features) if equipment_features else np.array([]).reshape(0, 5)
    
    def _create_failure_labels(self, df: pd.DataFrame) -> np.ndarray:
        """Create failure risk labels for training"""
        labels = []
        
        for equipment_id in df['material_code'].unique():
            if pd.isna(equipment_id):
                continue
                
            equip_data = df[df['material_code'] == equipment_id]
            
            # Calculate risk indicators
            labor_overruns = 0
            quality_issues = 0
            
            for _, row in equip_data.iterrows():
                planned = row['planned_labor_hours'] or 0
                actual = row['actual_labor_hours'] or 0
                if actual > planned + 2:  # More than 2 hours over
                    labor_overruns += 1
                
                if (row['units_scrapped'] or 0) > 3:
                    quality_issues += 1
            
            # High risk if >40% overruns or significant quality issues
            overrun_rate = labor_overruns / len(equip_data)
            quality_rate = quality_issues / len(equip_data)
            
            is_high_risk = overrun_rate > 0.4 or quality_rate > 0.3
            labels.append(1 if is_high_risk else 0)
        
        return np.array(labels)
    
    def train_model(self, facility_id: int = 1):
        """Train the equipment failure prediction model"""
        response = self.supabase.table('work_orders')\
            .select('*')\
            .eq('facility_id', facility_id)\
            .eq('demo_mode', True)\
            .execute()
        
        if not response.data or len(response.data) < 10:
            print("Not enough data to train equipment model")
            return False
        
        df = pd.DataFrame(response.data)
        
        # Create features and labels
        X = self._create_features(df)
        y = self._create_failure_labels(df)
        
        if len(X) == 0 or len(y) == 0:
            print("No valid equipment data found")
            return False
        
        # Train model
        X_scaled = self.scaler.fit_transform(X)
        self.model.fit(X_scaled, y)
        self.is_trained = True
        
        print(f"Equipment model trained on {len(X)} pieces of equipment")
        return True
    
    def predict_failures(self, facility_id: int = 1) -> Dict:
        """Predict equipment failures using ML model"""
        if not self.is_trained:
            self.train_model(facility_id)
        
        response = self.supabase.table('work_orders')\
            .select('*')\
            .eq('facility_id', facility_id)\
            .eq('demo_mode', True)\
            .execute()
        
        if not response.data:
            return {"predictions": [], "total_downtime_cost": 0}
        
        df = pd.DataFrame(response.data)
        
        # Get predictions for each equipment
        predictions = []
        
        for equipment_id in df['material_code'].unique():
            if pd.isna(equipment_id):
                continue
                
            equip_data = df[df['material_code'] == equipment_id]
            
            # Create features for this equipment
            X = self._create_features(pd.DataFrame([equip_data.iloc[0]]))
            if len(X) == 0:
                continue
                
            # Get actual features for this specific equipment
            labor_variances = []
            for _, row in equip_data.iterrows():
                planned = row['planned_labor_hours'] or 0
                actual = row['actual_labor_hours'] or 0
                labor_variances.append(actual - planned)
            
            avg_labor_variance = np.mean(labor_variances) if labor_variances else 0
            labor_variance_trend = np.std(labor_variances) if len(labor_variances) > 1 else 0
            total_scrap = equip_data['units_scrapped'].fillna(0).sum()
            avg_scrap_rate = total_scrap / len(equip_data)
            total_orders = len(equip_data)
            avg_planned_hours = equip_data['planned_labor_hours'].fillna(0).mean()
            
            features = np.array([[avg_labor_variance, labor_variance_trend, avg_scrap_rate, total_orders, avg_planned_hours]])
            
            try:
                X_scaled = self.scaler.transform(features)
                failure_prob = self.model.predict_proba(X_scaled)[0][1] * 100
                
                # Only include high-risk equipment
                if failure_prob > 60:
                    # Calculate estimated costs
                    downtime_cost = max(5000, int(avg_labor_variance * 1000 + total_scrap * 200))
                    
                    risk_factors = []
                    if avg_labor_variance > 3:
                        risk_factors.append('performance_degradation')
                    if avg_scrap_rate > 2:
                        risk_factors.append('quality_issues')
                    if labor_variance_trend > 2:
                        risk_factors.append('inconsistent_performance')
                    
                    predictions.append({
                        'equipment_id': equipment_id,
                        'failure_probability': round(failure_prob, 0),
                        'estimated_downtime_cost': downtime_cost,
                        'risk_factors': risk_factors,
                        'orders_analyzed': total_orders
                    })
            except:
                continue
        
        # Sort by failure probability
        predictions.sort(key=lambda x: x['failure_probability'], reverse=True)
        
        total_cost = sum(p['estimated_downtime_cost'] for p in predictions[:3])
        
        return {
            "predictions": predictions[:3],
            "total_downtime_cost": total_cost
        }
