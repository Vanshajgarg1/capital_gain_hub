import fs from "fs";
import { PDFDocument, StandardFonts, rgb, degrees } from "pdf-lib";

export async function generateTestCertFull() {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([1000, 700]);
  
  const fontRegular = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const fontBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
  const fontItalic = await pdfDoc.embedFont(StandardFonts.TimesRomanBoldItalic);

  const studentName = "Vanshaj Garg";
  const courseTitle = "Advanced Options Trading";
  const issuedDate = "September 2, 2026";
  const certNumber = "CGH-RWVR3IEG";

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
  fs.writeFileSync("scratch/test_cert_cinematic.pdf", pdfBytes);
  console.log("Written to scratch/test_cert_cinematic.pdf");
}
generateTestCertFull();
