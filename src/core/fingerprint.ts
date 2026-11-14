import { sha256Hex } from './hash';
import { buildMerkleTree, computeLeafHash, verifyProof } from './merkle';
import { GENESIS_PREV_HASH, verifyChain } from './custody';
import { CustodyEntry, EvidenceFileMeta, FingerprintFile, MerkleProofStep } from './types';

export async function computeCaseFingerprint(
  merkleRoot: string,
  custodyHead: string
): Promise<string> {
  const payload = `pramaan-1|${merkleRoot}|${custodyHead}`;
  return sha256Hex(payload);
}

export async function buildFingerprintFile(params: {
  caseId: string;
  sealedAt: string;
  files: EvidenceFileMeta[];
  custodyLog: CustodyEntry[];
}): Promise<FingerprintFile> {
  const { caseId, sealedAt, files, custodyLog } = params;

  if (files.length === 0) {
    throw new Error('Cannot build fingerprint file with 0 files');
  }

  // Derive custody head (the entryHash before SEAL_GENERATED)
  const sealIndex = custodyLog.findIndex((e) => e.action === 'SEAL_GENERATED');
  let custodyHead = GENESIS_PREV_HASH;
  if (sealIndex > 0) {
    custodyHead = custodyLog[sealIndex - 1].entryHash;
  } else if (sealIndex === 0) {
    custodyHead = GENESIS_PREV_HASH;
  } else if (custodyLog.length >= 2) {
    custodyHead = custodyLog[custodyLog.length - 2].entryHash;
  } else if (custodyLog.length === 1 && custodyLog[0].action !== 'SEAL_GENERATED') {
    custodyHead = custodyLog[0].entryHash;
  }

  const fileHashes = files.map((f) => f.sha256);
  const tree = await buildMerkleTree(fileHashes);

  const proofsMap: Record<string, MerkleProofStep[]> = {};
  const fileEntries: FingerprintFile['files'] = [];

  for (let i = 0; i < files.length; i++) {
    const f = files[i];
    proofsMap[f.id] = tree.proofs[i];
    fileEntries.push({
      id: f.id,
      name: f.name,
      size: f.size,
      sha256: f.sha256,
      addedAt: f.addedAt,
      leaf: tree.leaves[i],
    });
  }

  const caseFingerprint = await computeCaseFingerprint(tree.root, custodyHead);

  return {
    version: 'pramaan-1',
    algorithm: 'SHA-256',
    caseId,
    sealedAt,
    files: fileEntries,
    merkleRoot: tree.root,
    proofs: proofsMap,
    custodyHead,
    caseFingerprint,
    custodyLog,
    timestamp: {
      status: 'not_requested',
    },
  };
}

export interface FingerprintValidationResult {
  ok: boolean;
  step?: string;
  reason?: string;
}

export async function verifyFingerprintFile(
  fp: unknown
): Promise<FingerprintValidationResult> {
  if (!fp || typeof fp !== 'object') {
    return { ok: false, step: 'format', reason: 'Invalid JSON or not an object' };
  }

  const file = fp as Partial<FingerprintFile>;

  // Check 1: Format
  if (file.version !== 'pramaan-1') {
    return {
      ok: false,
      step: 'format',
      reason: `Unsupported version: ${file.version}, expected pramaan-1`,
    };
  }

  if (file.algorithm !== 'SHA-256') {
    return {
      ok: false,
      step: 'format',
      reason: `Unsupported algorithm: ${file.algorithm}, expected SHA-256`,
    };
  }

  if (!file.caseId || !file.sealedAt || !file.merkleRoot || !file.caseFingerprint) {
    return {
      ok: false,
      step: 'format',
      reason: 'Missing required root fields in fingerprint file',
    };
  }

  if (!Array.isArray(file.files) || file.files.length === 0) {
    return {
      ok: false,
      step: 'format',
      reason: 'Fingerprint file must contain at least one file',
    };
  }

  if (!Array.isArray(file.custodyLog) || file.custodyLog.length === 0) {
    return {
      ok: false,
      step: 'format',
      reason: 'Custody log is missing or empty',
    };
  }

  // Check 2: Custody chain
  const chainCheck = await verifyChain(file.custodyLog);
  if (!chainCheck.ok) {
    return {
      ok: false,
      step: 'custody',
      reason: `Chain broken at entry #${chainCheck.brokenAt}: ${chainCheck.reason}`,
    };
  }

  // Check 3: Seal consistency in log
  const sealIndex = file.custodyLog.findIndex(
    (e) => e.action === 'SEAL_GENERATED' && (!e.details?.merkleRoot || e.details?.merkleRoot === file.merkleRoot)
  );
  const sealEntry = sealIndex !== -1 ? file.custodyLog[sealIndex] : file.custodyLog[file.custodyLog.length - 1];

  if (!sealEntry || sealEntry.action !== 'SEAL_GENERATED') {
    return {
      ok: false,
      step: 'seal',
      reason: `No SEAL_GENERATED entry found in custody log`,
    };
  }

  let expectedCustodyHead = GENESIS_PREV_HASH;
  if (sealIndex > 0) {
    expectedCustodyHead = file.custodyLog[sealIndex - 1].entryHash;
  } else if (sealIndex === -1 && file.custodyLog.length >= 2) {
    expectedCustodyHead = file.custodyLog[file.custodyLog.length - 2].entryHash;
  }

  if (file.custodyHead !== expectedCustodyHead) {
    return {
      ok: false,
      step: 'seal',
      reason: `custodyHead ${file.custodyHead} does not match entryHash before seal (${expectedCustodyHead})`,
    };
  }

  // Recompute Merkle root
  const fileHashes = file.files.map((f) => f.sha256);
  const recomputedTree = await buildMerkleTree(fileHashes);

  if (recomputedTree.root !== file.merkleRoot) {
    return {
      ok: false,
      step: 'merkle',
      reason: `Merkle root mismatch: expected ${file.merkleRoot}, recomputed ${recomputedTree.root}`,
    };
  }

  // Verify each file's leaf and proof
  for (let i = 0; i < file.files.length; i++) {
    const f = file.files[i];
    const expectedLeaf = await computeLeafHash(f.sha256);
    if (f.leaf !== expectedLeaf) {
      return {
        ok: false,
        step: 'merkle',
        reason: `Leaf hash mismatch for file ${f.name} (${f.id})`,
      };
    }

    const proof = file.proofs?.[f.id];
    if (!proof) {
      return {
        ok: false,
        step: 'merkle',
        reason: `Missing proof for file ${f.name} (${f.id})`,
      };
    }

    const proofValid = await verifyProof(f.leaf, proof, file.merkleRoot);
    if (!proofValid) {
      return {
        ok: false,
        step: 'merkle',
        reason: `Proof verification failed for file ${f.name} (${f.id})`,
      };
    }
  }

  // Check 4: Recompute case fingerprint
  const expectedFingerprint = await computeCaseFingerprint(
    file.merkleRoot,
    file.custodyHead
  );
  if (expectedFingerprint !== file.caseFingerprint) {
    return {
      ok: false,
      step: 'fingerprint',
      reason: `Case fingerprint mismatch: expected ${file.caseFingerprint}, computed ${expectedFingerprint}`,
    };
  }

  return { ok: true };
}

