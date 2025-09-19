import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface MessageBubbleProps {
  message: string;
  isUser: boolean;
  costImpact?: number;
  timestamp?: string;
}

export function MessageBubble({
  message,
  isUser,
  costImpact,
  timestamp,
}: MessageBubbleProps) {
  return (
    <div
      className={`flex gap-3 mb-6 ${isUser ? "justify-end" : "justify-start"}`}
    >
      {!isUser && (
        <Avatar className="w-10 h-10 shrink-0">
          <AvatarFallback className="bg-blue-600 text-white font-semibold">
            PI
          </AvatarFallback>
        </Avatar>
      )}

      <div
        className={`max-w-[85%] sm:max-w-[70%] ${isUser ? "order-first" : ""}`}
      >
        <Card
          className={`p-4 shadow-sm ${
            isUser
              ? "bg-blue-600 text-white border-blue-600"
              : "bg-white border-gray-200"
          }`}
        >
          <div className="prose prose-sm max-w-none">
            {message.split("\n").map((line, index) => (
              <p
                key={index}
                className={`${line.startsWith("**") ? "font-semibold" : ""} ${
                  index === 0 ? "mt-0" : "mt-2"
                } mb-2 last:mb-0 leading-relaxed`}
              >
                {line.replace(/\*\*/g, "")}
              </p>
            ))}
          </div>

          {costImpact && (
            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-2">
                <span className="text-lg font-semibold text-red-700">$</span>
                <span className="font-semibold text-red-900">
                  Cost Impact: ${costImpact.toLocaleString()}
                </span>
              </div>
            </div>
          )}
        </Card>

        {timestamp && (
          <p className="text-xs text-gray-500 mt-2 px-1">{timestamp}</p>
        )}
      </div>

      {isUser && (
        <Avatar className="w-10 h-10 shrink-0">
          <AvatarFallback className="bg-gray-600 text-white font-semibold">
            You
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  );
}
