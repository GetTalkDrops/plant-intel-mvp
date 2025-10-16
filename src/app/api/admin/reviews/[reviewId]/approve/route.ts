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
    
    const { editedResults, internalNotes, savingsUpdate } = body;

    const { error: reviewError } = await supabase
      .from("analysis_reviews")
      .update({
        status: "published",
        reviewed_by: "admin@plantintel.com",
        reviewed_at: new Date().toISOString(),
        edited_results: editedResults,
        internal_notes: internalNotes,
        checklist_completed: true,
      })
      .eq("id", reviewId);

    if (reviewError) {
      return NextResponse.json(
        { error: "Failed to update review" },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true,
      message: "Analysis approved and published"
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
