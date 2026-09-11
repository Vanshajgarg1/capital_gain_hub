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

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAdmin = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function main() {
  console.log("[certificate-debug] Starting PDF verify...");
  
  const userId = "868e7ff2-d6ae-4621-a006-b5c04e60c197";
  const courseId = "9e9b9326-bf16-4d89-878d-d8050918c2e1";

  // 1. Delete existing certificate so it generates a fresh one
  console.log("[certificate-debug] Deleting old cached certificate row...");
  await supabaseAdmin.from("certificates").delete().eq("user_id", userId).eq("course_id", courseId);

  // 2. Also try to delete from storage just in case (optional, it overwrites anyway due to upsert: true)
  const oldFileName = `${userId}/${courseId}.pdf`;
  await supabaseAdmin.storage.from("certificates").remove([oldFileName]);
  await supabaseAdmin.storage.from("certificates").remove([`${userId}/${courseId}-test.pdf`]);

  // 3. Generate new certificate
  console.log("[certificate-debug] Running production generator...");
  try {
     const result = await generateAndSaveCertificate(userId, courseId);
     console.log("[certificate-debug] Result:", result);
     
     if (result.success && result.certificate) {
       console.log(`[certificate-debug] SUCCESS! New certificate generated at ${result.certificate.certificate_url}`);
     }
  } catch (err) {
     console.error("[certificate-debug] Fatal Error:", err);
  }
}

main();
