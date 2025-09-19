"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface EmptyChatStateProps {
  onFileUpload: (file: File) => void;
}

export function EmptyChatState({ onFileUpload }: EmptyChatStateProps) {
  const [isDragOver, setIsDragOver] = useState(false);

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
    const csvFile = files.find((file) => file.name.endsWith(".csv"));

    if (csvFile) {
      onFileUpload(csvFile);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.name.endsWith(".csv")) {
      onFileUpload(file);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-full p-4 sm:p-6 max-w-4xl mx-auto">
      {/* Welcome Message */}
      <div className="text-center mb-6 sm:mb-8">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mb-2 sm:mb-3">
          Welcome to Plant Intel
        </h1>
        <p className="text-sm sm:text-base md:text-lg text-gray-600">
          Upload your production data to get intelligent manufacturing insights
        </p>
      </div>

      {/* Upload Area */}
      <Card
        className={`w-full max-w-2xl p-6 sm:p-8 border-2 transition-all duration-200 cursor-pointer mb-6 ${
          isDragOver
            ? "border-blue-500 bg-blue-50 shadow-lg"
            : "border-gray-300 hover:border-gray-400 hover:shadow-md"
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="text-center">
          {/* Upload icon */}
          <div className="mb-4">
            <svg
              className="w-10 h-10 sm:w-12 sm:h-12 mx-auto text-gray-400"
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

          <p className="text-sm sm:text-base text-gray-700 mb-4 font-medium">
            Drop your CSV file here or click to browse
          </p>

          <input
            type="file"
            accept=".csv"
            onChange={handleFileInput}
            className="hidden"
            id="file-upload"
          />
          <Button
            asChild
            className="bg-blue-600 hover:bg-blue-700 px-6 py-2 text-sm sm:text-base font-medium mb-4"
          >
            <label htmlFor="file-upload" className="cursor-pointer">
              Choose File
            </label>
          </Button>

          <p className="text-xs sm:text-sm text-gray-500">
            Supports upload of ERP exports, MES data, and manufacturing reports
          </p>
        </div>
      </Card>

      {/* What to Expect Section - Compact & Neutral */}
      <div className="w-full max-w-2xl">
        <h3 className="text-sm sm:text-base font-semibold text-gray-800 mb-3 text-center">
          Uncover key insights from your data:
        </h3>
        <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 text-xs text-gray-600">
          <div className="flex items-center space-x-1">
            <svg
              className="w-3 h-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2"
              />
            </svg>
            <span>Cost Analysis</span>
          </div>

          <div className="flex items-center space-x-1">
            <svg
              className="w-3 h-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2z"
              />
            </svg>
            <span>Quality</span>
          </div>

          <div className="flex items-center space-x-1">
            <svg
              className="w-3 h-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
            <span>Equipment</span>
          </div>

          <div className="flex items-center space-x-1">
            <svg
              className="w-3 h-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9"
              />
            </svg>
            <span>Recommendations</span>
          </div>
        </div>
      </div>
    </div>
  );
}
