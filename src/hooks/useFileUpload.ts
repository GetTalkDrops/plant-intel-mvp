/**
 * File Upload Hook - Routes through Next.js API
 */

import { useState } from "react";
import { type ColumnMapping } from "@/lib/csv/csvMapper";
import { type ChatMessage } from "@/hooks/useSession";

// Route through Next.js, not Python directly
const API_BASE = ""; // Empty = same origin (Next.js)

export interface PendingMapping {
  fileName: string;
  file: File;
  mappings: ColumnMapping[];
  unmappedColumns: string[];
  usingSavedMapping?: boolean;
  savedFileName?: string;
  savedMappingName?: string;
}

interface UseFileUploadProps {
  userEmail: string | undefined;
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
  setCumulativeSavings: React.Dispatch<React.SetStateAction<number>>;
}

export function useFileUpload({
  userEmail,
  setMessages,
  setIsLoading,
  setCumulativeSavings,
}: UseFileUploadProps) {
  const [showMappingModal, setShowMappingModal] = useState(false);
  const [pendingMapping, setPendingMapping] = useState<PendingMapping | null>(
    null
  );
  const [isDragOver, setIsDragOver] = useState(false);

  /**
   * Step 1: Analyze file - now routes through Next.js
   */
  const analyzeFile = async (file: File): Promise<boolean> => {
    if (!userEmail) {
      console.error("User email not available");
      return false;
    }

    try {
      const formData = new FormData();
      formData.append("file", file);

      // Keep analysis in Python (it works)
      const response = await fetch("http://localhost:8000/upload/csv/analyze", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();
      console.log("Analyze result:", result);

      if (!result.success) {
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            message: `Failed to analyze CSV: ${
              result.error || "Unknown error"
            }`,
            isUser: false,
            timestamp: new Date().toISOString(),
          },
        ]);
        return false;
      }

      const mappings: ColumnMapping[] = Object.entries(
        result.mapping_suggestions as Record<string, string>
      ).map(([targetField, sourceColumn]) => ({
        sourceColumn,
        targetField,
        confidence: 0.9,
        dataType: inferDataType(targetField),
      }));

      setPendingMapping({
        fileName: file.name,
        file,
        mappings,
        unmappedColumns: result.unmapped_columns || [],
        usingSavedMapping: false,
      });

      setShowMappingModal(true);
      return true;
    } catch (error) {
      console.error("File analysis error:", error);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          message: `Error analyzing file: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
          isUser: false,
          timestamp: new Date().toISOString(),
        },
      ]);
      return false;
    }
  };

  /**
   * Step 2: Upload through Next.js - triggers auto-analysis
   */
  const uploadFileToBackend = async (
    file: File,
    confirmedMappings: ColumnMapping[]
  ) => {
    if (!userEmail) {
      console.error("User email not available");
      return;
    }

    setIsLoading(true);

    try {
      // Read file as text
      const fileText = await file.text();
      const rows = fileText.split("\n").map((row) => row.split(","));
      const headers = rows[0];
      const dataRows = rows
        .slice(1)
        .filter((row) => row.length === headers.length);

      // Map data using confirmed mappings
      const mappedData = dataRows.map((row) => {
        const obj: Record<string, string> = {};
        confirmedMappings.forEach((mapping) => {
          const sourceIndex = headers.indexOf(mapping.sourceColumn);
          if (sourceIndex !== -1) {
            obj[mapping.targetField] = row[sourceIndex];
          }
        });
        return obj;
      });

      // Changed: Now goes to Next.js upload-csv route
      const response = await fetch("/api/upload-csv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mappedData,
          mapping: confirmedMappings,
          fileName: file.name,
          headerSignature: headers.join(","),
          fileHash: await generateFileHash(fileText),
          mappingName: file.name,
        }),
      });

      const result = await response.json();

      if (result.success) {
        // Extract auto-analysis
        const autoAnalysis = result.autoAnalysis;

        let message = `**Upload Successful!**\n\n`;
        message += `• Uploaded ${result.recordsInserted} work orders\n`;
        message += `• File: ${file.name}\n\n`;

        if (autoAnalysis && !autoAnalysis.error) {
          message += autoAnalysis.executiveSummary;
        }

        const successMessage: ChatMessage = {
          id: Date.now().toString(),
          message,
          isUser: false,
          timestamp: new Date().toISOString(),
          cards: [
            ...(autoAnalysis?.cost?.cards || []),
            ...(autoAnalysis?.equipment?.cards || []),
            ...(autoAnalysis?.quality?.cards || []),
            ...(autoAnalysis?.efficiency?.cards || []),
          ],
        };

        setMessages((prev) => [...prev, successMessage]);

        if (autoAnalysis?.totalSavingsOpportunity) {
          setCumulativeSavings(
            (prev) => prev + autoAnalysis.totalSavingsOpportunity
          );
        }
      } else {
        const errorMessage: ChatMessage = {
          id: Date.now().toString(),
          message: `**Upload Failed**\n\n${result.error || "Unknown error"}`,
          isUser: false,
          timestamp: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, errorMessage]);
      }
    } catch (error) {
      console.error("Upload error:", error);
      const errorMessage: ChatMessage = {
        id: Date.now().toString(),
        message: `**Upload Error**\n\n${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        isUser: false,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (file: File) => {
    const analyzingMessage: ChatMessage = {
      id: Date.now().toString(),
      message: `Analyzing ${file.name}...`,
      isUser: false,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, analyzingMessage]);
    await analyzeFile(file);
  };

  const handleMappingConfirm = async (
    confirmedMappings: ColumnMapping[],
    mappingName: string
  ) => {
    setShowMappingModal(false);
    if (pendingMapping) {
      await uploadFileToBackend(pendingMapping.file, confirmedMappings);
      setPendingMapping(null);
    }
  };

  const handleMappingCancel = () => {
    setShowMappingModal(false);
    setPendingMapping(null);
    const cancelMessage: ChatMessage = {
      id: Date.now().toString(),
      message: "Upload cancelled.",
      isUser: false,
      timestamp: new Date().toISOString(),
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
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

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

function inferDataType(
  fieldName: string
): "string" | "number" | "date" | "boolean" {
  if (
    fieldName.includes("cost") ||
    fieldName.includes("hours") ||
    fieldName.includes("quantity") ||
    fieldName.includes("scrapped")
  ) {
    return "number";
  }
  if (fieldName.includes("date") || fieldName.includes("period")) {
    return "date";
  }
  return "string";
}

async function generateFileHash(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}
