// src/lib/insight-types.ts

// Breakdown type unions for type safety
type CostBreakdown = {
  material?: { variance?: number; percentage?: number; driver?: string };
  labor?: { variance?: number; percentage?: number; driver?: string };
  primary_driver?: string;
};

type EquipmentBreakdown = {
  labor: { impact: number; percentage: number; driver: string };
  quality: { impact: number; percentage: number; driver: string };
  material_waste: { impact: number; percentage: number; driver: string };
  primary_issue: string;
};

type QualityBreakdown = {
  scrap?: { cost: number; percentage: number; driver: string };
  rework?: { cost: number; percentage: number; driver: string };
  material_waste?: { cost: number; percentage: number; driver: string };
  primary_driver: string;
};

type EfficiencyBreakdown = {
  labor?: { impact?: number; percentage?: number; driver?: string };
  material?: { impact?: number; percentage?: number; driver?: string };
  quality?: { impact?: number; percentage?: number; driver?: string };
  primary_driver?: string;
};

export type InsightBreakdown =
  | CostBreakdown
  | EquipmentBreakdown
  | QualityBreakdown
  | EfficiencyBreakdown;

export interface InsightItem {
  id: string;
  amount: number;
  confidence?: number;
  breakdown?: InsightBreakdown;
  narrative?: string; // NEW: Rich narrative text for patterns
}

export interface InsightSection {
  severity: "critical" | "warning";
  label: string;
  count: number;
  items: InsightItem[];
  actions: string[];
}

export interface InsightCard {
  type: "critical" | "warning" | "info";
  category: "cost" | "equipment" | "quality" | "efficiency";
  title: string;
  impact: number;
  sections: InsightSection[];
}

export interface AssistantMessage {
  text: string;
  cards?: InsightCard[];
  followUps?: string[];
}
