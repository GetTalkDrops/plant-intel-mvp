// src/lib/analytics/insight-builder.ts
/**
 * Unified insight builder - works for ALL phases and ALL categories
 * Handles progressive enhancement automatically (baseline, trends, narratives)
 */

import { InsightCard, InsightSection, InsightItem } from "./insight-types";

type Category = "cost" | "equipment" | "quality" | "efficiency";

interface BaseInsight {
  // Core fields (Phase 1)
  id?: string;
  amount?: number;
  confidence?: number;
  risk_level?: "critical" | "high" | "medium" | "low";

  // Cost fields
  work_order_number?: string;
  predicted_variance?: number;

  // Equipment fields
  equipment_id?: string;
  failure_probability?: number;
  estimated_downtime_cost?: number;

  // Quality fields
  material_code?: string;
  quality_issue_rate?: number;
  estimated_cost_impact?: number;
  scrap_rate_per_order?: number;

  // Efficiency fields
  operation_type?: string;
  efficiency_score?: number;
  potential_savings?: number;

  // Analysis breakdown
  analysis?: {
    variance_breakdown?: unknown;
    breakdown?: unknown;
    primary_driver?: string;
    primary_issue?: string;
    [key: string]: unknown;
  };

  // Phase 2: Baseline comparison
  baseline_comparison?: {
    current: number;
    baseline: number;
    deviation_multiplier: number;
    deviation_text: string;
  };

  // Phase 3: Trend analysis
  trend_analysis?: {
    started_date: string;
    days_ago: number;
    trend_direction: "improving" | "worsening" | "stable";
    trend_text: string;
  };

  // Phase 4: Rich narrative
  narrative?: string;
}

/**
 * Build InsightCards from any insight array
 */
export function buildInsightCards(
  insights: unknown[],
  category: Category,
  totalImpact?: number
): InsightCard[] {
  if (!insights || insights.length === 0) {
    return [];
  }

  // Cast to BaseInsight array for internal use
  const typedInsights = insights as BaseInsight[];

  // Group by severity
  const critical = typedInsights.filter(
    (i) => getSeverity(i, category) === "critical"
  );
  const warning = typedInsights.filter(
    (i) => getSeverity(i, category) === "warning"
  );

  const sections: InsightSection[] = [];

  if (critical.length > 0) {
    sections.push(buildSection(critical, category, "critical"));
  }

  if (warning.length > 0) {
    sections.push(buildSection(warning, category, "warning"));
  }

  if (sections.length === 0) {
    return [];
  }

  const card: InsightCard = {
    type: critical.length > 0 ? "critical" : "warning",
    category,
    title: buildTitle(category, critical.length > 0),
    impact: totalImpact || calculateTotalImpact(typedInsights, category),
    sections,
  };

  return [card];
}

/**
 * Determine severity based on insight data
 */
function getSeverity(
  insight: BaseInsight,
  category: Category
): "critical" | "warning" {
  switch (category) {
    case "cost":
      if (insight.risk_level === "critical") return "critical";
      if (insight.risk_level === "high") return "critical";
      return "warning";

    case "equipment":
      if ((insight.failure_probability || 0) >= 80) return "critical";
      return "warning";

    case "quality":
      if ((insight.estimated_cost_impact || 0) > 50000) return "critical";
      return "warning";

    case "efficiency":
      return "warning"; // Opportunities are warnings, not critical
  }
}

/**
 * Build a section with items
 */
function buildSection(
  insights: BaseInsight[],
  category: Category,
  severity: "critical" | "warning"
): InsightSection {
  return {
    severity,
    label: buildSectionLabel(category, severity, insights.length),
    count: insights.length,
    items: insights.map((i) => buildItem(i, category)),
    actions: buildActions(insights, category, severity),
  };
}

/**
 * Build an insight item
 */
function buildItem(insight: BaseInsight, category: Category): InsightItem {
  const item: InsightItem = {
    id: extractId(insight, category),
    amount: extractAmount(insight, category),
    confidence: extractConfidence(insight, category),
    breakdown:
      insight.analysis?.variance_breakdown ||
      insight.analysis?.breakdown ||
      undefined,
  };

  // Build narrative (combines all phases)
  item.narrative = buildNarrative(insight, category);

  return item;
}

/**
 * Build narrative text (handles Phases 1-4)
 */
function buildNarrative(
  insight: BaseInsight,
  category: Category
): string | undefined {
  const parts: string[] = [];

  // Phase 1: Basic info
  const basic = getBasicInfo(insight, category);
  if (basic) parts.push(basic);

  // Phase 2: Baseline comparison
  if (insight.baseline_comparison) {
    parts.push(insight.baseline_comparison.deviation_text);
  }

  // Phase 3: Trend analysis
  if (insight.trend_analysis) {
    parts.push(insight.trend_analysis.trend_text);
  }

  // Phase 4: Rich narrative
  if (insight.narrative) {
    parts.push(insight.narrative);
  }

  return parts.length > 0 ? parts.join(" • ") : undefined;
}

/**
 * Extract basic info for narrative
 */
function getBasicInfo(
  insight: BaseInsight,
  category: Category
): string | undefined {
  switch (category) {
    case "cost":
      if (insight.analysis?.primary_driver) {
        return `Primary driver: ${insight.analysis.primary_driver}`;
      }
      break;
    case "equipment":
      if (insight.analysis?.primary_issue) {
        return `Issue: ${insight.analysis.primary_issue}`;
      }
      break;
    case "quality":
      if (insight.analysis?.primary_driver) {
        return `Driver: ${insight.analysis.primary_driver}`;
      }
      break;
    case "efficiency":
      if (insight.analysis?.primary_driver) {
        return `Focus: ${insight.analysis.primary_driver}`;
      }
      break;
  }
  return undefined;
}

/**
 * Extract ID based on category
 */
function extractId(insight: BaseInsight, category: Category): string {
  switch (category) {
    case "cost":
      return insight.work_order_number || insight.id || "Unknown";
    case "equipment":
      return insight.equipment_id || insight.id || "Unknown";
    case "quality":
      return insight.material_code || insight.id || "Unknown";
    case "efficiency":
      return insight.operation_type || insight.id || "Unknown";
  }
}

/**
 * Extract amount based on category
 */
function extractAmount(insight: BaseInsight, category: Category): number {
  switch (category) {
    case "cost":
      return Math.abs(insight.predicted_variance || insight.amount || 0);
    case "equipment":
      return insight.estimated_downtime_cost || insight.amount || 0;
    case "quality":
      return insight.estimated_cost_impact || insight.amount || 0;
    case "efficiency":
      return insight.potential_savings || insight.amount || 0;
  }
}

/**
 * Extract confidence based on category
 */
function extractConfidence(
  insight: BaseInsight,
  category: Category
): number | undefined {
  switch (category) {
    case "cost":
      return insight.confidence;
    case "equipment":
      return insight.failure_probability;
    case "quality":
      return insight.quality_issue_rate;
    case "efficiency":
      return insight.efficiency_score;
  }
}

/**
 * Calculate total impact
 */
function calculateTotalImpact(
  insights: BaseInsight[],
  category: Category
): number {
  return insights.reduce((sum, i) => sum + extractAmount(i, category), 0);
}

/**
 * Build section label
 */
function buildSectionLabel(
  category: Category,
  severity: "critical" | "warning",
  count: number
): string {
  const severityLabel = severity === "critical" ? "Critical" : "Notable";

  switch (category) {
    case "cost":
      return `${severityLabel} Cost Variances`;
    case "equipment":
      return `${severityLabel} Equipment Risks`;
    case "quality":
      return `${severityLabel} Quality Issues`;
    case "efficiency":
      return `${severityLabel} Efficiency Opportunities`;
  }
}

/**
 * Build title
 */
function buildTitle(category: Category, hasCritical: boolean): string {
  const prefix = hasCritical ? "Critical" : "Analysis";

  switch (category) {
    case "cost":
      return `${prefix}: Cost Variances Detected`;
    case "equipment":
      return `${prefix}: Equipment Health Issues`;
    case "quality":
      return `${prefix}: Quality Issues Found`;
    case "efficiency":
      return `${prefix}: Efficiency Opportunities`;
  }
}

/**
 * Build action items
 */
function buildActions(
  insights: BaseInsight[],
  category: Category,
  severity: "critical" | "warning"
): string[] {
  if (insights.length === 0) return [];

  const first = insights[0];
  const actions: string[] = [];

  if (severity === "critical") {
    switch (category) {
      case "cost":
        actions.push(`Review ${extractId(first, category)} immediately`);
        actions.push("Investigate variance root causes");
        break;
      case "equipment":
        actions.push(`Inspect ${extractId(first, category)} within 24 hours`);
        actions.push("Schedule preventive maintenance");
        break;
      case "quality":
        actions.push(`Halt production for ${extractId(first, category)}`);
        actions.push("Contact supplier quality team");
        break;
      case "efficiency":
        actions.push(`Audit ${extractId(first, category)} process`);
        actions.push("Implement lean improvements");
        break;
    }
  } else {
    switch (category) {
      case "cost":
        actions.push("Monitor trending variances");
        break;
      case "equipment":
        actions.push("Plan maintenance within 30 days");
        break;
      case "quality":
        actions.push("Schedule supplier review");
        break;
      case "efficiency":
        actions.push("Identify improvement opportunities");
        break;
    }
  }

  return actions;
}

/**
 * Build summary text for a category
 */
export function buildSummaryText(
  insights: unknown[],
  category: Category,
  totalImpact?: number
): string {
  if (!insights || insights.length === 0) {
    return buildEmptyMessage(category);
  }

  // Cast to BaseInsight array for internal use
  const typedInsights = insights as BaseInsight[];

  const critical = typedInsights.filter(
    (i) => getSeverity(i, category) === "critical"
  );
  const amount = totalImpact || calculateTotalImpact(typedInsights, category);

  let text = `Found ${typedInsights.length} ${category} ${
    typedInsights.length === 1 ? "issue" : "issues"
  }`;

  if (critical.length > 0) {
    text += `, ${critical.length} critical`;
  }

  if (amount > 0) {
    text += `. Total impact: $${amount.toLocaleString()}`;
  }

  return text;
}

/**
 * Build empty message
 */
function buildEmptyMessage(category: Category): string {
  switch (category) {
    case "cost":
      return "No significant cost variances detected. All work orders tracking close to plan.";
    case "equipment":
      return "Equipment health looks good. No assets showing failure risk patterns.";
    case "quality":
      return "Quality metrics strong. No significant issues detected.";
    case "efficiency":
      return "Efficiency looks solid. Operations performing well.";
  }
}

/**
 * Build follow-up questions
 */
export function buildFollowUps(category: Category): string[] {
  switch (category) {
    case "cost":
      return [
        "What caused the top variance?",
        "Show me cost trends",
        "How can we prevent this?",
      ];
    case "equipment":
      return [
        "What equipment needs attention?",
        "Show maintenance history",
        "Preventive actions recommended?",
      ];
    case "quality":
      return [
        "Which supplier has issues?",
        "Show quality trends",
        "Recommended corrective actions?",
      ];
    case "efficiency":
      return [
        "What is the biggest opportunity?",
        "Show process details",
        "How do we improve?",
      ];
  }
}
