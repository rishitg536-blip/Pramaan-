import { canonicalJson } from './canonical';
import { sha256Hex } from './hash';
import { CustodyAction, CustodyEntry } from './types';

export const GENESIS_PREV_HASH = '0'.repeat(64);

export async function computeEntryHash(
  index: number,
  time: string,
  action: CustodyAction | string,
  fileId: string | null,
  details: Record<string, unknown>,
  prevHash: string
): Promise<string> {
  const payload = {
    action,
    details,
    fileId: fileId ?? null,
    index,
    prevHash,
    time,
  };
  const canonical = canonicalJson(payload);
  return sha256Hex(canonical);
}

export async function makeEntry(
  index: number,
  action: CustodyAction | string,
  details: Record<string, unknown>,
  prevHash: string,
  fileId: string | null = null,
  time: string = new Date().toISOString()
): Promise<CustodyEntry> {
  const entryHash = await computeEntryHash(index, time, action, fileId, details, prevHash);
  return {
    index,
    time,
    action,
    fileId: fileId ?? null,
    details,
    prevHash,
    entryHash,
  };
}

export async function appendEntry(
  chain: CustodyEntry[],
  action: CustodyAction | string,
  details: Record<string, unknown>,
  fileId: string | null = null,
  time?: string
): Promise<CustodyEntry> {
  const entryTime = time ?? new Date().toISOString();
  if (chain.length === 0) {
    return makeEntry(0, action, details, GENESIS_PREV_HASH, fileId, entryTime);
  }
  const last = chain[chain.length - 1];
  return makeEntry(last.index + 1, action, details, last.entryHash, fileId, entryTime);
}

export interface ChainVerificationResult {
  ok: boolean;
  brokenAt?: number;
  reason?: string;
}

export async function verifyChain(entries: CustodyEntry[]): Promise<ChainVerificationResult> {
  if (entries.length === 0) {
    return { ok: true };
  }

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];

    if (entry.index !== i) {
      return {
        ok: false,
        brokenAt: entry.index,
        reason: `Index mismatch at position ${i}: expected ${i}, found ${entry.index}`,
      };
    }

    if (i === 0) {
      if (entry.prevHash !== GENESIS_PREV_HASH) {
        return {
          ok: false,
          brokenAt: 0,
          reason: `Genesis entry prevHash is not 64 zeros`,
        };
      }
    } else {
      const prevEntry = entries[i - 1];
      if (entry.prevHash !== prevEntry.entryHash) {
        return {
          ok: false,
          brokenAt: entry.index,
          reason: `Chain broken at entry #${entry.index}: prevHash does not match previous entryHash`,
        };
      }
    }

    const expectedHash = await computeEntryHash(
      entry.index,
      entry.time,
      entry.action,
      entry.fileId,
      entry.details,
      entry.prevHash
    );

    if (entry.entryHash !== expectedHash) {
      return {
        ok: false,
        brokenAt: entry.index,
        reason: `Hash mismatch at entry #${entry.index}: entry has been modified`,
      };
    }
  }

  return { ok: true };
}

