"""
Data Query Handler - Answers specific questions about metrics and data
"""

from supabase import create_client, Client
import os
from dotenv import load_dotenv
from statistics import mean, median
from typing import Dict, List, Optional

class DataQueryHandler:
    """Handles data queries - answers specific questions about metrics"""
    
    def __init__(self):
        load_dotenv('../.env.local')
        url = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
        key = os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY")
        self.supabase: Client = create_client(url, key)
    
    def handle_query(self, query: str, facility_id: int, metric_type: str) -> Dict:
        """Main entry point for data queries"""
        
        # Route to specific handler based on metric type
        handlers = {
            'labor_rate': self._handle_labor_rate,
            'scrap_rate': self._handle_scrap_rate,
            'efficiency_rate': self._handle_efficiency_rate,
            'cost_metric': self._handle_cost_metric,
            'variance_metric': self._handle_variance_metric,
            'general_metric': self._handle_general_metric
        }
        
        handler = handlers.get(metric_type, self._handle_general_metric)
        return handler(query, facility_id)
    
    def _handle_labor_rate(self, query: str, facility_id: int) -> Dict:
        """Calculate and return labor rate information"""
        
        # Fetch work orders with labor data
        response = self.supabase.table('work_orders')\
            .select('actual_labor_hours, actual_labor_cost, work_order_number, operation_type')\
            .eq('facility_id', facility_id)\
            .not_.is_('actual_labor_hours', 'null')\
            .not_.is_('actual_labor_cost', 'null')\
            .gt('actual_labor_hours', 0)\
            .execute()
        
        if not response.data:
            return {
                'type': 'data_query',
                'message': "I don't have enough labor data to calculate rates yet. Upload some work orders with labor hours and costs.",
                'insights': [],
                'total_impact': 0
            }
        
        # Calculate labor rates
        rates = []
        for order in response.data:
            if order['actual_labor_hours'] > 0:
                rate = order['actual_labor_cost'] / order['actual_labor_hours']
                rates.append(rate)
        
        if not rates:
            return {
                'type': 'data_query',
                'message': "I couldn't calculate labor rates from your data.",
                'insights': [],
                'total_impact': 0
            }
        
        avg_rate = mean(rates)
        median_rate = median(rates)
        min_rate = min(rates)
        max_rate = max(rates)
        
        message = f"**Labor Rate Analysis**\n\n"
        message += f"Based on **{len(rates)} work orders**:\n\n"
        message += f"• **Average Rate:** ${avg_rate:.2f}/hour\n"
        message += f"• **Median Rate:** ${median_rate:.2f}/hour\n"
        message += f"• **Range:** ${min_rate:.2f} - ${max_rate:.2f}/hour\n\n"
        
        # Add insight if there's high variance
        if max_rate > avg_rate * 1.5:
            message += f"⚠️ **Notice:** Some orders have labor rates significantly higher than average. "
            message += f"This could indicate overtime, contractor rates, or specialized work."
        
        return {
            'type': 'data_query',
            'message': message,
            'insights': [{
                'metric': 'labor_rate',
                'average': round(avg_rate, 2),
                'median': round(median_rate, 2),
                'min': round(min_rate, 2),
                'max': round(max_rate, 2),
                'sample_size': len(rates)
            }],
            'total_impact': 0
        }
    
    def _handle_scrap_rate(self, query: str, facility_id: int) -> Dict:
        """Calculate scrap rate information"""
        
        response = self.supabase.table('work_orders')\
            .select('units_scrapped, quantity_produced, work_order_number, material_code')\
            .eq('facility_id', facility_id)\
            .not_.is_('units_scrapped', 'null')\
            .not_.is_('quantity_produced', 'null')\
            .gt('quantity_produced', 0)\
            .execute()
        
        if not response.data:
            return {
                'type': 'data_query',
                'message': "No scrap data available yet.",
                'insights': [],
                'total_impact': 0
            }
        
        total_produced = sum(order['quantity_produced'] for order in response.data)
        total_scrapped = sum(order.get('units_scrapped', 0) for order in response.data)
        
        scrap_rate = (total_scrapped / total_produced * 100) if total_produced > 0 else 0
        
        message = f"**Scrap Rate Analysis**\n\n"
        message += f"Based on **{len(response.data)} work orders**:\n\n"
        message += f"• **Total Produced:** {total_produced:,} units\n"
        message += f"• **Total Scrapped:** {total_scrapped:,} units\n"
        message += f"• **Scrap Rate:** {scrap_rate:.2f}%\n\n"
        
        if scrap_rate > 5:
            message += f"⚠️ **High Scrap Rate:** Your scrap rate of {scrap_rate:.2f}% is above typical industry standards (3-5%). "
            message += f"This could indicate quality issues."
        elif scrap_rate < 2:
            message += f"✅ **Excellent Performance:** Your scrap rate of {scrap_rate:.2f}% is very good!"
        
        return {
            'type': 'data_query',
            'message': message,
            'insights': [{
                'metric': 'scrap_rate',
                'rate_percentage': round(scrap_rate, 2),
                'total_produced': total_produced,
                'total_scrapped': total_scrapped,
                'sample_size': len(response.data)
            }],
            'total_impact': 0
        }
    
    def _handle_efficiency_rate(self, query: str, facility_id: int) -> Dict:
        """Calculate efficiency metrics"""
        
        response = self.supabase.table('work_orders')\
            .select('standard_hours, actual_labor_hours, work_order_number')\
            .eq('facility_id', facility_id)\
            .not_.is_('standard_hours', 'null')\
            .not_.is_('actual_labor_hours', 'null')\
            .gt('standard_hours', 0)\
            .gt('actual_labor_hours', 0)\
            .execute()
        
        if not response.data:
            return {
                'type': 'data_query',
                'message': "Not enough data to calculate efficiency rates.",
                'insights': [],
                'total_impact': 0
            }
        
        efficiencies = []
        for order in response.data:
            eff = (order['standard_hours'] / order['actual_labor_hours']) * 100
            efficiencies.append(eff)
        
        avg_efficiency = mean(efficiencies)
        median_efficiency = median(efficiencies)
        
        message = f"**Efficiency Analysis**\n\n"
        message += f"Based on **{len(efficiencies)} work orders**:\n\n"
        message += f"• **Average Efficiency:** {avg_efficiency:.1f}%\n"
        message += f"• **Median Efficiency:** {median_efficiency:.1f}%\n\n"
        
        if avg_efficiency < 85:
            message += f"⚠️ **Below Target:** Efficiency is below the typical 85% target. "
            message += f"Consider reviewing processes and training."
        elif avg_efficiency > 100:
            message += f"✅ **Excellent:** You're exceeding standard times! "
            message += f"Consider updating standards or investigating if quality is maintained."
        
        return {
            'type': 'data_query',
            'message': message,
            'insights': [{
                'metric': 'efficiency',
                'average_percentage': round(avg_efficiency, 1),
                'median_percentage': round(median_efficiency, 1),
                'sample_size': len(efficiencies)
            }],
            'total_impact': 0
        }
    
    def _handle_cost_metric(self, query: str, facility_id: int) -> Dict:
        """Handle general cost-related queries"""
        
        response = self.supabase.table('work_orders')\
            .select('actual_total_cost, work_order_number, operation_type')\
            .eq('facility_id', facility_id)\
            .not_.is_('actual_total_cost', 'null')\
            .execute()
        
        if not response.data:
            return {
                'type': 'data_query',
                'message': "No cost data available yet.",
                'insights': [],
                'total_impact': 0
            }
        
        total_cost = sum(order['actual_total_cost'] for order in response.data)
        avg_cost = mean([order['actual_total_cost'] for order in response.data])
        
        message = f"**Cost Overview**\n\n"
        message += f"Based on **{len(response.data)} work orders**:\n\n"
        message += f"• **Total Cost:** ${total_cost:,.2f}\n"
        message += f"• **Average per Order:** ${avg_cost:,.2f}\n"
        
        return {
            'type': 'data_query',
            'message': message,
            'insights': [{
                'metric': 'cost',
                'total': round(total_cost, 2),
                'average': round(avg_cost, 2),
                'sample_size': len(response.data)
            }],
            'total_impact': 0
        }
    
    def _handle_variance_metric(self, query: str, facility_id: int) -> Dict:
        """Handle variance-related queries"""
        
        response = self.supabase.table('work_orders')\
            .select('standard_hours, actual_labor_hours, planned_material_cost, actual_material_cost, work_order_number')\
            .eq('facility_id', facility_id)\
            .execute()
        
        if not response.data:
            return {
                'type': 'data_query',
                'message': "Not enough data to calculate variances.",
                'insights': [],
                'total_impact': 0
            }
        
        labor_variances = []
        material_variances = []
        
        for order in response.data:
            if order.get('standard_hours') and order.get('actual_labor_hours'):
                var = order['actual_labor_hours'] - order['standard_hours']
                labor_variances.append(var)
            
            if order.get('planned_material_cost') and order.get('actual_material_cost'):
                var = order['actual_material_cost'] - order['planned_material_cost']
                material_variances.append(var)
        
        message = f"**Variance Analysis**\n\n"
        
        if labor_variances:
            avg_labor_var = mean(labor_variances)
            message += f"• **Labor Variance:** {avg_labor_var:+.1f} hours average\n"
        
        if material_variances:
            avg_material_var = mean(material_variances)
            message += f"• **Material Variance:** ${avg_material_var:+,.2f} average\n"
        
        return {
            'type': 'data_query',
            'message': message,
            'insights': [],
            'total_impact': 0
        }
    
    def _handle_general_metric(self, query: str, facility_id: int) -> Dict:
        """Handle general/unknown metric queries"""
        
        # Try to extract what they're asking about
        query_lower = query.lower()
        
        message = "I can help you analyze specific metrics. Try asking:\n\n"
        message += "• 'What was the labor rate?'\n"
        message += "• 'What is our scrap rate?'\n"
        message += "• 'Show me efficiency rates'\n"
        message += "• 'What are our cost variances?'\n"
        
        return {
            'type': 'data_query',
            'message': message,
            'insights': [],
            'total_impact': 0
        }