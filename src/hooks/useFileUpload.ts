/**
 * File Upload Hook - Integrated with Chat Interface
 *
 * Provides drag-and-drop, file upload, and CSV mapping workflow
 * Backend handles all parsing, mapping, validation, and storage
 */

import { useState } from "react";
import { type ColumnMapping } from "@/lib/csvMapper";
import { type ChatMessage } from "@/hooks/useSession";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

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
   * Step 1: Analyze file and get mapping suggestions from backend
   */
  const analyzeFile = async (file: File): Promise<boolean> => {
    if (!userEmail) {
      console.error("User email not available");
      return false;
    }

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(`${API_BASE}/upload/csv/analyze`, {
        method: "POST",
        body: formData,
      });

      const result = await response.json();
      console.log("Analyze result:", result);

      if (!result.success) {
        // Show error message in chat
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

      // Convert backend format to ColumnMapping format for the modal
      const mappings: ColumnMapping[] = Object.entries(
        result.mapping_suggestions as Record<string, string>
      ).map(([targetField, sourceColumn]) => ({
        sourceColumn,
        targetField,
        confidence: 0.9,
        dataType: inferDataType(targetField),
      }));

      console.log("Converted mappings:", mappings);

      // Set up pending mapping and show modal
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
   * Step 2: Upload file with confirmed mapping
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
      const formData = new FormData();
      formData.append("file", file);
      formData.append("user_email", userEmail);

      // Convert ColumnMapping[] to backend format
      const mappingDict: Record<string, string> = {};
      confirmedMappings.forEach((m) => {
        mappingDict[m.targetField] = m.sourceColumn;
      });
      formData.append("confirmed_mapping", JSON.stringify(mappingDict));

      const response = await fetch(`${API_BASE}/upload/csv`, {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (result.success) {
        // Success message - simplified without cards
        const successMessage: ChatMessage = {
          id: Date.now().toString(),
          message: ` **Upload Successful!**\n\n• Uploaded ${result.data.rows_inserted} work orders\n• File: ${file.name}\n• Mapping confidence: ${result.data.confidence}%\n\nYou can now query this data!`,
          isUser: false,
          timestamp: new Date().toISOString(),
        };

        setMessages((prev) => [...prev, successMessage]);

        // Update savings tracker if applicable
        if (result.data.savings) {
          setCumulativeSavings((prev) => prev + result.data.savings);
        }
      } else {
        // Error message
        const errorMessage: ChatMessage = {
          id: Date.now().toString(),
          message: `**Upload Failed**\n\n${
            result.error || "Unknown error"
          }\n\n${result.technical_details || ""}`,
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

  /**
   * Handle file upload (from file input or drag-drop)
   */
  const handleFileUpload = async (file: File) => {
    // Show "analyzing" message
    const analyzingMessage: ChatMessage = {
      id: Date.now().toString(),
      message: `Analyzing ${file.name}...`,
      isUser: false,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, analyzingMessage]);

    await analyzeFile(file);
  };

  /**
   * Handle mapping confirmation
   */
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

  /**
   * Handle mapping cancellation
   */
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

  /**
   * Drag and drop handlers
   */
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

  /**
   * File input handler
   */
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

/**
 * Helper: Infer data type from field name
 */
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
