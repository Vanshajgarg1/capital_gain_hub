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
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAdmin = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const supabaseAnon = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

async function main() {
  console.log("[certificate-debug] Starting diagnostic...");
  
  // 1. Find a valid user with 100% completion or make one
  const { data: users } = await supabaseAdmin.auth.admin.listUsers();
  if (!users || users.users.length === 0) return console.log("No users found");
  const userId = users.users[0].id;
  
  // 2. Find a course
  const { data: courses } = await supabaseAnon.from("courses").select("id, title").limit(1);
  if (!courses || courses.length === 0) return console.log("No courses found");
  const courseId = courses[0].id;
  
  console.log(`[certificate-debug] Test User: ${userId}, Course: ${courseId}`);

  // Test admin select on enrollments
  const { data: enrAdmin, error: err1 } = await supabaseAdmin.from("enrollments").select("*").limit(1);
  console.log("[certificate-debug] Admin enrollments query error:", err1?.message || "Success");

  // Test admin select on lessons
  const { data: lesAdmin, error: err2 } = await supabaseAdmin.from("lessons").select("*").limit(1);
  console.log("[certificate-debug] Admin lessons query error:", err2?.message || "Success");

  // Test admin select on lesson_progress
  const { data: lpAdmin, error: err3 } = await supabaseAdmin.from("lesson_progress").select("*").limit(1);
  console.log("[certificate-debug] Admin lesson_progress query error:", err3?.message || "Success");

  // Test admin select on modules
  const { data: modAdmin, error: err4 } = await supabaseAdmin.from("modules").select("*").limit(1);
  console.log("[certificate-debug] Admin modules query error:", err4?.message || "Success");
}
main();
