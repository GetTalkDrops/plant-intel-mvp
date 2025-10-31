/**
 * Enhanced File Upload Hook - with Data Tier Detection & Validation
 */

import { useState } from "react";
import { type ColumnMapping } from "@/lib/csv/csvMapper";
import { type ChatMessage } from "@/hooks/useSession";

const API_BASE = "";

export interface DataTierInfo {
  tier: 1 | 2 | 3;
  name: string;
  description: string;
  capabilities: string[];
  coverage: number;
  missingForNextTier: string[];
}

export interface ValidationInfo {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface PendingMapping {
  fileName: string;
  file: File;
  mappings: ColumnMapping[];
  unmappedColumns: string[];
  dataTier?: DataTierInfo;
  validation?: ValidationInfo;
  confidence?: number;
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

  const analyzeFile = async (file: File): Promise<boolean> => {
    if (!userEmail) {
      console.error("User email not available");
      return false;
    }

    try {
      const fileText = await file.text();
      const rows = fileText.split("\n").map((row) => row.split(","));
      const headers = rows[0].map((h) => h.trim());
      const sampleRows = rows.slice(1, 4);

      console.log("Analyzing file:", file.name);
      console.log("Headers:", headers);

      // STEP 1: Check for saved mapping first
      const savedMappingResponse = await fetch(
        `/api/csv-mapping/saved?headerSignature=${encodeURIComponent(
          JSON.stringify(headers)
        )}&userEmail=${encodeURIComponent(userEmail)}`
      );
      const savedMappingResult = await savedMappingResponse.json();

      if (savedMappingResult.found) {
        console.log("Found saved mapping:", savedMappingResult.name);

        // Use saved mapping - skip modal and upload directly
        const savedMappings: ColumnMapping[] = savedMappingResult.mapping;
        await uploadFileToBackend(file, savedMappings);
        return true;
      }

      // STEP 2: No saved mapping - do auto-mapping
      const response = await fetch("/api/csv-mapping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          headers,
          sampleRows,
        }),
      });

      const result = await response.json();
      console.log("Mapping result:", result);

      if (!result.success && result.validation?.errors?.length > 0) {
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            message: `**Failed to analyze CSV**\n\n${result.validation.errors.join(
              "\n"
            )}`,
            isUser: false,
            timestamp: new Date().toISOString(),
          },
        ]);
        return false;
      }

      const mappings: ColumnMapping[] = result.mappings.map((m: unknown) => {
        const mapping = m as {
          sourceColumn: string;
          targetField: string;
          confidence: number;
          dataType: string;
        };
        return {
          sourceColumn: mapping.sourceColumn,
          targetField: mapping.targetField,
          confidence: mapping.confidence,
          dataType: mapping.dataType,
        };
      });

      setPendingMapping({
        fileName: file.name,
        file,
        mappings,
        unmappedColumns: result.unmappedColumns || [],
        dataTier: result.dataTier,
        validation: result.validation,
        confidence: result.confidence,
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
      const fileText = await file.text();
      const rows = fileText.split("\n").map((row) => row.split(","));
      const headers = rows[0].map((h) => h.trim());
      const dataRows = rows
        .slice(1)
        .filter((row) => row.length === headers.length);

      const mappedData = dataRows.map((row) => {
        const obj: Record<string, string> = {};
        confirmedMappings.forEach((mapping) => {
          const sourceIndex = headers.indexOf(mapping.sourceColumn);
          if (sourceIndex !== -1) {
            obj[mapping.targetField] = row[sourceIndex].trim();
          }
        });
        return obj;
      });

      console.log(
        `Uploading ${mappedData.length} rows with ${confirmedMappings.length} fields`
      );

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
        const autoAnalysis = result.autoAnalysis;
        const dataTier = result.dataTier;

        let message = `**✓ Upload Successful!**\n\n`;
        message += `Uploaded **${result.recordsInserted}** work orders\n`;
        message += `File: ${file.name}\n\n`;

        if (dataTier) {
          message += `**${dataTier.name}** (Tier ${dataTier.tier})\n`;
          message += `${dataTier.description}\n\n`;

          if (dataTier.missingForNextTier?.length > 0) {
            message += `💡 *Tip: Add **${dataTier.missingForNextTier[0]}** to unlock more analysis*\n\n`;
          }
        }

        if (autoAnalysis && !autoAnalysis.error) {
          message += autoAnalysis.executiveSummary;
        }

        console.log(
          "autoAnalysis.orchestratorData:",
          autoAnalysis?.orchestratorData
        );
        console.log(
          "investigations:",
          autoAnalysis?.orchestratorData?.investigations
        );
        const successMessage: ChatMessage = {
          id: Date.now().toString(),
          message,
          isUser: false,
          timestamp: new Date().toISOString(),
          investigations: autoAnalysis?.orchestratorData?.investigations,
          cards: [
            ...(autoAnalysis?.cost?.cards || []),
            ...(autoAnalysis?.equipment?.cards || []),
            ...(autoAnalysis?.quality?.cards || []),
            ...(autoAnalysis?.efficiency?.cards || []),
          ],
        };

        console.log("successMessage being created:", successMessage);

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

async function generateFileHash(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}
