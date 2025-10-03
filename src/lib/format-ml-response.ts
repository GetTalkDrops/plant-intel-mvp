// src/lib/format-ml-response.ts
import { InsightCard, AssistantMessage } from "./insight-types";

interface MLPrediction {
  work_order_number: string;
  predicted_variance: number;
  confidence: number;
  risk_level: "critical" | "high" | "medium" | "low";
  analysis?: {
    variance_breakdown: {
      material: {
        planned: number;
        actual: number;
        variance: number;
        percentage: number;
        variance_pct: number;
        driver: string;
      };
      labor: {
        planned: number;
        actual: number;
        variance: number;
        percentage: number;
        variance_pct: number;
        hours_variance: number;
        driver: string;
      };
    };
    primary_driver: "material" | "labor";
  };
}

interface MLValidation {
  score: number;
  grade: string;
  warnings: string[];
  limitations: string[];
  field_quality: Record<string, number>;
  total_rows: number;
}

interface MLThresholds {
  variance_threshold: number;
  variance_threshold_pct: number;
  avg_order_value: number;
  sample_size: number;
}

interface MLCostAnalysisData {
  status?: string;
  validation?: MLValidation;
  thresholds?: MLThresholds;
  predictions?: MLPrediction[];
  total_impact?: number;
  error?: string;
  message?: string;
}

export function formatCostAnalysisResponse(
  mlData: MLCostAnalysisData
): AssistantMessage {
  // Handle new insufficient_data status with validation
  if (mlData.status === "insufficient_data" && mlData.validation) {
    const v = mlData.validation;
    return {
      text: `⚠️ **Data Quality Alert**\n\nI've analyzed your upload, but the data quality is too low for reliable insights.\n\n**Quality Score: ${
        v.score
      }/100** (${v.grade})\n\n**Issues Found:**\n${v.warnings
        .map((w) => `• ${w}`)
        .join(
          "\n"
        )}\n\nPlease review your data and re-upload with more complete information. I'm here to help if you have questions about what's needed.`,
      followUps: ["What fields are required?", "Show me a sample CSV format"],
    };
  }

  // Handle old error format (backward compatibility)
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
    let text =
      "Good news! No significant cost variances detected in your uploaded data. All work orders appear to be tracking close to planned costs.";

    // Add data quality note if present and not excellent
    if (mlData.validation && mlData.validation.score < 85) {
      text += `\n\n📊 **Data Quality: ${mlData.validation.score}/100** (${mlData.validation.grade})`;
      if (
        mlData.validation.limitations &&
        mlData.validation.limitations.length > 0
      ) {
        text += `\n${mlData.validation.limitations
          .map((l) => `• ${l}`)
          .join("\n")}`;
      }
    }

    // Add threshold info if available
    if (mlData.thresholds) {
      text += `\n\n*Analysis threshold: $${mlData.thresholds.variance_threshold.toLocaleString()} (${
        mlData.thresholds.variance_threshold_pct
      }% of average work order value)*`;
    }

    return {
      text,
      followUps: [
        "Show me quality issues",
        "Check equipment risks",
        "Analyze efficiency opportunities",
      ],
    };
  }

  // Success case - build sections
  const critical = mlData.predictions.filter(
    (p) => p.risk_level === "critical"
  );
  const high = mlData.predictions.filter((p) => p.risk_level === "high");
  const medium = mlData.predictions.filter((p) => p.risk_level === "medium");

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
        breakdown: p.analysis?.variance_breakdown
          ? {
              material: p.analysis.variance_breakdown.material,
              labor: p.analysis.variance_breakdown.labor,
              primary_driver: p.analysis.primary_driver,
            }
          : undefined,
      })),
      actions: [
        `Review ${critical[0].work_order_number} first (highest impact)`,
        "Investigate material supplier pricing changes",
        "Analyze labor hour trends for these orders",
      ],
    });
  }

  if (high.length > 0) {
    sections.push({
      severity: "warning" as const,
      label: "High Priority",
      count: high.length,
      items: high.map((p) => ({
        id: p.work_order_number,
        amount: Math.abs(p.predicted_variance),
        confidence: p.confidence,
        breakdown: p.analysis?.variance_breakdown
          ? {
              material: p.analysis.variance_breakdown.material,
              labor: p.analysis.variance_breakdown.labor,
              primary_driver: p.analysis.primary_driver,
            }
          : undefined,
      })),
      actions: [
        "Monitor these orders for escalation",
        "Document variance patterns for trend analysis",
      ],
    });
  }

  if (medium.length > 0) {
    sections.push({
      severity: "warning" as const,
      label: "Medium Priority",
      count: medium.length,
      items: medium.map((p) => ({
        id: p.work_order_number,
        amount: Math.abs(p.predicted_variance),
        confidence: p.confidence,
        breakdown: p.analysis?.variance_breakdown
          ? {
              material: p.analysis.variance_breakdown.material,
              labor: p.analysis.variance_breakdown.labor,
              primary_driver: p.analysis.primary_driver,
            }
          : undefined,
      })),
      actions: [],
    });
  }

  // Build summary text
  let summaryText = `Found ${mlData.predictions.length} work order${
    mlData.predictions.length === 1 ? "" : "s"
  } with significant cost variances`;

  if (mlData.total_impact) {
    summaryText += `, totaling $${mlData.total_impact.toLocaleString()}`;
  }
  summaryText += ".";

  // Add data quality note if not excellent
  if (mlData.validation && mlData.validation.score < 85) {
    summaryText += `\n\n📊 **Data Quality: ${mlData.validation.score}/100** (${mlData.validation.grade})`;
    if (
      mlData.validation.limitations &&
      mlData.validation.limitations.length > 0
    ) {
      summaryText += `\n${mlData.validation.limitations
        .map((l) => `• ${l}`)
        .join("\n")}`;
    }
  }

  const summaryCard: InsightCard = {
    type: critical.length > 0 ? "critical" : "warning",
    category: "cost",
    title: "Cost Variance Summary",
    impact: mlData.total_impact || 0,
    sections,
  };

  return {
    text: summaryText,
    cards: [summaryCard],
    followUps: [
      "Why did the top variance occur?",
      "Show me all the details",
      "How can we prevent this?",
    ],
  };
}
