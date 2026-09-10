import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!id || typeof id !== "string" || !UUID_REGEX.test(id)) {
      return NextResponse.json({ error: "Invalid lesson data" }, { status: 400 });
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

    const { direction } = rawBody;
    if (direction !== "up" && direction !== "down") {
      return NextResponse.json({ error: "Invalid reorder direction" }, { status: 400 });
    }

    // 1. Fetch target lesson
    const { data: targetLesson, error: targetError } = await supabaseAdmin
      .from("lessons")
      .select("id, module_id, order_index")
      .eq("id", id)
      .single();

    if (targetError || !targetLesson) {
      return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
    }

    // 2. Fetch adjacent lesson based on true ordering (nearest neighbor)
    let adjacentQuery = supabaseAdmin
      .from("lessons")
      .select("id, order_index")
      .eq("module_id", targetLesson.module_id);

    if (direction === "up") {
      adjacentQuery = adjacentQuery
        .lt("order_index", targetLesson.order_index)
        .order("order_index", { ascending: false });
    } else {
      adjacentQuery = adjacentQuery
        .gt("order_index", targetLesson.order_index)
        .order("order_index", { ascending: true });
    }

    const { data: adjacentLessons, error: adjacentError } = await adjacentQuery.limit(1);

    if (adjacentError) {
      console.error("[Lessons Reorder API] Database error finding adjacent lesson:", adjacentError);
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }

    if (!adjacentLessons || adjacentLessons.length === 0) {
      return NextResponse.json({ error: "Lesson cannot be moved further" }, { status: 409 });
    }

    const adjacentLesson = adjacentLessons[0];

    // 3. Perform Safe 3-step swap without RPC
    const { data: maxLesson, error: maxError } = await supabaseAdmin
      .from("lessons")
      .select("order_index")
      .eq("module_id", targetLesson.module_id)
      .order("order_index", { ascending: false })
      .limit(1)
      .single();

    if (maxError) {
      console.error("[Lessons Reorder API] Database error finding max order_index:", maxError);
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }

    const tempOrderIndex = maxLesson.order_index + 1;
    
    const targetOriginalIndex = targetLesson.order_index;
    const adjacentOriginalIndex = adjacentLesson.order_index;

    // Step A: Move target to safe temp position
    const { error: stepAError } = await supabaseAdmin
      .from("lessons")
      .update({ order_index: tempOrderIndex })
      .eq("id", targetLesson.id);

    if (stepAError) {
      console.error("[Lessons Reorder API] Step A failed:", stepAError);
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }

    // Step B: Move adjacent into target's original position
    const { error: stepBError } = await supabaseAdmin
      .from("lessons")
      .update({ order_index: targetOriginalIndex })
      .eq("id", adjacentLesson.id);

    if (stepBError) {
      console.error("[Lessons Reorder API] Step B failed:", stepBError);
      // Attempt safe rollback for Step A
      await supabaseAdmin.from("lessons").update({ order_index: targetOriginalIndex }).eq("id", targetLesson.id);
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }

    // Step C: Move target from temp into adjacent's original position
    const { error: stepCError } = await supabaseAdmin
      .from("lessons")
      .update({ order_index: adjacentOriginalIndex })
      .eq("id", targetLesson.id);

    if (stepCError) {
      console.error("[Lessons Reorder API] Step C failed:", stepCError);
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[Lessons Reorder API] Unexpected error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
