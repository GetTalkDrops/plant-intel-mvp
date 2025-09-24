"use client";

import { useState, useEffect, useRef } from "react";
import { MessageBubble } from "./message-bubble";
import { ChatInput } from "./chat-input";
import {
  processManufacturingQuery,
  type ChatMessage,
  type ManufacturingInsight,
} from "@/lib/manufacturingIntelligence";

interface ChatInterfaceProps {
  initialMessage?: string;
  onFileUpload?: (file: File) => void;
  isFreshChat?: boolean;
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

  // Handle initial message
  useEffect(() => {
    if (initialMessage && !initialProcessed.current) {
      initialProcessed.current = true;
      handleSendMessage(initialMessage);
    }
  }, [initialMessage]);

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
      // Get real manufacturing insight from Supabase data
      const insight: ManufacturingInsight = await processManufacturingQuery(
        message
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

  const handleFileUploadInChat = (file: File) => {
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

    // Simulate processing response
    setIsLoading(true);
    setTimeout(() => {
      const processingResponse: ChatMessage = {
        id: "processing-" + Date.now().toString(),
        message:
          "I've processed your CSV data and identified several key insights. Based on the data patterns, I can help you with cost analysis, quality trends, and equipment performance metrics.\n\nWhat specific area would you like me to analyze first?",
        isUser: false,
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };

      setMessages((prev) => [...prev, processingResponse]);
      setIsLoading(false);
    }, 3000);

    if (onFileUpload) {
      onFileUpload(file);
    }
  };

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
