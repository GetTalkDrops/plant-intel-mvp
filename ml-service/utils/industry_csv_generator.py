import csv
import random
from datetime import datetime, timedelta

class IndustryCSVGenerator:
    def __init__(self):
        self.start_date = datetime.now() - timedelta(days=30)
    
    def generate_automotive_csv(self):
        """Automotive supplier with material cost spike pattern"""
        materials = {
            'STEEL-304L': {'base': 12000, 'spike': True, 'spike_mult': (1.25, 1.40)},
            'ALUM-6061': {'base': 8500, 'spike': False},
            'RUBBER-EPDM': {'base': 3200, 'spike': True, 'spike_mult': (1.20, 1.35)},
            'PLASTIC-ABS': {'base': 5500, 'spike': False},
        }
        
        suppliers = ['SUP-AUTO-001', 'SUP-AUTO-002', 'SUP-AUTO-003']
        machines = ['CNC-101', 'CNC-202', 'PRESS-305', 'WELD-401']
        
        rows = []
        spike_count = 0
        
        for i in range(100):
            material = random.choice(list(materials.keys()))
            mat_config = materials[material]
            supplier = random.choice(suppliers)
            machine = random.choice(machines)
            
            # Base costs
            planned_material = mat_config['base'] * random.uniform(0.9, 1.1)
            planned_labor = random.uniform(40, 120)
            units = random.randint(200, 600)
            
            # Apply spike pattern to specific materials
            actual_material = planned_material
            if mat_config.get('spike') and random.random() < 0.20:  # 20% of orders
                multiplier = random.uniform(*mat_config['spike_mult'])
                actual_material = planned_material * multiplier
                spike_count += 1
            else:
                actual_material = planned_material * random.uniform(0.95, 1.08)
            
            actual_labor = planned_labor * random.uniform(0.92, 1.12)
            
            # Dates
            days_offset = random.randint(0, 29)
            start = self.start_date + timedelta(days=days_offset)
            end = start + timedelta(days=random.randint(2, 5))
            
            row = {
                'work_order_number': f'AUTO-PROD-{1000 + i}',
                'facility_id': 1,
                'planned_material_cost': round(planned_material, 2),
                'actual_material_cost': round(actual_material, 2),
                'planned_labor_hours': round(planned_labor, 1),
                'actual_labor_hours': round(actual_labor, 1),
                'material_code': material,
                'supplier_id': supplier,
                'units_produced': units,
                'units_scrapped': random.randint(0, int(units * 0.02)),
                'quality_issues': random.choice([True, False]),
                'machine_id': machine,
                'production_period_start': start.strftime('%Y-%m-%d'),
                'production_period_end': end.strftime('%Y-%m-%d'),
            }
            rows.append(row)
        
        print(f"Automotive: {spike_count} orders with cost spikes")
        return rows
    
    def generate_metal_fabrication_csv(self):
        """Metal fabrication with labor inefficiency pattern"""
        materials = {
            'STEEL-A36': {'base': 15000, 'labor_intensive': False},
            'STEEL-304': {'base': 18000, 'labor_intensive': True},
            'ALUM-6061': {'base': 12000, 'labor_intensive': True},
            'BRASS-C360': {'base': 9500, 'labor_intensive': False},
        }
        
        suppliers = ['SUP-METAL-100', 'SUP-METAL-200']
        machines = ['LATHE-301', 'MILL-402', 'GRINDER-503', 'SAW-604']
        
        rows = []
        labor_issues = 0
        
        for i in range(100):
            material = random.choice(list(materials.keys()))
            mat_config = materials[material]
            supplier = random.choice(suppliers)
            machine = random.choice(machines)
            
            # Base costs
            planned_material = mat_config['base'] * random.uniform(0.85, 1.15)
            planned_labor = random.uniform(60, 150)
            units = random.randint(50, 300)
            
            actual_material = planned_material * random.uniform(0.95, 1.10)
            
            # Apply labor inefficiency to complex materials
            actual_labor = planned_labor
            if mat_config.get('labor_intensive') and random.random() < 0.18:  # 18% of orders
                multiplier = random.uniform(1.40, 1.65)
                actual_labor = planned_labor * multiplier
                labor_issues += 1
            else:
                actual_labor = planned_labor * random.uniform(0.90, 1.15)
            
            # Dates
            days_offset = random.randint(0, 29)
            start = self.start_date + timedelta(days=days_offset)
            end = start + timedelta(days=random.randint(3, 7))
            
            row = {
                'work_order_number': f'MF-JOB-{2000 + i}',
                'facility_id': 1,
                'planned_material_cost': round(planned_material, 2),
                'actual_material_cost': round(actual_material, 2),
                'planned_labor_hours': round(planned_labor, 1),
                'actual_labor_hours': round(actual_labor, 1),
                'material_code': material,
                'supplier_id': supplier,
                'units_produced': units,
                'units_scrapped': random.randint(0, int(units * 0.03)),
                'quality_issues': random.choice([True, False]),
                'machine_id': machine,
                'production_period_start': start.strftime('%Y-%m-%d'),
                'production_period_end': end.strftime('%Y-%m-%d'),
            }
            rows.append(row)
        
        print(f"Metal Fabrication: {labor_issues} orders with labor overruns")
        return rows
    
    def generate_food_beverage_csv(self):
        """Food & beverage with quality/scrap issues"""
        materials = {
            'INGREDIENT-SUGAR': {'base': 4500, 'quality_risk': False},
            'INGREDIENT-FLOUR': {'base': 3800, 'quality_risk': True},
            'INGREDIENT-YEAST': {'base': 2200, 'quality_risk': True},
            'PACKAGING-CARTON': {'base': 1500, 'quality_risk': False},
        }
        
        suppliers = ['SUP-FOOD-001', 'SUP-FOOD-002', 'SUP-FOOD-003']
        machines = ['MIX-101', 'OVEN-202', 'PACK-303', 'SEAL-404']
        
        rows = []
        quality_issues = 0
        
        for i in range(100):
            material = random.choice(list(materials.keys()))
            mat_config = materials[material]
            supplier = random.choice(suppliers)
            machine = random.choice(machines)
            
            # Base costs
            planned_material = mat_config['base'] * random.uniform(0.9, 1.2)
            planned_labor = random.uniform(25, 80)
            units = random.randint(800, 2000)
            
            # Normal variance
            actual_material = planned_material * random.uniform(0.95, 1.12)
            actual_labor = planned_labor * random.uniform(0.92, 1.10)
            
            scrap = 0
            has_quality_issue = False
            
            # Apply quality/scrap issues to risky materials
            if mat_config.get('quality_risk') and random.random() < 0.17:  # 17% of orders
                scrap_rate = random.uniform(0.08, 0.15)
                scrap = int(units * scrap_rate)
                actual_material *= random.uniform(1.10, 1.20)  # Need more material
                actual_labor *= random.uniform(1.15, 1.30)  # Rework time
                has_quality_issue = True
                quality_issues += 1
            else:
                scrap = random.randint(0, int(units * 0.02))
            
            # Dates
            days_offset = random.randint(0, 29)
            start = self.start_date + timedelta(days=days_offset)
            end = start + timedelta(days=random.randint(1, 3))
            
            row = {
                'work_order_number': f'FB-BATCH-{3000 + i}',
                'facility_id': 1,
                'planned_material_cost': round(planned_material, 2),
                'actual_material_cost': round(actual_material, 2),
                'planned_labor_hours': round(planned_labor, 1),
                'actual_labor_hours': round(actual_labor, 1),
                'material_code': material,
                'supplier_id': supplier,
                'units_produced': units - scrap,
                'units_scrapped': scrap,
                'quality_issues': has_quality_issue,
                'machine_id': machine,
                'production_period_start': start.strftime('%Y-%m-%d'),
                'production_period_end': end.strftime('%Y-%m-%d'),
            }
            rows.append(row)
        
        print(f"Food & Beverage: {quality_issues} orders with quality issues")
        return rows
    
    def write_csv(self, rows, filename):
        """Write rows to CSV file"""
        fieldnames = [
            'work_order_number', 'facility_id', 'planned_material_cost',
            'actual_material_cost', 'planned_labor_hours', 'actual_labor_hours',
            'material_code', 'supplier_id', 'units_produced', 'units_scrapped',
            'quality_issues', 'machine_id', 'production_period_start',
            'production_period_end'
        ]
        
        with open(filename, 'w', newline='') as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(rows)
        
        print(f"📝 Wrote {len(rows)} rows to {filename}")
    
    def generate_all(self):
        """Generate all three industry CSVs"""
        print("\n🏭 Generating Industry Sample Data...\n")
        
        # Automotive
        auto_rows = self.generate_automotive_csv()
        self.write_csv(auto_rows, 'sample-data/automotive/automotive_sample.csv')
        
        # Metal Fabrication
        metal_rows = self.generate_metal_fabrication_csv()
        self.write_csv(metal_rows, 'sample-data/metal-fabrication/metal_fabrication_sample.csv')
        
        # Food & Beverage
        food_rows = self.generate_food_beverage_csv()
        self.write_csv(food_rows, 'sample-data/food-beverage/food_beverage_sample.csv')
        
        print("\nAll sample data generated successfully!")
        print("\nFiles created:")
        print("  • sample-data/automotive/automotive_sample.csv")
        print("  • sample-data/metal-fabrication/metal_fabrication_sample.csv")
        print("  • sample-data/food-beverage/food_beverage_sample.csv")

if __name__ == "__main__":
    generator = IndustryCSVGenerator()
    generator.generate_all()