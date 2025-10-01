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

    // Look for saved mapping with this header signature
    const { data, error } = await supabase
      .from("csv_mappings")
      .select("*")
      .eq("user_email", userEmail)
      .eq("header_signature", headerSignature)
      .order("created_at", { ascending: false })
      .limit(1);

    console.log("Supabase query result:", { data, error, count: data?.length });

    if (error || !data || data.length === 0) {
      console.log("No saved mapping found");
      return NextResponse.json({ found: false });
    }

    const savedMapping = data[0];
    console.log("Found saved mapping:", savedMapping.file_name);

    return NextResponse.json({
      found: true,
      mapping: savedMapping.mapping_config,
      createdAt: savedMapping.created_at,
    });
  } catch (error) {
    console.error("Error fetching saved mapping:", error);
    return NextResponse.json({ found: false });
  }
}
