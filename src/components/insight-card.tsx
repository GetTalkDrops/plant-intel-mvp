// src/components/insight-card.tsx
import { useState } from "react";
import {
  InsightCard as InsightCardType,
  InsightItem,
} from "@/lib/analytics/insight-types";
import { getInsightIcon } from "@/lib/analytics/insight-icons";
import { ChevronDown, ChevronUp } from "lucide-react";

interface InsightCardProps {
  card: InsightCardType;
}

export function InsightCard({ card }: InsightCardProps) {
  console.log("InsightCard received:", card);
  const [expandedSections, setExpandedSections] = useState<Set<number>>(
    new Set()
  );

  const severityConfig = getInsightIcon(card.type);
  const categoryConfig = getInsightIcon(card.category);

  const SeverityIcon = severityConfig.icon;
  const CategoryIcon = categoryConfig.icon;

  const cardBg = "bg-gray-50 border-gray-200";

  const toggleSection = (index: number) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedSections(newExpanded);
  };

  const renderBreakdown = (
    breakdown: NonNullable<InsightItem["breakdown"]>
  ): React.ReactElement | null => {
    // Cost breakdown
    if (
      "material" in breakdown &&
      "labor" in breakdown &&
      "primary_driver" in breakdown &&
      !("primary_issue" in breakdown)
    ) {
      const bd = breakdown as {
        material?: {
          variance?: number;
          percentage?: number;
          driver?: string;
          context?: string;
        };
        labor?: {
          variance?: number;
          percentage?: number;
          driver?: string;
          context?: string;
        };
        primary_driver?: string;
      };

      if (!bd.material?.variance && !bd.labor?.variance) {
        return (
          <div className="mt-2 text-xs sm:text-sm text-gray-500">
            No variance data available
          </div>
        );
      }

      return (
        <div className="mt-2 space-y-1 text-xs sm:text-sm">
          {bd.material?.variance !== undefined && (
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-0.5 sm:gap-2">
              <span className="text-gray-600 break-words">
                Materials: {bd.material.driver || "Material variance"}
              </span>
              <span
                className={`font-medium whitespace-nowrap ${
                  bd.material.variance >= 0 ? "text-red-600" : "text-green-600"
                }`}
              >
                {bd.material.variance >= 0 ? "+" : ""}$
                {Number(bd.material.variance).toLocaleString()}
                {bd.material.percentage !== undefined && (
                  <span className="text-gray-500 ml-1">
                    ({bd.material.percentage.toFixed(1)}%)
                  </span>
                )}
              </span>
            </div>
          )}
          {bd.material?.context && (
            <div className="text-xs text-gray-500 ml-0 sm:ml-6">
              {bd.material.context}
            </div>
          )}
          {bd.labor?.variance !== undefined && (
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-0.5 sm:gap-2">
              <span className="text-gray-600 break-words">
                Labor: {bd.labor.driver || "Labor variance"}
              </span>
              <span
                className={`font-medium whitespace-nowrap ${
                  bd.labor.variance >= 0 ? "text-red-600" : "text-green-600"
                }`}
              >
                {bd.labor.variance >= 0 ? "+" : ""}$
                {Number(bd.labor.variance).toLocaleString()}
                {bd.labor.percentage !== undefined && (
                  <span className="text-gray-500 ml-1">
                    ({bd.labor.percentage.toFixed(1)}%)
                  </span>
                )}
              </span>
            </div>
          )}
          {bd.labor?.context && (
            <div className="text-xs text-gray-500 ml-0 sm:ml-6">
              {bd.labor.context}
            </div>
          )}
          {bd.primary_driver && (
            <div className="mt-1 pt-1 border-t border-gray-100">
              <span className="text-xs font-medium text-gray-700">
                Primary driver: {bd.primary_driver}
              </span>
            </div>
          )}
        </div>
      );
    }

    // Equipment breakdown
    if ("primary_issue" in breakdown) {
      const bd = breakdown as {
        labor: { impact: number; percentage: number; driver: string };
        quality: { impact: number; percentage: number; driver: string };
        material_waste: { impact: number; percentage: number; driver: string };
        primary_issue: string;
      };
      return (
        <div className="mt-2 space-y-1 text-xs sm:text-sm">
          {bd.labor.impact > 0 && (
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-0.5 sm:gap-2">
              <span className="text-gray-600 break-words">
                Labor: {bd.labor.driver}
              </span>
              <span className="font-medium text-red-600 whitespace-nowrap">
                ${bd.labor.impact.toLocaleString()}
                <span className="text-gray-500 ml-1">
                  ({bd.labor.percentage.toFixed(1)}%)
                </span>
              </span>
            </div>
          )}
          {bd.quality.impact > 0 && (
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-0.5 sm:gap-2">
              <span className="text-gray-600 break-words">
                Quality: {bd.quality.driver}
              </span>
              <span className="font-medium text-red-600 whitespace-nowrap">
                ${bd.quality.impact.toLocaleString()}
                <span className="text-gray-500 ml-1">
                  ({bd.quality.percentage.toFixed(1)}%)
                </span>
              </span>
            </div>
          )}
          {bd.material_waste.impact > 0 && (
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-0.5 sm:gap-2">
              <span className="text-gray-600 break-words">
                Material Waste: {bd.material_waste.driver}
              </span>
              <span className="font-medium text-red-600 whitespace-nowrap">
                ${bd.material_waste.impact.toLocaleString()}
                <span className="text-gray-500 ml-1">
                  ({bd.material_waste.percentage.toFixed(1)}%)
                </span>
              </span>
            </div>
          )}
          <div className="mt-1 pt-1 border-t border-gray-100">
            <span className="text-xs font-medium text-gray-700">
              Primary issue: {bd.primary_issue.replace("_", " ")}
            </span>
          </div>
        </div>
      );
    }

    // Quality breakdown
    if ("scrap" in breakdown && "rework" in breakdown) {
      const bd = breakdown as {
        scrap?: { cost: number; percentage: number; driver: string };
        rework?: { cost: number; percentage: number; driver: string };
        material_waste?: { cost: number; percentage: number; driver: string };
        primary_driver: string;
      };
      return (
        <div className="mt-2 space-y-1 text-xs sm:text-sm">
          {bd.scrap && bd.scrap.cost > 0 && (
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-0.5 sm:gap-2">
              <span className="text-gray-600 break-words">
                Scrap: {bd.scrap.driver}
              </span>
              <span className="font-medium text-red-600 whitespace-nowrap">
                ${bd.scrap.cost.toLocaleString()}
                <span className="text-gray-500 ml-1">
                  ({bd.scrap.percentage.toFixed(1)}%)
                </span>
              </span>
            </div>
          )}
          {bd.rework && bd.rework.cost > 0 && (
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-0.5 sm:gap-2">
              <span className="text-gray-600 break-words">
                Rework: {bd.rework.driver}
              </span>
              <span className="font-medium text-red-600 whitespace-nowrap">
                ${bd.rework.cost.toLocaleString()}
                <span className="text-gray-500 ml-1">
                  ({bd.rework.percentage.toFixed(1)}%)
                </span>
              </span>
            </div>
          )}
          {bd.material_waste && bd.material_waste.cost > 0 && (
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-0.5 sm:gap-2">
              <span className="text-gray-600 break-words">
                Material Waste: {bd.material_waste.driver}
              </span>
              <span className="font-medium text-red-600 whitespace-nowrap">
                ${bd.material_waste.cost.toLocaleString()}
                <span className="text-gray-500 ml-1">
                  ({bd.material_waste.percentage.toFixed(1)}%)
                </span>
              </span>
            </div>
          )}
          <div className="mt-1 pt-1 border-t border-gray-100">
            <span className="text-xs font-medium text-gray-700">
              Primary driver: {bd.primary_driver}
            </span>
          </div>
        </div>
      );
    }

    // Efficiency breakdown (default)
    const bd = breakdown as {
      labor?: { impact?: number; percentage?: number; driver?: string };
      material?: { impact?: number; percentage?: number; driver?: string };
      quality?: { impact?: number; percentage?: number; driver?: string };
      primary_driver?: string;
    };

    if (!bd || typeof bd !== "object") {
      return (
        <div className="mt-2 text-xs sm:text-sm text-gray-500">
          No breakdown data available
        </div>
      );
    }

    return (
      <div className="mt-2 space-y-1 text-xs sm:text-sm">
        {bd.labor?.impact && (
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-0.5 sm:gap-2">
            <span className="text-gray-600 break-words">
              Labor: {bd.labor?.driver || "Impact detected"}
            </span>
            <span className="font-medium text-amber-600 whitespace-nowrap">
              ${Number(bd.labor.impact).toLocaleString()}
              {bd.labor?.percentage && (
                <span className="text-gray-500 ml-1">
                  ({Number(bd.labor.percentage).toFixed(1)}%)
                </span>
              )}
            </span>
          </div>
        )}
        {bd.material?.impact && (
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-0.5 sm:gap-2">
            <span className="text-gray-600 break-words">
              Material: {bd.material?.driver || "Impact detected"}
            </span>
            <span className="font-medium text-amber-600 whitespace-nowrap">
              ${Number(bd.material.impact).toLocaleString()}
              {bd.material?.percentage && (
                <span className="text-gray-500 ml-1">
                  ({Number(bd.material.percentage).toFixed(1)}%)
                </span>
              )}
            </span>
          </div>
        )}
        {bd.quality?.impact && (
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-0.5 sm:gap-2">
            <span className="text-gray-600 break-words">
              Quality: {bd.quality?.driver || "Impact detected"}
            </span>
            <span className="font-medium text-amber-600 whitespace-nowrap">
              ${Number(bd.quality.impact).toLocaleString()}
              {bd.quality?.percentage && (
                <span className="text-gray-500 ml-1">
                  ({Number(bd.quality.percentage).toFixed(1)}%)
                </span>
              )}
            </span>
          </div>
        )}
        {bd.primary_driver && (
          <div className="mt-1 pt-1 border-t border-gray-100">
            <span className="text-xs font-medium text-gray-700">
              Primary driver: {bd.primary_driver}
            </span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={`rounded-lg border-2 p-3 sm:p-4 my-2 sm:my-3 ${cardBg}`}>
      {/* Header */}
      <div className="flex items-start gap-2 sm:gap-3 mb-2 sm:mb-3">
        <SeverityIcon
          className={`w-4 h-4 sm:w-5 sm:h-5 ${severityConfig.color} flex-shrink-0 mt-0.5`}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 sm:gap-2 mb-1">
            <CategoryIcon
              className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${categoryConfig.color} flex-shrink-0`}
            />
            <h4 className="font-semibold text-gray-900 text-sm sm:text-base break-words">
              {card.title}
            </h4>
          </div>
        </div>
      </div>

      {/* Impact */}
      {card.impact !== undefined && card.impact > 0 && (
        <div className="text-base sm:text-lg font-bold text-gray-900 mb-2 sm:mb-3">
          ${card.impact.toLocaleString()} total impact
        </div>
      )}

      {/* Expandable Sections */}
      {card.sections &&
        card.sections.map((section, idx) => {
          const isExpanded = expandedSections.has(idx);
          const sectionColor =
            section.severity === "critical" ? "text-red-700" : "text-amber-700";
          const sectionBg =
            section.severity === "critical" ? "bg-red-100" : "bg-amber-100";

          return (
            <div key={idx} className="mb-2 sm:mb-3">
              <button
                onClick={() => toggleSection(idx)}
                className={`w-full flex items-center justify-between p-1.5 sm:p-2 rounded ${sectionBg} hover:opacity-80 transition-opacity`}
              >
                <span
                  className={`font-medium text-xs sm:text-sm ${sectionColor}`}
                >
                  {section.label} ({section.count})
                </span>
                {isExpanded ? (
                  <ChevronUp
                    className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${sectionColor} flex-shrink-0`}
                  />
                ) : (
                  <ChevronDown
                    className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${sectionColor} flex-shrink-0`}
                  />
                )}
              </button>

              {isExpanded && (
                <div className="mt-2 space-y-2 pl-1 sm:pl-2">
                  {section.items.map((item, itemIdx) => (
                    <div
                      key={itemIdx}
                      className="py-2 border-b border-gray-200 last:border-0"
                    >
                      {/* Item ID and Amount */}
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 mb-1">
                        <span className="font-medium text-gray-900 text-sm break-words">
                          {item.id}
                        </span>
                        <span className="text-gray-700 font-semibold text-xs sm:text-sm">
                          {item.confidence !== undefined &&
                          item.confidence > 0 ? (
                            <span className="text-gray-500 text-xs">
                              {card.category === "cost"
                                ? `Confidence: ${(
                                    item.confidence * 100
                                  ).toFixed(0)}%`
                                : card.category === "equipment"
                                ? `${item.confidence.toFixed(0)}% risk`
                                : card.category === "quality"
                                ? `${item.confidence.toFixed(0)}% issue rate`
                                : `${item.confidence.toFixed(0)}% efficiency`}
                            </span>
                          ) : null}
                        </span>
                      </div>

                      {/* Breakdown - dynamically rendered based on type */}
                      {item.breakdown && renderBreakdown(item.breakdown)}
                      {/* Narrative - Full Analysis */}
                      {item.narrative && (
                        <div className="mt-2 sm:mt-3 p-2 sm:p-3 bg-white rounded border border-gray-200">
                          <div className="text-xs font-semibold text-gray-700 mb-2">
                            FULL ANALYSIS
                          </div>
                          <pre className="text-xs text-gray-600 whitespace-pre-wrap font-sans overflow-x-auto">
                            {item.narrative}
                          </pre>
                        </div>
                      )}
                    </div>
                  ))}

                  {section.actions.length > 0 && (
                    <div className="mt-2 sm:mt-3 pt-2 border-t border-gray-300">
                      <div className="text-xs font-medium text-gray-600 mb-1">
                        RECOMMENDED ACTIONS
                      </div>
                      <ul className="space-y-1">
                        {section.actions.map((action, actionIdx) => (
                          <li
                            key={actionIdx}
                            className="text-xs sm:text-sm text-gray-800 flex items-start gap-2"
                          >
                            <span className="text-gray-500 mt-0.5 flex-shrink-0">
                              →
                            </span>
                            <span className="break-words">{action}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
    </div>
  );
}
