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

  console.log("Generating fresh premium PDF...");
  const result = await generateAndSaveCertificate(userId, courseId);
  console.log("Generate result:", result.status, result.error);

  const prodPath = `${userId}/${courseId}.pdf`;
  const testPath = `${userId}/${courseId}-test.pdf`;
  
  const { data: fileData } = await supabaseAdmin.storage.from("certificates").download(prodPath);
  if (!fileData) throw new Error("Could not download");

  await supabaseAdmin.storage.from("certificates").upload(testPath, fileData, { upsert: true, contentType: "application/pdf" });
  console.log("Successfully deployed premium certificate design!");
}
run();
