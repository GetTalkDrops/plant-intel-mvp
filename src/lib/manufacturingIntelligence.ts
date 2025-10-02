import { enhanceMLResponse } from "./aiService";
import { formatCostAnalysisResponse } from "./format-ml-response";
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
  type: string;
  message?: string;
  insights: {
    equipment?: string[];
    cost_variance?: number;
    quality_issues?: string[];
  };
  total_impact?: number;
  predictions?: Array<{
    work_order_number: string;
    predicted_variance: number;
    confidence: number;
    risk_level: string;
  }>;
  error?: string;
}

async function callMLChatService(
  query: string,
  userEmail: string,
  facilityId: number = 1
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

  return {
    type: data.type || "chat_response",
    message: data.response || data.message,
    insights: data.insights || {},
    total_impact: data.totalImpact || data.total_impact || 0,
    predictions: data.predictions,
    error: data.error,
  };
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
  const isShortMLResponse = mlResponse.length < 100;
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

  try {
    const mlResponse = await callMLChatService(query, email, 1);

    const isCostQuery =
      query.toLowerCase().includes("cost") ||
      query.toLowerCase().includes("variance") ||
      query.toLowerCase().includes("budget");

    if (
      isCostQuery &&
      mlResponse.predictions &&
      mlResponse.predictions.length > 0
    ) {
      console.log("Cost query detected, predictions:", mlResponse.predictions);

      const formatted = formatCostAnalysisResponse({
        predictions: mlResponse.predictions as Array<{
          work_order_number: string;
          predicted_variance: number;
          confidence: number;
          risk_level: "high" | "medium" | "low";
        }>,
        total_impact: mlResponse.total_impact,
        error: mlResponse.error,
        message: mlResponse.message,
      });

      console.log("Formatted response:", formatted);

      return {
        response: formatted.text,
        cards: formatted.cards,
        followUps: formatted.followUps,
        costImpact: mlResponse.total_impact || 0,
      };
    }

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
