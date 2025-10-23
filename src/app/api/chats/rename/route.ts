import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  try {
    const { sessionId, title } = await request.json();

    if (!sessionId || !title) {
      return NextResponse.json(
        { error: "Session ID and title are required" },
        { status: 400 }
      );
    }

    // Update the chat session title
    const { error } = await supabase
      .from("chat_sessions")
      .update({
        title: title.trim(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", sessionId);

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Rename error:", error);
    return NextResponse.json(
      { error: "Failed to rename chat" },
      { status: 500 }
    );
  }
}
