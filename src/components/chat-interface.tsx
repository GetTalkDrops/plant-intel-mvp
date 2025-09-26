"use client";

import { useState, useEffect, useRef } from "react";
import { MessageBubble } from "./message-bubble";
import { ChatInput } from "./chat-input";
import {
  processManufacturingQuery,
  type ManufacturingInsight,
} from "@/lib/manufacturingIntelligence";
import { processFileUpload, type ColumnMapping } from "@/lib/csvMapper";

// Define ChatMessage type locally
type ChatMessage = {
  id: string;
  message: string;
  isUser: boolean;
  timestamp: string;
  costImpact?: number;
};

interface ChatInterfaceProps {
  initialMessage?: string;
  onFileUpload?: (file: File) => void;
  isFreshChat?: boolean;
}

interface CSVMappingResponse {
  mappings?: ColumnMapping[];
  unmappedColumns?: string[];
  requiredFieldsCovered?: string[];
  missingRequiredFields?: string[];
  confidence?: number;
}

export function ChatInterface({
  initialMessage,
  onFileUpload,
  isFreshChat = false,
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [queryCount, setQueryCount] = useState(0);
  const initialProcessed = useRef(false);

  // Handle initial message with useCallback to fix dependency warning
  const handleSendMessage = async (message: string) => {
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      message,
      isUser: true,
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    // Increment query count
    const newQueryCount = queryCount + 1;
    setQueryCount(newQueryCount);

    try {
      // Get manufacturing insight with AI enhancement
      const insight: ManufacturingInsight = await processManufacturingQuery(
        message,
        undefined,
        true // Enable AI enhancement
      );

      let responseText = insight.response;

      // Add minimal conversion prompt after 5 queries
      if (newQueryCount >= 5) {
        responseText +=
          "\n\n---\nSee what's possible with your actual production data → [Start Free Trial]";
      }

      const aiResponse: ChatMessage = {
        id: (Date.now() + 1).toString(),
        message: responseText,
        isUser: false,
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        costImpact: insight.costImpact,
      };

      setMessages((prev) => [...prev, aiResponse]);
    } catch (error) {
      console.error("Manufacturing intelligence error:", error);

      const fallbackResponse: ChatMessage = {
        id: (Date.now() + 1).toString(),
        message:
          "I'm having trouble accessing the production data. Please try again or check your connection.",
        isUser: false,
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };

      setMessages((prev) => [...prev, fallbackResponse]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (initialMessage && !initialProcessed.current) {
      initialProcessed.current = true;
      handleSendMessage(initialMessage);
    }
  }, [initialMessage]);

  const handleFileUploadInChat = async (file: File) => {
    console.log("Starting file upload:", file.name, file.size);

    const uploadMessage: ChatMessage = {
      id: "upload-" + Date.now().toString(),
      message: `Analyzing uploaded data: ${file.name}`,
      isUser: true,
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    setMessages((prev) => [...prev, uploadMessage]);
    setIsLoading(true);

    try {
      console.log("About to call processFileUpload...");

      const fileResult = await processFileUpload(file);
      const { headers, sampleRows, fileType, processingNotes } = fileResult;

      if (headers.length === 0) {
        throw new Error("Unable to process file format or file is empty");
      }

      console.log("Headers found:", headers.length, headers.slice(0, 5));
      console.log("Sample rows:", sampleRows.length);

      // Get CSV mapping suggestions with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      let mapping: CSVMappingResponse;

      try {
        const mappingResponse = await fetch("/api/csv-mapping", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ headers, sampleRows }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!mappingResponse.ok) {
          throw new Error(`Mapping service error: ${mappingResponse.status}`);
        }

        mapping = (await mappingResponse.json()) as CSVMappingResponse;
        console.log("Mapping result:", mapping);
      } catch (apiError: unknown) {
        clearTimeout(timeoutId);

        const errorMessage =
          apiError instanceof Error ? apiError.message : "Unknown API error";

        if (apiError instanceof Error && apiError.name === "AbortError") {
          throw new Error("API call timed out after 30 seconds");
        } else {
          throw new Error(`Mapping API error: ${errorMessage}`);
        }
      }

      // Create response with mapping results
      const mappingsList = mapping.mappings || [];
      const unmappedList = mapping.unmappedColumns || [];

      const processingResponse: ChatMessage = {
        id: "mapping-" + Date.now().toString(),
        message: `**SAP CSV Analysis Complete**

**File:** ${file.name}
**Headers Found:** ${headers.length}
**Sample Rows:** ${sampleRows.length}
**File Type:** ${fileType.toUpperCase()}

**SAP Field Mappings:**
${
  mappingsList.length > 0
    ? mappingsList
        .map(
          (m) =>
            `• ${m.sourceColumn} → ${m.targetField} (${Math.round(
              m.confidence * 100
            )}%)`
        )
        .join("\n")
    : "No standard manufacturing mappings found"
}

**Unmapped Columns:** ${unmappedList.slice(0, 5).join(", ") || "None"}
${unmappedList.length > 5 ? ` + ${unmappedList.length - 5} more` : ""}

**Processing Notes:** ${processingNotes.join(", ") || "None"}

Your SAP data is now ready for analysis. I can examine equipment performance, cost variance, quality patterns, and operational efficiency. What specific insights would you like me to provide?`,
        isUser: false,
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };

      setMessages((prev) => [...prev, processingResponse]);
    } catch (error: unknown) {
      console.error("CSV processing error:", error);

      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      const errorResponse: ChatMessage = {
        id: "error-" + Date.now().toString(),
        message: `I encountered an issue processing your SAP file: ${errorMessage}

Please ensure your file is:
• A valid CSV format
• Contains column headers in the first row  
• Has at least some data rows
• Is not corrupted or too large

You can try uploading again or contact support if the issue persists.`,
        isUser: false,
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };

      setMessages((prev) => [...prev, errorResponse]);
    } finally {
      setIsLoading(false);
    }

    if (onFileUpload) {
      onFileUpload(file);
    }
  };

  // Remove unused variable warning
  console.log(`Active queries: ${queryCount}`);

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Messages with responsive margins */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-2 sm:px-4 py-3 sm:py-6">
          {messages.length === 0 && !isLoading && (
            <div className="text-center text-gray-500 mt-8">
              <p className="text-lg font-medium mb-2">
                Ready to analyze your manufacturing data
              </p>
              <p className="text-sm">
                Ask about production performance, cost analysis, quality issues,
                or equipment status
              </p>
            </div>
          )}

          {messages.map((message) => (
            <MessageBubble
              key={message.id}
              message={message.message}
              isUser={message.isUser}
              costImpact={message.costImpact}
              timestamp={message.timestamp}
            />
          ))}

          {isLoading && (
            <MessageBubble
              message="Analyzing your manufacturing data..."
              isUser={false}
              timestamp="Now"
            />
          )}
        </div>
      </div>

      {/* Chat input */}
      <ChatInput
        onSendMessage={handleSendMessage}
        onFileUpload={handleFileUploadInChat}
        disabled={isLoading}
        placeholder="Ask about production performance, costs, quality, or equipment..."
      />
    </div>
  );
}
