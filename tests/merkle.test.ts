import { describe, it, expect } from 'vitest';
import {
  buildMerkleTree,
  computeLeafHash,
  combineInnerNodes,
  verifyProof,
} from '../src/core/merkle';
import { sha256Hex } from '../src/core/hash';

describe('Merkle Tree and Proofs', () => {
  const dummyHash = (i: number) =>
    (i.toString(16).padStart(2, '0') + 'a1b2c3d4e5f60718293a4b5c6d7e8f90').repeat(2).slice(0, 64);

  it('builds tree and verifies proofs for leaf counts 1, 2, 3, 4, 5, 7, 8', async () => {
    const leafCounts = [1, 2, 3, 4, 5, 7, 8];

    for (const count of leafCounts) {
      const hashes = Array.from({ length: count }, (_, i) => dummyHash(i + 1));
      const tree = await buildMerkleTree(hashes);

      expect(tree.leaves.length).toBe(count);
      expect(tree.proofs.length).toBe(count);
      expect(tree.root).toBeDefined();
      expect(tree.root.length).toBe(64);

      for (let i = 0; i < count; i++) {
        const leaf = tree.leaves[i];
        const proof = tree.proofs[i];
        const valid = await verifyProof(leaf, proof, tree.root);
        expect(valid).toBe(true);

        // Invalid root should fail
        const badRoot = '0'.repeat(64);
        const invalid = await verifyProof(leaf, proof, badRoot);
        expect(invalid).toBe(false);
      }
    }
  });

  it('changes the root when one leaf byte is changed', async () => {
    const hashesA = [dummyHash(1), dummyHash(2), dummyHash(3), dummyHash(4)];
    const hashesB = [...hashesA];
    // Change last byte of first hash
    hashesB[0] = hashesB[0].slice(0, 62) + 'ff';

    const treeA = await buildMerkleTree(hashesA);
    const treeB = await buildMerkleTree(hashesB);

    expect(treeA.root).not.toBe(treeB.root);
  });

  it('uses domain separation prefixes (leaf 0x00 and inner 0x01)', async () => {
    const h1 = dummyHash(1);
    const h2 = dummyHash(2);

    const leaf1 = await computeLeafHash(h1);
    const leaf2 = await computeLeafHash(h2);

    const tree = await buildMerkleTree([h1, h2]);

    // Unprefixed combined hash of the two leaves
    const unprefixedHash = await sha256Hex(leaf1 + leaf2);
    expect(tree.root).not.toBe(unprefixedHash);

    // Inner node with prefix 0x01
    const manualInner = await combineInnerNodes(leaf1, leaf2);
    expect(tree.root).toBe(manualInner);
  });

  it('carries odd nodes up unchanged (verifies fixed expected root for 3 leaves)', async () => {
    const h1 = dummyHash(1);
    const h2 = dummyHash(2);
    const h3 = dummyHash(3);

    const l1 = await computeLeafHash(h1);
    const l2 = await computeLeafHash(h2);
    const l3 = await computeLeafHash(h3);

    const p0 = await combineInnerNodes(l1, l2);
    // l3 is carried up unchanged to level 1, then combined with p0
    const expectedRoot = await combineInnerNodes(p0, l3);

    const tree = await buildMerkleTree([h1, h2, h3]);
    expect(tree.root).toBe(expectedRoot);

    // Check proof paths
    // Leaf 1: sibling l2 (right), sibling l3 (right)
    expect(tree.proofs[0]).toEqual([
      { side: 'right', hash: l2 },
      { side: 'right', hash: l3 },
    ]);
    // Leaf 2: sibling l1 (left), sibling l3 (right)
    expect(tree.proofs[1]).toEqual([
      { side: 'left', hash: l1 },
      { side: 'right', hash: l3 },
    ]);
    // Leaf 3: carried up at level 0, sibling at level 1 is p0 (left)
    expect(tree.proofs[2]).toEqual([{ side: 'left', hash: p0 }]);
  });
});

