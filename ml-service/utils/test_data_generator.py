"""
Comprehensive CSV Test Data Generator for Data Tier Testing
Tests fuzzy mapping, all 3 tiers, edge cases, and stress scenarios
"""

import csv
import random
from datetime import datetime, timedelta
from pathlib import Path

class ComprehensiveCSVGenerator:
    def __init__(self):
        self.output_dir = Path('test-csv-data')
        self.output_dir.mkdir(exist_ok=True)
        
        # Create subdirectories for organization
        (self.output_dir / 'tier-1-basic').mkdir(exist_ok=True)
        (self.output_dir / 'tier-2-enhanced').mkdir(exist_ok=True)
        (self.output_dir / 'tier-3-predictive').mkdir(exist_ok=True)
        (self.output_dir / 'edge-cases').mkdir(exist_ok=True)
        (self.output_dir / 'stress-tests').mkdir(exist_ok=True)
        
        self.materials = ['MAT-1532', 'MAT-1789', 'MAT-2100', 'MAT-2450']
        self.machines = ['M-101', 'M-204', 'M-305', 'M-567']
        self.suppliers = ['SUP-ABC', 'SUP-XYZ', 'SUP-DEF']
    
    # =================================================================
    # TIER 1: Basic Analysis (WO#, Planned, Actual costs only)
    # =================================================================
    
    def tier1_clean_headers(self, count=50):
        """Tier 1: Clean, exact column names"""
        rows = []
        for i in range(count):
            planned = random.uniform(1000, 5000)
            rows.append({
                'work_order_number': f'WO-{1000+i}',
                'planned_material_cost': round(planned, 2),
                'actual_material_cost': round(planned * random.uniform(0.9, 1.2), 2),
            })
        self._write('tier-1-basic/01_clean_headers_50rows.csv', rows)
    
    def tier1_messy_headers(self, count=50):
        """Tier 1: Messy column names - test fuzzy matching"""
        rows = []
        for i in range(count):
            planned = random.uniform(1000, 5000)
            rows.append({
                'WO #': f'WO-{2000+i}',  # Test synonym matching
                'Budget': round(planned, 2),  # Test "budget" → planned_material_cost
                'Actual': round(planned * random.uniform(0.9, 1.2), 2),
            })
        self._write('tier-1-basic/02_messy_headers_50rows.csv', rows)
    
    def tier1_abbreviated(self, count=50):
        """Tier 1: Abbreviated headers"""
        rows = []
        for i in range(count):
            planned = random.uniform(1000, 5000)
            rows.append({
                'Order': f'WO-{3000+i}',
                'PlnCost': round(planned, 2),
                'ActCost': round(planned * random.uniform(0.9, 1.2), 2),
            })
        self._write('tier-1-basic/03_abbreviated_50rows.csv', rows)
    
    def tier1_large(self, count=500):
        """Tier 1: Large file"""
        rows = []
        for i in range(count):
            planned = random.uniform(1000, 5000)
            rows.append({
                'work_order_number': f'WO-LARGE-{4000+i}',
                'planned_material_cost': round(planned, 2),
                'actual_material_cost': round(planned * random.uniform(0.85, 1.3), 2),
            })
        self._write('tier-1-basic/04_large_500rows.csv', rows)
    
    # =================================================================
    # TIER 2: Enhanced Analysis (+ supplier, material, dates)
    # =================================================================
    
    def tier2_clean_headers(self, count=100):
        """Tier 2: Clean headers with all required fields"""
        rows = []
        start_date = datetime.now() - timedelta(days=30)
        for i in range(count):
            planned = random.uniform(1500, 6000)
            days_offset = random.randint(0, 29)
            date = start_date + timedelta(days=days_offset)
            
            rows.append({
                'work_order_number': f'WO-T2-{5000+i}',
                'material_code': random.choice(self.materials),
                'supplier_id': random.choice(self.suppliers),
                'planned_material_cost': round(planned, 2),
                'actual_material_cost': round(planned * random.uniform(0.9, 1.25), 2),
                'production_period_start': date.strftime('%Y-%m-%d'),
            })
        self._write('tier-2-enhanced/01_clean_100rows.csv', rows)
    
    def tier2_messy_headers(self, count=100):
        """Tier 2: Messy headers - test fuzzy matching"""
        rows = []
        start_date = datetime.now() - timedelta(days=30)
        for i in range(count):
            planned = random.uniform(1500, 6000)
            days_offset = random.randint(0, 29)
            date = start_date + timedelta(days=days_offset)
            
            rows.append({
                'Job Number': f'JOB-{6000+i}',  # Test "job number" → work_order_number
                'Part Num': random.choice(self.materials),  # Test "part num" → material_code
                'Vendor': random.choice(self.suppliers),  # Test "vendor" → supplier_id
                'Estimated Cost': round(planned, 2),  # Test "estimated" → planned
                'Real Cost': round(planned * random.uniform(0.9, 1.25), 2),  # Test "real" → actual
                'Start Date': date.strftime('%Y-%m-%d'),  # Test "start date" → production_period_start
            })
        self._write('tier-2-enhanced/02_messy_100rows.csv', rows)
    
    def tier2_with_labor(self, count=100):
        """Tier 2: Include optional labor hours"""
        rows = []
        start_date = datetime.now() - timedelta(days=30)
        for i in range(count):
            planned_mat = random.uniform(1500, 6000)
            planned_labor = random.uniform(40, 120)
            days_offset = random.randint(0, 29)
            date = start_date + timedelta(days=days_offset)
            
            rows.append({
                'work_order_number': f'WO-LABOR-{7000+i}',
                'material_code': random.choice(self.materials),
                'supplier_id': random.choice(self.suppliers),
                'planned_material_cost': round(planned_mat, 2),
                'actual_material_cost': round(planned_mat * random.uniform(0.9, 1.25), 2),
                'planned_labor_hours': round(planned_labor, 1),
                'actual_labor_hours': round(planned_labor * random.uniform(0.85, 1.4), 1),
                'production_period_start': date.strftime('%Y-%m-%d'),
            })
        self._write('tier-2-enhanced/03_with_labor_100rows.csv', rows)
    
    def tier2_supplier_spike(self, count=150):
        """Tier 2: Supplier cost spike pattern"""
        rows = []
        start_date = datetime.now() - timedelta(days=30)
        problem_supplier = 'SUP-XYZ'
        
        for i in range(count):
            supplier = random.choice(self.suppliers)
            planned = random.uniform(1500, 6000)
            
            # Problem supplier has 30% cost overruns
            if supplier == problem_supplier:
                actual_mult = random.uniform(1.25, 1.45) if random.random() < 0.3 else random.uniform(0.95, 1.1)
            else:
                actual_mult = random.uniform(0.95, 1.1)
            
            days_offset = random.randint(0, 29)
            date = start_date + timedelta(days=days_offset)
            
            rows.append({
                'work_order_number': f'WO-SPIKE-{8000+i}',
                'material_code': random.choice(self.materials),
                'supplier_id': supplier,
                'planned_material_cost': round(planned, 2),
                'actual_material_cost': round(planned * actual_mult, 2),
                'production_period_start': date.strftime('%Y-%m-%d'),
            })
        self._write('tier-2-enhanced/04_supplier_spike_150rows.csv', rows)
    
    # =================================================================
    # TIER 3: Predictive Analysis (+ machine, units produced)
    # =================================================================
    
    def tier3_clean_headers(self, count=150):
        """Tier 3: All fields for predictive analysis"""
        rows = []
        start_date = datetime.now() - timedelta(days=30)
        
        for i in range(count):
            planned = random.uniform(2000, 8000)
            units = random.randint(200, 800)
            days_offset = random.randint(0, 29)
            date = start_date + timedelta(days=days_offset)
            
            rows.append({
                'work_order_number': f'WO-T3-{9000+i}',
                'material_code': random.choice(self.materials),
                'supplier_id': random.choice(self.suppliers),
                'machine_id': random.choice(self.machines),
                'planned_material_cost': round(planned, 2),
                'actual_material_cost': round(planned * random.uniform(0.9, 1.2), 2),
                'units_produced': units,
                'units_scrapped': random.randint(0, int(units * 0.05)),
                'production_period_start': date.strftime('%Y-%m-%d'),
            })
        self._write('tier-3-predictive/01_clean_150rows.csv', rows)
    
    def tier3_messy_headers(self, count=150):
        """Tier 3: Messy headers for full predictive"""
        rows = []
        start_date = datetime.now() - timedelta(days=30)
        
        for i in range(count):
            planned = random.uniform(2000, 8000)
            units = random.randint(200, 800)
            days_offset = random.randint(0, 29)
            date = start_date + timedelta(days=days_offset)
            
            rows.append({
                'Order ID': f'ORD-{10000+i}',
                'Part Number': random.choice(self.materials),
                'Vendor ID': random.choice(self.suppliers),
                'Equipment': random.choice(self.machines),
                'Budget': round(planned, 2),
                'Actual': round(planned * random.uniform(0.9, 1.2), 2),
                'Qty Produced': units,
                'Scrap': random.randint(0, int(units * 0.05)),
                'Date': date.strftime('%Y-%m-%d'),
            })
        self._write('tier-3-predictive/02_messy_150rows.csv', rows)
    
    def tier3_machine_degradation(self, count=200):
        """Tier 3: Machine showing degradation pattern"""
        rows = []
        start_date = datetime.now() - timedelta(days=30)
        problem_machine = 'M-567'
        
        for i in range(count):
            machine = random.choice(self.machines)
            planned = random.uniform(2000, 8000)
            units = random.randint(200, 800)
            days_offset = random.randint(0, 29)
            date = start_date + timedelta(days=days_offset)
            
            # Problem machine shows degradation over time
            if machine == problem_machine:
                degradation_factor = 1 + (days_offset / 30) * 0.3  # Gets worse over time
                scrap_rate = 0.02 + (days_offset / 30) * 0.10  # Scrap increases
                actual_mult = random.uniform(1.05, 1.15) * degradation_factor
                scrap = int(units * scrap_rate)
            else:
                actual_mult = random.uniform(0.95, 1.1)
                scrap = random.randint(0, int(units * 0.02))
            
            rows.append({
                'work_order_number': f'WO-DEGRADE-{11000+i}',
                'material_code': random.choice(self.materials),
                'supplier_id': random.choice(self.suppliers),
                'machine_id': machine,
                'planned_material_cost': round(planned, 2),
                'actual_material_cost': round(planned * actual_mult, 2),
                'units_produced': units - scrap,
                'units_scrapped': scrap,
                'production_period_start': date.strftime('%Y-%m-%d'),
            })
        self._write('tier-3-predictive/03_machine_degradation_200rows.csv', rows)
    
    def tier3_full_with_batch(self, count=200):
        """Tier 3: Full fields including batch tracking"""
        rows = []
        start_date = datetime.now() - timedelta(days=30)
        
        for i in range(count):
            planned_mat = random.uniform(2000, 8000)
            planned_labor = random.uniform(50, 150)
            units = random.randint(200, 800)
            days_offset = random.randint(0, 29)
            date = start_date + timedelta(days=days_offset)
            end_date = date + timedelta(days=random.randint(1, 5))
            
            rows.append({
                'work_order_number': f'WO-FULL-{12000+i}',
                'material_code': random.choice(self.materials),
                'supplier_id': random.choice(self.suppliers),
                'machine_id': random.choice(self.machines),
                'planned_material_cost': round(planned_mat, 2),
                'actual_material_cost': round(planned_mat * random.uniform(0.9, 1.2), 2),
                'planned_labor_hours': round(planned_labor, 1),
                'actual_labor_hours': round(planned_labor * random.uniform(0.85, 1.3), 1),
                'units_produced': units,
                'units_scrapped': random.randint(0, int(units * 0.05)),
                'batch_id': f'BATCH-{i // 10}',  # Group in batches of 10
                'production_period_start': date.strftime('%Y-%m-%d'),
                'production_period_end': end_date.strftime('%Y-%m-%d'),
            })
        self._write('tier-3-predictive/04_full_with_batch_200rows.csv', rows)
    
    # =================================================================
    # EDGE CASES
    # =================================================================
    
    def edge_case_duplicate_columns(self):
        """Edge case: Duplicate column names"""
        rows = [{'WO': 'WO-001', 'Cost': '1500', 'Cost': '1650'}]  # Intentional duplicate
        self._write('edge-cases/01_duplicate_columns.csv', rows)
    
    def edge_case_empty_columns(self):
        """Edge case: Empty column names"""
        rows = []
        for i in range(20):
            rows.append({
                'work_order_number': f'WO-{13000+i}',
                '': '',  # Empty column
                'planned_material_cost': round(random.uniform(1000, 3000), 2),
                'actual_material_cost': round(random.uniform(1000, 3000), 2),
            })
        self._write('edge-cases/02_empty_columns.csv', rows)
    
    def edge_case_special_characters(self):
        """Edge case: Special characters in headers"""
        rows = []
        for i in range(30):
            planned = random.uniform(1000, 3000)
            rows.append({
                'WO-#': f'WO-{14000+i}',
                'Planned $$$': round(planned, 2),
                'Actual (USD)': round(planned * 1.1, 2),
            })
        self._write('edge-cases/03_special_characters.csv', rows)
    
    def edge_case_very_long_headers(self):
        """Edge case: Very long column names"""
        rows = []
        for i in range(20):
            planned = random.uniform(1000, 3000)
            rows.append({
                'Work Order Manufacturing Production Number Identifier': f'WO-{15000+i}',
                'Planned Estimated Budgeted Material Cost Amount': round(planned, 2),
                'Actual Real Final Material Cost Amount': round(planned * 1.1, 2),
            })
        self._write('edge-cases/04_very_long_headers.csv', rows)
    
    def edge_case_mixed_case(self):
        """Edge case: Inconsistent casing"""
        rows = []
        for i in range(30):
            planned = random.uniform(1000, 3000)
            rows.append({
                'WoRk_OrDeR_NuMbEr': f'WO-{16000+i}',
                'PLANNED_MATERIAL_COST': round(planned, 2),
                'actual_material_cost': round(planned * 1.1, 2),
            })
        self._write('edge-cases/05_mixed_case.csv', rows)
    
    # =================================================================
    # STRESS TESTS
    # =================================================================
    
    def stress_test_1000_rows(self):
        """Stress test: 1000 rows Tier 2"""
        rows = []
        start_date = datetime.now() - timedelta(days=30)
        for i in range(1000):
            planned = random.uniform(1500, 6000)
            date = start_date + timedelta(days=random.randint(0, 29))
            rows.append({
                'work_order_number': f'WO-STRESS-{17000+i}',
                'material_code': random.choice(self.materials),
                'supplier_id': random.choice(self.suppliers),
                'planned_material_cost': round(planned, 2),
                'actual_material_cost': round(planned * random.uniform(0.9, 1.25), 2),
                'production_period_start': date.strftime('%Y-%m-%d'),
            })
        self._write('stress-tests/01_tier2_1000rows.csv', rows)
    
    def stress_test_50_columns(self):
        """Stress test: 50 columns (mix of mapped and unmapped)"""
        rows = []
        for i in range(100):
            planned = random.uniform(1500, 6000)
            row = {
                'work_order_number': f'WO-COLS-{18000+i}',
                'planned_material_cost': round(planned, 2),
                'actual_material_cost': round(planned * 1.1, 2),
            }
            # Add 47 random unmapped columns
            for j in range(47):
                row[f'random_field_{j+1}'] = f'value_{j+1}'
            rows.append(row)
        self._write('stress-tests/02_50_columns_100rows.csv', rows)
    
    def stress_test_5000_rows_tier3(self):
        """Stress test: 5000 rows Tier 3 - largest file"""
        rows = []
        start_date = datetime.now() - timedelta(days=90)
        for i in range(5000):
            planned = random.uniform(2000, 8000)
            units = random.randint(200, 800)
            date = start_date + timedelta(days=random.randint(0, 89))
            rows.append({
                'work_order_number': f'WO-MEGA-{19000+i}',
                'material_code': random.choice(self.materials),
                'supplier_id': random.choice(self.suppliers),
                'machine_id': random.choice(self.machines),
                'planned_material_cost': round(planned, 2),
                'actual_material_cost': round(planned * random.uniform(0.9, 1.2), 2),
                'units_produced': units,
                'production_period_start': date.strftime('%Y-%m-%d'),
            })
        self._write('stress-tests/03_tier3_5000rows.csv', rows)
    
    # =================================================================
    # HELPER METHODS
    # =================================================================
    
    def _write(self, filename, rows):
        """Write rows to CSV file"""
        filepath = self.output_dir / filename
        if not rows:
            print(f"  ⚠️  No data for {filename}")
            return
        
        fieldnames = rows[0].keys()
        with open(filepath, 'w', newline='') as csvfile:
            writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(rows)
        
        print(f"   {filename} ({len(rows)} rows)")
    
    def generate_all(self):
        """Generate all test files"""
        print("\n" + "="*70)
        print(" COMPREHENSIVE CSV TEST DATA GENERATOR")
        print("="*70 + "\n")
        
        print("TIER 1: Basic Analysis (WO#, Planned, Actual)")
        print("-" * 70)
        self.tier1_clean_headers()
        self.tier1_messy_headers()
        self.tier1_abbreviated()
        self.tier1_large()
        
        print("\nTIER 2: Enhanced Analysis (+ Supplier, Material, Dates)")
        print("-" * 70)
        self.tier2_clean_headers()
        self.tier2_messy_headers()
        self.tier2_with_labor()
        self.tier2_supplier_spike()
        
        print("\nTIER 3: Predictive Analysis (+ Machine, Units)")
        print("-" * 70)
        self.tier3_clean_headers()
        self.tier3_messy_headers()
        self.tier3_machine_degradation()
        self.tier3_full_with_batch()
        
        print("\nEDGE CASES")
        print("-" * 70)
        self.edge_case_duplicate_columns()
        self.edge_case_empty_columns()
        self.edge_case_special_characters()
        self.edge_case_very_long_headers()
        self.edge_case_mixed_case()
        
        print("\nSTRESS TESTS")
        print("-" * 70)
        self.stress_test_1000_rows()
        self.stress_test_50_columns()
        self.stress_test_5000_rows_tier3()
        
        print("\n" + "="*70)
        print(f"COMPLETE! All test files in: {self.output_dir.absolute()}")
        print("="*70 + "\n")

if __name__ == "__main__":
    generator = ComprehensiveCSVGenerator()
    generator.generate_all()