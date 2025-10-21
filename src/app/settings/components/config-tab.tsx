"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

interface CustomerProfile {
  variance_threshold_pct: number;
  min_variance_amount: number;
  confidence_threshold_pct: number;
  focus_material_costs: boolean;
  focus_labor_efficiency: boolean;
  focus_quality_issues: boolean;
  focus_equipment: boolean;
  excluded_suppliers: string[];
  excluded_materials: string[];
  excluded_wo_types: string[];
}

export function ConfigTab() {
  const [config, setConfig] = useState<CustomerProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadConfig();
  }, []);

  async function loadConfig() {
    try {
      const res = await fetch("/api/customer/config");
      if (!res.ok) throw new Error("Failed to load configuration");
      const data = await res.json();
      setConfig(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <div className="text-center py-8">Loading configuration...</div>;
  }

  if (!config) {
    return (
      <Alert>
        <AlertDescription>
          No configuration found. Please complete onboarding.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <Alert className="bg-blue-50 border-blue-200">
        <AlertDescription>
          These settings are configured during onboarding. Contact your analyst
          to request changes.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>Detection Thresholds</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-gray-600">Variance Threshold</div>
              <div className="text-2xl font-bold">
                {config.variance_threshold_pct}%
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Minimum Amount</div>
              <div className="text-2xl font-bold">
                ${config.min_variance_amount.toLocaleString()}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Confidence Threshold</div>
              <div className="text-2xl font-bold">
                {config.confidence_threshold_pct}%
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Analysis Focus Areas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {config.focus_material_costs && <Badge>Material Costs</Badge>}
            {config.focus_labor_efficiency && <Badge>Labor Efficiency</Badge>}
            {config.focus_quality_issues && <Badge>Quality Issues</Badge>}
            {config.focus_equipment && <Badge>Equipment</Badge>}
          </div>
        </CardContent>
      </Card>

      {(config.excluded_suppliers.length > 0 ||
        config.excluded_materials.length > 0 ||
        config.excluded_wo_types.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle>Exclusions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {config.excluded_suppliers.length > 0 && (
              <div>
                <div className="text-sm text-gray-600 mb-2">
                  Excluded Suppliers
                </div>
                <div className="flex flex-wrap gap-2">
                  {config.excluded_suppliers.map((s) => (
                    <Badge key={s} variant="secondary">
                      {s}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            {config.excluded_materials.length > 0 && (
              <div>
                <div className="text-sm text-gray-600 mb-2">
                  Excluded Materials
                </div>
                <div className="flex flex-wrap gap-2">
                  {config.excluded_materials.map((m) => (
                    <Badge key={m} variant="secondary">
                      {m}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            {config.excluded_wo_types.length > 0 && (
              <div>
                <div className="text-sm text-gray-600 mb-2">
                  Excluded Work Order Types
                </div>
                <div className="flex flex-wrap gap-2">
                  {config.excluded_wo_types.map((t) => (
                    <Badge key={t} variant="secondary">
                      {t}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
