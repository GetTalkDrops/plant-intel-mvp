import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { auth } from "@clerk/nextjs/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ customerId: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { customerId } = await params;
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Fetch config for customer
  const { data, error } = await supabase
    .from("analysis_configurations")
    .select("*")
    .eq("customer_profile_id", customerId)
    .single();

  if (error && error.code !== "PGRST116") {
    // PGRST116 = not found
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // If no config exists, return defaults
  if (!data) {
    return NextResponse.json({
      customer_profile_id: customerId,
      run_cost_analysis: true,
      run_quality_analysis: true,
      run_equipment_analysis: true,
      run_efficiency_analysis: true,
      cost_labor_rate_hourly: 200,
      cost_variance_threshold_pct: 5,
      cost_min_variance_amount: 1000,
      cost_pattern_min_orders: 3,
      cost_base_confidence: 60,
      cost_max_confidence: 92,
      equipment_scrap_cost_per_unit: 75,
      equipment_min_impact_threshold: 500,
      equipment_pattern_min_count: 3,
      equipment_quality_threshold_pct: 30,
      quality_min_impact_threshold: 500,
      quality_min_issue_rate_pct: 10,
      quality_pattern_min_count: 3,
      projection_weeks_to_month: 4,
      excluded_suppliers: [],
      excluded_materials: [],
      excluded_machines: [],
    });
  }

  return NextResponse.json(data);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ customerId: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { customerId } = await params;
  const body = await request.json();
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Check if config exists
  const { data: existing } = await supabase
    .from("analysis_configurations")
    .select("id, version")
    .eq("customer_profile_id", customerId)
    .single();

  if (existing) {
    // Update existing
    const { data, error } = await supabase
      .from("analysis_configurations")
      .update({
        ...body,
        version: existing.version + 1,
        updated_at: new Date().toISOString(),
      })
      .eq("customer_profile_id", customerId)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } else {
    // Insert new
    const { data, error } = await supabase
      .from("analysis_configurations")
      .insert({
        customer_profile_id: customerId,
        ...body,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  }
}
