// src/components/csv/config-panel.tsx
"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  CONFIG_VARIABLES,
  type AnalysisConfig,
} from "@/lib/csv/csv-config-defaults";

interface ConfigPanelProps {
  config: AnalysisConfig;
  onConfigChange: (config: AnalysisConfig) => void;
  defaultExpanded?: boolean;
}

export function ConfigPanel({
  config,
  onConfigChange,
  defaultExpanded = false,
}: ConfigPanelProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const updateConfig = (key: keyof AnalysisConfig, value: number) => {
    onConfigChange({ ...config, [key]: value });
  };

  const requiredConfigSet = CONFIG_VARIABLES.filter((v) => v.required).every(
    (v) => config[v.key as keyof AnalysisConfig] > 0
  );

  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 flex items-center justify-between transition-colors"
      >
        <div className="flex items-center gap-2">
          {isExpanded ? (
            <ChevronDown className="w-5 h-5 shrink-0" />
          ) : (
            <ChevronRight className="w-5 h-5 shrink-0" />
          )}
          <h3 className="font-semibold text-sm sm:text-base">
            Analysis Configuration
          </h3>
          {!requiredConfigSet && (
            <Badge variant="destructive" className="hidden sm:inline-flex">
              Required
            </Badge>
          )}
        </div>
        <span className="text-xs sm:text-sm text-gray-600">
          Set values for this facility/product line
        </span>
      </button>

      {isExpanded && (
        <div className="p-4 space-y-4">
          <Alert>
            <Info className="w-4 h-4" />
            <AlertDescription>
              <p className="font-medium mb-1 text-sm">Why set these?</p>
              <p className="text-xs sm:text-sm">
                Different facilities have different labor rates and product
                costs. Accurate values mean accurate insights. These save with
                your template.
              </p>
            </AlertDescription>
          </Alert>

          {/* Config Variables Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {CONFIG_VARIABLES.map((variable) => (
              <div key={variable.key} className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label className="font-medium text-sm">
                    {variable.label}
                    {variable.required && (
                      <span className="text-red-500 ml-1">*</span>
                    )}
                  </Label>
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
                    className="pr-16 text-sm"
                    min={0}
                    step={variable.type === "percentage" ? 1 : 0.01}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs sm:text-sm text-gray-500">
                    {variable.unit}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Common Scenarios Help */}
          <div className="bg-blue-50 border border-blue-200 rounded p-3">
            <h4 className="font-medium text-sm mb-2">Common Scenarios:</h4>
            <div className="text-xs sm:text-sm space-y-1 text-gray-700">
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
  );
}
