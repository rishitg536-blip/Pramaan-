import { PDFDocument, rgb, StandardFonts, degrees, PDFPage } from 'pdf-lib';
import { CaseMeta, StoredEvidenceFile } from '../storage/db';
import { CustodyEntry, SealSnapshot } from '../core/types';
import {
  SCHEDULE_TEXT_VERIFIED,
  PART_A_TITLE,
  PART_A_DECLARATIONS,
  PART_B_TITLE,
  PART_B_PLACEHOLDER,
} from './scheduleText';

const A4_WIDTH = 595.28;
const A4_HEIGHT = 841.89;
const MARGIN = 50;
const FOOTER_TEXT =
  'Draft prepared by Pramaan for review by a lawyer and an expert. Not legal advice. Not a court-accepted certificate.';

function drawDraftWatermark(page: PDFPage, font: any) {
  const text = 'DRAFT';
  const size = 68;
  page.drawText(text, {
    x: 180,
    y: 350,
    size,
    font,
    color: rgb(0.91, 0.91, 0.91),
    rotate: degrees(45),
  });
}

function drawFooter(page: PDFPage, font: any, pageNumber: number, totalPages: number) {
  page.drawText(FOOTER_TEXT, {
    x: MARGIN,
    y: 25,
    size: 7.5,
    font,
    color: rgb(0.45, 0.45, 0.45),
  });
  const pageStr = `Page ${pageNumber} of ${totalPages}`;
  page.drawText(pageStr, {
    x: A4_WIDTH - MARGIN - 50,
    y: 25,
    size: 7.5,
    font,
    color: rgb(0.45, 0.45, 0.45),
  });
}

export async function generateDraftCertificatePdf(params: {
  meta: CaseMeta;
  files: StoredEvidenceFile[];
  seal: SealSnapshot;
  custodyLog: CustodyEntry[];
}): Promise<Uint8Array> {
  const { meta, files, seal, custodyLog } = params;

  const pdfDoc = await PDFDocument.create();
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const courier = await pdfDoc.embedFont(StandardFonts.Courier);

  const totalPages = 5;

  // ================= PAGE 1: COVER =================
  const page1 = pdfDoc.addPage([A4_WIDTH, A4_HEIGHT]);
  drawDraftWatermark(page1, helveticaBold);

  let y = A4_HEIGHT - 80;

  if (!SCHEDULE_TEXT_VERIFIED) {
    page1.drawRectangle({
      x: MARGIN,
      y: y - 24,
      width: A4_WIDTH - MARGIN * 2,
      height: 28,
      color: rgb(1, 0.9, 0.92),
      borderColor: rgb(0.91, 0.27, 0.17),
      borderWidth: 1,
    });
    page1.drawText('SCHEDULE WORDING NOT YET VERIFIED (PLACEHOLDERS IN USE)', {
      x: MARGIN + 12,
      y: y - 15,
      size: 9,
      font: helveticaBold,
      color: rgb(0.91, 0.27, 0.17),
    });
    y -= 50;
  }

  page1.drawText('Draft Part A: Electronic Record Certificate', {
    x: MARGIN,
    y,
    size: 20,
    font: helveticaBold,
    color: rgb(0.06, 0.06, 0.06),
  });
  y -= 22;

  page1.drawText('(Section 63(4), Bharatiya Sakshya Adhiniyam, 2023)', {
    x: MARGIN,
    y,
    size: 13,
    font: helvetica,
    color: rgb(0.24, 0.43, 1),
  });
  y -= 45;

  // Case Overview Box
  page1.drawRectangle({
    x: MARGIN,
    y: y - 180,
    width: A4_WIDTH - MARGIN * 2,
    height: 180,
    color: rgb(0.97, 0.96, 0.94),
    borderColor: rgb(0.06, 0.06, 0.06),
    borderWidth: 1.5,
  });

  const boxX = MARGIN + 18;
  let boxY = y - 28;

  page1.drawText('Case Title:', { x: boxX, y: boxY, size: 10, font: helveticaBold });
  page1.drawText(meta.title || 'Untitled case', { x: boxX + 110, y: boxY, size: 10, font: helvetica });
  boxY -= 24;

  page1.drawText('Case ID:', { x: boxX, y: boxY, size: 10, font: helveticaBold });
  page1.drawText(meta.caseId, { x: boxX + 110, y: boxY, size: 10, font: courier });
  boxY -= 24;

  page1.drawText('Seal Snapshot:', { x: boxX, y: boxY, size: 10, font: helveticaBold });
  page1.drawText(`Seal #${seal.n} · Sealed at ${seal.sealedAt}`, { x: boxX + 110, y: boxY, size: 10, font: helvetica });
  boxY -= 24;

  page1.drawText('Files Sealed:', { x: boxX, y: boxY, size: 10, font: helveticaBold });
  page1.drawText(`${files.length} file(s)`, { x: boxX + 110, y: boxY, size: 10, font: helvetica });
  boxY -= 24;

  page1.drawText('Case Fingerprint:', { x: boxX, y: boxY, size: 10, font: helveticaBold });
  boxY -= 16;
  page1.drawText(seal.caseFingerprint, { x: boxX, y: boxY, size: 8.5, font: courier, color: rgb(0.91, 0.27, 0.17) });

  y -= 220;

  // Important Legal Notice
  page1.drawRectangle({
    x: MARGIN,
    y: y - 110,
    width: A4_WIDTH - MARGIN * 2,
    height: 110,
    color: rgb(1, 0.98, 0.85),
    borderColor: rgb(0.06, 0.06, 0.06),
    borderWidth: 1,
  });

  page1.drawText('MANDATORY LEGAL LIMITATION:', {
    x: MARGIN + 16,
    y: y - 22,
    size: 10,
    font: helveticaBold,
    color: rgb(0.06, 0.06, 0.06),
  });

  const disclaimerLines = [
    '1. Part B must be completed and signed by a qualified expert. Pramaan does not complete Part B.',
    '2. This document is a certificate-ready DRAFT generated for counsel and expert review.',
    '3. Hashing proves evidence files remain unchanged since sealed; it does not prove origin authenticity.',
    '4. Timestamps reflect device clock unless authenticated by a public time authority.',
  ];

  let discY = y - 42;
  for (const line of disclaimerLines) {
    page1.drawText(line, {
      x: MARGIN + 16,
      y: discY,
      size: 8.5,
      font: helvetica,
      color: rgb(0.2, 0.2, 0.2),
    });
    discY -= 16;
  }

  drawFooter(page1, helvetica, 1, totalPages);

  // ================= PAGE 2: PART A FIELDS =================
  const page2 = pdfDoc.addPage([A4_WIDTH, A4_HEIGHT]);
  drawDraftWatermark(page2, helveticaBold);

  y = A4_HEIGHT - 70;
  page2.drawText('Section 1: Deponent & Device Details (Part A)', {
    x: MARGIN,
    y,
    size: 16,
    font: helveticaBold,
  });
  y -= 16;
  page2.drawText(PART_A_TITLE, {
    x: MARGIN,
    y,
    size: 9,
    font: helvetica,
    color: rgb(0.4, 0.4, 0.4),
  });
  y -= 35;

  const device = meta.details.device;
  const deviceMakeModel = [
    device?.sourceType || 'Digital Device',
    device?.model || '',
    device?.colour ? `(${device.colour})` : '',
  ]
    .filter(Boolean)
    .join(' — ');

  const fields = [
    { label: 'Full Name:', val: meta.details.name || '[Not provided]' },
    { label: 'Son / Daughter / Spouse of:', val: meta.details.parentage || '[Not provided]' },
    { label: 'Address:', val: meta.details.address || '[Not provided]' },
    { label: 'Relationship to Device / Account:', val: meta.details.relationship || device?.ownershipRelationship || '[Not provided]' },
    { label: 'Source Device & Make/Model:', val: deviceMakeModel },
    { label: 'IMEI / UID / Serial Number:', val: [device?.identifier, device?.serialNumber ? `S/N: ${device.serialNumber}` : ''].filter(Boolean).join(' | ') || '[Not provided]' },
  ];

  for (const f of fields) {
    page2.drawRectangle({
      x: MARGIN,
      y: y - 24,
      width: A4_WIDTH - MARGIN * 2,
      height: 28,
      color: rgb(0.98, 0.98, 0.97),
      borderColor: rgb(0.8, 0.8, 0.8),
      borderWidth: 1,
    });
    page2.drawText(f.label, { x: MARGIN + 10, y: y - 13, size: 8.5, font: helveticaBold });
    page2.drawText(f.val.substring(0, 68), { x: MARGIN + 210, y: y - 13, size: 8.5, font: helvetica });
    y -= 34;
  }

  y -= 20;
  page2.drawText('Section 2: Statutory Declarations', {
    x: MARGIN,
    y,
    size: 14,
    font: helveticaBold,
  });
  y -= 25;

  for (const dec of PART_A_DECLARATIONS) {
    const isTicked = !!meta.declarations[dec.id];
    page2.drawRectangle({
      x: MARGIN,
      y: y - 16,
      width: 14,
      height: 14,
      borderColor: rgb(0.1, 0.1, 0.1),
      borderWidth: 1.5,
      color: isTicked ? rgb(0.8, 0.95, 0.85) : rgb(1, 1, 1),
    });

    if (isTicked) {
      page2.drawText('X', {
        x: MARGIN + 3,
        y: y - 13,
        size: 10,
        font: helveticaBold,
        color: rgb(0.1, 0.6, 0.2),
      });
    }

    // Wrap declaration text
    page2.drawText(dec.text.substring(0, 95), {
      x: MARGIN + 24,
      y: y - 12,
      size: 8.5,
      font: helvetica,
    });
    if (dec.text.length > 95) {
      page2.drawText(dec.text.substring(95, 190), {
        x: MARGIN + 24,
        y: y - 24,
        size: 8.5,
        font: helvetica,
      });
      y -= 14;
    }
    y -= 26;
  }

  y -= 20;
  const ackTime = meta.declarationsAckAt || new Date().toISOString();
  page2.drawText(`Declarations acknowledged by the user on this device at: ${ackTime}`, {
    x: MARGIN,
    y,
    size: 8.5,
    font: helvetica,
    color: rgb(0.3, 0.3, 0.3),
  });

  y -= 60;
  page2.drawText('Signature of the Deponent / Person in Lawful Control:', {
    x: MARGIN,
    y,
    size: 10,
    font: helveticaBold,
  });
  y -= 35;
  page2.drawLine({
    start: { x: MARGIN, y },
    end: { x: MARGIN + 240, y },
    thickness: 1,
    color: rgb(0.2, 0.2, 0.2),
  });
  page2.drawText('(Sign above prior to court submission)', {
    x: MARGIN,
    y: y - 14,
    size: 8,
    font: helvetica,
    color: rgb(0.5, 0.5, 0.5),
  });

  drawFooter(page2, helvetica, 2, totalPages);

  // ================= PAGE 3: HASH REPORT =================
  const page3 = pdfDoc.addPage([A4_WIDTH, A4_HEIGHT]);
  drawDraftWatermark(page3, helveticaBold);

  y = A4_HEIGHT - 70;
  page3.drawText('Evidence Hash Report (SHA-256)', {
    x: MARGIN,
    y,
    size: 16,
    font: helveticaBold,
  });
  y -= 18;
  page3.drawText('Every evidence file fingerprinted at byte level and anchored in Merkle tree', {
    x: MARGIN,
    y,
    size: 9,
    font: helvetica,
    color: rgb(0.4, 0.4, 0.4),
  });
  y -= 30;

  // Files table header
  page3.drawRectangle({
    x: MARGIN,
    y: y - 20,
    width: A4_WIDTH - MARGIN * 2,
    height: 24,
    color: rgb(0.12, 0.23, 0.62),
  });
  page3.drawText('#', { x: MARGIN + 8, y: y - 14, size: 9, font: helveticaBold, color: rgb(1, 1, 1) });
  page3.drawText('File Name', { x: MARGIN + 28, y: y - 14, size: 9, font: helveticaBold, color: rgb(1, 1, 1) });
  page3.drawText('Size', { x: MARGIN + 180, y: y - 14, size: 9, font: helveticaBold, color: rgb(1, 1, 1) });
  page3.drawText('SHA-256 Hash', { x: MARGIN + 240, y: y - 14, size: 9, font: helveticaBold, color: rgb(1, 1, 1) });
  y -= 26;

  for (let i = 0; i < files.length; i++) {
    const f = files[i];
    const rowHeight = 36;
    page3.drawRectangle({
      x: MARGIN,
      y: y - rowHeight,
      width: A4_WIDTH - MARGIN * 2,
      height: rowHeight,
      color: i % 2 === 0 ? rgb(0.98, 0.98, 0.97) : rgb(1, 1, 1),
      borderColor: rgb(0.85, 0.85, 0.85),
      borderWidth: 0.5,
    });

    page3.drawText(String(i + 1), { x: MARGIN + 8, y: y - 16, size: 8.5, font: helvetica });
    page3.drawText(f.name.substring(0, 24), { x: MARGIN + 28, y: y - 16, size: 8.5, font: helveticaBold });
    page3.drawText(`${f.size} B`, { x: MARGIN + 180, y: y - 16, size: 8, font: helvetica });

    // 64 hex wrapped in two lines (32 chars each)
    const line1 = f.sha256.substring(0, 32);
    const line2 = f.sha256.substring(32);
    page3.drawText(line1, { x: MARGIN + 240, y: y - 14, size: 7.5, font: courier });
    page3.drawText(line2, { x: MARGIN + 240, y: y - 26, size: 7.5, font: courier });

    y -= (rowHeight + 4);
    if (y < 200) break; // Keep space for roots
  }

  y -= 15;
  // Summary Cryptographic Values
  page3.drawRectangle({
    x: MARGIN,
    y: y - 85,
    width: A4_WIDTH - MARGIN * 2,
    height: 85,
    color: rgb(0.95, 0.95, 0.94),
    borderColor: rgb(0.2, 0.2, 0.2),
    borderWidth: 1,
  });

  let sumY = y - 20;
  page3.drawText('Merkle Tree Root:', { x: MARGIN + 12, y: sumY, size: 8.5, font: helveticaBold });
  page3.drawText(seal.merkleRoot, { x: MARGIN + 130, y: sumY, size: 8, font: courier });
  sumY -= 22;

  page3.drawText('Custody Log Head:', { x: MARGIN + 12, y: sumY, size: 8.5, font: helveticaBold });
  page3.drawText(seal.custodyHead, { x: MARGIN + 130, y: sumY, size: 8, font: courier });
  sumY -= 22;

  page3.drawText('Case Fingerprint:', { x: MARGIN + 12, y: sumY, size: 8.5, font: helveticaBold });
  page3.drawText(seal.caseFingerprint, { x: MARGIN + 130, y: sumY, size: 8.5, font: courier, color: rgb(0.91, 0.27, 0.17) });

  drawFooter(page3, helvetica, 3, totalPages);

  // ================= PAGE 4: HOW TO REPEAT HASHING & LOG =================
  const page4 = pdfDoc.addPage([A4_WIDTH, A4_HEIGHT]);
  drawDraftWatermark(page4, helveticaBold);

  y = A4_HEIGHT - 70;
  page4.drawText('Independent Verification & Repeatability Protocol', {
    x: MARGIN,
    y,
    size: 16,
    font: helveticaBold,
  });
  y -= 18;
  page4.drawText('Standard operating system commands to independently verify hashes:', {
    x: MARGIN,
    y,
    size: 9,
    font: helvetica,
    color: rgb(0.4, 0.4, 0.4),
  });
  y -= 30;

  const cliCommands = [
    { os: 'Windows (PowerShell):', cmd: 'Get-FileHash -Algorithm SHA256 "<filename>"' },
    { os: 'macOS (Terminal):', cmd: 'shasum -a 256 "<filename>"' },
    { os: 'Linux / Unix:', cmd: 'sha256sum "<filename>"' },
  ];

  for (const c of cliCommands) {
    page4.drawText(c.os, { x: MARGIN, y, size: 9, font: helveticaBold });
    y -= 14;
    page4.drawRectangle({
      x: MARGIN,
      y: y - 18,
      width: A4_WIDTH - MARGIN * 2,
      height: 22,
      color: rgb(0.04, 0.04, 0.04),
    });
    page4.drawText(c.cmd, {
      x: MARGIN + 10,
      y: y - 12,
      size: 8.5,
      font: courier,
      color: rgb(0.21, 0.82, 0.5),
    });
    y -= 34;
  }

  y -= 15;
  page4.drawText('Custody Log Summary (Audit Trail)', {
    x: MARGIN,
    y,
    size: 13,
    font: helveticaBold,
  });
  y -= 22;

  // Log summary rows (first 10)
  for (let i = 0; i < Math.min(custodyLog.length, 8); i++) {
    const entry = custodyLog[i];
    const logLine = `#${entry.index} · ${entry.time} · ${entry.action} · entryHash: ${entry.entryHash.substring(0, 12)}...`;
    page4.drawText(logLine, {
      x: MARGIN,
      y,
      size: 7.5,
      font: courier,
      color: rgb(0.2, 0.2, 0.2),
    });
    y -= 16;
  }

  y -= 25;
  page4.drawText('Device Clock Notice:', { x: MARGIN, y, size: 9, font: helveticaBold });
  y -= 14;
  page4.drawText(
    'Timestamps are derived from the creating device system clock at the moment each action occurred.',
    { x: MARGIN, y, size: 8, font: helvetica, color: rgb(0.4, 0.4, 0.4) }
  );

  drawFooter(page4, helvetica, 4, totalPages);

  // ================= PAGE 5: PART B (EXPERT BLANK) =================
  const page5 = pdfDoc.addPage([A4_WIDTH, A4_HEIGHT]);
  drawDraftWatermark(page5, helveticaBold);

  y = A4_HEIGHT - 70;
  page5.drawText(PART_B_TITLE || 'Part B: Official Examiner / Expert Certificate', {
    x: MARGIN,
    y,
    size: 16,
    font: helveticaBold,
  });
  y -= 18;
  page5.drawText('To be completed and signed by a qualified expert (not completed by Pramaan)', {
    x: MARGIN,
    y,
    size: 9.5,
    font: helveticaBold,
    color: rgb(0.91, 0.27, 0.17),
  });
  y -= 40;

  page5.drawRectangle({
    x: MARGIN,
    y: y - 260,
    width: A4_WIDTH - MARGIN * 2,
    height: 260,
    color: rgb(0.98, 0.98, 0.98),
    borderColor: rgb(0.7, 0.7, 0.7),
    borderWidth: 1,
  });

  const partBLines = PART_B_PLACEHOLDER.split('\n');
  let bY = y - 25;
  for (const line of partBLines) {
    if (line.trim()) {
      page5.drawText(line, {
        x: MARGIN + 16,
        y: bY,
        size: 9,
        font: helvetica,
        color: rgb(0.3, 0.3, 0.3),
      });
      bY -= 20;
    } else {
      bY -= 10;
    }
  }

  bY -= 30;
  page5.drawText('Name of Examiner / Expert: _________________________________________', {
    x: MARGIN + 16,
    y: bY,
    size: 9,
    font: helvetica,
  });
  bY -= 30;
  page5.drawText('Designation & Authority:  _________________________________________', {
    x: MARGIN + 16,
    y: bY,
    size: 9,
    font: helvetica,
  });
  bY -= 30;
  page5.drawText('Signature & Official Seal: _________________________________________', {
    x: MARGIN + 16,
    y: bY,
    size: 9,
    font: helvetica,
  });

  drawFooter(page5, helvetica, 5, totalPages);

  return pdfDoc.save();
}

