import random
from datetime import datetime, timedelta
from supabase import create_client
import os
from dotenv import load_dotenv

class EnhancedDataGenerator:
    def __init__(self):
        load_dotenv('../.env.local')
        url = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
        key = os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY")
        self.supabase = create_client(url, key)
        
        # Manufacturing scenarios for realistic patterns
        self.materials = [
            'MAT-1532', 'MAT-1789', 'MAT-2100', 'MAT-2450', 'MAT-3001',
            'MAT-3500', 'MAT-4200', 'MAT-5100', 'MAT-6000', 'MAT-7500'
        ]
        
        self.machines = [
            'M-101', 'M-204', 'M-305', 'M-567', 'M-890', 
            'M-1001', 'M-1200', 'M-1450', 'M-2000'
        ]
        
        self.suppliers = [
            'SUP-ABC', 'SUP-XYZ', 'SUP-DEF', 'SUP-GHI', 'SUP-JKL'
        ]
        
        self.shifts = ['DAY', 'NIGHT', 'SWING']
        
        # Define problem scenarios (10% of orders will have patterns)
        self.problem_scenarios = {
            'material_price_spike': {
                'materials': ['MAT-1532', 'MAT-2450'],  # These materials will be expensive
                'cost_multiplier': 1.35,  # 35% over planned
                'frequency': 0.15  # 15% of orders using these materials
            },
            'equipment_issues': {
                'machines': ['M-567', 'M-890'],  # These machines cause problems
                'labor_multiplier': 1.45,  # 45% labor overrun
                'quality_impact': True,
                'frequency': 0.12
            },
            'supplier_quality': {
                'suppliers': ['SUP-XYZ'],  # This supplier has quality issues
                'scrap_multiplier': 3.0,
                'frequency': 0.10
            },
            'shift_inefficiency': {
                'shifts': ['NIGHT'],  # Night shift less efficient
                'labor_multiplier': 1.25,
                'frequency': 0.08
            }
        }
    
    def generate_work_orders(self, count: int = 500, facility_id: int = 1):
        """Generate realistic work orders with patterns"""
        
        work_orders = []
        start_date = datetime.now() - timedelta(days=30)
        
        for i in range(count):
            wo_number = f"WO-{random.choice(['PROD', 'MAINT', 'REWORK'])}-{str(i+1000).zfill(4)}"
            
            # Random base values
            material_code = random.choice(self.materials)
            machine_id = random.choice(self.machines)
            supplier_id = random.choice(self.suppliers)
            shift = random.choice(self.shifts)
            
            # Base planned values
            planned_material_cost = random.uniform(5000, 25000)
            planned_labor_hours = random.uniform(10, 80)
            planned_units = random.randint(50, 500)
            
            # Start with actual = planned
            actual_material_cost = planned_material_cost
            actual_labor_hours = planned_labor_hours
            actual_units = planned_units
            scrap_units = 0
            quality_issues = False
            
            # Apply problem scenarios
            
            # Scenario 1: Material price spike
            if (material_code in self.problem_scenarios['material_price_spike']['materials'] 
                and random.random() < self.problem_scenarios['material_price_spike']['frequency']):
                actual_material_cost *= self.problem_scenarios['material_price_spike']['cost_multiplier']
            
            # Scenario 2: Equipment issues
            if (machine_id in self.problem_scenarios['equipment_issues']['machines']
                and random.random() < self.problem_scenarios['equipment_issues']['frequency']):
                actual_labor_hours *= self.problem_scenarios['equipment_issues']['labor_multiplier']
                if self.problem_scenarios['equipment_issues']['quality_impact']:
                    scrap_units = int(actual_units * random.uniform(0.05, 0.15))
                    quality_issues = True
            
            # Scenario 3: Supplier quality problems
            if (supplier_id in self.problem_scenarios['supplier_quality']['suppliers']
                and random.random() < self.problem_scenarios['supplier_quality']['frequency']):
                scrap_units = int(actual_units * random.uniform(0.08, 0.20))
                quality_issues = True
                # More scrap = more labor to handle it
                actual_labor_hours *= 1.15
            
            # Scenario 4: Shift inefficiency
            if (shift in self.problem_scenarios['shift_inefficiency']['shifts']
                and random.random() < self.problem_scenarios['shift_inefficiency']['frequency']):
                actual_labor_hours *= self.problem_scenarios['shift_inefficiency']['labor_multiplier']
            
            # Add random noise (5-15% variance) to most orders
            if random.random() < 0.6:  # 60% of orders have some natural variance
                actual_material_cost *= random.uniform(0.95, 1.10)
                actual_labor_hours *= random.uniform(0.92, 1.08)
            
            # Dates
            days_offset = random.randint(0, 29)
            order_date = start_date + timedelta(days=days_offset)
            completion_date = order_date + timedelta(days=random.randint(1, 5))
            
            work_order = {
                'work_order_number': wo_number,
                'facility_id': facility_id,
                'demo_mode': True,
                'material_code': material_code,
                'machine_id': machine_id,
                'supplier_id': supplier_id,
                'shift_id': shift,
                'planned_material_cost': round(planned_material_cost, 2),
                'actual_material_cost': round(actual_material_cost, 2),
                'planned_labor_hours': round(planned_labor_hours, 1),
                'actual_labor_hours': round(actual_labor_hours, 1),
                'units_produced': actual_units - scrap_units,
                'units_scrapped': scrap_units,
                'quality_issues': quality_issues,
                'production_period_start': order_date.date().isoformat(),
                'production_period_end': completion_date.date().isoformat(),
                'upload_timestamp': datetime.now().isoformat()
            }
            
            work_orders.append(work_order)
        
        return work_orders
    
    def insert_demo_data(self, count: int = 500):
        """Generate and insert demo data into Supabase"""
        
        print(f"Generating {count} work orders with realistic patterns...")
        work_orders = self.generate_work_orders(count)
        
        print("Inserting into database...")
        response = self.supabase.table('work_orders').insert(work_orders).execute()
        
        print(f"✅ Successfully inserted {len(work_orders)} work orders")
        print("\nPattern Summary:")
        print(f"  • Material price spikes: ~{int(count * 0.15)} orders")
        print(f"  • Equipment issues: ~{int(count * 0.12)} orders")
        print(f"  • Supplier quality problems: ~{int(count * 0.10)} orders")
        print(f"  • Shift inefficiency: ~{int(count * 0.08)} orders")
        print(f"  • Random variance: ~{int(count * 0.6)} orders")
        
        return response

if __name__ == "__main__":
    generator = EnhancedDataGenerator()
    
    # Clear existing demo data first
    print("Clearing existing demo data...")
    generator.supabase.table('work_orders').delete().eq('demo_mode', True).execute()
    
    # Generate 500 orders with realistic patterns
    generator.insert_demo_data(500)