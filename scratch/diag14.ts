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
  const fileBytes = fs.readFileSync("scratch/test_certificate.pdf");
  const uploadPath = "868e7ff2-d6ae-4621-a006-b5c04e60c197/9e9b9326-bf16-4d89-878d-d8050918c2e1-test.pdf";
  const { data, error } = await supabaseAdmin.storage.from("certificates").upload(uploadPath, fileBytes, { upsert: true, contentType: "application/pdf" });
  console.log("Upload result:", data, error);
}
main();
