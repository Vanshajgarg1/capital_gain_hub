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

async function forceRegen() {
  console.log("Forcing regen of certificate...");
  // Use the known user and course ID
  const result = await generateAndSaveCertificate("868e7ff2-d6ae-4621-a006-b5c04e60c197", "9e9b9326-bf16-4d89-878d-d8050918c2e1");
  console.log("Result:", result);
}
forceRegen();
