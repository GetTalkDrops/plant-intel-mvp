"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Trash2, Calendar, Pencil, Check, X, Edit, DollarSign, Percent, TrendingUp } from "lucide-react";
import { CSVMappingTable } from "@/components/csv";
import { type AnalysisConfig, DEFAULT_ANALYSIS_CONFIG } from "@/lib/csv/csv-config-defaults";

interface MappingField {
  sourceColumn: string;
  targetField: string | null;
  dataType: string;
  confidence?: number;
  matchType?: string;
  required?: boolean;
}

interface CsvMapping {
  id: string;
  user_email: string;
  header_signature: string;
  mapping_config: MappingField[];
  analysis_config?: AnalysisConfig;
  name: string;
  created_at: string;
}

export function MappingsTab() {
  const [mappings, setMappings] = useState<CsvMapping[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editMappingModalOpen, setEditMappingModalOpen] = useState(false);
  const [editingMapping, setEditingMapping] = useState<CsvMapping | null>(null);
  const [editedMappings, setEditedMappings] = useState<MappingField[]>([]);
  const [editedConfig, setEditedConfig] = useState<AnalysisConfig>(DEFAULT_ANALYSIS_CONFIG);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadMappings();
  }, []);

  useEffect(() => {
    if (editingId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingId]);

  async function loadMappings() {
    try {
      const res = await fetch("/api/csv-templates");
      if (!res.ok) throw new Error("Failed to load templates");
      const data = await res.json();
      setMappings(data.templates || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load templates");
    } finally {
      setLoading(false);
    }
  }

  async function deleteMapping(id: string) {
    if (!confirm("Delete this template? This cannot be undone.")) return;

    try {
      const res = await fetch(`/api/csv-templates/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete template");
      setMappings(mappings.filter((m) => m.id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete template");
    }
  }

  function startEditName(mapping: CsvMapping) {
    setEditingId(mapping.id);
    setEditName(mapping.name);
  }

  function cancelEditName() {
    setEditingId(null);
    setEditName("");
  }

  async function saveEditName(id: string) {
    const trimmedName = editName.trim();

    if (!trimmedName) {
      alert("Name cannot be empty");
      return;
    }

    try {
      const res = await fetch(`/api/csv-templates/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmedName }),
      });

      if (!res.ok) throw new Error("Failed to update name");

      setMappings(
        mappings.map((m) => (m.id === id ? { ...m, name: trimmedName } : m))
      );
      setEditingId(null);
      setEditName("");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update name");
    }
  }

  function openEditMappingModal(mapping: CsvMapping) {
    setEditingMapping(mapping);
    setEditedMappings(mapping.mapping_config);
    setEditedConfig(mapping.analysis_config || DEFAULT_ANALYSIS_CONFIG);
    setEditMappingModalOpen(true);
  }

  function closeEditMappingModal() {
    setEditMappingModalOpen(false);
    setEditingMapping(null);
    setEditedMappings([]);
    setEditedConfig(DEFAULT_ANALYSIS_CONFIG);
  }

  async function handleTemplateUpdate(templateName: string) {
    if (!editingMapping) return;

    try {
      const mappingsToSave = editedMappings.filter(m => m.targetField !== null);

      const res = await fetch(`/api/csv-templates/${editingMapping.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: templateName,
          mapping_config: mappingsToSave,
          analysis_config: editedConfig,
        }),
      });

      if (!res.ok) throw new Error("Failed to update template");

      await loadMappings();
      closeEditMappingModal();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update template");
      throw err;
    }
  }

  if (loading) {
    return (
      <div className="text-center py-8 text-sm sm:text-base">
        Loading mappings...
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription className="text-sm sm:text-base">
          {error}
        </AlertDescription>
      </Alert>
    );
  }

  if (mappings.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 sm:py-12 text-center">
          <p className="text-sm sm:text-base text-gray-500">
            No saved mappings yet.
          </p>
          <p className="text-xs sm:text-sm text-gray-400 mt-2">
            Upload a CSV file to create your first mapping.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-3 sm:space-y-4">
        <div className="text-xs sm:text-sm text-gray-600">
          {mappings.length} saved{" "}
          {mappings.length === 1 ? "mapping" : "mappings"}
        </div>

        {mappings.map((mapping) => (
          <Card key={mapping.id}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  {editingId === mapping.id ? (
                    <div className="flex items-center gap-2">
                      <input
                        ref={inputRef}
                        type="text"
                        value={editName}
                        onChange={(e) =>
                          setEditName(e.target.value.slice(0, 50))
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter") saveEditName(mapping.id);
                          if (e.key === "Escape") cancelEditName();
                        }}
                        maxLength={50}
                        className="flex-1 px-2 py-1 text-base sm:text-lg font-semibold border border-blue-500 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => saveEditName(mapping.id)}
                        className="text-green-600 hover:text-green-700 hover:bg-green-50 p-1 h-auto"
                      >
                        <Check className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={cancelEditName}
                        className="text-gray-600 hover:text-gray-700 hover:bg-gray-50 p-1 h-auto"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <div
                      onClick={() => startEditName(mapping)}
                      className="group cursor-pointer"
                    >
                      <CardTitle className="text-base sm:text-lg flex items-center gap-2 break-words">
                        <span>{mapping.name}</span>
                        <Pencil className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                      </CardTitle>
                    </div>
                  )}
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 mt-2 text-xs sm:text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                      <span className="break-words">
                        {new Date(mapping.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteMapping(mapping.id)}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50 flex-shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="text-xs sm:text-sm font-medium">
                    Field Mappings:
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEditMappingModal(mapping)}
                    className="text-xs sm:text-sm"
                  >
                    <Edit className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                    Edit Template
                  </Button>
                </div>
                {mapping.mapping_config.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {mapping.mapping_config.map(
                      (m: MappingField, idx: number) => (
                        <div
                          key={idx}
                          className="flex items-center gap-2 text-xs sm:text-sm"
                        >
                          <span className="text-gray-600 truncate">
                            {m.sourceColumn}
                          </span>
                          <span className="text-gray-400 flex-shrink-0">→</span>
                          <Badge variant="secondary" className="text-xs">
                            {m.targetField}
                          </Badge>
                        </div>
                      )
                    )}
                  </div>
                ) : (
                  <p className="text-xs sm:text-sm text-gray-500">
                    No field mappings configured
                  </p>
                )}

                {mapping.analysis_config && (
                  <div className="border-t pt-3 mt-3">
                    <div className="text-xs sm:text-sm font-medium mb-2">
                      Configuration:
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs sm:text-sm">
                      <div className="flex items-center gap-1 text-gray-600">
                        <DollarSign className="w-3 h-3 flex-shrink-0" />
                        <span>Labor Rate: ${mapping.analysis_config.labor_rate_hourly}/hr</span>
                      </div>
                      <div className="flex items-center gap-1 text-gray-600">
                        <DollarSign className="w-3 h-3 flex-shrink-0" />
                        <span>Scrap Cost: ${mapping.analysis_config.scrap_cost_per_unit}/unit</span>
                      </div>
                      <div className="flex items-center gap-1 text-gray-600">
                        <Percent className="w-3 h-3 flex-shrink-0" />
                        <span>Variance Threshold: {mapping.analysis_config.variance_threshold_pct}%</span>
                      </div>
                      <div className="flex items-center gap-1 text-gray-600">
                        <TrendingUp className="w-3 h-3 flex-shrink-0" />
                        <span>Pattern Min: {mapping.analysis_config.pattern_min_orders} orders</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {editingMapping && (
        <Dialog
          open={editMappingModalOpen}
          onOpenChange={(open) => {
            if (!open) closeEditMappingModal();
          }}
        >
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
            <CSVMappingTable
              csvHeaders={editingMapping.mapping_config.map(m => m.sourceColumn)}
              sampleRows={[]}
              initialMappings={editingMapping.mapping_config.map(m => ({
                sourceColumn: m.sourceColumn,
                targetField: m.targetField,
                confidence: m.confidence || 1.0,
                matchType: m.matchType || "manual",
                dataType: m.dataType || "string",
                required: m.required || false
              }))}
              defaultConfig={editingMapping.analysis_config || DEFAULT_ANALYSIS_CONFIG}
              templateName={editingMapping.name}
              usingSavedTemplate={true}
              onMappingsChange={(mappings) => {
                setEditedMappings(mappings as MappingField[]);
              }}
              onConfigChange={(config) => {
                setEditedConfig(config);
              }}
              onContinue={handleTemplateUpdate}
              onCancel={closeEditMappingModal}
            />
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
