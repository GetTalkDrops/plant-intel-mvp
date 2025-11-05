// src/app/api/csv-templates/match/route.ts
/**
 * CSV Template Matching API
 * Finds matching templates based on CSV headers
 */

import { auth, currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ==================== MATCH TEMPLATE ====================
// POST /api/csv-templates/match
export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await currentUser();
  const userEmail = user?.emailAddresses[0]?.emailAddress;
  if (!userEmail) {
    return NextResponse.json({ error: "Email not found" }, { status: 400 });
  }

  try {
    const body = await request.json();
    const { headers } = body;

    if (!headers || !Array.isArray(headers)) {
      return NextResponse.json(
        { error: "Invalid headers format" },
        { status: 400 }
      );
    }

    // Fetch all templates for this user
    const { data: templates, error } = await supabase
      .from("csv_mappings")
      .select("*")
      .eq("user_email", userEmail)
      .order("last_used_at", { ascending: false, nullsFirst: false });

    if (error) {
      console.error("Template fetch error:", error);
      return NextResponse.json({ found: false });
    }

    if (!templates || templates.length === 0) {
      return NextResponse.json({ found: false });
    }

    // Find matching template
    for (const template of templates) {
      try {
        const savedHeaders = JSON.parse(template.header_signature);

        if (savedHeaders.length === headers.length) {
          const sorted1 = [...savedHeaders].sort();
          const sorted2 = [...headers].sort();
          const isExactMatch = sorted1.every((h, i) => h === sorted2[i]);

          if (isExactMatch) {
            return NextResponse.json({
              found: true,
              name: template.name,
              mappings: template.mapping_config,
              analysisConfig: template.analysis_config,
            });
          }
        }
      } catch (e) {
        console.log("Skipping invalid template:", template.id);
        continue;
      }
    }

    return NextResponse.json({ found: false });
  } catch (error) {
    console.error("Template match error:", error);
    return NextResponse.json({ found: false });
  }
}
