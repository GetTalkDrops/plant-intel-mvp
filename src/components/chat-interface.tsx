"use client";

import { useState, useEffect, useRef } from "react";
import { MessageBubble } from "./message-bubble";
import { ChatInput } from "./chat-input";
import { mockMessages, type ChatMessage } from "@/lib/mockData";

interface ChatInterfaceProps {
  initialMessage?: string;
  onFileUpload?: (file: File) => void;
  isFreshChat?: boolean;
}

export function ChatInterface({ initialMessage, onFileUpload, isFreshChat = false }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    if (initialMessage || isFreshChat) return [];
    return mockMessages;
  });
  const [isLoading, setIsLoading] = useState(false);
  const initialProcessed = useRef(false);

  useEffect(() => {
    if (initialMessage && !initialProcessed.current) {
      initialProcessed.current = true;
      
      const userMessage: ChatMessage = {
        id: "initial-" + Date.now().toString(),
        message: initialMessage,
        isUser: true,
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };

      setMessages([userMessage]);
      setIsLoading(true);
      
      setTimeout(() => {
        const demoResponse = generateDemoResponse(initialMessage);
        const aiResponse: ChatMessage = {
          id: "demo-" + Date.now().toString(),
          message: demoResponse,
          isUser: false,
          timestamp: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
        };

        setMessages(prev => [...prev, aiResponse]);
        setIsLoading(false);
      }, 2000);
    }
  }, [initialMessage]);

  const generateDemoResponse = (userMessage: string) => {
    const message = userMessage.toLowerCase();
    
    if (message.includes("automotive") || message.includes("car") || message.includes("vehicle")) {
      return "I see you're in automotive manufacturing. Based on typical automotive production data, I can help you analyze:\n\n**Key Areas:**\n• Assembly line efficiency and cycle times\n• Quality control for safety-critical components\n• Supplier material variance tracking\n• Equipment maintenance scheduling\n\nTo provide specific insights, please upload your production data or ask about a particular area you'd like to explore.";
    }
    
    if (message.includes("food") || message.includes("beverage") || message.includes("processing")) {
      return "Food & beverage manufacturing has unique requirements. I can help you monitor:\n\n**Critical Metrics:**\n• Batch quality and consistency\n• Temperature and environmental controls\n• Packaging line efficiency\n• Waste reduction opportunities\n\nUpload your production data or tell me about a specific challenge you're facing.";
    }
    
    if (message.includes("electronics") || message.includes("tech") || message.includes("circuit")) {
      return "Electronics manufacturing requires precision monitoring. I can analyze:\n\n**Focus Areas:**\n• Component placement accuracy\n• Solder joint quality trends\n• Yield rates by product line\n• Clean room efficiency metrics\n\nWhat specific aspect of your electronics production would you like to explore?";
    }
    
    return "Thanks for telling me about your manufacturing operation. I can help you analyze production data to identify:\n\n**Cost Savings Opportunities**\n• Material waste reduction\n• Equipment efficiency improvements\n• Quality variance patterns\n\n**Predictive Insights**\n• Maintenance scheduling\n• Quality issues before they impact production\n• Bottleneck identification\n\nPlease upload your production data, or let me know what specific challenges you're facing on the plant floor.";
  };

  const handleSendMessage = (message: string) => {
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

    setTimeout(() => {
      const aiResponse: ChatMessage = {
        id: (Date.now() + 1).toString(),
        message: "I'm analyzing your production data to provide insights about that question. This is a simulated response for the MVP demo.",
        isUser: false,
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };

      setMessages((prev) => [...prev, aiResponse]);
      setIsLoading(false);
    }, 2000);
  };

  const handleFileUploadInChat = (file: File) => {
    const uploadMessage: ChatMessage = {
      id: "upload-" + Date.now().toString(),
      message: `Uploaded additional data: ${file.name}`,
      isUser: true,
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    setMessages((prev) => [...prev, uploadMessage]);

    if (onFileUpload) {
      onFileUpload(file);
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Messages with responsive margins */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-2 sm:px-4 py-3 sm:py-6">
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
              message="Analyzing your data..."
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
        placeholder="Ask about your production data..."
      />
    </div>
  );
}
