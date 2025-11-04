// src/app/api/upload-csv/route.ts - UPDATED WITH CONFIGURATION
/**
 * Key changes:
 * 1. Accept analysisConfig in request body
 * 2. Pass config to ML orchestrator
 * 3. Store config with template
 */

import { auth, currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { csvStorageService } from "@/lib/csv/csv-storage";
import { isDemoAccount, DEMO_FACILITY_ID } from "@/lib/crm/demo-account";
import { buildInsightCards } from "@/lib/analytics/insight-builder";
import { detectDataTier, type MappingResult } from "@/lib/csv/csv-field-mapper";
import { DEFAULT_ANALYSIS_CONFIG, type AnalysisConfig } from "@/lib/csv/csv-config-defaults";

export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await currentUser();
  const userEmail = user?.emailAddresses[0]?.emailAddress;
  if (!userEmail) {
    return NextResponse.json({ error: "Email not found" }, { status: 400 });
  }

  try {
    const {
      mappedData,
      mapping,
      analysisConfig, // NEW
      fileName,
      headerSignature,
      fileHash,
      mappingName,
    } = await request.json();

    // Validate required fields
    if (!mappedData || !mapping) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Validate configuration (NEW)
    if (
      !analysisConfig ||
      !analysisConfig.labor_rate_hourly ||
      !analysisConfig.scrap_cost_per_unit
    ) {
      return NextResponse.json(
        { error: "Missing required configuration: labor_rate and scrap_cost" },
        { status: 400 }
      );
    }

    console.log(`Processing CSV upload for ${userEmail}: ${fileName}`);
    console.log(`Configuration:`, analysisConfig);

    // Store CSV data
    const result = await csvStorageService.storeCsvData(
      mappedData,
      userEmail,
      mapping,
      fileName,
      headerSignature,
      fileHash,
      mappingName
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to store CSV data" },
        { status: 500 }
      );
    }

    // Detect data tier
    const mappedFields = mapping.map((m: MappingResult) => m.targetField);
    const dataTierInfo = detectDataTier(mappedFields);

    console.log(
      `Data Tier: ${dataTierInfo.tier} - ${dataTierInfo.tierInfo.name}`
    );

    // Prepare ML configuration (ENHANCED)
    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get user profile defaults (for non-critical settings)
    const { data: profile } = await supabase
      .from("customer_profiles")
      .select("*")
      .eq("user_email", userEmail)
      .single();

    // Build complete config for ML service (ENHANCED)
    const mlConfig = {
      // Core variables from upload (NEW)
      labor_rate_hourly: analysisConfig.labor_rate_hourly,
      scrap_cost_per_unit: analysisConfig.scrap_cost_per_unit,
      variance_threshold_pct: analysisConfig.variance_threshold_pct,
      pattern_min_orders: analysisConfig.pattern_min_orders,

      // Additional settings from profile (existing)
      min_variance_amount: profile?.min_variance_amount || 1000,
      excluded_suppliers: profile?.excluded_suppliers || [],
      excluded_materials: profile?.excluded_materials || [],
      excluded_machines: profile?.excluded_machines || [],

      // Equipment settings (from profile or defaults)
      equipment_risk_thresholds: {
        labor_variance: 5,
        quality_rate: 0.3,
        scrap_ratio: 3,
      },
      equipment_labor_interpretations: {
        severe: 10,
        moderate: 5,
        minor: 2,
      },

      // Quality settings (from profile or defaults)
      quality_min_issue_rate_pct: 10,
      quality_scrap_interpretations: {
        critical: 20,
        high: 10,
        moderate: 5,
      },
    };

    // Call ML orchestrator with complete config
    const facilityId = isDemoAccount(userEmail) ? DEMO_FACILITY_ID : 2;
    const batchId = result.batchId;

    console.log("Triggering ML orchestrator with config:", mlConfig);

    const csvHeaders = mapping
      .map((m: MappingResult) => m.sourceColumn)
      .filter(
        (h: string | null | undefined): h is string =>
          h !== null && h !== undefined
      );

    const mlResponse = await fetch("http://localhost:8000/analyze/auto", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        facility_id: facilityId,
        batch_id: batchId,
        csv_headers: csvHeaders,
        config: mlConfig, // ENHANCED config
        data_tier: dataTierInfo.tier,
        data_tier_info: {
          tier: dataTierInfo.tier,
          name: dataTierInfo.tierInfo.name,
          capabilities: dataTierInfo.tierInfo.analysisCapabilities,
        },
      }),
    });

    const orchestratorResult = await mlResponse.json();

    if (!orchestratorResult.success) {
      throw new Error(orchestratorResult.error || "Analysis failed");
    }

    // Build response (same as before)
    const urgentInsights = orchestratorResult.insights?.urgent || [];
    const notableInsights = orchestratorResult.insights?.notable || [];
    const totalImpact =
      orchestratorResult.insights?.summary?.total_financial_impact || 0;

    // Save mapping template with configuration (ENHANCED)
    const headerSig = JSON.stringify(csvHeaders);

    await supabase
      .from("csv_mappings")
      .delete()
      .eq("user_email", userEmail)
      .eq("header_signature", headerSig);

    await supabase.from("csv_mappings").insert({
      user_email: userEmail,
      facility_id: facilityId,
      name: mappingName || fileName,
      file_name: fileName,
      header_signature: headerSig,
      mapping_config: mapping,
      analysis_config: analysisConfig, // NEW - store config with template
    });

    console.log("Template saved with configuration");

    return NextResponse.json({
      success: true,
      message: `Successfully processed ${result.recordsInserted} work orders`,
      recordsInserted: result.recordsInserted,
      facilityId: result.facilityId,
      autoAnalysis: orchestratorResult,
      data_tier: dataTierInfo.tier,
      configuration: analysisConfig, // NEW - return config in response
    });
  } catch (error) {
    console.error("CSV upload error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
