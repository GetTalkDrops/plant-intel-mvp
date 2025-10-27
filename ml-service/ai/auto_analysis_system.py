from analyzers.cost_analyzer import CostAnalyzer
from analyzers.equipment_predictor import EquipmentPredictor
from analyzers.quality_analyzer import QualityAnalyzer
from analyzers.efficiency_analyzer import EfficiencyAnalyzer
from typing import Dict

class ConversationalAutoAnalysis:
    def __init__(self):
        self.cost_analyzer = CostAnalyzer()
        self.equipment_predictor = EquipmentPredictor()
        self.quality_analyzer = QualityAnalyzer()
        self.efficiency_analyzer = EfficiencyAnalyzer()
        
    def generate_conversational_summary(self, facility_id: int = 1) -> Dict:
        """Generate conversational manufacturing intelligence"""
        
        # Run all analyses
        cost_result = self.cost_analyzer.predict_cost_variance(facility_id)
        equip_result = self.equipment_predictor.predict_failures(facility_id)
        qual_result = self.quality_analyzer.analyze_quality_patterns(facility_id)
        eff_result = self.efficiency_analyzer.analyze_efficiency_patterns(facility_id)
        
        # Build conversational response
        total_impact = 0
        
        # Calculate totals
        if cost_result['predictions']:
            total_impact += cost_result['total_impact']
        if equip_result['predictions']:
            total_impact += equip_result['total_downtime_cost']
        if qual_result['quality_issues']:
            total_impact += qual_result['total_scrap_cost']
        
        # Start with headline
        if total_impact > 50000:
            urgency = "needs immediate attention"
        elif total_impact > 20000:
            urgency = "requires action this week" 
        else:
            urgency = "has some areas to optimize"
            
        message = f"Your operation {urgency} - I found **${total_impact:,.0f}** in potential issues across {len(equip_result['predictions']) + len(qual_result['quality_issues']) + len(cost_result['predictions'])} areas.\n\n"
        
        # Equipment issues (highest priority)
        if equip_result['predictions']:
            message += "**EQUIPMENT ALERTS**\n\n"
            
            top_equipment = equip_result['predictions'][0]
            details = top_equipment.get('analysis_details', {})
            
            message += f"Your **{top_equipment['equipment_id']}** is showing problems - "
            message += f"**{top_equipment['failure_probability']:.1f}% failure risk** with **${top_equipment['estimated_downtime_cost']:,.0f}** potential downtime cost.\n\n"
            
            # Explanation in plain language
            message += f"Here's what's happening: {details.get('total_scrap_units', 0)} scrap units and {details.get('avg_labor_variance', 0):.1f} hour average overruns across {top_equipment['orders_analyzed']} recent orders. "
            message += "This pattern typically means the equipment is wearing down and needs attention.\n\n"
            
            # Specific action
            if top_equipment['failure_probability'] > 75:
                message += f"**My recommendation:** Schedule maintenance for {top_equipment['equipment_id']} this week. "
            else:
                message += f"**My recommendation:** Schedule maintenance for {top_equipment['equipment_id']} within 2 weeks. "
            message += f"Acting now prevents **${int(top_equipment['estimated_downtime_cost'] * 1.5):,.0f}** in emergency repair costs.\n\n"
            
            # Additional equipment if exists
            if len(equip_result['predictions']) > 1:
                message += f"I also see issues with **{equip_result['predictions'][1]['equipment_id']}** (${equip_result['predictions'][1]['estimated_downtime_cost']:,.0f} risk) - let me know if you want details.\n\n"
        
        # Quality issues
        if qual_result['quality_issues']:
            message += "**QUALITY CONCERNS**\n\n"
            
            top_quality = qual_result['quality_issues'][0]
            message += f"Quality is slipping with **{qual_result['overall_scrap_rate']} units scrapped per order** on average. "
            message += f"**{top_quality['material_code']}** is your biggest problem right now.\n\n"
            
            # Plain language breakdown
            message += f"**{top_quality['material_code']}** details: {top_quality['scrap_rate_per_order']} scrap per order, "
            message += f"{top_quality['quality_issue_rate']}% of orders have issues, costing **${top_quality['estimated_cost_impact']:,.0f}**.\n\n"
            
            # Specific action
            message += f"**My recommendation:** Start with {top_quality['material_code']} - either audit your supplier or check your process controls. "
            message += f"Fixing this could save **${int(top_quality['estimated_cost_impact'] * 0.7):,.0f}** monthly.\n\n"
        
        # Cost overruns (usually lower priority)
        if cost_result['predictions']:
            message += "**COST WATCH**\n\n"
            message += f"I'm tracking **{len(cost_result['predictions'])} work orders** that might go over budget by **${cost_result['total_impact']:,.0f}** total. "
            
            top_cost = cost_result['predictions'][0]
            message += f"Keep an eye on **{top_cost['work_order_number']}** - ${top_cost['predicted_variance']:,.0f} potential overrun.\n\n"
        
        # Summary and next steps
        prevention_value = total_impact * 0.8
        message += "**BOTTOM LINE**\n\n"
        message += f"Total exposure: **${total_impact:,.0f}**\n"
        message += f"Preventable through action: **${prevention_value:,.0f}**\n\n"
        
        if equip_result['predictions']:
            message += f"**Start here:** Address {equip_result['predictions'][0]['equipment_id']} equipment issues first for maximum impact."
        elif qual_result['quality_issues']:
            message += f"**Start here:** Focus on {qual_result['quality_issues'][0]['material_code']} quality issues first."
        else:
            message += "**Start here:** Review cost planning for flagged work orders."
        
        # Collect all alerts for structured data
        alerts = []
        
        for pred in equip_result['predictions']:
            alerts.append({
                'type': 'equipment',
                'item': pred['equipment_id'],
                'risk': pred['failure_probability'],
                'cost': pred['estimated_downtime_cost'],
                'priority': 'high' if pred['failure_probability'] > 75 else 'medium'
            })
        
        for issue in qual_result['quality_issues']:
            alerts.append({
                'type': 'quality',
                'item': issue['material_code'],
                'risk': issue['risk_score'],
                'cost': issue['estimated_cost_impact'],
                'priority': 'medium'
            })
        
        for pred in cost_result['predictions']:
            alerts.append({
                'type': 'cost',
                'item': pred['work_order_number'],
                'risk': pred['confidence'],
                'cost': pred['predicted_variance'],
                'priority': 'medium'
            })
        
        return {
            'type': 'conversational_summary',
            'message': message,
            'alerts': alerts,
            'total_impact': total_impact,
            'prevention_value': prevention_value
        }

# Test the conversational version
if __name__ == "__main__":
    system = ConversationalAutoAnalysis()
    result = system.generate_conversational_summary()
