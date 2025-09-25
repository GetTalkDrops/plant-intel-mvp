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

class CostAnalyzer:
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
        
    def _create_features(self, df: pd.DataFrame) -> np.ndarray:
        """Create features for ML model"""
        features = []
        
        for _, row in df.iterrows():
            # Basic features
            planned_material = row['planned_material_cost'] or 0
            planned_labor = row['planned_labor_hours'] or 0
            
            # Feature engineering
            total_planned = planned_material + (planned_labor * 25)
            complexity = planned_labor / max(planned_material, 1) * 100
            
            # Material risk (extract from material code)
            material_risk = 0.5
            if row['material_code']:
                try:
                    code_num = int(str(row['material_code']).split('-')[-1])
                    material_risk = (code_num % 100) / 100
                except:
                    pass
            
            features.append([
                planned_material,
                planned_labor, 
                total_planned,
                complexity,
                material_risk
            ])
        
        return np.array(features)
    
    def train_model(self, facility_id: int = 1):
        """Train the cost prediction model"""
        # Get training data
        response = self.supabase.table('work_orders')\
            .select('*')\
            .eq('facility_id', facility_id)\
            .eq('demo_mode', True)\
            .execute()
        
        if not response.data or len(response.data) < 10:
            pass  # Insufficient training data
            return False
        
        df = pd.DataFrame(response.data)
        
        # Create features
        X = self._create_features(df)
        
        # Create targets (actual cost variance)
        y = []
        for _, row in df.iterrows():
            actual_material = row['actual_material_cost'] or 0
            actual_labor = row['actual_labor_hours'] or 0
            planned_material = row['planned_material_cost'] or 0
            planned_labor = row['planned_labor_hours'] or 0
            
            actual_total = actual_material + (actual_labor * 25)
            planned_total = planned_material + (planned_labor * 25)
            variance = actual_total - planned_total
            
            y.append(variance)
        
        y = np.array(y)
        
        # Train model
        X_scaled = self.scaler.fit_transform(X)
        self.model.fit(X_scaled, y)
        self.is_trained = True
        
        print(f"Model trained on {len(df)} work orders")
        return True
    
    def predict_cost_variance(self, facility_id: int = 1) -> Dict:
        """Predict cost variances using ML model"""
        # Train model if not trained
        if not self.is_trained:
            self.train_model(facility_id)
        
        # Get data to predict on
        response = self.supabase.table('work_orders')\
            .select('*')\
            .eq('facility_id', facility_id)\
            .eq('demo_mode', True)\
            .execute()
        
        if not response.data:
            return {"predictions": [], "total_impact": 0}
        
        df = pd.DataFrame(response.data)
        
        # Create features and predict
        X = self._create_features(df)
        X_scaled = self.scaler.transform(X)
        predictions = self.model.predict(X_scaled)
        
        # Generate insights
        results = []
        for i, (_, row) in enumerate(df.iterrows()):
            predicted_variance = predictions[i]
            
            # Only include significant predictions
            if abs(predicted_variance) > 1000:
                confidence = min(95, 60 + abs(predicted_variance) / 500)
                
                results.append({
                    'work_order_number': row['work_order_number'],
                    'predicted_variance': round(predicted_variance, 0),
                    'confidence': round(confidence, 0),
                    'risk_level': 'high' if abs(predicted_variance) > 3000 else 'medium'
                })
        
        # Sort by absolute variance
        results.sort(key=lambda x: abs(x['predicted_variance']), reverse=True)
        
        total_impact = sum(abs(r['predicted_variance']) for r in results[:5])
        
        return {
            "predictions": results[:5],
            "total_impact": total_impact
        }
