
"""
Baseline Tracker - Maintains 30-day rolling averages for facility metrics
"""
from datetime import datetime, timedelta
from typing import Dict, List, Optional
import logging

logger = logging.getLogger(__name__)

class BaselineTracker:
    def __init__(self, supabase_client):
        self.supabase = supabase_client
    
    def update_baselines(self, facility_id: int, batch_id: str) -> Dict:
        """
        Update all baselines after a new batch upload
        Returns dict of updated metrics
        """
        try:
            # Get 30-day window of data
            thirty_days_ago = (datetime.now() - timedelta(days=30)).isoformat()
            
            # Fetch recent work orders
            response = self.supabase.table('work_orders')\
                .select('*')\
                .eq('facility_id', facility_id)\
                .gte('upload_timestamp', thirty_days_ago)\
                .execute()
            
            work_orders = response.data
            
            if not work_orders:
                logger.warning(f"No work orders found for facility {facility_id}")
                return {}
            
            # Calculate and update baselines for different metrics
            updates = {}
            
            # Material cost baselines
            material_baselines = self._calculate_material_baselines(work_orders, facility_id)
            updates['material_costs'] = material_baselines
            
            # Labor hour baselines
            labor_baselines = self._calculate_labor_baselines(work_orders, facility_id)
            updates['labor_hours'] = labor_baselines
            
            # Scrap rate baselines
            scrap_baselines = self._calculate_scrap_baselines(work_orders, facility_id)
            updates['scrap_rates'] = scrap_baselines
            
            # Equipment cycle time baselines (if equipment_id exists)
            equipment_baselines = self._calculate_equipment_baselines(work_orders, facility_id)
            updates['equipment_performance'] = equipment_baselines
            
            logger.info(f"Updated baselines for facility {facility_id}: {len(updates)} metric types")
            return updates
            
        except Exception as e:
            logger.error(f"Error updating baselines: {str(e)}")
            return {}
    
    def _calculate_material_baselines(self, work_orders: List[Dict], facility_id: int) -> int:
        """Calculate and store material cost baselines"""
        material_costs = {}
        
        for wo in work_orders:
            material_code = wo.get('material_code')
            actual_cost = wo.get('actual_material_cost')
            
            if material_code and actual_cost:
                if material_code not in material_costs:
                    material_costs[material_code] = []
                material_costs[material_code].append(float(actual_cost))
        
        # Update database
        count = 0
        for material_code, costs in material_costs.items():
            if costs:
                avg = sum(costs) / len(costs)
                std = self._calculate_std(costs)
                self._upsert_baseline(
                    facility_id, 
                    'material_cost', 
                    material_code, 
                    avg, 
                    std, 
                    len(costs)
                )
                count += 1
        
        return count
    
    def _calculate_labor_baselines(self, work_orders: List[Dict], facility_id: int) -> int:
        """Calculate and store labor hour baselines"""
        labor_hours = {}
        
        for wo in work_orders:
            operation_type = wo.get('operation_type') or 'general'
            actual_hours = wo.get('actual_labor_hours')
            
            # Skip if operation_type is empty string or None
            if not operation_type or operation_type.strip() == '':
                operation_type = 'general'
            
            if actual_hours:
                if operation_type not in labor_hours:
                    labor_hours[operation_type] = []
                labor_hours[operation_type].append(float(actual_hours))
        
        count = 0
        for operation_type, hours in labor_hours.items():
            if hours and operation_type:
                avg = sum(hours) / len(hours)
                std = self._calculate_std(hours)
                self._upsert_baseline(
                    facility_id, 
                    'labor_hours', 
                    operation_type, 
                    avg, 
                    std, 
                    len(hours)
                )
                count += 1
        
        return count
    
    def _calculate_scrap_baselines(self, work_orders: List[Dict], facility_id: int) -> int:
        """Calculate and store scrap rate baselines"""
        scrap_rates = {}
        
        for wo in work_orders:
            material_code = wo.get('material_code')
            units_scrapped = wo.get('units_scrapped', 0)
            units_produced = wo.get('units_produced') or wo.get('actual_quantity')
            
            if material_code and units_produced and float(units_produced) > 0:
                scrap_rate = (float(units_scrapped) / float(units_produced)) * 100
                if material_code not in scrap_rates:
                    scrap_rates[material_code] = []
                scrap_rates[material_code].append(scrap_rate)
        
        count = 0
        for material_code, rates in scrap_rates.items():
            if rates:
                avg = sum(rates) / len(rates)
                std = self._calculate_std(rates)
                self._upsert_baseline(
                    facility_id, 
                    'scrap_rate', 
                    material_code, 
                    avg, 
                    std, 
                    len(rates)
                )
                count += 1
        
        return count
    
    def _calculate_equipment_baselines(self, work_orders: List[Dict], facility_id: int) -> int:
        """Calculate and store equipment performance baselines"""
        equipment_hours = {}
        
        for wo in work_orders:
            equipment_id = wo.get('equipment_id') or wo.get('machine_id')
            actual_hours = wo.get('actual_labor_hours')
            
            if equipment_id and actual_hours:
                if equipment_id not in equipment_hours:
                    equipment_hours[equipment_id] = []
                equipment_hours[equipment_id].append(float(actual_hours))
        
        count = 0
        for equipment_id, hours in equipment_hours.items():
            if hours:
                avg = sum(hours) / len(hours)
                std = self._calculate_std(hours)
                self._upsert_baseline(
                    facility_id, 
                    'equipment_cycle_time', 
                    equipment_id, 
                    avg, 
                    std, 
                    len(hours)
                )
                count += 1
        
        return count
    
    def _upsert_baseline(self, facility_id: int, metric_type: str, identifier: str, 
                         avg: float, std: float, count: int):
        """Insert or update a baseline record"""
        try:
            # Use onConflict parameter for proper upsert
            self.supabase.table('facility_baselines').upsert(
                {
                    'facility_id': facility_id,
                    'metric_type': metric_type,
                    'identifier': identifier,
                    'rolling_avg': round(avg, 2),
                    'rolling_std': round(std, 2),
                    'sample_count': count,
                    'last_updated': datetime.now().isoformat()
                },
                on_conflict='facility_id,metric_type,identifier'
            ).execute()
        except Exception as e:
            logger.error(f"Error upserting baseline: {str(e)}")
    
    def get_baseline(self, facility_id: int, metric_type: str, identifier: str) -> Optional[Dict]:
        """Get a specific baseline"""
        try:
            response = self.supabase.table('facility_baselines')\
                .select('*')\
                .eq('facility_id', facility_id)\
                .eq('metric_type', metric_type)\
                .eq('identifier', identifier)\
                .execute()
            
            if response.data:
                return response.data[0]
            return None
        except Exception as e:
            logger.error(f"Error fetching baseline: {str(e)}")
            return None
    
    @staticmethod
    def _calculate_std(values: List[float]) -> float:
        """Calculate standard deviation"""
        if len(values) < 2:
            return 0.0
        mean = sum(values) / len(values)
        variance = sum((x - mean) ** 2 for x in values) / len(values)
        return variance ** 0.5
