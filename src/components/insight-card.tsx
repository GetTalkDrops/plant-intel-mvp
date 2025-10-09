// src/components/insight-card.tsx
import { useState } from "react";
import {
  InsightCard as InsightCardType,
  InsightItem,
} from "@/lib/insight-types";
import { getInsightIcon } from "@/lib/insight-icons";
import { ChevronDown, ChevronUp } from "lucide-react";

interface InsightCardProps {
  card: InsightCardType;
}

export function InsightCard({ card }: InsightCardProps) {
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
        material?: { variance?: number; percentage?: number; driver?: string };
        labor?: { variance?: number; percentage?: number; driver?: string };
        primary_driver?: string;
      };

      if (!bd.material?.variance && !bd.labor?.variance) {
        return (
          <div className="mt-2 text-sm text-gray-500">
            No variance data available
          </div>
        );
      }

      return (
        <div className="mt-2 space-y-1 text-sm">
          {bd.material?.variance !== undefined && (
            <div className="flex justify-between items-center">
              <span className="text-gray-600">
                Materials: {bd.material.driver || "Material variance"}
              </span>
              <span
                className={`font-medium ${
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
          {bd.labor?.variance !== undefined && (
            <div className="flex justify-between items-center">
              <span className="text-gray-600">
                Labor: {bd.labor.driver || "Labor variance"}
              </span>
              <span
                className={`font-medium ${
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
        <div className="mt-2 space-y-1 text-sm">
          {bd.labor.impact > 0 && (
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Labor: {bd.labor.driver}</span>
              <span className="font-medium text-red-600">
                ${bd.labor.impact.toLocaleString()}
                <span className="text-gray-500 ml-1">
                  ({bd.labor.percentage.toFixed(1)}%)
                </span>
              </span>
            </div>
          )}
          {bd.quality.impact > 0 && (
            <div className="flex justify-between items-center">
              <span className="text-gray-600">
                Quality: {bd.quality.driver}
              </span>
              <span className="font-medium text-red-600">
                ${bd.quality.impact.toLocaleString()}
                <span className="text-gray-500 ml-1">
                  ({bd.quality.percentage.toFixed(1)}%)
                </span>
              </span>
            </div>
          )}
          {bd.material_waste.impact > 0 && (
            <div className="flex justify-between items-center">
              <span className="text-gray-600">
                Material Waste: {bd.material_waste.driver}
              </span>
              <span className="font-medium text-red-600">
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
        <div className="mt-2 space-y-1 text-sm">
          {bd.scrap && bd.scrap.cost > 0 && (
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Scrap: {bd.scrap.driver}</span>
              <span className="font-medium text-red-600">
                ${bd.scrap.cost.toLocaleString()}
                <span className="text-gray-500 ml-1">
                  ({bd.scrap.percentage.toFixed(1)}%)
                </span>
              </span>
            </div>
          )}
          {bd.rework && bd.rework.cost > 0 && (
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Rework: {bd.rework.driver}</span>
              <span className="font-medium text-red-600">
                ${bd.rework.cost.toLocaleString()}
                <span className="text-gray-500 ml-1">
                  ({bd.rework.percentage.toFixed(1)}%)
                </span>
              </span>
            </div>
          )}
          {bd.material_waste && bd.material_waste.cost > 0 && (
            <div className="flex justify-between items-center">
              <span className="text-gray-600">
                Material Waste: {bd.material_waste.driver}
              </span>
              <span className="font-medium text-red-600">
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
        <div className="mt-2 text-sm text-gray-500">
          No breakdown data available
        </div>
      );
    }

    return (
      <div className="mt-2 space-y-1 text-sm">
        {bd.labor?.impact && (
          <div className="flex justify-between items-center">
            <span className="text-gray-600">
              Labor: {bd.labor?.driver || "Impact detected"}
            </span>
            <span className="font-medium text-amber-600">
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
          <div className="flex justify-between items-center">
            <span className="text-gray-600">
              Material: {bd.material?.driver || "Impact detected"}
            </span>
            <span className="font-medium text-amber-600">
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
          <div className="flex justify-between items-center">
            <span className="text-gray-600">
              Quality: {bd.quality?.driver || "Impact detected"}
            </span>
            <span className="font-medium text-amber-600">
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
    <div className={`rounded-lg border-2 p-4 my-3 ${cardBg}`}>
      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        <SeverityIcon
          className={`w-5 h-5 ${severityConfig.color} flex-shrink-0 mt-0.5`}
        />
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <CategoryIcon className={`w-4 h-4 ${categoryConfig.color}`} />
            <h4 className="font-semibold text-gray-900">{card.title}</h4>
          </div>
        </div>
      </div>

      {/* Impact */}
      {card.impact !== undefined && card.impact > 0 && (
        <div className="text-lg font-bold text-gray-900 mb-3">
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
            <div key={idx} className="mb-3">
              <button
                onClick={() => toggleSection(idx)}
                className={`w-full flex items-center justify-between p-2 rounded ${sectionBg} hover:opacity-80 transition-opacity`}
              >
                <span className={`font-medium ${sectionColor}`}>
                  {section.label} ({section.count})
                </span>
                {isExpanded ? (
                  <ChevronUp className={`w-4 h-4 ${sectionColor}`} />
                ) : (
                  <ChevronDown className={`w-4 h-4 ${sectionColor}`} />
                )}
              </button>

              {isExpanded && (
                <div className="mt-2 space-y-2 pl-2">
                  {section.items.map((item, itemIdx) => (
                    <div
                      key={itemIdx}
                      className="py-2 border-b border-gray-200 last:border-0"
                    >
                      {/* Item ID and Amount */}
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-medium text-gray-900">
                          {item.id}
                        </span>
                        <span className="text-gray-700 font-semibold">
                          ${item.amount.toLocaleString()}
                          {item.confidence !== undefined &&
                          item.confidence > 0 ? (
                            <span className="text-gray-500 ml-1">
                              ({item.confidence.toFixed(1)}
                              {card.category === "cost"
                                ? "% confidence"
                                : card.category === "equipment"
                                ? "% risk"
                                : card.category === "quality"
                                ? "% issue rate"
                                : "% efficiency"}
                              )
                            </span>
                          ) : null}
                        </span>
                      </div>

                      {/* Breakdown - dynamically rendered based on type */}
                      {item.breakdown && renderBreakdown(item.breakdown)}
                      {/* Narrative - Full Analysis */}
                      {item.narrative && (
                        <div className="mt-3 p-3 bg-white rounded border border-gray-200">
                          <div className="text-xs font-semibold text-gray-700 mb-2">
                            FULL ANALYSIS
                          </div>
                          <pre className="text-xs text-gray-600 whitespace-pre-wrap font-sans">
                            {item.narrative}
                          </pre>
                        </div>
                      )}
                    </div>
                  ))}

                  {section.actions.length > 0 && (
                    <div className="mt-3 pt-2 border-t border-gray-300">
                      <div className="text-xs font-medium text-gray-600 mb-1">
                        RECOMMENDED ACTIONS
                      </div>
                      <ul className="space-y-1">
                        {section.actions.map((action, actionIdx) => (
                          <li
                            key={actionIdx}
                            className="text-sm text-gray-800 flex items-start gap-2"
                          >
                            <span className="text-gray-500 mt-0.5">→</span>
                            <span>{action}</span>
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
