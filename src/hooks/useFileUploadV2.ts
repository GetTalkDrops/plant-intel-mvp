// src/hooks/useFileUploadV2.ts - FIXED EXPORT NAME
/**
 * Enhanced file upload hook with configuration management
 */

import { useState } from "react";
import { DEFAULT_ANALYSIS_CONFIG } from "@/lib/csv/csv-config-defaults";
import type { AnalysisConfig } from "@/lib/csv/csv-config-defaults";

// ==================== TYPE DEFINITIONS ====================

export type { AnalysisConfig };

export interface FieldMapping {
  sourceColumn: string;
  targetField: string | null;
  confidence: number;
  matchType: string;
  dataType: string;
  required: boolean;
}

export interface CSVRow {
  [key: string]: string | number;
}

export interface MappingData {
  file: File;
  headers: string[];
  sampleRows: string[][];
  initialMappings: FieldMapping[];
  finalMappings?: FieldMapping[];
  analysisConfig?: AnalysisConfig;
  templateName?: string;
}

export interface TemplateMatch {
  name: string;
  mappings: FieldMapping[];
  analysisConfig: AnalysisConfig;
}

// ==================== HOOK ====================

// FIXED: Export as useFileUploadV2
export function useFileUploadV2() {
  const [uploadState, setUploadState] = useState<
    "idle" | "mapping" | "tier-preview" | "uploading" | "complete"
  >("idle");

  const [mappingData, setMappingData] = useState<MappingData | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Step 1: File selected, parse and get fuzzy mappings
  const handleFileSelected = async (file: File) => {
    try {
      setError(null);

      // Parse CSV
      const { headers, sampleRows } = await parseCSV(file);

      // Get fuzzy mapping suggestions
      const response = await fetch("/api/csv-mapping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ headers, sampleRows }),
      });

      if (!response.ok) {
        throw new Error("Failed to analyze CSV");
      }

      const { mappings } = await response.json();

      // Check for existing template
      const templateMatch = await checkForTemplate(headers);

      if (templateMatch) {
        // Template found - pre-fill everything
        setMappingData({
          file,
          headers,
          sampleRows,
          initialMappings: templateMatch.mappings,
          finalMappings: templateMatch.mappings,
          analysisConfig: templateMatch.analysisConfig,
          templateName: templateMatch.name,
        });
      } else {
        // No template - use fuzzy results
        setMappingData({
          file,
          headers,
          sampleRows,
          initialMappings: mappings,
          analysisConfig: getDefaultConfig(),
        });
      }

      setUploadState("mapping");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    }
  };

  // Step 2: User confirms mappings + config
  const handleMappingsConfirmed = (
    finalMappings: FieldMapping[],
    analysisConfig: AnalysisConfig
  ) => {
    setMappingData((prev) => ({
      ...prev!,
      finalMappings,
      analysisConfig,
    }));
    setUploadState("tier-preview");
  };

  // Step 3: User confirms tier and proceeds with upload
  const handleTierConfirmed = async () => {
    if (!mappingData?.finalMappings || !mappingData?.analysisConfig) {
      setError("Missing required data");
      return;
    }

    try {
      setUploadState("uploading");

      // Map CSV data
      const mappedData = await mapCSVData(
        mappingData.file,
        mappingData.finalMappings
      );

      // Create header signature for storage
      const headerSignature = JSON.stringify(mappingData.headers);
      const fileHash = await hashFile(mappingData.file);

      // Upload with configuration
      const response = await fetch("/api/upload-csv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mappedData,
          mapping: mappingData.finalMappings,
          analysisConfig: mappingData.analysisConfig,
          fileName: mappingData.file.name,
          headerSignature,
          fileHash,
          mappingName: mappingData.templateName,
        }),
      });

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      const result = await response.json();

      setUploadState("complete");
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
      setUploadState("idle");
    }
  };

  // Save as template
  const handleSaveTemplate = async (
    name: string,
    mappings: FieldMapping[],
    config: AnalysisConfig
  ) => {
    try {
      const response = await fetch("/api/csv-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          headerSignature: JSON.stringify(mappingData?.headers),
          mappings,
          analysisConfig: config,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save template");
      }

      return await response.json();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Template save failed");
    }
  };

  return {
    uploadState,
    mappingData,
    error,
    handleFileSelected,
    handleMappingsConfirmed,
    handleTierConfirmed,
    handleSaveTemplate,
  };
}

// ==================== HELPER FUNCTIONS ====================

async function parseCSV(file: File): Promise<{
  headers: string[];
  sampleRows: string[][];
}> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split("\n").filter((line) => line.trim());

      if (lines.length === 0) {
        reject(new Error("Empty CSV file"));
        return;
      }

      const headers = lines[0]
        .split(",")
        .map((h) => h.trim().replace(/"/g, ""));
      const sampleRows = lines
        .slice(1, 6)
        .map((line) =>
          line.split(",").map((cell) => cell.trim().replace(/"/g, ""))
        );

      resolve({ headers, sampleRows });
    };

    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsText(file);
  });
}

async function mapCSVData(
  file: File,
  mappings: FieldMapping[]
): Promise<CSVRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split("\n").filter((line) => line.trim());

      const headers = lines[0]
        .split(",")
        .map((h) => h.trim().replace(/"/g, ""));
      const mappedData: CSVRow[] = [];

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i]
          .split(",")
          .map((v) => v.trim().replace(/"/g, ""));
        const row: CSVRow = {};

        mappings.forEach((mapping) => {
          if (mapping.targetField) {
            const sourceIndex = headers.indexOf(mapping.sourceColumn);
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
}

async function hashFile(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function checkForTemplate(
  headers: string[]
): Promise<TemplateMatch | null> {
  try {
    const response = await fetch("/api/csv-templates/match", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ headers }),
    });

    if (!response.ok) return null;

    const result = await response.json();
    return result.found ? result : null;
  } catch {
    return null;
  }
}

function getDefaultConfig(): AnalysisConfig {
  return DEFAULT_ANALYSIS_CONFIG;
}
