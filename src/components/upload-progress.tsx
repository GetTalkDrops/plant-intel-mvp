// src/components/upload-progress.tsx
"use client";

import { Loader2 } from "lucide-react";

export function UploadProgress() {
  return (
    <div className="flex flex-col items-center justify-center p-12 space-y-4">
      <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
      <div className="text-center">
        <h3 className="text-xl font-bold mb-2">Processing Upload...</h3>
        <p className="text-gray-600">
          We are uploading your data and starting the analysis.
        </p>
        <p className="text-sm text-gray-500 mt-2">
          This may take a few moments depending on file size.
        </p>
      </div>
      <div className="w-full max-w-md bg-gray-200 rounded-full h-2 overflow-hidden">
        <div
          className="h-full bg-blue-600 animate-pulse"
          style={{ width: "100%" }}
        ></div>
      </div>
    </div>
  );
}
