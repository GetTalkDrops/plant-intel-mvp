"use client";

import { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageBubble } from "./message-bubble";
import { ChatInput } from "./chat-input";
import { CsvMappingModal } from "./csv-mapping-modal";
import {
  processManufacturingQuery,
  type ManufacturingInsight,
} from "@/lib/manufacturingIntelligence";
import { processFileUpload, type ColumnMapping } from "@/lib/csvMapper";
import { useAuth } from "@/contexts/AuthContext";
import { InsightCard } from "@/lib/insight-types";

type ChatMessage = {
  id: string;
  message: string;
  isUser: boolean;
  timestamp: string;
  cards?: InsightCard[];
  followUps?: string[];
};

interface CSVMappingResponse {
  mappings?: ColumnMapping[];
  unmappedColumns?: string[];
  requiredFieldsCovered?: string[];
  missingRequiredFields?: string[];
  confidence?: number;
}

interface PendingMapping {
  mappings: ColumnMapping[];
  unmappedColumns: string[];
  sampleRows: string[][];
  allRows: string[][];
  headers: string[];
  fileName: string;
  headerSignature?: string;
  fileHash?: string;
}

export function UnifiedChatInterface() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [queryCount, setQueryCount] = useState(0);
  const [showMappingModal, setShowMappingModal] = useState(false);
  const [pendingMapping, setPendingMapping] = useState<PendingMapping | null>(
    null
  );

  // Landing page state
  const [landingChatInput, setLandingChatInput] = useState("");
  const [isDragOver, setIsDragOver] = useState(false);

  // Auto-scroll ref
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const isEmpty = messages.length === 0 && !isLoading;

  // Auto-scroll effect
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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

    const newQueryCount = queryCount + 1;
    setQueryCount(newQueryCount);

    try {
      const insight: ManufacturingInsight = await processManufacturingQuery(
        message,
        user?.email,
        true
      );

      const aiResponse: ChatMessage = {
        id: (Date.now() + 1).toString(),
        message: insight.response,
        isUser: false,
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        cards: insight.cards,
        followUps: insight.followUps,
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

  const handleLandingChatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (landingChatInput.trim()) {
      handleSendMessage(landingChatInput.trim());
      setLandingChatInput("");
    }
  };

  const handleFileUpload = async (file: File) => {
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
      const text = await file.text();
      const lines = text.trim().split("\n");

      if (lines.length === 0) {
        throw new Error("File is empty");
      }

      const delimiter = lines[0].includes("\t")
        ? "\t"
        : lines[0].includes(";")
        ? ";"
        : ",";
      const headers = lines[0]
        .split(delimiter)
        .map((h) => h.trim().replace(/"/g, ""));
      const allRows = lines
        .slice(1)
        .map((line) =>
          line.split(delimiter).map((cell) => cell.trim().replace(/"/g, ""))
        );
      const sampleRows = allRows.slice(0, 5);

      console.log(
        `Parsed ${allRows.length} total rows, ${headers.length} columns`
      );

      const { generateHeaderSignature, generateFileHash } = await import(
        "@/lib/file-hash"
      );
      const headerSignature = generateHeaderSignature(headers);
      const fileHash = generateFileHash(text);

      console.log("Header signature:", headerSignature);
      console.log("File hash:", fileHash);

      const savedMappingResponse = await fetch(
        `/api/csv-mapping/saved?headerSignature=${headerSignature}&userEmail=${encodeURIComponent(
          user?.email || "skinner.chris@gmail.com"
        )}`
      );

      let shouldShowModal = true;
      let mappingsList: ColumnMapping[] = [];
      let unmappedList: string[] = [];

      if (savedMappingResponse.ok) {
        const savedData = await savedMappingResponse.json();

        if (savedData.found) {
          console.log("Found saved mapping, auto-applying");
          mappingsList = savedData.mapping;
          unmappedList = [];
          shouldShowModal = false;

          const infoMessage: ChatMessage = {
            id: "mapping-info-" + Date.now().toString(),
            message: `Using saved field mapping for this file structure. Click "Edit Mapping" to modify.`,
            isUser: false,
            timestamp: new Date().toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
          };
          setMessages((prev) => [...prev, infoMessage]);
        }
      }

      if (shouldShowModal) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);

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

          const mapping = (await mappingResponse.json()) as CSVMappingResponse;
          mappingsList = mapping.mappings || [];
          unmappedList = mapping.unmappedColumns || [];
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
      }

      setPendingMapping({
        mappings: mappingsList,
        unmappedColumns: unmappedList,
        sampleRows: sampleRows,
        allRows: allRows,
        headers: headers,
        fileName: file.name,
        headerSignature,
        fileHash,
      });

      if (shouldShowModal) {
        setShowMappingModal(true);
        setIsLoading(false);
      } else {
        await handleMappingConfirmDirect({
          mappings: mappingsList,
          unmappedColumns: unmappedList,
          allRows: allRows,
          headers: headers,
          fileName: file.name,
          headerSignature,
          fileHash,
        });
      }
    } catch (error: unknown) {
      console.error("CSV processing error:", error);

      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      const errorResponse: ChatMessage = {
        id: "error-" + Date.now().toString(),
        message: `I encountered an issue processing your file: ${errorMessage}

Please ensure your file is:
- A valid CSV format
- Contains column headers in the first row  
- Has at least some data rows
- Is not corrupted or too large

You can try uploading again or contact support if the issue persists.`,
        isUser: false,
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };

      setMessages((prev) => [...prev, errorResponse]);
      setIsLoading(false);
    }
  };

  const handleMappingConfirmDirect = async (pendingData: {
    mappings: ColumnMapping[];
    unmappedColumns: string[];
    allRows: string[][];
    headers: string[];
    fileName: string;
    headerSignature?: string;
    fileHash?: string;
  }) => {
    console.log("=== DIRECT MAPPING CONFIRM ===");
    console.log("File:", pendingData.fileName);

    try {
      const mappedData = pendingData.allRows.map((row: string[]) => {
        const rowData: Record<string, string> = {};
        pendingData.headers.forEach((header: string, index: number) => {
          rowData[header] = row[index] || "";
        });
        return rowData;
      });

      console.log(`Uploading ${mappedData.length} rows`);

      const uploadResponse = await fetch("/api/upload-csv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mappedData: mappedData,
          mapping: pendingData.mappings,
          fileName: pendingData.fileName,
          userEmail: user?.email || "skinner.chris@gmail.com",
          headerSignature: pendingData.headerSignature,
          fileHash: pendingData.fileHash,
        }),
      });

      const uploadResult = await uploadResponse.json();

      if (uploadResponse.ok && uploadResult.success) {
        console.log("Upload successful:", uploadResult);

        const successMessage: ChatMessage = {
          id: "storage-success-" + Date.now().toString(),
          message: `✅ Successfully imported ${uploadResult.recordsInserted} work orders from ${pendingData.fileName}`,
          isUser: false,
          timestamp: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
        };
        setMessages((prev) => [...prev, successMessage]);

        // Process auto-analysis results
        if (uploadResult.autoAnalysis && !uploadResult.autoAnalysis.error) {
          const analysis = uploadResult.autoAnalysis;

          // Executive summary message
          const summaryMessage: ChatMessage = {
            id: "summary-" + Date.now().toString(),
            message: analysis.executiveSummary,
            isUser: false,
            timestamp: new Date().toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
          };

          setTimeout(() => {
            setMessages((prev) => [...prev, summaryMessage]);
          }, 500);

          // Cost analysis with cards
          if (analysis.cost?.cards && analysis.cost.cards.length > 0) {
            const costMessage: ChatMessage = {
              id: "cost-" + Date.now().toString(),
              message: analysis.cost.text,
              isUser: false,
              timestamp: new Date().toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              }),
              cards: analysis.cost.cards,
              followUps: analysis.cost.followUps,
            };

            setTimeout(() => {
              setMessages((prev) => [...prev, costMessage]);
            }, 1000);
          }

          // Equipment analysis - already formatted by backend
          if (
            analysis.equipment?.cards &&
            analysis.equipment.cards.length > 0
          ) {
            const equipmentMessage: ChatMessage = {
              id: "equipment-" + Date.now().toString(),
              message: analysis.equipment.text,
              isUser: false,
              timestamp: new Date().toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              }),
              cards: analysis.equipment.cards,
              followUps: analysis.equipment.followUps,
            };

            setTimeout(() => {
              setMessages((prev) => [...prev, equipmentMessage]);
            }, 1500);
          }

          // Quality analysis - already formatted by backend
          if (analysis.quality?.cards && analysis.quality.cards.length > 0) {
            const qualityMessage: ChatMessage = {
              id: "quality-" + Date.now().toString(),
              message: analysis.quality.text,
              isUser: false,
              timestamp: new Date().toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              }),
              cards: analysis.quality.cards,
              followUps: analysis.quality.followUps,
            };

            setTimeout(() => {
              setMessages((prev) => [...prev, qualityMessage]);
            }, 2000);
          }

          // Efficiency analysis - already formatted by backend
          if (
            analysis.efficiency?.cards &&
            analysis.efficiency.cards.length > 0
          ) {
            const efficiencyMessage: ChatMessage = {
              id: "efficiency-" + Date.now().toString(),
              message: analysis.efficiency.text,
              isUser: false,
              timestamp: new Date().toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              }),
              cards: analysis.efficiency.cards,
              followUps: analysis.efficiency.followUps,
            };

            setTimeout(() => {
              setMessages((prev) => [...prev, efficiencyMessage]);
            }, 2500);
          }

          // Quality analysis - need to format
          if (
            analysis.quality?.insights &&
            analysis.quality.insights.length > 0
          ) {
            import("@/lib/format-ml-response").then(
              ({ formatQualityResponse }) => {
                const formatted = formatQualityResponse(analysis.quality);
                const qualityMessage: ChatMessage = {
                  id: "quality-" + Date.now().toString(),
                  message: formatted.text,
                  isUser: false,
                  timestamp: new Date().toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  }),
                  cards: formatted.cards,
                  followUps: formatted.followUps,
                };

                setTimeout(() => {
                  setMessages((prev) => [...prev, qualityMessage]);
                }, 2000);
              }
            );
          }

          // Efficiency analysis - need to format
          if (
            analysis.efficiency?.insights &&
            analysis.efficiency.insights.length > 0
          ) {
            import("@/lib/format-ml-response").then(
              ({ formatEfficiencyResponse }) => {
                const formatted = formatEfficiencyResponse(analysis.efficiency);
                const efficiencyMessage: ChatMessage = {
                  id: "efficiency-" + Date.now().toString(),
                  message: formatted.text,
                  isUser: false,
                  timestamp: new Date().toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  }),
                  cards: formatted.cards,
                  followUps: formatted.followUps,
                };

                setTimeout(() => {
                  setMessages((prev) => [...prev, efficiencyMessage]);
                }, 2500);
              }
            );
          }
        }
      } else {
        throw new Error(uploadResult.error || "Upload failed");
      }
    } catch (error) {
      console.error("Upload error:", error);

      const errorMessage: ChatMessage = {
        id: "storage-error-" + Date.now().toString(),
        message: "There was an error uploading your data. Please try again.",
        isUser: false,
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMappingConfirm = async (confirmedMappings: ColumnMapping[]) => {
    if (!pendingMapping) return;

    console.log("=== MAPPING CONFIRM STARTED ===");
    console.log("Pending mapping:", pendingMapping.fileName);

    setShowMappingModal(false);

    await handleMappingConfirmDirect({
      mappings: confirmedMappings,
      unmappedColumns: pendingMapping.unmappedColumns,
      allRows: pendingMapping.allRows,
      headers: pendingMapping.headers,
      fileName: pendingMapping.fileName,
      headerSignature: pendingMapping.headerSignature,
      fileHash: pendingMapping.fileHash,
    });
  };

  const handleMappingCancel = () => {
    setShowMappingModal(false);
    setPendingMapping(null);

    const cancelMessage: ChatMessage = {
      id: "cancel-" + Date.now().toString(),
      message:
        "CSV import cancelled. You can upload a different file if needed.",
      isUser: false,
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };
    setMessages((prev) => [...prev, cancelMessage]);
  };

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
      handleFileUpload(dataFile);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  if (isEmpty) {
    return (
      <>
        <div className="flex flex-col items-center justify-center h-full p-4 sm:p-6 max-w-4xl mx-auto">
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
                Supports upload of ERP exports, MES data, and manufacturing
                reports
              </p>
            </div>
          </div>

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

        <CsvMappingModal
          isOpen={showMappingModal}
          fileName={pendingMapping?.fileName || ""}
          mappings={pendingMapping?.mappings || []}
          unmappedColumns={pendingMapping?.unmappedColumns || []}
          onConfirm={handleMappingConfirm}
          onCancel={handleMappingCancel}
        />
      </>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-2 sm:px-4 py-3 sm:py-6">
          {messages.map((message) => (
            <MessageBubble
              key={message.id}
              message={message.message}
              isUser={message.isUser}
              timestamp={message.timestamp}
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

      <CsvMappingModal
        isOpen={showMappingModal}
        fileName={pendingMapping?.fileName || ""}
        mappings={pendingMapping?.mappings || []}
        unmappedColumns={pendingMapping?.unmappedColumns || []}
        onConfirm={handleMappingConfirm}
        onCancel={handleMappingCancel}
      />
    </div>
  );
}
