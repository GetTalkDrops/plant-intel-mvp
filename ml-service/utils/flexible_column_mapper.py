"""
Flexible Column Mapper - Handles various CSV column naming conventions
Allows users to upload CSVs with different column names and maps them to Supabase schema
"""

import re
from typing import Dict, List, Optional, Tuple
from difflib import SequenceMatcher

class FlexibleColumnMapper:
    """Maps various CSV column names to standardized Supabase schema"""
    
    def __init__(self):
        # Define mapping patterns for each required field
        # Key = Supabase column name, Value = list of possible variations
        self.column_patterns = {
            'work_order_number': [
                'work_order_number', 'workordernumber', 'work_order', 'workorder',
                'wo_number', 'wonumber', 'wo_num', 'wo', 'order_number', 'ordernumber',
                'order_num', 'order_id', 'job_number', 'jobnumber', 'job_num'
            ],
            'material_code': [
                'material_code', 'materialcode', 'material', 'mat_code', 'matcode',
                'part_number', 'partnumber', 'part_num', 'partnum', 'item_code',
                'itemcode', 'sku', 'product_code', 'productcode'
            ],
            'machine_id': [
                'machine_id', 'machineid', 'machine', 'equipment_id', 'equipmentid',
                'equipment', 'asset_id', 'assetid', 'asset', 'machine_number',
                'machinenumber', 'equip_id', 'equipid'
            ],
            'supplier_id': [
                'supplier_id', 'supplierid', 'supplier', 'vendor_id', 'vendorid',
                'vendor', 'supplier_code', 'suppliercode', 'vendor_code', 'vendorcode'
            ],
            'shift_id': [
                'shift_id', 'shiftid', 'shift', 'shift_name', 'shiftname',
                'work_shift', 'workshift', 'production_shift', 'productionshift'
            ],
            'operation_type': [
                'operation_type', 'operationtype', 'operation', 'type',
                'work_order_type', 'workordertype', 'wo_type', 'wotype',
                'order_type', 'ordertype', 'job_type', 'jobtype'
            ],
            'planned_material_cost': [
                'planned_material_cost', 'plannedmaterialcost', 'planned_mat_cost',
                'plan_material_cost', 'planmaterialcost', 'planned_material',
                'budgeted_material_cost', 'budget_material_cost', 'material_budget',
                'std_material_cost', 'standard_material_cost', 'estimated_material_cost',
                'plan_mat_cost', 'planned_mat', 'material_plan'
            ],
            'actual_material_cost': [
                'actual_material_cost', 'actualmaterialcost', 'actual_mat_cost',
                'material_actual_cost', 'material_cost_actual', 'actual_material',
                'real_material_cost', 'materialsactual', 'mat_cost_actual',
                'actual_mat', 'material_actual'
            ],
            'planned_labor_hours': [
                'planned_labor_hours', 'plannedlaborhours', 'planned_labor',
                'plan_labor_hours', 'planlaborhours', 'planned_hours',
                'budgeted_labor_hours', 'budget_labor_hours', 'labor_hours_planned',
                'std_labor_hours', 'standard_labor_hours', 'estimated_labor_hours',
                'plan_hours', 'planned_hrs', 'labor_plan'
            ],
            'actual_labor_hours': [
                'actual_labor_hours', 'actuallaborhours', 'actual_labor',
                'labor_actual_hours', 'labor_hours_actual', 'actual_hours',
                'real_labor_hours', 'labor_hours', 'hours_actual',
                'actual_hrs', 'labor_actual', 'hours'
            ],
            'standard_hours': [
                'standard_hours', 'standardhours', 'standard_hrs', 'std_hours',
                'stdhours', 'std_hrs', 'target_hours', 'targethours',
                'expected_hours', 'expectedhours', 'norm_hours'
            ],
            'actual_labor_cost': [
                'actual_labor_cost', 'actuallaborcost', 'labor_cost_actual',
                'labor_cost', 'laborcost', 'actual_labor_expense',
                'labor_expense', 'labor_spend', 'labor_actual_cost'
            ],
            'actual_total_cost': [
                'actual_total_cost', 'actualtotalcost', 'total_actual_cost',
                'total_cost', 'totalcost', 'actual_cost', 'actualcost',
                'total_expense', 'actual_total', 'cost_actual'
            ],
            'quantity_produced': [
                'quantity_produced', 'quantityproduced', 'qty_produced',
                'produced_quantity', 'producedquantity', 'production_quantity',
                'productionquantity', 'units_produced', 'unitsproduced',
                'quantity', 'qty', 'produced', 'output', 'production'
            ],
            'units_scrapped': [
                'units_scrapped', 'unitsscrapped', 'scrapped_units',
                'scrap_quantity', 'scrapquantity', 'qty_scrapped',
                'scrapped', 'scrap', 'rejected_units', 'rejected',
                'defects', 'defect_quantity'
            ],
            'production_period_start': [
                'production_period_start', 'productionperiodstart', 'start_date',
                'startdate', 'production_start', 'productionstart', 'start',
                'begin_date', 'begindate', 'order_start_date', 'order_start'
            ],
            'production_period_end': [
                'production_period_end', 'productionperiodend', 'end_date',
                'enddate', 'production_end', 'productionend', 'end',
                'complete_date', 'completedate', 'completion_date',
                'order_end_date', 'order_end', 'finish_date'
            ]
        }
    
    def normalize_column_name(self, column_name: str) -> str:
        """Normalize a column name for matching"""
        # Convert to lowercase
        normalized = column_name.lower()
        # Remove special characters and spaces
        normalized = re.sub(r'[^\w]', '', normalized)
        # Remove common prefixes/suffixes
        normalized = re.sub(r'^(col|field|attr|data)', '', normalized)
        return normalized
    
    def fuzzy_match(self, col1: str, col2: str, threshold: float = 0.8) -> bool:
        """Check if two column names are similar using fuzzy matching"""
        return SequenceMatcher(None, col1, col2).ratio() >= threshold
    
    def map_columns(self, csv_columns: List[str]) -> Dict[str, str]:
        """
        Map CSV columns to Supabase schema
        
        Args:
            csv_columns: List of column names from uploaded CSV
            
        Returns:
            Dictionary mapping: {supabase_column: csv_column}
        """
        mapping = {}
        unmapped_csv_columns = []
        normalized_csv = {self.normalize_column_name(col): col for col in csv_columns}
        
        # Try exact and pattern matching first
        for supabase_col, patterns in self.column_patterns.items():
            found = False
            
            for pattern in patterns:
                normalized_pattern = self.normalize_column_name(pattern)
                
                # Check for exact match
                if normalized_pattern in normalized_csv:
                    mapping[supabase_col] = normalized_csv[normalized_pattern]
                    found = True
                    break
            
            # If no exact match, try fuzzy matching
            if not found:
                for norm_csv, original_csv in normalized_csv.items():
                    for pattern in patterns:
                        if self.fuzzy_match(norm_csv, self.normalize_column_name(pattern), 0.85):
                            mapping[supabase_col] = original_csv
                            found = True
                            break
                    if found:
                        break
        
        # Identify unmapped columns
        mapped_csv_cols = set(mapping.values())
        unmapped_csv_columns = [col for col in csv_columns if col not in mapped_csv_cols]
        
        return {
            'mapping': mapping,
            'unmapped_csv_columns': unmapped_csv_columns,
            'missing_required_fields': self._get_missing_required_fields(mapping)
        }
    
    def _get_missing_required_fields(self, mapping: Dict[str, str]) -> List[str]:
        """Identify which required fields are missing from the mapping"""
        required_fields = [
            'work_order_number',
            'planned_material_cost',
            'actual_material_cost',
            'planned_labor_hours',
            'actual_labor_hours'
        ]
        
        return [field for field in required_fields if field not in mapping]
    
    def generate_mapping_report(self, csv_columns: List[str]) -> Dict:
        """Generate a detailed mapping report for user review"""
        result = self.map_columns(csv_columns)
        mapping = result['mapping']
        
        report = {
            'success': len(result['missing_required_fields']) == 0,
            'mapped_columns': {
                supabase_col: csv_col 
                for supabase_col, csv_col in mapping.items()
            },
            'confidence': len(mapping) / len(self.column_patterns) * 100,
            'missing_required': result['missing_required_fields'],
            'unmapped_csv_columns': result['unmapped_csv_columns'],
            'message': self._generate_message(result)
        }
        
        return report
    
    def _generate_message(self, result: Dict) -> str:
        """Generate user-friendly message about mapping status"""
        missing = result['missing_required_fields']
        
        if not missing:
            return "All required columns successfully mapped!"
        
        msg = f"⚠️ Missing required fields: {', '.join(missing)}\n\n"
        msg += "Please ensure your CSV includes these columns (or similar):\n"
        
        for field in missing:
            examples = self.column_patterns[field][:3]
            msg += f"  • {field}: e.g., '{examples[0]}', '{examples[1]}', or '{examples[2]}'\n"
        
        return msg
    
    def transform_csv_data(self, csv_data: List[Dict], mapping: Dict[str, str]) -> List[Dict]:
        """
        Transform CSV data using the column mapping
        
        Args:
            csv_data: List of dictionaries with original CSV column names
            mapping: Column mapping from map_columns()
            
        Returns:
            List of dictionaries with Supabase column names
        """
        transformed_data = []
        
        for row in csv_data:
            transformed_row = {}
            
            for supabase_col, csv_col in mapping.items():
                if csv_col in row:
                    transformed_row[supabase_col] = row[csv_col]
            
            # Add default values for system fields
            transformed_row['facility_id'] = 1  # Can be parameterized
            transformed_row['demo_mode'] = False  # Real user data
            
            transformed_data.append(transformed_row)
        
        return transformed_data


# Example usage and testing
if __name__ == "__main__":
    mapper = FlexibleColumnMapper()
    
    # Test with various real-world column naming conventions
    test_cases = [
        # Case 1: Excel-style (Title Case with spaces)
        ['Work Order Number', 'Material Code', 'Planned Material Cost', 
         'Actual Material Cost', 'Planned Labor Hours', 'Actual Labor Hours'],
        
        # Case 2: SAP-style (CamelCase)
        ['WorkOrderNumber', 'MaterialCode', 'PlannedMaterialCost',
         'ActualMaterialCost', 'PlannedLaborHours', 'ActualLaborHours'],
        
        # Case 3: Abbreviations
        ['WO Number', 'Mat Code', 'Plan Mat Cost', 'Actual Mat Cost',
         'Plan Hours', 'Actual Hours'],
        
        # Case 4: Different terminology
        ['Job Number', 'Part Number', 'Budgeted Material Cost',
         'Material Cost Actual', 'Standard Labor Hours', 'Labor Hours'],
    ]
    
    print("="*70)
    print("FLEXIBLE COLUMN MAPPER - TEST RESULTS")
    print("="*70 + "\n")
    
    for i, test_columns in enumerate(test_cases, 1):
        print(f"Test Case {i}: {test_columns[0]} (style)")
        report = mapper.generate_mapping_report(test_columns)
        
        print(f"  Success: {report['success']}")
        print(f"  Confidence: {report['confidence']:.1f}%")
        print(f"  Mapped: {len(report['mapped_columns'])} columns")
        
        if report['missing_required']:
            print(f"  Missing: {report['missing_required']}")
        
        print(f"  Sample mapping:")
        for supabase_col, csv_col in list(report['mapped_columns'].items())[:3]:
            print(f"    '{csv_col}' → '{supabase_col}'")
        print()