import { auth, currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;

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

    const user = await currentUser();
    const userEmail = user?.emailAddresses[0]?.emailAddress;

    if (!userEmail) {
      return NextResponse.json({ error: "Email not found" }, { status: 400 });
    }

    const { error } = await supabase
      .from("csv_mappings")
      .delete()
      .eq("id", id)
      .eq("user_email", userEmail);

    if (error) {
      console.error("Error deleting mapping:", error);
      return NextResponse.json(
        { error: "Failed to delete mapping" },
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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const { name, mapping_config } = body;

    // Validate that at least one field is being updated
    if (!name && !mapping_config) {
      return NextResponse.json(
        { error: "Must provide name or mapping_config to update" },
        { status: 400 }
      );
    }

    // Validate name if provided
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

    // Validate mapping_config if provided
    if (mapping_config !== undefined) {
      if (!Array.isArray(mapping_config)) {
        return NextResponse.json(
          { error: "mapping_config must be an array" },
          { status: 400 }
        );
      }

      // Validate each mapping has required fields
      for (const mapping of mapping_config) {
        if (!mapping.sourceColumn || !mapping.targetField) {
          return NextResponse.json(
            { error: "Each mapping must have sourceColumn and targetField" },
            { status: 400 }
          );
        }
      }
    }

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

    const user = await currentUser();
    const userEmail = user?.emailAddresses[0]?.emailAddress;

    if (!userEmail) {
      return NextResponse.json({ error: "Email not found" }, { status: 400 });
    }

    // Build update object dynamically
    interface UpdateData {
      name?: string;
      mapping_config?: Array<{
        sourceColumn: string;
        targetField: string;
        confidence?: number;
        dataType: string;
      }>;
    }

    const updateData: UpdateData = {};
    const { error } = await supabase
      .from("csv_mappings")
      .update(updateData)
      .eq("id", id)
      .eq("user_email", userEmail);

    if (error) {
      console.error("Error updating mapping:", error);
      return NextResponse.json(
        { error: "Failed to update mapping" },
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
