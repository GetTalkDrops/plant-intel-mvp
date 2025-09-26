import { enhanceMLResponse } from "./aiService";

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

export type AIUsageStats = {
  totalCost: number;
  queriesWithAI: number;
  monthlyBudget: number;
};

interface AutoSummaryResponse {
  type: string;
  message: string;
  alerts: Array<{
    id: string;
    type: string;
    message: string;
    impact: number;
  }>;
  total_impact: number;
  summary_stats: {
    cost_issues: number;
    equipment_issues: number;
    quality_issues: number;
    efficiency_opportunities: number;
  };
}

interface MLChatResponse {
  type: string;
  message: string;
  insights: {
    equipment?: string[];
    cost_variance?: number;
    quality_issues?: string[];
  };
  total_impact: number;
}

async function callAutoSummary(
  facilityId: number = 1
): Promise<AutoSummaryResponse> {
  const response = await fetch(
    `http://localhost:8000/analyze/auto-summary?facility_id=${facilityId}`
  );

  if (!response.ok) {
    throw new Error(`Auto-analysis error: ${response.status}`);
  }

  return response.json();
}

async function callMLChatService(
  query: string,
  facilityId: number = 1
): Promise<MLChatResponse> {
  const response = await fetch(
    `http://localhost:8000/chat/query?query=${encodeURIComponent(
      query
    )}&facility_id=${facilityId}`
  );

  if (!response.ok) {
    throw new Error(`ML service error: ${response.status}`);
  }

  return response.json();
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
  facilityId?: number,
  useAI: boolean = true
): Promise<ManufacturingInsight> {
  const targetFacility = facilityId || 1;
  const queryLower = query.toLowerCase().trim();

  try {
    let mlResponse: AutoSummaryResponse | MLChatResponse;
    let isAutoSummary = false;

    if (
      queryLower.includes("show me how") ||
      queryLower === "demo" ||
      queryLower === ""
    ) {
      mlResponse = await callAutoSummary(targetFacility);
      isAutoSummary = true;
    } else {
      mlResponse = await callMLChatService(query, targetFacility);
    }

    let finalResponse = mlResponse.message;

    if (useAI && shouldUseAI(query, mlResponse.message)) {
      try {
        const aiResult = await enhanceMLResponse(
          mlResponse.message,
          query,
          mlResponse.total_impact
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
      alertsCreated: isAutoSummary
        ? (mlResponse as AutoSummaryResponse).alerts.length
        : undefined,
    };
  } catch (error) {
    console.error("ML service error:", error);

    return {
      response:
        "I can analyze your manufacturing data for cost variance, equipment risks, quality issues, and operational efficiency. Try asking 'Show me how this works' to see a demo analysis.",
    };
  }
}
