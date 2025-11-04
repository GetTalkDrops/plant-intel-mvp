// src/components/file-upload.tsx
"use client";

import { useFileUpload } from "@/hooks/useFileUpload";
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
  } = useFileUpload();

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
            mappingData.finalMappings?.map((m) => m.targetField) || []
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
