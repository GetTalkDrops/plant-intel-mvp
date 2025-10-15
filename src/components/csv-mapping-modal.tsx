"use client";
import { useState, useEffect } from "react";
import { type ColumnMapping } from "@/lib/csvMapper";
import { MappingRow } from "./mapping-row";

interface MappingModalProps {
  isOpen: boolean;
  fileName: string;
  mappings: ColumnMapping[];
  unmappedColumns: string[];
  onConfirm: (confirmedMappings: ColumnMapping[]) => void;
  onCancel: () => void;
  usingSavedMapping?: boolean;
  savedFileName?: string;
}

interface CurrentMapping {
  targetField: string;
  confidence: number;
}

export function CsvMappingModal({
  isOpen,
  fileName,
  mappings,
  unmappedColumns,
  onConfirm,
  onCancel,
  usingSavedMapping = false,
  savedFileName = "",
}: MappingModalProps) {
  const [currentMappings, setCurrentMappings] = useState<Record<string, CurrentMapping>>({});

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
  }, [mappings, unmappedColumns]);

  if (!isOpen) return null;

  const handleMappingChange = (sourceColumn: string, newTarget: string): void => {
    setCurrentMappings((prev: Record<string, CurrentMapping>) => ({
      ...prev,
      [sourceColumn]: {
        targetField: newTarget,
        confidence: prev[sourceColumn]?.confidence || 0,
      },
    }));
  };

  const handleConfirm = (): void => {
    const confirmedMappings: ColumnMapping[] = Object.entries(currentMappings)
      .filter(([, mapping]) => mapping.targetField !== "SELECT" && mapping.targetField !== "IGNORE")
      .map(([sourceColumn, mapping]) => ({
        sourceColumn,
        targetField: mapping.targetField,
        confidence: mapping.confidence,
        dataType: "string",
      }));

    onConfirm(confirmedMappings);
  };

  const allColumns = [
    ...mappings.map((m) => m.sourceColumn),
    ...unmappedColumns,
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold mb-4">Map CSV Columns</h2>
        <p className="text-gray-600 mb-6">
          File: <span className="font-semibold">{fileName}</span>
        </p>

        {usingSavedMapping && (
          <div className="mb-6 p-4 bg-blue-50 border-l-4 border-blue-500 rounded">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-blue-500 mt-0.5"
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
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800">
                  Using saved mapping for: {savedFileName}
                </h3>
                <p className="mt-1 text-sm text-blue-700">
                  Your previous field mappings have been applied. Review and edit if needed, then click Confirm.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-2">
          {allColumns.map((col) => (
            <MappingRow
              key={col}
              sourceColumn={col}
              targetField={currentMappings[col]?.targetField || "SELECT"}
              confidence={currentMappings[col]?.confidence || 0}
              onMappingChange={(col, newTarget) => handleMappingChange(col, newTarget)}
            />
          ))}
        </div>

        <div className="mt-6 flex justify-end space-x-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Confirm Mapping
          </button>
        </div>
      </div>
    </div>
  );
}

export default CsvMappingModal;
