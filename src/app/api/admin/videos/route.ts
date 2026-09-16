import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: Request) {
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

    // 2. Fetch existing Mux videos from lessons
    // We select the module and course title if available, otherwise just use basic data.
    const { data, error } = await supabaseAdmin
      .from("lessons")
      .select(`
        id, 
        title, 
        video_id, 
        video_asset_id, 
        duration,
        module:modules (
          title,
          course:courses (title)
        )
      `)
      .eq("video_provider", "mux")
      .not("video_id", "is", null)
      .not("video_id", "eq", "");

    if (error) {
      console.error("[Videos API] Database error fetching videos:", error);
      return NextResponse.json({ error: "Failed to fetch videos" }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json([]);
    }

    // 3. Deduplicate by video_id
    const uniqueVideos = [];
    const seen = new Set();

    for (const lesson of data) {
      if (!seen.has(lesson.video_id)) {
        seen.add(lesson.video_id);
        
        // Safely extract module and course titles
        let moduleTitle = "Unknown";
        let courseTitle = "Unknown";
        
        if (lesson.module && typeof lesson.module === "object") {
          const mod = Array.isArray(lesson.module) ? lesson.module[0] : lesson.module;
          if (mod) {
            moduleTitle = mod.title || "Unknown";
            if (mod.course && typeof mod.course === "object") {
              const crs = Array.isArray(mod.course) ? mod.course[0] : mod.course;
              if (crs) {
                courseTitle = crs.title || "Unknown";
              }
            }
          }
        }

        uniqueVideos.push({
          lesson_title: lesson.title,
          video_id: lesson.video_id,
          video_asset_id: lesson.video_asset_id,
          duration: lesson.duration || 0,
          module_title: moduleTitle,
          course_title: courseTitle,
        });
      }
    }

    return NextResponse.json(uniqueVideos);

  } catch (error: any) {
    console.error("[Videos API] Unexpected error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
