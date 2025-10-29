"""
Degradation Detector - Identifies deteriorating performance over time
Detects equipment degradation, cost increases, and quality drift
"""
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
import logging

logger = logging.getLogger(__name__)

class DegradationDetector:
    def __init__(self, supabase_client):
        self.supabase = supabase_client
    
    def detect_equipment_degradation(self, facility_id: int, equipment_id: str, 
                                     window_days: int = 30) -> Optional[Dict]:
        """
        Detect if equipment performance is degrading over time
        Returns: trend info, degradation rate, estimated time to failure
        """
        try:
            # Get historical data for this equipment
            cutoff_date = (datetime.now() - timedelta(days=window_days)).isoformat()
            
            response = self.supabase.table('work_orders')\
                .select('actual_labor_hours, upload_timestamp, work_order_number')\
                .eq('facility_id', facility_id)\
                .or_(f'equipment_id.eq.{equipment_id},machine_id.eq.{equipment_id}')\
                .gte('upload_timestamp', cutoff_date)\
                .order('upload_timestamp', desc=False)\
                .execute()
            
            if not response.data or len(response.data) < 5:
                return None
            
            # Extract time series
            data_points = []
            for wo in response.data:
                if wo.get('actual_labor_hours'):
                    data_points.append({
                        'date': datetime.fromisoformat(wo['upload_timestamp'].replace('Z', '+00:00')),
                        'hours': float(wo['actual_labor_hours']),
                        'work_order': wo['work_order_number']
                    })
            
            if len(data_points) < 5:
                return None
            
            # Calculate trend
            trend = self._calculate_trend(data_points, 'hours')
            
            if not trend:
                return None
            
            # Determine if degrading (positive slope = getting worse/slower)
            if trend['slope'] > 0 and trend['slope_significance'] > 0.3:
                degradation_pct = (trend['recent_avg'] - trend['early_avg']) / trend['early_avg'] * 100
                
                # Estimate when performance will be unacceptable (2x baseline)
                acceptable_threshold = trend['early_avg'] * 2
                days_to_threshold = None
                if trend['slope'] > 0:
                    remaining = acceptable_threshold - trend['recent_avg']
                    if remaining > 0:
                        days_to_threshold = int(remaining / (trend['slope'] * 1))  # slope per data point
                
                return {
                    'equipment_id': equipment_id,
                    'status': 'degrading',
                    'degradation_pct': round(degradation_pct, 1),
                    'trend_direction': 'worsening',
                    'early_avg': round(trend['early_avg'], 2),
                    'recent_avg': round(trend['recent_avg'], 2),
                    'slope': round(trend['slope'], 4),
                    'days_analyzed': window_days,
                    'data_points': len(data_points),
                    'days_to_threshold': days_to_threshold,
                    'recommendation': self._generate_equipment_recommendation(
                        degradation_pct, days_to_threshold
                    )
                }
            
            return None
            
        except Exception as e:
            logger.error(f"Error detecting equipment degradation: {str(e)}")
            return None
    
    def detect_cost_trend(self, facility_id: int, material_code: str, 
                         window_days: int = 30) -> Optional[Dict]:
        """
        Detect if material costs are trending up or down
        Returns: trend info, inflection points, correlation hints
        """
        try:
            cutoff_date = (datetime.now() - timedelta(days=window_days)).isoformat()
            
            response = self.supabase.table('work_orders')\
                .select('actual_material_cost, upload_timestamp, supplier_id, work_order_number')\
                .eq('facility_id', facility_id)\
                .eq('material_code', material_code)\
                .gte('upload_timestamp', cutoff_date)\
                .order('upload_timestamp', desc=False)\
                .execute()
            
            if not response.data or len(response.data) < 5:
                return None
            
            # Extract time series
            data_points = []
            for wo in response.data:
                if wo.get('actual_material_cost'):
                    data_points.append({
                        'date': datetime.fromisoformat(wo['upload_timestamp'].replace('Z', '+00:00')),
                        'cost': float(wo['actual_material_cost']),
                        'supplier': wo.get('supplier_id'),
                        'work_order': wo['work_order_number']
                    })
            
            if len(data_points) < 5:
                return None
            
            # Calculate trend
            trend = self._calculate_trend(data_points, 'cost')
            
            if not trend:
                return None
            
            # Check for significant trend
            if abs(trend['slope']) > 0 and trend['slope_significance'] > 0.3:
                cost_change_pct = (trend['recent_avg'] - trend['early_avg']) / trend['early_avg'] * 100
                
                # Detect inflection point (when did trend start?)
                inflection = self._find_inflection_point(data_points, 'cost')
                
                # Check for supplier correlation
                supplier_change = self._detect_supplier_change(data_points, inflection)
                
                return {
                    'material_code': material_code,
                    'status': 'trending',
                    'trend_direction': 'increasing' if trend['slope'] > 0 else 'decreasing',
                    'cost_change_pct': round(cost_change_pct, 1),
                    'early_avg': round(trend['early_avg'], 2),
                    'recent_avg': round(trend['recent_avg'], 2),
                    'slope': round(trend['slope'], 4),
                    'days_analyzed': window_days,
                    'data_points': len(data_points),
                    'inflection_date': inflection.get('date') if inflection else None,
                    'inflection_days_ago': inflection.get('days_ago') if inflection else None,
                    'supplier_correlation': supplier_change,
                    'recommendation': self._generate_cost_recommendation(
                        cost_change_pct, supplier_change
                    )
                }
            
            return None
            
        except Exception as e:
            logger.error(f"Error detecting cost trend: {str(e)}")
            return None
    
    def detect_quality_drift(self, facility_id: int, material_code: str,
                            window_days: int = 30) -> Optional[Dict]:
        """
        Detect if scrap rates are drifting higher over time
        Returns: drift info, trend, correlation with events
        """
        try:
            cutoff_date = (datetime.now() - timedelta(days=window_days)).isoformat()
            
            response = self.supabase.table('work_orders')\
                .select('units_scrapped, units_produced, actual_quantity, upload_timestamp, supplier_id, equipment_id, machine_id')\
                .eq('facility_id', facility_id)\
                .eq('material_code', material_code)\
                .gte('upload_timestamp', cutoff_date)\
                .order('upload_timestamp', desc=False)\
                .execute()
            
            if not response.data or len(response.data) < 5:
                return None
            
            # Calculate scrap rates
            data_points = []
            for wo in response.data:
                units_scrapped = wo.get('units_scrapped', 0)
                units_produced = wo.get('units_produced') or wo.get('actual_quantity')
                
                if units_produced and float(units_produced) > 0:
                    scrap_rate = (float(units_scrapped) / float(units_produced)) * 100
                    data_points.append({
                        'date': datetime.fromisoformat(wo['upload_timestamp'].replace('Z', '+00:00')),
                        'scrap_rate': scrap_rate,
                        'supplier': wo.get('supplier_id'),
                        'equipment': wo.get('equipment_id') or wo.get('machine_id')
                    })
            
            if len(data_points) < 5:
                return None
            
            # Calculate trend
            trend = self._calculate_trend(data_points, 'scrap_rate')
            
            if not trend:
                return None
            
            # Check for upward drift (worsening quality)
            if trend['slope'] > 0 and trend['slope_significance'] > 0.3:
                drift_pct = trend['recent_avg'] - trend['early_avg']
                
                # Detect inflection point
                inflection = self._find_inflection_point(data_points, 'scrap_rate')
                
                # Check for correlations
                supplier_change = self._detect_supplier_change(data_points, inflection)
                equipment_change = self._detect_equipment_pattern(data_points)
                
                return {
                    'material_code': material_code,
                    'status': 'drifting',
                    'drift_direction': 'worsening',
                    'early_scrap_rate': round(trend['early_avg'], 2),
                    'recent_scrap_rate': round(trend['recent_avg'], 2),
                    'drift_pct': round(drift_pct, 2),
                    'multiplier': round(trend['recent_avg'] / trend['early_avg'], 2) if trend['early_avg'] > 0 else 0,
                    'days_analyzed': window_days,
                    'data_points': len(data_points),
                    'inflection_date': inflection.get('date') if inflection else None,
                    'inflection_days_ago': inflection.get('days_ago') if inflection else None,
                    'supplier_correlation': supplier_change,
                    'equipment_correlation': equipment_change,
                    'recommendation': self._generate_quality_recommendation(
                        drift_pct, supplier_change, equipment_change
                    )
                }
            
            return None
            
        except Exception as e:
            logger.error(f"Error detecting quality drift: {str(e)}")
            return None
    
    def _calculate_trend(self, data_points: List[Dict], value_key: str) -> Optional[Dict]:
        """Calculate linear trend from time series data"""
        if len(data_points) < 2:
            return None
        
        # Simple linear regression
        values = [p[value_key] for p in data_points]
        n = len(values)
        
        # Calculate slope using first third vs last third
        third = n // 3
        if third < 1:
            third = 1
        
        early_values = values[:third]
        recent_values = values[-third:]
        
        early_avg = sum(early_values) / len(early_values)
        recent_avg = sum(recent_values) / len(recent_values)
        
        # Simple slope calculation
        slope = (recent_avg - early_avg) / n
        
        # Significance: how different is recent vs early (as fraction of early)
        slope_significance = abs(recent_avg - early_avg) / early_avg if early_avg > 0 else 0
        
        return {
            'slope': slope,
            'early_avg': early_avg,
            'recent_avg': recent_avg,
            'slope_significance': slope_significance
        }
    
    def _find_inflection_point(self, data_points: List[Dict], value_key: str) -> Optional[Dict]:
        """Find when the trend started (inflection point)"""
        if len(data_points) < 3:
            return None
        
        values = [p[value_key] for p in data_points]
        dates = [p['date'] for p in data_points]
        
        # Calculate moving average
        window = 3
        moving_avgs = []
        for i in range(len(values) - window + 1):
            avg = sum(values[i:i+window]) / window
            moving_avgs.append(avg)
        
        # Find largest change between consecutive windows
        max_change = 0
        inflection_idx = 0
        for i in range(1, len(moving_avgs)):
            change = abs(moving_avgs[i] - moving_avgs[i-1])
            if change > max_change:
                max_change = change
                inflection_idx = i + window // 2
        
        if inflection_idx < len(dates):
            days_ago = (datetime.now() - dates[inflection_idx].replace(tzinfo=None)).days
            return {
                'date': dates[inflection_idx].isoformat(),
                'days_ago': days_ago
            }
        
        return None
    
    def _detect_supplier_change(self, data_points: List[Dict], inflection: Optional[Dict]) -> Optional[str]:
        """Check if supplier changed around inflection point"""
        if not inflection or 'supplier' not in data_points[0]:
            return None
        
        suppliers = [p.get('supplier') for p in data_points if p.get('supplier')]
        if len(set(suppliers)) > 1:
            return "Supplier changed during this period"
        
        return None
    
    def _detect_equipment_pattern(self, data_points: List[Dict]) -> Optional[str]:
        """Check if quality issues correlate with specific equipment"""
        equipment_list = [p.get('equipment') for p in data_points if p.get('equipment')]
        if equipment_list and len(set(equipment_list)) > 1:
            return "Multiple equipment used - check for equipment-specific patterns"
        
        return None
    
    def _generate_equipment_recommendation(self, degradation_pct: float, 
                                          days_to_threshold: Optional[int]) -> str:
        """Generate actionable recommendation for equipment degradation"""
        if degradation_pct > 30:
            return f"Critical: Schedule immediate maintenance - performance degraded {degradation_pct}%"
        elif degradation_pct > 15:
            if days_to_threshold and days_to_threshold < 14:
                return f"Schedule maintenance within {days_to_threshold} days to prevent downtime"
            return "Schedule preventive maintenance within 2 weeks"
        else:
            return "Monitor equipment performance - early degradation detected"
    
    def _generate_cost_recommendation(self, cost_change_pct: float,
                                     supplier_correlation: Optional[str]) -> str:
        """Generate actionable recommendation for cost trends"""
        if supplier_correlation:
            return f"Investigate supplier quality or pricing - {abs(cost_change_pct):.1f}% cost change"
        elif cost_change_pct > 20:
            return "Request pricing review or seek alternative suppliers"
        elif cost_change_pct > 10:
            return "Monitor material costs - upward trend detected"
        else:
            return "Track costs for continued trend"
    
    def _generate_quality_recommendation(self, drift_pct: float,
                                        supplier_correlation: Optional[str],
                                        equipment_correlation: Optional[str]) -> str:
        """Generate actionable recommendation for quality drift"""
        if supplier_correlation:
            return f"Request supplier COA and quality documentation - {drift_pct:.1f}% increase in scrap"
        elif equipment_correlation:
            return "Inspect equipment and review process parameters"
        elif drift_pct > 5:
            return "Investigate root cause - significant quality degradation detected"
        else:
            return "Monitor quality trend - early drift detected"
