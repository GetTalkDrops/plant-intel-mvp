"""
Insight Prioritization System
Scores and ranks insights by: financial_impact*0.4 + deviation*0.3 + urgency*0.2 + confidence*0.1

Returns prioritized insights as:
- URGENT (top 5)
- NOTABLE (next 10)
- BACKGROUND (rest)

Enhanced with consultant-style narratives for all insights
"""

from typing import List, Dict, Optional
from dataclasses import dataclass
from enum import Enum
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from ai.action_recommender import ActionRecommender


class InsightPriority(str, Enum):
    """Priority levels for insights"""
    URGENT = "urgent"
    NOTABLE = "notable"
    BACKGROUND = "background"


@dataclass
class ScoredInsight:
    """Insight with priority score"""
    source_analyzer: str  # Which analyzer produced this
    insight_type: str  # "prediction", "pattern", etc.
    insight_data: Dict  # Original insight data
    priority_score: float  # 0-100
    priority_level: InsightPriority
    financial_impact: float
    deviation_score: float
    urgency_score: float
    confidence_score: float


class InsightPrioritizer:
    """Prioritizes insights from multiple analyzers"""
    
    # Scoring weights
    FINANCIAL_WEIGHT = 0.4
    DEVIATION_WEIGHT = 0.3
    URGENCY_WEIGHT = 0.2
    CONFIDENCE_WEIGHT = 0.1
    
    # Priority thresholds
    URGENT_COUNT = 5
    NOTABLE_COUNT = 10
    
    def __init__(self):
        """Initialize with action recommender"""
        self.action_recommender = ActionRecommender()
    
    def prioritize_insights(
        self, 
        cost_results: Dict = None,
        equipment_results: Dict = None,
        quality_results: Dict = None,
        efficiency_results: Dict = None
    ) -> Dict[str, List[ScoredInsight]]:
        """
        Collect and prioritize all insights from analyzers
        
        Args:
            cost_results: Results from cost_analyzer
            equipment_results: Results from equipment_predictor
            quality_results: Results from quality_analyzer
            efficiency_results: Results from efficiency_analyzer
            
        Returns:
            Dictionary with 'urgent', 'notable', 'background' lists
        """
        all_insights = []
        
        # Extract insights from cost analyzer
        if cost_results and cost_results.get('status') == 'success':
            all_insights.extend(self._extract_cost_insights(cost_results))
        
        # Extract insights from equipment predictor
        if equipment_results and equipment_results.get('status') == 'success':
            all_insights.extend(self._extract_equipment_insights(equipment_results))
        
        # Extract insights from quality analyzer
        if quality_results and quality_results.get('status') == 'success':
            all_insights.extend(self._extract_quality_insights(quality_results))
        
        # Extract insights from efficiency analyzer
        if efficiency_results and efficiency_results.get('status') == 'success':
            all_insights.extend(self._extract_efficiency_insights(efficiency_results))
        
        # Score all insights
        scored_insights = [self._score_insight(insight) for insight in all_insights]
        
        # Sort by priority score (highest first)
        scored_insights.sort(key=lambda x: x.priority_score, reverse=True)
        
        # Assign priority levels
        urgent = scored_insights[:self.URGENT_COUNT]
        notable = scored_insights[self.URGENT_COUNT:self.URGENT_COUNT + self.NOTABLE_COUNT]
        background = scored_insights[self.URGENT_COUNT + self.NOTABLE_COUNT:]
        
        # Set priority levels
        for insight in urgent:
            insight.priority_level = InsightPriority.URGENT
        for insight in notable:
            insight.priority_level = InsightPriority.NOTABLE
        for insight in background:
            insight.priority_level = InsightPriority.BACKGROUND
        
        return {
            'urgent': urgent,
            'notable': notable,
            'background': background,
            'total_insights': len(scored_insights)
        }
    
    def _extract_cost_insights(self, results: Dict) -> List[Dict]:
        """Extract insights from cost analyzer results"""
        insights = []
        
        # Patterns are high-value insights
        for pattern in results.get('patterns', []):
            identifier = pattern.get('identifier', 'Unknown')
            pattern_data = pattern.copy()
            pattern_data['identifier'] = identifier
            
            insights.append({
                'source_analyzer': 'cost_analyzer',
                'insight_type': 'pattern',
                'data': pattern_data,
                'financial_impact': abs(pattern.get('total_impact', 0)),
                'identifier': identifier
            })
        
        # Individual predictions (work order level)
        for prediction in results.get('predictions', []):
            wo_number = prediction.get('work_order_number', 'Unknown')
            prediction_data = prediction.copy()
            prediction_data['identifier'] = wo_number
            
            insights.append({
                'source_analyzer': 'cost_analyzer',
                'insight_type': 'prediction',
                'data': prediction_data,
                'financial_impact': abs(prediction.get('predicted_variance', 0)),
                'identifier': wo_number
            })
        
        return insights
    
    def _extract_equipment_insights(self, results: Dict) -> List[Dict]:
        """Extract insights from equipment predictor results"""
        insights = []
        
        # Equipment predictor returns 'insights' not 'predictions'
        for insight in results.get('insights', []):
            # Equipment failures are urgent
            failure_risk = insight.get('failure_probability', 0)
            estimated_cost = insight.get('estimated_downtime_cost', 0)
            equipment_id = insight.get('equipment_id', 'Unknown')
            
            # Ensure identifier is in data for narrative generation
            insight_data = insight.copy()
            insight_data['identifier'] = equipment_id
            
            insights.append({
                'source_analyzer': 'equipment_predictor',
                'insight_type': 'equipment_failure_risk',
                'data': insight_data,
                'financial_impact': estimated_cost,
                'identifier': equipment_id,
                'failure_risk': failure_risk
            })
        
        return insights
    
    def _extract_quality_insights(self, results: Dict) -> List[Dict]:
        """Extract insights from quality analyzer results"""
        insights = []
        
        # Quality analyzer returns 'insights' not 'quality_issues'
        for issue in results.get('insights', []):
            # Scrap and rework have direct financial impact
            financial_impact = issue.get('estimated_cost_impact', 0)
            material_code = issue.get('material_code', 'Unknown')
            
            # Ensure identifier is in data for narrative generation
            issue_data = issue.copy()
            issue_data['identifier'] = material_code
            
            insights.append({
                'source_analyzer': 'quality_analyzer',
                'insight_type': 'quality_issue',
                'data': issue_data,
                'financial_impact': financial_impact,
                'identifier': material_code
            })
        
        return insights
    
    def _extract_efficiency_insights(self, results: Dict) -> List[Dict]:
        """Extract insights from efficiency analyzer results"""
        insights = []
        
        for opportunity in results.get('opportunities', []):
            # Efficiency opportunities have savings potential
            savings = opportunity.get('potential_savings', 0)
            
            insights.append({
                'source_analyzer': 'efficiency_analyzer',
                'insight_type': 'efficiency_opportunity',
                'data': opportunity,
                'financial_impact': savings,
                'identifier': opportunity.get('area', 'Unknown')
            })
        
        return insights
    
    def _score_insight(self, insight: Dict) -> ScoredInsight:
        """
        Calculate priority score for an insight
        
        Score = financial_impact*0.4 + deviation*0.3 + urgency*0.2 + confidence*0.1
        """
        data = insight.get('data', {})
        
        # Financial Impact Score (0-100)
        financial_impact = insight.get('financial_impact', 0)
        financial_score = min(100, (financial_impact / 1000) * 10)  # $1000 = 10 points
        
        # Deviation Score (0-100)
        deviation_score = self._calculate_deviation_score(insight)
        
        # Urgency Score (0-100)
        urgency_score = self._calculate_urgency_score(insight)
        
        # Confidence Score (0-100)
        confidence = data.get('confidence', 0.7)  # Default 70%
        confidence_score = confidence * 100
        
        # Weighted total
        priority_score = (
            financial_score * self.FINANCIAL_WEIGHT +
            deviation_score * self.DEVIATION_WEIGHT +
            urgency_score * self.URGENCY_WEIGHT +
            confidence_score * self.CONFIDENCE_WEIGHT
        )
        
        return ScoredInsight(
            source_analyzer=insight['source_analyzer'],
            insight_type=insight['insight_type'],
            insight_data=data,
            priority_score=round(priority_score, 2),
            priority_level=InsightPriority.BACKGROUND,  # Will be updated later
            financial_impact=financial_impact,
            deviation_score=deviation_score,
            urgency_score=urgency_score,
            confidence_score=confidence_score
        )
    
    def _calculate_deviation_score(self, insight: Dict) -> float:
        """Calculate how much this deviates from normal (0-100)"""
        data = insight.get('data', {})
        
        # Equipment failure risk
        if 'failure_risk' in insight:
            return insight['failure_risk'] * 100
        
        # Cost variance deviation
        if 'risk_level' in data:
            risk_map = {
                'critical': 100,
                'high': 75,
                'medium': 50,
                'low': 25
            }
            return risk_map.get(data['risk_level'], 50)
        
        # Pattern-based deviation (order count = severity)
        if 'order_count' in data:
            # More orders affected = higher deviation
            return min(100, data['order_count'] * 10)
        
        # Default moderate deviation
        return 50
    
    def _calculate_urgency_score(self, insight: Dict) -> float:
        """Calculate how urgent this insight is (0-100)"""
        data = insight.get('data', {})
        insight_type = insight.get('insight_type', '')
        
        # Equipment failures are urgent
        if insight_type == 'equipment_failure_risk':
            failure_prob = insight.get('failure_risk', 0)
            return failure_prob * 100  # High failure risk = high urgency
        
        # Quality issues with high scrap rates
        if insight_type == 'quality_issue':
            scrap_rate = data.get('scrap_rate', 0)
            return min(100, scrap_rate * 200)  # 50% scrap = 100 urgency
        
        # Cost patterns affecting many orders
        if insight_type == 'pattern':
            order_count = data.get('order_count', 0)
            return min(100, order_count * 8)  # 12+ orders = 96+ urgency
        
        # Cost predictions - risk level determines urgency
        if insight_type == 'prediction':
            risk_map = {
                'critical': 95,
                'high': 75,
                'medium': 50,
                'low': 25
            }
            return risk_map.get(data.get('risk_level', 'medium'), 50)
        
        # Efficiency opportunities - lower urgency
        if insight_type == 'efficiency_opportunity':
            return 40  # Opportunities are less urgent than problems
        
        return 50  # Default moderate urgency
    
    def _generate_narrative(self, scored: ScoredInsight) -> Dict:
        """Generate consultant-style narrative for an insight"""
        data = scored.insight_data
        identifier = data.get('identifier', 'Unknown')
        
        # Extract context from insight data
        analysis = data.get('analysis', {})
        baseline_context = analysis.get('baseline_context') if analysis else data.get('baseline_context')
        cost_trend = data.get('cost_trend')
        degradation = data.get('degradation')
        drift = data.get('drift')
        correlations = data.get('correlations')
        
        # Determine insight type for narrative generation
        if scored.insight_type == 'equipment_failure_risk' or scored.source_analyzer == 'equipment_predictor':
            insight_type = 'equipment'
        elif scored.insight_type == 'quality_issue' or 'scrap' in str(data).lower():
            insight_type = 'quality'
        elif scored.insight_type == 'pattern' and data.get('type') == 'material':
            insight_type = 'material'
        elif scored.insight_type == 'prediction' and scored.source_analyzer == 'cost_analyzer':
            # Cost predictions - check if it's labor or material driven
            if analysis:
                primary_driver = analysis.get('variance_breakdown', {}).get('primary_driver', 'cost')
                insight_type = 'material' if primary_driver == 'material' else 'cost_prediction'
            else:
                insight_type = 'material'
        else:
            insight_type = scored.insight_type
        
        # Generate narrative
        try:
            narrative = self.action_recommender.generate_consultant_narrative(
                insight_type=insight_type,
                identifier=identifier,
                analysis=analysis if analysis else data,
                baseline_context=baseline_context,
                cost_trend=cost_trend,
                degradation=degradation,
                drift=drift,
                correlations=correlations
            )
            return narrative
        except Exception as e:
            # Fallback if narrative generation fails
            return {
                'headline': f'{identifier} requires attention',
                'what_happening': 'Analysis detected an issue',
                'why_matters': f'Financial impact: ${data.get("financial_impact", 0):,.0f}',
                'recommended_action': 'Review and take corrective action',
                'urgency_level': 'medium',
                'financial_impact': data.get('financial_impact', 0)
            }
    
    def format_prioritized_feed(self, prioritized: Dict) -> Dict:
        """
        Format prioritized insights for API response with consultant narratives
        
        Returns clean structure ready for frontend
        """
        def format_insight(scored: ScoredInsight) -> Dict:
            # Generate consultant narrative
            narrative = self._generate_narrative(scored)
            
            return {
                'id': f"{scored.source_analyzer}_{scored.insight_type}_{scored.insight_data.get('identifier', 'unknown')}",
                'priority': scored.priority_level,
                'score': scored.priority_score,
                'source': scored.source_analyzer,
                'type': scored.insight_type,
                'financial_impact': scored.financial_impact,
                'data': scored.insight_data,
                'narrative': narrative,  # Consultant-style narrative
                'scores': {
                    'financial': round(scored.financial_impact, 2),
                    'deviation': round(scored.deviation_score, 2),
                    'urgency': round(scored.urgency_score, 2),
                    'confidence': round(scored.confidence_score, 2)
                }
            }
        
        return {
            'urgent': [format_insight(i) for i in prioritized['urgent']],
            'notable': [format_insight(i) for i in prioritized['notable']],
            'background': [format_insight(i) for i in prioritized['background']],
            'summary': {
                'total_insights': prioritized['total_insights'],
                'urgent_count': len(prioritized['urgent']),
                'notable_count': len(prioritized['notable']),
                'background_count': len(prioritized['background']),
                'total_financial_impact': sum(i.financial_impact for i in prioritized['urgent'] + prioritized['notable'])
            }
        }


# Example usage
if __name__ == "__main__":
    prioritizer = InsightPrioritizer()
    
    # Mock analyzer results
    mock_cost_results = {
        'status': 'success',
        'predictions': [
            {
                'work_order_number': 'WO-001',
                'predicted_variance': 5000,
                'confidence': 0.85,
                'risk_level': 'high'
            },
            {
                'work_order_number': 'WO-002',
                'predicted_variance': 1200,
                'confidence': 0.72,
                'risk_level': 'medium'
            }
        ],
        'patterns': [
            {
                'identifier': 'MAT-100',
                'order_count': 8,
                'total_impact': 12000,
                'confidence': 0.88
            }
        ]
    }
    
    mock_equipment_results = {
        'status': 'success',
        'predictions': [
            {
                'equipment_id': 'MILL-01',
                'failure_probability': 0.75,
                'estimated_downtime_cost': 15000,
                'confidence': 0.80
            }
        ]
    }
    
    # Prioritize
    result = prioritizer.prioritize_insights(
        cost_results=mock_cost_results,
        equipment_results=mock_equipment_results
    )
    
    formatted = prioritizer.format_prioritized_feed(result)
    
    print("URGENT Insights:")
    for insight in formatted['urgent']:
        print(f"  - {insight['type']}: ${insight['financial_impact']:,.0f} (score: {insight['score']})")
    
    print("\nNOTABLE Insights:")
    for insight in formatted['notable']:
        print(f"  - {insight['type']}: ${insight['financial_impact']:,.0f} (score: {insight['score']})")
    
    print(f"\nTotal Insights: {formatted['summary']['total_insights']}")
    print(f"Total Financial Impact: ${formatted['summary']['total_financial_impact']:,.0f}")
    def _generate_narrative(self, scored: ScoredInsight) -> Dict:
        """Generate consultant-style narrative for an insight"""
        data = scored.insight_data
        identifier = data.get('identifier', 'Unknown')
        
        # Extract context from insight data
        analysis = data.get('analysis', {})
        baseline_context = analysis.get('baseline_context') if analysis else data.get('baseline_context')
        cost_trend = data.get('cost_trend')
        degradation = data.get('degradation')
        drift = data.get('drift')
        correlations = data.get('correlations')
        
        # Determine insight type for narrative generation
        if scored.insight_type == 'equipment_failure_risk' or scored.source_analyzer == 'equipment_predictor':
            insight_type = 'equipment'
        elif scored.insight_type == 'quality_issue' or 'scrap' in str(data).lower():
            insight_type = 'quality'
        elif scored.insight_type == 'pattern' and data.get('type') == 'material':
            insight_type = 'material'
        elif scored.insight_type == 'prediction' and scored.source_analyzer == 'cost_analyzer':
            # Cost predictions - check if it's labor or material driven
            if analysis:
                primary_driver = analysis.get('variance_breakdown', {}).get('primary_driver', 'cost')
                insight_type = 'material' if primary_driver == 'material' else 'cost_prediction'
            else:
                insight_type = 'material'
        else:
            insight_type = scored.insight_type
        
        # Generate narrative
        try:
            narrative = self.action_recommender.generate_consultant_narrative(
                insight_type=insight_type,
                identifier=identifier,
                analysis=analysis if analysis else data,
                baseline_context=baseline_context,
                cost_trend=cost_trend,
                degradation=degradation,
                drift=drift,
                correlations=correlations
            )
            return narrative
        except Exception as e:
            # Fallback if narrative generation fails
            return {
                'headline': f'{identifier} requires attention',
                'what_happening': 'Analysis detected an issue',
                'why_matters': f'Financial impact: ${data.get("financial_impact", 0):,.0f}',
                'recommended_action': 'Review and take corrective action',
                'urgency_level': 'medium',
                'financial_impact': data.get('financial_impact', 0)
            }
