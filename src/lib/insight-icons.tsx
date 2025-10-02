// src/lib/insight-icons.tsx
import {
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  DollarSign,
  Wrench,
  Activity,
  TrendingUp,
  Info,
} from "lucide-react";

export const iconConfig = {
  // Severity icons
  critical: { icon: AlertTriangle, color: "text-red-600" },
  warning: { icon: AlertCircle, color: "text-amber-600" },
  positive: { icon: CheckCircle, color: "text-green-600" },
  info: { icon: Info, color: "text-blue-600" },

  // Category icons
  cost: { icon: DollarSign, color: "text-red-600" },
  equipment: { icon: Wrench, color: "text-orange-600" },
  quality: { icon: Activity, color: "text-purple-600" },
  efficiency: { icon: TrendingUp, color: "text-blue-600" },
};

export function getInsightIcon(type: keyof typeof iconConfig) {
  return iconConfig[type] || iconConfig.info;
}
