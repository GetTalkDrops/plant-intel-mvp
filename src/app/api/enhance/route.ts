import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { mlResponse, userQuery } = await request.json();

    const response = await anthropic.messages.create({
      model: "claude-3-5-haiku-20241022",
      max_tokens: 400,
      messages: [
        {
          role: "user",
          content: `You are a manufacturing operations analyst providing insights to plant management. A user asked: "${userQuery}"

The analysis system provided: "${mlResponse}"

Provide a professional response that:
- Uses formal business language appropriate for executives
- Focuses on operational impact and financial metrics
- Provides specific, actionable recommendations
- Maintains a consultative, expert tone
- Avoids casual expressions or sales language

Format your response clearly with bullet points where appropriate. Keep under 150 words.`,
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
