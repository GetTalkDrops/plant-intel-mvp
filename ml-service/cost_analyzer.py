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
    
    def _validate_cost_data(self, df: pd.DataFrame) -> Dict:
        """Check if required cost fields are present and have data"""
        required_fields = {
            'planned_material_cost': 'Planned Material Cost',
            'actual_material_cost': 'Actual Material Cost',
            'planned_labor_hours': 'Planned Labor Hours',
            'actual_labor_hours': 'Actual Labor Hours'
        }
        
        missing_fields = []
        empty_fields = []
        
        for field, display_name in required_fields.items():
            if field not in df.columns:
                missing_fields.append(display_name)
            else:
                # Check if field has meaningful data (not all null/zero)
                non_null = df[field].notna().sum()
                non_zero = (df[field] != 0).sum() if non_null > 0 else 0
                
                if non_null == 0 or non_zero == 0:
                    empty_fields.append(display_name)
        
        has_sufficient_data = len(missing_fields) == 0 and len(empty_fields) == 0
        
        return {
            'has_data': has_sufficient_data,
            'missing_fields': missing_fields,
            'empty_fields': empty_fields
        }
        
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
    
    def train_model(self, facility_id: int = 1, batch_id: str = None):
        """Train the cost prediction model"""
        # Get training data
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
        
        # Validate data before training
        validation = self._validate_cost_data(df)
        if not validation['has_data']:
            return False
        
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
    
    def predict_cost_variance(self, facility_id: int = 1, batch_id: str = None) -> Dict:
        """Predict cost variances using ML model"""
        # Get data to analyze
        query = self.supabase.table('work_orders')\
            .select('*')\
            .eq('facility_id', facility_id)\
            .eq('demo_mode', True)
        
        # Filter by batch if provided
        if batch_id:
            query = query.eq('uploaded_csv_batch', batch_id)
            print(f"Filtering cost analysis to batch: {batch_id}")
        
        response = query.execute()
        
        if not response.data:
            return {
                "predictions": [], 
                "total_impact": 0,
                "error": "no_data",
                "message": "No work order data found for analysis."
            }
            
        df = pd.DataFrame(response.data)
        
        # CRITICAL: Validate cost data exists
        validation = self._validate_cost_data(df)
        
        if not validation['has_data']:
            missing = validation['missing_fields'] + validation['empty_fields']
            return {
                "predictions": [],
                "total_impact": 0,
                "error": "insufficient_data",
                "message": f"Cannot analyze cost variance. Missing or empty fields: {', '.join(missing)}. Please upload data with both planned and actual cost information.",
                "required_fields": [
                    "Planned Material Cost",
                    "Actual Material Cost", 
                    "Planned Labor Hours",
                    "Actual Labor Hours"
                ]
            }
        
        # Train model if not trained
        if not self.is_trained:
            trained = self.train_model(facility_id, batch_id)
            if not trained:
                return {
                    "predictions": [],
                    "total_impact": 0,
                    "error": "training_failed",
                    "message": "Unable to train cost prediction model. Insufficient historical data."
                }
        
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
                    'risk_level': 'high' if abs(predicted_variance) > 5000 else 'medium'
                })
        
        # Sort by absolute variance
        results.sort(key=lambda x: abs(x['predicted_variance']), reverse=True)
        
        total_impact = sum(abs(r['predicted_variance']) for r in results[:5])
        
        return {
            "predictions": results[:20],
            "total_impact": total_impact
        }