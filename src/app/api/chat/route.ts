import { NextRequest, NextResponse } from "next/server";
import { isDemoAccount } from "@/lib/crm/demo-account";

export async function POST(request: NextRequest) {
  try {
    const { message, userEmail } = await request.json();

    if (!message || !userEmail) {
      return NextResponse.json(
        { error: "Message and user email are required" },
        { status: 400 }
      );
    }

    console.log(`Chat query from ${userEmail}: ${message}`);

    const isDemo = isDemoAccount(userEmail);
    const facilityId = isDemo ? 1 : 2;

    const response = await fetch("http://localhost:8000/analyze", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: message,
        user_email: userEmail,
        facility_id: facilityId,
      }),
    });

    if (!response.ok) {
      throw new Error(`FastAPI error: ${response.status}`);
    }

    const result = await response.json();

    return NextResponse.json({
      response: result.message,
      insights: result.insights || [],
      totalImpact: result.total_impact || 0,
      predictions: result.predictions || [], // Add this line
      error: result.error, // Add this line
      type: result.type,
    });
  } catch (error) {
    console.error("Chat error:", error);

    return NextResponse.json({
      response:
        "I'm having trouble analyzing your data right now. Please make sure you've uploaded some manufacturing data and try again.",
      insights: [],
      totalImpact: 0,
      type: "error",
    });
  }
}
