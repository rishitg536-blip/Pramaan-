import { describe, it, expect } from 'vitest';
import { sha256Hex, hashFileStream } from '../src/core/hash';
import { createHash } from 'node:crypto';

describe('SHA-256 vectors and streaming', () => {
  it('hashes empty string correctly', async () => {
    const hash = await sha256Hex('');
    expect(hash).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
  });

  it('hashes "abc" correctly', async () => {
    const hash = await sha256Hex('abc');
    expect(hash).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  });

  it('hashes a 10 MB buffer matching Node crypto SHA-256', async () => {
    const size = 10 * 1024 * 1024;
    const buffer = new Uint8Array(size);
    // Fill with predictable pattern
    for (let i = 0; i < size; i += 1024) {
      buffer[i] = (i * 31) % 256;
    }

    const expectedHash = createHash('sha256').update(buffer).digest('hex');

    const blob = new Blob([buffer]);
    let progressUpdates = 0;
    const computedHash = await hashFileStream(blob, (progress) => {
      progressUpdates++;
      expect(progress).toBeGreaterThan(0);
      expect(progress).toBeLessThanOrEqual(1);
    });

    expect(computedHash).toBe(expectedHash);
    expect(progressUpdates).toBeGreaterThanOrEqual(1);
  });
});

