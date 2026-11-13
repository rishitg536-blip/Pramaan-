import { describe, it, expect } from 'vitest';
import {
  GENESIS_PREV_HASH,
  makeEntry,
  appendEntry,
  verifyChain,
} from '../src/core/custody';
import { CustodyEntry } from '../src/core/types';

describe('Custody log hash chain', () => {
  it('uses 64 zeros as genesis prevHash', () => {
    expect(GENESIS_PREV_HASH).toBe('0'.repeat(64));
    expect(GENESIS_PREV_HASH.length).toBe(64);
  });

  it('builds a valid chain of 10 entries and verifies cleanly', async () => {
    let chain: CustodyEntry[] = [];
    const entry0 = await appendEntry(chain, 'CASE_CREATED', { title: 'Test Case' });
    chain.push(entry0);
    expect(entry0.index).toBe(0);
    expect(entry0.prevHash).toBe(GENESIS_PREV_HASH);

    for (let i = 1; i < 10; i++) {
      const entry = await appendEntry(
        chain,
        'FILE_ADDED',
        { sha256: `hash-${i}`, name: `file_${i}.txt`, size: 100 * i },
        `f_${i}`
      );
      chain.push(entry);
    }

    expect(chain.length).toBe(10);
    const result = await verifyChain(chain);
    expect(result.ok).toBe(true);
  });

  it('fails if genesis prevHash is not 64 zeros', async () => {
    const entry = await makeEntry(
      0,
      'CASE_CREATED',
      {},
      '1'.repeat(64),
      null,
      '2026-11-13T10:00:00.000Z'
    );
    const result = await verifyChain([entry]);
    expect(result.ok).toBe(false);
    expect(result.brokenAt).toBe(0);
  });

  it('fails with brokenAt when an entry is modified', async () => {
    let chain: CustodyEntry[] = [];
    chain.push(await appendEntry(chain, 'CASE_CREATED', {}));
    chain.push(await appendEntry(chain, 'FILE_ADDED', { name: 'chat.txt' }, 'f1'));
    chain.push(await appendEntry(chain, 'FILE_ADDED', { name: 'photo.jpg' }, 'f2'));
    chain.push(await appendEntry(chain, 'SEAL_GENERATED', { count: 2 }));

    // Mutate entry #2
    const tampered = JSON.parse(JSON.stringify(chain)) as CustodyEntry[];
    tampered[2].details = { name: 'photo-tampered.jpg' };

    const result = await verifyChain(tampered);
    expect(result.ok).toBe(false);
    expect(result.brokenAt).toBe(2);
  });

  it('fails with brokenAt when an entry is deleted', async () => {
    let chain: CustodyEntry[] = [];
    for (let i = 0; i < 5; i++) {
      chain.push(await appendEntry(chain, 'FILE_ADDED', { i }));
    }

    // Delete entry #2
    const tampered = [...chain.slice(0, 2), ...chain.slice(3)];
    const result = await verifyChain(tampered);
    expect(result.ok).toBe(false);
    expect(result.brokenAt).toBe(3); // entry #3 is now at position 2 (or index mismatch)
  });

  it('fails with brokenAt when two entries are reordered', async () => {
    let chain: CustodyEntry[] = [];
    for (let i = 0; i < 5; i++) {
      chain.push(await appendEntry(chain, 'FILE_ADDED', { i }));
    }

    const tampered = [...chain];
    const temp = tampered[2];
    tampered[2] = tampered[3];
    tampered[3] = temp;

    const result = await verifyChain(tampered);
    expect(result.ok).toBe(false);
    expect(result.brokenAt).toBe(3);
  });

  it('fails with brokenAt when an entry is inserted', async () => {
    let chain: CustodyEntry[] = [];
    for (let i = 0; i < 4; i++) {
      chain.push(await appendEntry(chain, 'FILE_ADDED', { i }));
    }

    const rogueEntry = await makeEntry(
      2,
      'FILE_ADDED',
      { rogue: true },
      chain[1].entryHash
    );
    const tampered = [chain[0], chain[1], rogueEntry, chain[2], chain[3]];

    const result = await verifyChain(tampered);
    expect(result.ok).toBe(false);
  });
});

