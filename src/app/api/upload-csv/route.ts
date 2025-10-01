import { NextRequest, NextResponse } from "next/server";
import { csvStorageService } from "@/lib/csv-storage";
import { isDemoAccount, DEMO_FACILITY_ID } from "@/lib/demo-account";

export async function POST(request: NextRequest) {
  try {
    const {
      mappedData,
      mapping,
      fileName,
      userEmail,
      headerSignature,
      fileHash,
    } = await request.json();

    if (!mappedData || !mapping || !userEmail) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    console.log(`Processing CSV upload for ${userEmail}: ${fileName}`);
    console.log(
      `Received ${mappedData.length} rows with ${mapping.length} mapped fields`
    );

    // Store CSV data in database
    const result = await csvStorageService.storeCsvData(
      mappedData,
      userEmail,
      mapping,
      fileName,
      headerSignature,
      fileHash
    );
    console.log("Storage result:", result); // Add this line
    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to store CSV data" },
        { status: 500 }
      );
    }

    console.log(`Successfully stored ${result.recordsInserted} records`);

    // ⚡ TRIGGER AUTO-ANALYSIS (The "Wow" Moment)
    let autoAnalysis = null;
    try {
      const facilityId = isDemoAccount(userEmail) ? DEMO_FACILITY_ID : 2;
      const batchId = result.batchId; // Use the actual batch ID from storage

      console.log("Triggering auto-analysis for uploaded batch:", batchId);

      // Call FastAPI directly with batch filter
      const mlResponse = await fetch("http://localhost:8000/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query:
            "Analyze the data I just uploaded and identify the top 3 priority issues with cost impact. Be specific and include dollar amounts.",
          user_email: userEmail,
          facility_id: facilityId,
          batch_id: batchId, // Add batch filter
        }),
      });

      if (mlResponse.ok) {
        const mlResult = await mlResponse.json();
        console.log("=== FULL ML RESPONSE ===");
        console.log(JSON.stringify(mlResult, null, 2));
        console.log("========================");

        autoAnalysis = {
          message: mlResult.message || mlResult.response || "Analysis complete",
          costImpact:
            mlResult.total_impact ||
            mlResult.totalImpact ||
            mlResult.cost_impact ||
            0,
          alertsCreated: mlResult.alerts?.length || 0,
        };

        console.log(
          "Extracted - Message:",
          autoAnalysis.message?.substring(0, 100)
        );
        console.log("Extracted - Cost Impact:", autoAnalysis.costImpact);
      } else {
        console.error("ML service returned error:", mlResponse.status);
      }
    } catch (analysisError) {
      console.error("Auto-analysis failed:", analysisError);
    }

    return NextResponse.json({
      success: true,
      message: `Successfully processed ${result.recordsInserted} work orders`,
      recordsInserted: result.recordsInserted,
      facilityId: result.facilityId,
      demoMode: result.demoMode,
      autoAnalysis, // Include analysis in response (will be null if failed)
    });
  } catch (error) {
    console.error("CSV upload error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
