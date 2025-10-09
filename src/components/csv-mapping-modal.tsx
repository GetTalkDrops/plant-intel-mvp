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
}: MappingModalProps) {
  const [currentMappings, setCurrentMappings] = useState<
    Record<string, CurrentMapping>
  >({});

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
        targetField: "IGNORE",
        confidence: 0,
      };
    });

    setCurrentMappings(initial);
  }, [mappings, unmappedColumns]);

  if (!isOpen) return null;

  const handleMappingChange = (
    sourceColumn: string,
    newTarget: string
  ): void => {
    setCurrentMappings((prev: Record<string, CurrentMapping>) => ({
      ...prev,
      [sourceColumn]: {
        ...prev[sourceColumn],
        targetField: newTarget,
      },
    }));
  };

  const handleConfirm = (): void => {
    const confirmedMappings: ColumnMapping[] = Object.entries(currentMappings)
      .filter(
        ([, mapping]: [string, CurrentMapping]) =>
          mapping.targetField !== "IGNORE"
      )
      .map(
        ([sourceColumn, mapping]: [string, CurrentMapping]): ColumnMapping => ({
          sourceColumn,
          targetField: mapping.targetField,
          confidence: mapping.confidence,
          dataType: "string",
        })
      );

    onConfirm(confirmedMappings);
  };

  const allColumns: string[] = Object.keys(currentMappings);
  const mappedCount: number = Object.values(currentMappings).filter(
    (m: CurrentMapping) => m.targetField !== "IGNORE"
  ).length;
  const ignoredCount: number = allColumns.length - mappedCount;

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            Review CSV Field Mapping
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            File: <span className="font-medium">{fileName}</span>
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {mappedCount} field{mappedCount !== 1 ? "s" : ""} will be imported •{" "}
            {ignoredCount} will be skipped
          </p>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="space-y-3">
            <div className="text-sm text-gray-700 mb-4">
              Review the field mappings below. You can change how each column
              maps to your data fields, or mark fields to skip.
            </div>

            {allColumns.map((sourceColumn: string) => (
              <MappingRow
                key={sourceColumn}
                sourceColumn={sourceColumn}
                targetField={currentMappings[sourceColumn].targetField}
                confidence={currentMappings[sourceColumn].confidence}
                onMappingChange={handleMappingChange}
              />
            ))}
          </div>

          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Tip:</strong> Fields marked as Do not Import will be
              ignored. You can always re-upload if you need to adjust mappings
              later.
            </p>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3 bg-gray-50">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Confirm & Import ({mappedCount} field{mappedCount !== 1 ? "s" : ""})
          </button>
        </div>
      </div>
    </div>
  );
}
export default CsvMappingModal;
