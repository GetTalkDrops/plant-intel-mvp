from supabase import create_client, Client
import random
from datetime import datetime, timedelta
import os
from dotenv import load_dotenv

class EnhancedDataGenerator:
    def __init__(self):
        load_dotenv('../.env.local')
        url = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
        key = os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY")
        self.supabase: Client = create_client(url, key)
    
    def generate_comprehensive_dataset(self, num_orders: int = 250):
        """Generate dataset with mix of critical and warning variances"""
        
        # Clear existing demo data
        self.supabase.table('work_orders').delete().eq('demo_mode', True).execute()
        
        work_orders = []
        operations = ["PROD", "MAINT", "SETUP", "QC", "PACK"]
        
        for i in range(1, num_orders + 1):
            op = random.choice(operations)
            
            # Base planned costs
            planned_material_cost = random.randint(5000, 25000)
            planned_labor_hours = random.randint(5, 40)
            
            # Create variance distribution: 40% high, 30% medium, 30% normal
            variance_type = random.choices(
                ['high', 'medium', 'normal'],
                weights=[0.4, 0.3, 0.3]
            )[0]
            
            if variance_type == 'high':
                # High variance: $3K+ (critical/red)
                variance_pct = random.uniform(0.15, 0.30)
                actual_material_cost = int(planned_material_cost * (1 + variance_pct))
                actual_labor_hours = planned_labor_hours * random.uniform(1.2, 1.5)
                units_scrapped = random.randint(5, 20)
                quality_issues = "Material quality issues"
            elif variance_type == 'medium':
                # Medium variance: $1K-3K (warning/yellow)
                variance_pct = random.uniform(0.05, 0.12)
                actual_material_cost = int(planned_material_cost * (1 + variance_pct))
                actual_labor_hours = planned_labor_hours * random.uniform(1.05, 1.15)
                units_scrapped = random.randint(2, 8)
                quality_issues = "Minor rework required" if random.random() > 0.5 else None
            else:
                # Normal variance: under $1K
                actual_material_cost = int(planned_material_cost * random.uniform(0.97, 1.03))
                actual_labor_hours = planned_labor_hours * random.uniform(0.95, 1.05)
                units_scrapped = random.randint(0, 3)
                quality_issues = None
            
            work_order = {
                "work_order_number": f"WO-{op}-{i:04d}",
                "facility_id": 1,
                "planned_material_cost": planned_material_cost,
                "actual_material_cost": actual_material_cost,
                "planned_labor_hours": planned_labor_hours,
                "actual_labor_hours": actual_labor_hours,
                "material_code": f"MAT-{random.randint(1500, 1600)}",
                "units_scrapped": units_scrapped,
                "quality_issues": quality_issues,
                "status": "completed",
                "demo_mode": True,
                "planned_start_date": (datetime.now() - timedelta(days=random.randint(1, 90))).isoformat(),
                "actual_start_date": (datetime.now() - timedelta(days=random.randint(1, 90))).isoformat()
            }
            
            work_orders.append(work_order)
        
        # Insert in batches
        batch_size = 50
        for i in range(0, len(work_orders), batch_size):
            batch = work_orders[i:i + batch_size]
            self.supabase.table('work_orders').insert(batch).execute()
        
        print(f"Generated {num_orders} orders with mixed variance levels")

if __name__ == "__main__":
    generator = EnhancedDataGenerator()
    generator.generate_comprehensive_dataset(250)