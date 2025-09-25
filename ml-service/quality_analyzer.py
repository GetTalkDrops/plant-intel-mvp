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

class QualityAnalyzer:
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
        
    def _create_features(self, df: pd.DataFrame) -> tuple:
        """Create features for quality risk prediction"""
        features = []
        material_codes = []
        
        for material in df['material_code'].unique():
            if pd.isna(material):
                continue
                
            material_data = df[df['material_code'] == material]
            
            # Quality metrics
            total_orders = len(material_data)
            total_scrap = material_data['units_scrapped'].fillna(0).sum()
            scrap_rate = total_scrap / total_orders if total_orders > 0 else 0
            
            # Process consistency indicators
            labor_variances = []
            cost_variances = []
            
            for _, row in material_data.iterrows():
                labor_var = (row['actual_labor_hours'] or 0) - (row['planned_labor_hours'] or 0)
                cost_var = (row['actual_material_cost'] or 0) - (row['planned_material_cost'] or 0)
                labor_variances.append(labor_var)
                cost_variances.append(cost_var)
            
            avg_labor_variance = np.mean(labor_variances) if labor_variances else 0
            labor_consistency = np.std(labor_variances) if len(labor_variances) > 1 else 0
            avg_cost_variance = np.mean(cost_variances) if cost_variances else 0
            
            # Material complexity (inferred from code)
            try:
                code_complexity = int(str(material).split('-')[-1]) % 100 / 100
            except:
                code_complexity = 0.5
            
            feature_row = [
                scrap_rate,
                avg_labor_variance,
                labor_consistency,
                avg_cost_variance,
                code_complexity,
                total_orders
            ]
            
            features.append(feature_row)
            material_codes.append(material)
        
        return np.array(features), material_codes
    
    def _create_quality_labels(self, df: pd.DataFrame, material_codes: list) -> np.ndarray:
        """Create quality risk labels for training"""
        labels = []
        
        for material in material_codes:
            material_data = df[df['material_code'] == material]
            
            total_orders = len(material_data)
            total_scrap = material_data['units_scrapped'].fillna(0).sum()
            scrap_rate = total_scrap / total_orders if total_orders > 0 else 0
            
            # Quality issues indicator
            has_quality_issues = material_data['quality_issues'].notna().sum()
            issue_rate = has_quality_issues / total_orders if total_orders > 0 else 0
            
            # High quality risk if scrap rate > 2 per order or issue rate > 30%
            is_high_risk = scrap_rate > 2.0 or issue_rate > 0.3
            labels.append(1 if is_high_risk else 0)
        
        return np.array(labels)
    
    def train_model(self, facility_id: int = 1):
        """Train the quality risk prediction model"""
        response = self.supabase.table('work_orders')\
            .select('*')\
            .eq('facility_id', facility_id)\
            .eq('demo_mode', True)\
            .execute()
        
        if not response.data or len(response.data) < 10:
            pass  # Insufficient training data
            return False
        
        df = pd.DataFrame(response.data)
        
        # Create features and labels
        X, material_codes = self._create_features(df)
        y = self._create_quality_labels(df, material_codes)
        
        if len(X) == 0 or len(y) == 0:
            print("No valid material data found")
            return False
        
        # Train model
        X_scaled = self.scaler.fit_transform(X)
        self.model.fit(X_scaled, y)
        self.is_trained = True
        
        pass  # Model training complete
        return True
    
    def analyze_quality_patterns(self, facility_id: int = 1) -> Dict:
        """Analyze quality patterns using ML model"""
        if not self.is_trained:
            self.train_model(facility_id)
        
        response = self.supabase.table('work_orders')\
            .select('*')\
            .eq('facility_id', facility_id)\
            .eq('demo_mode', True)\
            .execute()
        
        if not response.data:
            return {"quality_issues": [], "total_scrap_cost": 0}
        
        df = pd.DataFrame(response.data)
        
        # Analyze each material
        quality_issues = []
        
        for material in df['material_code'].unique():
            if pd.isna(material):
                continue
                
            material_data = df[df['material_code'] == material]
            total_orders = len(material_data)
            
            if total_orders < 2:  # Need minimum data
                continue
            
            # Calculate actual metrics
            total_scrap = material_data['units_scrapped'].fillna(0).sum()
            scrap_rate = total_scrap / total_orders
            
            # Get quality issues count
            quality_issue_count = material_data['quality_issues'].notna().sum()
            issue_rate = quality_issue_count / total_orders
            
            # Create features for prediction
            labor_variances = []
            cost_variances = []
            
            for _, row in material_data.iterrows():
                labor_var = (row['actual_labor_hours'] or 0) - (row['planned_labor_hours'] or 0)
                cost_var = (row['actual_material_cost'] or 0) - (row['planned_material_cost'] or 0)
                labor_variances.append(labor_var)
                cost_variances.append(cost_var)
            
            avg_labor_variance = np.mean(labor_variances)
            labor_consistency = np.std(labor_variances) if len(labor_variances) > 1 else 0
            avg_cost_variance = np.mean(cost_variances)
            
            try:
                code_complexity = int(str(material).split('-')[-1]) % 100 / 100
            except:
                code_complexity = 0.5
            
            features = np.array([[scrap_rate, avg_labor_variance, labor_consistency, 
                                avg_cost_variance, code_complexity, total_orders]])
            
            try:
                X_scaled = self.scaler.transform(features)
                risk_probability = self.model.predict_proba(X_scaled)[0][1] * 100
                
                # Only include materials with significant risk
                if risk_probability > 60 or scrap_rate > 1.5:
                    risk_factors = []
                    if scrap_rate > 2:
                        risk_factors.append('high_scrap_rate')
                    if issue_rate > 0.3:
                        risk_factors.append('frequent_quality_issues')
                    if labor_consistency > 3:
                        risk_factors.append('process_inconsistency')
                    
                    estimated_cost = total_scrap * 75  # $75 per scrapped unit
                    
                    quality_issues.append({
                        'material_code': material,
                        'risk_score': round(risk_probability, 0),
                        'scrap_rate_per_order': round(scrap_rate, 2),
                        'quality_issue_rate': round(issue_rate * 100, 1),
                        'total_scrap_units': int(total_scrap),
                        'estimated_cost_impact': int(estimated_cost),
                        'risk_factors': risk_factors,
                        'orders_analyzed': total_orders
                    })
            except:
                continue
        
        # Sort by risk score
        quality_issues.sort(key=lambda x: x['risk_score'], reverse=True)
        
        total_cost = sum(issue['estimated_cost_impact'] for issue in quality_issues[:3])
        overall_scrap_rate = df['units_scrapped'].fillna(0).sum() / len(df)
        
        return {
            "quality_issues": quality_issues[:3],
            "total_scrap_cost": total_cost,
            "overall_scrap_rate": round(overall_scrap_rate, 3)
        }
