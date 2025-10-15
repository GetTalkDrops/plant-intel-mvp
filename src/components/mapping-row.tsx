"use client";
import { TARGET_FIELDS, type TargetField } from "../lib/field-options";

interface MappingRowProps {
  sourceColumn: string;
  targetField: string;
  confidence: number;
  onMappingChange: (sourceColumn: string, newTarget: string) => void;
}

export function MappingRow({
  sourceColumn,
  targetField,
  confidence,
  onMappingChange,
}: MappingRowProps) {
  return (
    <div className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg hover:border-blue-300 transition-colors">
      {/* Source Column */}
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-gray-900 truncate">
          {sourceColumn}
        </div>
        <div className="text-xs text-gray-500">Source Column</div>
      </div>

      {/* Arrow */}
      <div className="text-gray-400 shrink-0">→</div>

      {/* Target Field Dropdown */}
      <div className="flex-1 min-w-0">
        <select
          value={targetField}
          onChange={(e) => onMappingChange(sourceColumn, e.target.value)}
          className={`w-full text-sm border rounded px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
            targetField === "SELECT" 
              ? "border-red-500 text-red-600 font-semibold" 
              : "border-gray-300"
          }`}
        >
          {TARGET_FIELDS.map((field: TargetField) => (
            <option key={field.value} value={field.value}>
              {field.label}
            </option>
          ))}
        </select>
        <div className="text-xs text-gray-500 mt-0.5 truncate">
          {
            TARGET_FIELDS.find((f: TargetField) => f.value === targetField)
              ?.description
          }
        </div>
      </div>
    </div>
  );
}
