// src/lib/csvMapper.ts
/**
 * Type definitions for CSV upload system
 * Backend handles all parsing, mapping, and validation
 */

export interface ColumnMapping {
  sourceColumn: string;
  targetField: string;
  confidence: number;
  dataType: "string" | "number" | "date" | "boolean";
}

export interface CSVMappingSuggestion {
  mappings: ColumnMapping[];
  unmappedColumns: string[];
  requiredFieldsCovered: string[];
  missingRequiredFields: string[];
  confidence: number;
}

export interface FileProcessingResult {
  headers: string[];
  sampleRows: string[][];
  fileType: "csv" | "json" | "xml";
  processingNotes: string[];
}

// That's it! Backend does everything else.
