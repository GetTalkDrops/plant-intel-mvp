from supabase import create_client, Client
import random
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import os
from dotenv import load_dotenv

class EnhancedDataGenerator:
    def __init__(self):
        load_dotenv('../.env.local')
        url = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
        key = os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY")
        self.supabase: Client = create_client(url, key)
        
        # Manufacturing scenarios with realistic patterns
        self.scenarios = {
            'cost_escalation': {
                'materials': ['MAT-1500', 'MAT-1501', 'MAT-1502'],
                'pattern': 'increasing_costs',
                'severity': 0.15  # 15% cost increase over time
            },
            'equipment_degradation': {
                'materials': ['MAT-1800', 'MAT-1801'],
                'pattern': 'labor_efficiency_decline',
                'severity': 0.25  # 25% efficiency loss
            },
            'quality_issues': {
                'materials': ['MAT-1900', 'MAT-1901', 'MAT-1902'],
                'pattern': 'high_scrap_rates',
                'severity': 0.4  # 40% of orders have quality issues
            },
            'process_inconsistency': {
                'materials': ['MAT-1600', 'MAT-1601'],
                'pattern': 'variable_performance',
                'severity': 0.3  # 30% variance in performance
            }
        }
    
    def generate_comprehensive_dataset(self, num_orders: int = 250):
        """Generate comprehensive manufacturing dataset with realistic problems"""
        
        # Clear existing demo data
        self.supabase.table('work_orders').delete().eq('demo_mode', True).execute()
        
        work_orders = []
        operations = ["PROD", "MAINT", "SETUP", "QC", "PACK"]
        
        # Generate base orders with embedded problem patterns
        for i in range(1, num_orders + 1):
            op = random.choice(operations)
            
            # Determine if this order should have a problem pattern
            scenario = self._select_scenario(i, num_orders)
            
            # Base costs and times
            planned_material_cost = random.randint(800, 6000)
            planned_labor_hours = random.randint(2, 20)
            
            # Apply scenario-specific patterns
            if scenario:
                actual_material_cost, actual_labor_hours, units_scrapped, quality_issues = \
                    self._apply_scenario_pattern(scenario, planned_material_cost, planned_labor_hours, i, num_orders)
            else:
                # Normal variation for orders without problems
                actual_material_cost = planned_material_cost + random.randint(-200, 400)
                actual_labor_hours = planned_labor_hours + random.uniform(-1, 3)
                units_scrapped = random.randint(0, 2)
                quality_issues = None if random.random() > 0.1 else "Minor deviation"
            
            # Create work order
            work_order = {
                "work_order_number": f"WO-{op}-{i:04d}",
                "facility_id": 1,
                "planned_material_cost": planned_material_cost,
                "actual_material_cost": max(0, actual_material_cost),
                "planned_labor_hours": planned_labor_hours,
                "actual_labor_hours": max(0.5, actual_labor_hours),
                "material_code": scenario['materials'][0] if scenario else f"MAT-{random.randint(1000, 1999)}",
                "units_scrapped": max(0, units_scrapped),
                "quality_issues": quality_issues,
                "status": "completed",
                "demo_mode": True,
                "planned_start_date": (datetime.now() - timedelta(days=random.randint(1, 90))).isoformat(),
                "actual_start_date": (datetime.now() - timedelta(days=random.randint(1, 90))).isoformat()
            }
            
            work_orders.append(work_order)
        
        # Insert in batches to avoid timeout
        batch_size = 50
        for i in range(0, len(work_orders), batch_size):
            batch = work_orders[i:i + batch_size]
            self.supabase.table('work_orders').insert(batch).execute()
        
        
        # Print scenario summary
        self._print_scenario_summary()
    
    def _select_scenario(self, order_num: int, total_orders: int) -> dict:
        """Select which scenario (if any) applies to this order"""
        
        # Cost escalation affects 15% of orders, concentrated in recent time
        if order_num > total_orders * 0.7 and random.random() < 0.15:
            return self.scenarios['cost_escalation']
        
        # Equipment degradation affects specific materials
        if random.random() < 0.08:
            return self.scenarios['equipment_degradation']
        
        # Quality issues cluster around specific materials
        if random.random() < 0.12:
            return self.scenarios['quality_issues']
        
        # Process inconsistency affects some operations
        if random.random() < 0.10:
            return self.scenarios['process_inconsistency']
        
        return None
    
    def _apply_scenario_pattern(self, scenario: dict, planned_cost: int, planned_hours: int, 
                              order_num: int, total_orders: int) -> tuple:
        """Apply specific scenario pattern to generate realistic data"""
        
        if scenario['pattern'] == 'increasing_costs':
            # Cost escalation over time
            progress = order_num / total_orders
            cost_multiplier = 1 + (scenario['severity'] * progress)
            actual_cost = planned_cost * cost_multiplier + random.randint(-100, 500)
            actual_hours = planned_hours + random.uniform(-0.5, 2)
            scrap = random.randint(0, 3)
            issues = "Material cost spike" if random.random() < 0.3 else None
            
        elif scenario['pattern'] == 'labor_efficiency_decline':
            # Equipment showing degradation
            efficiency_loss = 1 + scenario['severity']
            actual_cost = planned_cost + random.randint(-200, 800)
            actual_hours = planned_hours * efficiency_loss + random.uniform(0, 3)
            scrap = random.randint(2, 8)  # Higher scrap due to equipment issues
            issues = "Equipment performance decline" if random.random() < 0.4 else None
            
        elif scenario['pattern'] == 'high_scrap_rates':
            # Quality issues with specific materials
            actual_cost = planned_cost + random.randint(100, 1200)  # Rework costs
            actual_hours = planned_hours + random.uniform(1, 5)    # Rework time
            scrap = random.randint(5, 15)  # High scrap
            issues = "Quality control failure" if random.random() < scenario['severity'] else None
            
        elif scenario['pattern'] == 'variable_performance':
            # Process inconsistency
            variance = scenario['severity']
            cost_var = random.uniform(-variance, variance) * planned_cost
            hour_var = random.uniform(-variance, variance) * planned_hours
            actual_cost = planned_cost + cost_var + random.randint(-300, 600)
            actual_hours = planned_hours + hour_var + random.uniform(-2, 4)
            scrap = random.randint(0, 6)
            issues = "Process variation" if random.random() < 0.2 else None
            
        else:
            # Default case
            actual_cost = planned_cost + random.randint(-200, 400)
            actual_hours = planned_hours + random.uniform(-1, 2)
            scrap = random.randint(0, 3)
            issues = None
        
        return int(actual_cost), actual_hours, int(scrap), issues
    
    def _print_scenario_summary(self):
        """Print summary of generated scenarios for validation"""

if __name__ == "__main__":
    generator = EnhancedDataGenerator()
    generator.generate_comprehensive_dataset(250)
