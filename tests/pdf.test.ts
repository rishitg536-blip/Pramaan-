import { describe, it, expect } from 'vitest';
import { generateDraftCertificatePdf } from '../src/pdf/certificate';
import { PDFDocument } from 'pdf-lib';
import { CaseMeta, StoredEvidenceFile } from '../src/storage/db';
import { CustodyEntry, SealSnapshot } from '../src/core/types';

describe('Draft Section 63(4) Certificate PDF Generation', () => {
  it('generates a 5-page PDF document with all required sections', async () => {
    const meta: CaseMeta = {
      caseId: 'abc123def4567890',
      createdAt: '2026-11-13T10:00:00.000Z',
      title: 'Harassment Case Alpha',
      details: {
        name: 'Jane Doe',
        parentage: 'John Doe',
        address: '123 Civil Lines, New Delhi',
        relationship: 'Owner and primary operator of the device',
      },
      declarations: { d1: true, d2: true },
      declarationsAckAt: '2026-11-13T10:15:00.000Z',
    };

    const files: StoredEvidenceFile[] = [
      {
        id: 'f1',
        order: 0,
        name: 'whatsapp_chat.txt',
        size: 14200,
        mimeType: 'text/plain',
        lastModified: 1731490000000,
        sha256: 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
        leaf: 'leaf1',
        addedAt: '2026-11-13T10:05:00.000Z',
        blob: new Blob(['mock content']),
      },
    ];

    const seal: SealSnapshot = {
      n: 1,
      sealedAt: '2026-11-13T10:20:00.000Z',
      merkleRoot: 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
      custodyHead: '0'.repeat(64),
      caseFingerprint: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      fileIds: ['f1'],
      proofs: { f1: [] },
    };

    const custodyLog: CustodyEntry[] = [
      {
        index: 0,
        time: '2026-11-13T10:00:00.000Z',
        action: 'CASE_CREATED',
        fileId: null,
        details: { title: meta.title },
        prevHash: '0'.repeat(64),
        entryHash: '1111111111111111111111111111111111111111111111111111111111111111',
      },
      {
        index: 1,
        time: '2026-11-13T10:20:00.000Z',
        action: 'SEAL_GENERATED',
        fileId: null,
        details: { sealNumber: 1 },
        prevHash: '1111111111111111111111111111111111111111111111111111111111111111',
        entryHash: '2222222222222222222222222222222222222222222222222222222222222222',
      },
    ];

    const pdfBytes = await generateDraftCertificatePdf({
      meta,
      files,
      seal,
      custodyLog,
    });

    expect(pdfBytes).toBeInstanceOf(Uint8Array);
    expect(pdfBytes.length).toBeGreaterThan(1000);

    // Load PDF back with pdf-lib to verify page count
    const loadedDoc = await PDFDocument.load(pdfBytes);
    expect(loadedDoc.getPageCount()).toBe(5);
  });
});

