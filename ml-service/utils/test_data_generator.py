"""
Enhanced CSV Test Data Generator - Tests ALL Analyzer Types
Generates files that trigger Cost, Equipment, Quality, and Efficiency analyzers
"""

import csv
import random
from datetime import datetime, timedelta
from pathlib import Path

class EnhancedCSVGenerator:
    def __init__(self):
        self.output_dir = Path('test-csv-data-enhanced')
        self.output_dir.mkdir(exist_ok=True)
        
        # Create subdirectories
        (self.output_dir / 'tier-1-basic').mkdir(exist_ok=True)
        (self.output_dir / 'tier-2-enhanced').mkdir(exist_ok=True)
        (self.output_dir / 'tier-3-predictive').mkdir(exist_ok=True)
        (self.output_dir / 'mixed-analyzers').mkdir(exist_ok=True)
        
        self.materials = ['MAT-1532', 'MAT-1789', 'MAT-2100', 'MAT-2450']
        self.machines = ['M-101', 'M-204', 'M-305', 'M-567']
        self.suppliers = ['SUP-ABC', 'SUP-XYZ', 'SUP-DEF']
    
    # =================================================================
    # MIXED ANALYZERS - Test Multiple Categories
    # =================================================================
    
    def mixed_all_analyzers_comprehensive(self, count=200):
        """
        COMPREHENSIVE TEST - All analyzers active
        - Cost analyzer: variance detection
        - Equipment analyzer: machine patterns
        - Quality analyzer: scrap patterns  
        - Efficiency analyzer: labor variance
        """
        rows = []
        start_date = datetime.now() - timedelta(days=30)
        
        for i in range(count):
            planned_mat = random.uniform(2000, 8000)
            planned_labor = random.uniform(50, 150)
            units = random.randint(200, 800)
            days_offset = random.randint(0, 29)
            date = start_date + timedelta(days=days_offset)
            end_date = date + timedelta(days=random.randint(1, 5))
            
            # Introduce patterns for each analyzer
            machine = random.choice(self.machines)
            supplier = random.choice(self.suppliers)
            material = random.choice(self.materials)
            
            # Equipment issue pattern (M-567 degrading)
            has_equipment_issue = machine == 'M-567' and days_offset > 15
            
            # Quality issue pattern (SUP-XYZ + MAT-2450)
            has_quality_issue = supplier == 'SUP-XYZ' and material == 'MAT-2450'
            
            # Cost spike pattern (SUP-ABC recent change)
            has_cost_spike = supplier == 'SUP-ABC' and days_offset > 20
            
            # Calculate based on patterns
            if has_equipment_issue:
                actual_mult = random.uniform(1.2, 1.4)
                scrap = int(units * random.uniform(0.08, 0.15))
                labor_mult = random.uniform(1.2, 1.5)  # Equipment issues increase labor
            elif has_quality_issue:
                actual_mult = random.uniform(1.1, 1.25)
                scrap = int(units * random.uniform(0.10, 0.20))
                labor_mult = random.uniform(1.0, 1.2)
            elif has_cost_spike:
                actual_mult = random.uniform(1.3, 1.5)
                scrap = random.randint(0, int(units * 0.03))
                labor_mult = random.uniform(0.9, 1.1)
            else:
                actual_mult = random.uniform(0.95, 1.1)
                scrap = random.randint(0, int(units * 0.02))
                labor_mult = random.uniform(0.85, 1.15)
            
            rows.append({
                'work_order_number': f'WO-COMP-{30000+i}',
                'material_code': material,
                'supplier_id': supplier,
                'equipment_id': machine,
                'planned_material_cost': round(planned_mat, 2),
                'actual_material_cost': round(planned_mat * actual_mult, 2),
                'planned_labor_hours': round(planned_labor, 1),
                'actual_labor_hours': round(planned_labor * labor_mult, 1),
                'units_produced': units - scrap,
                'scrap_units': scrap,
                'production_period_start': date.strftime('%Y-%m-%d'),
                'production_period_end': end_date.strftime('%Y-%m-%d'),
            })
        self._write('mixed-analyzers/01_ALL_ANALYZERS_200rows.csv', rows)
    
    def mixed_cost_equipment(self, count=100):
        """Cost + Equipment only (no quality data)"""
        rows = []
        start_date = datetime.now() - timedelta(days=30)
        
        for i in range(count):
            planned = random.uniform(2000, 6000)
            days_offset = random.randint(0, 29)
            date = start_date + timedelta(days=days_offset)
            machine = random.choice(self.machines)
            
            # M-204 has cost issues
            if machine == 'M-204':
                actual_mult = random.uniform(1.2, 1.4)
            else:
                actual_mult = random.uniform(0.95, 1.1)
            
            rows.append({
                'work_order_number': f'WO-CE-{31000+i}',
                'material_code': random.choice(self.materials),
                'supplier_id': random.choice(self.suppliers),
                'equipment_id': machine,
                'planned_material_cost': round(planned, 2),
                'actual_material_cost': round(planned * actual_mult, 2),
                'production_period_start': date.strftime('%Y-%m-%d'),
            })
        self._write('mixed-analyzers/02_cost_equipment_100rows.csv', rows)
    
    def mixed_cost_quality(self, count=100):
        """Cost + Quality only (no equipment data)"""
        rows = []
        start_date = datetime.now() - timedelta(days=30)
        
        for i in range(count):
            planned = random.uniform(2000, 6000)
            units = random.randint(200, 800)
            days_offset = random.randint(0, 29)
            date = start_date + timedelta(days=days_offset)
            supplier = random.choice(self.suppliers)
            
            # SUP-DEF has quality issues
            if supplier == 'SUP-DEF':
                scrap = int(units * random.uniform(0.10, 0.18))
                actual_mult = random.uniform(1.1, 1.25)
            else:
                scrap = random.randint(0, int(units * 0.03))
                actual_mult = random.uniform(0.95, 1.1)
            
            rows.append({
                'work_order_number': f'WO-CQ-{32000+i}',
                'material_code': random.choice(self.materials),
                'supplier_id': supplier,
                'planned_material_cost': round(planned, 2),
                'actual_material_cost': round(planned * actual_mult, 2),
                'units_produced': units - scrap,
                'scrap_units': scrap,
                'production_period_start': date.strftime('%Y-%m-%d'),
            })
        self._write('mixed-analyzers/03_cost_quality_100rows.csv', rows)
    
    def mixed_equipment_quality(self, count=100):
        """Equipment + Quality (minimal cost variance)"""
        rows = []
        start_date = datetime.now() - timedelta(days=30)
        
        for i in range(count):
            planned = random.uniform(2000, 6000)
            units = random.randint(200, 800)
            days_offset = random.randint(0, 29)
            date = start_date + timedelta(days=days_offset)
            machine = random.choice(self.machines)
            
            # M-101 + M-305 have scrap issues
            if machine in ['M-101', 'M-305']:
                scrap = int(units * random.uniform(0.08, 0.16))
            else:
                scrap = random.randint(0, int(units * 0.02))
            
            rows.append({
                'work_order_number': f'WO-EQ-{33000+i}',
                'material_code': random.choice(self.materials),
                'supplier_id': random.choice(self.suppliers),
                'equipment_id': machine,
                'planned_material_cost': round(planned, 2),
                'actual_material_cost': round(planned * random.uniform(0.98, 1.05), 2),  # Minimal variance
                'units_produced': units - scrap,
                'scrap_units': scrap,
                'production_period_start': date.strftime('%Y-%m-%d'),
            })
        self._write('mixed-analyzers/04_equipment_quality_100rows.csv', rows)
    
    def mixed_cost_efficiency(self, count=100):
        """Cost + Efficiency (labor variance patterns)"""
        rows = []
        start_date = datetime.now() - timedelta(days=30)
        
        for i in range(count):
            planned_mat = random.uniform(2000, 6000)
            planned_labor = random.uniform(60, 140)
            days_offset = random.randint(0, 29)
            date = start_date + timedelta(days=days_offset)
            
            # Create efficiency patterns
            if i % 3 == 0:  # 33% inefficient
                labor_mult = random.uniform(1.25, 1.50)
                mat_mult = random.uniform(1.1, 1.2)
            else:
                labor_mult = random.uniform(0.85, 1.10)
                mat_mult = random.uniform(0.95, 1.1)
            
            rows.append({
                'work_order_number': f'WO-CEFF-{34000+i}',
                'material_code': random.choice(self.materials),
                'supplier_id': random.choice(self.suppliers),
                'planned_material_cost': round(planned_mat, 2),
                'actual_material_cost': round(planned_mat * mat_mult, 2),
                'planned_labor_hours': round(planned_labor, 1),
                'actual_labor_hours': round(planned_labor * labor_mult, 1),
                'production_period_start': date.strftime('%Y-%m-%d'),
            })
        self._write('mixed-analyzers/05_cost_efficiency_100rows.csv', rows)
    
    def mixed_equipment_degradation_focus(self, count=120):
        """Equipment-heavy: Progressive machine degradation"""
        rows = []
        start_date = datetime.now() - timedelta(days=30)
        problem_machine = 'M-567'
        
        for i in range(count):
            planned = random.uniform(2000, 6000)
            units = random.randint(200, 800)
            machine = random.choice(self.machines)
            days_offset = random.randint(0, 29)
            date = start_date + timedelta(days=days_offset)
            
            # M-567 shows progressive degradation over time
            if machine == problem_machine:
                degradation_factor = 1 + (days_offset / 30) * 0.30  # 30% worse by day 30
                scrap_increase = (days_offset / 30) * 0.12  # 12% more scrap by day 30
                actual_mult = random.uniform(1.1, 1.2) * degradation_factor
                scrap = int(units * (0.03 + scrap_increase))
            else:
                actual_mult = random.uniform(0.95, 1.08)
                scrap = random.randint(0, int(units * 0.02))
            
            rows.append({
                'work_order_number': f'WO-DEGRADE-{35000+i}',
                'material_code': random.choice(self.materials),
                'supplier_id': random.choice(self.suppliers),
                'equipment_id': machine,
                'planned_material_cost': round(planned, 2),
                'actual_material_cost': round(planned * actual_mult, 2),
                'units_produced': units - scrap,
                'scrap_units': scrap,
                'production_period_start': date.strftime('%Y-%m-%d'),
            })
        self._write('mixed-analyzers/06_equipment_degradation_120rows.csv', rows)
    
    def mixed_quality_crisis(self, count=100):
        """Quality-heavy: Supplier material crisis"""
        rows = []
        start_date = datetime.now() - timedelta(days=30)
        problem_combos = [
            ('MAT-1532', 'SUP-ABC'),
            ('MAT-2450', 'SUP-ABC'),
        ]
        
        for i in range(count):
            planned = random.uniform(2000, 6000)
            units = random.randint(200, 800)
            material = random.choice(self.materials)
            supplier = random.choice(self.suppliers)
            days_offset = random.randint(0, 29)
            date = start_date + timedelta(days=days_offset)
            
            # Crisis started 15 days ago for specific material+supplier combos
            in_crisis = ((material, supplier) in problem_combos and days_offset > 15)
            
            if in_crisis:
                actual_mult = random.uniform(1.20, 1.40)
                scrap = int(units * random.uniform(0.15, 0.25))
            else:
                actual_mult = random.uniform(0.95, 1.1)
                scrap = random.randint(0, int(units * 0.03))
            
            rows.append({
                'work_order_number': f'WO-QCRISIS-{36000+i}',
                'material_code': material,
                'supplier_id': supplier,
                'equipment_id': random.choice(self.machines),
                'planned_material_cost': round(planned, 2),
                'actual_material_cost': round(planned * actual_mult, 2),
                'units_produced': units - scrap,
                'scrap_units': scrap,
                'production_period_start': date.strftime('%Y-%m-%d'),
            })
        self._write('mixed-analyzers/07_quality_crisis_100rows.csv', rows)
    
    def mixed_supplier_price_shock(self, count=100):
        """Cost-heavy: Supplier price increase"""
        rows = []
        start_date = datetime.now() - timedelta(days=30)
        problem_supplier = 'SUP-XYZ'
        shock_start_day = 20  # Price increased 10 days ago
        
        for i in range(count):
            planned = random.uniform(2000, 6000)
            supplier = random.choice(self.suppliers)
            days_offset = random.randint(0, 29)
            date = start_date + timedelta(days=days_offset)
            
            # SUP-XYZ increased prices 10 days ago
            if supplier == problem_supplier and days_offset >= shock_start_day:
                actual_mult = random.uniform(1.35, 1.55)  # 35-55% increase
            else:
                actual_mult = random.uniform(0.95, 1.08)
            
            rows.append({
                'work_order_number': f'WO-SHOCK-{37000+i}',
                'material_code': random.choice(self.materials),
                'supplier_id': supplier,
                'equipment_id': random.choice(self.machines),
                'planned_material_cost': round(planned, 2),
                'actual_material_cost': round(planned * actual_mult, 2),
                'units_produced': random.randint(200, 800),
                'scrap_units': random.randint(0, 10),
                'production_period_start': date.strftime('%Y-%m-%d'),
            })
        self._write('mixed-analyzers/08_supplier_price_shock_100rows.csv', rows)
    
    # =================================================================
    # BASIC TIERS (Minimal files for baseline)
    # =================================================================
    
    def tier1_basic(self, count=50):
        """Tier 1: Cost only"""
        rows = []
        for i in range(count):
            planned = random.uniform(1000, 5000)
            rows.append({
                'work_order_number': f'WO-T1-{40000+i}',
                'planned_material_cost': round(planned, 2),
                'actual_material_cost': round(planned * random.uniform(0.9, 1.2), 2),
            })
        self._write('tier-1-basic/01_basic_50rows.csv', rows)
    
    def tier2_basic(self, count=100):
        """Tier 2: Cost + Equipment"""
        rows = []
        start_date = datetime.now() - timedelta(days=30)
        for i in range(count):
            planned = random.uniform(1500, 6000)
            date = start_date + timedelta(days=random.randint(0, 29))
            rows.append({
                'work_order_number': f'WO-T2-{41000+i}',
                'material_code': random.choice(self.materials),
                'supplier_id': random.choice(self.suppliers),
                'equipment_id': random.choice(self.machines),
                'planned_material_cost': round(planned, 2),
                'actual_material_cost': round(planned * random.uniform(0.9, 1.25), 2),
                'production_period_start': date.strftime('%Y-%m-%d'),
            })
        self._write('tier-2-enhanced/01_basic_100rows.csv', rows)
    
    def tier3_basic(self, count=150):
        """Tier 3: Full fields"""
        rows = []
        start_date = datetime.now() - timedelta(days=30)
        for i in range(count):
            planned = random.uniform(2000, 8000)
            units = random.randint(200, 800)
            date = start_date + timedelta(days=random.randint(0, 29))
            rows.append({
                'work_order_number': f'WO-T3-{42000+i}',
                'material_code': random.choice(self.materials),
                'supplier_id': random.choice(self.suppliers),
                'equipment_id': random.choice(self.machines),
                'planned_material_cost': round(planned, 2),
                'actual_material_cost': round(planned * random.uniform(0.9, 1.2), 2),
                'units_produced': units,
                'scrap_units': random.randint(0, int(units * 0.05)),
                'production_period_start': date.strftime('%Y-%m-%d'),
            })
        self._write('tier-3-predictive/01_basic_150rows.csv', rows)
    
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
        
        print(f"  ✓ {filename} ({len(rows)} rows)")
    
    def generate_all(self):
        """Generate all test files"""
        print("\n" + "="*70)
        print(" ENHANCED CSV TEST DATA GENERATOR - Multi-Analyzer Testing")
        print("="*70 + "\n")
        
        print("🎯 MIXED ANALYZER TESTS (Primary Focus)")
        print("-" * 70)
        print("These files test multiple analyzers simultaneously:")
        self.mixed_all_analyzers_comprehensive()
        self.mixed_cost_equipment()
        self.mixed_cost_quality()
        self.mixed_equipment_quality()
        self.mixed_cost_efficiency()
        self.mixed_equipment_degradation_focus()
        self.mixed_quality_crisis()
        self.mixed_supplier_price_shock()
        
        print("\n📊 BASELINE TIER FILES")
        print("-" * 70)
        self.tier1_basic()
        self.tier2_basic()
        self.tier3_basic()
        
        print("\n" + "="*70)
        print(f"✅ COMPLETE! All test files in: {self.output_dir.absolute()}")
        print("\n📋 RECOMMENDED TEST ORDER:")
        print("  1. 01_ALL_ANALYZERS_200rows.csv - Comprehensive test")
        print("  2. 06_equipment_degradation_120rows.csv - Equipment focus")
        print("  3. 07_quality_crisis_100rows.csv - Quality focus")
        print("  4. 08_supplier_price_shock_100rows.csv - Cost focus")
        print("="*70 + "\n")

if __name__ == "__main__":
    generator = EnhancedCSVGenerator()
    generator.generate_all()