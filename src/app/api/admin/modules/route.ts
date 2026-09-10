import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { CreateModuleInput } from "@/types";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    const token = authHeader.split(" ")[1];

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError || profile?.role !== "ADMIN") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    let rawBody;
    try {
      rawBody = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid request data" }, { status: 400 });
    }

    if (!rawBody || typeof rawBody !== "object") {
      return NextResponse.json({ error: "Invalid request data" }, { status: 400 });
    }

    const { title, course_id, order_index } = rawBody;

    if (title === undefined || typeof title !== "string") {
      return NextResponse.json({ error: "Invalid module data" }, { status: 400 });
    }
    const trimmedTitle = title.trim();
    if (trimmedTitle.length === 0) {
      return NextResponse.json({ error: "Invalid module data" }, { status: 400 });
    }

    if (!course_id || typeof course_id !== "string" || !UUID_REGEX.test(course_id)) {
      return NextResponse.json({ error: "Invalid module data" }, { status: 400 });
    }

    let finalOrderIndex = order_index;

    if (finalOrderIndex !== undefined) {
      if (typeof finalOrderIndex !== "number" || !Number.isInteger(finalOrderIndex) || finalOrderIndex < 0) {
        return NextResponse.json({ error: "Invalid module data" }, { status: 400 });
      }
    } else {
      const { data: maxModule, error: maxError } = await supabaseAdmin
        .from("modules")
        .select("order_index")
        .eq("course_id", course_id)
        .order("order_index", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (maxError) {
        console.error("[Modules API] Error fetching max order index:", maxError);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
      }

      if (maxModule) {
        finalOrderIndex = maxModule.order_index + 1;
      } else {
        finalOrderIndex = 0;
      }
    }

    // Verify course exists
    const { data: course, error: courseError } = await supabaseAdmin
      .from("courses")
      .select("id")
      .eq("id", course_id)
      .single();

    if (courseError || !course) {
      return NextResponse.json({ error: "Invalid module data" }, { status: 400 });
    }

    const insertPayload: CreateModuleInput = {
      title: trimmedTitle,
      course_id,
      order_index: finalOrderIndex
    };

    const { data, error } = await supabaseAdmin
      .from("modules")
      .insert([insertPayload])
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ error: "Module order already in use" }, { status: 409 });
      }
      console.error("[Modules API] Database error inserting module:", error);
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error: any) {
    console.error("[Modules API] Unexpected error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
