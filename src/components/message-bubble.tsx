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
                {message}
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

  // PI messages - left-aligned
  return (
    <div className="relative mb-6">
      <div className="text-sm text-gray-600 mb-1 pl-9">
        {timestamp}
      </div>
      
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-500 flex items-center justify-center text-xs font-medium text-white">
          PI
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="prose prose-sm max-w-none text-gray-800">
            {message.split('\n').map((line, index) => {
              if (line.startsWith('**') && line.endsWith('**')) {
                return (
                  <h4 key={index} className="font-semibold text-gray-900 mt-4 mb-2 first:mt-0">
                    {line.replace(/\*\*/g, '')}
                  </h4>
                );
              }
              if (line.startsWith('•')) {
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

          {costImpact && (
            <div className="mt-3 p-3 bg-red-50 border-l-4 border-red-400 rounded-r">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-red-800">
                  Cost Impact: ${costImpact.toLocaleString()}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
