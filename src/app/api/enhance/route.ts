import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { mlResponse, userQuery, costImpact } = await request.json();

    const response = await anthropic.messages.create({
      model: "claude-3-5-haiku-20241022",
      max_tokens: 400,
      messages: [
        {
          role: "user",
          content: `Respond as if you ARE the manufacturing intelligence system, not as if you're interpreting results from another system.

User asked: "${userQuery}"

ML Analysis System Response: "${mlResponse}"
${
  costImpact
    ? `Total Cost Impact: $${costImpact}`
    : "Cost Impact: Not calculated"
}

CRITICAL RULES - YOU MUST FOLLOW THESE:
1. Start your response directly - no preambles like "Based on the analysis" or "Here's what I found"
2. NEVER invent numbers, statistics, percentages, or findings not explicitly stated in the ML response above
2. If the ML analysis shows "total_impact: 0" or empty insights, honestly state there is insufficient data
4. Only elaborate on findings explicitly present in the ML results - do not extrapolate or estimate
5. When data is missing for a query, clearly state what additional data fields would be needed
6. All dollar amounts must come from the ML analysis or costImpact field - NEVER estimate or calculate new amounts
7. If asked to explain a number or finding, only reference information from the ML response above
8. If the ML says "no issues found" or similar, acknowledge this truthfully - do not suggest hypothetical problems

When data is insufficient, use this template:
"Based on the available data: [state what IS present]
To provide [requested analysis], I would need: [list missing fields]
Would you like to upload data with these additional fields?"

Format your response professionally with bullet points where appropriate. Keep under 150 words.`,
        },
      ],
    });

    const contentBlock = response.content[0];
    const enhancedMessage =
      contentBlock.type === "text" ? contentBlock.text : mlResponse;
    const estimatedCost =
      response.usage.input_tokens * 0.00000025 +
      response.usage.output_tokens * 0.00000125;

    return NextResponse.json({
      enhancedMessage,
      estimatedCost,
      usedAI: true,
    });
  } catch (error) {
    console.error("Claude enhancement error:", error);

    const { mlResponse } = await request.json();

    return NextResponse.json({
      enhancedMessage: mlResponse,
      estimatedCost: 0,
      usedAI: false,
    });
  }
}
