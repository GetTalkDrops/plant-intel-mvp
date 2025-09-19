"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  onFileUpload?: (file: File) => void;
  disabled?: boolean;
  placeholder?: string;
}

const suggestionPrompts = [
  "Cost drivers?",
  "Quality trends",
  "Equipment status?",
  "Improve efficiency?",
];

const fullPrompts = [
  "What are my biggest cost drivers?",
  "Show me quality trends",
  "Which equipment needs attention?",
  "How can I improve efficiency?",
];

export function ChatInput({
  onSendMessage,
  onFileUpload,
  disabled = false,
  placeholder = "Ask about your production data...",
}: ChatInputProps) {
  const [message, setMessage] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !disabled) {
      onSendMessage(message.trim());
      setMessage("");
      setShowSuggestions(false);
    }
  };

  const handleSuggestionClick = (index: number) => {
    onSendMessage(fullPrompts[index]);
    setShowSuggestions(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.name.endsWith(".csv") && onFileUpload) {
      onFileUpload(file);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="px-2 sm:px-4 pb-2 sm:pb-4">
      {/* Responsive suggestion chips */}
      {showSuggestions && (
        <div className="mb-3 sm:mb-4 flex flex-wrap gap-1.5 sm:gap-2 justify-center">
          {suggestionPrompts.map((prompt, index) => (
            <Button
              key={prompt}
              variant="outline"
              size="sm"
              onClick={() => handleSuggestionClick(index)}
              disabled={disabled}
              className="text-xs sm:text-sm h-7 sm:h-8 px-2 sm:px-3 bg-white hover:bg-gray-50 border-gray-200 text-gray-700"
            >
              {prompt}
            </Button>
          ))}
        </div>
      )}

      {/* Chat input card with responsive sizing */}
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg sm:rounded-xl border border-gray-200 shadow-sm">
          <form onSubmit={handleSubmit} className="p-2 sm:p-4">
            {/* Main input row */}
            <div className="flex gap-2 sm:gap-3 mb-1 sm:mb-2">
              <div className="flex-1">
                <Input
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={placeholder}
                  disabled={disabled}
                  className="min-h-[40px] sm:min-h-[48px] text-sm sm:text-base border-0 focus:ring-0 focus:outline-none bg-transparent resize-none"
                />
              </div>
              
              <Button
                type="submit"
                disabled={disabled || !message.trim()}
                className="min-h-[40px] sm:min-h-[48px] px-4 sm:px-6 bg-blue-600 hover:bg-blue-700 rounded-md sm:rounded-lg"
              >
                <svg
                  className="w-3.5 h-3.5 sm:w-4 sm:h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                  />
                </svg>
              </Button>
            </div>

            {/* Upload button row */}
            {onFileUpload && (
              <div className="flex justify-start">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={openFileDialog}
                  disabled={disabled}
                  className="h-6 sm:h-8 px-1 sm:px-2 hover:bg-gray-100 rounded-md text-gray-500 hover:text-gray-700 text-xs sm:text-sm"
                  title="Upload CSV file"
                >
                  <svg
                    className="w-3 h-3 sm:w-4 sm:h-4 mr-1"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                    />
                  </svg>
                  <span className="hidden sm:inline">Upload CSV</span>
                  <span className="sm:hidden">CSV</span>
                </Button>
              </div>
            )}
          </form>
        </div>
      </div>
      
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
}
