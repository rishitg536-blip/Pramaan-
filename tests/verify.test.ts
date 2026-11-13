import { describe, it, expect } from 'vitest';
import { buildFingerprintFile } from '../src/core/fingerprint';
import { appendEntry } from '../src/core/custody';
import { computeLeafHash, verifyProof } from '../src/core/merkle';
import { hashFileStream } from '../src/core/hash';
import { CustodyEntry, EvidenceFileMeta } from '../src/core/types';

describe('Verify page logic integration', () => {
  it('correctly evaluates original vs 1-byte changed file against a fingerprint file', async () => {
    // 1. Prepare original file content
    const originalContent = new TextEncoder().encode('Hello, this is original harassment chat evidence.');
    const originalBlob = new Blob([originalContent]);
    const originalHash = await hashFileStream(originalBlob);

    // 2. Prepare 1-byte tampered file content
    const tamperedContent = new Uint8Array(originalContent);
    tamperedContent[7] = tamperedContent[7] ^ 0xff; // flip one byte
    const tamperedBlob = new Blob([tamperedContent]);
    const tamperedHash = await hashFileStream(tamperedBlob);

    expect(originalHash).not.toBe(tamperedHash);

    // 3. Build fingerprint file sealing the original
    const fileMeta: EvidenceFileMeta = {
      id: 'f1',
      order: 0,
      name: 'chat.txt',
      size: originalContent.length,
      mimeType: 'text/plain',
      lastModified: 1731490000000,
      sha256: originalHash,
      leaf: '',
      addedAt: '2026-11-13T10:00:00.000Z',
    };

    let log: CustodyEntry[] = [];
    log.push(await appendEntry(log, 'CASE_CREATED', { title: 'Case 1' }));
    log.push(await appendEntry(log, 'FILE_ADDED', { name: fileMeta.name, sha256: fileMeta.sha256 }, fileMeta.id));
    log.push(await appendEntry(log, 'SEAL_GENERATED', { fileCount: 1 }));

    const fpFile = await buildFingerprintFile({
      caseId: 'case-test-1234',
      sealedAt: '2026-11-13T10:30:00.000Z',
      files: [fileMeta],
      custodyLog: log,
    });

    // 4. Verify Original File -> Matches (Green)
    const match = fpFile.files.find((f) => f.sha256 === originalHash);
    expect(match).toBeDefined();
    const leaf = await computeLeafHash(originalHash);
    const proofOk = await verifyProof(leaf, fpFile.proofs[match!.id], fpFile.merkleRoot);
    expect(proofOk).toBe(true);

    // 5. Verify Tampered File with same name -> CHANGED (Red)
    const tamperedMatch = fpFile.files.find((f) => f.sha256 === tamperedHash);
    expect(tamperedMatch).toBeUndefined();
    const nameMatch = fpFile.files.find((f) => f.name === 'chat.txt');
    expect(nameMatch).toBeDefined(); // Name matches, but hash does not -> CHANGED!
  });
});

