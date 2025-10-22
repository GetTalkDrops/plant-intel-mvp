// src/hooks/useFileUpload.ts
import { useState } from "react";
import { type ColumnMapping } from "@/lib/csvMapper";
import {
  createUploadMessage,
  createErrorMessage,
  createUploadSuccessMessage,
  createAnalysisMessage,
  type ChatMessage,
} from "@/lib/utils/messageUtils";

// ============================================================================
// TYPES
// ============================================================================

interface CSVMappingResponse {
  mappings?: ColumnMapping[];
  unmappedColumns?: string[];
  requiredFieldsCovered?: string[];
  missingRequiredFields?: string[];
  confidence?: number;
}

export interface PendingMapping {
  mappings: ColumnMapping[];
  unmappedColumns: string[];
  sampleRows: string[][];
  allRows: string[][];
  headers: string[];
  fileName: string;
  headerSignature?: string;
  fileHash?: string;
  usingSavedMapping?: boolean;
  savedFileName?: string;
}

// ============================================================================
// HOOK
// ============================================================================

interface UseFileUploadOptions {
  userEmail: string | undefined;
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  setIsLoading: (loading: boolean) => void;
  setCumulativeSavings: React.Dispatch<React.SetStateAction<number>>;
}

interface UseFileUploadReturn {
  // Modal state
  showMappingModal: boolean;
  pendingMapping: PendingMapping | null;

  // Drag and drop state
  isDragOver: boolean;

  // Handlers
  handleFileUpload: (file: File) => Promise<void>;
  handleMappingConfirm: (confirmedMappings: ColumnMapping[]) => Promise<void>;
  handleMappingCancel: () => void;
  handleDragOver: (e: React.DragEvent) => void;
  handleDragLeave: (e: React.DragEvent) => void;
  handleDrop: (e: React.DragEvent) => void;
  handleFileInput: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

/**
 * Custom hook for managing file uploads and CSV mapping
 *
 * Handles:
 * - File parsing and validation
 * - CSV column mapping (AI suggestions + saved mappings)
 * - Drag-and-drop file upload
 * - Mapping modal state
 * - Auto-analysis results processing
 * - Savings tracking updates
 *
 * @param userEmail - Current user's email
 * @param setMessages - Function to update messages array
 * @param setIsLoading - Function to update loading state
 * @param setCumulativeSavings - Function to update cumulative savings
 * @returns File upload state and handlers
 */
export function useFileUpload({
  userEmail,
  setMessages,
  setIsLoading,
  setCumulativeSavings,
}: UseFileUploadOptions): UseFileUploadReturn {
  const [showMappingModal, setShowMappingModal] = useState(false);
  const [pendingMapping, setPendingMapping] = useState<PendingMapping | null>(
    null
  );
  const [isDragOver, setIsDragOver] = useState(false);

  // ============================================================================
  // FILE UPLOAD HANDLER
  // ============================================================================

  const handleFileUpload = async (file: File) => {
    const uploadMessage = createUploadMessage(file.name);

    setMessages((prev) => [...prev, uploadMessage]);
    setIsLoading(true);

    try {
      const text = await file.text();
      const lines = text.trim().split("\n");

      if (lines.length === 0) {
        throw new Error("File is empty");
      }

      // Detect delimiter and parse file
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

      // Generate file signatures for saved mapping lookup
      const { generateHeaderSignature, generateFileHash } = await import(
        "@/lib/file-hash"
      );
      const headerSignature = generateHeaderSignature(headers);
      const fileHash = generateFileHash(text);

      // Check for saved mapping (for pre-fill, not auto-apply)
      const savedMappingResponse = await fetch(
        `/api/csv-mapping/saved?headerSignature=${encodeURIComponent(
          headerSignature
        )}&userEmail=${encodeURIComponent(
          userEmail || "skinner.chris@gmail.com"
        )}`
      );
      let mappingsList: ColumnMapping[] = [];
      let unmappedList: string[] = [];
      let usingSavedMapping = false;
      let savedFileName = "";

      // Try to get saved mapping first (for exact match pre-fill)
      if (savedMappingResponse.ok) {
        const savedData = await savedMappingResponse.json();
        if (savedData.found) {
          mappingsList = savedData.mapping;
          unmappedList = [];
          usingSavedMapping = true;
          savedFileName = savedData.fileName || "previous file";
        }
      }

      // If no saved mapping, get AI suggestions
      if (!usingSavedMapping) {
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

      // ALWAYS show modal (with pre-filled mappings or AI suggestions)
      setPendingMapping({
        mappings: mappingsList,
        unmappedColumns: unmappedList,
        sampleRows: sampleRows,
        allRows: allRows,
        headers: headers,
        fileName: file.name,
        headerSignature,
        fileHash,
        usingSavedMapping,
        savedFileName,
      });

      setShowMappingModal(true);
      setIsLoading(false);
    } catch (error: unknown) {
      console.error("File upload error:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      const errorResponse = createErrorMessage(
        `Error processing file: ${errorMessage}`
      );

      setMessages((prev) => [...prev, errorResponse]);
      setIsLoading(false);
    }
  };

  // ============================================================================
  // MAPPING CONFIRMATION HANDLER
  // ============================================================================

  const handleMappingConfirmDirect = async (pendingData: {
    mappings: ColumnMapping[];
    unmappedColumns: string[];
    allRows: string[][];
    headers: string[];
    fileName: string;
    headerSignature?: string;
    fileHash?: string;
  }) => {
    try {
      const mappedData = pendingData.allRows.map((row: string[]) => {
        const rowData: Record<string, string> = {};
        pendingData.headers.forEach((header: string, index: number) => {
          rowData[header] = row[index] || "";
        });
        return rowData;
      });

      const uploadResponse = await fetch("/api/upload-csv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mappedData: mappedData,
          mapping: pendingData.mappings,
          fileName: pendingData.fileName,
          userEmail: userEmail || "skinner.chris@gmail.com",
          headerSignature: pendingData.headerSignature,
          fileHash: pendingData.fileHash,
        }),
      });

      const uploadResult = await uploadResponse.json();

      if (uploadResponse.ok && uploadResult.success) {
        const successMessage = createUploadSuccessMessage(
          uploadResult.recordsInserted,
          pendingData.fileName
        );
        setMessages((prev) => [...prev, successMessage]);

        // Process auto-analysis results
        if (uploadResult.autoAnalysis && !uploadResult.autoAnalysis.error) {
          const analysis = uploadResult.autoAnalysis;

          // Executive summary message
          const summaryMessage = createAnalysisMessage(
            analysis.executiveSummary,
            "summary"
          );

          setTimeout(() => {
            setMessages((prev) => [...prev, summaryMessage]);
          }, 500);

          // Update savings tracking
          if (uploadResult.autoAnalysis?.totalSavingsOpportunity) {
            setCumulativeSavings((prev) => {
              const newTotal =
                prev + uploadResult.autoAnalysis.totalSavingsOpportunity;
              return newTotal;
            });
          }
          // Extract savings from cost analysis
          if (uploadResult.autoAnalysis?.cost?.totalSavingsOpportunity) {
            setCumulativeSavings(
              (prev) =>
                prev + uploadResult.autoAnalysis.cost.totalSavingsOpportunity
            );
          }

          // Cost analysis with cards
          if (analysis.cost?.cards && analysis.cost.cards.length > 0) {
            const costMessage = createAnalysisMessage(
              analysis.cost.text,
              "cost",
              analysis.cost.cards,
              analysis.cost.followUps
            );

            setTimeout(() => {
              setMessages((prev) => [...prev, costMessage]);
            }, 1000);
          }

          // Equipment analysis - display even if no issues
          if (analysis.equipment) {
            const equipmentMessage = createAnalysisMessage(
              analysis.equipment.text || "No equipment data available.",
              "equipment",
              analysis.equipment.cards,
              analysis.equipment.followUps
            );

            setTimeout(() => {
              setMessages((prev) => [...prev, equipmentMessage]);
            }, 1500);
          }

          // Quality analysis - display even if no issues
          if (analysis.quality) {
            const qualityMessage = createAnalysisMessage(
              analysis.quality.text || "No quality data available.",
              "quality",
              analysis.quality.cards,
              analysis.quality.followUps
            );

            setTimeout(() => {
              setMessages((prev) => [...prev, qualityMessage]);
            }, 2000);
          }

          // Efficiency analysis - display even if no issues
          if (analysis.efficiency) {
            const efficiencyMessage = createAnalysisMessage(
              analysis.efficiency.text || "No efficiency data available.",
              "efficiency",
              analysis.efficiency.cards,
              analysis.efficiency.followUps
            );

            setTimeout(() => {
              setMessages((prev) => [...prev, efficiencyMessage]);
            }, 2500);
          }
        }
      } else {
        throw new Error(uploadResult.error || "Upload failed");
      }
    } catch (error) {
      console.error("Upload error:", error);

      const errorMessage = createErrorMessage(
        "There was an error uploading your data. Please try again."
      );
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMappingConfirm = async (confirmedMappings: ColumnMapping[]) => {
    if (!pendingMapping) return;

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

  // ============================================================================
  // MAPPING CANCEL HANDLER
  // ============================================================================

  const handleMappingCancel = () => {
    setShowMappingModal(false);
    setPendingMapping(null);

    const cancelMessage = createErrorMessage(
      "CSV import cancelled. You can upload a different file if needed."
    );
    setMessages((prev) => [...prev, cancelMessage]);
  };

  // ============================================================================
  // DRAG AND DROP HANDLERS
  // ============================================================================

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

  // ============================================================================
  // RETURN
  // ============================================================================

  return {
    showMappingModal,
    pendingMapping,
    isDragOver,
    handleFileUpload,
    handleMappingConfirm,
    handleMappingCancel,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleFileInput,
  };
}
