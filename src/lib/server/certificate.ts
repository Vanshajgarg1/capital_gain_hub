import { createClient } from "@supabase/supabase-js";
import { PDFDocument, rgb, StandardFonts, degrees } from "pdf-lib";

export async function generateAndSaveCertificate(userId: string, courseId: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
  const supabaseAnon = createClient(supabaseUrl, anonKey);

  try {
    // 1. VERIFY ENROLLMENT & COURSE (Admin client succeeds here based on tests)
    const { data: enrollment, error: enrollError } = await supabaseAdmin
      .from("enrollments")
      .select("id, courses(id, title)")
      .eq("user_id", userId)
      .eq("course_id", courseId)
      .single();

    if (enrollError || !enrollment) {
      return { error: "NOT_ENROLLED", status: 403 };
    }

    const courseTitle = ((enrollment.courses as any).title || "Unknown Course")
      .replace(/\s*for\s+student$/i, "")
      .replace(/→/g, "->");

    // 2. INDEPENDENT PROGRESS VERIFICATION
    // Step 2a: Get all lessons for the course using anon client since service_role lacks SELECT on lessons table
    const { data: requiredLessons, error: totalError } = await supabaseAnon
      .from("lessons")
      .select("id, module:modules!inner(course_id)")
      .eq("modules.course_id", courseId);

    if (totalError || !requiredLessons || requiredLessons.length === 0) {
      return { error: "NO_LESSONS_FOUND", status: 400 };
    }

    const requiredLessonIds = requiredLessons.map(l => l.id);
    const totalLessons = requiredLessonIds.length;

    // Step 2b: Get exactly which lessons the user completed, extracting UNIQUE lesson IDs
    const { data: completedProgress, error: countError } = await supabaseAdmin
      .from("lesson_progress")
      .select("lesson_id")
      .eq("user_id", userId)
      .eq("is_completed", true)
      .in("lesson_id", requiredLessonIds);

    if (countError) {
      console.error("Progress check error:", countError);
      return { error: "PROGRESS_CHECK_FAILED", status: 500 };
    }

    const uniqueCompletedIds = new Set(completedProgress.map(p => p.lesson_id));
    const completedCount = uniqueCompletedIds.size;

    if (completedCount !== totalLessons) {
      return { error: "COURSE_NOT_COMPLETED", status: 403 };
    }

    // 3. CHECK EXISTING CERTIFICATE (IDEMPOTENT)
    const { data: existingCert } = await supabaseAdmin
      .from("certificates")
      .select("*")
      .eq("user_id", userId)
      .eq("course_id", courseId)
      .maybeSingle();

    if (existingCert) {
      // Check if the production PDF actually exists in Storage
      const { data: fileList } = await supabaseAdmin.storage
        .from("certificates")
        .list(userId, { search: `${courseId}.pdf` });

      const hasProdPdf = fileList && fileList.some(f => f.name === `${courseId}.pdf`);

      if (hasProdPdf) {
        return { success: true, certificate: existingCert, status: 200 };
      }
      
      // If the file is missing, we will fall through and regenerate the PDF,
      // but we will reuse the existing DB record's data.
    }

    // 4. GET USER PROFILE FOR NAME
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("full_name")
      .eq("id", userId)
      .single();

    const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(userId);

    const studentName = profile?.full_name || authUser?.user?.email?.split("@")[0] || "Student";

    // 5. GENERATE PDF
    const certNumber = existingCert 
      ? existingCert.certificate_number 
      : `CGH-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;

    let issuedDate = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
    if (existingCert && existingCert.issued_at) {
      issuedDate = new Date(existingCert.issued_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
    }

    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([1000, 700]);
    
    // Embed fonts
    const fontRegular = await pdfDoc.embedFont(StandardFonts.TimesRoman);
    const fontBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
    const fontItalic = await pdfDoc.embedFont(StandardFonts.TimesRomanBoldItalic);

    const cBase = rgb(0.02, 0.05, 0.04);
    const cWhite = rgb(0.95, 0.95, 0.95);
    const cGold = rgb(0.8, 0.7, 0.4);
    const cTeal = rgb(0.1, 0.8, 0.4);
    const cMuted = rgb(0.5, 0.6, 0.55);

    page.drawRectangle({ x: 0, y: 0, width: 1000, height: 700, color: cBase });

    for (let i = 0; i < 1000; i += 40) {
      page.drawLine({ start: { x: i, y: 0 }, end: { x: i, y: 700 }, thickness: 1, color: cTeal, opacity: 0.03 });
    }
    for (let i = 0; i < 700; i += 40) {
      page.drawLine({ start: { x: 0, y: i }, end: { x: 1000, y: i }, thickness: 1, color: cTeal, opacity: 0.03 });
    }

    const drawGlowLine = (x1: number, y1: number, x2: number, y2: number) => {
      const layers = [{ t: 15, o: 0.02 }, { t: 8, o: 0.05 }, { t: 3, o: 0.15 }, { t: 1, o: 0.8 }];
      for (const l of layers) {
        page.drawLine({ start: { x: x1, y: 700 - y1 }, end: { x: x2, y: 700 - y2 }, thickness: l.t, color: cTeal, opacity: l.o });
      }
    };
    drawGlowLine(0, 600, 250, 520);
    drawGlowLine(250, 520, 500, 480);
    drawGlowLine(500, 480, 750, 300);
    drawGlowLine(750, 300, 1000, 100);

    const drawPoly = (path: string, color: any, opacity: number) => page.drawSvgPath(path, { color, opacity });
    
    drawPoly("M750,220 L730,170 L760,200 Z", cWhite, 0.8);
    drawPoly("M770,240 L810,180 L790,230 Z", cWhite, 0.8);
    drawPoly("M750,220 L770,240 L760,280 L720,270 Z", rgb(0.1, 0.4, 0.3), 0.9);
    drawPoly("M720,270 L760,280 L740,310 Z", cGold, 0.8);
    drawPoly("M760,280 L800,260 L850,300 L790,380 L740,310 Z", rgb(0.05, 0.2, 0.15), 0.9);
    drawPoly("M850,300 L950,280 L960,350 L880,400 L790,380 Z", rgb(0.04, 0.15, 0.1), 0.9);
    drawPoly("M740,310 L790,380 L760,460 L730,480 L710,400 Z", rgb(0.05, 0.2, 0.15), 0.8);
    drawPoly("M880,400 L960,350 L940,460 L920,490 L850,440 Z", rgb(0.04, 0.15, 0.1), 0.8);
    drawPoly("M760,280 L800,260 L780,320 Z", cTeal, 0.3);
    drawPoly("M850,300 L880,350 L830,340 Z", cGold, 0.2);
    drawPoly("M950,280 L960,310 L920,300 Z", cWhite, 0.1);

    const ex = 500;
    const ey = 140;
    drawPoly(`M${ex-15},${700-(ey+35)} L${ex-25},${700-(ey+75)} L${ex},${700-(ey+55)} L${ex+25},${700-(ey+75)} L${ex+15},${700-(ey+35)} Z`, cTeal, 0.8);
    page.drawCircle({ x: ex, y: 700 - ey, size: 35, color: rgb(0.04, 0.15, 0.1) });
    page.drawCircle({ x: ex, y: 700 - ey, size: 33, color: cTeal, opacity: 0.5 });
    page.drawCircle({ x: ex, y: 700 - ey, size: 31, color: cBase });
    page.drawCircle({ x: ex, y: 700 - ey, size: 28, color: rgb(0.04, 0.15, 0.1) });
    
    drawPoly(`M${ex-10},${700-(ey+10)} L${ex-10},${700-(ey+2)} L${ex-4},${700-(ey+2)} L${ex-4},${700-(ey+10)} Z`, cWhite, 0.9);
    drawPoly(`M${ex-2},${700-(ey+5)} L${ex-2},${700-(ey+2)} L${ex+4},${700-(ey+2)} L${ex+4},${700-(ey+5)} Z`, cWhite, 0.9);
    drawPoly(`M${ex+6},${700-(ey+15)} L${ex+6},${700-(ey+2)} L${ex+12},${700-(ey+2)} L${ex+12},${700-(ey+15)} Z`, cWhite, 0.9);
    page.drawLine({ start: { x: ex - 12, y: 700 - (ey - 2) }, end: { x: ex + 14, y: 700 - (ey + 18) }, thickness: 2, color: cTeal });

    const drawCenter = (text: string, y: number, font: any, size: number, color: any) => {
      const w = font.widthOfTextAtSize(text, size);
      page.drawText(text, { x: 500 - w/2, y: 700 - y, font, size, color });
    };
    const drawTextAt = (text: string, x: number, y: number, font: any, size: number, color: any) => {
      const w = font.widthOfTextAtSize(text, size);
      page.drawText(text, { x: x - w/2, y: 700 - y, font, size, color });
    };

    const ty = 280;
    drawCenter(courseTitle, ty, fontBold, 42, cWhite);
    drawCenter("CERTIFICATE OF COMPLETION", ty + 40, fontRegular, 16, cMuted);
    drawCenter("This certificate is proudly presented to", ty + 100, fontItalic, 16, cMuted);
    drawCenter(studentName, ty + 160, fontBold, 48, cTeal);
    drawCenter("has successfully completed 100% of the required lessons in this course.", ty + 230, fontRegular, 14, cMuted);

    const lx = 300;
    const rx = 700;
    drawTextAt("COMPLETION DATE", lx, 600, fontBold, 10, cMuted);
    drawTextAt(issuedDate, lx, 620, fontRegular, 14, cWhite);
    drawTextAt("CERTIFICATE NO.", rx, 600, fontBold, 10, cMuted);
    drawTextAt(certNumber, rx, 620, fontRegular, 14, cWhite);

    drawCenter("CAPITAL GAIN HUB", 50, fontBold, 12, cTeal);
    drawCenter("TRADING ACADEMY", 70, fontRegular, 9, cMuted);

    const pdfBytes = await pdfDoc.save();

    // 6. UPLOAD TO STORAGE
    const fileName = `${userId}/${courseId}.pdf`;
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from("certificates")
      .upload(fileName, pdfBytes, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (uploadError) {
      console.error("Storage upload error:", uploadError);
      return { error: "FAILED_TO_GENERATE_FILE", status: 500 };
    }

    const filePath = uploadData.path;

    // 7. INSERT OR UPDATE DATABASE
    if (!existingCert) {
      const { data: certData, error: certError } = await supabaseAdmin
        .from("certificates")
        .insert({
          user_id: userId,
          course_id: courseId,
          certificate_number: certNumber,
          certificate_url: filePath,
        })
        .select("*")
        .single();

      if (certError) {
        // If concurrent request inserted a cert just now, we catch and return it.
        const { data: existingCertRace } = await supabaseAdmin
          .from("certificates")
          .select("*")
          .eq("user_id", userId)
          .eq("course_id", courseId)
          .maybeSingle();
        
        if (existingCertRace) {
          return { success: true, certificate: existingCertRace, status: 200 };
        }

        console.error("Certificate DB insert error:", certError);
        return { error: "FAILED_TO_SAVE_CERTIFICATE", status: 500 };
      }

      return { success: true, certificate: certData, status: 201 };
    } else {
      // We safely regenerated a missing PDF. Update the record if the URL was pointing to a test file.
      if (existingCert.certificate_url !== filePath) {
        const { data: updatedCert, error: updateError } = await supabaseAdmin
          .from("certificates")
          .update({ certificate_url: filePath })
          .eq("id", existingCert.id)
          .select("*")
          .single();
          
        if (updateError) {
          console.error("Certificate DB update error:", updateError);
          return { error: "FAILED_TO_UPDATE_CERTIFICATE", status: 500 };
        }
        return { success: true, certificate: updatedCert, status: 200 };
      }
      return { success: true, certificate: existingCert, status: 200 };
    }
  } catch (err: any) {
    console.error("Certificate generation util error:", err);
    return { error: "Internal Server Error", status: 500 };
  }
}
