"use client";
import { useState, useEffect } from "react";
import { type ColumnMapping } from "@/lib/csv/csvMapper";
import { MappingRow } from "./mapping-row";

interface DataTierInfo {
  tier: 1 | 2 | 3;
  name: string;
  description: string;
  capabilities: string[];
  missingForNextTier: string[];
}

interface ValidationInfo {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

interface MappingModalProps {
  isOpen: boolean;
  fileName: string;
  mappings: ColumnMapping[];
  unmappedColumns: string[];
  dataTier?: DataTierInfo;
  validation?: ValidationInfo;
  confidence?: number;
  onConfirm: (confirmedMappings: ColumnMapping[], name: string) => void;
  onCancel: () => void;
  usingSavedMapping?: boolean;
  savedFileName?: string;
  savedMappingName?: string;
}

interface CurrentMapping {
  targetField: string;
  confidence: number;
}

function generateDefaultName(mappings: Record<string, CurrentMapping>): string {
  const fields = Object.values(mappings).map((m) => m.targetField);
  const date = new Date().toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

  if (fields.includes("work_order_number")) return `Work Orders - ${date}`;
  if (fields.includes("material_code")) return `Materials - ${date}`;
  if (fields.includes("quality_issues")) return `Quality Data - ${date}`;
  if (fields.includes("machine_id")) return `Equipment - ${date}`;

  return `Production Data - ${date}`;
}

export function CsvMappingModal({
  isOpen,
  fileName,
  mappings,
  unmappedColumns,
  dataTier,
  validation,
  confidence = 0,
  onConfirm,
  onCancel,
  usingSavedMapping = false,
  savedFileName = "",
  savedMappingName = "",
}: MappingModalProps) {
  const [currentMappings, setCurrentMappings] = useState<
    Record<string, CurrentMapping>
  >({});
  const [mappingName, setMappingName] = useState("");

  useEffect(() => {
    const initial: Record<string, CurrentMapping> = {};
    mappings.forEach((m: ColumnMapping) => {
      initial[m.sourceColumn] = {
        targetField: m.targetField,
        confidence: m.confidence,
      };
    });

    unmappedColumns.forEach((col: string) => {
      initial[col] = {
        targetField: "SELECT",
        confidence: 0,
      };
    });

    setCurrentMappings(initial);
    setMappingName(savedMappingName || generateDefaultName(initial));
  }, [mappings, unmappedColumns, savedMappingName]);

  if (!isOpen) return null;

  const handleMappingChange = (
    sourceColumn: string,
    newTarget: string
  ): void => {
    setCurrentMappings((prev: Record<string, CurrentMapping>) => {
      const updated = {
        ...prev,
        [sourceColumn]: {
          targetField: newTarget,
          confidence: prev[sourceColumn]?.confidence || 0,
        },
      };

      if (!savedMappingName && mappingName === generateDefaultName(prev)) {
        setMappingName(generateDefaultName(updated));
      }

      return updated;
    });
  };

  const handleConfirm = (): void => {
    const confirmedMappings: ColumnMapping[] = Object.entries(currentMappings)
      .filter(
        ([, mapping]) =>
          mapping.targetField !== "SELECT" && mapping.targetField !== "IGNORE"
      )
      .map(([sourceColumn, mapping]) => ({
        sourceColumn,
        targetField: mapping.targetField,
        confidence: mapping.confidence,
        dataType: "string",
      }));

    onConfirm(
      confirmedMappings,
      mappingName.trim() || generateDefaultName(currentMappings)
    );
  };

  const allColumns = [
    ...mappings.map((m) => m.sourceColumn),
    ...unmappedColumns,
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-4 sm:p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4">
          Map CSV Columns
        </h2>
        <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6">
          File: <span className="font-semibold">{fileName}</span>
        </p>
        {/* Data Tier Display */}
        {dataTier && (
          <div
            className={`mb-4 border rounded-lg p-4 ${
              dataTier.tier === 1
                ? "bg-yellow-50 border-yellow-200"
                : dataTier.tier === 2
                ? "bg-blue-50 border-blue-200"
                : "bg-green-50 border-green-200"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-lg font-semibold">{dataTier.name}</span>
                <span className="px-2 py-0.5 text-xs font-medium bg-white rounded">
                  Tier {dataTier.tier}
                </span>
              </div>
              {confidence > 0 && (
                <span className="text-sm font-medium">
                  {Math.round(confidence * 100)}% confidence
                </span>
              )}
            </div>
            <p className="text-sm mb-2">{dataTier.description}</p>
            {dataTier.missingForNextTier &&
              dataTier.missingForNextTier.length > 0 && (
                <p className="text-xs mt-2 pt-2 border-t border-current/20">
                  Add{" "}
                  <strong>
                    {dataTier.missingForNextTier[0].replace(/_/g, " ")}
                  </strong>{" "}
                  to unlock more analysis
                </p>
              )}
          </div>
        )}

        {/* Validation Warnings */}
        {validation && validation.warnings.length > 0 && (
          <div className="mb-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <p className="text-sm font-medium text-yellow-800 mb-1">
              ⚠️ Warnings
            </p>
            <ul className="text-xs text-yellow-700 space-y-1">
              {validation.warnings.map((warning, idx) => (
                <li key={idx}>• {warning}</li>
              ))}
            </ul>
          </div>
        )}

        {usingSavedMapping && (
          <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-blue-50 border-l-4 border-blue-500 rounded">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg
                  className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500 mt-0.5"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
              </div>
              <div className="ml-2 sm:ml-3">
                <h3 className="text-xs sm:text-sm font-medium text-blue-800">
                  Using saved mapping: {savedMappingName || savedFileName}
                </h3>
                <p className="mt-1 text-xs sm:text-sm text-blue-700">
                  Your previous field mappings have been applied. Review and
                  edit if needed, then click Confirm.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-2">
          {allColumns.map((col, index) => (
            <MappingRow
              key={`${col}-${index}`}
              sourceColumn={col}
              targetField={currentMappings[col]?.targetField || "SELECT"}
              confidence={currentMappings[col]?.confidence || 0}
              onMappingChange={(col, newTarget) =>
                handleMappingChange(col, newTarget)
              }
            />
          ))}
        </div>

        <div className="mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-gray-200">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Save this mapping as:
          </label>
          <input
            type="text"
            value={mappingName}
            onChange={(e) => setMappingName(e.target.value.slice(0, 50))}
            placeholder="Enter mapping name..."
            maxLength={50}
            className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <p className="mt-1 text-xs text-gray-500">
            {mappingName.length}/50 characters
          </p>
        </div>

        <div className="mt-4 sm:mt-6 flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3">
          <button
            onClick={onCancel}
            className="w-full sm:w-auto px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="w-full sm:w-auto px-4 py-2 text-sm sm:text-base bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Confirm Mapping
          </button>
        </div>
      </div>
    </div>
  );
}

export default CsvMappingModal;
