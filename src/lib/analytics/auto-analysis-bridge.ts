// src/lib/analytics/auto-analysis-bridge.ts
/**
 * Simplified bridge - converts auto_analysis to InsightCards
 * Uses unified insight-builder for all categories
 */

import { InsightCard } from "./insight-types";
import {
  buildInsightCards,
  buildSummaryText,
  buildFollowUps,
} from "./insight-builder";

interface AutoAnalysisResult {
  data_tier: {
    tier: number;
    message: string;
    capabilities: string[];
  };
  urgent: unknown[];
  notable: unknown[];
  background: unknown[];
  summary: string;
  display_text: string;
  total_impact: number;
  analyses_run: string[];
  total_insights: number;
}

interface BridgeResult {
  cards: InsightCard[];
  summary: string;
  displayText: string;
  totalImpact: number;
  dataTierMessage: string;
}

/**
 * Main bridge function - converts auto_analysis to InsightCards
 */
export function convertAutoAnalysisToCards(
  autoAnalysis: AutoAnalysisResult
): BridgeResult {
  const cards: InsightCard[] = [];

  // Combine urgent and notable
  const allInsights = [
    ...autoAnalysis.urgent,
    ...autoAnalysis.notable,
  ] as Array<{ type?: string; source?: string }>;

  // Group by category
  const costInsights = allInsights.filter(
    (i) =>
      i.type === "cost_variance" ||
      i.type === "cost_pattern" ||
      i.source === "cost_analysis"
  );
  const equipmentInsights = allInsights.filter(
    (i) => i.type === "equipment_risk" || i.source === "equipment_analysis"
  );
  const qualityInsights = allInsights.filter(
    (i) => i.type === "quality_issue" || i.source === "quality_analysis"
  );
  const efficiencyInsights = allInsights.filter(
    (i) =>
      i.type === "efficiency_opportunity" || i.source === "efficiency_analysis"
  );

  // Build cards for each category
  if (costInsights.length > 0) {
    const costCards = buildInsightCards(costInsights, "cost");
    cards.push(...costCards);
  }

  if (equipmentInsights.length > 0) {
    const equipmentCards = buildInsightCards(equipmentInsights, "equipment");
    cards.push(...equipmentCards);
  }

  if (qualityInsights.length > 0) {
    const qualityCards = buildInsightCards(qualityInsights, "quality");
    cards.push(...qualityCards);
  }

  if (efficiencyInsights.length > 0) {
    const efficiencyCards = buildInsightCards(efficiencyInsights, "efficiency");
    cards.push(...efficiencyCards);
  }

  return {
    cards,
    summary: autoAnalysis.summary,
    displayText: autoAnalysis.display_text,
    totalImpact: autoAnalysis.total_impact,
    dataTierMessage: autoAnalysis.data_tier.message,
  };
}

/**
 * Check if auto_analysis has actionable insights
 */
export function hasActionableInsights(
  autoAnalysis: AutoAnalysisResult
): boolean {
  return autoAnalysis.urgent.length > 0 || autoAnalysis.notable.length > 0;
}

/**
 * Get priority level for notification
 */
export function getAnalysisPriority(
  autoAnalysis: AutoAnalysisResult
): "urgent" | "normal" | "info" {
  if (autoAnalysis.urgent.length > 0) return "urgent";
  if (autoAnalysis.notable.length > 0) return "normal";
  return "info";
}
