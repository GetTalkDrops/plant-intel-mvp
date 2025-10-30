import { auth, currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { csvStorageService } from "@/lib/csv/csv-storage";
import { isDemoAccount, DEMO_FACILITY_ID } from "@/lib/crm/demo-account";
import { buildInsightCards } from "@/lib/analytics/insight-builder";
import { detectDataTier, type MappingResult } from "@/lib/csv/csv-field-mapper";

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

    // Detect data tier from mappings
    const mappedFields = mapping.map((m: MappingResult) => m.targetField);
    const dataTierInfo = detectDataTier(mappedFields);

    console.log(`\n=== DATA TIER DETECTED ===`);
    console.log(`Tier: ${dataTierInfo.tier} - ${dataTierInfo.tierInfo.name}`);
    console.log(`Coverage: ${(dataTierInfo.coverage * 100).toFixed(0)}%`);

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

    // Auto-analysis with orchestrator
    let autoAnalysis = null;
    try {
      const facilityId = isDemoAccount(userEmail) ? DEMO_FACILITY_ID : 2;
      const batchId = result.batchId;

      console.log("Triggering auto-analysis orchestrator for batch:", batchId);

      // Get CSV headers from mapping
      const csvHeaders = mapping
        .map((m: any) => m.sourceColumn)
        .filter((h: any) => h !== null && h !== undefined);

      // Call the new orchestrator endpoint
      const response = await fetch("http://localhost:8000/analyze/auto", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          facility_id: facilityId,
          batch_id: batchId,
          csv_headers: csvHeaders,
          config: analysisConfig,
          data_tier: dataTierInfo.tier,
          data_tier_info: {
            tier: dataTierInfo.tier,
            name: dataTierInfo.tierInfo.name,
            capabilities: dataTierInfo.tierInfo.analysisCapabilities,
          },
        }),
      });

      const orchestratorResult = await response.json();

      console.log("Orchestrator response:", {
        success: orchestratorResult.success,
        dataTier: orchestratorResult.data_tier?.tier,
        urgentCount: orchestratorResult.insights?.urgent?.length,
        notableCount: orchestratorResult.insights?.notable?.length,
      });

      if (orchestratorResult.success) {
        // Build executive summary
        const urgentCount = orchestratorResult.insights.urgent.length;
        const notableCount = orchestratorResult.insights.notable.length;
        const totalImpact =
          orchestratorResult.insights.summary.total_financial_impact;
        const totalSavings =
          orchestratorResult.analyzer_details.cost_analyzer?.total_savings || 0;

        let executiveSummary = `**Analysis Complete - ${orchestratorResult.data_tier.tier_name} Data**\n\n`;

        // Add data tier explanation
        if (dataTierInfo.tier === 1) {
          executiveSummary += `Your data supports basic cost variance analysis. `;
        } else if (dataTierInfo.tier === 2) {
          executiveSummary += `Your data supports supplier and equipment pattern analysis with 30-day baseline trending. `;
        } else {
          executiveSummary += `Your data supports full predictive analytics with degradation detection. `;
        }

        if (dataTierInfo.missingForNextTier.length > 0) {
          executiveSummary += `Upload data with **${
            dataTierInfo.missingForNextTier[0]
          }** to unlock ${
            dataTierInfo.tierInfo.name === "Basic Analysis"
              ? "Enhanced"
              : "Predictive"
          } Analysis.\n\n`;
        } else {
          executiveSummary += `\n\n`;
        }

        if (urgentCount > 0 || notableCount > 0) {
          executiveSummary += `Found **${urgentCount} urgent issue${
            urgentCount !== 1 ? "s" : ""
          }** and **${notableCount} notable finding${
            notableCount !== 1 ? "s" : ""
          }**.\n\n`;
        }

        if (totalImpact > 0) {
          executiveSummary += `**Total Financial Impact: $${Math.abs(
            totalImpact
          ).toLocaleString()}**\n\n`;
        }

        if (totalSavings > 0) {
          executiveSummary += `**Potential Savings: $${totalSavings.toLocaleString()}**\n\n`;
        }

        executiveSummary += orchestratorResult.data_tier.message;

        // Build insight cards from orchestrator results
        const urgentInsights = orchestratorResult.insights.urgent || [];
        const notableInsights = orchestratorResult.insights.notable || [];

        // Convert orchestrator insights to card format
        const allInsights = [...urgentInsights, ...notableInsights];
        const costCards = buildInsightCards(allInsights, "cost", totalImpact);

        autoAnalysis = {
          executiveSummary,
          orchestratorData: orchestratorResult,
          dataTier: {
            tier: dataTierInfo.tier,
            name: dataTierInfo.tierInfo.name,
            capabilities: dataTierInfo.tierInfo.analysisCapabilities,
            missingForNextTier: dataTierInfo.missingForNextTier,
          },
          cost: {
            cards: costCards,
            text: `Found ${allInsights.length} cost insights with $${Math.abs(
              totalImpact
            ).toLocaleString()} total impact`,
            followUps: ["Show details", "What caused this?"],
          },
          equipment: {
            cards: [],
            text: "Equipment analysis complete",
            followUps: [],
          },
          quality: {
            cards: [],
            text: "Quality analysis complete",
            followUps: [],
          },
          efficiency: {
            cards: [],
            text: "Efficiency analysis complete",
            followUps: [],
          },
          totalImpact: Math.abs(totalImpact),
          totalSavingsOpportunity: totalSavings,
        };

        console.log("Auto-analysis complete:", {
          urgentIssues: urgentCount,
          notableIssues: notableCount,
          dataTier: orchestratorResult.data_tier.tier,
          totalImpact: totalImpact,
        });
      } else {
        console.error("Orchestrator failed:", orchestratorResult.error);
        autoAnalysis = {
          executiveSummary: "Analysis initiated but incomplete.",
          error: true,
        };
      }
    } catch (analysisError) {
      console.error("Auto-analysis failed:", analysisError);
      autoAnalysis = {
        executiveSummary:
          "Analysis initiated but incomplete. Ask specific questions to run detailed analysis.",
        error: true,
      };
    }

    // Create analysis review record for HITL
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
          // Count total issues from orchestrator
          const issuesFound =
            (autoAnalysis.orchestratorData?.insights?.urgent?.length || 0) +
            (autoAnalysis.orchestratorData?.insights?.notable?.length || 0);

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
                orchestrator_data: autoAnalysis.orchestratorData,
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
    // Save mapping to csv_mappings table for future use
    const headers = mapping.map((m: any) => m.sourceColumn);
    const headerSig = JSON.stringify(headers);
    const facilityId = isDemoAccount(userEmail) ? DEMO_FACILITY_ID : 2;

    // Delete existing mapping with same signature
    await supabase
      .from("csv_mappings")
      .delete()
      .eq("user_email", userEmail)
      .eq("header_signature", headerSig);

    // Insert new mapping
    const { error: mappingError } = await supabase.from("csv_mappings").insert({
      user_email: userEmail,
      facility_id: facilityId,
      name: mappingName || fileName,
      file_name: fileName,
      header_signature: headerSig,
      mapping_config: mapping,
    });

    if (mappingError) {
      console.error("Failed to save mapping:", mappingError);
    } else {
      console.log("Mapping saved successfully");
    }
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
        data_tier: dataTierInfo.tier,
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
      console.log("Attempting to save messages for session:", sessionRecord.id);

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
            orchestrator_data: autoAnalysis.orchestratorData,
            cost: autoAnalysis.cost,
            equipment: autoAnalysis.equipment,
            quality: autoAnalysis.quality,
            efficiency: autoAnalysis.efficiency,
          },
        },
      ];

      const { data, error } = await supabase
        .from("chat_messages")
        .insert(messages);
      console.log("Message insert result:", { success: !error, error, data });
    }

    return NextResponse.json({
      success: true,
      message: `Successfully processed ${result.recordsInserted} work orders`,
      recordsInserted: result.recordsInserted,
      facilityId: result.facilityId,
      demoMode: result.demoMode,
      autoAnalysis,
      data_tier: dataTierInfo.tier,
    });
  } catch (error) {
    console.error("CSV upload error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
