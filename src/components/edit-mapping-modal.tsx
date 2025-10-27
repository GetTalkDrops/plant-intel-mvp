"use client";
import { useState, useEffect } from "react";
import { type ColumnMapping } from "@/lib/csv/csvMapper";
import { MappingRow } from "./mapping-row";

interface EditMappingModalProps {
  isOpen: boolean;
  mappingId: string;
  mappingName: string;
  currentMappings: ColumnMapping[];
  onConfirm: (
    mappingId: string,
    updatedMappings: ColumnMapping[]
  ) => Promise<void>;
  onCancel: () => void;
}

interface CurrentMapping {
  targetField: string;
  confidence: number;
  dataType: string;
}

export function EditMappingModal({
  isOpen,
  mappingId,
  mappingName,
  currentMappings,
  onConfirm,
  onCancel,
}: EditMappingModalProps) {
  const [editedMappings, setEditedMappings] = useState<
    Record<string, CurrentMapping>
  >({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const initial: Record<string, CurrentMapping> = {};
      currentMappings.forEach((m: ColumnMapping) => {
        initial[m.sourceColumn] = {
          targetField: m.targetField,
          confidence: m.confidence,
          dataType: m.dataType || "string",
        };
      });
      setEditedMappings(initial);
    }
  }, [isOpen, currentMappings]);

  if (!isOpen) return null;

  const handleMappingChange = (
    sourceColumn: string,
    newTarget: string
  ): void => {
    setEditedMappings((prev) => ({
      ...prev,
      [sourceColumn]: {
        ...prev[sourceColumn],
        targetField: newTarget,
      },
    }));
  };

  const handleConfirm = async (): Promise<void> => {
    setIsSaving(true);

    const updatedMappings = Object.entries(editedMappings)
      .filter(
        ([, mapping]) =>
          mapping.targetField !== "SELECT" && mapping.targetField !== "IGNORE"
      )
      .map(([sourceColumn, mapping]) => ({
        sourceColumn,
        targetField: mapping.targetField,
        confidence: mapping.confidence || 0,
        dataType: mapping.dataType,
      })) as ColumnMapping[];

    await onConfirm(mappingId, updatedMappings);
    setIsSaving(false);
  };

  const allColumns = Object.keys(editedMappings);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-4 sm:p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4">
          Edit Field Mappings
        </h2>
        <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6">
          Mapping: <span className="font-semibold">{mappingName}</span>
        </p>

        <div className="mb-4 p-3 sm:p-4 bg-blue-50 border-l-4 border-blue-500 rounded">
          <p className="text-xs sm:text-sm text-blue-700">
            Update how your CSV columns map to PlantIntel fields. Changes will
            apply to future uploads with matching column headers.
          </p>
        </div>

        <div className="space-y-2">
          {allColumns.map((col) => (
            <MappingRow
              key={col}
              sourceColumn={col}
              targetField={editedMappings[col]?.targetField || "SELECT"}
              confidence={editedMappings[col]?.confidence || 0}
              onMappingChange={handleMappingChange}
            />
          ))}
        </div>

        <div className="mt-4 sm:mt-6 flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3">
          <button
            onClick={onCancel}
            disabled={isSaving}
            className="w-full sm:w-auto px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={isSaving}
            className="w-full sm:w-auto px-4 py-2 text-sm sm:text-base bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {isSaving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
