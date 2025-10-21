"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Trash2, Calendar } from "lucide-react";

// Add this interface at the top with the other interfaces
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
  created_at: string;
}

export function MappingsTab() {
  const [mappings, setMappings] = useState<CsvMapping[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadMappings();
  }, []);

  async function loadMappings() {
    try {
      const res = await fetch("/api/csv-mapping/list");
      if (!res.ok) throw new Error("Failed to load mappings");
      const data = await res.json();
      console.log("Mappings data:", data); // Add this line
      setMappings(data.mappings || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load mappings");
      console.error("Load mappings error:", err); // Add this line
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

  if (loading) {
    return <div className="text-center py-8">Loading mappings...</div>;
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (mappings.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-gray-500">No saved mappings yet.</p>
          <p className="text-sm text-gray-400 mt-2">
            Upload a CSV file to create your first mapping.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-sm text-gray-600">
        {mappings.length} saved {mappings.length === 1 ? "mapping" : "mappings"}
      </div>

      {mappings.map((mapping) => (
        <Card key={mapping.id}>
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className="text-lg">
                  Mapping #{mapping.id.slice(0, 8)}
                </CardTitle>
                <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    Created: {new Date(mapping.created_at).toLocaleDateString()}
                  </div>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => deleteMapping(mapping.id)}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-sm font-medium">Field Mappings:</div>
              {mapping.mapping_config.length > 0 ? (
                <div className="grid grid-cols-2 gap-2">
                  {mapping.mapping_config.map(
                    (m: MappingField, idx: number) => (
                      <div
                        key={idx}
                        className="flex items-center gap-2 text-sm"
                      >
                        <span className="text-gray-600">{m.sourceColumn}</span>
                        <span className="text-gray-400">→</span>
                        <Badge variant="secondary">{m.targetField}</Badge>
                      </div>
                    )
                  )}
                </div>
              ) : (
                <p className="text-sm text-gray-500">
                  No field mappings configured
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
