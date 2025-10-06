// src/lib/insight-types.ts
export interface InsightCard {
  type: "critical" | "warning" | "positive" | "info";
  category: "cost" | "equipment" | "quality" | "efficiency";
  title: string;
  impact?: number;
  variance?: string;
  rootCause?: string;
  breakdown?: Array<{ label: string; percentage: number }>;
  actions?: string[];
  sections?: Array<{
    severity: "critical" | "warning";
    label: string;
    count: number;
    items: InsightItem[];
    actions: string[];
  }>;
}

export interface InsightItem {
  id: string;
  amount: number;
  confidence: number;
  breakdown?:
    | {
        // Cost breakdown
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
        primary_driver: "material" | "labor";
      }
    | {
        // Equipment breakdown
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
        primary_issue: string;
      }
    | {
        // Quality breakdown
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
        primary_driver: string;
      }
    | {
        // Efficiency breakdown
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
        primary_driver: string;
      };
}

export interface AssistantMessage {
  text: string;
  cards?: InsightCard[];
  followUps?: string[];
}
