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

// Main query processor
export async function processManufacturingQuery(
  query: string,
  facilityId?: number
): Promise<ManufacturingInsight> {
  const targetFacility = facilityId || 1;
  const normalizedQuery = query.toLowerCase();

  if (
    normalizedQuery.includes("predict") ||
    normalizedQuery.includes("forecast") ||
    normalizedQuery.includes("risk") ||
    normalizedQuery.includes("cost")
  ) {
    const mlData = await callMLService("/analyze/cost-variance", {
      facility_id: targetFacility,
    });
    return formatPredictions(mlData as MLResponse);
  }

  if (
    normalizedQuery.includes("equipment") ||
    normalizedQuery.includes("failure") ||
    normalizedQuery.includes("maintenance") ||
    normalizedQuery.includes("downtime")
  ) {
    const mlData = await callMLService("/analyze/equipment-failure", {
      facility_id: targetFacility,
    });
    return formatEquipmentPredictions(mlData as EquipmentResponse);
  }

  if (
    normalizedQuery.includes("quality") ||
    normalizedQuery.includes("qulaity") ||
    normalizedQuery.includes("defect") ||
    normalizedQuery.includes("scrap")
  ) {
    const mlData = await callMLService("/analyze/quality-patterns", {
      facility_id: targetFacility,
    });
    return formatQualityAnalysis(mlData as QualityResponse);
  }

  if (
    normalizedQuery.includes("production") ||
    normalizedQuery.includes("performance") ||
    normalizedQuery.includes("efficiency")
  ) {
    // For now, redirect production queries to cost analysis
    const mlData = await callMLService("/analyze/cost-variance", {
      facility_id: targetFacility,
    });
    return formatPredictions(mlData as MLResponse);
  }

  // Default response
  return {
    response: `I can analyze your manufacturing data for:\n\n• **Predictive cost analysis** - identify orders at risk of budget overruns\n• **Equipment failure prediction** - prevent costly downtime with maintenance insights\n• **Quality pattern analysis** - detect materials and processes causing defects\n\nWhat would you like to explore?`,
  };
}
