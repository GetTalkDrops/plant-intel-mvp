/**
 * CSV Field Mapper - Robust column matching with fuzzy logic and synonyms
 * Handles variations like "WO #" vs "Work Order Number" vs "Order ID"
 */

export interface FieldDefinition {
  targetField: string;
  displayName: string;
  required: boolean;
  dataType: "string" | "number" | "date" | "boolean";
  dataTierRequired: number;
  synonyms: string[];
  patterns: RegExp[];
  examples: string[];
}

export interface DataTierRequirements {
  tier: 1 | 2 | 3;
  name: string;
  description: string;
  requiredFields: string[];
  optionalFields: string[];
  analysisCapabilities: string[];
}

export const DATA_TIERS: DataTierRequirements[] = [
  {
    tier: 1,
    name: "Basic Analysis",
    description: "Cost variance detection and basic trends",
    requiredFields: [
      "work_order_number",
      "planned_material_cost",
      "actual_material_cost",
    ],
    optionalFields: [
      "planned_labor_hours",
      "actual_labor_hours",
      "production_period_start",
    ],
    analysisCapabilities: [
      "Cost variance identification",
      "Basic savings opportunities",
      "Simple pattern detection",
    ],
  },
  {
    tier: 2,
    name: "Enhanced Analysis",
    description: "Supplier/equipment patterns with 30-day baselines",
    requiredFields: [
      "work_order_number",
      "planned_material_cost",
      "actual_material_cost",
      "supplier_id",
      "material_code",
      "production_period_start",
    ],
    optionalFields: [
      "machine_id",
      "equipment_id",
      "planned_labor_hours",
      "actual_labor_hours",
      "units_produced",
      "units_scrapped",
    ],
    analysisCapabilities: [
      "Supplier performance trending",
      "Material cost patterns",
      "Baseline comparisons (vs your typical)",
      "Equipment efficiency tracking",
    ],
  },
  {
    tier: 3,
    name: "Predictive Analysis",
    description: "Full time-series analysis with degradation detection",
    requiredFields: [
      "work_order_number",
      "planned_material_cost",
      "actual_material_cost",
      "supplier_id",
      "material_code",
      "production_period_start",
      "machine_id",
      "units_produced",
    ],
    optionalFields: [
      "units_scrapped",
      "quality_issues",
      "planned_labor_hours",
      "actual_labor_hours",
      "batch_id",
      "lot_batch_number",
      "production_period_end",
    ],
    analysisCapabilities: [
      "Predictive degradation detection",
      "Quality correlation analysis",
      "Equipment failure prediction",
      "Time-series trend analysis",
      "Multi-factor root cause analysis",
    ],
  },
];

export const FIELD_DEFINITIONS: FieldDefinition[] = [
  {
    targetField: "work_order_number",
    displayName: "Work Order Number",
    required: true,
    dataType: "string",
    dataTierRequired: 1,
    synonyms: [
      "work order",
      "wo number",
      "wo #",
      "wo num",
      "order number",
      "order id",
      "job number",
      "job id",
      "shop order",
      "production order",
      "manufacturing order",
      "work_order",
      "workorder",
      "order_num",
    ],
    patterns: [
      /^wo[_\s#-]?(num|number|id)?$/i,
      /^(work|job|shop|prod)[\s_-]?(order|num|number|id)$/i,
      /^order[_\s#-]?(num|number|id)?$/i,
    ],
    examples: ["WO #", "Work Order Number", "Order ID", "Job Number"],
  },
  {
    targetField: "material_code",
    displayName: "Material/Part Code",
    required: false,
    dataType: "string",
    dataTierRequired: 2,
    synonyms: [
      "material",
      "part number",
      "part code",
      "part num",
      "part id",
      "item code",
      "item number",
      "product code",
      "sku",
      "material_number",
      "part_num",
      "item_id",
      "product_id",
    ],
    patterns: [
      /^(material|part|item|product)[_\s-]?(code|num|number|id)?$/i,
      /^sku$/i,
    ],
    examples: ["Material Code", "Part Number", "SKU", "Item Code"],
  },
  {
    targetField: "supplier_id",
    displayName: "Supplier ID",
    required: false,
    dataType: "string",
    dataTierRequired: 2,
    synonyms: [
      "supplier",
      "vendor",
      "vendor id",
      "vendor number",
      "supplier number",
      "vendor_id",
      "vendor_num",
      "supplier_num",
      "supplier_code",
      "vendor_code",
    ],
    patterns: [/^(supplier|vendor)[_\s-]?(id|num|number|code)?$/i],
    examples: ["Supplier ID", "Vendor", "Vendor Number"],
  },
  {
    targetField: "planned_material_cost",
    displayName: "Planned Material Cost",
    required: true,
    dataType: "number",
    dataTierRequired: 1,
    synonyms: [
      "planned cost",
      "estimated cost",
      "budgeted cost",
      "target cost",
      "standard cost",
      "expected cost",
      "planned_cost",
      "estimated_material_cost",
      "budget_cost",
      "target_material_cost",
      "budget",
    ],
    patterns: [
      /^(planned|estimated|budgeted|target|standard|expected)[_\s-]?(material[_\s-]?)?(cost|amount)$/i,
    ],
    examples: ["Planned Cost", "Estimated Material Cost", "Budget Cost"],
  },
  {
    targetField: "actual_material_cost",
    displayName: "Actual Material Cost",
    required: true,
    dataType: "number",
    dataTierRequired: 1,
    synonyms: [
      "actual cost",
      "real cost",
      "final cost",
      "actual_cost",
      "actual_material_amount",
      "final_material_cost",
      "real_cost",
    ],
    patterns: [/^(actual|real|final)[_\s-]?(material[_\s-]?)?(cost|amount)$/i],
    examples: ["Actual Cost", "Real Material Cost", "Final Cost"],
  },
  {
    targetField: "planned_labor_hours",
    displayName: "Planned Labor Hours",
    required: false,
    dataType: "number",
    dataTierRequired: 1,
    synonyms: [
      "planned hours",
      "estimated hours",
      "budgeted hours",
      "target hours",
      "standard hours",
      "planned_hours",
      "estimated_labor_hours",
      "budget_hours",
    ],
    patterns: [
      /^(planned|estimated|budgeted|target|standard)[_\s-]?(labor[_\s-]?)?(hours|hrs|time)$/i,
    ],
    examples: ["Planned Hours", "Estimated Labor Hours", "Budget Hours"],
  },
  {
    targetField: "actual_labor_hours",
    displayName: "Actual Labor Hours",
    required: false,
    dataType: "number",
    dataTierRequired: 1,
    synonyms: [
      "actual hours",
      "real hours",
      "final hours",
      "actual_hours",
      "actual_labor_time",
      "real_hours",
    ],
    patterns: [/^(actual|real|final)[_\s-]?(labor[_\s-]?)?(hours|hrs|time)$/i],
    examples: ["Actual Hours", "Real Labor Hours", "Final Hours"],
  },
  {
    targetField: "machine_id",
    displayName: "Machine/Equipment ID",
    required: false,
    dataType: "string",
    dataTierRequired: 2,
    synonyms: [
      "machine",
      "equipment",
      "equipment id",
      "machine number",
      "equipment number",
      "asset id",
      "machine_num",
      "equipment_num",
      "asset_number",
      "work_center",
      "workcenter",
    ],
    patterns: [
      /^(machine|equipment|asset|work[\s_-]?center)[_\s-]?(id|num|number)?$/i,
    ],
    examples: ["Machine ID", "Equipment", "Work Center", "Asset Number"],
  },
  {
    targetField: "units_produced",
    displayName: "Units Produced",
    required: false,
    dataType: "number",
    dataTierRequired: 2,
    synonyms: [
      "quantity",
      "qty",
      "qty produced",
      "quantity produced",
      "units made",
      "production quantity",
      "output",
      "production_qty",
      "qty_produced",
      "units_made",
    ],
    patterns: [
      /^(units?|qty|quantity|production)[_\s-]?(produced|made|output)?$/i,
    ],
    examples: ["Quantity", "Qty Produced", "Units Made", "Output"],
  },
  {
    targetField: "units_scrapped",
    displayName: "Units Scrapped/Rejected",
    required: false,
    dataType: "number",
    dataTierRequired: 2,
    synonyms: [
      "scrap",
      "scrapped",
      "rejected",
      "defects",
      "rejects",
      "qty scrapped",
      "quantity scrapped",
      "scrap_qty",
      "rejected_units",
      "defect_qty",
    ],
    patterns: [
      /^(units?|qty|quantity)[_\s-]?(scrapped|rejected|defect|scrap)s?$/i,
      /^(scrap|reject|defect)s?[_\s-]?(units?|qty|quantity)?$/i,
    ],
    examples: ["Scrap", "Rejected Units", "Defects", "Qty Scrapped"],
  },
  {
    targetField: "quality_issues",
    displayName: "Quality Issues",
    required: false,
    dataType: "string",
    dataTierRequired: 2,
    synonyms: [
      "quality",
      "quality notes",
      "defect type",
      "issue type",
      "problem",
      "quality_notes",
      "defect_description",
      "issue_description",
    ],
    patterns: [
      /^quality[_\s-]?(issue|note|problem|defect)s?$/i,
      /^(defect|issue|problem)[_\s-]?(type|description)?$/i,
    ],
    examples: ["Quality Issues", "Defect Type", "Quality Notes"],
  },
  {
    targetField: "production_period_start",
    displayName: "Production Start Date",
    required: false,
    dataType: "date",
    dataTierRequired: 2,
    synonyms: [
      "start date",
      "production date",
      "work date",
      "date",
      "start_date",
      "production_date",
      "work_order_date",
      "order_date",
      "created_date",
      "scheduled_start",
    ],
    patterns: [
      /^(production|work|start|order|created|scheduled)[_\s-]?(date|period[_\s-]?start)$/i,
      /^date$/i,
    ],
    examples: ["Start Date", "Production Date", "Order Date", "Date"],
  },
  {
    targetField: "production_period_end",
    displayName: "Production End Date",
    required: false,
    dataType: "date",
    dataTierRequired: 2,
    synonyms: [
      "end date",
      "completion date",
      "finish date",
      "end_date",
      "completion_date",
      "finish_date",
      "completed_date",
      "period_end",
    ],
    patterns: [
      /^(end|completion|finish|completed|period[_\s-]?end)[_\s-]?(date)?$/i,
    ],
    examples: ["End Date", "Completion Date", "Finish Date"],
  },
  {
    targetField: "batch_id",
    displayName: "Batch ID",
    required: false,
    dataType: "string",
    dataTierRequired: 3,
    synonyms: [
      "batch",
      "batch number",
      "lot number",
      "lot id",
      "batch_num",
      "lot_num",
      "lot",
    ],
    patterns: [/^(batch|lot)[_\s-]?(id|num|number)?$/i],
    examples: ["Batch", "Lot Number", "Batch ID"],
  },
  {
    targetField: "facility_id",
    displayName: "Facility/Plant ID",
    required: false,
    dataType: "string",
    dataTierRequired: 1,
    synonyms: [
      "facility",
      "plant",
      "site",
      "location",
      "plant id",
      "facility_id",
      "plant_num",
      "site_id",
      "location_id",
    ],
    patterns: [/^(facility|plant|site|location)[_\s-]?(id|num|number)?$/i],
    examples: ["Facility", "Plant ID", "Site", "Location"],
  },
];

export function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[_\-\s]+/g, " ")
    .replace(/[#]/g, "")
    .replace(/\s+/g, " ");
}

export function levenshteinDistance(str1: string, str2: string): number {
  const len1 = str1.length;
  const len2 = str2.length;
  const matrix: number[][] = [];

  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  return matrix[len1][len2];
}

export function similarityScore(str1: string, str2: string): number {
  const normalized1 = normalizeString(str1);
  const normalized2 = normalizeString(str2);

  if (normalized1 === normalized2) return 1.0;

  if (normalized1.includes(normalized2) || normalized2.includes(normalized1)) {
    return 0.9;
  }

  const maxLen = Math.max(normalized1.length, normalized2.length);
  const distance = levenshteinDistance(normalized1, normalized2);
  const score = 1 - distance / maxLen;

  return score;
}

export function matchHeaderToField(
  header: string,
  fieldDef: FieldDefinition
): { score: number; matchType: string } {
  const normalizedHeader = normalizeString(header);

  if (normalizedHeader === normalizeString(fieldDef.targetField)) {
    return { score: 1.0, matchType: "exact" };
  }

  for (const synonym of fieldDef.synonyms) {
    const synonymScore = similarityScore(header, synonym);
    if (synonymScore >= 0.95) {
      return { score: synonymScore, matchType: "synonym" };
    }
  }

  for (const pattern of fieldDef.patterns) {
    if (pattern.test(normalizedHeader)) {
      return { score: 0.9, matchType: "pattern" };
    }
  }

  const fuzzyScore = similarityScore(header, fieldDef.targetField);
  if (fuzzyScore >= 0.7) {
    return { score: fuzzyScore, matchType: "fuzzy" };
  }

  const displayScore = similarityScore(header, fieldDef.displayName);
  if (displayScore >= 0.7) {
    return { score: displayScore, matchType: "fuzzy-display" };
  }

  return { score: 0, matchType: "none" };
}

export interface MappingResult {
  sourceColumn: string;
  targetField: string | null;
  confidence: number;
  matchType: string;
  dataType: string;
  required: boolean;
}

export function autoMapHeaders(headers: string[]): {
  mappings: MappingResult[];
  unmappedColumns: string[];
  confidence: number;
} {
  const mappings: MappingResult[] = [];
  const usedFields = new Set<string>();
  const mappedHeaders = new Set<string>();

  for (const header of headers) {
    let bestMatch: {
      field: FieldDefinition;
      score: number;
      matchType: string;
    } | null = null;

    for (const fieldDef of FIELD_DEFINITIONS) {
      if (usedFields.has(fieldDef.targetField)) continue;

      const match = matchHeaderToField(header, fieldDef);

      if (match.score > 0.7 && (!bestMatch || match.score > bestMatch.score)) {
        bestMatch = {
          field: fieldDef,
          score: match.score,
          matchType: match.matchType,
        };
      }
    }

    if (bestMatch && bestMatch.score >= 0.8) {
      mappings.push({
        sourceColumn: header,
        targetField: bestMatch.field.targetField,
        confidence: bestMatch.score,
        matchType: bestMatch.matchType,
        dataType: bestMatch.field.dataType,
        required: bestMatch.field.required,
      });
      usedFields.add(bestMatch.field.targetField);
      mappedHeaders.add(header);
    }
  }

  const unmappedColumns = headers.filter((h) => !mappedHeaders.has(h));
  const avgConfidence =
    mappings.reduce((sum, m) => sum + m.confidence, 0) / mappings.length || 0;

  return {
    mappings,
    unmappedColumns,
    confidence: avgConfidence,
  };
}

export function detectDataTier(mappedFields: string[]): {
  tier: 1 | 2 | 3;
  tierInfo: DataTierRequirements;
  missingForNextTier: string[];
  coverage: number;
} {
  const fieldSet = new Set(mappedFields);

  const tier3 = DATA_TIERS[2];
  const tier3Coverage = tier3.requiredFields.filter((f) =>
    fieldSet.has(f)
  ).length;
  if (tier3Coverage === tier3.requiredFields.length) {
    return {
      tier: 3,
      tierInfo: tier3,
      missingForNextTier: [],
      coverage: 1.0,
    };
  }

  const tier2 = DATA_TIERS[1];
  const tier2Coverage = tier2.requiredFields.filter((f) =>
    fieldSet.has(f)
  ).length;
  if (tier2Coverage === tier2.requiredFields.length) {
    const missingForTier3 = tier3.requiredFields.filter(
      (f) => !fieldSet.has(f)
    );
    return {
      tier: 2,
      tierInfo: tier2,
      missingForNextTier: missingForTier3,
      coverage: tier2Coverage / tier2.requiredFields.length,
    };
  }

  const tier1 = DATA_TIERS[0];
  const tier1Coverage = tier1.requiredFields.filter((f) =>
    fieldSet.has(f)
  ).length;
  const missingForTier2 = tier2.requiredFields.filter((f) => !fieldSet.has(f));

  return {
    tier: 1,
    tierInfo: tier1,
    missingForNextTier: missingForTier2,
    coverage: tier1Coverage / tier1.requiredFields.length,
  };
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  dataTier: {
    tier: 1 | 2 | 3;
    tierInfo: DataTierRequirements;
    missingForNextTier: string[];
    coverage: number;
  };
}

export function validateMappings(mappings: MappingResult[]): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const mappedFields = mappings.map((m) => m.targetField);
  const dataTierResult = detectDataTier(mappedFields);

  const tier1Required = DATA_TIERS[0].requiredFields;
  const missingRequired = tier1Required.filter(
    (f) => !mappedFields.includes(f)
  );

  if (missingRequired.length > 0) {
    errors.push(
      `Missing required fields for basic analysis: ${missingRequired.join(
        ", "
      )}`
    );
  }

  const fieldCounts = new Map<string, number>();
  mappings.forEach((m) => {
    fieldCounts.set(m.targetField, (fieldCounts.get(m.targetField) || 0) + 1);
  });

  fieldCounts.forEach((count, field) => {
    if (count > 1) {
      errors.push(`Field '${field}' is mapped multiple times`);
    }
  });

  const lowConfidence = mappings.filter((m) => m.confidence < 0.85);
  if (lowConfidence.length > 0) {
    warnings.push(
      `${lowConfidence.length} mapping(s) have lower confidence and should be reviewed`
    );
  }

  const hasTimeField = mappedFields.some((f) =>
    f.includes("production_period")
  );
  if (!hasTimeField && dataTierResult.tier >= 2) {
    warnings.push(
      "No time-series fields detected. Trending and baseline analysis will be limited."
    );
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    dataTier: {
      tier: dataTierResult.tier,
      tierInfo: dataTierResult.tierInfo,
      missingForNextTier: dataTierResult.missingForNextTier,
      coverage: dataTierResult.coverage,
    },
  };
}
