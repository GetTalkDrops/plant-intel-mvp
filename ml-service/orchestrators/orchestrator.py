# ml-service/orchestrator.py - CONFIG INTEGRATION

"""
Key changes:
1. Accept config in request
2. Pass config to all analyzers
3. Use config values instead of hardcoded defaults
"""

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict, Any
import logging

app = FastAPI()
logger = logging.getLogger(__name__)

class AnalyzeRequest(BaseModel):
    facility_id: int
    batch_id: str
    csv_headers: list[str]
    config: Dict[str, Any]  # NEW: Configuration from upload
    data_tier: str
    data_tier_info: Optional[Dict[str, Any]] = None

@app.post("/analyze/auto")
async def analyze_auto(request: AnalyzeRequest):
    try:
        logger.info(f"Starting analysis for facility {request.facility_id}, batch {request.batch_id}")
        logger.info(f"Configuration: {request.config}")
        
        # Extract config values
        config = request.config
        
        # Initialize results
        results = {
            "success": True,
            "facility_id": request.facility_id,
            "batch_id": request.batch_id,
            "data_tier": request.data_tier,
            "analyzers_run": [],
            "insights": {
                "urgent": [],
                "notable": [],
                "summary": {}
            }
        }
        
        # Run Cost Analyzer (always)
        from analyzers import cost_analyzer
        cost_results = cost_analyzer.analyze(
            facility_id=request.facility_id,
            config={
                'labor_rate_hourly': config.get('labor_rate_hourly', 55),
                'scrap_cost_per_unit': config.get('scrap_cost_per_unit', 75),
                'variance_threshold_pct': config.get('variance_threshold_pct', 15),
                'min_variance_amount': config.get('min_variance_amount', 1000),
                'pattern_min_orders': config.get('pattern_min_orders', 3),
                'excluded_suppliers': config.get('excluded_suppliers', []),
                'excluded_materials': config.get('excluded_materials', []),
            }
        )
        results["analyzers_run"].append("cost_analyzer")
        if cost_results:
            results["insights"]["urgent"].extend(cost_results.get("urgent", []))
            results["insights"]["notable"].extend(cost_results.get("notable", []))
        
        # Run Equipment Analyzer (Tier 2+)
        if request.data_tier in ["Tier 2", "Tier 3"]:
            from analyzers import equipment_predictor
            equipment_results = equipment_predictor.analyze(
                facility_id=request.facility_id,
                config={
                    'labor_rate_hourly': config.get('labor_rate_hourly', 55),
                    'scrap_cost_per_unit': config.get('scrap_cost_per_unit', 75),
                    'pattern_min_orders': config.get('pattern_min_orders', 3),
                    'excluded_machines': config.get('excluded_machines', []),
                    'equipment_risk_thresholds': config.get('equipment_risk_thresholds', {
                        'labor_variance': 5,
                        'quality_rate': 0.3,
                        'scrap_ratio': 3,
                    }),
                    'equipment_labor_interpretations': config.get('equipment_labor_interpretations', {
                        'severe': 10,
                        'moderate': 5,
                        'minor': 2,
                    }),
                }
            )
            results["analyzers_run"].append("equipment_predictor")
            if equipment_results:
                results["insights"]["urgent"].extend(equipment_results.get("urgent", []))
                results["insights"]["notable"].extend(equipment_results.get("notable", []))
        
        # Run Quality Analyzer (Tier 2+)
        if request.data_tier in ["Tier 2", "Tier 3"]:
            from analyzers import quality_analyzer
            quality_results = quality_analyzer.analyze(
                facility_id=request.facility_id,
                config={
                    'labor_rate_hourly': config.get('labor_rate_hourly', 55),
                    'scrap_cost_per_unit': config.get('scrap_cost_per_unit', 75),
                    'pattern_min_orders': config.get('pattern_min_orders', 3),
                    'quality_min_issue_rate_pct': config.get('quality_min_issue_rate_pct', 10),
                    'quality_scrap_interpretations': config.get('quality_scrap_interpretations', {
                        'critical': 20,
                        'high': 10,
                        'moderate': 5,
                    }),
                }
            )
            results["analyzers_run"].append("quality_analyzer")
            if quality_results:
                results["insights"]["urgent"].extend(quality_results.get("urgent", []))
                results["insights"]["notable"].extend(quality_results.get("notable", []))
        
        # Run Efficiency Analyzer (Tier 3)
        if request.data_tier == "Tier 3":
            from analyzers import efficiency_analyzer
            efficiency_results = efficiency_analyzer.analyze(
                facility_id=request.facility_id,
                config={
                    'labor_rate_hourly': config.get('labor_rate_hourly', 55),
                    'scrap_cost_per_unit': config.get('scrap_cost_per_unit', 75),
                }
            )
            results["analyzers_run"].append("efficiency_analyzer")
            if efficiency_results:
                results["insights"]["notable"].extend(efficiency_results.get("notable", []))
        
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
        
        logger.info(f"Analysis complete. Total impact: ${total_impact:,.0f}")
        
        return results
        
    except Exception as e:
        logger.error(f"Analysis failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))