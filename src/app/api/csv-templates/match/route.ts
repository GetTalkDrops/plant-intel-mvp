// src/app/api/csv-templates/route.ts
/**
 * CSV Template Management API
 * Handles saving and loading templates WITH configuration values
 */

import { auth, currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ==================== SAVE TEMPLATE ====================
// POST /api/csv-templates
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
    const { name, headerSignature, mappings, analysisConfig } =
      await request.json();

    // Validation
    if (!name || !headerSignature || !mappings || !analysisConfig) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (
      !analysisConfig.labor_rate_hourly ||
      !analysisConfig.scrap_cost_per_unit
    ) {
      return NextResponse.json(
        { error: "Configuration must include labor_rate and scrap_cost" },
        { status: 400 }
      );
    }

    // Delete existing template with same name
    await supabase
      .from("csv_mappings")
      .delete()
      .eq("user_email", userEmail)
      .eq("name", name);

    // Insert new template
    const { data, error } = await supabase
      .from("csv_mappings")
      .insert({
        user_email: userEmail,
        facility_id: 2, // Default facility
        name,
        file_name: name,
        header_signature: headerSignature,
        mapping_config: mappings,
        analysis_config: analysisConfig, // Store config with template
        use_count: 0,
      })
      .select()
      .single();

    if (error) {
      console.error("Template save error:", error);
      return NextResponse.json(
        { error: "Failed to save template" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      template: data,
      message: `Template "${name}" saved successfully`,
    });
  } catch (error) {
    console.error("Template save error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ==================== GET ALL TEMPLATES ====================
// GET /api/csv-templates
export async function GET(request: NextRequest) {
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
    const { data, error } = await supabase
      .from("csv_mappings")
      .select("*")
      .eq("user_email", userEmail)
      .order("last_used_at", { ascending: false, nullsFirst: false });

    if (error) {
      console.error("Template fetch error:", error);
      return NextResponse.json(
        { error: "Failed to fetch templates" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      templates: data,
    });
  } catch (error) {
    console.error("Template fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ==================== DELETE TEMPLATE ====================
// DELETE /api/csv-templates/[id]
export async function DELETE(request: NextRequest) {
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
    const url = new URL(request.url);
    const id = url.pathname.split("/").pop();

    if (!id) {
      return NextResponse.json(
        { error: "Template ID required" },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("csv_mappings")
      .delete()
      .eq("id", id)
      .eq("user_email", userEmail); // Security: only delete own templates

    if (error) {
      console.error("Template delete error:", error);
      return NextResponse.json(
        { error: "Failed to delete template" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Template deleted successfully",
    });
  } catch (error) {
    console.error("Template delete error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
