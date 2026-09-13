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

async function testReconciliation() {
  const { data: certificates } = await supabaseAdmin.from("certificates").select("*");
  
  const certsWithUrls = await Promise.all(
    (certificates || []).map(async (cert) => {
      console.log("Before cert URL:", cert.certificate_url);
      
      // Mimic the exact logic in route.ts
      if (cert.certificate_url.endsWith("-test.pdf")) {
        const newUrl = cert.certificate_url.replace("-test.pdf", ".pdf");
        
        console.log(`Migrating ${cert.certificate_url} -> ${newUrl}`);
        
        const { error: copyError } = await supabaseAdmin.storage
          .from("certificates")
          .copy(cert.certificate_url, newUrl);
          
        console.log("Copy Error:", copyError);
        
        if (!copyError || copyError.message.includes("already exists") || copyError.message.includes("Duplicate")) {
          await supabaseAdmin.from("certificates")
            .update({ certificate_url: newUrl })
            .eq("id", cert.id);
          cert.certificate_url = newUrl;
        }
      }

      console.log("After cert URL:", cert.certificate_url);

      const { data: signedData, error: signError } = await supabaseAdmin.storage
        .from("certificates")
        .createSignedUrl(cert.certificate_url, 60 * 60 * 24);

      return {
        ...cert,
        download_url: signError ? null : signedData?.signedUrl,
      };
    })
  );
  
  console.log("Final Certs:", certsWithUrls.map(c => ({ url: c.certificate_url, download: !!c.download_url })));
}

testReconciliation();
