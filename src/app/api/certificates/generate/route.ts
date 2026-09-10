import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { generateAndSaveCertificate } from "@/lib/server/certificate";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { course_id } = body;

    if (!course_id) {
      return NextResponse.json({ error: "course_id is required" }, { status: 400 });
    }

    // 1. AUTHENTICATION
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }
    const token = authHeader.split(" ")[1];

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey);
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    // 2. GENERATE AND SAVE CERTIFICATE USING UTILITY
    const result = await generateAndSaveCertificate(user.id, course_id);

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json({ success: true, certificate: result.certificate }, { status: result.status });
  } catch (err: any) {
    console.error("Certificate generation error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
