"use client";

import { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { MessageBubble } from "./message-bubble";
import { ChatInput } from "./chat-input";
import { CSVMappingTable, TemplateConfirmation } from "./csv";
import {
  processManufacturingQuery,
  type ManufacturingInsight,
} from "@/lib/analytics/chat-processor";
import { useUser } from "@clerk/nextjs";
import { SavingsTracker } from "./savings-tracker";
import { useSearchParams } from "next/navigation";
import { PlantIntelLogo } from "./plant-intel-logo";
import { useSession, type ChatMessage } from "@/hooks/useSession";
import {
  createUserMessage,
  createAssistantMessage,
  createSystemMessage,
} from "@/lib/utils/messageUtils";
import { useFileUploadV2 } from "@/hooks/useFileUploadV2";

export function UnifiedChatInterface() {
  const { user } = useUser();
  const userEmail = user?.emailAddresses[0]?.emailAddress;
  const searchParams = useSearchParams();
  const sessionParam = searchParams.get("session");

  const [stableSessionId, setStableSessionId] = useState<string | null>(null);

  useEffect(() => {
    setStableSessionId(sessionParam);
  }, [sessionParam]);

  const [isLoading, setIsLoading] = useState(false);
  const [queryCount, setQueryCount] = useState(0);
  const [savingsTrackerDismissed, setSavingsTrackerDismissed] = useState(false);
  const [landingChatInput, setLandingChatInput] = useState("");
  const [isDragOver, setIsDragOver] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [editedMappings, setEditedMappings] = useState<any[]>([]);
  const [editedConfig, setEditedConfig] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    messages,
    setMessages,
    cumulativeSavings,
    setCumulativeSavings,
    isLoadingSession,
  } = useSession({
    userEmail,
    sessionId: stableSessionId,
  });

  console.log(
    "UnifiedChatInterface - messages count:",
    messages.length,
    "sessionId:",
    stableSessionId
  );

  const {
    uploadState,
    mappingData,
    templateMatch,
    error,
    handleFileSelected,
    handleUseTemplate,
    handleEditTemplate,
    handleStartFresh,
    handleMappingsConfirmed,
    handleBackToMapping,
    handleTierConfirmed,
    handleCancel,
  } = useFileUploadV2();

  const isEmpty = messages.length === 0 && !isLoading;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (uploadState === "complete") {
      setMessages((prev) => [
        ...prev,
        createAssistantMessage(
          "Your data has been uploaded successfully and is being analyzed. I'll show you the insights shortly."
        ),
      ]);
      setEditedMappings([]);
      setEditedConfig(null);
      handleCancel();
    }
  }, [uploadState, handleCancel, setMessages]);

  useEffect(() => {
    if (error) {
      setMessages((prev) => [
        ...prev,
        createSystemMessage(
          `Upload error: ${error}. Please try again or contact support if the issue persists.`
        ),
      ]);
    }
  }, [error, setMessages]);

  useEffect(() => {
    if (uploadState === "template-confirmation" && templateMatch) {
      setToastMessage(`Using saved template: ${templateMatch.name}`);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 5000);
    }
  }, [uploadState, templateMatch]);

  const handleSendMessage = async (message: string) => {
    const userMessage = createUserMessage(message);

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    const newQueryCount = queryCount + 1;
    setQueryCount(newQueryCount);

    try {
      const insight: ManufacturingInsight = await processManufacturingQuery(
        message,
        userEmail,
        true
      );

      const aiResponse = createAssistantMessage(
        insight.response,
        insight.cards,
        insight.followUps
      );

      setMessages((prev) => [...prev, aiResponse]);
    } catch (error) {
      console.error("Manufacturing intelligence error:", error);

      const fallbackResponse = createSystemMessage(
        "I'm having trouble accessing the production data. Please try again or check your connection."
      );

      setMessages((prev) => [...prev, fallbackResponse]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLandingChatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (landingChatInput.trim()) {
      handleSendMessage(landingChatInput.trim());
      setLandingChatInput("");
    }
  };

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await handleFileSelected(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      await handleFileSelected(file);
    }
  };

  const handleFileUpload = async (file: File) => {
    await handleFileSelected(file);
  };

  const handleUploadCancel = () => {
    setEditedMappings([]);
    setEditedConfig(null);
    handleCancel();
  };

  const handleMappingComplete = async (
    templateName: string,
    finalMappings: any[],
    config: any
  ) => {
    try {
      if (!mappingData?.file || !mappingData?.headers) {
        throw new Error("No file data available");
      }

      if (!finalMappings || finalMappings.length === 0) {
        throw new Error("No field mappings configured");
      }

      const file = mappingData.file;
      const headers = mappingData.headers;

      // Show processing message
      setMessages((prev) => [
        ...prev,
        createSystemMessage("Processing your data and starting analysis..."),
      ]);

      // Helper function to map CSV data
      const mapCSVData = (file: File, mappings: any[]) => {
        return new Promise<any[]>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            const text = e.target?.result as string;
            const lines = text.split("\n").filter((line) => line.trim());
            const csvHeaders = lines[0].split(",").map((h) => h.trim().replace(/"/g, ""));
            const mappedData: any[] = [];

            for (let i = 1; i < lines.length; i++) {
              const values = lines[i].split(",").map((v) => v.trim().replace(/"/g, ""));
              const row: any = {};
              mappings.forEach((mapping) => {
                if (mapping.targetField) {
                  const sourceIndex = csvHeaders.indexOf(mapping.sourceColumn);
                  if (sourceIndex !== -1) {
                    row[mapping.targetField] = values[sourceIndex];
                  }
                }
              });
              if (Object.keys(row).length > 0) {
                mappedData.push(row);
              }
            }
            resolve(mappedData);
          };
          reader.onerror = () => reject(new Error("Failed to read file"));
          reader.readAsText(file);
        });
      };

      // Helper function to hash file
      const hashFile = async (file: File) => {
        const buffer = await file.arrayBuffer();
        const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
      };

      // Map CSV data
      const mappedData = await mapCSVData(file, finalMappings);
      const headerSignature = JSON.stringify(headers);
      const fileHash = await hashFile(file);

      // Upload with configuration
      const response = await fetch("/api/upload-csv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mappedData,
          mapping: finalMappings,
          analysisConfig: config,
          fileName: file.name,
          headerSignature,
          fileHash,
          mappingName: templateName,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Upload failed");
      }

      // Success - show message and clean up
      setMessages((prev) => [
        ...prev,
        createAssistantMessage(
          "Your data has been uploaded successfully and is being analyzed. I'll show you the insights shortly."
        ),
      ]);

      // Clean up state
      setEditedMappings([]);
      setEditedConfig(null);
      handleCancel();
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        createSystemMessage(
          `Upload error: ${err instanceof Error ? err.message : "Unknown error"}. Please try again.`
        ),
      ]);
      handleCancel();
    }
  };

  if (isEmpty) {
    return (
      <>
        <div className="flex flex-col items-center justify-center h-full p-4 sm:p-6 max-w-4xl mx-auto">
          <div className="text-center mb-6 sm:mb-8">
            <h1 className="mb-2 sm:mb-3 flex justify-center">
              <PlantIntelLogo
                width={240}
                height={72}
                className="w-60 h-18 sm:w-72 sm:h-22"
              />
            </h1>
            <div className="space-y-1">
              <p className="text-sm sm:text-base font-medium text-gray-900">
                Upload your work order data to get started
              </p>
              <p className="text-xs sm:text-sm text-gray-600">
                Or ask a question about your production
              </p>
            </div>
          </div>

          <Card
            className={`w-full max-w-2xl p-4 sm:p-6 transition-all duration-200 ${
              isDragOver
                ? "border-blue-500 bg-blue-50 shadow-lg"
                : "border-gray-300 hover:border-gray-400 hover:shadow-md"
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className="space-y-3">
              <div className="border-b border-gray-200 pb-3">
                <form onSubmit={handleLandingChatSubmit} className="relative">
                  <Input
                    value={landingChatInput}
                    onChange={(e) => setLandingChatInput(e.target.value)}
                    placeholder="Ask about costs, quality, equipment, or efficiency..."
                    className="text-sm h-16 pr-12 resize-none"
                    style={{ lineHeight: "1.4" }}
                  />
                  <Button
                    type="submit"
                    size="sm"
                    disabled={!landingChatInput.trim()}
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

        {showToast && (
          <div className="fixed bottom-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg z-50 flex items-center gap-2">
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
            <span className="text-sm">{toastMessage}</span>
          </div>
        )}

        <Dialog
          open={uploadState === "template-confirmation"}
          onOpenChange={(open) => {
            if (!open) handleUploadCancel();
          }}
        >
          <DialogContent className="max-w-[95vw] sm:max-w-[90vw] lg:max-w-3xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
            <VisuallyHidden>
              <DialogTitle>Template Confirmation</DialogTitle>
              <DialogDescription>Choose whether to use saved template or start fresh</DialogDescription>
            </VisuallyHidden>
            {templateMatch && (
              <TemplateConfirmation
                templateName={templateMatch.name}
                mappings={templateMatch.mappings}
                config={templateMatch.analysisConfig}
                onUseTemplate={handleUseTemplate}
                onEditTemplate={handleEditTemplate}
                onStartFresh={handleStartFresh}
              />
            )}
          </DialogContent>
        </Dialog>

        <Dialog
          open={uploadState === "mapping"}
          onOpenChange={(open) => {
            if (!open) handleUploadCancel();
          }}
        >
          <DialogContent className="max-w-[95vw] sm:max-w-[90vw] lg:max-w-5xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
            <VisuallyHidden>
              <DialogTitle>CSV Mapping Configuration</DialogTitle>
              <DialogDescription>Map your CSV columns to system fields and configure analysis settings</DialogDescription>
            </VisuallyHidden>
            {mappingData && (
              <CSVMappingTable
                csvHeaders={mappingData.headers}
                sampleRows={mappingData.sampleRows}
                initialMappings={mappingData.initialMappings}
                defaultConfig={mappingData.analysisConfig}
                templateName={mappingData.templateName}
                usingSavedTemplate={!!mappingData.templateName}
                onMappingsChange={setEditedMappings}
                onConfigChange={setEditedConfig}
                onContinue={async (templateName) => {
                  const finalMappings = editedMappings.length > 0 ? editedMappings : mappingData.initialMappings;
                  const config = editedConfig || mappingData.analysisConfig!;
                  await handleMappingComplete(templateName, finalMappings, config);
                }}
                onCancel={handleUploadCancel}
              />
            )}
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <div className="flex-1 overflow-y-auto">
        <div className="w-full max-w-4xl mx-auto px-3 sm:px-4 py-3 sm:py-6 overflow-x-hidden">
          {cumulativeSavings > 0 && !savingsTrackerDismissed && (
            <SavingsTracker
              savings={cumulativeSavings}
              onDismiss={() => setSavingsTrackerDismissed(true)}
            />
          )}

          {messages.map((message) => (
            <MessageBubble
              key={message.id}
              message={message.message}
              isUser={message.isUser}
              timestamp={message.timestamp}
              investigations={message.investigations}
              cards={message.cards}
              followUps={message.followUps}
            />
          ))}

          {isLoading && (
            <MessageBubble
              message="Analyzing your manufacturing data..."
              isUser={false}
              timestamp="Now"
            />
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      <ChatInput
        onSendMessage={handleSendMessage}
        onFileUpload={handleFileUpload}
        disabled={isLoading}
        placeholder="Ask about production performance, costs, quality, or equipment..."
      />

      {showToast && (
        <div className="fixed bottom-20 right-4 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg z-50 flex items-center gap-2">
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
          <span className="text-sm">{toastMessage}</span>
        </div>
      )}

      <Dialog
        open={uploadState === "template-confirmation"}
        onOpenChange={(open) => {
          if (!open) handleUploadCancel();
        }}
      >
        <DialogContent className="max-w-[95vw] sm:max-w-[90vw] lg:max-w-3xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <VisuallyHidden>
            <DialogTitle>Template Confirmation</DialogTitle>
            <DialogDescription>Choose whether to use saved template or start fresh</DialogDescription>
          </VisuallyHidden>
          {templateMatch && (
            <TemplateConfirmation
              templateName={templateMatch.name}
              mappings={templateMatch.mappings}
              config={templateMatch.analysisConfig}
              onUseTemplate={handleUseTemplate}
              onEditTemplate={handleEditTemplate}
              onStartFresh={handleStartFresh}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={uploadState === "mapping"}
        onOpenChange={(open) => {
          if (!open) handleUploadCancel();
        }}
      >
        <DialogContent className="max-w-[95vw] sm:max-w-[90vw] lg:max-w-5xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <VisuallyHidden>
            <DialogTitle>CSV Mapping Configuration</DialogTitle>
            <DialogDescription>Map your CSV columns to system fields and configure analysis settings</DialogDescription>
          </VisuallyHidden>
          {mappingData && (
            <CSVMappingTable
              csvHeaders={mappingData.headers}
              sampleRows={mappingData.sampleRows}
              initialMappings={mappingData.initialMappings}
              defaultConfig={mappingData.analysisConfig}
              templateName={mappingData.templateName}
              usingSavedTemplate={!!mappingData.templateName}
              onMappingsChange={setEditedMappings}
              onConfigChange={setEditedConfig}
              onContinue={async (templateName) => {
                const finalMappings = editedMappings.length > 0 ? editedMappings : mappingData.initialMappings;
                const config = editedConfig || mappingData.analysisConfig!;
                await handleMappingComplete(templateName, finalMappings, config);
              }}
              onCancel={handleUploadCancel}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
