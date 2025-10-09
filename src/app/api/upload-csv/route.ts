import { NextRequest, NextResponse } from "next/server";
import { csvStorageService } from "@/lib/csv-storage";
import { isDemoAccount, DEMO_FACILITY_ID } from "@/lib/demo-account";
import {
  formatCostAnalysisResponse,
  formatEquipmentResponse,
  formatQualityResponse,
  formatEfficiencyResponse,
} from "@/lib/format-ml-response";

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

    // Auto-analysis with all categories
    let autoAnalysis = null;
    try {
      const facilityId = isDemoAccount(userEmail) ? DEMO_FACILITY_ID : 2;
      const batchId = result.batchId;

      console.log("Triggering comprehensive auto-analysis for batch:", batchId);

      // Run all analyzers in parallel
      const [
        costResponse,
        equipmentResponse,
        qualityResponse,
        efficiencyResponse,
      ] = await Promise.all([
        fetch("http://localhost:8000/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: "cost variance analysis",
            user_email: userEmail,
            facility_id: facilityId,
            batch_id: batchId,
          }),
        }),
        fetch("http://localhost:8000/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: "equipment analysis",
            user_email: userEmail,
            facility_id: facilityId,
            batch_id: batchId,
          }),
        }),
        fetch("http://localhost:8000/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: "quality analysis",
            user_email: userEmail,
            facility_id: facilityId,
            batch_id: batchId,
          }),
        }),
        fetch("http://localhost:8000/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: "efficiency analysis",
            user_email: userEmail,
            facility_id: facilityId,
            batch_id: batchId,
          }),
        }),
      ]);

      const costData = costResponse.ok ? await costResponse.json() : null;
      const equipmentData = equipmentResponse.ok
        ? await equipmentResponse.json()
        : null;
      const qualityData = qualityResponse.ok
        ? await qualityResponse.json()
        : null;
      const efficiencyData = efficiencyResponse.ok
        ? await efficiencyResponse.json()
        : null;

      // Extract savings opportunity from cost data
      const totalSavingsOpportunity = costData?.total_savings_opportunity || 0;
      console.log("=== SAVINGS DEBUG ===");
      console.log("costData keys:", Object.keys(costData || {}));
      console.log(
        "costData.total_savings_opportunity:",
        costData?.total_savings_opportunity
      );
      console.log("totalSavingsOpportunity variable:", totalSavingsOpportunity);
      console.log("Cost data has patterns:", costData?.patterns?.length || 0);

      // Build executive summary
      const summaryParts = [];
      const allMessages = [];
      let totalImpact = 0;

      if (costData && costData.predictions && costData.predictions.length > 0) {
        summaryParts.push(
          `${costData.predictions.length} cost variances ($${
            costData.total_impact?.toLocaleString() || 0
          })`
        );
        allMessages.push(costData.message);
        totalImpact += costData.total_impact || 0;
      }

      if (
        equipmentData &&
        equipmentData.insights &&
        equipmentData.insights.length > 0
      ) {
        summaryParts.push(`${equipmentData.insights.length} equipment issues`);
        allMessages.push(equipmentData.message);
      }

      if (
        qualityData &&
        qualityData.insights &&
        qualityData.insights.length > 0
      ) {
        summaryParts.push(`${qualityData.insights.length} quality issues`);
        allMessages.push(qualityData.message);
      }

      if (
        efficiencyData &&
        efficiencyData.insights &&
        efficiencyData.insights.length > 0
      ) {
        summaryParts.push(
          `${efficiencyData.insights.length} efficiency opportunities`
        );
        allMessages.push(efficiencyData.message);
      }

      // Create executive summary
      let executiveSummary = "";
      if (summaryParts.length > 0) {
        executiveSummary = `**Analysis Complete**\n\nFound: ${summaryParts.join(
          ", "
        )}\n\n`;
        if (totalImpact > 0) {
          executiveSummary += `**Total Financial Impact: $${totalImpact.toLocaleString()}**\n\n`;
        }
        executiveSummary +=
          "Detailed analysis below. Ask questions for deeper insights.";
      } else {
        executiveSummary =
          "Analysis complete. All metrics within normal ranges. No significant issues detected.";
      }

      // Format all analyzers
      const formattedCost = costData
        ? formatCostAnalysisResponse(costData)
        : null;

      const formattedEquipment = equipmentData
        ? formatEquipmentResponse(equipmentData)
        : null;

      const formattedQuality = qualityData
        ? formatQualityResponse(qualityData)
        : null;

      const formattedEfficiency = efficiencyData
        ? formatEfficiencyResponse(efficiencyData)
        : null;

      autoAnalysis = {
        executiveSummary,
        cost: formattedCost,
        equipment: formattedEquipment,
        quality: formattedQuality,
        efficiency: formattedEfficiency,
        totalImpact,
        totalSavingsOpportunity,
      };

      console.log("Auto-analysis complete:", {
        costIssues: costData?.predictions?.length || 0,
        equipmentIssues: equipmentData?.insights?.length || 0,
        qualityIssues: qualityData?.insights?.length || 0,
        efficiencyIssues: efficiencyData?.insights?.length || 0,
      });
    } catch (analysisError) {
      console.error("Auto-analysis failed:", analysisError);
      autoAnalysis = {
        executiveSummary:
          "Analysis initiated but incomplete. Ask specific questions to run detailed analysis.",
        error: true,
      };
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
