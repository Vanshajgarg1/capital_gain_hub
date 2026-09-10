import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { generateAndSaveCertificate } from "@/lib/server/certificate";
import fs from "fs";
import path from "path";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  // Temporary workaround to copy the generated background image
  try {
    const targetDir = path.join(process.cwd(), 'public', 'images');
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    const targetFile = path.join(targetDir, 'certificate-card-bg.jpg');
    if (!fs.existsSync(targetFile)) {
      fs.copyFileSync('/Users/vanshajgarg/.gemini/antigravity-ide/brain/2f7a05cf-f53d-4d2a-aa4e-308fa5333eb4/cinematic_certificate_bg_1788330656567.jpg', targetFile);
    }
  } catch (e) {
    console.error("Failed to copy image:", e);
  }
  try {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }
    const token = authHeader.split(" ")[1];

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey);
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // AUTO-GENERATE RETROACTIVE CERTIFICATES
    // 1. Fetch all enrollments for the user
    const { data: enrollments } = await supabaseAdmin
      .from("enrollments")
      .select("course_id")
      .eq("user_id", user.id);

    if (enrollments && enrollments.length > 0) {
      // 2. For each enrollment, attempt generation
      // generateAndSaveCertificate handles checking if they are 100% complete and if cert already exists
      await Promise.all(
        enrollments.map(async (enr) => {
          const result = await generateAndSaveCertificate(user.id, enr.course_id);
          if (result.error) {
            console.error(`Retroactive generation for course ${enr.course_id} stopped:`, result.error);
          }
        })
      );
    }

    // 3. Fetch all certificates to return
    const { data: certificates, error } = await supabaseAdmin
      .from("certificates")
      .select(`
        *,
        course:courses(id, title)
      `)
      .eq("user_id", user.id)
      .order("issued_at", { ascending: false });

    if (error) {
      console.error("Error fetching certificates:", error);
      return NextResponse.json({ error: "FAILED_TO_FETCH_CERTIFICATES" }, { status: 500 });
    }

    // For each certificate, generate a signed URL to access the PDF in the private bucket
    const certificatesWithUrls = await Promise.all(
      (certificates || []).map(async (cert) => {
        // Reconcile legacy test paths to production paths
        if (cert.certificate_url.endsWith("-test.pdf")) {
          const newUrl = cert.certificate_url.replace("-test.pdf", ".pdf");
          
          // 1. Copy object in storage to the production path
          const { error: copyError } = await supabaseAdmin.storage
            .from("certificates")
            .copy(cert.certificate_url, newUrl);
            
          // 2. Update database record to point to production path
          if (!copyError || copyError.message.includes("already exists") || copyError.message.includes("Duplicate")) {
            await supabaseAdmin.from("certificates")
              .update({ certificate_url: newUrl })
              .eq("id", cert.id);
            cert.certificate_url = newUrl;
          }
        }

        const { data: signedData, error: signError } = await supabaseAdmin.storage
          .from("certificates")
          .createSignedUrl(cert.certificate_url, 60 * 60 * 24); // 24 hours expiry

        return {
          ...cert,
          course_title: (cert.course?.title || "Unknown Course").replace(/\s*for\s+student$/i, ""),
          download_url: signError ? null : signedData?.signedUrl,
        };
      })
    );

    return NextResponse.json({ certificates: certificatesWithUrls }, { status: 200 });
  } catch (err: any) {
    console.error("Certificates GET error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
