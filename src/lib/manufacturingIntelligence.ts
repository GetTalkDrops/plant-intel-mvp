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

// Call Python ML service
async function callMLService(
  endpoint: string,
  params: Record<string, string | number>
): Promise<MLResponse> {
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
    normalizedQuery.includes("risk")
  ) {
    const mlData = await callMLService("/analyze/cost-variance", {
      facility_id: targetFacility,
    });
    return formatPredictions(mlData);
  }

  // Default response
  return {
    response: `I can analyze your manufacturing data for:\n\n• **Production performance** - efficiency, throughput, labor metrics\n• **Cost analysis** - budget variance, material costs, labor overruns\n• **Quality issues** - defect rates, scrap analysis, problem identification\n\nWhat would you like to explore?`,
  };
}
