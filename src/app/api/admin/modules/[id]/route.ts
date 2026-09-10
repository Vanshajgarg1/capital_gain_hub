import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { UpdateModuleInput } from "@/types";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!id || typeof id !== "string" || !UUID_REGEX.test(id)) {
      return NextResponse.json({ error: "Invalid module data" }, { status: 400 });
    }

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

    const updatePayload: UpdateModuleInput = {};

    if (title !== undefined) {
      if (typeof title !== "string") {
        return NextResponse.json({ error: "Invalid module data" }, { status: 400 });
      }
      const trimmedTitle = title.trim();
      if (trimmedTitle.length === 0) {
        return NextResponse.json({ error: "Invalid module data" }, { status: 400 });
      }
      updatePayload.title = trimmedTitle;
    }

    if (course_id !== undefined) {
      if (typeof course_id !== "string" || !UUID_REGEX.test(course_id)) {
        return NextResponse.json({ error: "Invalid module data" }, { status: 400 });
      }
      
      const { data: course, error: courseError } = await supabaseAdmin
        .from("courses")
        .select("id")
        .eq("id", course_id)
        .single();

      if (courseError || !course) {
        return NextResponse.json({ error: "Invalid module data" }, { status: 400 });
      }
      updatePayload.course_id = course_id;
    }

    if (order_index !== undefined) {
      if (typeof order_index !== "number" || !Number.isInteger(order_index) || order_index < 0) {
        return NextResponse.json({ error: "Invalid module data" }, { status: 400 });
      }
      updatePayload.order_index = order_index;
    }

    if (Object.keys(updatePayload).length === 0) {
      return NextResponse.json({ error: "Invalid module data" }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("modules")
      .update(updatePayload)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ error: "Module order already in use" }, { status: 409 });
      }
      console.error("[Modules API] Database error updating module:", error);
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error("[Modules API] Unexpected error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!id || typeof id !== "string" || !UUID_REGEX.test(id)) {
      return NextResponse.json({ error: "Invalid module data" }, { status: 400 });
    }

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

    const { error } = await supabaseAdmin
      .from("modules")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("[Modules API] Database error deleting module:", error);
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[Modules API] Unexpected error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
