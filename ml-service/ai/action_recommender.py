"""
Action Recommender - Generates specific, actionable recommendations with consultant tone
Transforms technical analysis into business-focused guidance
"""
from typing import Dict, List, Optional
from datetime import datetime

class ActionRecommender:
    """Generate specific, actionable recommendations in consultant style"""
    
    def __init__(self):
        pass
    
    def generate_consultant_narrative(
        self,
        insight_type: str,
        identifier: str,
        analysis: Dict,
        baseline_context: Optional[Dict] = None,
        cost_trend: Optional[Dict] = None,
        degradation: Optional[Dict] = None,
        drift: Optional[Dict] = None,
        correlations: Optional[List[Dict]] = None
    ) -> Dict:
        """
        Generate full consultant-style narrative with headline, context, impact, and action
        
        Returns: {
            'headline': "URGENT: Equipment needs attention",
            'what_happening': "Detailed description with numbers and timeframes",
            'why_matters': "Financial impact and business consequences",
            'recommended_action': "Specific next step with timeframe",
            'urgency_level': 'critical' | 'high' | 'medium' | 'low'
        }
        """
        
        if insight_type == 'equipment' or insight_type == 'equipment_quality':
            return self._format_equipment_narrative(
                identifier, analysis, degradation, correlations
            )
        elif insight_type == 'material' or insight_type == 'material_quality':
            return self._format_material_narrative(
                identifier, analysis, baseline_context, cost_trend, drift, correlations
            )
        elif insight_type == 'quality':
            return self._format_quality_narrative(
                identifier, analysis, drift, correlations
            )
        elif insight_type == 'cost_prediction':
            return self._format_cost_prediction_narrative(
                identifier, analysis, baseline_context
            )
        else:
            return self._format_generic_narrative(identifier, analysis)
    
    def _format_equipment_narrative(
        self,
        equipment_id: str,
        analysis: Dict,
        degradation: Optional[Dict],
        correlations: Optional[List[Dict]]
    ) -> Dict:
        """Format equipment issue in consultant style"""
        
        # Extract key metrics
        total_impact = analysis.get('total_impact', 0)
        risk_score = analysis.get('risk_score', 0)
        breakdown = analysis.get('breakdown', {})
        
        # Build headline
        if degradation:
            deg_pct = degradation.get('degradation_pct', 0)
            headline = f"URGENT: {equipment_id} needs attention - performance degraded {deg_pct}%"
            urgency = 'critical' if deg_pct > 20 else 'high'
        elif risk_score > 70:
            headline = f"CRITICAL: {equipment_id} showing failure risk"
            urgency = 'critical'
        else:
            headline = f"{equipment_id} performance issues detected"
            urgency = 'medium'
        
        # What's happening
        what_parts = [f"{equipment_id} is showing performance issues"]
        
        if degradation:
            early_avg = degradation.get('early_avg', 0)
            recent_avg = degradation.get('recent_avg', 0)
            days = degradation.get('days_analyzed', 30)
            what_parts.append(
                f"cycle time increased from {early_avg:.1f} hours to {recent_avg:.1f} hours over the last {days} days"
            )
            
            if degradation.get('days_to_threshold'):
                days_left = degradation['days_to_threshold']
                what_parts.append(f"at this rate, will reach failure threshold in {days_left} days")
        
        # Add labor impact
        labor = breakdown.get('labor', {})
        if labor.get('impact', 0) > 0:
            labor_impact = labor['impact']
            what_parts.append(f"causing ${labor_impact:,.0f} in extra labor costs")
        
        # Add quality impact
        quality = breakdown.get('quality', {})
        if quality.get('scrap_units', 0) > 0:
            scrap = quality['scrap_units']
            what_parts.append(f"and {scrap} units scrapped")
        
        what_happening = ". ".join(what_parts) + "."
        
        # Add correlation context
        if correlations:
            corr_text = self._format_correlations(correlations)
            if corr_text:
                what_happening += f" {corr_text}"
        
        # Why it matters
        why_matters = f"Financial impact: ${total_impact:,.0f} already incurred"
        
        if degradation and degradation.get('days_to_threshold'):
            estimated_failure_cost = total_impact * 5  # Estimate 5x cost if full failure
            why_matters += f". Without intervention, estimated ${estimated_failure_cost:,.0f} downtime cost expected"
        
        # Recommended action
        if degradation:
            action = degradation.get('recommendation', '')
        else:
            action = f"Schedule inspection and maintenance for {equipment_id} within 7 days"
        
        return {
            'headline': headline,
            'what_happening': what_happening,
            'why_matters': why_matters,
            'recommended_action': action,
            'urgency_level': urgency,
            'financial_impact': total_impact
        }
    
    def _format_material_narrative(
        self,
        material_code: str,
        analysis: Dict,
        baseline_context: Optional[Dict],
        cost_trend: Optional[Dict],
        drift: Optional[Dict],
        correlations: Optional[List[Dict]]
    ) -> Dict:
        """Format material cost or quality issue in consultant style"""
        
        # Determine if this is cost or quality issue
        if drift:
            return self._format_quality_narrative(material_code, analysis, drift, correlations)
        
        # Cost issue
        total_impact = analysis.get('total_impact', 0)
        
        # Build headline with baseline context
        if baseline_context and baseline_context.get('narrative'):
            headline = f"Cost Alert: {baseline_context['narrative']}"
            urgency = 'high' if baseline_context.get('deviation_pct', 0) > 30 else 'medium'
        elif cost_trend:
            change_pct = cost_trend.get('cost_change_pct', 0)
            direction = cost_trend.get('trend_direction', 'changing')
            headline = f"Cost Trend: {material_code} costs {direction} {abs(change_pct):.0f}%"
            urgency = 'high' if abs(change_pct) > 25 else 'medium'
        else:
            headline = f"{material_code} cost variance detected"
            urgency = 'medium'
        
        # What's happening
        what_parts = []
        
        if cost_trend:
            early = cost_trend.get('early_avg', 0)
            recent = cost_trend.get('recent_avg', 0)
            what_parts.append(
                f"{material_code} costs moved from ${early:,.2f} to ${recent:,.2f}"
            )
            
            if cost_trend.get('inflection_days_ago'):
                days = cost_trend['inflection_days_ago']
                if days == 0:
                    what_parts.append("starting today")
                elif days == 1:
                    what_parts.append("starting yesterday")
                elif days < 7:
                    what_parts.append(f"starting {days} days ago")
                else:
                    weeks = days // 7
                    what_parts.append(f"starting {weeks} week{'s' if weeks > 1 else ''} ago")
        
        what_happening = ". ".join(what_parts) if what_parts else f"{material_code} showing cost variance"
        
        # Add correlations
        if correlations:
            corr_text = self._format_correlations(correlations)
            if corr_text:
                what_happening += f". {corr_text}"
        
        # Why it matters
        why_matters = f"Financial impact: ${abs(total_impact):,.0f} over plan in current batch"
        
        if cost_trend:
            # Extrapolate monthly impact
            monthly_impact = abs(total_impact) * 4
            why_matters += f". Projected monthly impact: ${monthly_impact:,.0f}"
        
        # Recommended action
        if cost_trend:
            action = cost_trend.get('recommendation', '')
        elif correlations and any(c.get('type') == 'supplier_change' for c in correlations):
            action = "Request quality documentation from new supplier and review pricing terms"
        else:
            action = f"Review {material_code} pricing with supplier and compare alternatives"
        
        return {
            'headline': headline,
            'what_happening': what_happening,
            'why_matters': why_matters,
            'recommended_action': action,
            'urgency_level': urgency,
            'financial_impact': abs(total_impact)
        }
    
    def _format_quality_narrative(
        self,
        material_code: str,
        analysis: Dict,
        drift: Optional[Dict],
        correlations: Optional[List[Dict]]
    ) -> Dict:
        """Format quality issue in consultant style"""
        
        total_impact = analysis.get('total_impact', 0)
        
        # Build headline
        if drift:
            early_scrap = drift.get('early_scrap_rate', 0)
            recent_scrap = drift.get('recent_scrap_rate', 0)
            multiplier = drift.get('multiplier', 1)
            headline = f"Quality Alert: {material_code} scrap rate climbing to {recent_scrap:.1f}% from baseline {early_scrap:.1f}%"
            urgency = 'critical' if multiplier > 2 else 'high'
        else:
            headline = f"Quality issue: {material_code} elevated defect rate"
            urgency = 'medium'
        
        # What's happening
        what_parts = []
        
        if drift:
            drift_pct = drift.get('drift_pct', 0)
            days = drift.get('days_analyzed', 30)
            what_parts.append(
                f"Scrap rate increased {drift_pct:.1f} percentage points over {days} days"
            )
            
            if drift.get('inflection_days_ago'):
                days_ago = drift['inflection_days_ago']
                if days_ago < 7:
                    what_parts.append(f"starting {days_ago} days ago")
                else:
                    weeks = days_ago // 7
                    what_parts.append(f"starting {weeks} week{'s' if weeks > 1 else ''} ago")
        
        what_happening = ". ".join(what_parts) if what_parts else f"{material_code} showing elevated scrap rates"
        
        # Add correlations
        if correlations:
            corr_text = self._format_correlations(correlations)
            if corr_text:
                what_happening += f". {corr_text}"
        
        # Why it matters
        why_matters = f"Financial impact: ${total_impact:,.0f} in scrap and rework costs"
        
        if drift:
            # Extrapolate if trend continues
            monthly_impact = total_impact * 4
            why_matters += f". If trend continues: ${monthly_impact:,.0f} monthly waste"
        
        # Recommended action
        if drift:
            action = drift.get('recommendation', '')
        elif correlations and any(c.get('type') == 'supplier_change' for c in correlations):
            action = "Request Certificate of Analysis (COA) from supplier and inspect next incoming batch"
        else:
            action = f"Investigate {material_code} quality - inspect next 10 units and review process parameters"
        
        return {
            'headline': headline,
            'what_happening': what_happening,
            'why_matters': why_matters,
            'recommended_action': action,
            'urgency_level': urgency,
            'financial_impact': total_impact
        }
    
    def _format_cost_prediction_narrative(
        self,
        work_order: str,
        analysis: Dict,
        baseline_context: Optional[Dict]
    ) -> Dict:
        """Format work order cost variance in consultant style"""
        
        variance_breakdown = analysis.get('variance_breakdown', {})
        primary_driver = variance_breakdown.get('primary_driver', 'unknown')
        
        material = variance_breakdown.get('material', {})
        labor = variance_breakdown.get('labor', {})
        
        total_variance = material.get('variance', 0) + labor.get('variance', 0)
        
        # Build headline
        if abs(total_variance) > 10000:
            headline = f"CRITICAL: {work_order} major cost overrun ${abs(total_variance):,.0f}"
            urgency = 'critical'
        elif abs(total_variance) > 5000:
            headline = f"HIGH ALERT: {work_order} over budget by ${abs(total_variance):,.0f}"
            urgency = 'high'
        else:
            headline = f"{work_order} cost variance detected"
            urgency = 'medium'
        
        # What's happening
        what_parts = [f"{work_order} exceeded plan"]
        
        if primary_driver == 'labor':
            labor_var = labor.get('hours_variance', 0)
            labor_cost = labor.get('variance', 0)
            context = labor.get('context', '')
            what_parts.append(f"labor hours ran {labor_var:.1f} hours over (+${labor_cost:,.0f})")
            if context:
                what_parts.append(context.lower())
        elif primary_driver == 'material':
            material_var = material.get('variance', 0)
            context = material.get('context', '')
            what_parts.append(f"material costs ${material_var:,.0f} over plan")
            if context:
                what_parts.append(context.lower())
        
        # Add baseline context if available
        if baseline_context and baseline_context.get('material_baseline'):
            mb = baseline_context['material_baseline']
            if mb.get('narrative'):
                what_parts.append(mb['narrative'])
        
        what_happening = ". ".join(what_parts) + "."
        
        # Why it matters
        material_pct = material.get('percentage', 0)
        labor_pct = labor.get('percentage', 0)
        
        why_matters = f"Cost overrun: ${abs(total_variance):,.0f}"
        if material_pct > 60:
            why_matters += " (primarily material costs)"
        elif labor_pct > 60:
            why_matters += " (primarily labor inefficiency)"
        
        # Recommended action
        if primary_driver == 'labor' and labor.get('hours_variance', 0) > 20:
            action = f"Investigate {work_order} - review equipment performance and operator training"
        elif primary_driver == 'material':
            action = f"Review material costs for {work_order} - verify pricing and quantities"
        else:
            action = f"Review {work_order} cost breakdown and identify root cause"
        
        return {
            'headline': headline,
            'what_happening': what_happening,
            'why_matters': why_matters,
            'recommended_action': action,
            'urgency_level': urgency,
            'financial_impact': abs(total_variance)
        }
    
    def _format_generic_narrative(self, identifier: str, analysis: Dict) -> Dict:
        """Fallback for other insight types"""
        total_impact = analysis.get('total_impact', 0)
        
        return {
            'headline': f"{identifier} requires attention",
            'what_happening': f"Issue detected with {identifier}",
            'why_matters': f"Financial impact: ${total_impact:,.0f}",
            'recommended_action': f"Review {identifier} performance and take corrective action",
            'urgency_level': 'medium',
            'financial_impact': total_impact
        }
    
    def _format_correlations(self, correlations: List[Dict]) -> str:
        """Format correlations into readable text"""
        if not correlations:
            return ""
        
        # Take the most relevant correlation
        correlation = correlations[0]
        
        corr_type = correlation.get('type', '')
        description = correlation.get('description', '')
        
        if corr_type == 'supplier_change':
            return f"Coincides with {description.lower()}"
        elif corr_type == 'price_jump':
            return f"Notable: {description}"
        elif corr_type == 'equipment_pattern':
            return f"Pattern observed: {description}"
        elif description:
            return description
        
        return ""
