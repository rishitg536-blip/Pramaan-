#!/usr/bin/env python3
"""
Pramaan (प्रमाण) · Standalone Verification & Recompute Script
Standard library only (no external dependencies: hashlib, json, sys, os).

Recomputes:
1. Custody log SHA-256 hash chain and continuity.
2. Merkle tree root from file hashes using RFC 6962 prefixes (0x00 leaf, 0x01 inner).
3. Case fingerprint = SHA256("pramaan-1|" + MerkleRoot + "|" + CustodyHead).
4. (Optional) File integrity against actual files on disk.
"""

import sys
import os
import json
import hashlib

def sha256_hex(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()

def canonical_json(obj) -> str:
    """Canonical JSON matching Pramaan canonical.ts: sorted keys, no whitespace."""
    return json.dumps(obj, sort_keys=True, separators=(',', ':'), ensure_ascii=False)

def compute_entry_hash(entry: dict) -> str:
    payload = {
        'action': entry.get('action'),
        'details': entry.get('details', {}),
        'fileId': entry.get('fileId', None),
        'index': entry.get('index', 0),
        'prevHash': entry.get('prevHash') or entry.get('prev') or ('0' * 64),
        'time': entry.get('time') or entry.get('ts') or '',
    }
    return sha256_hex(canonical_json(payload).encode('utf-8'))

def compute_leaf_hash(file_sha256_hex: str) -> str:
    raw = bytes.fromhex(file_sha256_hex)
    return sha256_hex(b'\x00' + raw)

def combine_inner_nodes(left_hex: str, right_hex: str) -> str:
    left_bytes = bytes.fromhex(left_hex)
    right_bytes = bytes.fromhex(right_hex)
    return sha256_hex(b'\x01' + left_bytes + right_bytes)

def build_merkle_tree(file_hashes: list) -> str:
    if not file_hashes:
        return '0' * 64

    leaves = [compute_leaf_hash(h) for h in file_hashes]
    if len(leaves) == 1:
        return leaves[0]

    level = list(leaves)
    while len(level) > 1:
        next_level = []
        for i in range(0, len(level), 2):
            left = level[i]
            right = level[i + 1] if i + 1 < len(level) else left
            next_level.append(combine_inner_nodes(left, right))
        level = next_level

    return level[0]

def verify_fingerprint_file(fp_path: str, files_dir: str = None) -> bool:
    print(f"=== Pramaan Verification Tool ===")
    print(f"Reading fingerprint file: {fp_path}")

    if not os.path.exists(fp_path):
        print(f"[FAIL] Fingerprint file not found: {fp_path}")
        return False

    with open(fp_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    case_id = data.get('caseId', 'UNKNOWN')
    print(f"Case ID: {case_id}")

    # 1. Verify Custody Log Hash Chain
    custody_log = data.get('custodyLog', [])
    print(f"\n1. Checking Custody Log Continuity ({len(custody_log)} entries)...")
    expected_prev = '0' * 64
    custody_valid = True

    for i, entry in enumerate(custody_log):
        entry_prev = entry.get('prevHash') or entry.get('prev')
        if entry_prev != expected_prev:
            print(f"  [FAIL] Entry #{i} prev pointer mismatch!")
            print(f"    Expected: {expected_prev}")
            print(f"    Got:      {entry_prev}")
            custody_valid = False
            break

        entry_hash_in_file = entry.get('entryHash')
        recomputed_entry_hash = compute_entry_hash(entry)

        if entry_hash_in_file != recomputed_entry_hash:
            print(f"  [FAIL] Entry #{i} entryHash mismatch!")
            print(f"    Expected:   {entry_hash_in_file}")
            print(f"    Recomputed: {recomputed_entry_hash}")
            custody_valid = False
            break

        expected_prev = recomputed_entry_hash

    if custody_valid and custody_log:
        custody_head = data.get('custodyHead') or custody_log[-1].get('entryHash')
        print(f"  [OK] Custody chain unbroken. Custody Head: {custody_head[:16]}...")
    elif not custody_log:
        custody_head = data.get('custodyHead', '0' * 64)
        print(f"  [WARN] Custody log is empty.")
    else:
        return False

    # 2. Verify Merkle Root
    evidence_files = data.get('files', [])
    file_hashes = [ef.get('sha256') for ef in evidence_files]
    print(f"\n2. Recomputing Merkle Root from {len(evidence_files)} file hash(es)...")
    recomputed_merkle_root = build_merkle_tree(file_hashes)
    claimed_merkle_root = data.get('merkleRoot')

    if claimed_merkle_root and claimed_merkle_root != recomputed_merkle_root:
        print(f"  [FAIL] Merkle root mismatch!")
        print(f"    In file:    {claimed_merkle_root}")
        print(f"    Recomputed: {recomputed_merkle_root}")
        return False
    else:
        print(f"  [OK] Merkle Root matches: {recomputed_merkle_root[:16]}...")

    # 3. Verify Case Fingerprint
    print(f"\n3. Recomputing Case Fingerprint = SHA256(pramaan-1|MerkleRoot|CustodyHead)...")
    expected_fp_input = f"pramaan-1|{recomputed_merkle_root}|{custody_head}".encode('utf-8')
    recomputed_fp = sha256_hex(expected_fp_input)
    claimed_fp = data.get('caseFingerprint')

    if claimed_fp != recomputed_fp:
        print(f"  [FAIL] Case fingerprint mismatch!")
        print(f"    In file:    {claimed_fp}")
        print(f"    Recomputed: {recomputed_fp}")
        return False
    else:
        print(f"  [OK] Case Fingerprint matches: {recomputed_fp}")

    # 4. Optional: Verify Evidence Files on Disk
    if files_dir:
        print(f"\n4. Checking actual files in {files_dir}...")
        all_files_ok = True
        for ef in evidence_files:
            fname = ef.get('name')
            expected_hash = ef.get('sha256')
            full_path = os.path.join(files_dir, fname)

            if not os.path.exists(full_path):
                print(f"  [FAIL] Missing file: {fname}")
                all_files_ok = False
                continue

            h = hashlib.sha256()
            with open(full_path, 'rb') as f:
                while chunk := f.read(65536):
                    h.update(chunk)
            actual_hash = h.hexdigest()

            if actual_hash != expected_hash:
                print(f"  [FAIL] Hash mismatch for {fname}!")
                print(f"    Expected: {expected_hash}")
                print(f"    Actual:   {actual_hash}")
                all_files_ok = False
            else:
                print(f"  [OK] File {fname} matches SHA-256.")

        if not all_files_ok:
            return False

    print("\n==========================================")
    print(">>> [OK] ALL CRYPTOGRAPHIC CHECKS PASSED <<<")
    print("==========================================")
    return True

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: python verify_pramaan.py <fingerprint.json> [evidence_directory]")
        sys.exit(1)

    fp_file = sys.argv[1]
    files_folder = sys.argv[2] if len(sys.argv) > 2 else None

    success = verify_fingerprint_file(fp_file, files_folder)
    sys.exit(0 if success else 1)
