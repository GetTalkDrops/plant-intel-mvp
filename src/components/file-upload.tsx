// src/components/file-upload.tsx - REFACTORED WITH NEW COMPONENTS
"use client";

import { useFileUploadV2 } from "@/hooks/useFileUploadV2";
import { CSVMappingTable, TemplateConfirmation } from "./csv";
import { TierPreview } from "./tier-preview";
import { UploadDropzone } from "./upload-dropzone";
import { UploadProgress } from "./upload-progress";

export function FileUpload() {
  const {
    uploadState,
    mappingData,
    templateMatch,
    error,
    handleFileSelected,
    handleUseTemplate,
    handleEditTemplate,
    handleStartFresh,
    handleMappingsConfirmed,
    handleBackToMapping,
    handleTierConfirmed,
    handleCancel,
  } = useFileUploadV2();

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded">
        <p className="text-red-800">{error}</p>
        <button
          onClick={handleCancel}
          className="mt-2 px-4 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <>
      {/* Step 1: Upload CSV */}
      {uploadState === "idle" && (
        <UploadDropzone onFileSelected={handleFileSelected} />
      )}

      {/* Step 2a: Template confirmation (if template match found) */}
      {uploadState === "template-confirmation" && templateMatch && (
        <TemplateConfirmation
          templateName={templateMatch.name}
          mappings={templateMatch.mappings}
          config={templateMatch.analysisConfig}
          onUseTemplate={handleUseTemplate}
          onEditTemplate={handleEditTemplate}
          onStartFresh={handleStartFresh}
        />
      )}

      {/* Step 2b: Mapping table (new or editing template) */}
      {uploadState === "mapping" && mappingData && (
        <CSVMappingTable
          csvHeaders={mappingData.headers}
          sampleRows={mappingData.sampleRows}
          initialMappings={mappingData.initialMappings}
          defaultConfig={mappingData.analysisConfig}
          templateName={mappingData.templateName}
          usingSavedTemplate={!!mappingData.templateName}
          onMappingsChange={() => {
            // Live updates handled internally by component
          }}
          onConfigChange={() => {
            // Live updates handled internally by component
          }}
          onContinue={(templateName) => {
            // Component handles validation, just pass the data forward
            const finalMappings = mappingData.initialMappings;
            const config = mappingData.analysisConfig!;
            handleMappingsConfirmed(finalMappings, config, templateName);
          }}
          onCancel={handleCancel}
        />
      )}

      {/* Step 3: Tier preview */}
      {uploadState === "tier-preview" && mappingData && (
        <TierPreview
          mappedFields={
            mappingData.finalMappings
              ?.map((m) => m.targetField)
              .filter((field): field is string => field !== null) || []
          }
          analysisConfig={mappingData.analysisConfig}
          onBack={handleBackToMapping}
          onContinue={handleTierConfirmed}
        />
      )}

      {/* Step 4: Uploading */}
      {uploadState === "uploading" && <UploadProgress />}

      {/* Step 5: Complete */}
      {uploadState === "complete" && (
        <div className="p-6 bg-green-50 border border-green-200 rounded">
          <h3 className="text-xl font-bold text-green-800 mb-2">
            Upload Complete!
          </h3>
          <p className="text-green-700">
            Your data is being analyzed. Check the dashboard for insights.
          </p>
          <button
            onClick={handleCancel}
            className="mt-4 px-4 py-2 text-sm bg-green-600 text-white rounded hover:bg-green-700"
          >
            Upload Another File
          </button>
        </div>
      )}
    </>
  );
}
