"""
CSV Test Data Generator - Creates test files with CORRECT column names for Supabase
"""

import csv
import random
from datetime import datetime, timedelta
from pathlib import Path

class CSVTestDataGenerator:
    def __init__(self):
        self.materials = [
            'MAT-1532', 'MAT-1789', 'MAT-2100', 'MAT-2450', 'MAT-3001',
            'MAT-3500', 'MAT-4200', 'MAT-5100', 'MAT-6000', 'MAT-7500'
        ]
        
        self.machines = [
            'M-101', 'M-204', 'M-305', 'M-567', 'M-890', 
            'M-1001', 'M-1200', 'M-1450'
        ]
        
        self.suppliers = ['SUP-ABC', 'SUP-XYZ', 'SUP-DEF', 'SUP-GHI']
        self.shifts = ['DAY', 'NIGHT', 'SWING']
        self.work_order_types = ['PROD', 'MAINT', 'REWORK']
        
        # Create output directory
        self.output_dir = Path('test_csv_files')
        self.output_dir.mkdir(exist_ok=True)
    
    def generate_base_work_order(self, wo_number, wo_type='PROD'):
        """Generate a baseline work order - column names match Supabase exactly"""
        
        start_date = datetime.now() - timedelta(days=random.randint(1, 30))
        
        if wo_type == 'PROD':
            planned_material = random.uniform(8000, 25000)
            planned_labor = random.uniform(40, 120)
            quantity = random.randint(200, 800)
        else:
            planned_material = random.uniform(3000, 12000)
            planned_labor = random.uniform(20, 80)
            quantity = random.randint(100, 400)
        
        # CRITICAL: Use exact column names from Supabase schema
        return {
            'work_order_number': wo_number,
            'material_code': random.choice(self.materials),
            'machine_id': random.choice(self.machines),
            'supplier_id': random.choice(self.suppliers),
            'shift_id': random.choice(self.shifts),
            'operation_type': wo_type,
            'planned_material_cost': round(planned_material, 2),
            'actual_material_cost': round(planned_material, 2),
            'planned_labor_hours': round(planned_labor, 1),
            'actual_labor_hours': round(planned_labor, 1),
            'standard_hours': round(planned_labor, 1),
            'actual_labor_cost': round(planned_labor * 35, 2),
            'quantity_produced': quantity,
            'units_scrapped': 0,
            'production_period_start': start_date.strftime('%Y-%m-%d'),
            'production_period_end': (start_date + timedelta(days=random.randint(1, 5))).strftime('%Y-%m-%d'),
            'actual_total_cost': round(planned_material + (planned_labor * 35), 2),
            'facility_id': 1,
            'demo_mode': True
        }
    
    def scenario_1_good_data(self, count=100):
        """Scenario 1: Good baseline data with normal variance"""
        print("Generating Scenario 1: Good Baseline Data (100 orders)...")
        
        orders = []
        for i in range(count):
            wo = self.generate_base_work_order(f'WO-GOOD-{i+1000:04d}')
            
            # Add small realistic variance (±10%)
            material_variance = random.uniform(0.92, 1.10)
            labor_variance = random.uniform(0.90, 1.08)
            
            wo['actual_material_cost'] = round(wo['planned_material_cost'] * material_variance, 2)
            wo['actual_labor_hours'] = round(wo['planned_labor_hours'] * labor_variance, 1)
            wo['actual_labor_cost'] = round(wo['actual_labor_hours'] * 35, 2)
            wo['actual_total_cost'] = round(wo['actual_material_cost'] + wo['actual_labor_cost'], 2)
            
            # Minimal scrap (1-2%)
            wo['units_scrapped'] = int(wo['quantity_produced'] * random.uniform(0.01, 0.02))
            wo['quantity_produced'] -= wo['units_scrapped']
            
            orders.append(wo)
        
        self._write_csv(orders, 'scenario_1_good_baseline.csv')
        return orders
    
    def scenario_2_high_labor_variance(self, count=100):
        """Scenario 2: Significant labor rate issues"""
        print("Generating Scenario 2: High Labor Variance (100 orders)...")
        
        orders = []
        for i in range(count):
            wo = self.generate_base_work_order(f'WO-LABOR-{i+2000:04d}')
            
            # 30% of orders have high labor overruns
            if i < 30:
                labor_mult = random.uniform(1.40, 1.80)  # 40-80% over
                labor_rate = random.uniform(45, 65)  # Higher rates
            # 50% normal
            elif i < 80:
                labor_mult = random.uniform(0.95, 1.15)
                labor_rate = random.uniform(32, 38)
            # 20% under budget
            else:
                labor_mult = random.uniform(0.75, 0.92)
                labor_rate = random.uniform(28, 35)
            
            wo['actual_labor_hours'] = round(wo['planned_labor_hours'] * labor_mult, 1)
            wo['actual_labor_cost'] = round(wo['actual_labor_hours'] * labor_rate, 2)
            wo['actual_material_cost'] = round(wo['planned_material_cost'] * random.uniform(0.95, 1.08), 2)
            wo['actual_total_cost'] = round(wo['actual_material_cost'] + wo['actual_labor_cost'], 2)
            
            orders.append(wo)
        
        self._write_csv(orders, 'scenario_2_high_labor_variance.csv')
        return orders
    
    def scenario_3_high_scrap(self, count=100):
        """Scenario 3: Quality/scrap issues"""
        print("Generating Scenario 3: High Scrap Rates (100 orders)...")
        
        orders = []
        problem_materials = ['MAT-1532', 'MAT-2450']
        problem_machines = ['M-567', 'M-890']
        
        for i in range(count):
            wo = self.generate_base_work_order(f'WO-SCRAP-{i+3000:04d}')
            
            # High scrap for problem materials/machines
            if wo['material_code'] in problem_materials or wo['machine_id'] in problem_machines:
                scrap_rate = random.uniform(0.08, 0.20)  # 8-20% scrap
                wo['units_scrapped'] = int(wo['quantity_produced'] * scrap_rate)
                
                # Higher material costs due to waste
                wo['actual_material_cost'] = round(wo['planned_material_cost'] * random.uniform(1.15, 1.40), 2)
                # Rework labor
                wo['actual_labor_hours'] = round(wo['planned_labor_hours'] * random.uniform(1.20, 1.45), 1)
            else:
                # Normal scrap
                wo['units_scrapped'] = int(wo['quantity_produced'] * random.uniform(0.02, 0.04))
                wo['actual_material_cost'] = round(wo['planned_material_cost'] * random.uniform(0.98, 1.08), 2)
                wo['actual_labor_hours'] = round(wo['planned_labor_hours'] * random.uniform(0.95, 1.10), 1)
            
            wo['quantity_produced'] -= wo['units_scrapped']
            wo['actual_labor_cost'] = round(wo['actual_labor_hours'] * 35, 2)
            wo['actual_total_cost'] = round(wo['actual_material_cost'] + wo['actual_labor_cost'], 2)
            
            orders.append(wo)
        
        self._write_csv(orders, 'scenario_3_high_scrap_rates.csv')
        return orders
    
    def scenario_4_efficiency_wins(self, count=100):
        """Scenario 4: High efficiency - under budget"""
        print("Generating Scenario 4: Efficiency Wins (100 orders)...")
        
        orders = []
        for i in range(count):
            wo = self.generate_base_work_order(f'WO-EFFICIENT-{i+4000:04d}')
            
            # Most orders under budget
            if i < 70:
                material_mult = random.uniform(0.80, 0.92)
                labor_mult = random.uniform(0.75, 0.88)
            else:
                material_mult = random.uniform(0.95, 1.05)
                labor_mult = random.uniform(0.92, 1.02)
            
            wo['actual_material_cost'] = round(wo['planned_material_cost'] * material_mult, 2)
            wo['actual_labor_hours'] = round(wo['planned_labor_hours'] * labor_mult, 1)
            wo['actual_labor_cost'] = round(wo['actual_labor_hours'] * 35, 2)
            wo['actual_total_cost'] = round(wo['actual_material_cost'] + wo['actual_labor_cost'], 2)
            
            # Low scrap
            wo['units_scrapped'] = int(wo['quantity_produced'] * random.uniform(0.005, 0.015))
            wo['quantity_produced'] -= wo['units_scrapped']
            
            orders.append(wo)
        
        self._write_csv(orders, 'scenario_4_efficiency_wins.csv')
        return orders
    
    def scenario_5_mixed_realistic(self, count=200):
        """Scenario 5: Mixed realistic data - comprehensive test"""
        print("Generating Scenario 5: Mixed Realistic Data (200 orders)...")
        
        orders = []
        for i in range(count):
            wo = self.generate_base_work_order(f'WO-MIXED-{i+5000:04d}')
            
            # 10% material spikes
            if i < 20:
                wo['actual_material_cost'] = round(wo['planned_material_cost'] * random.uniform(1.30, 1.60), 2)
                wo['actual_labor_hours'] = round(wo['planned_labor_hours'] * random.uniform(1.05, 1.15), 1)
                wo['units_scrapped'] = int(wo['quantity_produced'] * random.uniform(0.05, 0.12))
            
            # 15% labor issues
            elif i < 50:
                wo['actual_material_cost'] = round(wo['planned_material_cost'] * random.uniform(1.00, 1.10), 2)
                wo['actual_labor_hours'] = round(wo['planned_labor_hours'] * random.uniform(1.35, 1.70), 1)
                wo['units_scrapped'] = int(wo['quantity_produced'] * random.uniform(0.03, 0.08))
            
            # 15% quality issues
            elif i < 80:
                wo['actual_material_cost'] = round(wo['planned_material_cost'] * random.uniform(1.15, 1.35), 2)
                wo['actual_labor_hours'] = round(wo['planned_labor_hours'] * random.uniform(1.20, 1.40), 1)
                wo['units_scrapped'] = int(wo['quantity_produced'] * random.uniform(0.08, 0.18))
            
            # 10% efficiency wins
            elif i < 100:
                wo['actual_material_cost'] = round(wo['planned_material_cost'] * random.uniform(0.82, 0.93), 2)
                wo['actual_labor_hours'] = round(wo['planned_labor_hours'] * random.uniform(0.78, 0.90), 1)
                wo['units_scrapped'] = int(wo['quantity_produced'] * random.uniform(0.005, 0.015))
            
            # 50% normal operations
            else:
                wo['actual_material_cost'] = round(wo['planned_material_cost'] * random.uniform(0.95, 1.08), 2)
                wo['actual_labor_hours'] = round(wo['planned_labor_hours'] * random.uniform(0.93, 1.10), 1)
                wo['units_scrapped'] = int(wo['quantity_produced'] * random.uniform(0.02, 0.04))
            
            wo['quantity_produced'] -= wo['units_scrapped']
            wo['actual_labor_cost'] = round(wo['actual_labor_hours'] * 35, 2)
            wo['actual_total_cost'] = round(wo['actual_material_cost'] + wo['actual_labor_cost'], 2)
            
            orders.append(wo)
        
        self._write_csv(orders, 'scenario_5_mixed_realistic.csv')
        return orders
    
    def _write_csv(self, orders, filename):
        """Write orders to CSV file"""
        filepath = self.output_dir / filename
        
        if not orders:
            print(f"  ⚠️  No data to write for {filename}")
            return
        
        fieldnames = orders[0].keys()
        
        with open(filepath, 'w', newline='') as csvfile:
            writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(orders)
        
        print(f"  ✅ Created: {filepath} ({len(orders)} orders)")
    
    def generate_all_scenarios(self):
        """Generate all test scenarios"""
        print("\n" + "="*60)
        print("CSV TEST DATA GENERATOR - FIXED VERSION")
        print("="*60 + "\n")
        
        scenarios = [
            (self.scenario_1_good_data, 100),
            (self.scenario_2_high_labor_variance, 100),
            (self.scenario_3_high_scrap, 100),
            (self.scenario_4_efficiency_wins, 100),
            (self.scenario_5_mixed_realistic, 200),
        ]
        
        total_orders = 0
        for scenario_func, count in scenarios:
            orders = scenario_func(count)
            total_orders += len(orders)
            print()
        
        print("="*60)
        print(f"✅ COMPLETE: Generated {total_orders} total orders")
        print(f"📁 Files saved to: {self.output_dir.absolute()}")
        print("="*60)
        print("\nColumn names now match Supabase schema (snake_case):")
        print("  • work_order_number")
        print("  • planned_material_cost / actual_material_cost")
        print("  • planned_labor_hours / actual_labor_hours")
        print("  • material_code, machine_id, supplier_id")
        print("  • facility_id=1, demo_mode=True")
        print("\nUpload these CSV files to test:")
        print("  1. scenario_1_good_baseline.csv")
        print("  2. scenario_2_high_labor_variance.csv")
        print("  3. scenario_3_high_scrap_rates.csv")
        print("  4. scenario_4_efficiency_wins.csv")
        print("  5. scenario_5_mixed_realistic.csv")
        print()

if __name__ == "__main__":
    generator = CSVTestDataGenerator()
    generator.generate_all_scenarios()