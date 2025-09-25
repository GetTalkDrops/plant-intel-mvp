from typing import Dict, List
import re
from cost_analyzer import CostAnalyzer
from equipment_predictor import EquipmentPredictor
from quality_analyzer import QualityAnalyzer
from efficiency_analyzer import EfficiencyAnalyzer

class QueryRouter:
    def __init__(self):
        self.cost_analyzer = CostAnalyzer()
        self.equipment_predictor = EquipmentPredictor()
        self.quality_analyzer = QualityAnalyzer()
        self.efficiency_analyzer = EfficiencyAnalyzer()
        
        # Query patterns for routing
        self.patterns = {
            'cost': [
                'cost', 'budget', 'overrun', 'expense', 'spending', 
                'variance', 'financial', 'money', 'dollar'
            ],
            'equipment': [
                'equipment', 'machine', 'maintenance', 'failure', 'breakdown',
                'downtime', 'repair', 'asset', 'reliability'
            ],
            'quality': [
                'quality', 'defect', 'scrap', 'waste', 'rework',
                'inspection', 'reject', 'error', 'problem'
            ],
            'efficiency': [
                'efficiency', 'performance', 'productivity', 'throughput',
                'optimization', 'improvement', 'speed', 'output'
            ],
            'overview': [
                'summary', 'overview', 'dashboard', 'status', 'report',
                'overall', 'general', 'everything', 'all'
            ]
        }
    
    def route_query(self, query: str, facility_id: int = 1) -> Dict:
        """Route user query to appropriate analyzer(s)"""
        query_lower = query.lower()
        
        # Determine query type
        query_type = self._classify_query(query_lower)
        
        # Execute appropriate analysis
        if query_type == 'cost':
            return self._format_cost_response(facility_id, query)
        elif query_type == 'equipment':
            return self._format_equipment_response(facility_id, query)
        elif query_type == 'quality':
            return self._format_quality_response(facility_id, query)
        elif query_type == 'efficiency':
            return self._format_efficiency_response(facility_id, query)
        elif query_type == 'overview':
            return self._format_overview_response(facility_id, query)
        else:
            return self._format_general_response(query)
    
    def _classify_query(self, query: str) -> str:
        """Classify query type based on keywords"""
        scores = {}
        
        for category, keywords in self.patterns.items():
            score = sum(1 for keyword in keywords if keyword in query)
            if score > 0:
                scores[category] = score
        
        if not scores:
            return 'general'
        
        # Return category with highest score
        return max(scores, key=scores.get)
    
    def _format_cost_response(self, facility_id: int, query: str) -> Dict:
        """Format cost analysis response"""
        result = self.cost_analyzer.predict_cost_variance(facility_id)
        
        if not result['predictions']:
            return {
                'type': 'cost_analysis',
                'message': "Cost analysis shows all work orders are within normal variance ranges. No significant cost overruns detected.",
                'insights': [],
                'total_impact': 0
            }
        
        # Format insights
        insights = []
        for pred in result['predictions']:
            insight = f"**{pred['work_order_number']}**: ${pred['predicted_variance']:,.0f} predicted variance ({pred['confidence']}% confidence)"
            insights.append(insight)
        
        message = f"**Cost Variance Analysis**\n\nIdentified {len(result['predictions'])} work orders with significant cost risks:\n\n" + "\n".join(insights)
        message += f"\n\n**Total Impact**: ${result['total_impact']:,.0f}"
        
        return {
            'type': 'cost_analysis',
            'message': message,
            'insights': result['predictions'],
            'total_impact': result['total_impact']
        }
    
    def _format_equipment_response(self, facility_id: int, query: str) -> Dict:
        """Format equipment analysis response"""
        result = self.equipment_predictor.predict_failures(facility_id)
        
        if not result['predictions']:
            return {
                'type': 'equipment_analysis',
                'message': "Equipment analysis shows all assets are performing within normal parameters. No failure risks detected.",
                'insights': [],
                'total_impact': 0
            }
        
        insights = []
        for pred in result['predictions']:
            risk_factors = ", ".join(pred['risk_factors']) if pred['risk_factors'] else "general wear"
            insight = f"**{pred['equipment_id']}**: {pred['failure_probability']}% failure risk, ${pred['estimated_downtime_cost']:,.0f} potential cost ({risk_factors})"
            insights.append(insight)
        
        message = f"**Equipment Risk Analysis**\n\nIdentified {len(result['predictions'])} assets requiring attention:\n\n" + "\n".join(insights)
        message += f"\n\n**Total Downtime Risk**: ${result['total_downtime_cost']:,.0f}"
        
        return {
            'type': 'equipment_analysis',
            'message': message,
            'insights': result['predictions'],
            'total_impact': result['total_downtime_cost']
        }
    
    def _format_quality_response(self, facility_id: int, query: str) -> Dict:
        """Format quality analysis response"""
        result = self.quality_analyzer.analyze_quality_patterns(facility_id)
        
        if not result['quality_issues']:
            return {
                'type': 'quality_analysis',
                'message': f"Quality analysis shows overall scrap rate of {result['overall_scrap_rate']} units per order. No significant quality issues detected.",
                'insights': [],
                'total_impact': result['total_scrap_cost']
            }
        
        insights = []
        for issue in result['quality_issues']:
            factors = ", ".join(issue['risk_factors']) if issue['risk_factors'] else "general quality variance"
            insight = f"**{issue['material_code']}**: {issue['risk_score']}% risk score, {issue['scrap_rate_per_order']} scrap/order, ${issue['estimated_cost_impact']:,.0f} impact ({factors})"
            insights.append(insight)
        
        message = f"**Quality Risk Analysis**\n\nOverall scrap rate: {result['overall_scrap_rate']} units per order\n\nMaterials requiring attention:\n\n" + "\n".join(insights)
        message += f"\n\n**Total Scrap Cost**: ${result['total_scrap_cost']:,.0f}"
        
        return {
            'type': 'quality_analysis',
            'message': message,
            'insights': result['quality_issues'],
            'total_impact': result['total_scrap_cost']
        }
    
    def _format_efficiency_response(self, facility_id: int, query: str) -> Dict:
        """Format efficiency analysis response"""
        result = self.efficiency_analyzer.analyze_efficiency_patterns(facility_id)
        
        if not result['efficiency_insights']:
            return {
                'type': 'efficiency_analysis',
                'message': f"Efficiency analysis shows overall facility efficiency of {result['overall_efficiency']}%. All operations performing within target ranges.",
                'insights': [],
                'total_impact': 0
            }
        
        insights = []
        for insight in result['efficiency_insights']:
            factors = ", ".join(insight['improvement_factors']) if insight['improvement_factors'] else "general optimization opportunity"
            detail = f"**{insight['operation_type']}**: {insight['efficiency_score']}% efficiency score, ${insight['potential_savings']:,.0f} savings opportunity ({factors})"
            insights.append(detail)
        
        message = f"**Efficiency Analysis**\n\nOverall facility efficiency: {result['overall_efficiency']}%\n\nImprovement opportunities:\n\n" + "\n".join(insights)
        message += f"\n\n**Total Savings Opportunity**: ${result['total_savings_opportunity']:,.0f}"
        
        return {
            'type': 'efficiency_analysis',
            'message': message,
            'insights': result['efficiency_insights'],
            'total_impact': result['total_savings_opportunity']
        }
    
    def _format_overview_response(self, facility_id: int, query: str) -> Dict:
        """Format comprehensive overview response"""
        cost_result = self.cost_analyzer.predict_cost_variance(facility_id)
        equip_result = self.equipment_predictor.predict_failures(facility_id)
        qual_result = self.quality_analyzer.analyze_quality_patterns(facility_id)
        eff_result = self.efficiency_analyzer.analyze_efficiency_patterns(facility_id)
        
        # Create summary
        summary_parts = []
        total_financial_impact = 0
        
        if cost_result['predictions']:
            summary_parts.append(f"**COST ALERTS**: {len(cost_result['predictions'])} work orders at risk (${cost_result['total_impact']:,.0f})")
            total_financial_impact += cost_result['total_impact']
        
        if equip_result['predictions']:
            summary_parts.append(f"**EQUIPMENT RISK**: {len(equip_result['predictions'])} assets need attention (${equip_result['total_downtime_cost']:,.0f} risk)")
            total_financial_impact += equip_result['total_downtime_cost']
        
        if qual_result['quality_issues']:
            summary_parts.append(f"**QUALITY ISSUES**: {len(qual_result['quality_issues'])} materials flagged (${qual_result['total_scrap_cost']:,.0f})")
            total_financial_impact += qual_result['total_scrap_cost']
        
        if eff_result['efficiency_insights']:
            summary_parts.append(f"**EFFICIENCY**: {eff_result['overall_efficiency']}% overall, ${eff_result['total_savings_opportunity']:,.0f} savings opportunity")
        
        if not summary_parts:
            message = "**Operations Summary**\n\nAll systems performing within normal parameters. No significant issues detected."
        else:
            message = f"**Operations Summary**\n\n{chr(10).join(summary_parts)}\n\n**Total Financial Impact**: ${total_financial_impact:,.0f}"
        
        return {
            'type': 'overview',
            'message': message,
            'insights': {
                'cost': cost_result['predictions'],
                'equipment': equip_result['predictions'],
                'quality': qual_result['quality_issues'],
                'efficiency': eff_result['efficiency_insights']
            },
            'total_impact': total_financial_impact
        }
    
    def _format_general_response(self, query: str) -> Dict:
        """Handle general queries"""
        return {
            'type': 'general',
            'message': "I can help you analyze cost variance, equipment performance, quality issues, and operational efficiency. Try asking: 'Show me cost analysis' or 'What equipment needs maintenance?'",
            'insights': [],
            'total_impact': 0
        }
