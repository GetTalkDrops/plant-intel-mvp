import { auth, currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: NextRequest) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const user = await currentUser();
    const userEmail = user?.emailAddresses[0]?.emailAddress;

    if (!userEmail) {
      return NextResponse.json({ error: "Email not found" }, { status: 400 });
    }

    const { sessionIds } = await request.json();

    if (!Array.isArray(sessionIds) || sessionIds.length === 0) {
      return NextResponse.json(
        { error: "Invalid session IDs" },
        { status: 400 }
      );
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

    // Verify user owns all sessions
    const { data: sessions, error: verifyError } = await supabase
      .from("chat_sessions")
      .select("id, upload_id")
      .in("id", sessionIds)
      .eq("user_id", userEmail);

    if (verifyError) {
      console.error("Error verifying sessions:", verifyError);
      return NextResponse.json(
        { error: "Failed to verify sessions" },
        { status: 500 }
      );
    }

    if (!sessions || sessions.length !== sessionIds.length) {
      return NextResponse.json(
        { error: "Some sessions not found or unauthorized" },
        { status: 403 }
      );
    }

    // Get upload IDs and batch IDs to delete associated data
    const uploadIds = sessions
      .map((s) => s.upload_id)
      .filter((id): id is string => id !== null);

    let batchIds: string[] = [];
    if (uploadIds.length > 0) {
      const { data: uploads } = await supabase
        .from("data_uploads")
        .select("batch_id")
        .in("id", uploadIds);

      batchIds = (uploads || [])
        .map((u) => u.batch_id)
        .filter((id): id is string => id !== null);
    }

    // Delete in order: messages, work orders, uploads, sessions
    const deletePromises = [];

    // 1. Delete chat messages
    deletePromises.push(
      supabase.from("chat_messages").delete().in("session_id", sessionIds)
    );

    // 2. Delete work orders (raw data)
    if (batchIds.length > 0) {
      deletePromises.push(
        supabase.from("work_orders").delete().in("uploaded_csv_batch", batchIds)
      );
    }

    // 3. Delete data uploads
    if (uploadIds.length > 0) {
      deletePromises.push(
        supabase.from("data_uploads").delete().in("id", uploadIds)
      );
    }

    // 4. Delete chat sessions
    deletePromises.push(
      supabase.from("chat_sessions").delete().in("id", sessionIds)
    );

    const results = await Promise.all(deletePromises);

    // Check for errors
    const errors = results.filter((r) => r.error);
    if (errors.length > 0) {
      console.error("Delete errors:", errors);
      return NextResponse.json(
        { error: "Some deletions failed", details: errors },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      deleted: sessionIds.length,
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
