import { PDFDocument, rgb, StandardFonts, degrees, PDFPage } from 'pdf-lib';
import { CaseMeta, StoredEvidenceFile } from '../storage/db';
import { CustodyEntry, SealSnapshot } from '../core/types';
import {
  SCHEDULE_HEADER,
  SECTION_REFERENCE,
  CERTIFICATE_TITLE,
} from './scheduleText';

const A4_WIDTH = 595.28;
const A4_HEIGHT = 841.89;
const MARGIN = 48;
const FOOTER_TEXT =
  'Statutory Section 63(4)(c) BSA Certificate · Digitally generated & cryptographic hash report enclosed';

function drawDraftWatermark(page: PDFPage, font: any) {
  const text = 'SEALED EVIDENCE';
  const size = 52;
  page.drawText(text, {
    x: 130,
    y: 360,
    size,
    font,
    color: rgb(0.93, 0.93, 0.93),
    rotate: degrees(45),
  });
}

function drawFooter(page: PDFPage, font: any, pageNumber: number, totalPages: number) {
  page.drawText(FOOTER_TEXT, {
    x: MARGIN,
    y: 24,
    size: 7.5,
    font,
    color: rgb(0.4, 0.4, 0.4),
  });
  const pageStr = `Page ${pageNumber} of ${totalPages}`;
  page.drawText(pageStr, {
    x: A4_WIDTH - MARGIN - 60,
    y: 24,
    size: 7.5,
    font,
    color: rgb(0.4, 0.4, 0.4),
  });
}

function wrapText(text: string, maxChars: number = 88): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let current = '';
  for (const w of words) {
    if ((current + ' ' + w).trim().length <= maxChars) {
      current = (current + ' ' + w).trim();
    } else {
      if (current) lines.push(current);
      current = w;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function formatDateDMY(isoString?: string): string {
  const d = isoString ? new Date(isoString) : new Date();
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

function formatTimeIST(isoString?: string): string {
  const d = isoString ? new Date(isoString) : new Date();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
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
  const courierBold = await pdfDoc.embedFont(StandardFonts.CourierBold);

  const totalPages = 5;

  // Determine device source match for checkboxes
  const rawSource = (meta.details.device?.sourceType || '').toLowerCase();
  const isComp = rawSource.includes('computer') || rawSource.includes('laptop') || rawSource.includes('desktop') || rawSource.includes('hard disk');
  const isDvr = rawSource.includes('dvr') || rawSource.includes('cctv');
  const isMobile = rawSource.includes('mobile') || rawSource.includes('phone') || rawSource.includes('tablet');
  const isFlash = rawSource.includes('flash') || rawSource.includes('usb');
  const isCd = rawSource.includes('cd') || rawSource.includes('dvd');
  const isServer = rawSource.includes('server');
  const isCloud = rawSource.includes('cloud') || rawSource.includes('drive');
  const isOther = !isComp && !isDvr && !isMobile && !isFlash && !isCd && !isServer && !isCloud;

  // Determine ownership match
  const rawRel = (meta.details.device?.ownershipRelationship || meta.details.relationship || 'Owned').toLowerCase();
  const isOwned = rawRel.includes('own');
  const isMaintained = rawRel.includes('maintain');
  const isManaged = rawRel.includes('manag');
  const isOperated = rawRel.includes('operat') || (!isOwned && !isMaintained && !isManaged);

  const formattedDate = formatDateDMY(seal.sealedAt);
  const formattedTime = formatTimeIST(seal.sealedAt);

  // ================= PAGE 1: COVER & MANDATORY NOTICES =================
  const page1 = pdfDoc.addPage([A4_WIDTH, A4_HEIGHT]);
  drawDraftWatermark(page1, helveticaBold);

  let y = A4_HEIGHT - 75;

  page1.drawText(SCHEDULE_HEADER, {
    x: MARGIN,
    y,
    size: 14,
    font: helveticaBold,
    color: rgb(0.1, 0.1, 0.1),
  });
  y -= 16;

  page1.drawText(SECTION_REFERENCE, {
    x: MARGIN,
    y,
    size: 11,
    font: helvetica,
    color: rgb(0.25, 0.25, 0.25),
  });
  y -= 22;

  page1.drawText(`${CERTIFICATE_TITLE} OF ELECTRONIC EVIDENCE`, {
    x: MARGIN,
    y,
    size: 19,
    font: helveticaBold,
    color: rgb(0.05, 0.05, 0.05),
  });
  y -= 18;

  page1.drawText('PART A & PART B // BHARATIYA SAKSHYA ADHINIYAM, 2023', {
    x: MARGIN,
    y,
    size: 10,
    font: helveticaBold,
    color: rgb(0.15, 0.35, 0.85),
  });
  y -= 35;

  // Case Overview Box
  page1.drawRectangle({
    x: MARGIN,
    y: y - 185,
    width: A4_WIDTH - MARGIN * 2,
    height: 185,
    color: rgb(0.98, 0.98, 0.97),
    borderColor: rgb(0.1, 0.1, 0.1),
    borderWidth: 1.5,
  });

  const boxX = MARGIN + 18;
  let boxY = y - 26;

  page1.drawText('Case Title:', { x: boxX, y: boxY, size: 10, font: helveticaBold });
  page1.drawText((meta.title || 'Untitled Case Dossier').substring(0, 52), { x: boxX + 115, y: boxY, size: 10, font: helvetica });
  boxY -= 22;

  page1.drawText('Case ID:', { x: boxX, y: boxY, size: 10, font: helveticaBold });
  page1.drawText(meta.caseId, { x: boxX + 115, y: boxY, size: 10, font: courierBold });
  boxY -= 22;

  page1.drawText('Deponent Name:', { x: boxX, y: boxY, size: 10, font: helveticaBold });
  page1.drawText(`${meta.details.name || '[Not specified]'} (${meta.details.parentage || ''})`.substring(0, 52), { x: boxX + 115, y: boxY, size: 10, font: helvetica });
  boxY -= 22;

  page1.drawText('Source Device:', { x: boxX, y: boxY, size: 10, font: helveticaBold });
  const devStr = `${meta.details.device?.sourceType || 'Device'} — ${meta.details.device?.model || 'General Digital Device'}`;
  page1.drawText(devStr.substring(0, 52), { x: boxX + 115, y: boxY, size: 10, font: helvetica });
  boxY -= 22;

  page1.drawText('Seal Snapshot:', { x: boxX, y: boxY, size: 10, font: helveticaBold });
  page1.drawText(`Seal #${seal.n} · Sealed at ${seal.sealedAt} · ${files.length} file(s)`, { x: boxX + 115, y: boxY, size: 9.5, font: helvetica });
  boxY -= 24;

  page1.drawText('Composite Fingerprint:', { x: boxX, y: boxY, size: 9.5, font: helveticaBold });
  boxY -= 15;
  page1.drawText(seal.caseFingerprint, { x: boxX, y: boxY, size: 8, font: courierBold, color: rgb(0.85, 0.2, 0.15) });

  y -= 225;

  // Important Legal Notice Box
  page1.drawRectangle({
    x: MARGIN,
    y: y - 120,
    width: A4_WIDTH - MARGIN * 2,
    height: 120,
    color: rgb(1, 0.98, 0.9),
    borderColor: rgb(0.1, 0.1, 0.1),
    borderWidth: 1,
  });

  page1.drawText('STATUTORY COMPLIANCE & LEGAL NOTICE:', {
    x: MARGIN + 16,
    y: y - 22,
    size: 10,
    font: helveticaBold,
    color: rgb(0.05, 0.05, 0.05),
  });

  const legalNotes = [
    '1. Part A must be completed, signed, and dated by the person in lawful control of the device/records.',
    '2. Part B must be completed and signed by an authorized expert/examiner pursuant to Section 63(4)(c) BSA.',
    '3. Enclosed Evidence Hash Report (Page 3) proves files remain bit-for-bit unchanged from the seal timestamp.',
    '4. Cryptographic integrity is verifiable offline via SHA-256 standard operating system terminal commands.',
  ];

  let lY = y - 42;
  for (const line of legalNotes) {
    page1.drawText(line, {
      x: MARGIN + 16,
      y: lY,
      size: 8.5,
      font: helvetica,
      color: rgb(0.2, 0.2, 0.2),
    });
    lY -= 17;
  }

  drawFooter(page1, helvetica, 1, totalPages);

  // ================= PAGE 2: PART A (STATUTORY SCHEDULE FORMAT) =================
  const page2 = pdfDoc.addPage([A4_WIDTH, A4_HEIGHT]);
  drawDraftWatermark(page2, helveticaBold);

  y = A4_HEIGHT - 65;

  // Header matching Image 1
  page2.drawText('THE SCHEDULE', { x: A4_WIDTH / 2 - 45, y, size: 11, font: helveticaBold });
  y -= 14;
  page2.drawText('[See section 63(4)(c)]', { x: A4_WIDTH / 2 - 55, y, size: 10, font: helvetica });
  y -= 16;
  page2.drawText('CERTIFICATE', { x: A4_WIDTH / 2 - 40, y, size: 12, font: helveticaBold });
  y -= 16;
  page2.drawText('PART A', { x: A4_WIDTH / 2 - 25, y, size: 11, font: helveticaBold });
  y -= 14;
  page2.drawText('(To be filled by the Party)', { x: A4_WIDTH / 2 - 60, y, size: 9.5, font: helvetica });
  y -= 26;

  // I, [Name] ... statement
  const nameVal = meta.details.name || '________________________';
  const parentVal = meta.details.parentage || '________________________';
  const addrVal = meta.details.address || '________________________________________________';

  page2.drawText(`I, ${nameVal} (Name), Son/daughter/spouse of ${parentVal}`, {
    x: MARGIN,
    y,
    size: 8.5,
    font: helvetica,
  });
  y -= 14;
  page2.drawText(`residing/employed at ${addrVal} do hereby solemnly affirm and sincerely`, {
    x: MARGIN,
    y,
    size: 8.5,
    font: helvetica,
  });
  y -= 14;
  page2.drawText('state and submit as follows:—', { x: MARGIN, y, size: 8.5, font: helvetica });
  y -= 18;

  // Produced electronic record statement
  page2.drawText('I have produced electronic record/output of the digital record taken from the following', {
    x: MARGIN,
    y,
    size: 8.5,
    font: helvetica,
  });
  y -= 13;
  page2.drawText('device/digital record source (tick mark):—', { x: MARGIN, y, size: 8.5, font: helvetica });
  y -= 18;

  // Checkbox Grid 1:
  // Computer / Storage Media [ ]   DVR [ ]   Mobile [ ]   Flash Drive [ ]
  // CD/DVD [ ]   Server [ ]   Cloud [ ]   Other [ ]
  page2.drawText(`Computer / Storage Media [${isComp ? 'X' : ' '}]     DVR [${isDvr ? 'X' : ' '}]     Mobile [${isMobile ? 'X' : ' '}]     Flash Drive [${isFlash ? 'X' : ' '}]`, {
    x: MARGIN,
    y,
    size: 8.5,
    font: helvetica,
  });
  y -= 15;
  page2.drawText(`CD/DVD [${isCd ? 'X' : ' '}]     Server [${isServer ? 'X' : ' '}]     Cloud [${isCloud ? 'X' : ' '}]     Other [${isOther ? 'X' : ' '}]`, {
    x: MARGIN,
    y,
    size: 8.5,
    font: helvetica,
  });
  y -= 15;

  const otherText = isOther ? (meta.details.device?.sourceType || '') : '________________________________________';
  page2.drawText(`Other: ${otherText}`, { x: MARGIN, y, size: 8.5, font: helvetica });
  y -= 15;

  const modelVal = meta.details.device?.model || '________________________';
  const colorVal = meta.details.device?.colour || '________________________';
  page2.drawText(`Make & Model: ${modelVal}    Color: ${colorVal}`, { x: MARGIN, y, size: 8.5, font: helvetica });
  y -= 15;

  const serialVal = meta.details.device?.serialNumber || '________________________';
  page2.drawText(`Serial Number: ${serialVal}`, { x: MARGIN, y, size: 8.5, font: helvetica });
  y -= 15;

  const idVal = meta.details.device?.identifier || '________________________';
  page2.drawText(`IMEI/UIN/UID/MAC/Cloud ID: ${idVal} (as applicable)`, { x: MARGIN, y, size: 8.5, font: helvetica });
  y -= 15;

  page2.drawText(`and any other relevant information, if any, about the device/digital record: Case ID ${meta.caseId} (specify).`, {
    x: MARGIN,
    y,
    size: 8.5,
    font: helvetica,
  });
  y -= 22;

  // Lawful control paragraph
  const lawfulParagraph =
    'The digital device or the digital record source was under the lawful control for regularly creating, storing or processing information for the purposes of carrying out regular activities and during this period, the computer or the communication device was working properly and the relevant information was regularly fed into the computer during the ordinary course of business. If the computer/digital device at any point of time was not working properly or out of operation, then it has not affected the electronic/digital record or its accuracy. The digital device or the source of the digital record is:—';

  const lawfulLines = wrapText(lawfulParagraph, 92);
  for (const line of lawfulLines) {
    page2.drawText(line, { x: MARGIN, y, size: 8.2, font: helvetica });
    y -= 12.5;
  }
  y -= 4;

  // Ownership checkboxes:
  page2.drawText(`Owned [${isOwned ? 'X' : ' '}]          Maintained [${isMaintained ? 'X' : ' '}]          Managed [${isManaged ? 'X' : ' '}]          Operated [${isOperated ? 'X' : ' '}]`, {
    x: MARGIN,
    y,
    size: 8.5,
    font: helveticaBold,
  });
  y -= 14;
  page2.drawText('by me (select as applicable).', { x: MARGIN, y, size: 8.5, font: helvetica });
  y -= 18;

  // Hash value statement:
  const hashDigest = seal.caseFingerprint.substring(0, 48) + '...';
  page2.drawText(`I state that the HASH value/s of the electronic/digital record/s is ${hashDigest},`, {
    x: MARGIN,
    y,
    size: 8.2,
    font: helvetica,
  });
  y -= 13;
  page2.drawText('obtained through the following algorithm:—', { x: MARGIN, y, size: 8.2, font: helvetica });
  y -= 15;

  page2.drawText('[ ] SHA1:           [X] SHA256:           [ ] MD5:           [ ] Other ________________________ (Legally acceptable standard)', {
    x: MARGIN,
    y,
    size: 8,
    font: helvetica,
  });
  y -= 15;
  page2.drawText('(Hash report to be enclosed with the certificate)', { x: MARGIN, y, size: 8, font: helvetica });
  y -= 30;

  // Name and signature block (right aligned)
  const sigX = A4_WIDTH - MARGIN - 210;
  page2.drawText('(Name and signature)', { x: sigX, y, size: 8.5, font: helvetica });
  y -= 14;
  page2.drawText(`${nameVal}`, { x: sigX, y, size: 8.5, font: helveticaBold });
  y -= 18;

  // Date, Time, Place (left aligned)
  page2.drawText(`Date (DD/MM/YYYY): ${formattedDate}`, { x: MARGIN, y, size: 8.5, font: helvetica });
  y -= 14;
  page2.drawText(`Time (IST): ${formattedTime} hours (In 24 hours format)`, { x: MARGIN, y, size: 8.5, font: helvetica });
  y -= 14;
  const placeVal = meta.details.address ? meta.details.address.split(',').pop()?.trim() || 'New Delhi' : '________________________';
  page2.drawText(`Place: ${placeVal}`, { x: MARGIN, y, size: 8.5, font: helvetica });

  drawFooter(page2, helvetica, 2, totalPages);

  // ================= PAGE 3: EVIDENCE HASH REPORT =================
  const page3 = pdfDoc.addPage([A4_WIDTH, A4_HEIGHT]);
  drawDraftWatermark(page3, helveticaBold);

  y = A4_HEIGHT - 65;

  page3.drawText('THE SCHEDULE [See section 63(4)(c)]', {
    x: MARGIN,
    y,
    size: 11,
    font: helveticaBold,
    color: rgb(0.2, 0.2, 0.2),
  });
  y -= 16;

  page3.drawText('EVIDENCE HASH REPORT // SHA-256 INVENTORY', {
    x: MARGIN,
    y,
    size: 15,
    font: helveticaBold,
    color: rgb(0.05, 0.05, 0.05),
  });
  y -= 14;

  page3.drawText(`Enclosure to Section 63(4) Certificate · Case Dossier: ${meta.title || meta.caseId}`, {
    x: MARGIN,
    y,
    size: 8.5,
    font: helvetica,
    color: rgb(0.35, 0.35, 0.35),
  });
  y -= 26;

  // Render file records with the 9 mandatory fields
  // 1. File name 2. File size 3. File type 4. Hash algorithm 5. SHA-256 hash
  // 6. Date & time added 7. Case or evidence ID 8. Original/derived 9. Processing notes
  const maxFilesOnPage = Math.min(files.length, 4);

  for (let i = 0; i < maxFilesOnPage; i++) {
    const f = files[i];
    const cardHeight = 88;

    // Card outline
    page3.drawRectangle({
      x: MARGIN,
      y: y - cardHeight,
      width: A4_WIDTH - MARGIN * 2,
      height: cardHeight,
      color: i % 2 === 0 ? rgb(0.98, 0.98, 0.97) : rgb(1, 1, 1),
      borderColor: rgb(0.15, 0.15, 0.15),
      borderWidth: 1,
    });

    let cY = y - 16;
    const leftCol = MARGIN + 10;
    const rightCol = MARGIN + 260;

    // Line 1: 1. File name & 7. Evidence ID
    page3.drawText(`File #${i + 1}: ${f.name.substring(0, 36)}`, {
      x: leftCol,
      y: cY,
      size: 9,
      font: helveticaBold,
      color: rgb(0.05, 0.05, 0.05),
    });
    page3.drawText(`Evidence ID: ${f.id} (Case: ${meta.caseId.substring(0, 12)})`, {
      x: rightCol,
      y: cY,
      size: 8,
      font: courier,
    });
    cY -= 15;

    // Line 2: 2. File size & 3. File type
    page3.drawText(`Size: ${f.size} B (${(f.size / 1024).toFixed(1)} KB)  |  Type: ${f.mimeType || 'octet-stream'}`, {
      x: leftCol,
      y: cY,
      size: 8,
      font: helvetica,
    });
    // 8. Original or derived
    page3.drawText('Classification: Original Evidence File', {
      x: rightCol,
      y: cY,
      size: 8,
      font: helveticaBold,
      color: rgb(0.1, 0.5, 0.2),
    });
    cY -= 15;

    // Line 3: 6. Date and time file was added & 4. Hash algorithm used
    const addedTime = f.addedAt || seal.sealedAt;
    page3.drawText(`Date/Time Added: ${addedTime}  |  Algorithm: SHA-256 (FIPS 180-4)`, {
      x: leftCol,
      y: cY,
      size: 8,
      font: helvetica,
    });
    cY -= 16;

    // Line 4: 5. SHA-256 hash
    page3.drawText('SHA-256 Hash:', { x: leftCol, y: cY, size: 8, font: helveticaBold });
    page3.drawText(f.sha256, {
      x: leftCol + 70,
      y: cY,
      size: 7.5,
      font: courierBold,
      color: rgb(0.1, 0.25, 0.7),
    });
    cY -= 15;

    // Line 5: 9. Relevant processing notes
    page3.drawText('Processing Notes: Preserved without alteration; direct client bitstream SHA-256 computed; Merkle leaf anchored.', {
      x: leftCol,
      y: cY,
      size: 7.2,
      font: helvetica,
      color: rgb(0.35, 0.35, 0.35),
    });

    y -= (cardHeight + 10);
  }

  y -= 8;

  // Cryptographic Tree & Seal Anchor Summary
  page3.drawRectangle({
    x: MARGIN,
    y: y - 82,
    width: A4_WIDTH - MARGIN * 2,
    height: 82,
    color: rgb(0.95, 0.95, 0.94),
    borderColor: rgb(0.1, 0.1, 0.1),
    borderWidth: 1.2,
  });

  let sumY = y - 18;
  page3.drawText('Merkle Tree Root Digest:', { x: MARGIN + 12, y: sumY, size: 8.5, font: helveticaBold });
  page3.drawText(seal.merkleRoot, { x: MARGIN + 135, y: sumY, size: 8, font: courier });
  sumY -= 20;

  page3.drawText('Immutable Custody Head:', { x: MARGIN + 12, y: sumY, size: 8.5, font: helveticaBold });
  page3.drawText(seal.custodyHead, { x: MARGIN + 135, y: sumY, size: 8, font: courier });
  sumY -= 20;

  page3.drawText('Composite Case Fingerprint:', { x: MARGIN + 12, y: sumY, size: 8.5, font: helveticaBold });
  page3.drawText(seal.caseFingerprint, { x: MARGIN + 135, y: sumY, size: 8.2, font: courierBold, color: rgb(0.85, 0.2, 0.15) });

  drawFooter(page3, helvetica, 3, totalPages);

  // ================= PAGE 4: INDEPENDENT VERIFICATION & AUDIT TRAIL =================
  const page4 = pdfDoc.addPage([A4_WIDTH, A4_HEIGHT]);
  drawDraftWatermark(page4, helveticaBold);

  y = A4_HEIGHT - 65;

  page4.drawText('Independent Verification & Repeatability Protocol', {
    x: MARGIN,
    y,
    size: 15,
    font: helveticaBold,
  });
  y -= 16;

  page4.drawText('Standard terminal commands to independently verify SHA-256 hashes on any forensic workstation:', {
    x: MARGIN,
    y,
    size: 8.5,
    font: helvetica,
    color: rgb(0.35, 0.35, 0.35),
  });
  y -= 26;

  const cliCommands = [
    { os: 'Windows (PowerShell):', cmd: 'Get-FileHash -Algorithm SHA256 "<filename>"' },
    { os: 'macOS (Terminal):', cmd: 'shasum -a 256 "<filename>"' },
    { os: 'Linux / Unix Shell:', cmd: 'sha256sum "<filename>"' },
  ];

  for (const c of cliCommands) {
    page4.drawText(c.os, { x: MARGIN, y, size: 8.5, font: helveticaBold });
    y -= 13;
    page4.drawRectangle({
      x: MARGIN,
      y: y - 18,
      width: A4_WIDTH - MARGIN * 2,
      height: 20,
      color: rgb(0.04, 0.04, 0.04),
    });
    page4.drawText(c.cmd, {
      x: MARGIN + 10,
      y: y - 13,
      size: 8,
      font: courier,
      color: rgb(0.25, 0.85, 0.5),
    });
    y -= 30;
  }

  y -= 12;

  page4.drawText('Custody Log Summary (Immutable Audit Trail)', {
    x: MARGIN,
    y,
    size: 12,
    font: helveticaBold,
  });
  y -= 18;

  for (let i = 0; i < Math.min(custodyLog.length, 9); i++) {
    const entry = custodyLog[i];
    const logLine = `#${entry.index} · ${entry.time} · ${entry.action} · entryHash: ${entry.entryHash.substring(0, 14)}…`;
    page4.drawText(logLine, {
      x: MARGIN,
      y,
      size: 7.5,
      font: courier,
      color: rgb(0.2, 0.2, 0.2),
    });
    y -= 15;
  }

  y -= 20;
  page4.drawText('Device Clock Notice:', { x: MARGIN, y, size: 8.5, font: helveticaBold });
  y -= 13;
  page4.drawText(
    'Timestamps are derived from the local system clock and verified against immutable hash chain links at seal snapshot generation.',
    { x: MARGIN, y, size: 8, font: helvetica, color: rgb(0.35, 0.35, 0.35) }
  );

  drawFooter(page4, helvetica, 4, totalPages);

  // ================= PAGE 5: PART B (STATUTORY EXPERT FORMAT) =================
  const page5 = pdfDoc.addPage([A4_WIDTH, A4_HEIGHT]);
  drawDraftWatermark(page5, helveticaBold);

  y = A4_HEIGHT - 65;

  // Header matching Image 2
  page5.drawText('PART B', { x: A4_WIDTH / 2 - 22, y, size: 12, font: helveticaBold });
  y -= 15;
  page5.drawText('(To be filled by the Expert)', { x: A4_WIDTH / 2 - 62, y, size: 10, font: helvetica });
  y -= 26;

  page5.drawText('I, ________________________ (Name), Son/daughter/spouse of ________________________', {
    x: MARGIN,
    y,
    size: 8.5,
    font: helvetica,
  });
  y -= 14;
  page5.drawText('residing/employed at ________________________ do hereby solemnly affirm and', {
    x: MARGIN,
    y,
    size: 8.5,
    font: helvetica,
  });
  y -= 14;
  page5.drawText('sincerely state and submit as follows:—', { x: MARGIN, y, size: 8.5, font: helvetica });
  y -= 20;

  page5.drawText('The produced electronic record/output of the digital record are obtained from the following', {
    x: MARGIN,
    y,
    size: 8.5,
    font: helvetica,
  });
  y -= 14;
  page5.drawText('device/digital record source (tick mark):—', { x: MARGIN, y, size: 8.5, font: helvetica });
  y -= 18;

  // Checkboxes matching Image 2
  page5.drawText('Computer / Storage Media [ ]     DVR [ ]     Mobile [ ]     Flash Drive [ ]', {
    x: MARGIN,
    y,
    size: 8.5,
    font: helvetica,
  });
  y -= 15;
  page5.drawText('CD/DVD [ ]     Server [ ]     Cloud [ ]     Other [ ]', {
    x: MARGIN,
    y,
    size: 8.5,
    font: helvetica,
  });
  y -= 15;

  page5.drawText('Other: ________________________________________________', { x: MARGIN, y, size: 8.5, font: helvetica });
  y -= 18;

  page5.drawText('Make & Model: ________________________ Color: ________________________', {
    x: MARGIN,
    y,
    size: 8.5,
    font: helvetica,
  });
  y -= 16;
  page5.drawText('Serial Number: ________________________', { x: MARGIN, y, size: 8.5, font: helvetica });
  y -= 16;
  page5.drawText('IMEI/UIN/UID/MAC/Cloud ID ________________________ (as applicable)', {
    x: MARGIN,
    y,
    size: 8.5,
    font: helvetica,
  });
  y -= 16;
  page5.drawText('and any other relevant information, if any, about the device/digital record ______ (specify).', {
    x: MARGIN,
    y,
    size: 8.5,
    font: helvetica,
  });
  y -= 24;

  page5.drawText('I state that the HASH value/s of the electronic/digital record/s is ________________________,', {
    x: MARGIN,
    y,
    size: 8.5,
    font: helvetica,
  });
  y -= 14;
  page5.drawText('obtained through the following algorithm:—', { x: MARGIN, y, size: 8.5, font: helvetica });
  y -= 16;

  page5.drawText('[ ] SHA1:           [X] SHA256:           [ ] MD5:           [ ] Other ________________________ (Legally acceptable standard)', {
    x: MARGIN,
    y,
    size: 8,
    font: helvetica,
  });
  y -= 15;
  page5.drawText('(Hash report to be enclosed with the certificate)', { x: MARGIN, y, size: 8, font: helvetica });
  y -= 50;

  // Sign-off block (matching Image 2)
  const expSigX = A4_WIDTH - MARGIN - 230;
  page5.drawText('(Name, designation and signature)', { x: expSigX, y, size: 8.5, font: helvetica });
  y -= 25;

  page5.drawText('Date (DD/MM/YYYY): ________', { x: MARGIN, y, size: 8.5, font: helvetica });
  y -= 16;
  page5.drawText('Time (IST): ________ hours (In 24 hours format)', { x: MARGIN, y, size: 8.5, font: helvetica });
  y -= 16;
  page5.drawText('Place: ________________________', { x: MARGIN, y, size: 8.5, font: helvetica });

  drawFooter(page5, helvetica, 5, totalPages);

  return pdfDoc.save();
}
