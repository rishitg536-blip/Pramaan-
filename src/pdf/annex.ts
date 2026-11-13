import { PDFDocument, rgb, StandardFonts, PDFPage } from 'pdf-lib';
import { CaseMeta, StoredEvidenceFile } from '../storage/db';
import { CustodyEntry, SealSnapshot } from '../core/types';

const A4_WIDTH = 595.28;
const A4_HEIGHT = 841.89;
const MARGIN = 50;

function drawFooter(page: PDFPage, font: any, pageNumber: number, totalPages: number) {
  const disclaimer = 'Pramaan Technical Annex · Cryptographic fact record only · Not a court certificate';
  page.drawText(disclaimer, {
    x: MARGIN,
    y: 25,
    size: 7.5,
    font,
    color: rgb(0.45, 0.45, 0.45),
  });
  const pageStr = `Page ${pageNumber} of ${totalPages}`;
  page.drawText(pageStr, {
    x: A4_WIDTH - MARGIN - 60,
    y: 25,
    size: 7.5,
    font,
    color: rgb(0.45, 0.45, 0.45),
  });
}

export async function generateTechnicalAnnexPdf(params: {
  meta: CaseMeta;
  files: StoredEvidenceFile[];
  seal: SealSnapshot;
  custodyLog: CustodyEntry[];
}): Promise<Uint8Array> {
  const { meta, files, seal, custodyLog } = params;

  const pdfDoc = await PDFDocument.create();
  const helv = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helvBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const mono = await pdfDoc.embedFont(StandardFonts.Courier);
  const monoBold = await pdfDoc.embedFont(StandardFonts.CourierBold);

  const pages: PDFPage[] = [];

  function addPage(): { page: PDFPage; y: number } {
    const page = pdfDoc.addPage([A4_WIDTH, A4_HEIGHT]);
    pages.push(page);
    return { page, y: A4_HEIGHT - MARGIN };
  }

  // --- PAGE 1: Header & Technical Identifiers ---
  let { page, y } = addPage();

  // Title
  page.drawText('PRAMAAN TECHNICAL ANNEX', {
    x: MARGIN,
    y,
    size: 18,
    font: helvBold,
    color: rgb(0.06, 0.06, 0.06),
  });
  y -= 16;

  page.drawText('Cryptographic Ledger, Merkle Tree Proofs & Recomputation Reference', {
    x: MARGIN,
    y,
    size: 10,
    font: helv,
    color: rgb(0.35, 0.35, 0.35),
  });
  y -= 25;

  // Case identifiers box
  page.drawRectangle({
    x: MARGIN,
    y: y - 110,
    width: A4_WIDTH - 2 * MARGIN,
    height: 110,
    color: rgb(0.96, 0.96, 0.94),
    borderColor: rgb(0.1, 0.1, 0.1),
    borderWidth: 1,
  });

  const idStartY = y - 18;
  const drawRow = (label: string, val: string, rowY: number) => {
    page.drawText(label, { x: MARGIN + 12, y: rowY, size: 8, font: helvBold, color: rgb(0.2, 0.2, 0.2) });
    page.drawText(val, { x: MARGIN + 130, y: rowY, size: 8, font: mono, color: rgb(0.05, 0.05, 0.05) });
  };

  drawRow('Case Identifier:', meta.caseId, idStartY);
  drawRow('Seal Version:', `#${seal.n} (Sealed: ${seal.sealedAt})`, idStartY - 16);
  drawRow('Custody Head Hash:', seal.custodyHead, idStartY - 32);
  drawRow('Merkle Tree Root:', seal.merkleRoot, idStartY - 48);
  drawRow('Case Fingerprint:', seal.caseFingerprint, idStartY - 64);
  drawRow('Evidence File Count:', `${files.length} file(s)`, idStartY - 80);

  y -= 135;

  // --- Section 1: Merkle Tree Proofs ---
  page.drawText('1. MERKLE TREE LEAVES & PROOFS', {
    x: MARGIN,
    y,
    size: 12,
    font: helvBold,
    color: rgb(0.06, 0.06, 0.06),
  });
  y -= 16;

  page.drawText(
    'Every evidence file hash serves as a leaf in the balanced binary Merkle tree. Pairwise hashes calculate root.',
    { x: MARGIN, y, size: 8.5, font: helv, color: rgb(0.3, 0.3, 0.3) }
  );
  y -= 20;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const proof = seal.proofs[file.id] || [];

    if (y < MARGIN + 60) {
      const np = addPage();
      page = np.page;
      y = np.y;
    }

    page.drawText(`File #${i + 1}: ${file.name} (${file.size} bytes)`, {
      x: MARGIN,
      y,
      size: 9,
      font: helvBold,
      color: rgb(0.1, 0.1, 0.1),
    });
    y -= 12;

    page.drawText(`SHA-256: ${file.sha256}`, {
      x: MARGIN + 10,
      y,
      size: 7.5,
      font: mono,
      color: rgb(0.2, 0.2, 0.2),
    });
    y -= 11;

    if (proof.length > 0) {
      page.drawText(`Proof Sibling Nodes:`, {
        x: MARGIN + 10,
        y,
        size: 7.5,
        font: helv,
        color: rgb(0.4, 0.4, 0.4),
      });
      y -= 10;
      for (const sibling of proof) {
        page.drawText(`- ${sibling.side}: ${sibling.hash}`, {
          x: MARGIN + 20,
          y,
          size: 7,
          font: mono,
          color: rgb(0.25, 0.25, 0.25),
        });
        y -= 9;
      }
    } else {
      page.drawText(`(Single leaf tree: Merkle Root equals leaf hash)`, {
        x: MARGIN + 10,
        y,
        size: 7.5,
        font: helv,
        color: rgb(0.4, 0.4, 0.4),
      });
      y -= 11;
    }
    y -= 8;
  }

  // --- Section 2: Custody Log Table ---
  if (y < MARGIN + 100) {
    const np = addPage();
    page = np.page;
    y = np.y;
  }

  y -= 15;
  page.drawText('2. CHAIN OF CUSTODY AUDIT LOG', {
    x: MARGIN,
    y,
    size: 12,
    font: helvBold,
    color: rgb(0.06, 0.06, 0.06),
  });
  y -= 15;

  for (const entry of custodyLog) {
    if (y < MARGIN + 40) {
      const np = addPage();
      page = np.page;
      y = np.y;
    }

    page.drawText(`[#${entry.index}] ${entry.time} | ACTION: ${entry.action}`, {
      x: MARGIN,
      y,
      size: 8,
      font: monoBold,
      color: rgb(0.1, 0.1, 0.1),
    });
    y -= 10;

    page.drawText(`Prev:  ${entry.prevHash}`, {
      x: MARGIN + 10,
      y,
      size: 7,
      font: mono,
      color: rgb(0.4, 0.4, 0.4),
    });
    y -= 9;

    page.drawText(`Entry: ${entry.entryHash}`, {
      x: MARGIN + 10,
      y,
      size: 7,
      font: mono,
      color: rgb(0.1, 0.1, 0.1),
    });
    y -= 12;
  }

  // --- Section 3: Verification Instructions ---
  if (y < MARGIN + 120) {
    const np = addPage();
    page = np.page;
    y = np.y;
  }

  y -= 15;
  page.drawText('3. INDEPENDENT RECOMPUTATION INSTRUCTIONS', {
    x: MARGIN,
    y,
    size: 12,
    font: helvBold,
    color: rgb(0.06, 0.06, 0.06),
  });
  y -= 15;

  const instructions = [
    'To independently verify this case fingerprint without trusting Pramaan:',
    '1. Obtain the exported fingerprint JSON file (pramaan-<caseId>-seal<N>.json).',
    '2. Run the Python verification script (using standard library only, no pip dependencies):',
    '   $ python verify_pramaan.py pramaan-<caseId>-seal<N>.json [evidence_folder]',
    '3. Formula recomputed:',
    '   CaseFingerprint = SHA256(MerkleRoot + CustodyHead)',
    '4. Verify OpenTimestamps Bitcoin anchoring (if .ots file was downloaded):',
    '   $ ots verify pramaan-<caseId>-seal<N>.json.ots',
  ];

  for (const line of instructions) {
    page.drawText(line, {
      x: MARGIN,
      y,
      size: 8,
      font: line.startsWith('   ') ? mono : helv,
      color: rgb(0.15, 0.15, 0.15),
    });
    y -= 12;
  }

  // Draw footers on all pages
  const totalPages = pages.length;
  for (let i = 0; i < pages.length; i++) {
    drawFooter(pages[i], helv, i + 1, totalPages);
  }

  return await pdfDoc.save();
}

