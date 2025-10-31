"use client";

import { useState } from "react";
import {
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import ReactMarkdown from "react-markdown";

export interface Investigation {
  type: string;
  id: string;
  title: string;
  total_impact: number;
  trend: {
    status: string;
    direction: string;
  };
  priority: string;
  insight_count: number;
  materials_affected: string[];
  narrative?: string;
}

interface InvestigationCardProps {
  investigation: Investigation;
}

export function InvestigationCard({ investigation }: InvestigationCardProps) {
  const [expanded, setExpanded] = useState(true);

  const priorityStyles = {
    URGENT: { border: "border-red-500", bg: "bg-red-50", badge: "bg-red-600" },
    NOTABLE: {
      border: "border-yellow-500",
      bg: "bg-yellow-50",
      badge: "bg-yellow-600",
    },
    BACKGROUND: {
      border: "border-gray-300",
      bg: "bg-gray-50",
      badge: "bg-gray-500",
    },
  };

  const style =
    priorityStyles[investigation.priority as keyof typeof priorityStyles] ||
    priorityStyles.BACKGROUND;

  const getTrendIcon = () => {
    if (investigation.trend.direction === "↗")
      return <TrendingUp className="w-4 h-4 text-red-600" />;
    if (investigation.trend.direction === "↘")
      return <TrendingDown className="w-4 h-4 text-green-600" />;
    return <Minus className="w-4 h-4 text-gray-600" />;
  };

  return (
    <div
      className={`border-l-4 ${style.border} ${style.bg} rounded-lg shadow-md mb-4`}
    >
      <div
        className="p-4 cursor-pointer hover:bg-opacity-80 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1">
            <div
              className={`${style.badge} text-white px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1`}
            >
              <AlertCircle className="w-3 h-3" />
              {investigation.priority}
            </div>

            <div className="flex-1">
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                {investigation.title}
              </h3>

              <div className="flex items-center gap-4 text-sm text-gray-700">
                <div className="flex items-center gap-1">
                  <span className="font-semibold">
                    ${investigation.total_impact.toLocaleString()}
                  </span>
                  <span>total impact</span>
                </div>
                <div className="flex items-center gap-1">
                  {getTrendIcon()}
                  <span>{investigation.trend.status}</span>
                </div>
                <div>
                  <span className="text-gray-600">
                    {investigation.insight_count} insights
                  </span>
                </div>
              </div>

              {investigation.materials_affected &&
                investigation.materials_affected.length > 0 && (
                  <div className="mt-2 text-sm text-gray-600">
                    Materials:{" "}
                    {investigation.materials_affected.slice(0, 3).join(", ")}
                    {investigation.materials_affected.length > 3 &&
                      ` +${investigation.materials_affected.length - 3} more`}
                  </div>
                )}
            </div>
          </div>

          {expanded ? (
            <ChevronUp className="w-5 h-5 text-gray-500" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-500" />
          )}
        </div>
      </div>

      {expanded && investigation.narrative && (
        <div className="px-4 pb-4">
          <div className="bg-white rounded-lg p-4 prose prose-sm max-w-none">
            <ReactMarkdown>{investigation.narrative}</ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  );
}
