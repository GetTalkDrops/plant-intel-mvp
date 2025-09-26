from typing import Dict
from cost_analyzer import CostAnalyzer
from equipment_predictor import EquipmentPredictor
from quality_analyzer import QualityAnalyzer
from efficiency_analyzer import EfficiencyAnalyzer
from data_aware_responder import DataAwareResponder
from conversational_templates import ConversationalTemplates
from query_preprocessor import QueryPreprocessor

class EnhancedQueryRouter:
    def __init__(self):
        self.cost_analyzer = CostAnalyzer()
        self.equipment_predictor = EquipmentPredictor()
        self.quality_analyzer = QualityAnalyzer()
        self.efficiency_analyzer = EfficiencyAnalyzer()
        self.data_responder = DataAwareResponder()
        self.templates = ConversationalTemplates()
        self.preprocessor = QueryPreprocessor()
        
    def route_query(self, query: str, facility_id: int = 1) -> Dict:
        """Enhanced routing with robust query preprocessing"""
        
        # Preprocess query for typos and variations
        corrected_query, was_corrected = self.preprocessor.suggest_correction(query)
        categories = self.preprocessor.fuzzy_category_match(query)
        
        # Use the corrected query for routing
        query_lower = corrected_query
        
        # Priority 1: Specific equipment/material follow-ups
        if any(mat in query_lower for mat in ['mat-1900', 'mat-1800', 'mat-1600']):
            follow_up = self.templates.get_follow_up_response(query, {})
            if follow_up:
                return self._add_correction_note(follow_up, query, corrected_query, was_corrected)
        
        # Priority 2: Data limitation cases
        data_response = self.data_responder.get_data_aware_response(corrected_query, facility_id)
        if data_response:
            return self._add_correction_note(data_response, query, corrected_query, was_corrected)
        
        # Priority 3: Category-based routing using fuzzy matching
        if 'cost' in categories:
            return self._add_correction_note(
                self._format_cost_response(facility_id, query), 
                query, corrected_query, was_corrected
            )
        
        if 'equipment' in categories and ('maintenance' in categories or 'need' in query_lower):
            return self._add_correction_note(
                self._format_equipment_response(facility_id, query),
                query, corrected_query, was_corrected
            )
        
        if 'quality' in categories and not any(cat in categories for cat in ['plant', 'facility']):
            return self._add_correction_note(
                self._format_quality_response(facility_id, query),
                query, corrected_query, was_corrected
            )
        
        if 'efficiency' in categories:
            return self._add_correction_note(
                self._format_efficiency_response(facility_id, query),
                query, corrected_query, was_corrected
            )
        
        # Priority 4: General conversational templates
        if any(word in query_lower for word in ['calculate', 'calculation', 'how did you']):
            follow_up = self.templates.get_follow_up_response(query, {})
            if follow_up:
                return self._add_correction_note(follow_up, query, corrected_query, was_corrected)
        
        # Fallback with suggestion
        fallback = {
            'type': 'help',
            'message': "I can analyze your manufacturing data for cost variance, equipment performance, quality issues, and operational efficiency.\n\nTry asking:\n• 'What equipment needs attention?'\n• 'Show me cost risks'\n• 'What are my quality issues?'\n• 'How is my efficiency?'",
            'insights': [],
            'total_impact': 0
        }
        
        return self._add_correction_note(fallback, query, corrected_query, was_corrected)
    
    def _add_correction_note(self, response: Dict, original: str, corrected: str, was_corrected: bool) -> Dict:
        """Add correction note if query was significantly changed"""
        if was_corrected and original.lower() != corrected.lower():
            # Add subtle correction note
            correction_note = f"\n\n*Interpreting: '{corrected}'*"
            response['message'] = response['message'] + correction_note
        
        return response
    
    # Include all the existing format methods from the previous router...
    def _format_cost_response(self, facility_id: int, query: str) -> Dict:
        result = self.cost_analyzer.predict_cost_variance(facility_id)
        
        if not result['predictions']:
            return {
                'type': 'cost_analysis',
                'message': "Your cost tracking looks good - no work orders are showing significant budget risk patterns right now.",
                'insights': [],
                'total_impact': 0
            }
        
        top_risk = result['predictions'][0]
        message = f"I'm tracking **{len(result['predictions'])} work orders** that might go over budget.\n\n"
        message += f"Your biggest concern is **{top_risk['work_order_number']}** - it's showing **${top_risk['predicted_variance']:,.0f}** potential overrun with **{top_risk['confidence']}% confidence**.\n\n"
        message += f"**Total budget exposure:** ${result['total_impact']:,.0f}\n\n"
        message += f"**My recommendation:** Review material costs and labor planning for {top_risk['work_order_number']} first."
        
        return {
            'type': 'cost_analysis',
            'message': message,
            'insights': result['predictions'],
            'total_impact': result['total_impact']
        }
    
    def _format_equipment_response(self, facility_id: int, query: str) -> Dict:
        result = self.equipment_predictor.predict_failures(facility_id)
        
        if not result['predictions']:
            return {
                'type': 'equipment_analysis',
                'message': "Your equipment is performing well - no assets are showing failure risk patterns right now.",
                'insights': [],
                'total_impact': 0
            }
        
        top_risk = result['predictions'][0]
        details = top_risk.get('analysis_details', {})
        
        message = f"**{top_risk['equipment_id']}** needs attention - **{top_risk['failure_probability']:.1f}% failure risk** with **${top_risk['estimated_downtime_cost']:,.0f}** potential downtime cost.\n\n"
        
        if details:
            message += f"What's happening: {details.get('total_scrap_units', 0)} scrap units and {details.get('avg_labor_variance', 0):.1f} hour average overruns across {top_risk['orders_analyzed']} orders. "
        
        message += "This pattern suggests the equipment needs preventive maintenance.\n\n"
        
        timeline = "this week" if top_risk['failure_probability'] > 75 else "within 2 weeks"
        message += f"**My recommendation:** Schedule maintenance for {top_risk['equipment_id']} {timeline}. "
        message += f"Acting now prevents **${int(top_risk['estimated_downtime_cost'] * 1.5):,.0f}** in emergency repair costs."
        
        if len(result['predictions']) > 1:
            message += f"\n\nI also see issues with **{result['predictions'][1]['equipment_id']}** - ask if you want details."
        
        return {
            'type': 'equipment_analysis',
            'message': message,
            'insights': result['predictions'],
            'total_impact': result['total_downtime_cost']
        }
    
    def _format_quality_response(self, facility_id: int, query: str) -> Dict:
        result = self.quality_analyzer.analyze_quality_patterns(facility_id)
        
        if not result['quality_issues']:
            return {
                'type': 'quality_analysis',
                'message': f"Quality looks solid - overall scrap rate of {result['overall_scrap_rate']} units per order is within normal range.",
                'insights': [],
                'total_impact': result['total_scrap_cost']
            }
        
        top_issue = result['quality_issues'][0]
        
        message = f"Quality is slipping - **{result['overall_scrap_rate']} units scrapped per order** on average.\n\n"
        message += f"**{top_issue['material_code']}** is your biggest problem: {top_issue['scrap_rate_per_order']} scrap per order, {top_issue['quality_issue_rate']}% of orders have issues, costing **${top_issue['estimated_cost_impact']:,.0f}**.\n\n"
        message += f"**My recommendation:** Start with {top_issue['material_code']} - audit your supplier or check process controls. "
        message += f"Fixing this could save **${int(top_issue['estimated_cost_impact'] * 0.7):,.0f}** monthly."
        
        return {
            'type': 'quality_analysis',
            'message': message,
            'insights': result['quality_issues'],
            'total_impact': result['total_scrap_cost']
        }
    
    def _format_efficiency_response(self, facility_id: int, query: str) -> Dict:
        result = self.efficiency_analyzer.analyze_efficiency_patterns(facility_id)
        
        if not result['efficiency_insights']:
            return {
                'type': 'efficiency_analysis',
                'message': f"Efficiency looks good - overall facility efficiency of {result['overall_efficiency']}% is solid.",
                'insights': [],
                'total_impact': 0
            }
        
        top_opportunity = result['efficiency_insights'][0]
        
        message = f"Overall efficiency: **{result['overall_efficiency']}%**\n\n"
        message += f"Your biggest optimization opportunity is **{top_opportunity['operation_type']} operations** - "
        message += f"{top_opportunity['efficiency_score']}% efficiency with **${top_opportunity['potential_savings']:,.0f}** potential savings.\n\n"
        
        factors = top_opportunity.get('improvement_factors', [])
        if factors:
            message += f"Issues: {', '.join(factors)}\n\n"
        
        message += f"**My recommendation:** Focus on {top_opportunity['operation_type']} process improvements first."
        
        return {
            'type': 'efficiency_analysis',
            'message': message,
            'insights': result['efficiency_insights'],
            'total_impact': result['total_savings_opportunity']
        }
