import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { CreateLessonInput } from "@/types";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ALLOWED_PROVIDERS = ['youtube', 'mux'];

export async function POST(request: Request) {
  try {
    // 1. Authorization
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

    // 2. Parse body
    let rawBody;
    try {
      rawBody = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid request data" }, { status: 400 });
    }

    if (!rawBody || typeof rawBody !== "object") {
      return NextResponse.json({ error: "Invalid request data" }, { status: 400 });
    }

    const { title, description, module_id, order_index, duration, video_provider, video_id, video_asset_id, is_free_preview } = rawBody;

    // 3. Validation
    // Title
    if (title === undefined || typeof title !== "string") {
      return NextResponse.json({ error: "Invalid lesson data" }, { status: 400 });
    }
    const trimmedTitle = title.trim();
    if (trimmedTitle.length === 0) {
      return NextResponse.json({ error: "Invalid lesson data" }, { status: 400 });
    }

    // Description
    if (description !== undefined && typeof description !== "string") {
      return NextResponse.json({ error: "Invalid lesson data" }, { status: 400 });
    }

    // Module ID
    if (!module_id || typeof module_id !== "string" || !UUID_REGEX.test(module_id)) {
      return NextResponse.json({ error: "Invalid lesson data" }, { status: 400 });
    }
    
    // Verify module exists
    const { data: moduleData, error: moduleError } = await supabaseAdmin
      .from("modules")
      .select("id")
      .eq("id", module_id)
      .single();

    if (moduleError || !moduleData) {
      return NextResponse.json({ error: "Module not found" }, { status: 404 });
    }

    // Order index
    let finalOrderIndex = order_index;
    if (finalOrderIndex !== undefined) {
      if (typeof finalOrderIndex !== "number" || !Number.isInteger(finalOrderIndex) || finalOrderIndex < 0) {
        return NextResponse.json({ error: "Invalid lesson data" }, { status: 400 });
      }
    } else {
      // Calculate max order index for this module
      const { data: maxOrderData, error: maxOrderError } = await supabaseAdmin
        .from("lessons")
        .select("order_index")
        .eq("module_id", module_id)
        .order("order_index", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (maxOrderError) {
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
      }

      finalOrderIndex = maxOrderData ? maxOrderData.order_index + 1 : 0;
    }

    // Duration
    let finalDuration = duration;
    if (finalDuration !== undefined) {
      if (typeof finalDuration !== "number" || !Number.isInteger(finalDuration) || finalDuration < 0) {
        return NextResponse.json({ error: "Invalid lesson data" }, { status: 400 });
      }
    } else {
      finalDuration = 0;
    }

    // Video Provider
    if (video_provider !== undefined) {
      if (typeof video_provider !== "string" || !ALLOWED_PROVIDERS.includes(video_provider)) {
        return NextResponse.json({ error: "Invalid lesson data" }, { status: 400 });
      }
    }

    // Video ID
    if (video_id !== undefined && typeof video_id !== "string") {
      return NextResponse.json({ error: "Invalid lesson data" }, { status: 400 });
    }

    // Is Free Preview
    let finalIsFreePreview = is_free_preview;
    if (finalIsFreePreview !== undefined) {
      if (typeof finalIsFreePreview !== "boolean") {
        return NextResponse.json({ error: "Invalid lesson data" }, { status: 400 });
      }
    } else {
      finalIsFreePreview = false;
    }

    const insertPayload: CreateLessonInput = {
      title: trimmedTitle,
      description: description || "",
      module_id,
      order_index: finalOrderIndex,
      duration: finalDuration,
      is_free_preview: finalIsFreePreview,
    };

    if (video_provider !== undefined) {
      insertPayload.video_provider = video_provider;
    }
    
    if (video_id !== undefined) {
      insertPayload.video_id = video_id;
    }
    
    if (video_asset_id !== undefined) {
      insertPayload.video_asset_id = video_asset_id;
    }

    const { data, error } = await supabaseAdmin
      .from("lessons")
      .insert(insertPayload)
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: "Lesson order already in use" }, { status: 409 });
      }
      console.error("[Lessons API] Database error creating lesson:", error);
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error("[Lessons API] Unexpected error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
