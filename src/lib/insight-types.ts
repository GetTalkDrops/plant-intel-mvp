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
  breakdown?: {
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
  };
}

export interface AssistantMessage {
  text: string;
  cards?: InsightCard[];
  followUps?: string[];
}
