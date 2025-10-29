import { NextRequest, NextResponse } from "next/server";
import {
  autoMapHeaders,
  validateMappings,
  FIELD_DEFINITIONS,
  type MappingResult,
} from "@/lib/csv/csv-field-mapper";

export async function POST(request: NextRequest) {
  try {
    const { headers, sampleRows } = await request.json();

    if (!headers || !Array.isArray(headers)) {
      return NextResponse.json(
        { error: "Invalid headers format" },
        { status: 400 }
      );
    }

    console.log("=== CSV MAPPING REQUEST ===");
    console.log("Headers received:", headers);
    console.log("Sample rows:", sampleRows?.length || 0);

    const autoMapResult = autoMapHeaders(headers);

    console.log("Auto-mapping complete:");
    console.log(`- Mapped: ${autoMapResult.mappings.length} fields`);
    console.log(`- Unmapped: ${autoMapResult.unmappedColumns.length} columns`);
    console.log(
      `- Avg confidence: ${(autoMapResult.confidence * 100).toFixed(1)}%`
    );

    autoMapResult.mappings.forEach((m) => {
      console.log(
        `  ✓ "${m.sourceColumn}" → ${m.targetField} (${(
          m.confidence * 100
        ).toFixed(0)}% via ${m.matchType})`
      );
    });

    if (autoMapResult.unmappedColumns.length > 0) {
      console.log("Unmapped columns:", autoMapResult.unmappedColumns);
    }

    const validation = validateMappings(autoMapResult.mappings);

    console.log("=== DATA TIER DETECTION ===");
    console.log(
      `Detected: Tier ${validation.dataTier.tier} - ${validation.dataTier.tierInfo.name}`
    );
    console.log(
      `Coverage: ${(validation.dataTier.coverage * 100).toFixed(0)}%`
    );

    if (validation.dataTier.missingForNextTier.length > 0) {
      console.log(
        `Missing for next tier: ${validation.dataTier.missingForNextTier.join(
          ", "
        )}`
      );
    }

    if (validation.errors.length > 0) {
      console.log("Validation errors:", validation.errors);
    }

    if (validation.warnings.length > 0) {
      console.log("Validation warnings:", validation.warnings);
    }

    const response = {
      success: validation.valid,
      mappings: autoMapResult.mappings,
      unmappedColumns: autoMapResult.unmappedColumns,
      confidence: autoMapResult.confidence,

      dataTier: {
        tier: validation.dataTier.tier,
        name: validation.dataTier.tierInfo.name,
        description: validation.dataTier.tierInfo.description,
        capabilities: validation.dataTier.tierInfo.analysisCapabilities,
        coverage: validation.dataTier.coverage,
        missingForNextTier: validation.dataTier.missingForNextTier,
      },

      requiredFieldsCovered: autoMapResult.mappings
        .filter((m) => m.required)
        .map((m) => m.targetField),
      optionalFieldsCovered: autoMapResult.mappings
        .filter((m) => !m.required)
        .map((m) => m.targetField),

      validation: {
        valid: validation.valid,
        errors: validation.errors,
        warnings: validation.warnings,
      },
    };

    console.log("=== RESPONSE ===");
    console.log(`Success: ${response.success}`);
    console.log(`Data Tier: ${response.dataTier.tier}`);
    console.log("===\n");

    return NextResponse.json(response);
  } catch (error) {
    console.error("CSV mapping error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
        mappings: [],
        unmappedColumns: [],
        confidence: 0,
      },
      { status: 500 }
    );
  }
}
