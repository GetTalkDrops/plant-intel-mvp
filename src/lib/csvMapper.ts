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

export const STANDARD_MANUFACTURING_FIELDS = {
  // Core identifiers
  work_order_id: [
    "work_order_id",
    "work_order",
    "wo_id",
    "order_id",
    "job_number",
  ],
  material_number: [
    "material_number",
    "part_number",
    "material_id",
    "sku",
    "item_code",
  ],
  machine_id: [
    "machine_id",
    "equipment_id",
    "asset_id",
    "workstation",
    "line_id",
  ],

  // Quantities
  planned_quantity: [
    "planned_quantity",
    "planned_qty",
    "target_qty",
    "order_quantity",
  ],
  actual_quantity: [
    "actual_quantity",
    "actual_qty",
    "produced_qty",
    "output_quantity",
  ],
  scrap_quantity: [
    "scrap_quantity",
    "scrap_qty",
    "waste_qty",
    "reject_quantity",
  ],

  // Times and dates
  planned_start_date: ["planned_start_date", "start_date", "scheduled_start"],
  actual_start_date: ["actual_start_date", "actual_start", "start_time"],
  planned_completion_date: [
    "planned_completion_date",
    "due_date",
    "target_completion",
  ],
  actual_completion_date: [
    "actual_completion_date",
    "completion_date",
    "finish_time",
  ],

  // Labor
  labor_hours_planned: [
    "labor_hours_planned",
    "planned_hours",
    "standard_hours",
  ],
  labor_hours_actual: ["labor_hours_actual", "actual_hours", "hours_worked"],

  // Quality
  quality_result: [
    "quality_result",
    "qc_result",
    "inspection_result",
    "pass_fail",
  ],

  // Optional fields
  shift_id: ["shift_id", "shift", "team_id", "crew"],
  operator_id: ["operator_id", "employee_id", "worker_id"],
};

export async function processFileUpload(
  file: File
): Promise<FileProcessingResult> {
  const text = await file.text();

  // Always treat as CSV for now since your file is CSV
  const lines = text.trim().split("\n");

  if (lines.length === 0) {
    throw new Error("File is empty");
  }

  // Detect delimiter
  const firstLine = lines[0];
  const delimiter = firstLine.includes("\t")
    ? "\t"
    : firstLine.includes(";")
    ? ";"
    : ",";

  const headers = firstLine
    .split(delimiter)
    .map((h) => h.trim().replace(/"/g, ""));
  const sampleRows = lines
    .slice(1, 6)
    .map((line) =>
      line.split(delimiter).map((cell) => cell.trim().replace(/"/g, ""))
    );

  return {
    headers,
    sampleRows,
    fileType: "csv",
    processingNotes: [
      `Detected ${headers.length} columns with ${
        delimiter === "\t" ? "tab" : delimiter
      } delimiter`,
    ],
  };
}
function processJSON(text: string): FileProcessingResult {
  try {
    const data = JSON.parse(text);
    let records: Record<string, unknown>[] = [];

    if (Array.isArray(data)) {
      records = data;
    } else if (typeof data === "object" && data !== null) {
      records = [data];
    }

    if (
      records.length > 0 &&
      typeof records[0] === "object" &&
      records[0] !== null
    ) {
      const flattenedRecords = records.map((record) => flattenObject(record));
      const headers = Object.keys(flattenedRecords[0] || {});
      const sampleRows = flattenedRecords
        .slice(0, 5)
        .map((record) => headers.map((header) => String(record[header] || "")));

      return {
        headers,
        sampleRows,
        fileType: "json",
        processingNotes: [`Processed ${records.length} JSON records`],
      };
    }
  } catch (error) {
    return {
      headers: [],
      sampleRows: [],
      fileType: "json",
      processingNotes: ["Invalid JSON format"],
    };
  }

  return {
    headers: [],
    sampleRows: [],
    fileType: "json",
    processingNotes: ["Unable to process JSON structure"],
  };
}

function processXML(text: string): FileProcessingResult {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(text, "text/xml");

    // Check for parsing errors
    const errorNode = doc.querySelector("parsererror");
    if (errorNode) {
      return {
        headers: [],
        sampleRows: [],
        fileType: "xml",
        processingNotes: ["Invalid XML format"],
      };
    }

    // Look for common XML table patterns
    const rows = Array.from(doc.querySelectorAll("row, record, item, entry"));

    if (rows.length > 0) {
      const firstRow = rows[0];
      const headers = Array.from(firstRow.children).map(
        (child) => child.tagName
      );
      const sampleRows = rows.slice(0, 5).map((row) =>
        headers.map((header) => {
          const element = row.querySelector(header);
          return element?.textContent?.trim() || "";
        })
      );

      return {
        headers,
        sampleRows,
        fileType: "xml",
        processingNotes: [`Processed ${rows.length} XML records`],
      };
    }
  } catch (error) {
    return {
      headers: [],
      sampleRows: [],
      fileType: "xml",
      processingNotes: ["Error parsing XML"],
    };
  }

  return {
    headers: [],
    sampleRows: [],
    fileType: "xml",
    processingNotes: ["Unable to process XML structure"],
  };
}

function flattenObject(
  obj: Record<string, unknown>,
  prefix = ""
): Record<string, unknown> {
  const flattened: Record<string, unknown> = {};

  for (const key in obj) {
    const value = obj[key];

    if (value === null || value === undefined) {
      flattened[prefix + key] = "";
    } else if (
      typeof value === "object" &&
      !Array.isArray(value) &&
      value !== null
    ) {
      Object.assign(
        flattened,
        flattenObject(value as Record<string, unknown>, prefix + key + "_")
      );
    } else {
      flattened[prefix + key] = value;
    }
  }

  return flattened;
}

export async function generateCSVMapping(
  headers: string[],
  sampleRows: string[][]
): Promise<CSVMappingSuggestion> {
  const response = await fetch("/api/csv-mapping", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ headers, sampleRows }),
  });

  return response.json();
}
