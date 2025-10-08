import random
from datetime import datetime, timedelta
from typing import List, Dict

class DemoScenarioGenerator:
    """Generate 5 distinct demo scenarios for different use cases"""
    
    def __init__(self):
        self.base_date = datetime.now() - timedelta(days=30)
    
    def scenario_1_material_price_spike(self, count: int = 100) -> List[Dict]:
        """
        SCENARIO 1: Material Price Spike (Procurement Problem)
        
        Story: Steel supplier increased prices 35% due to market shortage.
        MAT-STEEL-304 appears in 8 orders over 2 weeks.
        Clear pattern, clear action: renegotiate or switch suppliers.
        
        Data Gaps: Missing contract_expiration (intentional nudge opportunity)
        """
        
        work_orders = []
        
        # Problem material
        problem_material = 'MAT-STEEL-304'
        problem_supplier = 'SUP-ACME-STEEL'
        
        for i in range(count):
            wo_number = f"WO-PROD-{str(i+2000).zfill(4)}"
            days_offset = random.randint(0, 29)
            order_date = self.base_date + timedelta(days=days_offset)
            
            # Choose material
            if i < 8:  # First 8 orders get problem material
                material = problem_material
                supplier = problem_supplier
                planned_mat = random.uniform(12000, 18000)
                # 35% price spike
                actual_mat = planned_mat * random.uniform(1.32, 1.38)
            else:
                material = random.choice(['MAT-ALUM-201', 'MAT-COPPER-105', 'MAT-PLASTIC-88'])
                supplier = random.choice(['SUP-BETA-METALS', 'SUP-GAMMA-SUPPLY'])
                planned_mat = random.uniform(8000, 15000)
                # Normal variance
                actual_mat = planned_mat * random.uniform(0.95, 1.08)
            
            planned_labor = random.uniform(30, 80)
            actual_labor = planned_labor * random.uniform(0.92, 1.12)
            
            work_order = {
                'work_order_number': wo_number,
                'facility_id': 1,
                'demo_mode': True,
                'material_code': material,
                'supplier_id': supplier,
                'machine_id': random.choice(['M-101', 'M-204', 'M-305']),
                'shift_id': random.choice(['DAY', 'NIGHT']),
                'planned_material_cost': round(planned_mat, 2),
                'actual_material_cost': round(actual_mat, 2),
                'planned_labor_hours': round(planned_labor, 1),
                'actual_labor_hours': round(actual_labor, 1),
                'units_produced': random.randint(200, 600),
                'units_scrapped': random.randint(5, 20),
                'quality_issues': False,
                'production_period_start': order_date.date().isoformat(),
                'production_period_end': (order_date + timedelta(days=2)).date().isoformat(),
                'upload_timestamp': datetime.now().isoformat(),
                # Intentionally missing: contract_expiration (data gap nudge)
            }
            
            work_orders.append(work_order)
        
        return work_orders
    
    def scenario_2_equipment_degradation(self, count: int = 100) -> List[Dict]:
        """
        SCENARIO 2: Equipment Degradation (Maintenance Problem)
        
        Story: Machine M-567 showing declining quality over 3 weeks.
        Started with 2% scrap, now at 12% scrap.
        Pattern shows degradation curve - predictive maintenance needed.
        
        Data Gaps: Missing downtime_minutes and last_maintenance_date
        """
        
        work_orders = []
        problem_machine = 'M-567'
        
        for i in range(count):
            wo_number = f"WO-PROD-{str(i+3000).zfill(4)}"
            days_offset = random.randint(0, 29)
            order_date = self.base_date + timedelta(days=days_offset)
            
            # Choose machine
            if i < 12:  # First 12 orders on problem machine
                machine = problem_machine
                # Quality degrades over time
                degradation_factor = 1 + (i * 0.015)  # Gets worse each order
                planned_mat = random.uniform(10000, 16000)
                actual_mat = planned_mat * random.uniform(1.05, 1.12) * degradation_factor
                planned_labor = random.uniform(40, 70)
                actual_labor = planned_labor * random.uniform(1.15, 1.30) * degradation_factor
                quality_issue = True
                units_produced = random.randint(300, 500)
                # Scrap increases with degradation
                scrap_rate = 0.02 + (i * 0.008)  # 2% → 12%
                units_scrapped = int(units_produced * scrap_rate)
            else:
                machine = random.choice(['M-101', 'M-204', 'M-305', 'M-890'])
                planned_mat = random.uniform(9000, 14000)
                actual_mat = planned_mat * random.uniform(0.96, 1.06)
                planned_labor = random.uniform(35, 65)
                actual_labor = planned_labor * random.uniform(0.94, 1.08)
                quality_issue = False
                units_produced = random.randint(300, 500)
                units_scrapped = int(units_produced * 0.02)
            
            work_order = {
                'work_order_number': wo_number,
                'facility_id': 1,
                'demo_mode': True,
                'material_code': random.choice(['MAT-STEEL-201', 'MAT-ALUM-304', 'MAT-COPPER-105']),
                'supplier_id': random.choice(['SUP-ACME', 'SUP-BETA', 'SUP-GAMMA']),
                'machine_id': machine,
                'shift_id': random.choice(['DAY', 'NIGHT']),
                'planned_material_cost': round(planned_mat, 2),
                'actual_material_cost': round(actual_mat, 2),
                'planned_labor_hours': round(planned_labor, 1),
                'actual_labor_hours': round(actual_labor, 1),
                'units_produced': units_produced,
                'units_scrapped': units_scrapped,
                'quality_issues': quality_issue,
                'production_period_start': order_date.date().isoformat(),
                'production_period_end': (order_date + timedelta(days=2)).date().isoformat(),
                'upload_timestamp': datetime.now().isoformat(),
                # Intentionally missing: downtime_minutes, last_maintenance_date
            }
            
            work_orders.append(work_order)
        
        return work_orders
    
    def scenario_3_shift_efficiency_win(self, count: int = 100) -> List[Dict]:
        """
        SCENARIO 3: Shift Performance - POSITIVE STORY (Operational Win)
        
        Story: Night shift is 12% MORE efficient than day shift.
        Better time management, less distraction, experienced crew.
        Action: Study night shift practices and replicate on day shift.
        
        BALANCED FRAMING: Not everything is a problem to fix.
        """
        
        work_orders = []
        
        for i in range(count):
            wo_number = f"WO-PROD-{str(i+4000).zfill(4)}"
            days_offset = random.randint(0, 29)
            order_date = self.base_date + timedelta(days=days_offset)
            
            shift = random.choice(['DAY', 'NIGHT'])
            
            planned_mat = random.uniform(11000, 17000)
            planned_labor = random.uniform(45, 75)
            
            if shift == 'NIGHT':
                # Night shift WINS - under budget
                actual_mat = planned_mat * random.uniform(0.88, 0.96)
                actual_labor = planned_labor * random.uniform(0.85, 0.93)
            else:
                # Day shift normal/slightly over
                actual_mat = planned_mat * random.uniform(0.98, 1.08)
                actual_labor = planned_labor * random.uniform(1.00, 1.10)
            
            work_order = {
                'work_order_number': wo_number,
                'facility_id': 1,
                'demo_mode': True,
                'material_code': random.choice(['MAT-STEEL-201', 'MAT-ALUM-304', 'MAT-PLASTIC-77']),
                'supplier_id': random.choice(['SUP-ACME', 'SUP-BETA', 'SUP-GAMMA']),
                'machine_id': random.choice(['M-101', 'M-204', 'M-305', 'M-567']),
                'shift_id': shift,
                'planned_material_cost': round(planned_mat, 2),
                'actual_material_cost': round(actual_mat, 2),
                'planned_labor_hours': round(planned_labor, 1),
                'actual_labor_hours': round(actual_labor, 1),
                'units_produced': random.randint(350, 550),
                'units_scrapped': random.randint(8, 18),
                'quality_issues': False,
                'production_period_start': order_date.date().isoformat(),
                'production_period_end': (order_date + timedelta(days=2)).date().isoformat(),
                'upload_timestamp': datetime.now().isoformat(),
                # Complete data - no gaps
                'operator_id': f"OP-{random.randint(100, 150)}"
            }
            
            work_orders.append(work_order)
        
        return work_orders
    
    def scenario_4_supplier_quality_issue(self, count: int = 100) -> List[Dict]:
        """
        SCENARIO 4: Supplier Quality Issue (Sourcing Decision)
        
        Story: SUP-DELTA materials have 28% defect rate across 6 orders.
        Causing both material waste AND rework labor.
        Action: Supplier audit or switch to SUP-EPSILON (verified alternative).
        
        Data Gaps: Missing defect_code (can't categorize issues)
        """
        
        work_orders = []
        problem_supplier = 'SUP-DELTA'
        problem_materials = ['MAT-PLASTIC-101', 'MAT-RESIN-204']
        
        for i in range(count):
            wo_number = f"WO-PROD-{str(i+5000).zfill(4)}"
            days_offset = random.randint(0, 29)
            order_date = self.base_date + timedelta(days=days_offset)
            
            # First 10 orders use problem supplier
            if i < 10:
                supplier = problem_supplier
                material = random.choice(problem_materials)
                planned_mat = random.uniform(9000, 14000)
                # Material waste from defects
                actual_mat = planned_mat * random.uniform(1.15, 1.28)
                planned_labor = random.uniform(35, 60)
                # Rework labor
                actual_labor = planned_labor * random.uniform(1.20, 1.40)
                quality_issue = True
                units_produced = random.randint(300, 500)
                # High defect rate
                defect_rate = random.uniform(0.24, 0.32)
                units_scrapped = int(units_produced * defect_rate)
            else:
                supplier = random.choice(['SUP-EPSILON', 'SUP-ZETA', 'SUP-GAMMA'])
                material = random.choice(['MAT-PLASTIC-88', 'MAT-RESIN-150', 'MAT-STEEL-201'])
                planned_mat = random.uniform(9000, 14000)
                actual_mat = planned_mat * random.uniform(0.96, 1.06)
                planned_labor = random.uniform(35, 60)
                actual_labor = planned_labor * random.uniform(0.95, 1.08)
                quality_issue = False
                units_produced = random.randint(300, 500)
                units_scrapped = int(units_produced * 0.03)
            
            work_order = {
                'work_order_number': wo_number,
                'facility_id': 1,
                'demo_mode': True,
                'material_code': material,
                'supplier_id': supplier,
                'machine_id': random.choice(['M-101', 'M-204', 'M-305']),
                'shift_id': random.choice(['DAY', 'NIGHT']),
                'planned_material_cost': round(planned_mat, 2),
                'actual_material_cost': round(actual_mat, 2),
                'planned_labor_hours': round(planned_labor, 1),
                'actual_labor_hours': round(actual_labor, 1),
                'units_produced': units_produced,
                'units_scrapped': units_scrapped,
                'quality_issues': quality_issue,
                'production_period_start': order_date.date().isoformat(),
                'production_period_end': (order_date + timedelta(days=2)).date().isoformat(),
                'upload_timestamp': datetime.now().isoformat(),
                # Intentionally missing: defect_code (data gap nudge)
            }
            
            work_orders.append(work_order)
        
        return work_orders
    
    def scenario_5_clean_baseline(self, count: int = 100) -> List[Dict]:
        """
        SCENARIO 5: Clean Baseline (Validation - No False Alarms)
        
        Story: Everything running smoothly. Minor variances within normal range.
        Proves the system doesn't cry wolf when things are fine.
        Builds trust for when real issues appear.
        
        BALANCED FRAMING: Good operations deserve recognition.
        """
        
        work_orders = []
        
        for i in range(count):
            wo_number = f"WO-PROD-{str(i+6000).zfill(4)}"
            days_offset = random.randint(0, 29)
            order_date = self.base_date + timedelta(days=days_offset)
            
            planned_mat = random.uniform(10000, 16000)
            planned_labor = random.uniform(40, 70)
            
            # Everything within 5% tolerance
            actual_mat = planned_mat * random.uniform(0.96, 1.04)
            actual_labor = planned_labor * random.uniform(0.96, 1.04)
            
            work_order = {
                'work_order_number': wo_number,
                'facility_id': 1,
                'demo_mode': True,
                'material_code': random.choice(['MAT-STEEL-201', 'MAT-ALUM-304', 'MAT-COPPER-105']),
                'supplier_id': random.choice(['SUP-ACME', 'SUP-BETA', 'SUP-GAMMA']),
                'machine_id': random.choice(['M-101', 'M-204', 'M-305', 'M-567']),
                'shift_id': random.choice(['DAY', 'NIGHT']),
                'planned_material_cost': round(planned_mat, 2),
                'actual_material_cost': round(actual_mat, 2),
                'planned_labor_hours': round(planned_labor, 1),
                'actual_labor_hours': round(actual_labor, 1),
                'units_produced': random.randint(400, 600),
                'units_scrapped': random.randint(5, 12),
                'quality_issues': False,
                'production_period_start': order_date.date().isoformat(),
                'production_period_end': (order_date + timedelta(days=2)).date().isoformat(),
                'upload_timestamp': datetime.now().isoformat(),
                # Complete data
                'operator_id': f"OP-{random.randint(100, 150)}",
                'lot_batch_number': f"BATCH-{random.randint(1000, 9999)}"
            }
            
            work_orders.append(work_order)
        
        return work_orders
    
    def generate_scenario_csv(self, scenario_num: int, output_path: str = None):
        """Generate CSV file for specific scenario"""
        import csv
        
        scenarios = {
            1: ("material_price_spike", self.scenario_1_material_price_spike),
            2: ("equipment_degradation", self.scenario_2_equipment_degradation),
            3: ("shift_efficiency_win", self.scenario_3_shift_efficiency_win),
            4: ("supplier_quality_issue", self.scenario_4_supplier_quality_issue),
            5: ("clean_baseline", self.scenario_5_clean_baseline)
        }
        
        if scenario_num not in scenarios:
            raise ValueError(f"Scenario {scenario_num} not found. Choose 1-5.")
        
        name, generator_func = scenarios[scenario_num]
        work_orders = generator_func()
        
        if output_path is None:
            output_path = f"demo_scenario_{scenario_num}_{name}.csv"
        
        # Write CSV
        if work_orders:
            keys = work_orders[0].keys()
            with open(output_path, 'w', newline='') as f:
                writer = csv.DictWriter(f, fieldnames=keys)
                writer.writeheader()
                writer.writerows(work_orders)
            
            print(f"✅ Generated: {output_path}")
            print(f"   Scenario: {name}")
            print(f"   Work Orders: {len(work_orders)}")
        
        return output_path

# Usage example
if __name__ == "__main__":
    generator = DemoScenarioGenerator()
    
    print("Generating 5 demo scenarios...\n")
    
    for i in range(1, 6):
        generator.generate_scenario_csv(i)
        print()
    
    print("✅ All scenarios generated!")