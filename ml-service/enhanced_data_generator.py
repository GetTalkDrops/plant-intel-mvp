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
        
        # Expanded scenarios for variety
        self.materials = [
            'MAT-1532', 'MAT-1789', 'MAT-2100', 'MAT-2450', 'MAT-3001',
            'MAT-3500', 'MAT-4200', 'MAT-5100', 'MAT-6000', 'MAT-7500',
            'MAT-8100', 'MAT-8500', 'MAT-9200', 'MAT-9600'
        ]
        
        self.machines = [
            'M-101', 'M-204', 'M-305', 'M-567', 'M-890', 
            'M-1001', 'M-1200', 'M-1450', 'M-2000', 'M-2500',
            'M-3100', 'M-4000'
        ]
        
        self.suppliers = [
            'SUP-ABC', 'SUP-XYZ', 'SUP-DEF', 'SUP-GHI', 'SUP-JKL',
            'SUP-MNO', 'SUP-PQR'
        ]
        
        self.shifts = ['DAY', 'NIGHT', 'SWING']
        
        self.work_order_types = ['PROD', 'MAINT', 'REWORK', 'SETUP', 'TEST']
    
    def generate_work_orders(self, count: int = 500, facility_id: int = 1):
        """Generate realistic work orders with varied patterns"""
        
        work_orders = []
        start_date = datetime.now() - timedelta(days=30)
        
        # Scenario definitions - more varied patterns
        scenarios = {
            'material_spike_primary': {
                'materials': ['MAT-1532', 'MAT-2450'],
                'frequency': 0.12,
                'material_multiplier': (1.30, 1.50),  # 30-50% increase
                'labor_impact': None
            },
            'material_spike_secondary': {
                'materials': ['MAT-3500', 'MAT-6000'],
                'frequency': 0.08,
                'material_multiplier': (1.20, 1.35),
                'labor_impact': None
            },
            'labor_intensive_rework': {
                'frequency': 0.10,
                'material_impact': 1.05,  # Slight material increase from waste
                'labor_multiplier': (1.40, 1.70),  # 40-70% labor overrun
                'quality_issues': True
            },
            'equipment_degradation': {
                'machines': ['M-567', 'M-890', 'M-2000'],
                'frequency': 0.10,
                'material_impact': 1.10,  # More waste
                'labor_multiplier': (1.25, 1.45),
                'quality_issues': True,
                'scrap_multiplier': (2.0, 4.0)
            },
            'supplier_quality_issues': {
                'suppliers': ['SUP-XYZ', 'SUP-DEF'],
                'frequency': 0.08,
                'material_impact': 1.15,  # Need more material due to waste
                'labor_multiplier': (1.20, 1.35),  # Rework time
                'quality_issues': True,
                'scrap_multiplier': (2.5, 5.0)
            },
            'shift_inefficiency': {
                'shifts': ['NIGHT'],
                'frequency': 0.12,
                'material_impact': 1.08,
                'labor_multiplier': (1.18, 1.30)
            },
            'combined_issues': {
                # Perfect storm: bad material + night shift + problematic machine
                'frequency': 0.05,
                'material_multiplier': (1.35, 1.55),
                'labor_multiplier': (1.50, 1.80),
                'quality_issues': True,
                'scrap_multiplier': (3.0, 6.0)
            },
            'efficiency_win': {
                # Some orders should be UNDER budget
                'frequency': 0.08,
                'material_multiplier': (0.85, 0.95),
                'labor_multiplier': (0.80, 0.92)
            }
        }
        
        for i in range(count):
            wo_type = random.choice(self.work_order_types)
            wo_number = f"WO-{wo_type}-{str(i+1000).zfill(4)}"
            
            # Random base attributes
            material_code = random.choice(self.materials)
            machine_id = random.choice(self.machines)
            supplier_id = random.choice(self.suppliers)
            shift = random.choice(self.shifts)
            
            # Base planned values - vary by work order type
            if wo_type == 'PROD':
                planned_material_cost = random.uniform(8000, 30000)
                planned_labor_hours = random.uniform(20, 100)
                planned_units = random.randint(100, 800)
            elif wo_type == 'MAINT':
                planned_material_cost = random.uniform(3000, 15000)
                planned_labor_hours = random.uniform(8, 50)
                planned_units = random.randint(50, 300)
            elif wo_type == 'REWORK':
                planned_material_cost = random.uniform(2000, 12000)
                planned_labor_hours = random.uniform(10, 60)
                planned_units = random.randint(30, 200)
            else:  # SETUP, TEST
                planned_material_cost = random.uniform(1000, 8000)
                planned_labor_hours = random.uniform(5, 30)
                planned_units = random.randint(20, 150)
            
            # Start with actual = planned
            actual_material_cost = planned_material_cost
            actual_labor_hours = planned_labor_hours
            actual_units = planned_units
            scrap_units = 0
            quality_issues = False
            
            # Apply scenarios based on probability
            applied_scenarios = []
            
            # Material spike scenarios
            if material_code in scenarios['material_spike_primary']['materials']:
                if random.random() < scenarios['material_spike_primary']['frequency']:
                    multiplier = random.uniform(*scenarios['material_spike_primary']['material_multiplier'])
                    actual_material_cost *= multiplier
                    applied_scenarios.append('material_spike_primary')
            
            if material_code in scenarios['material_spike_secondary']['materials']:
                if random.random() < scenarios['material_spike_secondary']['frequency']:
                    multiplier = random.uniform(*scenarios['material_spike_secondary']['material_multiplier'])
                    actual_material_cost *= multiplier
                    applied_scenarios.append('material_spike_secondary')
            
            # Labor-intensive rework
            if random.random() < scenarios['labor_intensive_rework']['frequency']:
                actual_material_cost *= scenarios['labor_intensive_rework']['material_impact']
                multiplier = random.uniform(*scenarios['labor_intensive_rework']['labor_multiplier'])
                actual_labor_hours *= multiplier
                quality_issues = True
                scrap_units = int(actual_units * random.uniform(0.03, 0.08))
                applied_scenarios.append('labor_intensive_rework')
            
            # Equipment degradation
            if machine_id in scenarios['equipment_degradation']['machines']:
                if random.random() < scenarios['equipment_degradation']['frequency']:
                    actual_material_cost *= scenarios['equipment_degradation']['material_impact']
                    multiplier = random.uniform(*scenarios['equipment_degradation']['labor_multiplier'])
                    actual_labor_hours *= multiplier
                    quality_issues = True
                    scrap_mult = random.uniform(*scenarios['equipment_degradation']['scrap_multiplier'])
                    scrap_units = int(actual_units * random.uniform(0.05, 0.12) * scrap_mult)
                    applied_scenarios.append('equipment_degradation')
            
            # Supplier quality issues
            if supplier_id in scenarios['supplier_quality_issues']['suppliers']:
                if random.random() < scenarios['supplier_quality_issues']['frequency']:
                    actual_material_cost *= scenarios['supplier_quality_issues']['material_impact']
                    multiplier = random.uniform(*scenarios['supplier_quality_issues']['labor_multiplier'])
                    actual_labor_hours *= multiplier
                    quality_issues = True
                    scrap_mult = random.uniform(*scenarios['supplier_quality_issues']['scrap_multiplier'])
                    scrap_units = max(scrap_units, int(actual_units * random.uniform(0.08, 0.15) * scrap_mult))
                    applied_scenarios.append('supplier_quality')
            
            # Shift inefficiency
            if shift in scenarios['shift_inefficiency']['shifts']:
                if random.random() < scenarios['shift_inefficiency']['frequency']:
                    actual_material_cost *= scenarios['shift_inefficiency']['material_impact']
                    multiplier = random.uniform(*scenarios['shift_inefficiency']['labor_multiplier'])
                    actual_labor_hours *= multiplier
                    applied_scenarios.append('shift_inefficiency')
            
            # Combined issues (perfect storm)
            if random.random() < scenarios['combined_issues']['frequency']:
                material_mult = random.uniform(*scenarios['combined_issues']['material_multiplier'])
                labor_mult = random.uniform(*scenarios['combined_issues']['labor_multiplier'])
                actual_material_cost *= material_mult
                actual_labor_hours *= labor_mult
                quality_issues = True
                scrap_mult = random.uniform(*scenarios['combined_issues']['scrap_multiplier'])
                scrap_units = max(scrap_units, int(actual_units * random.uniform(0.10, 0.20) * scrap_mult))
                applied_scenarios.append('combined_issues')
            
            # Efficiency wins (under budget)
            if random.random() < scenarios['efficiency_win']['frequency'] and len(applied_scenarios) == 0:
                material_mult = random.uniform(*scenarios['efficiency_win']['material_multiplier'])
                labor_mult = random.uniform(*scenarios['efficiency_win']['labor_multiplier'])
                actual_material_cost *= material_mult
                actual_labor_hours *= labor_mult
                applied_scenarios.append('efficiency_win')
            
            # Add random noise to all orders (realistic variance)
            if len(applied_scenarios) == 0:  # Only if no scenario applied
                actual_material_cost *= random.uniform(0.92, 1.12)
                actual_labor_hours *= random.uniform(0.90, 1.10)
            
            # Dates
            days_offset = random.randint(0, 29)
            order_date = start_date + timedelta(days=days_offset)
            completion_date = order_date + timedelta(days=random.randint(1, 7))
            
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
                'units_produced': max(0, actual_units - scrap_units),
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
        
        print(f"Generating {count} work orders with varied realistic patterns...")
        work_orders = self.generate_work_orders(count)
        
        # Calculate statistics
        material_driven = sum(1 for wo in work_orders 
                            if (wo['actual_material_cost'] - wo['planned_material_cost']) > 
                               (wo['actual_labor_hours'] - wo['planned_labor_hours']) * 200)
        labor_driven = sum(1 for wo in work_orders 
                         if (wo['actual_labor_hours'] - wo['planned_labor_hours']) * 200 > 
                            (wo['actual_material_cost'] - wo['planned_material_cost']))
        under_budget = sum(1 for wo in work_orders 
                          if wo['actual_material_cost'] < wo['planned_material_cost'] 
                          and wo['actual_labor_hours'] < wo['planned_labor_hours'])
        quality_issues = sum(1 for wo in work_orders if wo['quality_issues'])
        
        print("\nInserting into database...")
        response = self.supabase.table('work_orders').insert(work_orders).execute()
        
        print(f"\n✅ Successfully inserted {len(work_orders)} work orders")
        print("\nVariance Distribution:")
        print(f"  • Material-driven variances: {material_driven} orders")
        print(f"  • Labor-driven variances: {labor_driven} orders")
        print(f"  • Under-budget orders: {under_budget} orders")
        print(f"  • Quality issues: {quality_issues} orders")
        print(f"\nThis data includes:")
        print("  - Material price spikes (2 different patterns)")
        print("  - Labor-intensive rework scenarios")
        print("  - Equipment degradation issues")
        print("  - Supplier quality problems")
        print("  - Shift inefficiency patterns")
        print("  - Combined multi-factor issues")
        print("  - Efficiency wins (under budget)")
        
        return response

if __name__ == "__main__":
    generator = EnhancedDataGenerator()
    
    # Clear existing demo data first
    print("Clearing existing demo data...")
    generator.supabase.table('work_orders').delete().eq('demo_mode', True).execute()
    
    # Generate 500 orders with comprehensive patterns
    generator.insert_demo_data(500)