"use client";

import { useState } from "react";
import { MessageBubble } from "./message-bubble";
import { ChatInput } from "./chat-input";
import { mockMessages, type ChatMessage } from "@/lib/mockData";

export function ChatInterface() {
  const [messages, setMessages] = useState<ChatMessage[]>(mockMessages);
  const [isLoading, setIsLoading] = useState(false);

  const handleSendMessage = (message: string) => {
    // Add user message
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

    // Simulate AI response delay
    setTimeout(() => {
      const aiResponse: ChatMessage = {
        id: (Date.now() + 1).toString(),
        message:
          "I'm analyzing your production data to provide insights about that question. This is a simulated response for the MVP demo.",
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

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-slate-800 text-white p-4 shrink-0 shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight">Plant Intel</h1>
            <p className="text-sm text-slate-300">
              Plant Alpha • Last updated: 2 hours ago
            </p>
          </div>
          <div className="text-right">
            <div className="text-xs text-green-400 font-medium">● ONLINE</div>
            <div className="text-xs text-slate-400">3 Active Alerts</div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-0">
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

      {/* Input */}
      <div className="shrink-0">
        <ChatInput
          onSendMessage={handleSendMessage}
          disabled={isLoading}
          placeholder="Ask about your production data..."
        />
      </div>
    </div>
  );
}
