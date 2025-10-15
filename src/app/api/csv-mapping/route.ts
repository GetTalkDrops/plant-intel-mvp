import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface Mapping {
  sourceColumn: string;
  targetField: string;
  confidence: number;
  dataType: string;
}

export async function POST(request: NextRequest) {
  try {
    const { headers, sampleRows } = await request.json();

    // Pre-process: do exact string matching first for obvious cases
    const easyMappings: Mapping[] = [];
    const remainingHeaders: string[] = [];

    const exactMatches: Record<string, string> = {
      "work_order_number": "work_order_number",
      "facility_id": "facility_id",
      "planned_material_cost": "planned_material_cost",
      "actual_material_cost": "actual_material_cost",
      "material_code": "material_code",
      "supplier_id": "supplier_id",
      "planned_labor_hours": "planned_labor_hours",
      "actual_labor_hours": "actual_labor_hours",
      "units_produced": "units_produced",
      "units_scrapped": "units_scrapped",
      "quality_issues": "quality_issues",
      "machine_id": "machine_id",
      "production_period_start": "production_period_start",
      "production_period_end": "production_period_end",
    };

    headers.forEach((header: string) => {
      if (exactMatches[header]) {
        easyMappings.push({
          sourceColumn: header,
          targetField: exactMatches[header],
          confidence: 1.0,
          dataType: "string"
        });
      } else {
        remainingHeaders.push(header);
      }
    });

    // If all matched exactly, return immediately
    if (remainingHeaders.length === 0) {
      return NextResponse.json({
        mappings: easyMappings,
        unmappedColumns: [],
        requiredFieldsCovered: easyMappings.map(m => m.targetField),
        missingRequiredFields: [],
        confidence: 1.0,
      });
    }

    // For remaining headers, ask AI
    const prompt = `Map these CSV columns to target fields. Only map if confident (>80%).

Remaining Columns: ${JSON.stringify(remainingHeaders)}
Sample Values: ${JSON.stringify(sampleRows[0]?.filter((_: string, i: number) => remainingHeaders.includes(headers[i])) || [])}

Target Options:
- work_order_number (job/order number)
- facility_id (plant/location)
- material_code (part/product code)
- supplier_id (vendor ID)
- units_produced (quantity made)
- units_scrapped (rejects/defects)
- machine_id (equipment ID)

If not confident, return empty array.

Return JSON: {"mappings": [{"sourceColumn": "col_name", "targetField": "target_name", "confidence": 0.85}]}`;

    const response = await anthropic.messages.create({
      model: "claude-3-5-haiku-20241022",
      max_tokens: 1000,
      messages: [{ role: "user", content: prompt }],
    });

    const content = response.content[0];
    if (content.type === "text") {
      let aiText = content.text.trim();
      aiText = aiText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      
      const parsed = JSON.parse(aiText);
      
      const aiMappings: Mapping[] = (parsed.mappings || [])
        .filter((m: Mapping) => m.confidence >= 0.8 && m.targetField !== "IGNORE")
        .map((m: Mapping) => ({
          sourceColumn: m.sourceColumn,
          targetField: m.targetField,
          confidence: m.confidence,
          dataType: "string",
        }));

      // Combine exact matches + AI suggestions
      const allMappings = [...easyMappings, ...aiMappings];
      const mappedColumns = allMappings.map(m => m.sourceColumn);
      const unmappedColumns = headers.filter((h: string) => !mappedColumns.includes(h));

      return NextResponse.json({
        mappings: allMappings,
        unmappedColumns,
        requiredFieldsCovered: allMappings.map(m => m.targetField),
        missingRequiredFields: [],
        confidence: 0.9,
      });
    }

    return NextResponse.json({ error: "No response from AI" }, { status: 500 });
  } catch (error) {
    console.error("CSV mapping error:", error);
    return NextResponse.json({
      mappings: [],
      unmappedColumns: [],
      requiredFieldsCovered: [],
      missingRequiredFields: [],
      confidence: 0,
    });
  }
}
