import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface Investigation {
  type: string;
  id: string;
  title: string;
  total_impact: number;
  trend: {
    status: string;
    direction: string;
  };
  connected_insights: string[];
  priority: string;
  insight_count: number;
  materials_affected?: string[];
}

interface RequestBody {
  investigation: Investigation;
}

function buildInvestigationPrompt(investigation: Investigation): string {
  const prompt = `You are a forensic manufacturing analyst. A pattern has been detected across ${
    investigation.insight_count
  } related cost variances.

INVESTIGATION SUMMARY:
Title: ${investigation.title}
Total Financial Impact: $${investigation.total_impact.toLocaleString()}
Trend: ${investigation.trend.status} ${investigation.trend.direction}
Priority: ${investigation.priority}
Materials Affected: ${
    investigation.materials_affected?.join(", ") || "Multiple"
  }

Your task: Write a compelling, executive-ready narrative that explains what happened, why it matters, and what to do next.

STRUCTURE YOUR RESPONSE AS:

WHAT HAPPENED:
- Describe the pattern across these ${
    investigation.insight_count
  } related issues
- Include specific details and timeframes
- Keep it factual and specific

WHY IT MATTERS:
- Explain business impact and financial trajectory
- Project what happens if this continues
- Quantify the risk

RECOMMENDED ACTIONS:
- List 2-3 specific actions with timeframes
- Prioritize by ROI and urgency
- Be concrete and actionable

TONE: Direct, consultant-style, numbers-focused. No speculation. Write for a plant manager who needs to act today.

Keep total response under 400 words.`;

  return prompt;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as RequestBody;
    const investigation = body.investigation;

    if (!investigation) {
      return NextResponse.json(
        { error: "Investigation object required" },
        { status: 400 }
      );
    }

    const prompt = buildInvestigationPrompt(investigation);

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 1000,
      messages: [{ role: "user", content: prompt }],
    });

    const narrative =
      response.content[0].type === "text" ? response.content[0].text : "";

    return NextResponse.json({ narrative });
  } catch (error) {
    console.error("Investigation enhancement error:", error);
    return NextResponse.json(
      { error: "Failed to enhance investigation" },
      { status: 500 }
    );
  }
}
