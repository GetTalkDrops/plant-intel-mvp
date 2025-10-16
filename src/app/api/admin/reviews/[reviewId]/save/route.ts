import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ reviewId: string }> }
) {
  try {
    const { reviewId } = await params;
    const supabase = await createClient();
    const body = await request.json();
    
    const { editedResults, internalNotes } = body;

    const { error } = await supabase
      .from("analysis_reviews")
      .update({
        edited_results: editedResults,
        internal_notes: internalNotes,
      })
      .eq("id", reviewId);

    if (error) {
      return NextResponse.json(
        { error: "Failed to save draft" },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true,
      message: "Draft saved"
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
