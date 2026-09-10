import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { course_id } = body;

    if (!course_id) {
      return NextResponse.json({ error: "course_id is required" }, { status: 400 });
    }

    // 1. Authenticate user from the Authorization header
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Missing or invalid authorization token" }, { status: 401 });
    }
    const token = authHeader.split(" ")[1];

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    
    // Standard client to validate the token
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Fetch the course to determine the authoritative price
    const { data: course, error: courseError } = await supabase
      .from("courses")
      .select("id, price")
      .eq("id", course_id)
      .single();

    if (courseError || !course) {
      return NextResponse.json({ error: "COURSE_NOT_FOUND" }, { status: 404 });
    }

    // 3. Prevent enrollment if it requires payment
    if (Number(course.price) > 0) {
      return NextResponse.json({ error: "PAYMENT_REQUIRED" }, { status: 402 });
    }

    // 4. Create the enrollment using the Service Role Key (Bypassing RLS)
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey) {
      console.error("Missing SUPABASE_SERVICE_ROLE_KEY environment variable");
      return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // Check for existing enrollment to gracefully handle ALREADY_ENROLLED
    const { data: existingEnrollment } = await supabaseAdmin
      .from("enrollments")
      .select("id")
      .eq("user_id", user.id)
      .eq("course_id", course_id)
      .single();

    if (existingEnrollment) {
      return NextResponse.json({ error: "ALREADY_ENROLLED" }, { status: 409 });
    }

    // Insert the new enrollment securely
    const { error: insertError } = await supabaseAdmin
      .from("enrollments")
      .insert({
        user_id: user.id,
        course_id: course_id,
      });

    if (insertError) {
      console.error("Error inserting enrollment:", insertError);
      return NextResponse.json({ error: "Failed to create enrollment" }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (err: any) {
    console.error("Enrollment error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
