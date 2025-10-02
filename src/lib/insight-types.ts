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
    items: Array<{
      id: string;
      amount: number;
      confidence: number;
    }>;
    actions: string[];
  }>;
}

export interface AssistantMessage {
  text: string; // main message text
  cards?: InsightCard[]; // 0-2 styled cards
  followUps?: string[]; // suggested next questions
}
