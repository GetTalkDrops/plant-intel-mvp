"""
Scenario Handler - Models "what-if" scenarios for business planning
"""

from supabase import create_client, Client
import os
from dotenv import load_dotenv
from statistics import mean
from typing import Dict

class ScenarioHandler:
    """Handles scenario modeling - what-if questions"""
    
    def __init__(self):
        load_dotenv('../.env.local')
        url = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
        key = os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY")
        self.supabase: Client = create_client(url, key)
    
    def handle_scenario(self, query: str, facility_id: int, scenario_type: str) -> Dict:
        """Main entry point for scenario modeling"""
        
        handlers = {
            'shift_addition': self._model_shift_addition,
            'quality_improvement': self._model_quality_improvement,
            'capacity_change': self._model_capacity_change,
            'cost_reduction': self._model_cost_reduction,
            'general': self._model_general
        }
        
        handler = handlers.get(scenario_type, self._model_general)
        return handler(query, facility_id)
    
    def _model_shift_addition(self, query: str, facility_id: int) -> Dict:
        """Model impact of adding production shifts"""
        
        # Get current production data
        response = self.supabase.table('work_orders')\
            .select('actual_labor_hours, actual_total_cost, quantity_produced, standard_hours')\
            .eq('facility_id', facility_id)\
            .not_.is_('actual_labor_hours', 'null')\
            .gt('actual_labor_hours', 0)\
            .execute()
        
        if not response.data or len(response.data) < 10:
            return {
                'type': 'scenario',
                'message': "I need more production data to model shift scenarios accurately.",
                'insights': [],
                'predictions': [],
                'total_impact': 0
            }
        
        # Calculate current metrics
        total_hours = sum(order['actual_labor_hours'] for order in response.data)
        total_units = sum(order.get('quantity_produced', 0) for order in response.data)
        total_cost = sum(order['actual_total_cost'] for order in response.data)
        
        avg_hours_per_unit = total_hours / total_units if total_units > 0 else 0
        avg_cost_per_unit = total_cost / total_units if total_units > 0 else 0
        
        # Model adding a shift (assume 8 hours, 5 days/week = 2080 hours/year)
        additional_hours = 2080
        
        # Calculate potential additional production
        potential_units = additional_hours / avg_hours_per_unit if avg_hours_per_unit > 0 else 0
        
        # Calculate costs (assume 20% premium for evening shift)
        shift_premium = 1.20
        additional_cost = potential_units * avg_cost_per_unit * shift_premium
        
        # Calculate revenue potential (need to make assumptions)
        # Assume $50/unit margin for demonstration
        assumed_margin_per_unit = 50
        potential_revenue = potential_units * assumed_margin_per_unit
        net_benefit = potential_revenue - additional_cost
        
        message = f"**Shift Addition Scenario**\n\n"
        message += f"Based on your current production data:\n\n"
        message += f"**Current Production:**\n"
        message += f"• {total_units:,.0f} units produced\n"
        message += f"• {avg_hours_per_unit:.2f} hours per unit\n"
        message += f"• ${avg_cost_per_unit:.2f} cost per unit\n\n"
        
        message += f"**Adding One Shift (8 hours/day):**\n"
        message += f"• Additional capacity: {potential_units:,.0f} units/year\n"
        message += f"• Additional hours: {additional_hours:,.0f} hours/year\n"
        message += f"• Estimated cost: ${additional_cost:,.0f}/year\n\n"
        
        if net_benefit > 0:
            message += f"**Potential Impact:** +${net_benefit:,.0f}/year in additional contribution\n\n"
            message += f"⚡ **Recommendation:** This could be profitable if you have demand for the additional {potential_units:,.0f} units. "
            message += f"Review your order backlog and market demand first."
        else:
            message += f"⚠️ **Caution:** Based on current margins, adding a shift may not be immediately profitable. "
            message += f"Consider improving efficiency first or securing additional orders."
        
        return {
            'type': 'scenario',
            'message': message,
            'predictions': [{
                'scenario': 'shift_addition',
                'additional_capacity_units': round(potential_units, 0),
                'additional_hours': additional_hours,
                'estimated_cost': round(additional_cost, 2),
                'estimated_benefit': round(net_benefit, 2)
            }],
            'insights': [],
            'total_impact': round(net_benefit, 2)
        }
    
    def _model_quality_improvement(self, query: str, facility_id: int) -> Dict:
        """Model impact of improving scrap rates"""
        
        # Get current scrap data
        response = self.supabase.table('work_orders')\
            .select('units_scrapped, quantity_produced, actual_material_cost, actual_labor_cost')\
            .eq('facility_id', facility_id)\
            .not_.is_('units_scrapped', 'null')\
            .gt('quantity_produced', 0)\
            .execute()
        
        if not response.data:
            return {
                'type': 'scenario',
                'message': "I need scrap data to model quality improvements.",
                'insights': [],
                'predictions': [],
                'total_impact': 0
            }
        
        # Calculate current scrap metrics
        total_produced = sum(order['quantity_produced'] for order in response.data)
        total_scrapped = sum(order.get('units_scrapped', 0) for order in response.data)
        total_material_cost = sum(order.get('actual_material_cost', 0) for order in response.data)
        total_labor_cost = sum(order.get('actual_labor_cost', 0) for order in response.data)
        
        current_scrap_rate = (total_scrapped / total_produced * 100) if total_produced > 0 else 0
        cost_per_unit = (total_material_cost + total_labor_cost) / total_produced if total_produced > 0 else 0
        current_scrap_cost = total_scrapped * cost_per_unit
        
        # Model reducing scrap by 50%
        improvement_factor = 0.5
        improved_scrap = total_scrapped * improvement_factor
        improved_scrap_rate = (improved_scrap / total_produced * 100)
        scrap_cost_savings = (total_scrapped - improved_scrap) * cost_per_unit
        
        message = f"**Quality Improvement Scenario**\n\n"
        message += f"**Current State:**\n"
        message += f"• Scrap Rate: {current_scrap_rate:.2f}%\n"
        message += f"• Units Scrapped: {total_scrapped:,.0f}\n"
        message += f"• Scrap Cost: ${current_scrap_cost:,.0f}\n\n"
        
        message += f"**If You Reduce Scrap by 50%:**\n"
        message += f"• New Scrap Rate: {improved_scrap_rate:.2f}%\n"
        message += f"• Units Saved: {total_scrapped - improved_scrap:,.0f}\n"
        message += f"• **Cost Savings: ${scrap_cost_savings:,.0f}/year**\n\n"
        
        message += f"💡 **Recommendation:** Reducing scrap from {current_scrap_rate:.1f}% to {improved_scrap_rate:.1f}% could save "
        message += f"${scrap_cost_savings:,.0f} annually. Focus on root cause analysis and process improvements."
        
        return {
            'type': 'scenario',
            'message': message,
            'predictions': [{
                'scenario': 'quality_improvement',
                'current_scrap_rate': round(current_scrap_rate, 2),
                'improved_scrap_rate': round(improved_scrap_rate, 2),
                'units_saved': round(total_scrapped - improved_scrap, 0),
                'cost_savings': round(scrap_cost_savings, 2)
            }],
            'insights': [],
            'total_impact': round(scrap_cost_savings, 2)
        }
    
    def _model_capacity_change(self, query: str, facility_id: int) -> Dict:
        """Model capacity changes"""
        
        response = self.supabase.table('work_orders')\
            .select('quantity_produced, actual_labor_hours')\
            .eq('facility_id', facility_id)\
            .gt('quantity_produced', 0)\
            .execute()
        
        if not response.data:
            return {
                'type': 'scenario',
                'message': "Need production data to model capacity changes.",
                'insights': [],
                'predictions': [],
                'total_impact': 0
            }
        
        total_units = sum(order['quantity_produced'] for order in response.data)
        total_hours = sum(order['actual_labor_hours'] for order in response.data)
        
        units_per_hour = total_units / total_hours if total_hours > 0 else 0
        
        # Model 25% capacity increase
        increase_percent = 25
        additional_units = total_units * (increase_percent / 100)
        additional_hours = additional_units / units_per_hour if units_per_hour > 0 else 0
        
        message = f"**Capacity Increase Scenario**\n\n"
        message += f"**Current Production:**\n"
        message += f"• {total_units:,.0f} units\n"
        message += f"• {units_per_hour:.2f} units/hour\n\n"
        
        message += f"**With {increase_percent}% Capacity Increase:**\n"
        message += f"• Additional units: {additional_units:,.0f}\n"
        message += f"• Additional hours needed: {additional_hours:,.0f}\n\n"
        
        message += f"This would require adding equipment, shifts, or improving process efficiency."
        
        return {
            'type': 'scenario',
            'message': message,
            'predictions': [{
                'scenario': 'capacity_increase',
                'increase_percentage': increase_percent,
                'additional_units': round(additional_units, 0),
                'additional_hours': round(additional_hours, 0)
            }],
            'insights': [],
            'total_impact': 0
        }
    
    def _model_cost_reduction(self, query: str, facility_id: int) -> Dict:
        """Model general cost reduction scenarios"""
        
        response = self.supabase.table('work_orders')\
            .select('actual_total_cost, actual_labor_cost, actual_material_cost')\
            .eq('facility_id', facility_id)\
            .not_.is_('actual_total_cost', 'null')\
            .execute()
        
        if not response.data:
            return {
                'type': 'scenario',
                'message': "Need cost data to model reduction scenarios.",
                'insights': [],
                'predictions': [],
                'total_impact': 0
            }
        
        total_cost = sum(order['actual_total_cost'] for order in response.data)
        labor_cost = sum(order.get('actual_labor_cost', 0) for order in response.data)
        material_cost = sum(order.get('actual_material_cost', 0) for order in response.data)
        
        # Model 10% reduction in each category
        reduction_percent = 10
        labor_savings = labor_cost * (reduction_percent / 100)
        material_savings = material_cost * (reduction_percent / 100)
        total_savings = labor_savings + material_savings
        
        message = f"**Cost Reduction Scenario**\n\n"
        message += f"**Current Costs:**\n"
        message += f"• Total: ${total_cost:,.0f}\n"
        message += f"• Labor: ${labor_cost:,.0f}\n"
        message += f"• Material: ${material_cost:,.0f}\n\n"
        
        message += f"**With {reduction_percent}% Cost Reduction:**\n"
        message += f"• Labor savings: ${labor_savings:,.0f}\n"
        message += f"• Material savings: ${material_savings:,.0f}\n"
        message += f"• **Total savings: ${total_savings:,.0f}**\n\n"
        
        message += f"Consider: process improvements, vendor negotiations, and efficiency gains."
        
        return {
            'type': 'scenario',
            'message': message,
            'predictions': [{
                'scenario': 'cost_reduction',
                'reduction_percentage': reduction_percent,
                'labor_savings': round(labor_savings, 2),
                'material_savings': round(material_savings, 2),
                'total_savings': round(total_savings, 2)
            }],
            'insights': [],
            'total_impact': round(total_savings, 2)
        }
    
    def _model_general(self, query: str, facility_id: int) -> Dict:
        """Handle general/unknown scenarios"""
        
        message = "I can help you model scenarios like:\n\n"
        message += "• 'What if we add a shift?'\n"
        message += "• 'What if we reduce scrap by 50%?'\n"
        message += "• 'What if we increase capacity by 25%?'\n"
        message += "• 'What if we reduce costs by 10%?'\n\n"
        message += "Try rephrasing your question as a 'what if' scenario!"
        
        return {
            'type': 'scenario',
            'message': message,
            'insights': [],
            'predictions': [],
            'total_impact': 0
        }