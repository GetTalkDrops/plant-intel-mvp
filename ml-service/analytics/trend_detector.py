
"""
Trend Detector - Identifies when metrics diverged from normal
"""
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
import logging

logger = logging.getLogger(__name__)

class TrendDetector:
    def __init__(self, supabase_client):
        self.supabase = supabase_client
    
    def detect_trend_start(self, facility_id: int, metric_type: str, 
                          identifier: str, current_value: float, 
                          baseline_avg: float, baseline_std: float) -> Optional[Dict]:
        """
        Detect when a metric started diverging from baseline
        Returns: dict with start_date, days_ago, deviation_pct
        """
        try:
            # Get historical work orders for this metric
            thirty_days_ago = (datetime.now() - timedelta(days=30)).isoformat()
            
            response = self.supabase.table('work_orders')\
                .select('*')\
                .eq('facility_id', facility_id)\
                .gte('upload_timestamp', thirty_days_ago)\
                .order('upload_timestamp', desc=False)\
                .execute()
            
            work_orders = response.data
            
            if not work_orders:
                return None
            
            # Extract values based on metric type
            data_points = self._extract_metric_values(
                work_orders, metric_type, identifier
            )
            
            if len(data_points) < 2:
                return None
            
            # Find divergence point
            divergence_point = self._find_divergence_point(
                data_points, baseline_avg, baseline_std
            )
            
            if divergence_point:
                days_ago = (datetime.now() - divergence_point['date']).days
                deviation_pct = ((current_value - baseline_avg) / baseline_avg * 100) if baseline_avg != 0 else 0
                
                return {
                    'start_date': divergence_point['date'].isoformat(),
                    'days_ago': days_ago,
                    'deviation_pct': round(deviation_pct, 1),
                    'baseline_avg': baseline_avg,
                    'current_value': current_value
                }
            
            return None
            
        except Exception as e:
            logger.error(f"Error detecting trend start: {str(e)}")
            return None
    
    def _extract_metric_values(self, work_orders: List[Dict], 
                               metric_type: str, identifier: str) -> List[Dict]:
        """Extract metric values from work orders"""
        data_points = []
        
        for wo in work_orders:
            value = None
            matches = False
            
            if metric_type == 'material_cost':
                if wo.get('material_code') == identifier:
                    value = wo.get('actual_material_cost')
                    matches = True
            
            elif metric_type == 'labor_hours':
                if wo.get('operation_type', 'general') == identifier:
                    value = wo.get('actual_labor_hours')
                    matches = True
            
            elif metric_type == 'scrap_rate':
                if wo.get('material_code') == identifier:
                    units_scrapped = wo.get('units_scrapped', 0)
                    units_produced = wo.get('units_produced') or wo.get('actual_quantity')
                    if units_produced and float(units_produced) > 0:
                        value = (float(units_scrapped) / float(units_produced)) * 100
                        matches = True
            
            elif metric_type == 'equipment_cycle_time':
                equipment_id = wo.get('equipment_id') or wo.get('machine_id')
                if equipment_id == identifier:
                    value = wo.get('actual_labor_hours')
                    matches = True
            
            if matches and value is not None:
                data_points.append({
                    'date': datetime.fromisoformat(wo['upload_timestamp'].replace('Z', '+00:00')),
                    'value': float(value)
                })
        
        return sorted(data_points, key=lambda x: x['date'])
    
    def _find_divergence_point(self, data_points: List[Dict], 
                               baseline_avg: float, baseline_std: float) -> Optional[Dict]:
        """Find when values started consistently diverging from baseline"""
        if len(data_points) < 3:
            return None
        
        # Define divergence threshold (2 standard deviations)
        threshold = baseline_std * 2 if baseline_std > 0 else baseline_avg * 0.2
        
        # Look for sustained divergence (3+ consecutive points outside threshold)
        consecutive_divergent = 0
        divergence_start = None
        
        for point in data_points:
            deviation = abs(point['value'] - baseline_avg)
            
            if deviation > threshold:
                consecutive_divergent += 1
                if consecutive_divergent == 1:
                    divergence_start = point
                if consecutive_divergent >= 3:
                    return divergence_start
            else:
                consecutive_divergent = 0
                divergence_start = None
        
        return None
    
    def calculate_deviation(self, current_value: float, baseline_avg: float) -> Dict:
        """Calculate deviation from baseline"""
        if baseline_avg == 0:
            return {
                'deviation_pct': 0,
                'deviation_abs': current_value,
                'multiplier': 0,
                'direction': 'higher' if current_value > 0 else 'lower'
            }
        
        deviation_pct = ((current_value - baseline_avg) / baseline_avg) * 100
        deviation_abs = current_value - baseline_avg
        multiplier = current_value / baseline_avg if baseline_avg != 0 else 0
        direction = 'higher' if current_value > baseline_avg else 'lower'
        
        return {
            'deviation_pct': round(deviation_pct, 1),
            'deviation_abs': round(deviation_abs, 2),
            'multiplier': round(multiplier, 2),
            'direction': direction
        }
    
    def format_comparative_text(self, current_value: float, baseline_avg: float, 
                                metric_name: str, trend_info: Optional[Dict] = None) -> str:
        """Format comparative narrative text"""
        deviation = self.calculate_deviation(current_value, baseline_avg)
        
        # Base comparison
        text = f"{metric_name} is ${current_value:,.2f} vs your typical ${baseline_avg:,.2f}"
        
        # Add multiplier if significant
        if abs(deviation['multiplier'] - 1) > 0.3:
            text += f" ({deviation['multiplier']}x {deviation['direction']})"
        
        # Add trend start info if available
        if trend_info and trend_info.get('days_ago'):
            days = trend_info['days_ago']
            if days == 0:
                text += " - started today"
            elif days == 1:
                text += " - started yesterday"
            elif days < 7:
                text += f" - started {days} days ago"
            elif days < 30:
                weeks = days // 7
                text += f" - started {weeks} week{'s' if weeks > 1 else ''} ago"
            else:
                text += f" - started {days} days ago"
        
        return text
