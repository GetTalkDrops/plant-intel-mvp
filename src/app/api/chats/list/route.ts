import { auth, currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(request: NextRequest) {
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

    // Fetch all chat sessions with upload data
    const { data: sessions, error: sessionsError } = await supabase
      .from("chat_sessions")
      .select(
        `
        id,
        title,
        created_at,
        updated_at,
        total_savings,
        upload_id,
        data_uploads (
          record_count
        )
      `
      )
      .eq("user_id", userEmail)
      .order("updated_at", { ascending: false });

    if (sessionsError) {
      console.error("Error fetching sessions:", sessionsError);
      return NextResponse.json(
        { error: "Failed to fetch chat sessions" },
        { status: 500 }
      );
    }

    // Transform data and calculate stats
    const transformedSessions = (sessions || []).map((session: unknown) => {
      const s = session as {
        id: string;
        title: string;
        created_at: string;
        updated_at: string;
        total_savings: number | null;
        upload_id: string | null;
        data_uploads: { record_count: number } | null;
      };

      return {
        id: s.id,
        title: s.title,
        created_at: s.created_at,
        updated_at: s.updated_at,
        total_savings: s.total_savings || 0,
        upload_id: s.upload_id,
        record_count: s.data_uploads?.record_count || null,
      };
    });

    const stats = {
      totalSessions: transformedSessions.length,
      totalRecords: transformedSessions.reduce(
        (sum, s) => sum + (s.record_count || 0),
        0
      ),
      totalSavings: transformedSessions.reduce(
        (sum, s) => sum + (s.total_savings || 0),
        0
      ),
    };

    return NextResponse.json({
      sessions: transformedSessions,
      stats,
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
