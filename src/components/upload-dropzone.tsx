// src/components/upload-dropzone.tsx
"use client";

import { useCallback } from "react";
import { Upload } from "lucide-react";

interface UploadDropzoneProps {
  onFileSelected: (file: File) => void;
}

export function UploadDropzone({ onFileSelected }: UploadDropzoneProps) {
  const handleFileChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
        onFileSelected(file);
      }
    },
    [onFileSelected]
  );

  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      const file = event.dataTransfer.files?.[0];
      if (file && file.type === "text/csv") {
        onFileSelected(file);
      }
    },
    [onFileSelected]
  );

  const handleDragOver = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
    },
    []
  );

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center hover:border-gray-400 transition-colors"
    >
      <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
      <h3 className="text-lg font-semibold mb-2">Upload CSV File</h3>
      <p className="text-gray-600 mb-4">
        Drag and drop your CSV file here, or click to browse
      </p>
      <label className="inline-block">
        <input
          type="file"
          accept=".csv"
          onChange={handleFileChange}
          className="hidden"
        />
        <span className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer inline-block">
          Select File
        </span>
      </label>
      <p className="text-xs text-gray-500 mt-4">
        Supported format: CSV (comma-separated values)
      </p>
    </div>
  );
}
