// src/components/csv/field-selector.tsx
"use client";

import { TARGET_FIELDS } from "@/lib/utils/field-options";
import type { TargetField } from "@/lib/utils/field-options";

interface FieldSelectorProps {
  value: string | null;
  usedFields: Set<string>;
  onChange: (field: string | null) => void;
}

export function FieldSelector({
  value,
  usedFields,
  onChange,
}: FieldSelectorProps) {
  return (
    <select
      value={value || "SELECT"}
      onChange={(e) => {
        const v = e.target.value;
        onChange(v === "SELECT" || v === "IGNORE" ? null : v);
      }}
      className={`w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
        value === "SELECT" || value === null
          ? "border-red-500 text-red-600 font-semibold"
          : "border-gray-300"
      }`}
    >
      {TARGET_FIELDS.map((field: TargetField) => {
        const isUsed = usedFields.has(field.value) && value !== field.value;
        const isSpecial = field.value === "SELECT" || field.value === "IGNORE";

        return (
          <option
            key={field.value}
            value={field.value}
            disabled={isUsed && !isSpecial}
            className={isSpecial ? "font-semibold" : ""}
          >
            {field.label}
            {isUsed && !isSpecial && " (already used)"}
          </option>
        );
      })}
    </select>
  );
}
