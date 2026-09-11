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

import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

async function main() {
  console.log("[certificate-debug] Verifying actual PDF generation...");
  
  const studentName = "VANSHaj GARG";
  const courseTitle = "TRADING FOUNDATIONS";
  
  // 5. GENERATE PDF
  const certNumber = `CGH-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
  const issuedDate = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([1000, 700]);
  
  // Embed fonts
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // Background (clean white/light for printability)
  page.drawRectangle({
    x: 0,
    y: 0,
    width: 1000,
    height: 700,
    color: rgb(0.98, 0.98, 0.99), // Very light off-white
  });

  // Dark premium border
  page.drawRectangle({
    x: 30,
    y: 30,
    width: 940,
    height: 640,
    borderColor: rgb(0.05, 0.07, 0.1), // Very dark blue/black
    borderWidth: 6,
  });
  
  // Subtle accent border
  page.drawRectangle({
    x: 40,
    y: 40,
    width: 920,
    height: 620,
    borderColor: rgb(0.06, 0.72, 0.5), // #10b981 primary accent
    borderWidth: 1,
  });

  // Content Helper
  const drawCenterText = (text: string, y: number, size: number, font: any, color: any) => {
    const textWidth = font.widthOfTextAtSize(text, size);
    page.drawText(text, {
      x: (1000 - textWidth) / 2,
      y: 700 - y, // Invert Y as pdf-lib y=0 is bottom
      size,
      font,
      color,
    });
  };

  // Typography & Content Hierarchy
  drawCenterText("CAPITAL GAIN HUB", 120, 20, helveticaBold, rgb(0.06, 0.72, 0.5));
  drawCenterText("TRADING ACADEMY", 145, 12, helveticaBold, rgb(0.4, 0.4, 0.4));
  
  drawCenterText("CERTIFICATE OF COMPLETION", 210, 42, helveticaBold, rgb(0.05, 0.07, 0.1));
  
  drawCenterText("This certificate is proudly presented to", 280, 16, helvetica, rgb(0.4, 0.4, 0.4));
  drawCenterText(studentName, 350, 48, helveticaBold, rgb(0.05, 0.07, 0.1));
  
  drawCenterText("For successfully completing", 430, 16, helvetica, rgb(0.4, 0.4, 0.4));
  drawCenterText(courseTitle, 490, 28, helveticaBold, rgb(0.05, 0.07, 0.1));
  
  drawCenterText("has successfully completed 100% of the required lessons in this course.", 550, 14, helvetica, rgb(0.4, 0.4, 0.4));

  // Divider Line
  page.drawLine({
    start: { x: 300, y: 700 - 590 },
    end: { x: 700, y: 700 - 590 },
    thickness: 1,
    color: rgb(0.8, 0.8, 0.8),
  });

  // Footers
  page.drawText(`Completion Date: ${issuedDate}`, {
    x: 350 - helvetica.widthOfTextAtSize(`Completion Date: ${issuedDate}`, 12) / 2,
    y: 700 - 630,
    size: 12,
    font: helvetica,
    color: rgb(0.4, 0.4, 0.4),
  });

  page.drawText(`Certificate No: ${certNumber}`, {
    x: 650 - helvetica.widthOfTextAtSize(`Certificate No: ${certNumber}`, 12) / 2,
    y: 700 - 630,
    size: 12,
    font: helvetica,
    color: rgb(0.4, 0.4, 0.4),
  });
  
  drawCenterText("Capital Gain Hub", 660, 14, helveticaBold, rgb(0.6, 0.6, 0.6));

  const pdfBytes = await pdfDoc.save();
  
  fs.writeFileSync("scratch/test_certificate.pdf", pdfBytes);
  console.log(`[certificate-debug] PDF generated to scratch/test_certificate.pdf. Size: ${pdfBytes.length} bytes`);
}

main();
