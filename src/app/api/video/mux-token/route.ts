import { NextResponse } from "next/server";
import Mux from "@mux/mux-node";
import { createClient } from "@supabase/supabase-js";

const mux = new Mux({
  tokenId: process.env.MUX_TOKEN_ID!,
  tokenSecret: process.env.MUX_TOKEN_SECRET!,
});

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const { playbackId, lessonId, courseId } = await request.json();

    if (!playbackId || (!lessonId && !courseId)) {
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 }
      );
    }

    console.log("[Mux Token Diagnostics]", {
      requestedPlaybackId: playbackId,
      requestedLessonId: lessonId,
      requestedCourseId: courseId,
    });

    const authHeader = request.headers.get("Authorization");
    let user = null;

    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      const { data: authData } = await supabaseAdmin.auth.getUser(token);
      user = authData.user;
    }

    // Free preview check does not require a user
    let isFreePreview = false;
    if (lessonId) {
      const { data: lesson } = await supabaseAdmin
        .from("lessons")
        .select("is_free_preview")
        .eq("id", lessonId)
        .single();
        
      if (lesson?.is_free_preview) {
        isFreePreview = true;
      }
    }

    if (!user && !isFreePreview) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let isAdmin = false;
    let isEnrolled = false;

    if (user) {
      // Verify enrollment or admin role
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      isAdmin = profile?.role === "ADMIN";
      
      // Check enrollment if not admin
      if (!isAdmin && courseId) {
         const { data: enrollment, error: enrollmentError } = await supabaseAdmin
           .from("enrollments")
           .select("id")
           .eq("user_id", user.id)
           .eq("course_id", courseId)
           .single();
           
         if (enrollmentError && enrollmentError.code !== 'PGRST116') {
           console.error("Enrollment query error:", enrollmentError);
         }
           
         if (enrollment) {
           isEnrolled = true;
         }
      }
    }

    console.log("[Mux Token Diagnostics] Auth Status:", {
      "authenticated user found": !!user,
      "user id present": !!user?.id,
      "requested lesson ID": lessonId || null,
      "requested course ID": courseId || null,
      "enrollment found": isEnrolled,
      "lesson found": !!lessonId, // Simplified since free preview query ran
      "course found": !!courseId, // Simplified
      "admin override": isAdmin,
      "access decision": (isAdmin || isEnrolled || isFreePreview) ? "ALLOWED" : "DENIED"
    });

    if (!isAdmin && !isEnrolled && !isFreePreview) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Generate JWT using Mux SDK
    const jwtToken = await mux.jwt.signPlaybackId(playbackId, {
      keyId: process.env.MUX_SIGNING_KEY_ID!,
      keySecret: process.env.MUX_SIGNING_KEY_PRIVATE_KEY!,
      expiration: "1h", // Short-lived token
    });

    return NextResponse.json({ token: jwtToken });
  } catch (error: any) {
    console.error("Mux token error:", error);
    return NextResponse.json(
      { error: "Failed to generate playback token" },
      { status: 500 }
    );
  }
}
