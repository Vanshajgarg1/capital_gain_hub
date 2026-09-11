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
const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function main() {
  const courseId = "9e9b9326-bf16-4d89-878d-d8050918c2e1"; // the one from previous test
  
  // Test 1: Query with alias
  const { data: d1, error: e1 } = await supabaseAdmin
      .from("lessons")
      .select("id, module:modules!inner(course_id)")
      .eq("modules.course_id", courseId);
  console.log("Test 1 Result:", e1 || `Rows: ${d1?.length}`);
  
  // Test 2: Query without alias
  const { data: d2, error: e2 } = await supabaseAdmin
      .from("lessons")
      .select("id, modules!inner(course_id)")
      .eq("modules.course_id", courseId);
  console.log("Test 2 Result:", e2 || `Rows: ${d2?.length}`);
}

main();
