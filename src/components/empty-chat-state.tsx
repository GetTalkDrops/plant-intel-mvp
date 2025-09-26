"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface EmptyChatStateProps {
  onFileUpload: (file: File) => void;
  onChatStart: (message: string) => void;
}

export function EmptyChatState({
  onFileUpload,
  onChatStart,
}: EmptyChatStateProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [chatInput, setChatInput] = useState("");

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    const dataFile = files.find(
      (file) =>
        file.name.endsWith(".csv") ||
        file.name.endsWith(".txt") ||
        file.name.endsWith(".dat") ||
        file.type === "text/csv"
    );

    if (dataFile) {
      onFileUpload(dataFile);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileUpload(file);
    }
  };

  const handleChatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (chatInput.trim()) {
      onChatStart(chatInput.trim());
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-full p-4 sm:p-6 max-w-4xl mx-auto">
      {/* Welcome Message with Logo */}
      <div className="text-center mb-6 sm:mb-8">
        <h1 className="mb-2 sm:mb-3 flex justify-center">
          <svg
            width="240"
            height="72"
            viewBox="0 0 200 60"
            className="w-60 h-18 sm:w-72 sm:h-22"
            xmlns="http://www.w3.org/2000/svg"
          >
            <g transform="translate(20, 30)">
              <circle
                cx="0"
                cy="0"
                r="3"
                fill="currentColor"
                className="text-blue-600"
              />
              <circle
                cx="8"
                cy="0"
                r="2"
                fill="currentColor"
                className="text-blue-600"
              />
              <circle
                cx="-8"
                cy="0"
                r="2"
                fill="currentColor"
                className="text-blue-600"
              />
              <circle
                cx="0"
                cy="8"
                r="2"
                fill="currentColor"
                className="text-blue-600"
              />
              <circle
                cx="0"
                cy="-8"
                r="2"
                fill="currentColor"
                className="text-blue-600"
              />
              <circle
                cx="6"
                cy="6"
                r="1.5"
                fill="currentColor"
                className="text-blue-600"
              />
              <circle
                cx="-6"
                cy="6"
                r="1.5"
                fill="currentColor"
                className="text-blue-600"
              />
              <circle
                cx="6"
                cy="-6"
                r="1.5"
                fill="currentColor"
                className="text-blue-600"
              />
              <circle
                cx="-6"
                cy="-6"
                r="1.5"
                fill="currentColor"
                className="text-blue-600"
              />
            </g>
            <text
              x="50"
              y="37"
              fontFamily="Inter, sans-serif"
              fontSize="18"
              fontWeight="700"
              fill="currentColor"
              className="text-gray-900"
            >
              PLANT INTEL
            </text>
          </svg>
        </h1>
        <div className="text-sm sm:text-base">
          <p className="text-gray-600 mb-2">
            Upload your production data to get intelligent manufacturing
            insights
          </p>
          <p className="text-xs sm:text-sm text-gray-500">
            Supports upload of ERP exports, MES data, and manufacturing reports
          </p>
        </div>
      </div>

      {/* Upload Area - Split with Chat */}
      <Card
        className={`w-full max-w-2xl p-4 border-2 transition-all duration-200 ${
          isDragOver
            ? "border-blue-500 bg-blue-50 shadow-lg"
            : "border-gray-300 hover:border-gray-400 hover:shadow-md"
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="space-y-3">
          {/* Chat Input Section */}
          <div className="border-b border-gray-200 pb-3">
            <form onSubmit={handleChatSubmit} className="relative">
              <Input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Tell me what you manufacture..."
                className="text-sm h-16 pr-12 resize-none"
                style={{ lineHeight: "1.4" }}
              />
              <Button
                type="submit"
                size="sm"
                disabled={!chatInput.trim()}
                className="absolute bottom-2 right-2 h-8 w-8 p-0 bg-blue-600 hover:bg-blue-700"
              >
                <svg
                  className="w-4 h-4"
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
            </form>
          </div>

          {/* Upload Section */}
          <div className="text-center">
            <div className="mb-2">
              <svg
                className="w-6 h-6 mx-auto text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
            </div>

            <p className="text-xs text-gray-700 mb-2 font-medium">
              Drop your data file here or click to browse
            </p>

            <input
              type="file"
              accept=".csv,.txt,.dat,.json,.xml"
              onChange={handleFileInput}
              className="hidden"
              id="file-upload"
            />
            <Button
              asChild
              className="bg-blue-600 hover:bg-blue-700 px-4 py-1.5 text-xs font-medium"
            >
              <label htmlFor="file-upload" className="cursor-pointer">
                Choose File
              </label>
            </Button>
          </div>
        </div>
      </Card>

      {/* What to Expect Section */}
      <div className="w-full max-w-2xl mt-8">
        <h3 className="text-sm sm:text-base font-semibold text-gray-800 mb-3 text-center">
          Uncover key insights from your data:
        </h3>
        <div className="flex flex-wrap justify-center gap-x-6 gap-y-3 text-xs text-gray-600 px-4">
          <div className="flex items-center space-x-2">
            <div className="w-5 h-5 flex-shrink-0">
              <svg
                className="w-full h-full"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
                />
              </svg>
            </div>
            <span>Cost Analysis</span>
          </div>

          <div className="flex items-center space-x-2">
            <div className="w-5 h-5 flex-shrink-0">
              <svg
                className="w-full h-full"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
            </div>
            <span>Quality</span>
          </div>

          <div className="flex items-center space-x-2">
            <div className="w-5 h-5 flex-shrink-0">
              <svg
                className="w-full h-full"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
            </div>
            <span>Equipment</span>
          </div>

          <div className="flex items-center space-x-2">
            <div className="w-5 h-5 flex-shrink-0">
              <svg
                className="w-full h-full"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z"
                />
              </svg>
            </div>
            <span>Recommendations</span>
          </div>
        </div>
      </div>
    </div>
  );
}
