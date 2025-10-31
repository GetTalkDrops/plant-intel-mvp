import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface VarianceBreakdown {
  material?: Record<string, unknown>;
  labor?: Record<string, unknown>;
}

interface InsightAnalysis {
  primary_driver?: string;
  variance_breakdown?: VarianceBreakdown;
  baseline_context?: Record<string, unknown>;
}

interface InsightData {
  work_order_number?: string;
  predicted_variance?: number;
  risk_level?: string;
  analysis?: InsightAnalysis;
}

interface InsightNarrative {
  headline?: string;
  what_happening?: string;
  why_matters?: string;
  recommended_action?: string;
}

interface Insight {
  data?: InsightData;
  narrative?: InsightNarrative;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const insight = body.insight as Insight;

    const prompt = buildForensicPrompt(insight);

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 1000,
      messages: [{ role: "user", content: prompt }],
    });

    const content = response.content[0];
    const narrative = content.type === "text" ? content.text : "";

    return NextResponse.json({ narrative });
  } catch (error) {
    console.error("Enhancement error:", error);
    return NextResponse.json({ narrative: null }, { status: 500 });
  }
}

function buildForensicPrompt(insight: Insight): string {
  const data = insight.data || {};
  const narrative = insight.narrative || {};

  return `You are a forensic manufacturing analyst. Analyze this cost variance and create a compelling, specific narrative.

DATA:
- Work Order: ${data.work_order_number || "N/A"}
- Variance: $${data.predicted_variance?.toLocaleString() || "0"}
- Risk Level: ${data.risk_level || "N/A"}
- Primary Driver: ${data.analysis?.primary_driver || "N/A"}
- Material Variance: ${JSON.stringify(
    data.analysis?.variance_breakdown?.material
  )}
- Labor Variance: ${JSON.stringify(data.analysis?.variance_breakdown?.labor)}
- Baseline Context: ${JSON.stringify(data.analysis?.baseline_context)}

CURRENT NARRATIVE:
${narrative.what_happening || "N/A"}

YOUR TASK:
Create a 4-paragraph forensic narrative:

1. WHAT HAPPENED (2-3 sentences):
   - Be specific with numbers and timeframes
   - Mention exact work order and dollar amounts
   - If baseline data shows material is "X vs your typical Y", include that comparison

2. WHY IT MATTERS (2 sentences):
   - Financial impact and projection
   - Business consequences

3. ROOT CAUSE (2 sentences):
   - What's driving the variance
   - Be specific about material vs labor

4. RECOMMENDED ACTION (2-3 sentences):
   - Specific next step with timeline
   - Who to contact or what to investigate

CRITICAL RULES:
- Use ONLY the numbers provided above
- Be specific with material names and dollar amounts
- NO generic statements like "review performance"
- If baseline comparison is available, use it prominently

Return ONLY the 4 paragraphs, separated by double newlines. No preamble, no JSON.`;
}
