// src/components/file-upload.tsx - ALL ERRORS FIXED
"use client";

import { useFileUploadV2 } from "@/hooks/useFileUploadV2";
import type { FieldMapping } from "@/hooks/useFileUploadV2";
import { CSVMappingWithConfig } from "./csv-mapping-with-config";
import { TierPreview } from "./tier-preview";
import { UploadDropzone } from "./upload-dropzone";
import { UploadProgress } from "./upload-progress";

export function FileUpload() {
  const {
    uploadState,
    mappingData,
    error,
    handleFileSelected,
    handleMappingsConfirmed,
    handleTierConfirmed,
    handleSaveTemplate,
  } = useFileUploadV2();

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded">
        <p className="text-red-800">{error}</p>
      </div>
    );
  }

  return (
    <>
      {uploadState === "idle" && (
        <UploadDropzone onFileSelected={handleFileSelected} />
      )}

      {uploadState === "mapping" && mappingData && (
        <CSVMappingWithConfig
          csvHeaders={mappingData.headers}
          sampleRows={mappingData.sampleRows}
          initialMappings={mappingData.initialMappings}
          defaultConfig={mappingData.analysisConfig}
          templateName={mappingData.templateName}
          onMappingsChange={(mappings) => {
            // Update state as user edits
          }}
          onConfigChange={(config) => {
            // Update state as user edits
          }}
          onContinue={() => {
            const finalMappings =
              mappingData.finalMappings || mappingData.initialMappings;
            const config = mappingData.analysisConfig!;
            handleMappingsConfirmed(finalMappings, config);
          }}
          onSaveTemplate={handleSaveTemplate}
        />
      )}

      {uploadState === "tier-preview" && mappingData && (
        <TierPreview
          mappedFields={
            // FIXED: Added proper type annotations
            (
              mappingData.finalMappings?.map(
                (m: FieldMapping) => m.targetField
              ) || []
            ).filter((field: string | null): field is string => field !== null)
          }
          analysisConfig={mappingData.analysisConfig}
          onBack={() => {
            // Go back to mapping
          }}
          onContinue={handleTierConfirmed}
        />
      )}

      {uploadState === "uploading" && <UploadProgress />}

      {uploadState === "complete" && (
        <div className="p-6 bg-green-50 border border-green-200 rounded">
          <h3 className="text-xl font-bold text-green-800 mb-2">
            Upload Complete!
          </h3>
          <p className="text-green-700">
            Your data is being analyzed. Check the dashboard for insights.
          </p>
        </div>
      )}
    </>
  );
}
