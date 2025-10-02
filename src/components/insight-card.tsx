// src/components/insight-card.tsx
import { useState } from "react";
import { InsightCard as InsightCardType } from "@/lib/insight-types";
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
      {card.impact && (
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
                      className="flex justify-between items-center py-1 text-sm"
                    >
                      <span className="text-gray-800">{item.id}</span>
                      <span className="text-gray-600">
                        ${item.amount.toLocaleString()} ({item.confidence}%
                        confidence)
                      </span>
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
