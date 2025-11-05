import { auth, currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
    const { id } = await params;
    const body = await request.json();
    const { name, mapping_config, analysis_config } = body;

    if (!name && !mapping_config && !analysis_config) {
      return NextResponse.json(
        { error: "Must provide name, mapping_config, or analysis_config to update" },
        { status: 400 }
      );
    }

    if (name !== undefined) {
      if (!name || name.trim().length === 0) {
        return NextResponse.json(
          { error: "Name is required" },
          { status: 400 }
        );
      }

      if (name.length > 50) {
        return NextResponse.json(
          { error: "Name must be 50 characters or less" },
          { status: 400 }
        );
      }
    }

    if (mapping_config !== undefined) {
      if (!Array.isArray(mapping_config)) {
        return NextResponse.json(
          { error: "mapping_config must be an array" },
          { status: 400 }
        );
      }

      for (const mapping of mapping_config) {
        if (!mapping.sourceColumn || !mapping.targetField) {
          return NextResponse.json(
            { error: "Each mapping must have sourceColumn and targetField" },
            { status: 400 }
          );
        }
      }
    }

    if (analysis_config !== undefined) {
      if (typeof analysis_config !== "object") {
        return NextResponse.json(
          { error: "analysis_config must be an object" },
          { status: 400 }
        );
      }

      if (
        !analysis_config.labor_rate_hourly ||
        !analysis_config.scrap_cost_per_unit
      ) {
        return NextResponse.json(
          { error: "Configuration must include labor_rate_hourly and scrap_cost_per_unit" },
          { status: 400 }
        );
      }
    }

    interface UpdateData {
      name?: string;
      mapping_config?: Array<{
        sourceColumn: string;
        targetField: string;
        confidence?: number;
        dataType: string;
      }>;
      analysis_config?: {
        labor_rate_hourly: number;
        scrap_cost_per_unit: number;
        variance_threshold_pct?: number;
        pattern_min_orders?: number;
      };
    }

    const updateData: UpdateData = {};
    if (name !== undefined) {
      updateData.name = name;
    }
    if (mapping_config !== undefined) {
      updateData.mapping_config = mapping_config;
    }
    if (analysis_config !== undefined) {
      updateData.analysis_config = analysis_config;
    }

    const { error } = await supabase
      .from("csv_mappings")
      .update(updateData)
      .eq("id", id)
      .eq("user_email", userEmail);

    if (error) {
      console.error("Error updating template:", error);
      return NextResponse.json(
        { error: "Failed to update template" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
    const { id } = await params;

    const { error } = await supabase
      .from("csv_mappings")
      .delete()
      .eq("id", id)
      .eq("user_email", userEmail);

    if (error) {
      console.error("Error deleting template:", error);
      return NextResponse.json(
        { error: "Failed to delete template" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
