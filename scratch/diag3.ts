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
  
  // Find an actual enrollment
  const { data: enrollments } = await supabaseAdmin.from("enrollments").select("user_id, course_id").limit(1);
  if (!enrollments || enrollments.length === 0) {
    console.log("[certificate-debug] No enrollments found.");
    return;
  }
  
  const { user_id: userId, course_id: courseId } = enrollments[0];
  console.log(`[certificate-debug] Testing user ${userId} and course ${courseId}`);
  
  // Force 100% completion
  const { data: allLessons } = await supabaseAdmin.from("lessons").select("id, module:modules!inner(course_id)").eq("modules.course_id", courseId);
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
