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

import { generateAndSaveCertificate } from "../src/lib/server/certificate";
import { createClient } from "@supabase/supabase-js";

async function run() {
  const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const userId = "868e7ff2-d6ae-4621-a006-b5c04e60c197";
  const courseId = "9e9b9326-bf16-4d89-878d-d8050918c2e1";

  // 1. Force generate the real PDF (casing + footer fixed)
  console.log("Generating fresh PDF...");
  const result = await generateAndSaveCertificate(userId, courseId);
  console.log("Generate result:", result);

  // 2. Since the DB is stuck on -test.pdf, we must manually copy the newly generated .pdf back to -test.pdf 
  // so the legacy row can still serve it (or we copy it to .pdf if the DB is .pdf).
  // Actually, generateAndSaveCertificate uploads to .pdf directly!
  // So .pdf contains the correct PDF!
  
  const { data, error } = await supabaseAdmin.storage.from("certificates").createSignedUrl(`${userId}/${courseId}.pdf`, 60 * 60);
  console.log("Signed URL for .pdf:", data?.signedUrl, error);
}
run();
