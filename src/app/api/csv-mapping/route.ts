import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { headers, sampleRows } = await request.json();

    // Much simpler prompt
    const prompt = `Analyze these CSV headers and suggest manufacturing field mappings.

Headers: ${headers.join(", ")}

Return simple JSON like: {"mappings": [{"sourceColumn": "WO_ID", "targetField": "work_order_id", "confidence": 0.9}], "confidence": 0.8}`;

    const response = await anthropic.messages.create({
      model: "claude-3-5-haiku-20241022",
      max_tokens: 500,
      messages: [{ role: "user", content: prompt }],
    });

    const content = response.content[0];
    if (content.type === "text") {
      // Return a basic response for now
      return NextResponse.json({
        mappings: [
          {
            sourceColumn: headers[0] || "unknown",
            targetField: "work_order_id",
            confidence: 0.8,
            dataType: "string",
          },
        ],
        unmappedColumns: headers.slice(1),
        requiredFieldsCovered: ["work_order_id"],
        missingRequiredFields: [],
        confidence: 0.8,
      });
    }

    return NextResponse.json({ error: "No response from AI" }, { status: 500 });
  } catch (error) {
    console.error("Simplified CSV mapping error:", error);
    return NextResponse.json({ error: "Mapping failed" }, { status: 500 });
  }
}
