import { auth, currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { csvStorageService } from "@/lib/csv/csv-storage";
import { isDemoAccount, DEMO_FACILITY_ID } from "@/lib/crm/demo-account";
import {
  formatCostAnalysisResponse,
  formatEquipmentResponse,
  formatQualityResponse,
  formatEfficiencyResponse,
} from "@/lib/ai/format-ml-response";

export async function POST(request: NextRequest) {
  // Get authenticated user
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
      fileName,
      headerSignature,
      fileHash,
      mappingName,
    } = await request.json();

    // Create data upload record and chat session
    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    if (!mappedData || !mapping) {
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
      fileHash,
      mappingName
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to store CSV data" },
        { status: 500 }
      );
    }

    console.log(`Successfully stored ${result.recordsInserted} records`);

    // Fetch customer's analysis configuration
    let analysisConfig = null;
    try {
      // Find or create customer profile
      const { data: profile } = await supabase
        .from("customer_profiles")
        .select("id")
        .eq("user_email", userEmail)
        .single();

      if (profile) {
        // Fetch their config
        const { data: config } = await supabase
          .from("analysis_configurations")
          .select("*")
          .eq("customer_profile_id", profile.id)
          .single();

        if (config) {
          // Transform DB config to ML service format
          analysisConfig = {
            labor_rate_hourly: config.cost_labor_rate_hourly,
            variance_threshold_pct: config.cost_variance_threshold_pct,
            min_variance_amount: config.cost_min_variance_amount,
            pattern_min_orders: config.cost_pattern_min_orders,
            scrap_cost_per_unit: config.equipment_scrap_cost_per_unit,
            excluded_suppliers: config.excluded_suppliers || [],
            excluded_materials: config.excluded_materials || [],
            excluded_machines: config.excluded_machines || [],
          };
        }
      }
    } catch (err) {
      console.error("Error fetching analysis config:", err);
      // Continue with null config (ML will use defaults)
    }
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
            config: analysisConfig,
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
            config: analysisConfig,
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
            config: analysisConfig,
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
            config: analysisConfig,
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

    // === NEW: Create analysis review record for HITL ===
    if (autoAnalysis && !autoAnalysis.error) {
      console.log("=== ATTEMPTING TO CREATE REVIEW RECORD ===");
      try {
        // Find or create customer profile for this user
        const { data: existingProfile } = await supabase
          .from("customer_profiles")
          .select("id")
          .eq("user_email", userEmail)
          .single();

        console.log("Existing profile:", existingProfile);

        let customerProfileId = existingProfile?.id;
        console.log("Creating new customer profile for:", userEmail);

        if (!customerProfileId) {
          console.log("Creating new customer profile for:", userEmail);
          try {
            // Create a basic customer profile
            const insertResult = await supabase
              .from("customer_profiles")
              .insert({
                user_email: userEmail,
                company_name: userEmail.split("@")[0] + " Manufacturing",
                industry: "Manufacturing",
              })
              .select("id")
              .single();

            console.log(
              "Insert result:",
              JSON.stringify(insertResult, null, 2)
            );

            if (insertResult.error) {
              console.error("Profile creation error:", insertResult.error);
            } else {
              console.log("Created new profile:", insertResult.data);
              customerProfileId = insertResult.data?.id;
            }
          } catch (profileErr) {
            console.error("Profile creation exception:", profileErr);
          }
        }

        if (customerProfileId) {
          // Count total issues
          const issuesFound =
            (autoAnalysis.cost?.cards?.length || 0) +
            (autoAnalysis.equipment?.cards?.length || 0) +
            (autoAnalysis.quality?.cards?.length || 0) +
            (autoAnalysis.efficiency?.cards?.length || 0);

          console.log("Issues found:", issuesFound);
          console.log("Savings:", autoAnalysis.totalSavingsOpportunity);

          // Create analysis review record
          const { error: reviewError } = await supabase
            .from("analysis_reviews")
            .insert({
              batch_id: result.batchId,
              customer_profile_id: customerProfileId,
              status: "pending",
              original_results: {
                executive_summary: autoAnalysis.executiveSummary,
                cost: autoAnalysis.cost,
                equipment: autoAnalysis.equipment,
                quality: autoAnalysis.quality,
                efficiency: autoAnalysis.efficiency,
              },
              savings_identified: autoAnalysis.totalSavingsOpportunity || 0,
              issues_found: issuesFound,
            });

          if (reviewError) {
            console.error("Failed to create analysis review:", reviewError);
          } else {
            console.log(
              "Analysis review created successfully for batch:",
              result.batchId
            );
          }
        }
      } catch (reviewCreationError) {
        console.error("Error creating analysis review:", reviewCreationError);
        // Don't fail the whole request if review creation fails
      }
    }
    // === END NEW CODE ===

    // Create data_uploads record
    const { data: uploadRecord, error: uploadError } = await supabase
      .from("data_uploads")
      .insert({
        user_id: userEmail,
        filename: fileName,
        status: "completed",
        field_mappings: mapping,
        record_count: result.recordsInserted,
        batch_id: result.batchId,
      })
      .select()
      .single();

    if (uploadError) {
      console.error("Failed to create upload record:", uploadError);
    }

    // Check for existing session with same filename
    const { data: existingSessions } = await supabase
      .from("chat_sessions")
      .select("*")
      .eq("user_id", userEmail)
      .eq("title", fileName)
      .order("updated_at", { ascending: false })
      .limit(1);

    let sessionRecord;

    if (existingSessions && existingSessions.length > 0) {
      // Update existing session
      const { data: updated, error: updateError } = await supabase
        .from("chat_sessions")
        .update({
          upload_id: uploadRecord?.id,
          total_savings: autoAnalysis?.totalSavingsOpportunity || 0,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingSessions[0].id)
        .select()
        .single();

      if (updateError) {
        console.error("Failed to update session:", updateError);
      }
      sessionRecord = updated;
    } else {
      // Create new session
      const { data: newSession, error: sessionError } = await supabase
        .from("chat_sessions")
        .insert({
          user_id: userEmail,
          title: fileName,
          upload_id: uploadRecord?.id,
          total_savings: autoAnalysis?.totalSavingsOpportunity || 0,
        })
        .select()
        .single();

      if (sessionError) {
        console.error("Failed to create session:", sessionError);
      }
      sessionRecord = newSession;
    }

    // Save initial messages
    if (sessionRecord && autoAnalysis) {
      const messages = [
        {
          session_id: sessionRecord.id,
          role: "user",
          content: `Analyzing uploaded data: ${fileName}`,
        },
        {
          session_id: sessionRecord.id,
          role: "assistant",
          content: autoAnalysis.executiveSummary,
          metadata: {
            cost: autoAnalysis.cost,
            equipment: autoAnalysis.equipment,
            quality: autoAnalysis.quality,
            efficiency: autoAnalysis.efficiency,
          },
        },
      ];

      await supabase.from("chat_messages").insert(messages);
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
