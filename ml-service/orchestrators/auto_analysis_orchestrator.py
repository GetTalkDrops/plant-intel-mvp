"""
Auto Analysis Orchestrator - Orchestrates automated analysis pipeline
"""

from typing import Dict, Optional, Any
import logging
from utils.data_tier_detector import DataTierDetector
from analyzers.cost_analyzer import CostAnalyzer

logger = logging.getLogger(__name__)


class AutoAnalysisOrchestrator:
    """Orchestrates automated analysis for uploaded CSV data"""

    def __init__(self):
        self.tier_detector = DataTierDetector()
        self.cost_analyzer = CostAnalyzer()

    def analyze(
        self,
        facility_id: int,
        batch_id: str,
        csv_headers: list,
        config: Optional[Dict[str, Any]] = None
    ) -> Dict:
        """
        Run automated analysis on uploaded data

        Args:
            facility_id: Facility ID
            batch_id: Batch identifier for the uploaded data
            csv_headers: List of CSV column headers
            config: Optional configuration dict

        Returns:
            Dictionary with analysis results
        """
        try:
            logger.info(f"Starting auto-analysis for facility {facility_id}, batch {batch_id}")

            # Detect data tier from headers
            tier_result = self.tier_detector.detect_tier(csv_headers)
            data_tier = f"Tier {tier_result.tier}"
            tier_info = {
                'tier': data_tier,
                'tier_name': tier_result.tier_name,
                'capabilities': tier_result.capabilities,
                'available_analyzers': tier_result.available_analyzers
            }

            # Initialize results
            results = {
                "success": True,
                "facility_id": facility_id,
                "batch_id": batch_id,
                "data_tier": data_tier,
                "tier_info": tier_info,
                "analyzers_run": [],
                "insights": {
                    "urgent": [],
                    "notable": [],
                    "summary": {}
                }
            }

            # Use provided config or defaults
            if config is None:
                config = {}

            # Run Cost Analyzer (always runs for all tiers)
            try:
                cost_config = {
                    'labor_rate_hourly': config.get('labor_rate_hourly', 200),
                    'scrap_cost_per_unit': config.get('scrap_cost_per_unit', 75),
                    'variance_threshold_pct': config.get('variance_threshold_pct', 15),
                    'min_variance_amount': config.get('min_variance_amount', 1000),
                    'pattern_min_orders': config.get('pattern_min_orders', 3),
                }

                cost_results = self.cost_analyzer.predict_cost_variance(
                    facility_id=facility_id,
                    batch_id=batch_id,
                    config=cost_config
                )

                results["analyzers_run"].append("cost_analyzer")

                if cost_results and cost_results.get('predictions'):
                    # Convert predictions to insights format
                    for pred in cost_results['predictions']:
                        insight = {
                            'type': 'cost_variance',
                            'severity': 'urgent' if pred.get('predicted_variance', 0) > 5000 else 'notable',
                            'work_order': pred.get('work_order_number'),
                            'description': f"Cost variance predicted for {pred.get('work_order_number')}",
                            'financial_impact': pred.get('predicted_variance', 0)
                        }
                        if insight['severity'] == 'urgent':
                            results["insights"]["urgent"].append(insight)
                        else:
                            results["insights"]["notable"].append(insight)

            except Exception as e:
                logger.warning(f"Cost analyzer failed: {str(e)}")

            # Run Equipment Predictor (Tier 2+)
            if data_tier in ["Tier 2", "Tier 3", "Tier 4"]:
                try:
                    from analyzers.equipment_predictor import EquipmentPredictor
                    equipment_predictor = EquipmentPredictor()

                    equipment_config = {
                        'labor_rate_hourly': config.get('labor_rate_hourly', 200),
                        'pattern_min_orders': config.get('pattern_min_orders', 3),
                    }

                    equipment_results = equipment_predictor.predict_failures(
                        facility_id=facility_id,
                        batch_id=batch_id,
                        config=equipment_config
                    )

                    results["analyzers_run"].append("equipment_predictor")

                    if equipment_results and equipment_results.get('predictions'):
                        # Convert predictions to insights format
                        for pred in equipment_results['predictions']:
                            insight = {
                                'type': 'equipment_failure',
                                'severity': 'urgent' if pred.get('failure_probability', 0) > 70 else 'notable',
                                'equipment': pred.get('equipment_id'),
                                'description': f"Equipment failure risk: {pred.get('equipment_id')}",
                                'financial_impact': pred.get('estimated_downtime_cost', 0)
                            }
                            if insight['severity'] == 'urgent':
                                results["insights"]["urgent"].append(insight)
                            else:
                                results["insights"]["notable"].append(insight)

                except Exception as e:
                    logger.warning(f"Equipment predictor failed: {str(e)}")

            # Run Quality Analyzer (Tier 2+)
            if data_tier in ["Tier 2", "Tier 3", "Tier 4"]:
                try:
                    from analyzers.quality_analyzer import QualityAnalyzer
                    quality_analyzer = QualityAnalyzer()

                    quality_config = {
                        'scrap_cost_per_unit': config.get('scrap_cost_per_unit', 75),
                        'pattern_min_orders': config.get('pattern_min_orders', 3),
                    }

                    quality_results = quality_analyzer.analyze_quality_patterns(
                        facility_id=facility_id,
                        batch_id=batch_id,
                        config=quality_config
                    )

                    results["analyzers_run"].append("quality_analyzer")

                    if quality_results and quality_results.get('quality_issues'):
                        # Convert quality issues to insights format
                        for issue in quality_results['quality_issues']:
                            insight = {
                                'type': 'quality_issue',
                                'severity': 'urgent' if issue.get('risk_score', 0) > 70 else 'notable',
                                'material': issue.get('material_code'),
                                'description': f"Quality issue detected: {issue.get('material_code')}",
                                'financial_impact': issue.get('estimated_cost_impact', 0)
                            }
                            if insight['severity'] == 'urgent':
                                results["insights"]["urgent"].append(insight)
                            else:
                                results["insights"]["notable"].append(insight)

                except Exception as e:
                    logger.warning(f"Quality analyzer failed: {str(e)}")

            # Run Efficiency Analyzer (Tier 4)
            if data_tier == "Tier 4":
                try:
                    from analyzers.efficiency_analyzer import EfficiencyAnalyzer
                    efficiency_analyzer = EfficiencyAnalyzer()

                    efficiency_config = {
                        'labor_rate_hourly': config.get('labor_rate_hourly', 200),
                    }

                    efficiency_results = efficiency_analyzer.analyze_efficiency_patterns(
                        facility_id=facility_id,
                        batch_id=batch_id,
                        config=efficiency_config
                    )

                    results["analyzers_run"].append("efficiency_analyzer")

                    if efficiency_results and efficiency_results.get('efficiency_issues'):
                        # Convert efficiency issues to insights format
                        for issue in efficiency_results['efficiency_issues']:
                            insight = {
                                'type': 'efficiency',
                                'severity': 'notable',
                                'description': issue.get('description', 'Efficiency issue detected'),
                                'financial_impact': issue.get('estimated_cost_impact', 0)
                            }
                            results["insights"]["notable"].append(insight)

                except Exception as e:
                    logger.warning(f"Efficiency analyzer failed: {str(e)}")

            # Calculate summary
            total_impact = sum(
                insight.get("financial_impact", 0)
                for insight in results["insights"]["urgent"] + results["insights"]["notable"]
            )

            results["insights"]["summary"] = {
                "total_financial_impact": total_impact,
                "urgent_count": len(results["insights"]["urgent"]),
                "notable_count": len(results["insights"]["notable"]),
            }

            logger.info(f"Auto-analysis complete. Total impact: ${total_impact:,.0f}")

            return results

        except Exception as e:
            logger.error(f"Auto-analysis failed: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "facility_id": facility_id,
                "batch_id": batch_id
            }
