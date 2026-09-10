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

    const { direction } = rawBody;
    if (direction !== "up" && direction !== "down") {
      return NextResponse.json({ error: "Invalid reorder direction" }, { status: 400 });
    }

    // 1. Fetch target module
    const { data: targetModule, error: targetError } = await supabaseAdmin
      .from("modules")
      .select("id, course_id, order_index")
      .eq("id", id)
      .single();

    if (targetError || !targetModule) {
      return NextResponse.json({ error: "Module not found" }, { status: 404 });
    }

    // 2. Fetch adjacent module based on true ordering (nearest neighbor)
    // If direction is up, we want the module with the maximum order_index that is strictly LESS than target's order_index.
    // If direction is down, we want the module with the minimum order_index that is strictly GREATER than target's order_index.
    let adjacentQuery = supabaseAdmin
      .from("modules")
      .select("id, order_index")
      .eq("course_id", targetModule.course_id);

    if (direction === "up") {
      adjacentQuery = adjacentQuery
        .lt("order_index", targetModule.order_index)
        .order("order_index", { ascending: false });
    } else {
      adjacentQuery = adjacentQuery
        .gt("order_index", targetModule.order_index)
        .order("order_index", { ascending: true });
    }

    const { data: adjacentModules, error: adjacentError } = await adjacentQuery.limit(1);

    if (adjacentError) {
      console.error("[Modules Reorder API] Database error finding adjacent module:", adjacentError);
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }

    if (!adjacentModules || adjacentModules.length === 0) {
      return NextResponse.json({ error: "Module cannot be moved further" }, { status: 409 });
    }

    const adjacentModule = adjacentModules[0];

    // 3. Perform Safe 3-step swap without RPC
    // Find absolute maximum order_index to use as a temporary safe space
    const { data: maxModule, error: maxError } = await supabaseAdmin
      .from("modules")
      .select("order_index")
      .eq("course_id", targetModule.course_id)
      .order("order_index", { ascending: false })
      .limit(1)
      .single();

    if (maxError) {
      console.error("[Modules Reorder API] Database error finding max order_index:", maxError);
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }

    const tempOrderIndex = maxModule.order_index + 1;
    
    const targetOriginalIndex = targetModule.order_index;
    const adjacentOriginalIndex = adjacentModule.order_index;

    // Step A: Move target to safe temp position
    const { error: stepAError } = await supabaseAdmin
      .from("modules")
      .update({ order_index: tempOrderIndex })
      .eq("id", targetModule.id);

    if (stepAError) {
      console.error("[Modules Reorder API] Step A failed:", stepAError);
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }

    // Step B: Move adjacent into target's original position
    const { error: stepBError } = await supabaseAdmin
      .from("modules")
      .update({ order_index: targetOriginalIndex })
      .eq("id", adjacentModule.id);

    if (stepBError) {
      console.error("[Modules Reorder API] Step B failed:", stepBError);
      // Attempt safe rollback for Step A
      await supabaseAdmin.from("modules").update({ order_index: targetOriginalIndex }).eq("id", targetModule.id);
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }

    // Step C: Move target from temp into adjacent's original position
    const { error: stepCError } = await supabaseAdmin
      .from("modules")
      .update({ order_index: adjacentOriginalIndex })
      .eq("id", targetModule.id);

    if (stepCError) {
      console.error("[Modules Reorder API] Step C failed:", stepCError);
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[Modules Reorder API] Unexpected error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
