import { createClient } from "@supabase/supabase-js";
import { generateAndSaveCertificate } from "../src/lib/server/certificate";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function main() {
  // Get any user with progress
  const { data: progress } = await supabase.from("lesson_progress").select("user_id, lessons(module_id)").limit(1);
  if (!progress?.length) return console.log("No progress found");
  
  const userId = progress[0].user_id;
  const moduleId = (progress[0].lessons as any).module_id;
  
  const { data: mod } = await supabase.from("modules").select("course_id").eq("id", moduleId).single();
  const courseId = mod?.course_id;

  console.log(`Testing with user ${userId} and course ${courseId}`);
  const result = await generateAndSaveCertificate(userId, courseId);
  console.log("Result:", result);
}

main();
