from supabase import create_client, Client
import random
from datetime import datetime, timedelta
import os
from dotenv import load_dotenv

class SimpleDataGenerator:
    def __init__(self):
        load_dotenv('../.env.local')
        url = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
        key = os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY")
        self.supabase: Client = create_client(url, key)
    
    def generate_operational_data(self):
        # Clear existing demo data first
        self.supabase.table('work_orders').delete().eq('demo_mode', True).execute()
        
        work_orders = []
        operations = ["PROD", "MAINT", "SETUP", "QC", "PACK"]
        
        for i in range(1, 51):
            op = random.choice(operations)
            planned_cost = random.randint(1000, 5000)
            actual_cost = planned_cost + random.randint(-1000, 2000)
            
            work_orders.append({
                "work_order_number": f"WO-{op}-{i:04d}",
                "facility_id": 1,
                "planned_material_cost": planned_cost,
                "actual_material_cost": actual_cost,
                "planned_labor_hours": random.randint(4, 16),
                "actual_labor_hours": random.randint(4, 20),
                "material_code": f"MAT-{random.randint(1000, 1999)}",
                "units_scrapped": random.randint(0, 15),
                "status": "completed",
                "demo_mode": True
            })
        
        response = self.supabase.table('work_orders').insert(work_orders).execute()
        print(f"Generated {len(work_orders)} operational work orders")

if __name__ == "__main__":
    generator = SimpleDataGenerator()
    generator.generate_operational_data()