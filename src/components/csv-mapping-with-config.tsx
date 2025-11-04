// src/components/csv-mapping-with-config.tsx - COMPLETELY FIXED
"use client";

import { useState, useMemo } from "react";
import {
  Check,
  X,
  AlertCircle,
  Info,
  ChevronDown,
  ChevronRight,
  Save,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

/**
 * PRODUCTION-READY MAPPING COMPONENT - ALL ERRORS FIXED
 *
 * FIXES:
 * - Removed Select/Tooltip shadcn components (using native)
 * - Fixed Set<string | null> type mismatch
 * - Fixed parameter 'v' type annotation
 * - Fixed Info icon title attribute (wrapped in div)
 */

// ==================== TYPES ====================

interface MappingRow {
  sourceColumn: string;
  targetField: string | null;
  confidence: number;
  matchType: string;
  dataType: string;
  required: boolean;
}

interface ConfigVariable {
  key: string;
  label: string;
  description: string;
  defaultValue: number;
  unit: string;
  type: "number" | "percentage";
  required: boolean;
  helpText: string;
  example: string;
}

interface AnalysisConfig {
  labor_rate_hourly: number;
  scrap_cost_per_unit: number;
  variance_threshold_pct: number;
  pattern_min_orders: number;
}

interface CSVMappingWithConfigProps {
  csvHeaders: string[];
  sampleRows: string[][];
  initialMappings: MappingRow[];
  defaultConfig?: Partial<AnalysisConfig>;
  templateName?: string;
  onMappingsChange: (mappings: MappingRow[]) => void;
  onConfigChange: (config: AnalysisConfig) => void;
  onContinue: () => void;
  onSaveTemplate?: (
    name: string,
    mappings: MappingRow[],
    config: AnalysisConfig
  ) => void;
}

// ==================== CONFIG DEFINITIONS ====================

const CONFIG_VARIABLES: ConfigVariable[] = [
  {
    key: "labor_rate_hourly",
    label: "Labor Rate",
    description: "Average hourly labor cost for this facility/line",
    defaultValue: 55,
    unit: "$/hour",
    type: "number",
    required: true,
    helpText:
      "Include base wage + benefits + overhead. Typical range: $35-95/hr depending on region and skill level.",
    example: "$35/hr (low-cost) to $95/hr (high-skill/premium location)",
  },
  {
    key: "scrap_cost_per_unit",
    label: "Scrap Cost",
    description: "Average cost per scrapped unit",
    defaultValue: 75,
    unit: "$/unit",
    type: "number",
    required: true,
    helpText:
      "Include material + labor already invested. Varies significantly by product complexity.",
    example: "$5-25 (commodity) to $250+ (precision assemblies)",
  },
  {
    key: "variance_threshold_pct",
    label: "Variance Alert Threshold",
    description: "Percentage variance to trigger an alert",
    defaultValue: 15,
    unit: "%",
    type: "percentage",
    required: false,
    helpText:
      "Lower = more sensitive (more alerts). Higher = only major issues. Adjust based on your tolerances.",
    example: "5-10% (tight tolerances) to 20-30% (commodity goods)",
  },
  {
    key: "pattern_min_orders",
    label: "Pattern Detection",
    description: "Minimum orders needed to identify a pattern",
    defaultValue: 3,
    unit: "orders",
    type: "number",
    required: false,
    helpText:
      "Lower = faster detection but less certainty. Higher = more reliable patterns.",
    example: "2-3 (small batches) to 5-10 (large volumes)",
  },
];

// ==================== MAIN COMPONENT ====================

export function CSVMappingWithConfig({
  csvHeaders,
  sampleRows,
  initialMappings,
  defaultConfig,
  templateName: initialTemplateName,
  onMappingsChange,
  onConfigChange,
  onContinue,
  onSaveTemplate,
}: CSVMappingWithConfigProps) {
  const [mappings, setMappings] = useState<MappingRow[]>(initialMappings);
  const [configExpanded, setConfigExpanded] = useState(false);
  const [config, setConfig] = useState<AnalysisConfig>({
    labor_rate_hourly: defaultConfig?.labor_rate_hourly || 55,
    scrap_cost_per_unit: defaultConfig?.scrap_cost_per_unit || 75,
    variance_threshold_pct: defaultConfig?.variance_threshold_pct || 15,
    pattern_min_orders: defaultConfig?.pattern_min_orders || 3,
  });
  const [templateName, setTemplateName] = useState(initialTemplateName || "");
  const [showTemplateInput, setShowTemplateInput] = useState(false);

  // Track which fields are mapped - FIXED: Filter out null values
  const usedFields = useMemo(
    () =>
      new Set(
        mappings
          .filter((m) => m.targetField !== null)
          .map((m) => m.targetField as string)
      ),
    [mappings]
  );

  // Calculate mapping stats
  const stats = useMemo(() => {
    const mapped = mappings.filter((m) => m.targetField).length;
    const required = mappings.filter((m) => m.required && m.targetField).length;
    const highConfidence = mappings.filter((m) => m.confidence >= 0.9).length;

    return {
      mapped,
      unmapped: csvHeaders.length - mapped,
      required,
      totalRequired: 3, // work_order, planned_cost, actual_cost
      highConfidence,
      lowConfidence: mapped - highConfidence,
    };
  }, [mappings, csvHeaders]);

  // Check if required config is set
  const requiredConfigSet = CONFIG_VARIABLES.filter((v) => v.required).every(
    (v) => config[v.key as keyof AnalysisConfig] > 0
  );

  // Can proceed if mappings + config are valid
  const canProceed = stats.required >= stats.totalRequired && requiredConfigSet;

  // Update mapping
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
  };

  // Update config
  const updateConfig = (key: keyof AnalysisConfig, value: number) => {
    const newConfig = { ...config, [key]: value };
    setConfig(newConfig);
    onConfigChange(newConfig);
  };

  // Save template
  const handleSaveTemplate = () => {
    if (!templateName.trim()) {
      alert("Please enter a template name");
      return;
    }
    onSaveTemplate?.(templateName, mappings, config);
    setShowTemplateInput(false);
  };

  return (
    <div className="space-y-6">
      {/* ==================== MAPPING TABLE ==================== */}
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2 mb-2">
          Map Your CSV Fields
          {initialTemplateName && (
            <Badge variant="secondary">Template: {initialTemplateName}</Badge>
          )}
        </h2>
        <p className="text-gray-600 mb-4">
          Match your CSV columns to our standard fields. Required fields marked
          with *
        </p>

        {/* Stats */}
        <div className="flex gap-4 mb-4 text-sm">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-green-600" />
            <span>{stats.mapped} mapped</span>
          </div>
          <div className="flex items-center gap-2">
            <X className="w-4 h-4 text-gray-400" />
            <span>{stats.unmapped} unmapped</span>
          </div>
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-blue-600" />
            <span>
              {stats.required}/{stats.totalRequired} required
            </span>
          </div>
        </div>

        {/* Mapping Table */}
        <div className="border rounded-lg overflow-hidden">
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
                  Maps To →
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium">
                  Confidence
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {mappings.map((mapping, idx) => (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">
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
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ==================== CONFIGURATION SECTION ==================== */}
      <div className="border rounded-lg overflow-hidden">
        <button
          onClick={() => setConfigExpanded(!configExpanded)}
          className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            {configExpanded ? (
              <ChevronDown className="w-5 h-5" />
            ) : (
              <ChevronRight className="w-5 h-5" />
            )}
            <h3 className="font-semibold">Analysis Configuration</h3>
            {!requiredConfigSet && (
              <Badge variant="destructive">Required</Badge>
            )}
          </div>
          <span className="text-sm text-gray-600">
            Set values for this facility/product line
          </span>
        </button>

        {configExpanded && (
          <div className="p-4 space-y-4">
            <Alert>
              <Info className="w-4 h-4" />
              <AlertDescription>
                <p className="font-medium mb-1">Why set these?</p>
                <p className="text-sm">
                  Different facilities have different labor rates and product
                  costs. Accurate values = accurate insights. These save with
                  your template.
                </p>
              </AlertDescription>
            </Alert>

            {/* Config Variables Grid */}
            <div className="grid grid-cols-2 gap-4">
              {CONFIG_VARIABLES.map((variable) => (
                <div key={variable.key} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label className="font-medium">
                      {variable.label}
                      {variable.required && (
                        <span className="text-red-500 ml-1">*</span>
                      )}
                    </Label>
                    {/* FIXED: Wrap Info icon in div with title attribute */}
                    <div
                      className="cursor-help"
                      title={`${variable.description}\n\n${variable.helpText}\n\nExample: ${variable.example}`}
                    >
                      <Info className="w-4 h-4 text-gray-400" />
                    </div>
                  </div>

                  <div className="relative">
                    <Input
                      type="number"
                      value={config[variable.key as keyof AnalysisConfig]}
                      onChange={(e) =>
                        updateConfig(
                          variable.key as keyof AnalysisConfig,
                          Number(e.target.value)
                        )
                      }
                      placeholder={`Default: ${variable.defaultValue}`}
                      className="pr-16"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">
                      {variable.unit}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Common Scenarios Help */}
            <div className="bg-blue-50 border border-blue-200 rounded p-3">
              <h4 className="font-medium text-sm mb-2">💡 Common Scenarios:</h4>
              <div className="text-sm space-y-1 text-gray-700">
                <p>
                  <strong>Multi-plant:</strong> Create templates for each
                  facility with their labor rates
                </p>
                <p>
                  <strong>Product lines:</strong> High-value products = higher
                  scrap costs
                </p>
                <p>
                  <strong>Shifts:</strong> Night shift = premium labor rate
                  (+15-30%)
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ==================== VALIDATION ALERTS ==================== */}
      {stats.required < stats.totalRequired && (
        <Alert variant="destructive">
          <AlertCircle className="w-4 h-4" />
          <AlertTitle>Missing Required Fields</AlertTitle>
          <AlertDescription>
            Please map: work_order_number, planned_material_cost,
            actual_material_cost
          </AlertDescription>
        </Alert>
      )}

      {!requiredConfigSet && configExpanded && (
        <Alert variant="destructive">
          <AlertCircle className="w-4 h-4" />
          <AlertDescription>
            Please set Labor Rate and Scrap Cost to continue
          </AlertDescription>
        </Alert>
      )}

      {/* ==================== ACTIONS ==================== */}
      <div className="flex items-center justify-between">
        {/* Template Save */}
        <div className="flex items-center gap-2">
          {!showTemplateInput ? (
            <Button
              variant="outline"
              onClick={() => setShowTemplateInput(true)}
            >
              <Save className="w-4 h-4 mr-2" />
              Save as Template
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <Input
                placeholder="Template name (e.g., Texas Plant - Automotive)"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                className="w-64"
              />
              <Button onClick={handleSaveTemplate} size="sm">
                Save
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowTemplateInput(false)}
              >
                Cancel
              </Button>
            </div>
          )}
        </div>

        {/* Continue Button */}
        <Button onClick={onContinue} disabled={!canProceed} size="lg">
          Continue → Preview Analysis
        </Button>
      </div>
    </div>
  );
}

// ==================== SUB-COMPONENTS ====================

function FieldSelector({
  value,
  usedFields,
  onChange,
}: {
  value: string | null;
  usedFields: Set<string>;
  onChange: (field: string | null) => void;
}) {
  const FIELDS = [
    { value: "work_order_number", label: "Work Order Number", required: true },
    { value: "material_code", label: "Material Code" },
    { value: "supplier_id", label: "Supplier ID" },
    { value: "machine_id", label: "Machine ID" },
    {
      value: "planned_material_cost",
      label: "Planned Material Cost",
      required: true,
    },
    {
      value: "actual_material_cost",
      label: "Actual Material Cost",
      required: true,
    },
    { value: "planned_labor_hours", label: "Planned Labor Hours" },
    { value: "actual_labor_hours", label: "Actual Labor Hours" },
    { value: "units_produced", label: "Units Produced" },
    { value: "units_scrapped", label: "Units Scrapped" },
    { value: "production_period_start", label: "Production Start Date" },
  ];

  return (
    <select
      value={value || "none"}
      onChange={(e) => {
        const v: string = e.target.value;
        onChange(v === "none" ? null : v);
      }}
      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
    >
      <option value="none">Do not map</option>
      {FIELDS.map((field) => {
        const isUsed = usedFields.has(field.value) && value !== field.value;
        return (
          <option key={field.value} value={field.value} disabled={isUsed}>
            {field.label}
            {field.required && " *"}
            {isUsed && " (used)"}
          </option>
        );
      })}
    </select>
  );
}

function ConfidenceBadge({
  score,
  matchType,
}: {
  score: number;
  matchType: string;
}) {
  const getColor = (score: number) => {
    if (score >= 0.95) return "bg-green-100 text-green-800";
    if (score >= 0.85) return "bg-blue-100 text-blue-800";
    if (score >= 0.75) return "bg-yellow-100 text-yellow-800";
    return "bg-red-100 text-red-800";
  };

  return (
    <div
      className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${getColor(
        score
      )}`}
    >
      {score >= 0.85 ? (
        <Check className="w-3 h-3" />
      ) : (
        <AlertCircle className="w-3 h-3" />
      )}
      {Math.round(score * 100)}%
    </div>
  );
}
