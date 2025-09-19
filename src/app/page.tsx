"use client";

import { useState } from "react";
import { AppLayout } from "@/components/app-layout";
import { ChatInterface } from "@/components/chat-interface";
import { EmptyChatState } from "@/components/empty-chat-state";

export default function Home() {
  const [hasData, setHasData] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingMessage, setProcessingMessage] = useState("");
  const [processingStep, setProcessingStep] = useState(0);
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);
  const [initialChatMessage, setInitialChatMessage] = useState<string>("");
  const [chatKey, setChatKey] = useState(0);
  const [isFreshChat, setIsFreshChat] = useState(false);

  const handleFileUpload = (file: File) => {
    setIsProcessing(true);
    setProcessingStep(0);

    const processingSteps = [
      {
        message: "Uploading and validating file...",
        duration: 1200,
        detail: "Checking data format and structure",
      },
      {
        message: `Processing ${
          Math.floor(Math.random() * 1500) + 800
        } production records...`,
        duration: 1800,
        detail: "Analyzing work orders and material data",
      },
      {
        message: "Identifying cost variances and quality patterns...",
        duration: 1500,
        detail: "Running predictive algorithms",
      },
      {
        message: "Generating actionable insights...",
        duration: 1000,
        detail: "Preparing recommendations",
      },
    ];

    let currentStep = 0;

    const runNextStep = () => {
      if (currentStep < processingSteps.length) {
        const step = processingSteps[currentStep];
        setProcessingMessage(step.message);
        setProcessingStep(currentStep + 1);

        setTimeout(() => {
          currentStep++;
          if (currentStep < processingSteps.length) {
            runNextStep();
          } else {
            setTimeout(() => {
              const timestamp = new Date().toLocaleString();
              const fileName = `${file.name.replace(
                ".csv",
                ""
              )} - ${timestamp}`;

              setUploadedFiles((prev) => [fileName, ...prev]);
              setIsProcessing(false);
              setHasData(true);
              setIsFreshChat(false);
            }, 600);
          }
        }, step.duration);
      }
    };

    runNextStep();
  };

  const handleChatStart = (message: string) => {
    setInitialChatMessage(message);
    setHasData(true);
    setIsFreshChat(false);
  };

  const handleNewChat = () => {
    setInitialChatMessage("");
    setHasData(true);
    setIsFreshChat(true);
    setChatKey(prev => prev + 1);
  };

  const ProcessingState = () => (
    <div className="flex flex-col items-center justify-center h-full p-6">
      <div className="text-center max-w-md">
        <div className="mb-6">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <div className="flex justify-center space-x-2 mb-4">
            {[1, 2, 3, 4].map((step) => (
              <div
                key={step}
                className={`w-2 h-2 rounded-full transition-colors duration-300 ${
                  step <= processingStep ? "bg-blue-600" : "bg-gray-300"
                }`}
              />
            ))}
          </div>
        </div>

        <h2 className="text-xl sm:text-2xl font-semibold text-gray-800 mb-3">
          Processing Data
        </h2>
        <p className="text-base sm:text-lg text-gray-600 mb-2">
          {processingMessage}
        </p>
        <p className="text-sm text-gray-500">Step {processingStep} of 4</p>
      </div>
    </div>
  );

  const isLandingPage = !hasData && !isProcessing;

  return (
    <AppLayout onNewChat={handleNewChat} isLandingPage={isLandingPage}>
      {isProcessing ? (
        <ProcessingState />
      ) : hasData ? (
        <ChatInterface 
          key={chatKey}
          initialMessage={initialChatMessage} 
          onFileUpload={handleFileUpload}
          isFreshChat={isFreshChat}
        />
      ) : (
        <EmptyChatState onFileUpload={handleFileUpload} onChatStart={handleChatStart} />
      )}
    </AppLayout>
  );
}
