"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Trash2, Calendar, Pencil, Check, X, Edit } from "lucide-react";
import { EditMappingModal } from "@/components/edit-mapping-modal";
import { type ColumnMapping } from "@/lib/csv/csvMapper";

interface MappingField {
  sourceColumn: string;
  targetField: string;
  dataType: string;
  confidence?: number;
}

interface CsvMapping {
  id: string;
  user_email: string;
  header_signature: string;
  mapping_config: MappingField[];
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
      const res = await fetch("/api/csv-mapping/list");
      if (!res.ok) throw new Error("Failed to load mappings");
      const data = await res.json();
      setMappings(data.mappings || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load mappings");
    } finally {
      setLoading(false);
    }
  }

  async function deleteMapping(id: string) {
    if (!confirm("Delete this mapping? This cannot be undone.")) return;

    try {
      const res = await fetch(`/api/csv-mapping/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete mapping");
      setMappings(mappings.filter((m) => m.id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete mapping");
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
      const res = await fetch(`/api/csv-mapping/${id}`, {
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
    setEditMappingModalOpen(true);
  }

  function closeEditMappingModal() {
    setEditMappingModalOpen(false);
    setEditingMapping(null);
  }

  async function handleMappingUpdate(
    mappingId: string,
    updatedMappings: ColumnMapping[]
  ) {
    try {
      const res = await fetch(`/api/csv-mapping/${mappingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mapping_config: updatedMappings }),
      });

      if (!res.ok) throw new Error("Failed to update mappings");

      setMappings(
        mappings.map((m) =>
          m.id === mappingId
            ? { ...m, mapping_config: updatedMappings as MappingField[] }
            : m
        )
      );
      closeEditMappingModal();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update mappings");
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
              <div className="space-y-3">
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
                    Edit Mappings
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
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {editingMapping && (
        <EditMappingModal
          isOpen={editMappingModalOpen}
          mappingId={editingMapping.id}
          mappingName={editingMapping.name}
          currentMappings={editingMapping.mapping_config as ColumnMapping[]}
          onConfirm={handleMappingUpdate}
          onCancel={closeEditMappingModal}
        />
      )}
    </>
  );
}
