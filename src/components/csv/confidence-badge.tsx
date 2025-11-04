// src/components/csv/confidence-badge.tsx
"use client";

import { Check, AlertCircle } from "lucide-react";

interface ConfidenceBadgeProps {
  score: number;
  matchType: string;
  showLabel?: boolean;
}

export function ConfidenceBadge({
  score,
  matchType,
  showLabel = false,
}: ConfidenceBadgeProps) {
  const getColor = (score: number) => {
    if (score >= 0.95) return "bg-green-100 text-green-800 border-green-200";
    if (score >= 0.85) return "bg-blue-100 text-blue-800 border-blue-200";
    if (score >= 0.75) return "bg-yellow-100 text-yellow-800 border-yellow-200";
    return "bg-red-100 text-red-800 border-red-200";
  };

  const getMatchTypeLabel = (matchType: string) => {
    switch (matchType) {
      case "exact":
        return "Exact";
      case "synonym":
        return "Synonym";
      case "pattern":
        return "Pattern";
      case "fuzzy":
        return "Fuzzy";
      case "manual":
        return "Manual";
      default:
        return matchType;
    }
  };

  return (
    <div
      className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium border ${getColor(
        score
      )}`}
    >
      {score >= 0.85 ? (
        <Check className="w-3 h-3 shrink-0" />
      ) : (
        <AlertCircle className="w-3 h-3 shrink-0" />
      )}
      <span className="whitespace-nowrap">
        {Math.round(score * 100)}%
        {showLabel && (
          <span className="hidden sm:inline ml-1 opacity-75">
            ({getMatchTypeLabel(matchType)})
          </span>
        )}
      </span>
    </div>
  );
}
