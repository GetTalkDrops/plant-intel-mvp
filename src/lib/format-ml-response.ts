// src/lib/format-ml-response.ts
import { InsightCard, AssistantMessage } from "./insight-types";

interface MLPrediction {
  work_order_number: string;
  predicted_variance: number;
  confidence: number;
  risk_level: "high" | "medium" | "low";
}

interface MLCostAnalysisData {
  predictions?: MLPrediction[];
  total_impact?: number;
  error?: string;
  message?: string;
}

export function formatCostAnalysisResponse(
  mlData: MLCostAnalysisData
): AssistantMessage {
  // Handle error states
  if (mlData.error === "insufficient_data") {
    return {
      text:
        mlData.message +
        "\n\nTo get cost variance insights, ensure your CSV includes:\n• Planned Material Cost\n• Actual Material Cost\n• Planned Labor Hours\n• Actual Labor Hours",
      followUps: [
        "What fields are in my uploaded data?",
        "Show me a sample CSV format",
      ],
    };
  }

  if (mlData.error === "no_data") {
    return {
      text: "No work order data found. Please upload a CSV file to begin analysis.",
      followUps: ["What CSV format do you accept?"],
    };
  }

  // No predictions found
  if (!mlData.predictions || mlData.predictions.length === 0) {
    return {
      text: "Good news! No significant cost variances detected in your uploaded data. All work orders appear to be tracking close to planned costs.",
      followUps: [
        "Show me quality issues",
        "Check equipment risks",
        "Analyze efficiency opportunities",
      ],
    };
  }

  // In format-ml-response.ts, replace the card building logic:

  const critical = mlData.predictions.filter((p) => p.risk_level === "high");
  const warnings = mlData.predictions.filter((p) => p.risk_level === "medium");

  const sections = [];

  if (critical.length > 0) {
    sections.push({
      severity: "critical" as const,
      label: "Critical Issues",
      count: critical.length,
      items: critical.map((p) => ({
        id: p.work_order_number,
        amount: Math.abs(p.predicted_variance),
        confidence: p.confidence,
      })),
      actions: [
        `Review ${critical[0].work_order_number} first (highest impact)`,
        "Investigate material supplier pricing changes",
        "Analyze labor hour trends for these orders",
      ],
    });
  }

  if (warnings.length > 0) {
    sections.push({
      severity: "warning" as const,
      label: "Warnings",
      count: warnings.length,
      items: warnings.map((p) => ({
        id: p.work_order_number,
        amount: Math.abs(p.predicted_variance),
        confidence: p.confidence,
      })),
      actions: [
        "Monitor these orders for escalation",
        "Document variance patterns for trend analysis",
      ],
    });
  }

  const summaryCard: InsightCard = {
    type: critical.length > 0 ? "critical" : "warning",
    category: "cost",
    title: "Cost Variance Summary",
    impact: mlData.total_impact || 0,
    sections,
  };

  return {
    text: `Found ${
      mlData.predictions.length
    } work orders with cost variances totaling $${(
      mlData.total_impact || 0
    ).toLocaleString()}.`,
    cards: [summaryCard],
    followUps: [
      "Deep dive into highest variance work order",
      "Compare to previous uploads",
      "Show me quality issues",
    ],
  };
}
