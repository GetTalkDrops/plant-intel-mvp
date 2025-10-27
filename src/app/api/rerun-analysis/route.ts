import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { isDemoAccount } from "@/lib/crm/demo-account";

export async function POST(request: NextRequest) {
  try {
    const { uploadId, userEmail } = await request.json();

    if (!uploadId || !userEmail) {
      return NextResponse.json(
        { error: "Upload ID and user email are required" },
        { status: 400 }
      );
    }

    console.log(
      `Rerunning analysis for upload ${uploadId}, user: ${userEmail}`
    );

    // Get the work orders from the upload
    const { data: workOrders, error: workOrdersError } = await supabase
      .from("work_orders")
      .select("*")
      .eq("upload_id", uploadId);

    if (workOrdersError) {
      throw new Error(
        `Failed to fetch work orders: ${workOrdersError.message}`
      );
    }

    if (!workOrders || workOrders.length === 0) {
      return NextResponse.json(
        { error: "No work orders found for this upload" },
        { status: 404 }
      );
    }

    const isDemo = isDemoAccount(userEmail);
    const facilityId = isDemo ? 1 : 2;

    // Call the ML service to rerun analysis
    const response = await fetch("http://localhost:8000/analyze", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        user_email: userEmail,
        facility_id: facilityId,
        upload_id: uploadId,
        rerun: true, // Flag to indicate this is a rerun
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`ML service error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();

    return NextResponse.json({
      response:
        result.message || "Analysis complete. Here are the updated findings:",
      insights: result.insights || [],
      totalImpact: result.total_impact || 0,
      predictions: result.predictions || [],
    });
  } catch (error) {
    console.error("Rerun analysis error:", error);

    return NextResponse.json(
      {
        error: "Failed to rerun analysis",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
