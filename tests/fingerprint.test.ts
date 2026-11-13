import { describe, it, expect } from 'vitest';
import {
  buildFingerprintFile,
  verifyFingerprintFile,
} from '../src/core/fingerprint';
import { appendEntry } from '../src/core/custody';
import { CustodyEntry, EvidenceFileMeta } from '../src/core/types';

describe('Fingerprint file build and verification', () => {
  async function createFixture() {
    const caseId = 'c0ffeec0ffee1234';
    const sealedAt = '2026-11-13T10:30:00.000Z';

    const files: EvidenceFileMeta[] = [
      {
        id: 'f1',
        order: 0,
        name: 'chat.txt',
        size: 1024,
        mimeType: 'text/plain',
        lastModified: 1731490000000,
        sha256: 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
        leaf: '',
        addedAt: '2026-11-13T10:00:00.000Z',
      },
      {
        id: 'f2',
        order: 1,
        name: 'screenshot.png',
        size: 2048,
        mimeType: 'image/png',
        lastModified: 1731490005000,
        sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        leaf: '',
        addedAt: '2026-11-13T10:05:00.000Z',
      },
    ];

    let custodyLog: CustodyEntry[] = [];
    custodyLog.push(await appendEntry(custodyLog, 'CASE_CREATED', { title: 'Harassment Proof' }));
    custodyLog.push(
      await appendEntry(
        custodyLog,
        'FILE_ADDED',
        { sha256: files[0].sha256, name: files[0].name, size: files[0].size },
        files[0].id
      )
    );
    custodyLog.push(
      await appendEntry(
        custodyLog,
        'FILE_ADDED',
        { sha256: files[1].sha256, name: files[1].name, size: files[1].size },
        files[1].id
      )
    );
    custodyLog.push(
      await appendEntry(custodyLog, 'SEAL_GENERATED', { fileCount: 2 })
    );

    const fpFile = await buildFingerprintFile({
      caseId,
      sealedAt,
      files,
      custodyLog,
    });

    return { fpFile, files, custodyLog };
  }

  it('builds a valid fingerprint file that verifies successfully', async () => {
    const { fpFile } = await createFixture();
    const result = await verifyFingerprintFile(fpFile);
    expect(result.ok).toBe(true);
  });

  it('fails verification if a file hash is mutated', async () => {
    const { fpFile } = await createFixture();
    const tampered = JSON.parse(JSON.stringify(fpFile));
    tampered.files[0].sha256 = '0000000000000000000000000000000000000000000000000000000000000000';

    const result = await verifyFingerprintFile(tampered);
    expect(result.ok).toBe(false);
  });

  it('fails verification if Merkle root is mutated', async () => {
    const { fpFile } = await createFixture();
    const tampered = JSON.parse(JSON.stringify(fpFile));
    tampered.merkleRoot = '1111111111111111111111111111111111111111111111111111111111111111';

    const result = await verifyFingerprintFile(tampered);
    expect(result.ok).toBe(false);
    expect(result.step).toBe('merkle');
  });

  it('fails verification if the custody log is modified', async () => {
    const { fpFile } = await createFixture();
    const tampered = JSON.parse(JSON.stringify(fpFile));
    tampered.custodyLog[1].details.name = 'tampered-chat.txt';

    const result = await verifyFingerprintFile(tampered);
    expect(result.ok).toBe(false);
    expect(result.step).toBe('custody');
  });

  it('fails verification if caseFingerprint is mutated', async () => {
    const { fpFile } = await createFixture();
    const tampered = JSON.parse(JSON.stringify(fpFile));
    tampered.caseFingerprint = '2222222222222222222222222222222222222222222222222222222222222222';

    const result = await verifyFingerprintFile(tampered);
    expect(result.ok).toBe(false);
    expect(result.step).toBe('fingerprint');
  });
});

