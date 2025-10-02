// src/components/message-bubble.tsx
import { InsightCard as InsightCardType } from "@/lib/insight-types";
import { InsightCard } from "./insight-card";

interface MessageBubbleProps {
  message: string;
  isUser: boolean;
  timestamp?: string;
  cards?: InsightCardType[];
  followUps?: string[];
}

export function MessageBubble({
  message,
  isUser,
  timestamp,
  cards,
  followUps,
}: MessageBubbleProps) {
  if (isUser) {
    // User messages - right-aligned, clean
    return (
      <div className="relative mb-6">
        <div className="text-sm text-gray-600 mb-1 text-right pr-9">
          {timestamp}
        </div>

        <div className="flex items-start gap-3 justify-end">
          <div className="flex-1 min-w-0 max-w-[80%]">
            <div className="text-right">
              <div className="text-gray-800 leading-relaxed font-medium">
                {message || ""}
              </div>
            </div>
          </div>

          <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-xs font-medium text-white">
            U
          </div>
        </div>
      </div>
    );
  }

  // PI messages - left-aligned with cards support
  return (
    <div className="relative mb-6">
      <div className="text-sm text-gray-600 mb-1 pl-9">{timestamp}</div>

      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-500 flex items-center justify-center text-xs font-medium text-white">
          PI
        </div>

        <div className="flex-1 min-w-0">
          {/* Main message text */}
          <div className="prose prose-sm max-w-none text-gray-800">
            {(message || "").split("\n").map((line, index) => {
              if (line.startsWith("**") && line.endsWith("**")) {
                return (
                  <h4
                    key={index}
                    className="font-semibold text-gray-900 mt-4 mb-2 first:mt-0"
                  >
                    {line.replace(/\*\*/g, "")}
                  </h4>
                );
              }
              if (line.startsWith("•")) {
                return (
                  <div key={index} className="ml-4 mb-1">
                    {line}
                  </div>
                );
              }
              return line ? (
                <p key={index} className="mb-2 last:mb-0 leading-relaxed">
                  {line}
                </p>
              ) : (
                <div key={index} className="h-2" />
              );
            })}
          </div>

          {/* Insight Cards */}
          {cards && cards.length > 0 && (
            <div className="mt-3">
              {cards.map((card, idx) => (
                <InsightCard key={idx} card={card} />
              ))}
            </div>
          )}

          {/* Follow-up suggestions */}
          {followUps && followUps.length > 0 && (
            <div className="mt-4 pt-3 border-t border-gray-200">
              <div className="text-sm text-gray-600 mb-2">
                Would you like me to:
              </div>
              <div className="flex flex-wrap gap-2">
                {followUps.map((followUp, idx) => (
                  <button
                    key={idx}
                    className="text-sm px-3 py-1.5 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-left"
                  >
                    {followUp}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
