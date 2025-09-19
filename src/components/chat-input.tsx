"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

const quickActions = [
  "Show today's alerts",
  "Why is Line 3 over budget?",
  "Equipment status report",
  "Quality trends this week",
];

export function ChatInput({
  onSendMessage,
  disabled = false,
  placeholder = "Ask about your production data...",
}: ChatInputProps) {
  const [message, setMessage] = useState("");
  const [showQuickActions, setShowQuickActions] = useState(true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !disabled) {
      onSendMessage(message.trim());
      setMessage("");
      setShowQuickActions(false);
    }
  };

  const handleQuickAction = (action: string) => {
    onSendMessage(action);
    setShowQuickActions(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <Card className="border-t bg-white shadow-lg">
      {/* Quick Actions */}
      {showQuickActions && (
        <div className="p-4 border-b bg-gray-50">
          <p className="text-xs font-medium text-gray-600 mb-2">
            Quick Actions:
          </p>
          <div className="flex flex-wrap gap-2">
            {quickActions.map((action) => (
              <Button
                key={action}
                variant="outline"
                size="sm"
                onClick={() => handleQuickAction(action)}
                disabled={disabled}
                className="text-xs h-8 px-3"
              >
                {action}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-4">
        <form onSubmit={handleSubmit} className="flex gap-3">
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={placeholder}
            disabled={disabled}
            className="flex-1 min-h-[48px] text-base border-gray-300 focus:border-blue-500"
          />
          <Button
            type="submit"
            disabled={disabled || !message.trim()}
            className="min-h-[48px] px-8 bg-blue-600 hover:bg-blue-700"
          >
            Send
          </Button>
        </form>
      </div>
    </Card>
  );
}
