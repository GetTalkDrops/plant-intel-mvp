import pandas as pd
from typing import Dict, List, Optional
from datetime import datetime, timedelta

class PatternExplainer:
    """Generate rich narratives for detected patterns with data gap analysis"""
    
    def __init__(self, labor_rate_per_hour: float = 200):
        self.labor_rate = labor_rate_per_hour
    
    def explain_material_pattern(
        self, 
        pattern: Dict, 
        work_orders: List[Dict],
        all_orders_df: pd.DataFrame
    ) -> Dict:
        """Generate comprehensive narrative for material cost patterns"""
        
        material_code = pattern['identifier']
        orders_affected = pattern['order_count']
        total_variance = pattern['total_impact']
        avg_variance = pattern['avg_variance']
        
        # Calculate timespan
        wo_dates = [wo.get('production_period_start') or wo.get('upload_timestamp') 
                    for wo in work_orders if wo.get('production_period_start') or wo.get('upload_timestamp')]
        timespan_days = self._calculate_timespan(wo_dates)
        
        # Calculate variance percentage
        planned_costs = [wo.get('planned_material_cost', 0) for wo in work_orders]
        avg_planned = sum(planned_costs) / len(planned_costs) if planned_costs else 0
        variance_pct = ((avg_variance / avg_planned * 100) if avg_planned > 0 else 0)
        
        # Determine root cause
        root_cause = self._determine_material_root_cause(
            variance_pct, 
            timespan_days, 
            work_orders
        )
        
        # Identify data gaps
        data_gaps = self._identify_material_data_gaps(work_orders)
        
       # Generate and prioritize actions (sorting happens inside)
        actions = self._generate_material_actions(
            material_code,
            total_variance,
            avg_variance,
            orders_affected,
            variance_pct,
            data_gaps
        )
        
        return {
            'type': 'material_pattern',
            'identifier': material_code,
            'summary': {
                'orders_affected': orders_affected,
                'timespan_days': timespan_days,
                'total_variance': total_variance,
                'avg_variance_per_order': avg_variance,
                'variance_percentage': round(variance_pct, 1),
                'planned_avg': avg_planned,
                'actual_avg': avg_planned + avg_variance
            },
            'root_cause': root_cause,
            'financial_impact': {
                'direct_overage': total_variance,
                'pattern_scope': f"{orders_affected} orders in current batch",
                'avg_impact_per_order': avg_variance
            },
            'recommended_actions': actions,
            'data_gaps': data_gaps,
            'improvement_nudges': self._generate_material_nudges(data_gaps)
        }
    
    def explain_supplier_pattern(
        self,
        pattern: Dict,
        work_orders: List[Dict],
        all_orders_df: pd.DataFrame
    ) -> Dict:
        """Generate narrative for supplier-related patterns"""
        
        supplier_id = pattern['identifier']
        orders_affected = pattern['order_count']
        total_variance = pattern['total_impact']
        avg_variance = pattern['avg_variance']
        
        # Get materials from this supplier
        materials_affected = list(set([wo.get('material_code') for wo in work_orders 
                                      if wo.get('material_code')]))
        
        # Calculate timespan
        wo_dates = [wo.get('production_period_start') or wo.get('upload_timestamp') 
                    for wo in work_orders if wo.get('production_period_start') or wo.get('upload_timestamp')]
        timespan_days = self._calculate_timespan(wo_dates)
        
        # Root cause analysis
        root_cause = self._determine_supplier_root_cause(
            orders_affected,
            timespan_days,
            materials_affected
        )
        
        # Data gaps
        data_gaps = self._identify_supplier_data_gaps(work_orders)
        
        # Actions
        actions = self._generate_supplier_actions(
            supplier_id,
            total_variance,
            avg_variance,
            orders_affected,
            materials_affected,
            data_gaps
        )
        
        
        return {
            'type': 'supplier_pattern',
            'identifier': supplier_id,
            'summary': {
                'orders_affected': orders_affected,
                'timespan_days': timespan_days,
                'total_variance': total_variance,
                'materials_affected': len(materials_affected),
                'material_list': materials_affected[:5]  # First 5
            },
            'root_cause': root_cause,
            'financial_impact': {
                'direct_overage': total_variance,
                'pattern_scope': f"{orders_affected} orders across {len(materials_affected)} materials"
            },
            'recommended_actions': actions,
            'data_gaps': data_gaps,
            'improvement_nudges': self._generate_supplier_nudges(data_gaps)
        }
    
    def explain_equipment_pattern(
        self,
        pattern: Dict,
        work_orders: List[Dict],
        all_orders_df: pd.DataFrame
    ) -> Dict:
        """Generate narrative for equipment quality patterns"""
        
        equipment_id = pattern['identifier']
        issue_count = pattern['order_count']
        total_impact = pattern['total_impact']
        
        # Calculate quality metrics
        quality_orders = [wo for wo in work_orders if wo.get('quality_issues')]
        scrap_total = sum([wo.get('units_scrapped', 0) for wo in quality_orders])
        
        # Timespan
        wo_dates = [wo.get('production_period_start') or wo.get('upload_timestamp') 
                    for wo in work_orders if wo.get('production_period_start') or wo.get('upload_timestamp')]
        timespan_days = self._calculate_timespan(wo_dates)
        
        # Root cause
        root_cause = self._determine_equipment_root_cause(
            issue_count,
            timespan_days,
            scrap_total
        )
        
        # Data gaps
        data_gaps = self._identify_equipment_data_gaps(work_orders)
        
        # Actions
        actions = self._generate_equipment_actions(
            equipment_id,
            total_impact,
            issue_count,
            scrap_total,
            data_gaps
        )
        
        return {
            'type': 'equipment_pattern',
            'identifier': equipment_id,
            'summary': {
                'quality_issues': issue_count,
                'timespan_days': timespan_days,
                'total_scrap_units': scrap_total,
                'total_impact': total_impact
            },
            'root_cause': root_cause,
            'financial_impact': {
                'direct_impact': total_impact,
                'pattern_scope': f"{issue_count} quality issues detected"
            },
            'recommended_actions': actions,
            'data_gaps': data_gaps,
            'improvement_nudges': self._generate_equipment_nudges(data_gaps)
        }
    
    def explain_quality_pattern(
        self,
        pattern: Dict,
        work_orders: List[Dict],
        all_orders_df: pd.DataFrame
    ) -> Dict:
        """Generate narrative for material quality/defect patterns"""
        
        material_code = pattern['identifier']
        orders_affected = pattern['order_count']
        total_impact = pattern['total_impact']
        defect_rate = pattern.get('defect_rate', 0)
        
        # Calculate metrics
        total_scrap = sum([wo.get('units_scrapped', 0) for wo in work_orders])
        total_produced = sum([wo.get('units_produced', 0) for wo in work_orders])
        
        # Timespan
        wo_dates = [wo.get('production_period_start') or wo.get('upload_timestamp') 
                    for wo in work_orders if wo.get('production_period_start') or wo.get('upload_timestamp')]
        timespan_days = self._calculate_timespan(wo_dates)
        
        # Root cause
        root_cause = self._determine_quality_root_cause(
            defect_rate,
            orders_affected,
            timespan_days
        )
        
        # Data gaps
        data_gaps = self._identify_quality_data_gaps(work_orders)
        
        # Actions
        actions = self._generate_quality_actions(
            material_code,
            total_impact,
            defect_rate,
            orders_affected,
            data_gaps
        )
        
        return {
            'type': 'quality_pattern',
            'identifier': material_code,
            'summary': {
                'orders_affected': orders_affected,
                'timespan_days': timespan_days,
                'defect_rate': round(defect_rate, 1),
                'total_scrap_units': total_scrap,
                'total_impact': total_impact
            },
            'root_cause': root_cause,
            'financial_impact': {
                'direct_impact': total_impact,
                'pattern_scope': f"{orders_affected} orders with quality issues"
            },
            'recommended_actions': actions,
            'data_gaps': data_gaps,
            'improvement_nudges': self._generate_quality_nudges(data_gaps)
        }
    
    # Helper Methods
    
    def _calculate_timespan(self, dates: List[str]) -> int:
        """Calculate days between earliest and latest date"""
        if not dates:
            return 0
        
        try:
            parsed_dates = []
            for d in dates:
                if isinstance(d, str):
                    # Try ISO format first
                    try:
                        parsed_dates.append(datetime.fromisoformat(d.replace('Z', '+00:00')))
                    except:
                        # Try date only
                        parsed_dates.append(datetime.strptime(d.split('T')[0], '%Y-%m-%d'))
            
            if parsed_dates:
                return (max(parsed_dates) - min(parsed_dates)).days + 1
        except:
            pass
        
        return 0
    
    def _determine_material_root_cause(
        self, 
        variance_pct: float, 
        timespan: int,
        work_orders: List[Dict]
    ) -> Dict:
        """Determine most likely root cause for material variance"""
        
        if variance_pct > 25:
            primary = "Significant supplier price increase"
            factors = ["Market volatility", "Contract expiration", "Raw material shortage"]
        elif variance_pct > 15:
            primary = "Moderate supplier price increase"
            factors = ["Seasonal pricing changes", "Volume pricing tier change"]
        elif variance_pct > 5:
            primary = "Material cost variance"
            factors = ["Price fluctuations", "Order quantity differences"]
        else:
            primary = "Minor cost variance within normal range"
            factors = []
        
        return {
            'primary_driver': primary,
            'contributing_factors': factors,
            'confidence': 'high' if variance_pct > 15 else 'medium'
        }
    
    def _determine_supplier_root_cause(
        self,
        orders_affected: int,
        timespan: int,
        materials: List[str]
    ) -> Dict:
        """Determine root cause for supplier patterns"""
        
        if orders_affected > 10 and len(materials) > 3:
            primary = "Systematic supplier pricing changes across multiple materials"
            factors = ["Contract renewal", "Supplier cost structure change", "Market conditions"]
        elif len(materials) > 3:
            primary = "Supplier pricing affecting multiple materials"
            factors = ["Bulk pricing changes", "Supplier relationship issue"]
        else:
            primary = "Supplier materials showing cost variance"
            factors = ["Pricing adjustment", "Quality specification changes"]
        
        return {
            'primary_driver': primary,
            'contributing_factors': factors,
            'confidence': 'high' if orders_affected > 10 else 'medium'
        }
    
    def _determine_equipment_root_cause(
        self,
        issue_count: int,
        timespan: int,
        scrap_total: int
    ) -> Dict:
        """Determine root cause for equipment quality issues"""
        
        if issue_count > 5 and scrap_total > 100:
            primary = "Equipment degradation causing significant quality issues"
            factors = ["Maintenance overdue", "Component wear", "Calibration drift"]
        elif issue_count > 3:
            primary = "Equipment quality issues increasing"
            factors = ["Performance degradation", "Process parameter drift"]
        else:
            primary = "Equipment showing quality concerns"
            factors = ["Intermittent issues", "Operator variation"]
        
        return {
            'primary_driver': primary,
            'contributing_factors': factors,
            'confidence': 'high' if issue_count > 5 else 'medium'
        }
    
    def _determine_quality_root_cause(
        self,
        defect_rate: float,
        orders_affected: int,
        timespan: int
    ) -> Dict:
        """Determine root cause for quality/defect patterns"""
        
        if defect_rate > 30:
            primary = "Critical material quality issue"
            factors = ["Supplier batch quality failure", "Specification non-compliance", "Storage/handling issue"]
        elif defect_rate > 15:
            primary = "Significant material quality concerns"
            factors = ["Supplier quality variance", "Material formulation change"]
        else:
            primary = "Elevated material defect rate"
            factors = ["Quality control gaps", "Process sensitivity"]
        
        return {
            'primary_driver': primary,
            'contributing_factors': factors,
            'confidence': 'high' if defect_rate > 20 else 'medium'
        }
    
    def _identify_material_data_gaps(self, work_orders: List[Dict]) -> List[Dict]:
        """Identify missing data that would improve material analysis"""
        gaps = []
        
        # Check for supplier info
        if not any(wo.get('supplier_id') for wo in work_orders):
            gaps.append({
                'field': 'supplier_id',
                'impact': 'high',
                'description': 'Cannot correlate costs with specific suppliers'
            })
        
        # Check for contract dates
        if not any(wo.get('contract_expiration') for wo in work_orders):
            gaps.append({
                'field': 'contract_expiration',
                'impact': 'medium',
                'description': 'Cannot predict pricing changes at contract renewal'
            })
        
        # Check for lot/batch numbers
        if not any(wo.get('lot_batch_number') for wo in work_orders):
            gaps.append({
                'field': 'lot_batch_number',
                'impact': 'medium',
                'description': 'Cannot track quality by material batch'
            })
        
        return gaps
    
    def _identify_supplier_data_gaps(self, work_orders: List[Dict]) -> List[Dict]:
        """Identify missing supplier-related data"""
        gaps = []
        
        if not any(wo.get('contract_expiration') for wo in work_orders):
            gaps.append({
                'field': 'contract_expiration',
                'impact': 'high',
                'description': 'Cannot track supplier contract renewals and pricing changes'
            })
        
        if not any(wo.get('purchase_order_number') for wo in work_orders):
            gaps.append({
                'field': 'purchase_order_number',
                'impact': 'low',
                'description': 'Cannot link to procurement records'
            })
        
        return gaps
    
    def _identify_equipment_data_gaps(self, work_orders: List[Dict]) -> List[Dict]:
        """Identify missing equipment-related data"""
        gaps = []
        
        if not any(wo.get('downtime_minutes') for wo in work_orders):
            gaps.append({
                'field': 'downtime_minutes',
                'impact': 'high',
                'description': 'Cannot calculate true equipment availability and predict failures'
            })
        
        if not any(wo.get('maintenance_date') for wo in work_orders):
            gaps.append({
                'field': 'last_maintenance_date',
                'impact': 'high',
                'description': 'Cannot correlate issues with maintenance schedule'
            })
        
        if not any(wo.get('operator_id') for wo in work_orders):
            gaps.append({
                'field': 'operator_id',
                'impact': 'medium',
                'description': 'Cannot determine if issues are equipment or operator related'
            })
        
        return gaps
    
    def _identify_quality_data_gaps(self, work_orders: List[Dict]) -> List[Dict]:
        """Identify missing quality-related data"""
        gaps = []
        
        if not any(wo.get('defect_code') for wo in work_orders):
            gaps.append({
                'field': 'defect_code',
                'impact': 'high',
                'description': 'Cannot categorize defect types for targeted fixes'
            })
        
        if not any(wo.get('inspection_result') for wo in work_orders):
            gaps.append({
                'field': 'qc_inspection_result',
                'impact': 'medium',
                'description': 'Cannot track quality at inspection points'
            })
        
        return gaps
    
    def _generate_material_actions(
        self,
        material_code: str,
        total_variance: float,
        avg_variance: float,
        orders_affected: int,
        variance_pct: float,
        data_gaps: List[Dict]
    ) -> List[Dict]:
        """Generate prioritized actions for material patterns"""
        
        actions = []
        
        # Primary action: Renegotiate or switch
        if variance_pct > 15:
            actions.append({
                'priority': 1,
                'type': 'negotiate',
                'title': f'Renegotiate {material_code} pricing',
                'description': f'Contact supplier to address {variance_pct:.0f}% price increase',
                'effort': 'low',
                'timeframe': '1-2 weeks'
            })
            
            actions.append({
                'priority': 2,
                'type': 'alternate_supplier',
                'title': f'Evaluate alternate suppliers for {material_code}',
                'description': 'Compare pricing and quality from alternative sources',
                'effort': 'medium',
                'timeframe': '2-4 weeks'
            })
        
        # Lock pricing action
        actions.append({
            'priority': 3,
            'type': 'lock_pricing',
            'title': 'Lock pricing terms for 90 days',
            'description': 'Negotiate price stability while evaluating long-term strategy',
            'effort': 'low',
            'timeframe': '1 week'
        })
        
         # Calculate ROI scores and sort BEFORE returning
        effort_weights = {'low': 1.0, 'medium': 0.5, 'high': 0.25}
        for action in actions:
            # Calculate estimated savings based on action type
            monthly_orders = orders_affected * 4
            if action['type'] == 'negotiate':
                savings = abs(avg_variance) * monthly_orders * 0.5
            elif action['type'] == 'alternate_supplier':
                savings = abs(avg_variance) * monthly_orders * 0.6
            elif action['type'] == 'lock_pricing':
                savings = abs(avg_variance) * monthly_orders * 0.45
            else:
                savings = 0
            
            action['estimated_monthly_savings'] = savings
            action['roi_score'] = (savings / 10000) * effort_weights[action['effort']]
        
        # Sort by ROI score descending
        actions.sort(key=lambda x: x.get('roi_score', 0), reverse=True)
        
        return actions
    
    def _generate_supplier_actions(
        self,
        supplier_id: str,
        total_variance: float,
        avg_variance: float,
        orders_affected: int,
        materials: List[str],
        data_gaps: List[Dict]
    ) -> List[Dict]:
        """Generate actions for supplier patterns"""
        
        actions = []
        
        actions.append({
            'priority': 1,
            'type': 'supplier_review',
            'title': f'Schedule review meeting with {supplier_id}',
            'description': f'Address cost variance across {len(materials)} materials',
            'effort': 'low',
            'timeframe': '1 week'
        })
        
        actions.append({
            'priority': 2,
            'type': 'dual_source',
            'title': 'Implement dual-sourcing strategy',
            'description': 'Reduce dependency on single supplier for critical materials',
            'effort': 'high',
            'timeframe': '1-3 months'
        })
        
         # Calculate ROI scores and sort BEFORE returning
        effort_weights = {'low': 1.0, 'medium': 0.5, 'high': 0.25}
        for action in actions:
            # Supplier actions don't have specific savings estimates
            # Use a simple heuristic based on total variance
            monthly_orders = orders_affected * 4
            
            if action['type'] == 'supplier_review':
                savings = abs(avg_variance) * monthly_orders * 0.4
            elif action['type'] == 'dual_source':
                savings = abs(avg_variance) * monthly_orders * 0.6
            else:
                savings = 0
            
            action['estimated_monthly_savings'] = savings
            action['roi_score'] = (savings / 10000) * effort_weights[action['effort']]
        
        # Sort by ROI score descending
        actions.sort(key=lambda x: x.get('roi_score', 0), reverse=True)
        
        return actions
        
    
    def _generate_equipment_actions(
        self,
        equipment_id: str,
        total_impact: float,
        issue_count: int,
        scrap_total: int,
        data_gaps: List[Dict]
    ) -> List[Dict]:
        """Generate actions for equipment patterns"""
        
        actions = []
        
        if issue_count > 5:
            actions.append({
                'priority': 1,
                'type': 'immediate_inspection',
                'title': f'Immediate inspection of {equipment_id}',
                'description': f'{issue_count} quality issues detected - inspect for degradation',
                'effort': 'low',
                'timeframe': '24-48 hours'
            })
        
        actions.append({
            'priority': 2,
            'type': 'preventive_maintenance',
            'title': f'Schedule preventive maintenance for {equipment_id}',
            'description': 'Reduce quality issues through proactive maintenance',
            'effort': 'medium',
            'timeframe': '1-2 weeks'
        })
        # Calculate ROI scores and sort
        effort_weights = {'low': 1.0, 'medium': 0.5, 'high': 0.25}
        for action in actions:
            savings = action.get('estimated_monthly_savings', 0)
            effort = action.get('effort', 'medium') 
            action['roi_score'] = (savings / 10000) * effort_weights[effort]
        
        actions.sort(key=lambda x: x.get('roi_score', 0), reverse=True)
        
        return actions
    
    def _generate_quality_actions(
        self,
        material_code: str,
        total_impact: float,
        defect_rate: float,
        orders_affected: int,
        data_gaps: List[Dict]
    ) -> List[Dict]:
        """Generate actions for quality patterns"""
        
        actions = []
        
        if defect_rate > 20:
            actions.append({
                'priority': 1,
                'type': 'halt_production',
                'title': f'Halt production using {material_code}',
                'description': f'{defect_rate:.0f}% defect rate requires immediate investigation',
                'effort': 'low',
                'timeframe': 'immediate'
            })
        
        actions.append({
            'priority': 2,
            'type': 'supplier_audit',
            'title': f'Quality audit for {material_code} supplier',
            'description': 'Investigate root cause of defects',
            'effort': 'medium',
            'timeframe': '1-2 weeks'
        })
        
        # Calculate ROI scores and sort
        effort_weights = {'low': 1.0, 'medium': 0.5, 'high': 0.25}
        for action in actions:
            savings = action.get('estimated_monthly_savings', 0)
            effort = action.get('effort', 'medium')
            action['roi_score'] = (savings / 10000) * effort_weights[effort]
        
        actions.sort(key=lambda x: x.get('roi_score', 0), reverse=True)
        
        return actions
    
    def _generate_material_nudges(self, data_gaps: List[Dict]) -> List[Dict]:
        """Generate actionable nudges for material data improvement"""
        nudges = []
        
        for gap in data_gaps:
            if gap['field'] == 'supplier_id':
                nudges.append({
                    'field': gap['field'],
                    'message': 'Add supplier_id to track pricing by vendor',
                    'estimated_value': 'Enable 15-20% cost reduction on renewals',
                    'implementation': 'Add column to CSV: supplier_id (e.g., SUP-ABC, SUP-XYZ)'
                })
            elif gap['field'] == 'contract_expiration':
                nudges.append({
                    'field': gap['field'],
                    'message': 'Add contract expiration dates for pricing alerts',
                    'estimated_value': 'Prevent surprise price increases at renewal',
                    'implementation': 'Add column: contract_expiration (YYYY-MM-DD format)'
                })
            elif gap['field'] == 'lot_batch_number':
                nudges.append({
                    'field': gap['field'],
                    'message': 'Add lot/batch tracking for quality correlation',
                    'estimated_value': 'Identify bad batches before full production',
                    'implementation': 'Add column: lot_batch_number (from material label)'
                })
        
        return nudges
    
    def _generate_supplier_nudges(self, data_gaps: List[Dict]) -> List[Dict]:
        """Generate nudges for supplier data"""
        nudges = []
        
        for gap in data_gaps:
            if gap['field'] == 'contract_expiration':
                nudges.append({
                    'field': gap['field'],
                    'message': 'Track supplier contract dates to predict pricing changes',
                    'estimated_value': 'Proactive negotiation before rate increases',
                    'implementation': 'Add contract_expiration date for each supplier'
                })
        
        return nudges
    
    def _generate_equipment_nudges(self, data_gaps: List[Dict]) -> List[Dict]:
        """Generate nudges for equipment data"""
        nudges = []
        
        for gap in data_gaps:
            if gap['field'] == 'downtime_minutes':
                nudges.append({
                    'field': gap['field'],
                    'message': 'Track equipment downtime for predictive maintenance',
                    'estimated_value': '$50K-$200K in prevented failures annually',
                    'implementation': 'Add downtime_minutes column (0 if no downtime)'
                })
            elif gap['field'] == 'last_maintenance_date':
                nudges.append({
                    'field': gap['field'],
                    'message': 'Track maintenance schedule to correlate with issues',
                    'estimated_value': 'Optimize maintenance timing, reduce breakdowns',
                    'implementation': 'Add last_maintenance_date (YYYY-MM-DD)'
                })
        
        return nudges
    
    def _generate_quality_nudges(self, data_gaps: List[Dict]) -> List[Dict]:
        """Generate nudges for quality data"""
        nudges = []
        
        for gap in data_gaps:
            if gap['field'] == 'defect_code':
                nudges.append({
                    'field': gap['field'],
                    'message': 'Categorize defect types for targeted fixes',
                    'estimated_value': 'Reduce defects by 30-50% with root cause analysis',
                    'implementation': 'Add defect_code column (SCRATCH, DENT, MISALIGN, etc.)'
                })
        
        return nudges
    
    def _calculate_action_roi(
        self,
        action_type: str,
        avg_variance: float,
        orders_affected: int,
        all_orders_df: pd.DataFrame
    ) -> float:
        """Calculate estimated monthly savings for action"""
        
        # Estimate monthly order volume for this material
        # Conservative: Use current batch as monthly sample
        monthly_orders = orders_affected * 4  # Assume 4 weeks data
        
        if action_type == 'negotiate':
            # Assume 50% reduction in variance
            return abs(avg_variance) * monthly_orders * 0.5
        elif action_type == 'alternate_supplier':
            # Assume 70% reduction
            return abs(avg_variance) * monthly_orders * 0.7
        elif action_type == 'lock_pricing':
            # Assume prevents 30% additional increase
            return abs(avg_variance) * monthly_orders * 0.3
        else:
            return 0