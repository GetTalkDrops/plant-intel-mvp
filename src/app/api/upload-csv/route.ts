import { NextRequest, NextResponse } from "next/server";
import { csvStorageService } from "@/lib/csv-storage";
import { isDemoAccount, DEMO_FACILITY_ID } from "@/lib/demo-account";
import { formatCostAnalysisResponse } from "@/lib/format-ml-response";

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

    const result = await csvStorageService.storeCsvData(
      mappedData,
      userEmail,
      mapping,
      fileName,
      headerSignature,
      fileHash
    );
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to store CSV data" },
        { status: 500 }
      );
    }

    console.log(`Successfully stored ${result.recordsInserted} records`);

    // Auto-analysis with formatted response
    let autoAnalysis = null;
    try {
      const facilityId = isDemoAccount(userEmail) ? DEMO_FACILITY_ID : 2;
      const batchId = result.batchId;

      console.log("Triggering auto-analysis for batch:", batchId);

      const mlResponse = await fetch("http://localhost:8000/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: "cost variance analysis",
          user_email: userEmail,
          facility_id: facilityId,
          batch_id: batchId,
        }),
      });

      if (mlResponse.ok) {
        const mlResult = await mlResponse.json();
        console.log("ML Response:", JSON.stringify(mlResult, null, 2));

        // Format the response with cards
        const formatted = formatCostAnalysisResponse(mlResult);
        
        autoAnalysis = {
          message: formatted.text,
          cards: formatted.cards,
          followUps: formatted.followUps,
          costImpact: mlResult.total_impact || 0,
        };
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
      autoAnalysis,
    });
  } catch (error) {
    console.error("CSV upload error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
