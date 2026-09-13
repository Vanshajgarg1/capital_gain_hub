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

async function check() {
  const { data: certs } = await supabaseAdmin.from("certificates").select("*");
  const cert = certs![0];
  const newUrl = cert.certificate_url.replace("-test.pdf", ".pdf");
  const { error } = await supabaseAdmin.from("certificates").upsert({
    ...cert,
    certificate_url: newUrl
  }, { onConflict: "user_id, course_id" });
  console.log("Upsert Error:", error);
  const { data: newCerts } = await supabaseAdmin.from("certificates").select("*");
  console.log("New certs url:", newCerts![0].certificate_url);
}
check();
