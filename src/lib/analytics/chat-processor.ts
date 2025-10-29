// src/lib/analytics/chat-processor.ts
/**
 * Simplified chat query processor
 * Replaces manufacturingIntelligence.ts with cleaner logic
 */

import { InsightCard } from "./insight-types";
import {
  buildInsightCards,
  buildSummaryText,
  buildFollowUps,
} from "./insight-builder";

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

interface MLChatResponse {
  type?: string;
  message?: string;
  insights?: unknown[];
  predictions?: unknown[];
  patterns?: unknown[];
  total_impact?: number;
  total_downtime_cost?: number;
  total_scrap_cost?: number;
  total_savings_opportunity?: number;
  overall_efficiency?: number;
  overall_scrap_rate?: number;
  error?: string;
  status?: string;
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

  return await response.json();
}

/**
 * Detect category from query
 */
function detectCategory(
  query: string
): "cost" | "equipment" | "quality" | "efficiency" | null {
  const queryLower = query.toLowerCase();

  if (
    queryLower.includes("cost") ||
    queryLower.includes("variance") ||
    queryLower.includes("budget")
  ) {
    return "cost";
  }
  if (
    queryLower.includes("equipment") ||
    queryLower.includes("machine") ||
    queryLower.includes("maintenance")
  ) {
    return "equipment";
  }
  if (
    queryLower.includes("quality") ||
    queryLower.includes("scrap") ||
    queryLower.includes("defect")
  ) {
    return "quality";
  }
  if (
    queryLower.includes("efficiency") ||
    queryLower.includes("productivity") ||
    queryLower.includes("optimization")
  ) {
    return "efficiency";
  }

  return null;
}

/**
 * Extract insights from ML response
 */
function extractInsights(mlResponse: MLChatResponse): unknown[] {
  if (mlResponse.predictions && mlResponse.predictions.length > 0) {
    return mlResponse.predictions;
  }
  if (mlResponse.insights && mlResponse.insights.length > 0) {
    return mlResponse.insights;
  }
  return [];
}

/**
 * Calculate total impact from ML response
 */
function calculateTotalImpact(mlResponse: MLChatResponse): number {
  return (
    mlResponse.total_impact ||
    mlResponse.total_downtime_cost ||
    mlResponse.total_scrap_cost ||
    mlResponse.total_savings_opportunity ||
    0
  );
}

/**
 * Main processor - handles all chat queries
 */
export async function processManufacturingQuery(
  query: string,
  userEmail?: string,
  useAI?: boolean // For backward compatibility (currently unused)
): Promise<ManufacturingInsight> {
  const email = userEmail || "skinner.chris@gmail.com";

  try {
    const mlResponse = await callMLChatService(query, email);

    // Detect category
    const category = detectCategory(query);

    // Extract insights
    const insights = extractInsights(mlResponse);

    // If we have insights and a category, build cards
    if (insights.length > 0 && category) {
      const totalImpact = calculateTotalImpact(mlResponse);
      const cards = buildInsightCards(insights, category, totalImpact);
      const summaryText = buildSummaryText(insights, category, totalImpact);
      const followUps = buildFollowUps(category);

      return {
        response: summaryText,
        cards,
        followUps,
        costImpact: totalImpact,
      };
    }

    // Fallback to text response
    return {
      response: mlResponse.message || "Analysis complete",
      costImpact: calculateTotalImpact(mlResponse),
    };
  } catch (error) {
    console.error("ML service error:", error);

    return {
      response:
        "I can analyze your manufacturing data for cost variance, equipment risks, quality issues, and operational efficiency. Try asking about equipment or cost analysis.",
    };
  }
}
