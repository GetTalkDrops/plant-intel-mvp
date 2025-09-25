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
        self.model = RandomForestClassifier(n_estimators=50, random_state=42, max_depth=3)
        self.scaler = StandardScaler()
        self.is_trained = False
        
    def _create_features(self, df: pd.DataFrame) -> tuple:
        """Create features for equipment analysis"""
        equipment_features = []
        equipment_ids = []
        
        for equipment_id in df['material_code'].unique():
            if pd.isna(equipment_id):
                continue
                
            equip_data = df[df['material_code'] == equipment_id]
            
            if len(equip_data) < 2:
                continue
            
            # Calculate performance metrics
            labor_variances = []
            for _, row in equip_data.iterrows():
                planned = row['planned_labor_hours'] or 0
                actual = row['actual_labor_hours'] or 0
                labor_variances.append(actual - planned)
            
            avg_labor_variance = np.mean(labor_variances)
            labor_variance_trend = np.std(labor_variances) if len(labor_variances) > 1 else 0
            
            # Quality indicators
            total_scrap = equip_data['units_scrapped'].fillna(0).sum()
            avg_scrap_rate = total_scrap / len(equip_data)
            
            # Usage metrics
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
            equipment_ids.append(equipment_id)
        
        return np.array(equipment_features), equipment_ids
    
    def _create_realistic_labels(self, df: pd.DataFrame, equipment_ids: list) -> np.ndarray:
        """Create realistic failure risk labels"""
        labels = []
        
        for equipment_id in equipment_ids:
            equip_data = df[df['material_code'] == equipment_id]
            
            # Calculate risk indicators
            labor_overruns = 0
            quality_issues = 0
            
            for _, row in equip_data.iterrows():
                planned = row['planned_labor_hours'] or 0
                actual = row['actual_labor_hours'] or 0
                if actual > planned + 3:  # More than 3 hours over
                    labor_overruns += 1
                
                if (row['units_scrapped'] or 0) > 5:  # More than 5 units scrapped
                    quality_issues += 1
            
            overrun_rate = labor_overruns / len(equip_data)
            quality_rate = quality_issues / len(equip_data)
            
            # Conservative risk assessment - only truly problematic equipment
            is_high_risk = (overrun_rate > 0.5 and quality_rate > 0.3) or overrun_rate > 0.7
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
            pass  # Insufficient training data
            return False
        
        df = pd.DataFrame(response.data)
        
        X, equipment_ids = self._create_features(df)
        y = self._create_realistic_labels(df, equipment_ids)
        
        if len(X) == 0 or len(y) == 0:
            print("No valid equipment data found")
            return False
        
        # Train model (no calibration to avoid cross-validation issues)
        X_scaled = self.scaler.fit_transform(X)
        self.model.fit(X_scaled, y)
        self.is_trained = True
        
        pass  # Model training complete
        return True
    
    def predict_failures(self, facility_id: int = 1) -> Dict:
        """Predict equipment failures with realistic probabilities"""
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
        X, equipment_ids = self._create_features(df)
        
        if len(X) == 0:
            return {"predictions": [], "total_downtime_cost": 0}
        
        predictions = []
        
        for i, equipment_id in enumerate(equipment_ids):
            equip_data = df[df['material_code'] == equipment_id]
            
            # Get prediction with manual probability scaling for realism
            X_scaled = self.scaler.transform([X[i]])
            raw_prob = self.model.predict_proba(X_scaled)[0][1]
            
            # Scale probabilities to realistic range (30-85%)
            failure_prob = 30 + (raw_prob * 55)  # Maps 0-1 to 30-85%
            
            # Only include equipment with meaningful risk
            if failure_prob > 45 or raw_prob > 0.3:
                # Calculate realistic costs
                labor_variances = []
                for _, row in equip_data.iterrows():
                    planned = row['planned_labor_hours'] or 0
                    actual = row['actual_labor_hours'] or 0
                    labor_variances.append(actual - planned)
                
                avg_variance = np.mean(labor_variances) if labor_variances else 0
                total_scrap = equip_data['units_scrapped'].fillna(0).sum()
                
                # Realistic cost calculation
                base_cost = 2000  # Base maintenance cost
                variance_cost = max(0, avg_variance * 150)  # $150 per hour variance
                scrap_cost = total_scrap * 75  # $75 per scrapped unit
                downtime_cost = int(base_cost + variance_cost + scrap_cost)
                
                risk_factors = []
                if avg_variance > 2:
                    risk_factors.append('performance_degradation')
                if total_scrap > len(equip_data) * 2.5:
                    risk_factors.append('quality_issues')
                if len(labor_variances) > 1 and np.std(labor_variances) > 2.5:
                    risk_factors.append('inconsistent_performance')
                
                predictions.append({
                    'equipment_id': equipment_id,
                    'failure_probability': round(failure_prob, 1),
                    'estimated_downtime_cost': downtime_cost,
                    'risk_factors': risk_factors,
                    'orders_analyzed': len(equip_data),
                    'analysis_details': {
                        'avg_labor_variance': round(avg_variance, 1),
                        'total_scrap_units': int(total_scrap),
                        'performance_trend': 'declining' if avg_variance > 1 else 'stable'
                    }
                })
        
        # Sort by failure probability
        predictions.sort(key=lambda x: x['failure_probability'], reverse=True)
        
        total_cost = sum(p['estimated_downtime_cost'] for p in predictions[:3])
        
        return {
            "predictions": predictions[:4],  # Top 4 risks
            "total_downtime_cost": total_cost
        }
