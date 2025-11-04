// src/components/csv/template-confirmation.tsx
"use client";

import { CheckCircle, Edit, RotateCcw, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { AnalysisConfig } from "@/lib/csv/csv-config-defaults";
import type { MappingResult } from "@/lib/csv/csv-field-mapper";

interface TemplateConfirmationProps {
  templateName: string;
  mappings: MappingResult[];
  config: AnalysisConfig;
  onUseTemplate: () => void;
  onEditTemplate: () => void;
  onStartFresh: () => void;
}

export function TemplateConfirmation({
  templateName,
  mappings,
  config,
  onUseTemplate,
  onEditTemplate,
  onStartFresh,
}: TemplateConfirmationProps) {
  const mappedCount = mappings.filter((m) => m.targetField !== null).length;

  return (
    <div className="max-w-2xl mx-auto space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="flex justify-center">
          <CheckCircle className="w-12 h-12 sm:w-16 sm:h-16 text-green-600" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold">Template Match Found</h2>
        <p className="text-sm sm:text-base text-gray-600">
          We found a matching template for your CSV file
        </p>
      </div>

      {/* Template Card */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4 sm:p-6 space-y-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg sm:text-xl font-bold text-blue-900 truncate">
              {templateName}
            </h3>
            <p className="text-xs sm:text-sm text-blue-700 mt-1">
              Saved template with mappings and configuration
            </p>
          </div>
          <Badge className="shrink-0">Template</Badge>
        </div>

        {/* Template Details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Mappings */}
          <div className="bg-white rounded-lg p-3 space-y-2">
            <div className="text-xs sm:text-sm font-medium text-gray-600">
              Field Mappings
            </div>
            <div className="text-xl sm:text-2xl font-bold text-gray-900">
              {mappedCount} fields
            </div>
            <div className="text-xs text-gray-500">
              {mappings
                .filter((m) => m.targetField !== null)
                .slice(0, 3)
                .map((m) => m.targetField)
                .join(", ")}
              {mappedCount > 3 && `, +${mappedCount - 3} more`}
            </div>
          </div>

          {/* Configuration */}
          <div className="bg-white rounded-lg p-3 space-y-2">
            <div className="text-xs sm:text-sm font-medium text-gray-600">
              Analysis Config
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs sm:text-sm">
                <DollarSign className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400" />
                <span className="font-medium">
                  ${config.labor_rate_hourly}/hr labor
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs sm:text-sm">
                <DollarSign className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400" />
                <span className="font-medium">
                  ${config.scrap_cost_per_unit}/unit scrap
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4">
        <p className="text-xs sm:text-sm text-blue-900">
          <strong>Using this template</strong> will apply the saved field
          mappings and analysis configuration. This ensures consistency with
          previous uploads.
        </p>
      </div>

      {/* Action Buttons */}
      <div className="space-y-3">
        <Button
          onClick={onUseTemplate}
          size="lg"
          className="w-full text-sm sm:text-base"
        >
          <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
          Use Template
        </Button>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Button
            onClick={onEditTemplate}
            variant="outline"
            className="w-full text-sm sm:text-base"
          >
            <Edit className="w-4 h-4 mr-2" />
            Edit & Save As New
          </Button>

          <Button
            onClick={onStartFresh}
            variant="outline"
            className="w-full text-sm sm:text-base"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Start Fresh
          </Button>
        </div>
      </div>

      {/* Help Text */}
      <div className="text-center">
        <p className="text-xs text-gray-500">
          <strong>Edit & Save As New:</strong> Modify mappings and save as a
          new template
          <br />
          <strong>Start Fresh:</strong> Ignore template and create new mappings
        </p>
      </div>
    </div>
  );
}
