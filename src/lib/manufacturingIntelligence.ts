export type ChatMessage = {
  id: string;
  message: string;
  isUser: boolean;
  timestamp: string;
  costImpact?: number;
};

export type ManufacturingInsight = {
  response: string;
  costImpact?: number;
  alertsCreated?: number;
};

interface MLPrediction {
  work_order_number: string;
  predicted_overrun: number;
  confidence: number;
  factors: string[];
}

interface MLResponse {
  predictions: MLPrediction[];
  total_impact: number;
}

interface EquipmentPrediction {
  equipment_id: string;
  failure_probability: number;
  estimated_downtime_cost: number;
  risk_factors: string[];
  orders_analyzed: number;
}

interface EquipmentResponse {
  predictions: EquipmentPrediction[];
  total_downtime_cost: number;
}

interface QualityIssue {
  material_code: string;
  risk_score: number;
  scrap_rate_per_order: number;
  quality_issue_rate: number;
  total_scrap_units: number;
  estimated_cost_impact: number;
  risk_factors: string[];
  orders_analyzed: number;
}

interface QualityResponse {
  quality_issues: QualityIssue[];
  total_scrap_cost: number;
  overall_scrap_rate: number;
}

interface EfficiencyInsight {
  operation_type: string;
  efficiency_score: number;
  labor_efficiency: number;
  cost_efficiency: number;
  improvement_factors: string[];
  orders_analyzed: number;
  potential_savings: number;
  avg_labor_variance_hours: number;
  avg_cost_variance: number;
}

interface EfficiencyResponse {
  efficiency_insights: EfficiencyInsight[];
  overall_efficiency: number;
  total_savings_opportunity: number;
}

// Call Python ML service
async function callMLService(
  endpoint: string,
  params: Record<string, string | number>
): Promise<unknown> {
  const url = new URL(`http://localhost:8000${endpoint}`);
  Object.keys(params).forEach((key) =>
    url.searchParams.append(key, String(params[key]))
  );

  const response = await fetch(url.toString());
  return response.json();
}

// Format ML predictions into readable response
function formatPredictions(mlData: MLResponse): ManufacturingInsight {
  if (!mlData.predictions || mlData.predictions.length === 0) {
    return { response: "No cost variance predictions available at this time." };
  }

  let response = `**Predictive Cost Analysis**\n\n`;
  response += `**HIGH RISK ORDERS** (${mlData.predictions.length} identified):\n\n`;

  mlData.predictions.forEach((prediction: MLPrediction) => {
    response += `• **${
      prediction.work_order_number
    }**: $${prediction.predicted_overrun.toLocaleString()} predicted overrun (${
      prediction.confidence
    }% confidence)\n`;
    response += `  Factors: ${prediction.factors.join(", ")}\n\n`;
  });

  response += `**TOTAL PREDICTED IMPACT**: $${mlData.total_impact.toLocaleString()}\n\n`;
  response += `**RECOMMENDATION**: Review material sourcing and labor allocation for flagged orders.`;

  return {
    response,
    costImpact: mlData.total_impact,
  };
}

// Format equipment predictions
function formatEquipmentPredictions(
  mlData: EquipmentResponse
): ManufacturingInsight {
  if (!mlData.predictions || mlData.predictions.length === 0) {
    return { response: "No equipment failure risks detected at this time." };
  }

  let response = `**Equipment Failure Analysis**\n\n`;
  response += `**HIGH RISK EQUIPMENT** (${mlData.predictions.length} identified):\n\n`;

  mlData.predictions.forEach((prediction: EquipmentPrediction) => {
    response += `• **${prediction.equipment_id}**: ${prediction.failure_probability}% failure probability\n`;
    response += `  Potential downtime cost: $${prediction.estimated_downtime_cost.toLocaleString()}\n`;
    response += `  Risk factors: ${prediction.risk_factors.join(", ")}\n`;
    response += `  Analysis based on ${prediction.orders_analyzed} recent orders\n\n`;
  });

  response += `**TOTAL POTENTIAL COST**: $${mlData.total_downtime_cost.toLocaleString()}\n\n`;
  response += `**RECOMMENDATION**: Schedule preventive maintenance for high-risk equipment during planned downtime.`;

  return {
    response,
    costImpact: mlData.total_downtime_cost,
  };
}

// Format quality analysis
function formatQualityAnalysis(mlData: QualityResponse): ManufacturingInsight {
  if (!mlData.quality_issues || mlData.quality_issues.length === 0) {
    return {
      response: "No significant quality issues detected in current operations.",
    };
  }

  let response = `**Quality Pattern Analysis**\n\n`;
  response += `**Overall scrap rate: ${(
    mlData.overall_scrap_rate * 100
  ).toFixed(2)}%**\n\n`;
  response += `**PROBLEMATIC MATERIALS** (${mlData.quality_issues.length} identified):\n\n`;

  mlData.quality_issues.forEach((issue: QualityIssue) => {
    response += `• **${issue.material_code}**: ${issue.risk_score}% quality risk\n`;
    response += `  Scrap rate: ${issue.scrap_rate_per_order} units per order\n`;
    response += `  Quality issues: ${issue.quality_issue_rate}% of orders\n`;
    response += `  Cost impact: $${issue.estimated_cost_impact.toLocaleString()}\n`;
    response += `  Risk factors: ${issue.risk_factors.join(", ")}\n`;
    response += `  Analysis: ${issue.orders_analyzed} orders\n\n`;
  });

  response += `**TOTAL QUALITY COST**: $${mlData.total_scrap_cost.toLocaleString()}\n\n`;
  response += `**RECOMMENDATION**: Review supplier quality for flagged materials and implement additional quality controls.`;

  return {
    response,
    costImpact: mlData.total_scrap_cost,
  };
}

// Format efficiency analysis
function formatEfficiencyAnalysis(
  mlData: EfficiencyResponse
): ManufacturingInsight {
  if (!mlData.efficiency_insights || mlData.efficiency_insights.length === 0) {
    return {
      response:
        "Operations are running efficiently with no major improvement opportunities identified.",
    };
  }

  let response = `**Operational Efficiency Analysis**\n\n`;
  response += `**Overall facility efficiency: ${mlData.overall_efficiency}%**\n\n`;
  response += `**IMPROVEMENT OPPORTUNITIES** (${mlData.efficiency_insights.length} identified):\n\n`;

  mlData.efficiency_insights.forEach((insight: EfficiencyInsight) => {
    response += `• **${insight.operation_type} Operations**: ${insight.efficiency_score}% efficiency score\n`;
    response += `  Labor efficiency: ${insight.labor_efficiency}%\n`;
    response += `  Cost efficiency: ${insight.cost_efficiency}%\n`;
    response += `  Potential savings: $${insight.potential_savings.toLocaleString()}\n`;
    response += `  Improvement areas: ${insight.improvement_factors.join(
      ", "
    )}\n`;
    response += `  Analysis: ${insight.orders_analyzed} orders, avg variance: ${insight.avg_labor_variance_hours}hr labor, $${insight.avg_cost_variance} cost\n\n`;
  });

  response += `**TOTAL SAVINGS OPPORTUNITY**: $${mlData.total_savings_opportunity.toLocaleString()}\n\n`;
  response += `**RECOMMENDATION**: Focus on labor productivity optimization and cost planning accuracy for identified operation types.`;

  return {
    response,
    costImpact: mlData.total_savings_opportunity,
  };
}

// Main query processor
export async function processManufacturingQuery(
  query: string,
  facilityId?: number
): Promise<ManufacturingInsight> {
  const targetFacility = facilityId || 1;
  const normalizedQuery = query.toLowerCase();

  // Most specific matches first
  if (normalizedQuery.includes("efficiency")) {
    const mlData = await callMLService("/analyze/efficiency-patterns", {
      facility_id: targetFacility,
    });
    return formatEfficiencyAnalysis(mlData as EfficiencyResponse);
  }

  if (normalizedQuery.includes("productivity")) {
    const mlData = await callMLService("/analyze/efficiency-patterns", {
      facility_id: targetFacility,
    });
    return formatEfficiencyAnalysis(mlData as EfficiencyResponse);
  }

  if (normalizedQuery.includes("quality")) {
    const mlData = await callMLService("/analyze/quality-patterns", {
      facility_id: targetFacility,
    });
    return formatQualityAnalysis(mlData as QualityResponse);
  }

  if (
    normalizedQuery.includes("equipment") ||
    normalizedQuery.includes("maintenance")
  ) {
    const mlData = await callMLService("/analyze/equipment-failure", {
      facility_id: targetFacility,
    });
    return formatEquipmentPredictions(mlData as EquipmentResponse);
  }

  // Cost analysis (broader matches at end)
  if (
    normalizedQuery.includes("predict") ||
    normalizedQuery.includes("cost") ||
    normalizedQuery.includes("risk")
  ) {
    const mlData = await callMLService("/analyze/cost-variance", {
      facility_id: targetFacility,
    });
    return formatPredictions(mlData as MLResponse);
  }

  // Default response
  return {
    response: `I can analyze your manufacturing data for:\n\n• **Predictive cost analysis** - identify orders at risk of budget overruns\n• **Equipment failure prediction** - prevent costly downtime with maintenance insights\n• **Quality pattern analysis** - detect materials and processes causing defects\n• **Operational efficiency analysis** - optimize labor productivity and resource utilization\n\nWhat would you like to explore?`,
  };
}
