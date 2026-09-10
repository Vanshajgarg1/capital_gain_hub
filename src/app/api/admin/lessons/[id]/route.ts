import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { UpdateLessonInput } from "@/types";
import Mux from "@mux/mux-node";

let muxClient: Mux | null = null;
if (process.env.MUX_TOKEN_ID && process.env.MUX_TOKEN_SECRET) {
  muxClient = new Mux({
    tokenId: process.env.MUX_TOKEN_ID,
    tokenSecret: process.env.MUX_TOKEN_SECRET,
  });
}

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ALLOWED_PROVIDERS = ['youtube', 'mux'];

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
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

    // Explicitly reject updating protected fields
    if (rawBody.id !== undefined || rawBody.created_at !== undefined || rawBody.updated_at !== undefined) {
      return NextResponse.json({ error: "Invalid lesson data" }, { status: 400 });
    }

    const { title, description, module_id, order_index, duration, video_provider, video_id, video_asset_id, is_free_preview } = rawBody;

    // We do not allow changing module_id in the UpdateLessonInput based on types (Omit<CreateLessonInput, "module_id">),
    // but if we did, we would need to IDOR check the new module.
    if (module_id !== undefined) {
       return NextResponse.json({ error: "Invalid lesson data" }, { status: 400 });
    }

    const updatePayload: UpdateLessonInput = {};

    if (title !== undefined) {
      if (typeof title !== "string") {
        return NextResponse.json({ error: "Invalid lesson data" }, { status: 400 });
      }
      const trimmedTitle = title.trim();
      if (trimmedTitle.length === 0) {
        return NextResponse.json({ error: "Invalid lesson data" }, { status: 400 });
      }
      updatePayload.title = trimmedTitle;
    }

    if (description !== undefined) {
      if (typeof description !== "string") {
        return NextResponse.json({ error: "Invalid lesson data" }, { status: 400 });
      }
      updatePayload.description = description;
    }

    if (order_index !== undefined) {
      if (typeof order_index !== "number" || !Number.isInteger(order_index) || order_index < 0) {
        return NextResponse.json({ error: "Invalid lesson data" }, { status: 400 });
      }
      updatePayload.order_index = order_index;
    }

    if (duration !== undefined) {
      if (typeof duration !== "number" || !Number.isInteger(duration) || duration < 0) {
        return NextResponse.json({ error: "Invalid lesson data" }, { status: 400 });
      }
      updatePayload.duration = duration;
    }

    if (video_provider !== undefined) {
      if (typeof video_provider !== "string" || !ALLOWED_PROVIDERS.includes(video_provider)) {
        return NextResponse.json({ error: "Invalid lesson data" }, { status: 400 });
      }
      updatePayload.video_provider = video_provider;
    }

    if (video_id !== undefined) {
      if (typeof video_id !== "string") {
        return NextResponse.json({ error: "Invalid lesson data" }, { status: 400 });
      }
      updatePayload.video_id = video_id;
    }

    if (video_asset_id !== undefined) {
      if (video_asset_id !== null && typeof video_asset_id !== "string") {
        return NextResponse.json({ error: "Invalid lesson data" }, { status: 400 });
      }
      // @ts-ignore - video_asset_id is added in types but might need cast if types aren't fully rebuilt
      updatePayload.video_asset_id = video_asset_id;
    }

    if (is_free_preview !== undefined) {
      if (typeof is_free_preview !== "boolean") {
        return NextResponse.json({ error: "Invalid lesson data" }, { status: 400 });
      }
      updatePayload.is_free_preview = is_free_preview;
    }

    if (Object.keys(updatePayload).length === 0) {
      return NextResponse.json({ error: "Invalid lesson data" }, { status: 400 });
    }

    const { data: existingLesson, error: verifyError } = await supabaseAdmin
      .from("lessons")
      .select("id, video_provider, video_id, video_asset_id")
      .eq("id", id)
      .single();
      
    if (verifyError || !existingLesson) {
      return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
    }

    const { data, error } = await supabaseAdmin
      .from("lessons")
      .update(updatePayload)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: "Lesson order already in use" }, { status: 409 });
      }
      console.error("[Lessons API] Database error updating lesson:", error);
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }

    let warning: string | undefined;

    if (
      existingLesson.video_provider === "mux" &&
      (updatePayload.video_provider !== undefined || ("video_asset_id" in updatePayload))
    ) {
      const providerChanged = updatePayload.video_provider !== undefined && updatePayload.video_provider !== "mux";
      const assetChanged = ("video_asset_id" in updatePayload) && (updatePayload as any).video_asset_id !== existingLesson.video_asset_id;
      
      if (providerChanged || assetChanged) {
        if (!existingLesson.video_asset_id) {
           warning = "Old Mux asset could not be deleted because video_asset_id was null. Asset was left untouched.";
        } else if (muxClient) {
           try {
             await muxClient.video.assets.delete(existingLesson.video_asset_id);
           } catch (muxErr) {
             console.error("Failed to delete old Mux asset:", muxErr);
             warning = "Old Mux asset deletion failed.";
           }
        }
      }
    }

    return NextResponse.json({ ...data, warning });
  } catch (error: any) {
    console.error("[Lessons API] Unexpected error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
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

    const { data: existingLesson, error: verifyError } = await supabaseAdmin
      .from("lessons")
      .select("id, video_provider, video_id, video_asset_id")
      .eq("id", id)
      .single();
      
    if (verifyError || !existingLesson) {
      return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
    }

    const { error } = await supabaseAdmin
      .from("lessons")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("[Lessons API] Database error deleting lesson:", error);
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }

    let warning: string | undefined;
    if (existingLesson.video_provider === "mux") {
      if (!existingLesson.video_asset_id) {
        warning = "Mux asset could not be deleted because video_asset_id was null. Asset was left untouched.";
      } else if (muxClient) {
        try {
          await muxClient.video.assets.delete(existingLesson.video_asset_id);
        } catch (muxErr) {
          console.error("Failed to delete Mux asset:", muxErr);
          warning = "Mux asset deletion failed.";
        }
      }
    }

    return NextResponse.json({ success: true, warning });
  } catch (error: any) {
    console.error("[Lessons API] Unexpected error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
