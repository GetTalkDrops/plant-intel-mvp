// src/components/tier-preview.tsx
"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Check, X, ArrowLeft, DollarSign, Clock } from "lucide-react";

interface TierPreviewProps {
  mappedFields: string[];
  analysisConfig?: {
    labor_rate_hourly: number;
    scrap_cost_per_unit: number;
    variance_threshold_pct: number;
    pattern_min_orders: number;
  };
  onBack: () => void;
  onContinue: () => void;
}

export function TierPreview({
  mappedFields,
  analysisConfig,
  onBack,
  onContinue,
}: TierPreviewProps) {
  const tier = detectTier(mappedFields);
  const capabilities = getTierCapabilities(tier);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Preview Your Analysis</h2>
        <p className="text-gray-600">
          Based on your mappings and configuration, here is what you will get
        </p>
      </div>

      {/* Tier Badge */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg border border-blue-200">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-gray-600 mb-1">Data Tier</div>
            <div className="text-3xl font-bold text-blue-900">{tier.name}</div>
            <div className="text-sm text-gray-600 mt-1">{tier.description}</div>
          </div>
          <Badge className="text-lg px-4 py-2">{tier.tier}</Badge>
        </div>
      </div>

      {/* Configuration Display */}
      {analysisConfig && (
        <div className="border rounded-lg p-4">
          <h3 className="font-semibold mb-3">Analysis Configuration</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-gray-400" />
              <div>
                <div className="text-sm text-gray-600">Labor Rate</div>
                <div className="font-medium">
                  ${analysisConfig.labor_rate_hourly}/hr
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-gray-400" />
              <div>
                <div className="text-sm text-gray-600">Scrap Cost</div>
                <div className="font-medium">
                  ${analysisConfig.scrap_cost_per_unit}/unit
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-400" />
              <div>
                <div className="text-sm text-gray-600">Variance Threshold</div>
                <div className="font-medium">
                  {analysisConfig.variance_threshold_pct}%
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-gray-400" />
              <div>
                <div className="text-sm text-gray-600">Pattern Detection</div>
                <div className="font-medium">
                  {analysisConfig.pattern_min_orders} orders
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Capabilities */}
      <div>
        <h3 className="font-semibold mb-3">Analysis Capabilities</h3>
        <div className="grid grid-cols-2 gap-3">
          {capabilities.enabled.map((cap) => (
            <div
              key={cap}
              className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded"
            >
              <Check className="w-5 h-5 text-green-600" />
              <span className="font-medium text-green-900">{cap}</span>
            </div>
          ))}
          {capabilities.disabled.map((cap) => (
            <div
              key={cap}
              className="flex items-center gap-2 p-3 bg-gray-50 border border-gray-200 rounded"
            >
              <X className="w-5 h-5 text-gray-400" />
              <span className="text-gray-600">{cap}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Missing Fields Alert */}
      {capabilities.disabled.length > 0 && (
        <Alert>
          <AlertDescription>
            <p className="font-medium mb-1">Want more capabilities?</p>
            <p className="text-sm">
              To unlock {capabilities.disabled.join(", ")}, include these
              fields:
              {tier.missingFields?.join(", ")}
            </p>
          </AlertDescription>
        </Alert>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Edit
        </Button>
        <Button onClick={onContinue} size="lg">
          Upload & Analyze
        </Button>
      </div>
    </div>
  );
}

function detectTier(fields: string[]) {
  const hasWorkOrder = fields.includes("work_order_number");
  const hasCosts =
    fields.includes("planned_material_cost") &&
    fields.includes("actual_material_cost");
  const hasEquipment = fields.includes("machine_id");
  const hasQuality =
    fields.includes("units_produced") && fields.includes("units_scrapped");
  const hasLabor =
    fields.includes("planned_labor_hours") &&
    fields.includes("actual_labor_hours");

  if (hasWorkOrder && hasCosts && hasEquipment && hasQuality && hasLabor) {
    return {
      tier: "Tier 3",
      name: "Predictive Analysis",
      description: "Full capabilities with ML predictions",
      missingFields: [],
    };
  } else if (hasWorkOrder && hasCosts && (hasEquipment || hasQuality)) {
    return {
      tier: "Tier 2",
      name: "Advanced Analytics",
      description: "Enhanced insights with correlations",
      missingFields: !hasEquipment
        ? ["machine_id"]
        : ["units_produced", "units_scrapped"],
    };
  } else {
    return {
      tier: "Tier 1",
      name: "Basic Analysis",
      description: "Core cost variance detection",
      missingFields: [
        "machine_id",
        "units_produced",
        "units_scrapped",
        "labor_hours",
      ],
    };
  }
}

function getTierCapabilities(tier: any) {
  const allCapabilities = {
    "Cost Variance Detection": true,
    "Material Analysis": true,
    "Equipment Performance": tier.tier !== "Tier 1",
    "Quality Analysis": tier.tier !== "Tier 1",
    "Labor Efficiency": tier.tier === "Tier 3",
    "Predictive Maintenance": tier.tier === "Tier 3",
  };

  return {
    enabled: Object.entries(allCapabilities)
      .filter(([_, enabled]) => enabled)
      .map(([name]) => name),
    disabled: Object.entries(allCapabilities)
      .filter(([_, enabled]) => !enabled)
      .map(([name]) => name),
  };
}
