// src/hooks/useFileUpload.ts - FIXED WITH PROPER TYPES
"use client";

import { useState } from "react";
import { type ChatMessage } from "./useSession";

// Import DataTierInfo type if it exists, otherwise define it
export interface DataTierInfo {
  tier: string;
  name: string;
  description: string;
  capabilities: string[];
  missingForNextTier?: string[];
  hasQuality?: boolean;
  hasEquipment?: boolean;
  hasLabor?: boolean;
  confidence?: number;
}

export interface PendingMapping {
  fileName: string;
  mappings: any[];
  unmappedColumns: string[];
  usingSavedMapping?: boolean;
  savedFileName?: string;
  dataTier?: DataTierInfo; // FIXED: Changed from string to DataTierInfo
  validation?: any;
  confidence?: number;
  headers?: string[];
  sampleRows?: string[][];
  initialMappings?: any[];
}

interface UseFileUploadProps {
  userEmail?: string;
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

  const handleFileUpload = async (file: File) => {
    if (!file) return;

    try {
      setIsLoading(true);

      // Parse CSV and get initial mappings
      const formData = new FormData();
      formData.append("file", file);
      if (userEmail) {
        formData.append("userEmail", userEmail);
      }

      const response = await fetch("/api/csv-upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to upload file");
      }

      const result = await response.json();

      // Show mapping modal with the results
      setPendingMapping({
        fileName: file.name,
        mappings: result.mappings || [],
        unmappedColumns: result.unmappedColumns || [],
        usingSavedMapping: result.usingSavedMapping || false,
        savedFileName: result.savedFileName || "",
        dataTier: result.dataTier, // Already should be DataTierInfo from API
        validation: result.validation,
        confidence: result.confidence,
        headers: result.headers,
        sampleRows: result.sampleRows,
        initialMappings: result.initialMappings,
      });

      setShowMappingModal(true);
    } catch (error) {
      console.error("File upload error:", error);
      // Add error message to chat
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          message:
            "Sorry, there was an error uploading your file. Please try again.",
          isUser: false,
          timestamp: new Date().toLocaleTimeString(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMappingConfirm = async (mappings: any[], config?: any) => {
    setShowMappingModal(false);

    try {
      setIsLoading(true);

      // Process the file with confirmed mappings
      const response = await fetch("/api/csv-process", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fileName: pendingMapping?.fileName,
          mappings,
          config,
          userEmail,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to process file");
      }

      const result = await response.json();

      // Add success message to chat
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          message:
            result.message ||
            "File processed successfully! Analysis is running...",
          isUser: false,
          timestamp: new Date().toLocaleTimeString(),
          cards: result.cards,
        },
      ]);

      // Update savings if provided
      if (result.savings) {
        setCumulativeSavings((prev) => prev + result.savings);
      }

      setPendingMapping(null);
    } catch (error) {
      console.error("File processing error:", error);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          message:
            "Sorry, there was an error processing your file. Please try again.",
          isUser: false,
          timestamp: new Date().toLocaleTimeString(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMappingCancel = () => {
    setShowMappingModal(false);
    setPendingMapping(null);
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
      await handleFileUpload(file);
    }
  };

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await handleFileUpload(file);
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

// Export the type for use in other components
export type { DataTierInfo };
