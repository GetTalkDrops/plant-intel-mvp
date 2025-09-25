from supabase import create_client, Client
from typing import Dict, Set
import os
from dotenv import load_dotenv

class DataAwareResponder:
    def __init__(self):
        load_dotenv('../.env.local')
        url = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
        key = os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY")
        self.supabase: Client = create_client(url, key)
        
        # Track what data fields we actually have
        self.available_fields = set()
        self.missing_queries_log = []
        
    def analyze_available_data(self, facility_id: int = 1):
        """Check what data fields are actually available"""
        response = self.supabase.table('work_orders')\
            .select('*')\
            .eq('facility_id', facility_id)\
            .eq('demo_mode', True)\
            .limit(10)\
            .execute()
        
        self.available_fields = set()
        
        if response.data:
            sample = response.data[0]
            
            # Check which fields have meaningful data
            if sample.get('planned_labor_hours') and sample.get('actual_labor_hours'):
                self.available_fields.add('labor_hours')
            if sample.get('planned_material_cost') and sample.get('actual_material_cost'):
                self.available_fields.add('material_costs') 
            if sample.get('units_scrapped') is not None:
                self.available_fields.add('quality_metrics')
            if sample.get('material_code'):
                self.available_fields.add('equipment_materials')
                
            # We don't have these in demo data
            # shift_id, plant_id, employee_id, machine_id, etc.
    
    def get_data_aware_response(self, query: str, facility_id: int = 1) -> Dict:
        """Generate data-aware response based on available data"""
        query_lower = query.lower()
        
        self.analyze_available_data(facility_id)
        
        # Shift-related queries
        if 'shift' in query_lower:
            self._log_missing_query(query, 'shift_data')
            return {
                'type': 'data_limitation',
                'message': f"I need shift identifier data to analyze shift performance. Your current data doesn't include shift timing or shift assignments.\n\n**To analyze shift performance, I need:**\n• Shift_ID or Shift_Name field\n• Shift start/end times\n• Employee shift assignments\n\n**What I can analyze with your current data:**\n• Equipment performance by material code\n• Cost variance by work order\n• Quality issues by material type",
                'missing_data': 'shift_identifiers',
                'alternative_analyses': ['equipment_performance', 'cost_variance', 'quality_patterns']
            }
        
        # Plant/facility comparison queries
        if any(word in query_lower for word in ['plant', 'facility', 'location', 'site']):
            self._log_missing_query(query, 'multi_plant_data')
            return {
                'type': 'data_limitation', 
                'message': f"I need data from multiple facilities to compare plant performance. Your current dataset represents one facility.\n\n**To compare plants, I need:**\n• Facility_ID or Plant_Name fields\n• Consistent metrics across locations\n• Geographic or organizational identifiers\n\n**What I can analyze within this facility:**\n• Operations by work order type (PROD, MAINT, QC, etc.)\n• Equipment performance by material code\n• Process efficiency patterns",
                'missing_data': 'multi_facility_data',
                'alternative_analyses': ['operation_efficiency', 'equipment_analysis', 'cost_patterns']
            }
        
        # Employee/worker performance queries
        if any(word in query_lower for word in ['employee', 'worker', 'operator', 'technician', 'staff']):
            self._log_missing_query(query, 'employee_data')
            return {
                'type': 'data_limitation',
                'message': f"I need employee identifier data to analyze worker performance. Your current data focuses on equipment and materials rather than individual workers.\n\n**To analyze employee performance, I need:**\n• Employee_ID or Worker_Name fields\n• Individual task assignments\n• Personal productivity metrics\n\n**What I can analyze instead:**\n• Overall labor efficiency patterns\n• Process performance by operation type\n• Equipment utilization trends",
                'missing_data': 'employee_identifiers',
                'alternative_analyses': ['labor_efficiency', 'process_analysis', 'equipment_utilization']
            }
        
        # Machine/specific equipment queries (when they ask for machine IDs we don't have)
        if any(word in query_lower for word in ['machine', 'line', 'station']) and not any(mat in query_lower for mat in ['mat-', 'material']):
            self._log_missing_query(query, 'machine_data')
            return {
                'type': 'data_limitation',
                'message': f"I need specific machine identifier data to analyze individual machines or production lines. Your current data uses material codes as equipment proxies.\n\n**To analyze specific machines, I need:**\n• Machine_ID or Equipment_Name fields\n• Production line identifiers\n• Individual machine performance metrics\n\n**What I can analyze with material codes:**\n• Performance patterns by material type (MAT-1900, MAT-1800, etc.)\n• Equipment issues inferred from labor and quality patterns\n• Maintenance needs based on performance degradation",
                'missing_data': 'machine_identifiers',
                'alternative_analyses': ['material_performance', 'inferred_equipment_health', 'maintenance_prediction']
            }
        
        # Return None if this isn't a data limitation case
        return None
    
    def _log_missing_query(self, query: str, data_type: str):
        """Log queries that need data we don't have"""
        self.missing_queries_log.append({
            'query': query,
            'missing_data_type': data_type,
            'timestamp': 'demo_session'
        })
        
        # In a real system, you'd write to a file or database
        # For now, just track in memory for the session

# Test the data-aware responder
if __name__ == "__main__":
    responder = DataAwareResponder()
    
    test_queries = [
        "what shift performs best",
        "which plant has better quality",
        "what employee is most productive",
        "how is machine line 3 performing"
    ]
    
    for query in test_queries:
        result = responder.get_data_aware_response(query)
        if result:
            print(f"Query: {query}")
            print(f"Response: {result['message'][:100]}...")
            print(f"Missing: {result['missing_data']}")
            print("---")
