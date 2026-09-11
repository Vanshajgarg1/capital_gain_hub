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
  const { data: certs } = await supabaseAdmin.from("certificates").select("*").limit(1);
  if (!certs || certs.length === 0) return console.log("No certs");
  
  const cert = certs[0];
  console.log("Cert URL:", cert.certificate_url);
  
  const { data, error } = await supabaseAdmin.storage.from("certificates").createSignedUrl(cert.certificate_url, 60 * 60 * 24);
  console.log("Signed URL:", data);
  console.log("Error:", error);
}
main();
