"""
Updated Enhanced Query Router - Now handles data queries and scenarios too!
Replace your existing enhanced_query_router.py with this file
"""

from typing import Dict
from analyzers.cost_analyzer import CostAnalyzer
from analyzers.equipment_predictor import EquipmentPredictor
from analyzers.quality_analyzer import QualityAnalyzer
from analyzers.efficiency_analyzer import EfficiencyAnalyzer
from handlers.data_aware_responder import DataAwareResponder
from ai.conversational_templates import ConversationalTemplates
from handlers.query_preprocessor import QueryPreprocessor

# NEW IMPORTS
from handlers.query_classifier import QueryClassifier
from handlers.data_query_handler import DataQueryHandler
from handlers.scenario_handler import ScenarioHandler

class EnhancedQueryRouter:
    def __init__(self):
        # Existing analyzers
        self.cost_analyzer = CostAnalyzer()
        self.equipment_predictor = EquipmentPredictor()
        self.quality_analyzer = QualityAnalyzer()
        self.efficiency_analyzer = EfficiencyAnalyzer()
        self.data_responder = DataAwareResponder()
        self.templates = ConversationalTemplates()
        self.preprocessor = QueryPreprocessor()
        
        # NEW: Add query classifier and handlers
        self.classifier = QueryClassifier()
        self.data_query_handler = DataQueryHandler()
        self.scenario_handler = ScenarioHandler()
        
    def route_query(self, query: str, facility_id: int = 1, batch_id: str = None, config: dict = None) -> Dict:
        """Enhanced routing with data queries, scenarios, and batch filtering"""
        
        # Preprocess query
        corrected_query, was_corrected = self.preprocessor.suggest_correction(query)
        query_lower = corrected_query.lower()
        
        # NEW: Classify the query type first
        classification = self.classifier.classify(corrected_query)
        
        # NEW: Route to data query handler
        if classification['type'] == 'data_query':
            result = self.data_query_handler.handle_query(
                corrected_query, 
                facility_id, 
                classification.get('subtype', 'general_metric')
            )
            return self._add_correction_note(result, query, corrected_query, was_corrected)
        
        # NEW: Route to scenario handler
        if classification['type'] == 'scenario':
            result = self.scenario_handler.handle_scenario(
                corrected_query,
                facility_id,
                classification.get('subtype', 'general')
            )
            return self._add_correction_note(result, query, corrected_query, was_corrected)
        
        # NEW: Route to data retrieval (for now, treat as data query)
        if classification['type'] == 'retrieval':
            # Extract what they're asking for
            if 'mat-' in query_lower or 'material' in query_lower:
                # This is a follow-up about a specific material
                follow_up = self.templates.get_follow_up_response(query, {})
                if follow_up:
                    return self._add_correction_note(follow_up, query, corrected_query, was_corrected)
        
        # EXISTING: Priority 1: Specific material follow-ups (MAT-1900, etc)
        if any(mat in query_lower for mat in ['mat-1900', 'mat-1800', 'mat-1600']):
            follow_up = self.templates.get_follow_up_response(query, {})
            if follow_up:
                return self._add_correction_note(follow_up, query, corrected_query, was_corrected)
        
        # EXISTING: Priority 2: Direct keyword matching for analysis types
        equipment_keywords = ['equipment', 'machine', 'maintenance', 'failure', 'asset']
        quality_keywords = ['quality', 'scrap', 'defect', 'rework']
        cost_keywords = ['cost', 'variance', 'budget', 'overrun', 'spending']
        efficiency_keywords = ['efficiency', 'productivity', 'optimization', 'performance']
        
        if any(keyword in query_lower for keyword in equipment_keywords):
            return self._add_correction_note(
                self._format_equipment_response(facility_id, query, batch_id, config),
                query, corrected_query, was_corrected
            )
        
        if any(keyword in query_lower for keyword in quality_keywords):
            return self._add_correction_note(
                self._format_quality_response(facility_id, query, batch_id, config),
                query, corrected_query, was_corrected
            )
        
        if any(keyword in query_lower for keyword in cost_keywords):
            return self._add_correction_note(
                self._format_cost_response(facility_id, query, batch_id, config),
                query, corrected_query, was_corrected
            )
        
        if any(keyword in query_lower for keyword in efficiency_keywords):
            return self._add_correction_note(
                self._format_efficiency_response(facility_id, query, batch_id, config),
                query, corrected_query, was_corrected
            )
        
        # EXISTING: Priority 3: Fuzzy category matching (fallback)
        categories = self.preprocessor.fuzzy_category_match(query)
        
        if 'cost' in categories:
            return self._add_correction_note(
                self._format_cost_response(facility_id, query, batch_id, config),
                query, corrected_query, was_corrected
            )
        
        if 'equipment' in categories:
            return self._add_correction_note(
                self._format_equipment_response(facility_id, query, batch_id, config),
                query, corrected_query, was_corrected
            )
        
        if 'quality' in categories:
            return self._add_correction_note(
                self._format_quality_response(facility_id, query, batch_id, config),
                query, corrected_query, was_corrected
            )
        
        if 'efficiency' in categories:
            return self._add_correction_note(
                self._format_efficiency_response(facility_id, query, batch_id, config),
                query, corrected_query, was_corrected
            )
        
        # UPDATED: Better fallback help message
        fallback = {
            'type': 'help',
            'message': self._get_help_message(),
            'insights': [],
            'total_impact': 0
        }
        
        return self._add_correction_note(fallback, query, corrected_query, was_corrected)
    
    def _get_help_message(self) -> str:
        """Generate helpful message with examples"""
        message = "I can help you with:\n\n"
        message += "**Analysis:**\n"
        message += "• 'What equipment needs attention?'\n"
        message += "• 'Show me cost risks'\n"
        message += "• 'What are my quality issues?'\n"
        message += "• 'How is my efficiency?'\n\n"
        message += "**Data Queries:**\n"
        message += "• 'What was the labor rate?'\n"
        message += "• 'What is our scrap rate?'\n"
        message += "• 'Show me efficiency rates'\n\n"
        message += "**Scenarios:**\n"
        message += "• 'What if we add a shift?'\n"
        message += "• 'What if we reduce scrap by 50%?'\n"
        message += "• 'What if we increase capacity?'"
        return message
    
    def _add_correction_note(self, response: Dict, original: str, corrected: str, was_corrected: bool) -> Dict:
        """Add correction note if query was significantly changed"""
        if was_corrected and original.lower() != corrected.lower():
            correction_note = f"\n\n*Interpreting: '{corrected}'*"
            response['message'] = response['message'] + correction_note
        return response
    
    # EXISTING METHODS (keep all your existing _format_* methods exactly as they are)
    
    def _format_cost_response(self, facility_id: int, query: str, batch_id: str = None, config: dict = None) -> Dict:
        result = self.cost_analyzer.predict_cost_variance(facility_id, batch_id, config)
        
        if result.get('status') == 'insufficient_data':
            validation = result.get('validation', {})
            message = f"⚠️ **Data Quality Alert**\n\n"
            message += f"Data quality is too low for reliable cost analysis.\n\n"
            message += f"**Quality Score: {validation.get('score', 0)}/100** ({validation.get('grade', 'poor')})\n\n"
            if validation.get('warnings'):
                message += "**Issues Found:**\n"
                for warning in validation['warnings']:
                    message += f"• {warning}\n"
            message += "\nPlease upload data with more complete cost information."
            
            return {
                'type': 'cost_analysis',
                'message': message,
                'insights': [],
                'total_impact': 0
            }
        
        if 'error' in result:
            return {
                'type': 'cost_analysis',
                'message': result.get('message', 'Analysis error occurred'),
                'insights': [],
                'total_impact': 0
            }
        
        predictions = result.get('predictions', [])
        validation = result.get('validation', {})
        thresholds = result.get('thresholds', {})
        
        if not predictions:
            message = "Good news! No significant cost variances detected in your data."
            if validation and validation.get('score', 100) < 85:
                message += f"\n\n📊 **Data Quality: {validation['score']}/100** ({validation['grade']})"
            return {
                'type': 'cost_analysis',
                'message': message,
                'insights': [],
                'total_impact': 0
            }
        
        top_risk = predictions[0]
        message = f"I'm tracking **{len(predictions)} work orders** with significant cost variances.\n\n"
        message += f"Your biggest concern is **{top_risk['work_order_number']}** - showing **${abs(top_risk['predicted_variance']):,.0f}** variance.\n\n"
        
        if result.get('total_impact'):
            message += f"**Total cost exposure:** ${result['total_impact']:,.0f}\n\n"
        
        message += f"**My recommendation:** Review material costs and labor planning for {top_risk['work_order_number']} first."
        
        return {
            'type': 'cost_analysis',
            'message': message,
            'predictions': predictions,
            'patterns': result.get('patterns', []),  
            'total_impact': result.get('total_impact', 0),
            'validation': validation,
            'thresholds': thresholds,
            "total_savings_opportunity": result.get("total_savings_opportunity", 0),
        }
    
    def _format_equipment_response(self, facility_id: int, query: str, batch_id: str = None, config: dict = None) -> Dict:
        result = self.equipment_predictor.predict_failures(facility_id, batch_id, config)
        
        if result.get('message'):
            return {
                'type': 'equipment_analysis',
                'message': result['message'],
                'insights': [],
                'total_impact': 0
            }
        
        if not result.get('predictions') or len(result['predictions']) == 0:
            return {
                'type': 'equipment_analysis',
                'message': "Your equipment is performing well - no assets showing failure risk patterns right now.",
                'insights': [],
                'total_impact': 0
            }
        
        top_risk = result['predictions'][0]
        analysis = top_risk.get('analysis', {})
        breakdown = analysis.get('breakdown', {})
        
        message = f"**{top_risk['equipment_id']}** needs attention - **{top_risk['failure_probability']:.0f}% failure risk**\n\n"
        message += f"**Total Cost Impact: ${top_risk['estimated_downtime_cost']:,}**\n\n"
        
        if breakdown:
            message += "**Impact Breakdown:**\n"
            if breakdown.get('labor', {}).get('impact', 0) > 0:
                labor = breakdown['labor']
                message += f"• Labor: ${labor['impact']:,} ({labor['percentage']:.0f}%) - {labor['driver']}\n"
            
            if breakdown.get('quality', {}).get('impact', 0) > 0:
                quality = breakdown['quality']
                message += f"• Quality: ${quality['impact']:,} ({quality['percentage']:.0f}%) - {quality['driver']}\n"
            
            if breakdown.get('material_waste', {}).get('impact', 0) > 0:
                material = breakdown['material_waste']
                message += f"• Material Waste: ${material['impact']:,} ({material['percentage']:.0f}%)\n"
            
            message += f"\n**Primary Issue:** {analysis.get('primary_issue', 'unknown').replace('_', ' ').title()}\n"
        
        message += f"\n**Orders Analyzed:** {top_risk['orders_analyzed']}\n\n"
        
        primary = analysis.get('primary_issue', 'labor')
        if primary == 'labor':
            message += "**Recommendation:** Schedule maintenance - performance degradation is causing labor overruns."
        elif primary == 'quality':
            message += "**Recommendation:** Immediate inspection required - quality issues causing significant scrap."
        else:
            message += "**Recommendation:** Address quality issues to reduce material waste."
        
        if len(result['predictions']) > 1:
            message += f"\n\n*Also monitoring {len(result['predictions']) - 1} other equipment with elevated risk.*"
        
        return {
            'type': 'equipment_analysis',
            'message': message,
            'insights': result['predictions'],
            'total_impact': result.get('total_downtime_cost', 0)
        }

    def _format_quality_response(self, facility_id: int, query: str, batch_id: str = None, config: dict = None) -> Dict:
        result = self.quality_analyzer.analyze_quality_patterns(facility_id, batch_id, config)
        
        if not result.get('quality_issues') or len(result['quality_issues']) == 0:
            return {
                'type': 'quality_analysis',
                'message': f"Quality looks solid - overall scrap rate of {result.get('overall_scrap_rate', 0):.2f} units per order is within normal range.",
                'insights': [],
                'total_impact': result.get('total_scrap_cost', 0)
            }
        
        top_issue = result['quality_issues'][0]
        analysis = top_issue.get('analysis', {})
        breakdown = analysis.get('breakdown', {})
        
        message = f"Quality issues detected with **{top_issue['material_code']}**\n\n"
        message += f"**Total Cost Impact: ${top_issue['estimated_cost_impact']:,}**\n\n"
        
        if breakdown:
            message += "**Cost Breakdown:**\n"
            if breakdown.get('scrap', {}).get('cost', 0) > 0:
                scrap = breakdown['scrap']
                message += f"• Scrap: ${scrap['cost']:,} ({scrap['percentage']:.0f}%) - {scrap['driver']}\n"
            
            if breakdown.get('rework', {}).get('cost', 0) > 0:
                rework = breakdown['rework']
                message += f"• Rework Labor: ${rework['cost']:,} ({rework['percentage']:.0f}%) - {rework['driver']}\n"
            
            if breakdown.get('material_waste', {}).get('cost', 0) > 0:
                waste = breakdown['material_waste']
                message += f"• Material Waste: ${waste['cost']:,} ({waste['percentage']:.0f}%)\n"
            
            message += f"\n**Primary Driver:** {analysis.get('primary_driver', 'unknown').title()}\n"
        
        message += f"\n**Issue Rate:** {top_issue['quality_issue_rate']:.1f}% of orders affected\n"
        message += f"**Scrap Rate:** {top_issue['scrap_rate_per_order']:.1f} units per order\n\n"
        
        primary = analysis.get('primary_driver', 'scrap')
        if primary == 'scrap':
            message += f"**Recommendation:** Investigate {top_issue['material_code']} supplier quality - high scrap rate indicates material or process issues."
        elif primary == 'rework':
            message += f"**Recommendation:** Review production process for {top_issue['material_code']} - excessive rework time suggests training or equipment issues."
        else:
            message += "**Recommendation:** Audit material usage procedures to reduce waste."
        
        if len(result['quality_issues']) > 1:
            message += f"\n\n*Also found issues with {len(result['quality_issues']) - 1} other materials.*"
        
        return {
            'type': 'quality_analysis',
            'message': message,
            'insights': result['quality_issues'],
            'total_impact': result.get('total_scrap_cost', 0)
        }
    
    def _format_efficiency_response(self, facility_id: int, query: str, batch_id: str = None, config: dict = None) -> Dict:
        result = self.efficiency_analyzer.analyze_efficiency_patterns(facility_id, batch_id, config)
        
        if not result.get('efficiency_insights'):
            return {
                'type': 'efficiency_analysis',
                'message': f"Efficiency looks good - overall facility efficiency of {result.get('overall_efficiency', 0)}% is solid.",
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
            'total_impact': result.get('total_savings_opportunity', 0)
        }