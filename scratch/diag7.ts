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
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAdmin = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const supabaseAnon = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

async function main() {
  console.log("[certificate-debug] Starting diagnostic...");
  
  // 1. Get a test user & course from enrollments
  const { data: enrolls } = await supabaseAdmin.from("enrollments").select("user_id, course_id, courses(id, title)").limit(1);
  if (!enrolls || enrolls.length === 0) return console.log("No enrollments found");
  
  const userId = enrolls[0].user_id;
  const courseId = enrolls[0].course_id;
  const courseTitle = (enrolls[0].courses as any)?.title || "Test Course";
  console.log(`[certificate-debug] Test User: ${userId}, Course: ${courseId}`);

  // 2. Query lessons using supabaseAnon
  const { data: requiredLessons, error: totalError } = await supabaseAnon
    .from("lessons")
    .select("id, module:modules!inner(course_id)")
    .eq("modules.course_id", courseId);
    
  if (totalError) {
    console.error("[certificate-debug] Failed to get lessons:", totalError);
    return;
  }
  
  console.log(`[certificate-debug] Found ${requiredLessons?.length} lessons`);
  const requiredLessonIds = requiredLessons!.map(l => l.id);
  
  // 3. Force 100% completion
  for (const id of requiredLessonIds) {
     await supabaseAdmin.from("lesson_progress").upsert({
        user_id: userId,
        lesson_id: id,
        is_completed: true,
        last_watched_position: 100
     });
  }
  
  // 4. Query lesson_progress using supabaseAdmin
  const { count: completedCount, error: countError } = await supabaseAdmin
    .from("lesson_progress")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("is_completed", true)
    .in("lesson_id", requiredLessonIds);

  console.log(`[certificate-debug] Completed count: ${completedCount}`);
  
  if (completedCount === requiredLessonIds.length && requiredLessonIds.length > 0) {
     console.log("[certificate-debug] Eligibility confirmed! Generating PDF...");
     
     // 5. Generate PDF
     const certNumber = `CGH-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
     const pdfDoc = await PDFDocument.create();
     const page = pdfDoc.addPage([1000, 700]);
     const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
     page.drawText(`Certificate ${certNumber}`, { x: 50, y: 350, size: 24, font: helvetica });
     const pdfBytes = await pdfDoc.save();
     
     console.log(`[certificate-debug] PDF generated, ${pdfBytes.length} bytes`);
     
     // 6. Upload PDF
     const fileName = `${userId}/${courseId}-test.pdf`;
     const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
       .from("certificates")
       .upload(fileName, pdfBytes, { contentType: "application/pdf", upsert: true });
       
     if (uploadError) {
       console.error("[certificate-debug] Upload failed:", uploadError);
       return;
     }
     
     console.log("[certificate-debug] Upload successful:", uploadData.path);
     
     // 7. Insert Certificate
     const { data: certData, error: certError } = await supabaseAdmin
       .from("certificates")
       .insert({
         user_id: userId,
         course_id: courseId,
         certificate_number: certNumber,
         certificate_url: uploadData.path,
       })
       .select("*")
       .single();
       
     if (certError) {
       console.error("[certificate-debug] Insert failed:", certError);
       return;
     }
     
     console.log("[certificate-debug] Certificate record inserted:", certData);
  }
}
main();
