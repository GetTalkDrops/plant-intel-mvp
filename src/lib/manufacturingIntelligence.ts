import { enhanceMLResponse } from "./aiService";
import {
  formatCostAnalysisResponse,
  formatEquipmentResponse,
  formatQualityResponse,
  formatEfficiencyResponse,
} from "./format-ml-response";
import { InsightCard } from "./insight-types";

export type ChatMessage = {
  id: string;
  message: string;
  isUser: boolean;
  timestamp: string;
  costImpact?: number;
};

export type ManufacturingInsight = {
  response: string;
  cards?: InsightCard[];
  followUps?: string[];
  costImpact?: number;
  alertsCreated?: number;
};

export type AIUsageStats = {
  totalCost: number;
  queriesWithAI: number;
  monthlyBudget: number;
};

interface MLChatResponse {
  type?: string;
  message?: string;
  insights?: unknown[];
  predictions?: unknown[];
  total_impact?: number;
  total_downtime_cost?: number;
  total_scrap_cost?: number;
  total_savings_opportunity?: number;
  overall_efficiency?: number;
  overall_scrap_rate?: number;
  error?: string;
  validation?: unknown;
  thresholds?: unknown;
  status?: string;
  required_fields?: string[];
}

function isCostResponse(
  response: MLChatResponse
): response is MLChatResponse & {
  predictions: Array<{
    work_order_number: string;
    predicted_variance: number;
    confidence: number;
    risk_level: string;
    analysis?: unknown;
  }>;
} {
  return (
    Array.isArray(response.predictions) &&
    response.predictions.length > 0 &&
    typeof response.predictions[0] === "object" &&
    response.predictions[0] !== null &&
    "work_order_number" in response.predictions[0]
  );
}

function isEquipmentResponse(
  response: MLChatResponse
): response is MLChatResponse & { insights: unknown[] } {
  return (
    response.type === "equipment_analysis" && Array.isArray(response.insights)
  );
}

function isQualityResponse(
  response: MLChatResponse
): response is MLChatResponse & { insights: unknown[] } {
  return (
    response.type === "quality_analysis" && Array.isArray(response.insights)
  );
}

function isEfficiencyResponse(
  response: MLChatResponse
): response is MLChatResponse & {
  insights: Array<{
    operation_type: string;
    efficiency_score: number;
    labor_efficiency: number;
    cost_efficiency: number;
    orders_analyzed: number;
    potential_savings: number;
    analysis: unknown;
  }>;
} {
  return (
    response.type === "efficiency_analysis" &&
    Array.isArray(response.insights) &&
    response.insights.length > 0 &&
    typeof response.insights[0] === "object" &&
    response.insights[0] !== null &&
    "operation_type" in response.insights[0]
  );
}

async function callMLChatService(
  query: string,
  userEmail: string
): Promise<MLChatResponse> {
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message: query,
      userEmail: userEmail,
    }),
  });

  if (!response.ok) {
    throw new Error(`Chat API error: ${response.status}`);
  }

  const data = await response.json();

  return data;
}

function shouldUseAI(query: string, mlResponse: string): boolean {
  const queryLower = query.toLowerCase();
  const complexQuestions = [
    "why",
    "how",
    "what should",
    "recommend",
    "explain",
    "help me understand",
  ];
  const hasComplexQuestion = complexQuestions.some((phrase) =>
    queryLower.includes(phrase)
  );
  const isShortMLResponse =
    mlResponse.length < 50 &&
    !mlResponse.includes("performing well") &&
    !mlResponse.includes("looks solid");
  const hasErrorInML =
    mlResponse.includes("I need") || mlResponse.includes("missing");

  return hasComplexQuestion || isShortMLResponse || hasErrorInML;
}

export async function processManufacturingQuery(
  query: string,
  userEmail?: string,
  useAI: boolean = true
): Promise<ManufacturingInsight> {
  const email = userEmail || "skinner.chris@gmail.com";
  const queryLower = query.toLowerCase();

  try {
    const mlResponse = await callMLChatService(query, email);

    // Detect query type
    const isCostQuery =
      queryLower.includes("cost") ||
      queryLower.includes("variance") ||
      queryLower.includes("budget");

    const isEquipmentQuery =
      queryLower.includes("equipment") ||
      queryLower.includes("machine") ||
      queryLower.includes("asset") ||
      queryLower.includes("maintenance");

    const isQualityQuery =
      queryLower.includes("quality") ||
      queryLower.includes("scrap") ||
      queryLower.includes("defect") ||
      queryLower.includes("rework");

    const isEfficiencyQuery =
      queryLower.includes("efficiency") ||
      queryLower.includes("productivity") ||
      queryLower.includes("optimization") ||
      queryLower.includes("performance");

    // Cost query
    if (isCostQuery && isCostResponse(mlResponse)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const formatted = formatCostAnalysisResponse(mlResponse as any);
      return {
        response: formatted.text,
        cards: formatted.cards,
        followUps: formatted.followUps,
        costImpact: mlResponse.total_impact || 0,
      };
    }

    // Equipment query
    if (isEquipmentQuery && isEquipmentResponse(mlResponse)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const formatted = formatEquipmentResponse(mlResponse as any);
      return {
        response: formatted.text,
        cards: formatted.cards,
        followUps: formatted.followUps,
        costImpact: mlResponse.total_impact || 0,
      };
    }

    // Quality query
    if (isQualityQuery && isQualityResponse(mlResponse)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const formatted = formatQualityResponse(mlResponse as any);
      return {
        response: formatted.text,
        cards: formatted.cards,
        followUps: formatted.followUps,
        costImpact: mlResponse.total_scrap_cost || mlResponse.total_impact || 0,
      };
    }

    // Efficiency query
    if (isEfficiencyQuery && isEfficiencyResponse(mlResponse)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const formatted = formatEfficiencyResponse(mlResponse as any);
      return {
        response: formatted.text,
        cards: formatted.cards,
        followUps: formatted.followUps,
        costImpact:
          mlResponse.total_savings_opportunity || mlResponse.total_impact || 0,
      };
    }

    // Fallback to text response with optional AI enhancement
    let finalResponse = mlResponse.message || "Analysis complete";

    if (useAI && shouldUseAI(query, finalResponse)) {
      try {
        const aiResult = await enhanceMLResponse(
          finalResponse,
          query,
          mlResponse.total_impact || 0
        );

        if (aiResult.usedAI) {
          finalResponse = aiResult.enhancedMessage;
          console.log(
            `AI Enhancement Cost: $${aiResult.estimatedCost.toFixed(4)}`
          );
        }
      } catch (aiError) {
        console.warn("AI enhancement failed, using ML response:", aiError);
      }
    }

    return {
      response: finalResponse,
      costImpact: mlResponse.total_impact || 0,
    };
  } catch (error) {
    console.error("ML service error:", error);

    return {
      response:
        "I can analyze your manufacturing data for cost variance, equipment risks, quality issues, and operational efficiency. Try asking about equipment or cost analysis.",
    };
  }
}
