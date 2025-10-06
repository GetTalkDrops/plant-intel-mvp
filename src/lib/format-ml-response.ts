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

interface EquipmentPrediction {
  equipment_id: string;
  failure_probability: number;
  estimated_downtime_cost: number;
  orders_analyzed: number;
  analysis: {
    total_impact: number;
    risk_score: number;
    breakdown: {
      labor: {
        impact: number;
        percentage: number;
        avg_hours_over: number;
        driver: string;
      };
      quality: {
        impact: number;
        percentage: number;
        scrap_units: number;
        affected_orders: number;
        driver: string;
      };
      material_waste: {
        impact: number;
        percentage: number;
        driver: string;
      };
    };
    primary_issue: string;
  };
}

interface QualityIssue {
  material_code: string;
  scrap_rate_per_order: number;
  quality_issue_rate: number;
  estimated_cost_impact: number;
  orders_analyzed: number;
  analysis: {
    total_impact: number;
    issue_rate: number;
    scrap_per_order: number;
    breakdown: {
      scrap: {
        cost: number;
        percentage: number;
        units: number;
        driver: string;
      };
      rework: {
        cost: number;
        percentage: number;
        hours: number;
        driver: string;
      };
      material_waste: {
        cost: number;
        percentage: number;
        driver: string;
      };
    };
    primary_driver: string;
  };
}

interface EfficiencyInsight {
  operation_type: string;
  efficiency_score: number;
  labor_efficiency: number;
  cost_efficiency: number;
  orders_analyzed: number;
  potential_savings: number;
  analysis: {
    total_savings: number;
    breakdown: {
      labor: {
        impact: number;
        percentage: number;
        avg_hours_over: number;
        driver: string;
      };
      material: {
        impact: number;
        percentage: number;
        avg_cost_over: number;
        driver: string;
      };
      quality: {
        impact: number;
        percentage: number;
        issue_count: number;
        driver: string;
      };
    };
    primary_driver: string;
    consistency_score: number;
    consistency_driver: string;
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

interface MLEquipmentData {
  insights: EquipmentPrediction[]; // Changed from predictions to insights
  total_impact: number; // Changed from total_downtime_cost to total_impact
  message?: string;
}

interface MLQualityData {
  insights: QualityIssue[];
  overall_scrap_rate: number;
  total_scrap_cost?: number;
  total_impact?: number;
}

interface MLEfficiencyData {
  insights: EfficiencyInsight[];
  overall_efficiency: number;
  total_savings_opportunity: number;
  total_impact?: number;
}

export function formatCostAnalysisResponse(
  mlData: MLCostAnalysisData
): AssistantMessage {
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

  if (!mlData.predictions || mlData.predictions.length === 0) {
    let text =
      "Good news! No significant cost variances detected in your uploaded data. All work orders appear to be tracking close to planned costs.";

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

  let summaryText = `Found ${mlData.predictions.length} work order${
    mlData.predictions.length === 1 ? "" : "s"
  } with significant cost variances`;

  if (mlData.total_impact) {
    summaryText += `, totaling $${mlData.total_impact.toLocaleString()}`;
  }
  summaryText += ".";

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

export function formatEquipmentResponse(
  mlData: MLEquipmentData
): AssistantMessage {
  if (mlData.message) {
    return {
      text: mlData.message,
      followUps: [
        "What data do I need for equipment analysis?",
        "Show me cost variances instead",
      ],
    };
  }

  if (!mlData.insights || mlData.insights.length === 0) {
    return {
      text: "Your equipment is performing well - no assets showing failure risk patterns right now.",
      followUps: ["Check quality issues", "Show me cost variances"],
    };
  }

  // Build sections based on risk score
  const critical = mlData.insights.filter((p) => p.failure_probability >= 80);
  const high = mlData.insights.filter(
    (p) => p.failure_probability >= 60 && p.failure_probability < 80
  );
  const medium = mlData.insights.filter((p) => p.failure_probability < 60);

  const sections = [];

  if (critical.length > 0) {
    sections.push({
      severity: "critical" as const,
      label: "Critical Risk Equipment",
      count: critical.length,
      items: critical.map((p) => ({
        id: p.equipment_id,
        amount: p.estimated_downtime_cost,
        confidence: p.failure_probability,
        breakdown: {
          labor: p.analysis.breakdown.labor,
          quality: p.analysis.breakdown.quality,
          material_waste: p.analysis.breakdown.material_waste,
          primary_issue: p.analysis.primary_issue,
        },
      })),
      actions: [
        `Immediate inspection required for ${critical[0].equipment_id}`,
        "Schedule preventive maintenance for critical assets",
        "Review maintenance logs for recurring patterns",
      ],
    });
  }

  if (high.length > 0) {
    sections.push({
      severity: "warning" as const,
      label: "High Risk Equipment",
      count: high.length,
      items: high.map((p) => ({
        id: p.equipment_id,
        amount: p.estimated_downtime_cost,
        confidence: p.failure_probability,
        breakdown: {
          labor: p.analysis.breakdown.labor,
          quality: p.analysis.breakdown.quality,
          material_waste: p.analysis.breakdown.material_waste,
          primary_issue: p.analysis.primary_issue,
        },
      })),
      actions: [
        "Monitor these assets closely for degradation",
        "Plan maintenance within next 30 days",
      ],
    });
  }

  if (medium.length > 0) {
    sections.push({
      severity: "warning" as const,
      label: "Elevated Risk Equipment",
      count: medium.length,
      items: medium.map((p) => ({
        id: p.equipment_id,
        amount: p.estimated_downtime_cost,
        confidence: p.failure_probability,
        breakdown: {
          labor: p.analysis.breakdown.labor,
          quality: p.analysis.breakdown.quality,
          material_waste: p.analysis.breakdown.material_waste,
          primary_issue: p.analysis.primary_issue,
        },
      })),
      actions: [],
    });
  }

  let summaryText = `Found ${mlData.insights.length} equipment asset${
    mlData.insights.length === 1 ? "" : "s"
  } showing failure risk patterns`;

  if (mlData.total_impact > 0) {
    summaryText += `, with total cost exposure of $${mlData.total_impact.toLocaleString()}`;
  }
  summaryText += ".";

  const summaryCard: InsightCard = {
    type: critical.length > 0 ? "critical" : "warning",
    category: "equipment",
    title: "Equipment Risk Summary",
    impact: mlData.total_impact || 0,
    sections,
  };

  return {
    text: summaryText,
    cards: [summaryCard],
    followUps: [
      "What's causing the top equipment issue?",
      "Show maintenance history",
      "Preventive actions recommended?",
    ],
  };
}

export function formatQualityResponse(mlData: MLQualityData): AssistantMessage {
  if (!mlData.insights || mlData.insights.length === 0) {
    return {
      text: `Quality looks solid - overall scrap rate of ${mlData.overall_scrap_rate.toFixed(
        2
      )} units per order is within normal range.`,
      followUps: ["Check equipment status", "Show me cost variances"],
    };
  }

  // Build sections based on cost impact
  const critical = mlData.insights.filter(
    (q) => q.estimated_cost_impact > 50000
  );
  const high = mlData.insights.filter(
    (q) => q.estimated_cost_impact > 10000 && q.estimated_cost_impact <= 50000
  );
  const medium = mlData.insights.filter(
    (q) => q.estimated_cost_impact <= 10000
  );

  const sections = [];

  if (critical.length > 0) {
    sections.push({
      severity: "critical" as const,
      label: "Critical Quality Issues",
      count: critical.length,
      items: critical.map((q) => ({
        id: q.material_code,
        amount: q.estimated_cost_impact,
        confidence: q.quality_issue_rate,
        breakdown: {
          scrap: q.analysis.breakdown.scrap,
          rework: q.analysis.breakdown.rework,
          material_waste: q.analysis.breakdown.material_waste,
          primary_driver: q.analysis.primary_driver,
        },
      })),
      actions: [
        `Urgent supplier review for ${critical[0].material_code}`,
        "Halt production pending quality investigation",
        "Implement enhanced inspection protocols",
      ],
    });
  }

  if (high.length > 0) {
    sections.push({
      severity: "warning" as const,
      label: "High Impact Issues",
      count: high.length,
      items: high.map((q) => ({
        id: q.material_code,
        amount: q.estimated_cost_impact,
        confidence: q.quality_issue_rate,
        breakdown: {
          scrap: q.analysis.breakdown.scrap,
          rework: q.analysis.breakdown.rework,
          material_waste: q.analysis.breakdown.material_waste,
          primary_driver: q.analysis.primary_driver,
        },
      })),
      actions: [
        "Schedule supplier quality audits",
        "Review production process parameters",
      ],
    });
  }

  if (medium.length > 0) {
    sections.push({
      severity: "warning" as const,
      label: "Moderate Issues",
      count: medium.length,
      items: medium.map((q) => ({
        id: q.material_code,
        amount: q.estimated_cost_impact,
        confidence: q.quality_issue_rate,
        breakdown: {
          scrap: q.analysis.breakdown.scrap,
          rework: q.analysis.breakdown.rework,
          material_waste: q.analysis.breakdown.material_waste,
          primary_driver: q.analysis.primary_driver,
        },
      })),
      actions: [],
    });
  }

  let summaryText = `Found quality issues with ${
    mlData.insights.length
  } material${mlData.insights.length === 1 ? "" : "s"}`;

  const totalCost = mlData.total_scrap_cost || mlData.total_impact || 0;
  if (totalCost > 0) {
    summaryText += `, totaling $${totalCost.toLocaleString()} in cost impact`;
  }
  summaryText += `.`;

  const summaryCard: InsightCard = {
    type: critical.length > 0 ? "critical" : "warning",
    category: "quality",
    title: "Quality Issue Summary",
    impact: totalCost,
    sections,
  };

  return {
    text: summaryText,
    cards: [summaryCard],
    followUps: [
      "What's causing the quality issues?",
      "Show supplier performance",
      "Recommended corrective actions?",
    ],
  };
}

export function formatEfficiencyResponse(
  mlData: MLEfficiencyData
): AssistantMessage {
  if (!mlData.insights || mlData.insights.length === 0) {
    return {
      text: `Efficiency looks good - overall facility efficiency of ${mlData.overall_efficiency}% is solid.`,
      followUps: ["Check cost variances", "Show equipment status"],
    };
  }

  // All efficiency issues are warnings (optimization opportunities)
  const sections = [];

  const highImpact = mlData.insights.filter(
    (e) => e.potential_savings > 100000
  );
  const mediumImpact = mlData.insights.filter(
    (e) => e.potential_savings > 25000 && e.potential_savings <= 100000
  );
  const lowImpact = mlData.insights.filter((e) => e.potential_savings <= 25000);

  if (highImpact.length > 0) {
    sections.push({
      severity: "warning" as const,
      label: "High Impact Opportunities",
      count: highImpact.length,
      items: highImpact.map((e) => ({
        id: e.operation_type,
        amount: e.potential_savings,
        confidence: e.efficiency_score,
        breakdown: {
          labor: e.analysis.breakdown.labor,
          material: e.analysis.breakdown.material,
          quality: e.analysis.breakdown.quality,
          primary_driver: e.analysis.primary_driver,
        },
      })),
      actions: [
        `Focus on ${highImpact[0].operation_type} operations first`,
        "Conduct process efficiency audit",
        "Implement lean manufacturing principles",
      ],
    });
  }

  if (mediumImpact.length > 0) {
    sections.push({
      severity: "warning" as const,
      label: "Medium Impact Opportunities",
      count: mediumImpact.length,
      items: mediumImpact.map((e) => ({
        id: e.operation_type,
        amount: e.potential_savings,
        confidence: e.efficiency_score,
        breakdown: {
          labor: e.analysis.breakdown.labor,
          material: e.analysis.breakdown.material,
          quality: e.analysis.breakdown.quality,
          primary_driver: e.analysis.primary_driver,
        },
      })),
      actions: [
        "Schedule process improvement workshops",
        "Benchmark against industry standards",
      ],
    });
  }

  if (lowImpact.length > 0) {
    sections.push({
      severity: "warning" as const,
      label: "Lower Priority Opportunities",
      count: lowImpact.length,
      items: lowImpact.map((e) => ({
        id: e.operation_type,
        amount: e.potential_savings,
        confidence: e.efficiency_score,
        breakdown: {
          labor: e.analysis.breakdown.labor,
          material: e.analysis.breakdown.material,
          quality: e.analysis.breakdown.quality,
          primary_driver: e.analysis.primary_driver,
        },
      })),
      actions: [],
    });
  }

  let summaryText = `Overall efficiency: ${mlData.overall_efficiency}%. Found ${
    mlData.insights.length
  } optimization opportunit${mlData.insights.length === 1 ? "y" : "ies"}`;

  if (mlData.total_savings_opportunity > 0) {
    summaryText += ` with potential savings of $${mlData.total_savings_opportunity.toLocaleString()}`;
  }
  summaryText += `.`;

  const summaryCard: InsightCard = {
    type: "warning",
    category: "efficiency",
    title: "Efficiency Optimization Summary",
    impact: mlData.total_savings_opportunity || 0,
    sections,
  };

  return {
    text: summaryText,
    cards: [summaryCard],
    followUps: [
      "What's the biggest efficiency drain?",
      "Show me process details",
      "How do we improve this?",
    ],
  };
}
