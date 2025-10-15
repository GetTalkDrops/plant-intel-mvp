import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const headerSignature = searchParams.get("headerSignature");
    const userEmail = searchParams.get("userEmail");

    console.log("Checking for saved mapping:", { headerSignature, userEmail });

    if (!headerSignature || !userEmail) {
      console.log("Missing parameters");
      return NextResponse.json({ found: false });
    }

    // Parse the incoming headers (now JSON array instead of hash)
    let incomingHeaders: string[];
    try {
      incomingHeaders = JSON.parse(headerSignature);
    } catch {
      console.log("Invalid header signature format");
      return NextResponse.json({ found: false });
    }

    // Get all mappings for this user
    const { data, error } = await supabase
      .from("csv_mappings")
      .select("*")
      .eq("user_email", userEmail)
      .order("created_at", { ascending: false });

    if (error || !data || data.length === 0) {
      console.log("No saved mappings found");
      return NextResponse.json({ found: false });
    }

    // Find EXACT match (compare actual header arrays)
    for (const mapping of data) {
      try {
        const savedHeaders = JSON.parse(mapping.header_signature);
        
        // Check for exact match
        if (savedHeaders.length === incomingHeaders.length) {
          const sorted1 = [...savedHeaders].sort();
          const sorted2 = [...incomingHeaders].sort();
          const isExactMatch = sorted1.every((h, i) => h === sorted2[i]);
          
          if (isExactMatch) {
            console.log("Found EXACT header match:", mapping.id);
            return NextResponse.json({
              found: true,
              mapping: mapping.mapping_config,
              createdAt: mapping.created_at,
              fileName: mapping.file_name || "previous file"
            });
          }
        }
      } catch (e) {
        console.log("Skipping invalid mapping:", mapping.id);
        continue;
      }
    }

    console.log("No exact match found");
    return NextResponse.json({ found: false });
  } catch (error) {
    console.error("Error fetching saved mapping:", error);
    return NextResponse.json({ found: false });
  }
}
