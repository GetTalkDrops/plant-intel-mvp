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
      <div className="relative mb-4 sm:mb-6">
        <div className="text-xs sm:text-sm text-gray-600 mb-1 text-right pr-8 sm:pr-9">
          {timestamp}
        </div>

        <div className="flex items-start gap-2 sm:gap-3 justify-end">
          <div className="flex-1 min-w-0 max-w-[85%] sm:max-w-[80%]">
            <div className="text-right">
              <div className="text-sm sm:text-base text-gray-800 leading-relaxed font-medium">
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
    <div className="relative mb-4 sm:mb-6">
      <div className="text-xs sm:text-sm text-gray-600 mb-1 pl-8 sm:pl-9">
        {timestamp}
      </div>

      <div className="flex items-start gap-2 sm:gap-3">
        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-500 flex items-center justify-center text-xs font-medium text-white">
          PI
        </div>

        <div className="flex-1 min-w-0">
          {/* Main message text */}
          <div className="prose prose-sm max-w-none text-gray-800 text-sm sm:text-base">
            {(message || "").split("\n").map((line, index) => {
              if (line.startsWith("**") && line.endsWith("**")) {
                return (
                  <h4
                    key={index}
                    className="font-semibold text-gray-900 mt-3 sm:mt-4 mb-1.5 sm:mb-2 first:mt-0 text-sm sm:text-base"
                  >
                    {line.replace(/\*\*/g, "")}
                  </h4>
                );
              }
              if (line.startsWith("•")) {
                return (
                  <div
                    key={index}
                    className="ml-3 sm:ml-4 mb-1 text-sm sm:text-base"
                  >
                    {line}
                  </div>
                );
              }
              return line ? (
                <p
                  key={index}
                  className="mb-1.5 sm:mb-2 last:mb-0 leading-relaxed text-sm sm:text-base"
                >
                  {line}
                </p>
              ) : (
                <div key={index} className="h-1.5 sm:h-2" />
              );
            })}
          </div>

          {/* Insight Cards */}
          {cards && cards.length > 0 && (
            <div className="mt-2 sm:mt-3 space-y-2 sm:space-y-3">
              {cards.map((card, idx) => (
                <InsightCard key={idx} card={card} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
