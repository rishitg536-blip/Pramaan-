import { hexToBytes, sha256Hex } from './hash';
import { MerkleProofStep } from './types';

export async function computeLeafHash(fileSha256Hex: string): Promise<string> {
  const raw = hexToBytes(fileSha256Hex);
  const data = new Uint8Array(1 + raw.length);
  data[0] = 0x00;
  data.set(raw, 1);
  return sha256Hex(data);
}

export async function combineInnerNodes(leftHex: string, rightHex: string): Promise<string> {
  const leftBytes = hexToBytes(leftHex);
  const rightBytes = hexToBytes(rightHex);
  const data = new Uint8Array(1 + 32 + 32);
  data[0] = 0x01;
  data.set(leftBytes, 1);
  data.set(rightBytes, 33);
  return sha256Hex(data);
}

export interface MerkleTreeResult {
  root: string;
  leaves: string[];
  proofs: MerkleProofStep[][];
}

export async function buildMerkleTree(fileHashes: string[]): Promise<MerkleTreeResult> {
  if (fileHashes.length === 0) {
    throw new Error('Cannot build Merkle tree with 0 files');
  }

  const leaves: string[] = [];
  for (const h of fileHashes) {
    leaves.push(await computeLeafHash(h));
  }

  if (leaves.length === 1) {
    return {
      root: leaves[0],
      leaves,
      proofs: [[]],
    };
  }

  const proofs: MerkleProofStep[][] = leaves.map(() => []);
  let level = [...leaves];
  let currentIndices = leaves.map((_, i) => i);

  while (level.length > 1) {
    const nextLevel: string[] = [];
    const nextIndices = new Array<number>(currentIndices.length);

    for (let j = 0; j < level.length; j += 2) {
      if (j + 1 < level.length) {
        const leftNode = level[j];
        const rightNode = level[j + 1];
        const parentNode = await combineInnerNodes(leftNode, rightNode);
        const parentIdx = nextLevel.length;
        nextLevel.push(parentNode);

        for (let k = 0; k < currentIndices.length; k++) {
          if (currentIndices[k] === j) {
            proofs[k].push({ side: 'right', hash: rightNode });
            nextIndices[k] = parentIdx;
          } else if (currentIndices[k] === j + 1) {
            proofs[k].push({ side: 'left', hash: leftNode });
            nextIndices[k] = parentIdx;
          }
        }
      } else {
        // Odd count: carry up unchanged to the next level
        const carriedNode = level[j];
        const parentIdx = nextLevel.length;
        nextLevel.push(carriedNode);

        for (let k = 0; k < currentIndices.length; k++) {
          if (currentIndices[k] === j) {
            // Carried-up levels contribute no proof step
            nextIndices[k] = parentIdx;
          }
        }
      }
    }

    level = nextLevel;
    currentIndices = nextIndices;
  }

  return {
    root: level[0],
    leaves,
    proofs,
  };
}

export async function verifyProof(
  leafHex: string,
  proof: MerkleProofStep[],
  rootHex: string
): Promise<boolean> {
  let current = leafHex;
  for (const step of proof) {
    if (step.side === 'right') {
      current = await combineInnerNodes(current, step.hash);
    } else if (step.side === 'left') {
      current = await combineInnerNodes(step.hash, current);
    } else {
      return false;
    }
  }
  return current.toLowerCase() === rootHex.toLowerCase();
}

