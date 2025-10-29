"""
Correlation Analyzer - Finds cause/effect patterns in manufacturing data
Correlates degradation with events like supplier changes, maintenance, batch transitions
"""
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
import logging

logger = logging.getLogger(__name__)

class CorrelationAnalyzer:
    def __init__(self, supabase_client):
        self.supabase = supabase_client
    
    def find_cost_correlations(self, facility_id: int, material_code: str,
                               inflection_date: Optional[str] = None,
                               window_days: int = 30) -> List[Dict]:
        """
        Find events that correlate with cost changes
        Returns: list of potential correlations (supplier changes, batch changes, etc.)
        """
        correlations = []
        
        try:
            cutoff_date = (datetime.now() - timedelta(days=window_days)).isoformat()
            
            # Get work orders for this material
            response = self.supabase.table('work_orders')\
                .select('upload_timestamp, supplier_id, actual_material_cost, batch_id')\
                .eq('facility_id', facility_id)\
                .eq('material_code', material_code)\
                .gte('upload_timestamp', cutoff_date)\
                .order('upload_timestamp', desc=False)\
                .execute()
            
            if not response.data or len(response.data) < 5:
                return correlations
            
            # Check for supplier changes
            supplier_change = self._detect_supplier_change_timing(response.data, inflection_date)
            if supplier_change:
                correlations.append(supplier_change)
            
            # Check for batch changes
            batch_change = self._detect_batch_change(response.data, inflection_date)
            if batch_change:
                correlations.append(batch_change)
            
            # Check for price jumps
            price_jump = self._detect_sudden_price_change(response.data)
            if price_jump:
                correlations.append(price_jump)
            
            return correlations
            
        except Exception as e:
            logger.error(f"Error finding cost correlations: {str(e)}")
            return correlations
    
    def find_quality_correlations(self, facility_id: int, material_code: str,
                                  inflection_date: Optional[str] = None,
                                  window_days: int = 30) -> List[Dict]:
        """
        Find events that correlate with quality changes
        Returns: list of potential correlations
        """
        correlations = []
        
        try:
            cutoff_date = (datetime.now() - timedelta(days=window_days)).isoformat()
            
            # Get work orders
            response = self.supabase.table('work_orders')\
                .select('upload_timestamp, supplier_id, equipment_id, machine_id, units_scrapped, units_produced, actual_quantity')\
                .eq('facility_id', facility_id)\
                .eq('material_code', material_code)\
                .gte('upload_timestamp', cutoff_date)\
                .order('upload_timestamp', desc=False)\
                .execute()
            
            if not response.data or len(response.data) < 5:
                return correlations
            
            # Check for supplier changes
            supplier_change = self._detect_supplier_change_timing(response.data, inflection_date)
            if supplier_change:
                correlations.append({
                    **supplier_change,
                    'quality_related': True
                })
            
            # Check for equipment patterns
            equipment_pattern = self._detect_equipment_quality_pattern(response.data)
            if equipment_pattern:
                correlations.append(equipment_pattern)
            
            return correlations
            
        except Exception as e:
            logger.error(f"Error finding quality correlations: {str(e)}")
            return correlations
    
    def find_equipment_correlations(self, facility_id: int, equipment_id: str,
                                   window_days: int = 30) -> List[Dict]:
        """
        Find events that correlate with equipment degradation
        Returns: list of potential correlations (maintenance, usage patterns, etc.)
        """
        correlations = []
        
        try:
            cutoff_date = (datetime.now() - timedelta(days=window_days)).isoformat()
            
            # Get work orders for this equipment
            response = self.supabase.table('work_orders')\
                .select('upload_timestamp, actual_labor_hours, material_code, shift, operator')\
                .eq('facility_id', facility_id)\
                .or_(f'equipment_id.eq.{equipment_id},machine_id.eq.{equipment_id}')\
                .gte('upload_timestamp', cutoff_date)\
                .order('upload_timestamp', desc=False)\
                .execute()
            
            if not response.data or len(response.data) < 5:
                return correlations
            
            # Check for usage intensity changes
            usage_pattern = self._detect_usage_pattern_change(response.data)
            if usage_pattern:
                correlations.append(usage_pattern)
            
            # Check for shift/operator patterns
            shift_pattern = self._detect_shift_pattern(response.data)
            if shift_pattern:
                correlations.append(shift_pattern)
            
            return correlations
            
        except Exception as e:
            logger.error(f"Error finding equipment correlations: {str(e)}")
            return correlations
    
    def _detect_supplier_change_timing(self, work_orders: List[Dict], 
                                      inflection_date: Optional[str]) -> Optional[Dict]:
        """Detect if supplier changed around a key date"""
        suppliers = [wo.get('supplier_id') for wo in work_orders if wo.get('supplier_id')]
        
        if len(set(suppliers)) < 2:
            return None
        
        # Find when supplier changed
        changes = []
        prev_supplier = None
        for wo in work_orders:
            current_supplier = wo.get('supplier_id')
            if current_supplier and prev_supplier and current_supplier != prev_supplier:
                change_date = datetime.fromisoformat(wo['upload_timestamp'].replace('Z', '+00:00'))
                changes.append({
                    'date': change_date,
                    'from_supplier': prev_supplier,
                    'to_supplier': current_supplier
                })
            prev_supplier = current_supplier
        
        if changes:
            latest_change = changes[-1]
            days_ago = (datetime.now() - latest_change['date'].replace(tzinfo=None)).days
            
            return {
                'type': 'supplier_change',
                'description': f"Supplier changed from {latest_change['from_supplier']} to {latest_change['to_supplier']}",
                'date': latest_change['date'].isoformat(),
                'days_ago': days_ago,
                'correlation_strength': 'high' if inflection_date and abs(days_ago - 7) < 5 else 'medium'
            }
        
        return None
    
    def _detect_batch_change(self, work_orders: List[Dict],
                            inflection_date: Optional[str]) -> Optional[Dict]:
        """Detect significant batch number changes"""
        batches = [wo.get('batch_id') for wo in work_orders if wo.get('batch_id')]
        
        if len(set(batches)) < 2:
            return None
        
        return {
            'type': 'batch_change',
            'description': f"Material batch changed - {len(set(batches))} different batches in period",
            'correlation_strength': 'medium'
        }
    
    def _detect_sudden_price_change(self, work_orders: List[Dict]) -> Optional[Dict]:
        """Detect sudden price jumps (>20% in single step)"""
        costs = []
        for wo in work_orders:
            if wo.get('actual_material_cost'):
                costs.append({
                    'cost': float(wo['actual_material_cost']),
                    'date': wo['upload_timestamp']
                })
        
        if len(costs) < 2:
            return None
        
        # Check for jumps
        for i in range(1, len(costs)):
            prev_cost = costs[i-1]['cost']
            curr_cost = costs[i]['cost']
            
            if prev_cost > 0:
                change_pct = ((curr_cost - prev_cost) / prev_cost) * 100
                
                if abs(change_pct) > 20:
                    date = datetime.fromisoformat(costs[i]['date'].replace('Z', '+00:00'))
                    days_ago = (datetime.now() - date.replace(tzinfo=None)).days
                    
                    return {
                        'type': 'price_jump',
                        'description': f"Price jumped {change_pct:.1f}% on single order",
                        'date': date.isoformat(),
                        'days_ago': days_ago,
                        'correlation_strength': 'high'
                    }
        
        return None
    
    def _detect_equipment_quality_pattern(self, work_orders: List[Dict]) -> Optional[Dict]:
        """Detect if quality issues correlate with specific equipment"""
        equipment_scrap = {}
        
        for wo in work_orders:
            equipment = wo.get('equipment_id') or wo.get('machine_id')
            units_scrapped = wo.get('units_scrapped', 0)
            units_produced = wo.get('units_produced') or wo.get('actual_quantity')
            
            if equipment and units_produced and float(units_produced) > 0:
                scrap_rate = (float(units_scrapped) / float(units_produced)) * 100
                
                if equipment not in equipment_scrap:
                    equipment_scrap[equipment] = []
                equipment_scrap[equipment].append(scrap_rate)
        
        if len(equipment_scrap) > 1:
            # Compare average scrap rates
            avg_rates = {eq: sum(rates)/len(rates) for eq, rates in equipment_scrap.items()}
            max_eq = max(avg_rates, key=avg_rates.get)
            min_eq = min(avg_rates, key=avg_rates.get)
            
            if avg_rates[max_eq] > avg_rates[min_eq] * 2:
                return {
                    'type': 'equipment_pattern',
                    'description': f"Equipment {max_eq} has {avg_rates[max_eq]:.1f}% scrap vs {avg_rates[min_eq]:.1f}% on {min_eq}",
                    'correlation_strength': 'high'
                }
        
        return None
    
    def _detect_usage_pattern_change(self, work_orders: List[Dict]) -> Optional[Dict]:
        """Detect changes in equipment usage intensity"""
        if len(work_orders) < 10:
            return None
        
        # Compare first half vs second half
        mid = len(work_orders) // 2
        first_half = work_orders[:mid]
        second_half = work_orders[mid:]
        
        first_avg = sum(float(wo.get('actual_labor_hours', 0)) for wo in first_half if wo.get('actual_labor_hours')) / len(first_half)
        second_avg = sum(float(wo.get('actual_labor_hours', 0)) for wo in second_half if wo.get('actual_labor_hours')) / len(second_half)
        
        if first_avg > 0:
            change_pct = ((second_avg - first_avg) / first_avg) * 100
            
            if abs(change_pct) > 20:
                return {
                    'type': 'usage_intensity',
                    'description': f"Equipment usage intensity {'increased' if change_pct > 0 else 'decreased'} by {abs(change_pct):.1f}%",
                    'correlation_strength': 'medium'
                }
        
        return None
    
    def _detect_shift_pattern(self, work_orders: List[Dict]) -> Optional[Dict]:
        """Detect if performance varies by shift"""
        shift_performance = {}
        
        for wo in work_orders:
            shift = wo.get('shift')
            hours = wo.get('actual_labor_hours')
            
            if shift and hours:
                if shift not in shift_performance:
                    shift_performance[shift] = []
                shift_performance[shift].append(float(hours))
        
        if len(shift_performance) > 1:
            # Compare shifts
            avg_performance = {shift: sum(hours)/len(hours) for shift, hours in shift_performance.items()}
            
            if len(avg_performance) >= 2:
                values = list(avg_performance.values())
                if max(values) > min(values) * 1.3:
                    return {
                        'type': 'shift_pattern',
                        'description': f"Performance varies by shift - check training and procedures",
                        'correlation_strength': 'medium'
                    }
        
        return None
