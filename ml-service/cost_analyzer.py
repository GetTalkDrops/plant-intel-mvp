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
        """Predict cost variances with data quality validation"""
        
        # Fetch facility settings
        facility_settings = self._get_facility_settings(facility_id)
        
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
        
        # NEW: Validate data quality
        quality_validation = self._validate_data_quality(df)
        
        # If data too poor, return early
        if quality_validation['score'] < 40:
            return {
                'status': 'insufficient_data',
                'validation': quality_validation,
                'predictions': [],
                'total_impact': 0
            }
        
        # NEW: Calculate adaptive thresholds
        thresholds = self._calculate_thresholds(df, facility_settings)
        
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
        
       # Generate insights with breakdown
        results = []
        for i, (_, row) in enumerate(df.iterrows()):
            predicted_variance = predictions[i]
            
            # Use adaptive threshold instead of hardcoded 1000
            if abs(predicted_variance) > thresholds['variance_threshold']:
                confidence = min(95, 60 + abs(predicted_variance) / 500)
                
                # NEW: Calculate variance breakdown
                breakdown = self._calculate_variance_breakdown(row, facility_settings['labor_rate'])
                
                results.append({
                    'work_order_number': row['work_order_number'],
                    'predicted_variance': round(predicted_variance, 0),
                    'confidence': round(confidence, 0),
                    'risk_level': 'critical' if abs(predicted_variance) > thresholds['variance_threshold'] * 5 
                                 else 'high' if abs(predicted_variance) > thresholds['variance_threshold'] * 2 
                                 else 'medium',
                    'analysis': breakdown  # NEW: Add breakdown to results
                })
        
        # Sort by absolute variance
        results.sort(key=lambda x: abs(x['predicted_variance']), reverse=True)
        
        total_impact = sum(abs(r['predicted_variance']) for r in results[:5])
        
        return {
            'status': 'success',
            'validation': quality_validation,
            'thresholds': thresholds,
            'predictions': results[:20],
            'total_impact': total_impact
        }
    
    # NEW METHODS BELOW
    
    def _get_facility_settings(self, facility_id: int) -> dict:
        """Fetch facility-specific settings"""
        try:
            response = self.supabase.table('facilities')\
                .select('default_labor_rate, variance_threshold_pct')\
                .eq('id', facility_id)\
                .execute()
            
            if response.data and len(response.data) > 0:
                return {
                    'labor_rate': float(response.data[0]['default_labor_rate']),
                    'variance_threshold_pct': float(response.data[0]['variance_threshold_pct'])
                }
        except Exception as e:
            print(f"Error fetching facility settings: {e}")
        
        # Default fallback
        return {'labor_rate': 200.00, 'variance_threshold_pct': 5.00}
    
    def _validate_data_quality(self, df: pd.DataFrame) -> dict:
        """Validate data quality and return score with warnings"""
        
        score = 100
        warnings = []
        field_quality = {}
        
        # Check critical fields
        critical_fields = ['planned_material_cost', 'actual_material_cost', 
                           'planned_labor_hours', 'actual_labor_hours']
        
        for field in critical_fields:
            if field not in df.columns:
                score -= 25
                warnings.append(f"Missing critical field: {field}")
                field_quality[field] = 0
            else:
                null_pct = (df[field].isna().sum() / len(df)) * 100
                field_quality[field] = 100 - null_pct
                
                if null_pct > 50:
                    score -= 15
                    warnings.append(f"{field}: {null_pct:.0f}% missing - analysis severely limited")
                elif null_pct > 20:
                    score -= 5
                    warnings.append(f"{field}: {null_pct:.0f}% missing - may affect accuracy")
                
                # Check for negative costs
                if field.endswith('_cost') and (df[field] < 0).any():
                    score -= 10
                    warnings.append(f"{field}: negative values detected")
        
        # Check enhanced fields (don't penalize, just note limitations)
        limitations = []
        if 'material_code' not in df.columns or df['material_code'].isna().sum() > len(df) * 0.7:
            limitations.append("Limited pattern detection (material_code sparse)")
        
        if 'machine_id' not in df.columns:
            limitations.append("No equipment correlation (machine_id missing)")
        
        score = max(0, min(100, score))
        
        return {
            'score': score,
            'grade': 'excellent' if score >= 85 else 'good' if score >= 70 else 'fair' if score >= 50 else 'poor',
            'warnings': warnings,
            'limitations': limitations,
            'field_quality': field_quality,
            'total_rows': len(df)
        }
    
    def _calculate_thresholds(self, df: pd.DataFrame, facility_settings: dict) -> dict:
        """Calculate adaptive thresholds based on data characteristics"""
        
        # Calculate average work order value
        labor_rate = facility_settings['labor_rate']
        df['planned_total'] = (df['planned_material_cost'].fillna(0) + 
                               df['planned_labor_hours'].fillna(0) * labor_rate)
        
        avg_order_value = df['planned_total'].mean()
        
        # Variance threshold: percentage of typical order OR minimum $500
        variance_threshold_pct = facility_settings['variance_threshold_pct']
        calculated_threshold = max(500, avg_order_value * (variance_threshold_pct / 100))
        
        return {
            'variance_threshold': calculated_threshold,
            'variance_threshold_pct': variance_threshold_pct,
            'avg_order_value': avg_order_value,
            'sample_size': len(df)
        }
    def _calculate_variance_breakdown(self, row, labor_rate: float) -> dict:
        """Calculate detailed material vs labor breakdown"""
        
        planned_material = row.get('planned_material_cost', 0) or 0
        actual_material = row.get('actual_material_cost', 0) or 0
        planned_labor_hours = row.get('planned_labor_hours', 0) or 0
        actual_labor_hours = row.get('actual_labor_hours', 0) or 0
        
        planned_labor_cost = planned_labor_hours * labor_rate
        actual_labor_cost = actual_labor_hours * labor_rate
        
        material_variance = actual_material - planned_material
        labor_variance = actual_labor_cost - planned_labor_cost
        total_variance = material_variance + labor_variance
        
        # Calculate percentages
        if total_variance == 0:
            material_pct = 50
            labor_pct = 50
        else:
            material_pct = (abs(material_variance) / abs(total_variance)) * 100
            labor_pct = (abs(labor_variance) / abs(total_variance)) * 100
        
        return {
            'planned_total': planned_material + planned_labor_cost,
            'actual_total': actual_material + actual_labor_cost,
            'variance_breakdown': {
                'material': {
                    'planned': round(planned_material, 2),
                    'actual': round(actual_material, 2),
                    'variance': round(material_variance, 2),
                    'percentage': round(material_pct, 1),
                    'variance_pct': round((material_variance / planned_material * 100) if planned_material > 0 else 0, 1),
                    'driver': self._determine_material_driver(row, material_variance, planned_material)
                },
                'labor': {
                    'planned': round(planned_labor_cost, 2),
                    'actual': round(actual_labor_cost, 2),
                    'variance': round(labor_variance, 2),
                    'percentage': round(labor_pct, 1),
                    'variance_pct': round((labor_variance / planned_labor_cost * 100) if planned_labor_cost > 0 else 0, 1),
                    'hours_variance': round(actual_labor_hours - planned_labor_hours, 1),
                    'driver': self._determine_labor_driver(row, labor_variance, planned_labor_hours, actual_labor_hours)
                }
            },
            'primary_driver': 'material' if abs(material_variance) > abs(labor_variance) else 'labor'
        }
    
    def _determine_material_driver(self, row, variance: float, planned: float) -> str:
        """Generate specific material variance driver description"""
        
        if planned == 0:
            return "Material costs not planned but incurred"
        
        variance_pct = (variance / planned * 100)
        
        if abs(variance_pct) < 10:
            return "Within normal variance range"
        elif variance_pct > 50:
            return f"Significant cost spike (+{variance_pct:.0f}% vs plan)"
        elif variance_pct > 20:
            return f"Moderate cost increase (+{variance_pct:.0f}% vs plan)"
        elif variance_pct < -20:
            return f"Cost savings achieved (-{abs(variance_pct):.0f}% vs plan)"
        else:
            return f"Cost variance (+{variance_pct:.0f}% vs plan)"
    
    def _determine_labor_driver(self, row, variance: float, planned_hrs: float, actual_hrs: float) -> str:
        """Generate specific labor variance driver description"""
        
        if planned_hrs == 0:
            return "Unplanned labor hours incurred"
        
        hours_variance_pct = ((actual_hrs - planned_hrs) / planned_hrs * 100)
        
        # Check for quality issues indicator
        has_quality_issues = row.get('quality_issues') or row.get('units_scrapped', 0) > 0
        
        if abs(hours_variance_pct) < 10:
            return "Within normal variance range"
        elif hours_variance_pct > 50 and has_quality_issues:
            return f"Significant overrun (+{hours_variance_pct:.0f}%) likely due to rework"
        elif hours_variance_pct > 50:
            return f"Significant overrun (+{hours_variance_pct:.0f}% vs plan)"
        elif hours_variance_pct > 20:
            return f"Moderate overrun (+{hours_variance_pct:.0f}% vs plan)"
        else:
            return f"Labor hours variance (+{hours_variance_pct:.0f}% vs plan)"