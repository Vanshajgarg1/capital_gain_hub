import fs from "fs";
import path from "path";
const envPath = path.resolve(process.cwd(), ".env.local");
const envVars = fs.readFileSync(envPath, "utf-8").split("\n");
for (const line of envVars) {
  if (line && !line.startsWith("#")) {
    const [key, ...rest] = line.split("=");
    if (key) {
      process.env[key.trim()] = rest.join("=").replace(/['"]/g, "").trim();
    }
  }
}

import { createClient } from "@supabase/supabase-js";
import { generateAndSaveCertificate } from "../src/lib/server/certificate";

const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function main() {
  console.log("[certificate-debug] Starting diagnostic...");
  
  // Find a user with progress
  const { data: progressList } = await supabaseAdmin
    .from("lesson_progress")
    .select("user_id, lesson_id, is_completed")
    .eq("is_completed", true)
    .limit(10);
    
  if (!progressList || progressList.length === 0) {
    console.log("[certificate-debug] No users with completed lessons found.");
    return;
  }
  
  const userId = progressList[0].user_id;
  const lessonId = progressList[0].lesson_id;
  
  // Find course for this lesson
  const { data: lessonData } = await supabaseAdmin
    .from("lessons")
    .select("modules!inner(course_id)")
    .eq("id", lessonId)
    .single();
    
  const courseId = (lessonData?.modules as any)?.course_id;
  
  console.log(`[certificate-debug] Testing user ${userId} and course ${courseId}`);
  
  // Enroll them if not enrolled just for testing, or assume they are enrolled
  const { data: enroll } = await supabaseAdmin.from("enrollments").select("*").eq("user_id", userId).eq("course_id", courseId).single();
  if (!enroll) {
     console.log("[certificate-debug] User not enrolled, enrolling for test...");
     await supabaseAdmin.from("enrollments").insert({ user_id: userId, course_id: courseId });
  }

  // Force 100% completion
  const { data: allLessons } = await supabaseAdmin.from("lessons").select("id, modules!inner(course_id)").eq("modules.course_id", courseId);
  console.log(`[certificate-debug] Total course lessons: ${allLessons?.length}`);
  
  for (const l of allLessons || []) {
     await supabaseAdmin.from("lesson_progress").upsert({
        user_id: userId,
        lesson_id: l.id,
        is_completed: true,
        last_watched_position: 100
     });
  }
  
  console.log("[certificate-debug] Forced 100% completion. Running generator...");
  
  try {
     const result = await generateAndSaveCertificate(userId, courseId);
     console.log("[certificate-debug] Result:", result);
  } catch (err) {
     console.error("[certificate-debug] Fatal Error:", err);
  }
}

main();
