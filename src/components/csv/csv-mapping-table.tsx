// src/components/csv/csv-mapping-table.tsx
"use client";

import { useState, useEffect } from "react";
import { AlertCircle, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { FieldSelector } from "./field-selector";
import { ConfidenceBadge } from "./confidence-badge";
import { ConfigPanel } from "./config-panel";
import { DEFAULT_ANALYSIS_CONFIG, type AnalysisConfig } from "@/lib/csv/csv-config-defaults";
import type { MappingResult } from "@/lib/csv/csv-field-mapper";

interface CSVMappingTableProps {
  csvHeaders: string[];
  sampleRows: string[][];
  initialMappings: MappingResult[];
  defaultConfig?: AnalysisConfig;
  templateName?: string;
  usingSavedTemplate?: boolean;
  onMappingsChange: (mappings: MappingResult[]) => void;
  onConfigChange: (config: AnalysisConfig) => void;
  onContinue: (templateName: string) => void;
  onCancel: () => void;
}

function generateDefaultName(mappings: MappingResult[]): string {
  const fields = mappings.map((m) => m.targetField).filter((f): f is string => f !== null);
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

export function CSVMappingTable({
  csvHeaders,
  sampleRows,
  initialMappings,
  defaultConfig,
  templateName: initialTemplateName,
  usingSavedTemplate = false,
  onMappingsChange,
  onConfigChange,
  onContinue,
  onCancel,
}: CSVMappingTableProps) {
  const [mappings, setMappings] = useState<MappingResult[]>(initialMappings);
  const [config, setConfig] = useState<AnalysisConfig>(
    defaultConfig || DEFAULT_ANALYSIS_CONFIG
  );
  const [templateName, setTemplateName] = useState(
    initialTemplateName || generateDefaultName(initialMappings)
  );
  const [templateNameError, setTemplateNameError] = useState<string | null>(null);

  // Track which fields are mapped
  const usedFields = new Set(
    mappings
      .filter((m) => m.targetField !== null)
      .map((m) => m.targetField as string)
  );

  // Update mapping for a specific column
  const updateMapping = (sourceColumn: string, targetField: string | null) => {
    const newMappings = mappings.map((m) =>
      m.sourceColumn === sourceColumn
        ? {
            ...m,
            targetField,
            confidence: 1.0,
            matchType: "manual",
          }
        : m
    );
    setMappings(newMappings);
    onMappingsChange(newMappings);

    // Auto-update template name if still using default
    if (!initialTemplateName && templateName === generateDefaultName(mappings)) {
      setTemplateName(generateDefaultName(newMappings));
    }
  };

  // Update configuration
  const handleConfigChange = (newConfig: AnalysisConfig) => {
    setConfig(newConfig);
    onConfigChange(newConfig);
  };

  // Handle continue
  const handleContinue = () => {
    const trimmedName = templateName.trim();

    if (!trimmedName) {
      setTemplateNameError("Template name is required");
      return;
    }

    setTemplateNameError(null);
    onContinue(trimmedName);
  };

  // Calculate stats
  const mapped = mappings.filter((m) => m.targetField).length;
  const unmapped = csvHeaders.length - mapped;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl sm:text-2xl font-bold mb-2">
          Map Your Data
          {usingSavedTemplate && initialTemplateName && (
            <span className="ml-2 text-sm font-normal text-gray-600">
              (Using template: {initialTemplateName})
            </span>
          )}
        </h2>
        <p className="text-sm sm:text-base text-gray-600">
          Connect your CSV columns to our system fields. We've suggested
          mappings based on column names.
        </p>
      </div>

      {/* Stats */}
      <div className="flex gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <span>{mapped} mapped</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-gray-300" />
          <span>{unmapped} unmapped</span>
        </div>
      </div>

      {/* Desktop Table View */}
      <div className="hidden lg:block border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium">
                Your CSV Column
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium">
                Sample Data
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium">
                Maps To
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium">
                Confidence
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {mappings.map((mapping, idx) => (
              <tr key={idx} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-sm">
                  {mapping.sourceColumn}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  {sampleRows[0]?.[idx] || "—"}
                </td>
                <td className="px-4 py-3">
                  <FieldSelector
                    value={mapping.targetField}
                    usedFields={usedFields}
                    onChange={(field) =>
                      updateMapping(mapping.sourceColumn, field)
                    }
                  />
                </td>
                <td className="px-4 py-3">
                  <ConfidenceBadge
                    score={mapping.confidence}
                    matchType={mapping.matchType}
                    showLabel
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="lg:hidden space-y-3">
        {mappings.map((mapping, idx) => (
          <div
            key={idx}
            className="border rounded-lg p-4 space-y-3 bg-white hover:border-blue-300 transition-colors"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate">
                  {mapping.sourceColumn}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Sample: {sampleRows[0]?.[idx] || "—"}
                </div>
              </div>
              <ConfidenceBadge
                score={mapping.confidence}
                matchType={mapping.matchType}
              />
            </div>
            <FieldSelector
              value={mapping.targetField}
              usedFields={usedFields}
              onChange={(field) => updateMapping(mapping.sourceColumn, field)}
            />
          </div>
        ))}
      </div>

      {/* Unmapped Columns Alert */}
      {unmapped > 0 && (
        <Alert>
          <AlertCircle className="w-4 h-4" />
          <AlertTitle className="text-sm font-semibold">
            {unmapped} Unmapped Column{unmapped > 1 ? "s" : ""}
          </AlertTitle>
          <AlertDescription className="text-xs sm:text-sm">
            These columns won't be used in analysis. This is OK if they're
            notes or internal fields.
          </AlertDescription>
        </Alert>
      )}

      {/* Configuration Panel */}
      <ConfigPanel
        config={config}
        onConfigChange={handleConfigChange}
        defaultExpanded={!usingSavedTemplate}
      />

      {/* Template Naming */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">
          Save this mapping as:
        </Label>
        <Input
          type="text"
          value={templateName}
          onChange={(e) => {
            setTemplateName(e.target.value.slice(0, 50));
            setTemplateNameError(null);
          }}
          placeholder="Enter template name..."
          maxLength={50}
          className={templateNameError ? "border-red-500" : ""}
        />
        {templateNameError && (
          <p className="text-xs text-red-600">{templateNameError}</p>
        )}
        <p className="text-xs text-gray-500">
          {templateName.length}/50 characters
        </p>
      </div>

      {/* Actions */}
      <div className="flex flex-col-reverse sm:flex-row justify-between gap-3">
        <Button variant="outline" onClick={onCancel} className="w-full sm:w-auto">
          Cancel
        </Button>
        <Button onClick={handleContinue} size="lg" className="w-full sm:w-auto">
          <Save className="w-4 h-4 mr-2" />
          Save & Continue to Preview
        </Button>
      </div>
    </div>
  );
}
