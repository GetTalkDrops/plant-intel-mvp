// src/lib/format-ml-response.ts
import { InsightCard, AssistantMessage } from "./insight-types";

// Pattern Narrative Interfaces
interface PatternNarrative {
  type: string;
  identifier: string;
  summary: {
    orders_affected: number;
    timespan_days: number;
    total_variance: number;
    avg_variance_per_order?: number;
    variance_percentage?: number;
  };
  root_cause: {
    primary_driver: string;
    contributing_factors: string[];
    confidence: string;
  };
  financial_impact: {
    direct_overage: number;
    pattern_scope: string;
    avg_impact_per_order?: number;
  };
  recommended_actions: Array<{
    priority: number;
    type: string;
    title: string;
    description: string;
    effort: string;
    timeframe: string;
    estimated_monthly_savings?: number;
  }>;
  data_gaps: Array<{
    field: string;
    impact: string;
    description: string;
  }>;
  improvement_nudges: Array<{
    field: string;
    message: string;
    estimated_value: string;
    implementation: string;
  }>;
}

interface Pattern {
  type: string;
  identifier: string;
  order_count: number;
  total_impact: number;
  avg_variance?: number;
  work_orders?: string[];
  narrative?: PatternNarrative;
  defect_rate?: number; // For quality patterns
  issue_rate?: number; // For equipment patterns
}

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
  patterns?: Pattern[];
  total_impact?: number;
  error?: string;
  message?: string;
}

// Helper function to format pattern narratives for display
function formatPatternNarrative(narrative: PatternNarrative): string {
  let formatted = "";

  // Summary section
  formatted += "PATTERN DETECTED:\n";
  formatted += `• ${narrative.summary.orders_affected} work orders affected over ${narrative.summary.timespan_days} days\n`;
  formatted += `• $${narrative.financial_impact.direct_overage.toLocaleString()} total variance`;

  if (narrative.summary.avg_variance_per_order) {
    formatted += ` ($${narrative.summary.avg_variance_per_order.toLocaleString()} avg per order)`;
  }
  formatted += "\n";

  if (narrative.summary.variance_percentage) {
    formatted += `• ${narrative.summary.variance_percentage}% over planned cost\n`;
  }

  // Root cause section
  formatted += "\nROOT CAUSE ANALYSIS:\n";
  formatted += `Primary driver: ${narrative.root_cause.primary_driver}\n`;
  if (narrative.root_cause.contributing_factors.length > 0) {
    formatted += `Contributing factors: ${narrative.root_cause.contributing_factors.join(
      ", "
    )}\n`;
  }

  // Financial impact section
  formatted += "\nCOST BREAKDOWN:\n";
  formatted += `Direct overage: $${narrative.financial_impact.direct_overage.toLocaleString()}\n`;
  formatted += `Pattern scope: ${narrative.financial_impact.pattern_scope}\n`;

  // Recommended actions section
  if (narrative.recommended_actions.length > 0) {
    formatted += "\nRECOMMENDED ACTIONS:\n";
    narrative.recommended_actions.forEach((action, idx) => {
      formatted += `${idx + 1}. ${action.title}\n`;
      formatted += `   ${action.description}\n`;
      if (
        action.estimated_monthly_savings &&
        action.estimated_monthly_savings > 0
      ) {
        formatted += `   Expected savings: $${action.estimated_monthly_savings.toLocaleString()}/month\n`;
      }
      formatted += `   Effort: ${action.effort} | Timeframe: ${action.timeframe}\n`;
      if (idx < narrative.recommended_actions.length - 1) {
        formatted += "\n";
      }
    });
  }

  // Data gaps section
  if (narrative.data_gaps.length > 0) {
    formatted += "\nDATA GAPS IDENTIFIED:\n";
    narrative.data_gaps.forEach((gap) => {
      formatted += `⚠ ${gap.field.toUpperCase()}: ${gap.description}\n`;
    });
  }

  // Improvement nudges section
  if (narrative.improvement_nudges.length > 0) {
    formatted += "\nIMPROVE YOUR DATA:\n";
    narrative.improvement_nudges.forEach((nudge) => {
      formatted += `→ ${nudge.message}\n`;
      formatted += `  Value: ${nudge.estimated_value}\n`;
      formatted += `  How: ${nudge.implementation}\n\n`;
    });
  }

  return formatted;
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

  const sections: InsightCard["sections"] = [];

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

  // ENHANCED: Pattern sections with rich narratives
  if (mlData.patterns && mlData.patterns.length > 0) {
    const materialPatterns = mlData.patterns.filter(
      (p) => p.type === "material"
    );
    const supplierPatterns = mlData.patterns.filter(
      (p) => p.type === "supplier"
    );

    if (materialPatterns.length > 0) {
      sections.push({
        severity: "warning" as const,
        label: `Material Patterns`,
        count: materialPatterns.length,
        items: materialPatterns.map((p) => {
          console.log(
            "Pattern:",
            p.identifier,
            "Has narrative:",
            !!p.narrative
          ); // DEBUG
          return {
            id: `${p.identifier} (${p.order_count} orders)`,
            amount: Math.abs(p.total_impact),
            confidence: 0,
            breakdown: undefined,
            narrative: p.narrative
              ? formatPatternNarrative(p.narrative)
              : undefined,
          };
        }),
        actions: materialPatterns[0]?.narrative
          ? materialPatterns[0].narrative.recommended_actions
              .slice(0, 3)
              .map((action) => action.title)
          : [
              `Review ${materialPatterns[0].identifier}`,
              "Investigate material pricing changes",
              "Check quality from this material batch",
            ],
      });
    }

    if (supplierPatterns.length > 0) {
      sections.push({
        severity: "warning" as const,
        label: `Supplier Patterns`,
        count: supplierPatterns.length,
        items: supplierPatterns.map((p) => ({
          id: `${p.identifier} (${p.order_count} orders)`,
          amount: Math.abs(p.total_impact),
          confidence: 0,
          breakdown: undefined,
          narrative: p.narrative
            ? formatPatternNarrative(p.narrative)
            : undefined,
        })),
        actions: supplierPatterns[0]?.narrative
          ? supplierPatterns[0].narrative.recommended_actions
              .slice(0, 3)
              .map((action) => action.title)
          : [
              `Review ${supplierPatterns[0].identifier}`,
              "Schedule supplier review meeting",
              "Evaluate alternate suppliers",
            ],
      });
    }
  }

  let summaryText = `Found ${mlData.predictions.length} work order${
    mlData.predictions.length === 1 ? "" : "s"
  } with significant cost variances`;

  if (mlData.total_impact) {
    summaryText += `, totaling $${mlData.total_impact.toLocaleString()}`;
  }
  summaryText += ".";

  if (mlData.patterns && mlData.patterns.length > 0) {
    summaryText += `\n\nFound ${mlData.patterns.length} pattern${
      mlData.patterns.length === 1 ? "" : "s"
    } across multiple orders.`;
  }

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

// Equipment Response Formatter
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

interface MLEquipmentData {
  insights: EquipmentPrediction[];
  patterns?: Pattern[];
  total_impact: number;
  message?: string;
}

export function formatEquipmentResponse(
  mlData: MLEquipmentData
): AssistantMessage {
  if (mlData.message) {
    // Still create card even when ML service returns a message
    const emptyCard: InsightCard = {
      type: "warning",
      category: "equipment",
      title: "Equipment Status: Healthy",
      impact: 0,
      sections: [
        {
          severity: "warning" as const,
          label: "Status",
          count: 0,
          items: [],
          actions: [
            "No equipment showing failure risk patterns",
            "All assets performing within normal parameters",
            "Continue monitoring for early warning signs",
          ],
        },
      ],
    };

    return {
      text: mlData.message,
      cards: [emptyCard],
      followUps: [
        "What data do I need for equipment analysis?",
        "Show me cost variances instead",
      ],
    };
  }
  if (!mlData.insights || mlData.insights.length === 0) {
    const emptyCard: InsightCard = {
      type: "warning",
      category: "equipment",
      title: "Equipment Status: Healthy",
      impact: 0,
      sections: [
        {
          severity: "warning" as const,
          label: "Status",
          count: 0,
          items: [],
          actions: [
            "No equipment showing failure risk patterns",
            "All assets performing within normal parameters",
            "Continue monitoring for early warning signs",
          ],
        },
      ],
    };

    return {
      text: `Equipment health looks good. No assets showing failure risk patterns.

**Enhance Analysis:** Upload data with machine_id and downtime_minutes fields for predictive maintenance insights.`,
      cards: [emptyCard],
      followUps: [
        "What data improves equipment analysis?",
        "Check cost variances",
        "Review quality status",
      ],
    };
  }

  const critical = mlData.insights.filter((p) => p.failure_probability >= 80);
  const high = mlData.insights.filter(
    (p) => p.failure_probability >= 60 && p.failure_probability < 80
  );
  const medium = mlData.insights.filter((p) => p.failure_probability < 60);

  const sections: InsightCard["sections"] = [];

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

  if (mlData.patterns && mlData.patterns.length > 0) {
    sections.push({
      severity: "warning" as const,
      label: `Equipment Quality Patterns`,
      count: mlData.patterns.length,
      items: mlData.patterns.map((p) => ({
        id: `${p.identifier} (${p.order_count} quality issues)`,
        amount: p.total_impact,
        confidence: 0,
        breakdown: undefined,
      })),
      actions:
        mlData.patterns.length > 0
          ? [
              `${mlData.patterns[0].identifier} has quality issues in ${mlData.patterns[0].order_count} orders`,
              "Schedule equipment inspection",
              "Review maintenance history",
            ]
          : [],
    });
  }

  let summaryText = `Found ${mlData.insights.length} equipment asset${
    mlData.insights.length === 1 ? "" : "s"
  } showing failure risk patterns`;

  if (mlData.total_impact > 0) {
    summaryText += `, with total cost exposure of ${mlData.total_impact.toLocaleString()}`;
  }
  summaryText += ".";

  if (mlData.patterns && mlData.patterns.length > 0) {
    summaryText += `\n\n${mlData.patterns.length} equipment asset${
      mlData.patterns.length === 1 ? "" : "s"
    } showing recurring quality issues.`;
  }

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

// Quality Response Formatter
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

interface MLQualityData {
  insights: QualityIssue[];
  patterns?: Pattern[];
  overall_scrap_rate: number;
  total_scrap_cost?: number;
  total_impact?: number;
}

export function formatQualityResponse(mlData: MLQualityData): AssistantMessage {
  if (!mlData.insights || mlData.insights.length === 0) {
    const scrapRate = mlData.overall_scrap_rate || 0;

    const emptyCard: InsightCard = {
      type: "warning",
      category: "quality",
      title: "Quality Status: Excellent",
      impact: 0,
      sections: [
        {
          severity: "warning" as const,
          label: "Status",
          count: 0,
          items: [],
          actions: [
            `Overall scrap rate: ${scrapRate.toFixed(
              2
            )} units per order (target: <2%)`,
            "No significant quality issues detected",
            `${
              mlData.patterns?.length || 0
            } recurring defect patterns identified`,
          ],
        },
      ],
    };

    return {
      text: `Quality metrics look strong. Overall scrap rate of ${scrapRate.toFixed(
        2
      )} units per order is within target range.

**Enhance Analysis:** Add defect_code and qc_inspection_result fields to identify specific quality improvement opportunities.`,
      cards: [emptyCard],
      followUps: [
        "How can I improve quality tracking?",
        "Check equipment status",
        "Show cost variances",
      ],
    };
  }

  const critical = mlData.insights.filter(
    (q) => q.estimated_cost_impact > 50000
  );
  const high = mlData.insights.filter(
    (q) => q.estimated_cost_impact > 10000 && q.estimated_cost_impact <= 50000
  );
  const medium = mlData.insights.filter(
    (q) => q.estimated_cost_impact <= 10000
  );

  const sections: InsightCard["sections"] = [];

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

  if (mlData.patterns && mlData.patterns.length > 0) {
    sections.push({
      severity: "warning" as const,
      label: `Material Quality Patterns`,
      count: mlData.patterns.length,
      items: mlData.patterns.map((p) => ({
        id: p.identifier,
        amount: p.total_impact,
        confidence: p.defect_rate,
        breakdown: undefined,
      })),
      actions:
        mlData.patterns.length > 0
          ? [
              `${mlData.patterns[0].identifier} has ${(
                mlData.patterns[0].defect_rate || 0
              ).toFixed(0)}% defect rate`,
              "Investigate material batch issues",
              "Contact supplier about quality",
            ]
          : [],
    });
  }

  let summaryText = `Found quality issues with ${
    mlData.insights.length
  } material${mlData.insights.length === 1 ? "" : "s"}`;

  const totalCost = mlData.total_scrap_cost || mlData.total_impact || 0;
  if (totalCost > 0) {
    summaryText += `, totaling ${totalCost.toLocaleString()} in cost impact`;
  }
  summaryText += `.`;

  if (mlData.patterns && mlData.patterns.length > 0) {
    summaryText += `\n\n${mlData.patterns.length} material${
      mlData.patterns.length === 1 ? "" : "s"
    } showing recurring defects.`;
  }

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

// Efficiency Response Formatter
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

interface MLEfficiencyData {
  insights: EfficiencyInsight[];
  overall_efficiency: number;
  total_savings_opportunity: number;
  total_impact?: number;
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

  const sections: InsightCard["sections"] = [];

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

  let summaryText = `Overall efficiency: ${
    mlData.overall_efficiency !== undefined
      ? mlData.overall_efficiency.toFixed(1) + "%"
      : mlData.insights[0]?.efficiency_score !== undefined
      ? mlData.insights[0].efficiency_score.toFixed(1) + "%"
      : "N/A"
  }. Found ${mlData.insights.length} optimization opportunit${
    mlData.insights.length === 1 ? "y" : "ies"
  }`;

  if (mlData.total_savings_opportunity > 0) {
    summaryText += ` with potential savings of ${mlData.total_savings_opportunity.toLocaleString()}`;
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
