import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom/client';
import './verify.css';
import { STRINGS } from '../ui/strings';
import { FingerprintFile, MerkleProofStep } from '../core/types';
import { verifyChain } from '../core/custody';
import { buildMerkleTree, computeLeafHash, verifyProof } from '../core/merkle';
import { computeCaseFingerprint } from '../core/fingerprint';
import { hashFileStream } from '../core/hash';
import { Check, X, Copy, Terminal, ShieldAlert, ArrowLeft } from 'lucide-react';

interface CheckedFileResult {
  file: File;
  computedHash: string;
  status: 'MATCH' | 'CHANGED' | 'NOT_IN_CASE';
  message: string;
  matchedId?: string;
}

export function VerifyPage() {
  const [fingerprintFile, setFingerprintFile] = useState<FingerprintFile | null>(null);
  const [fingerprintFileName, setFingerprintFileName] = useState<string>('');
  const [evidenceFiles, setEvidenceFiles] = useState<File[]>([]);
  const [, setHashingProgress] = useState<Record<string, number>>({});
  const [isVerifying, setIsVerifying] = useState(false);
  const [terminalLogs, setTerminalLogs] = useState<string[]>([]);
  const [checkedFiles, setCheckedFiles] = useState<CheckedFileResult[]>([]);
  const [overallResult, setOverallResult] = useState<'IDLE' | 'MATCH' | 'MISMATCH'>('IDLE');
  const [overallMessage, setOverallMessage] = useState<string>('');
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  const fpInputRef = useRef<HTMLInputElement>(null);
  const filesInputRef = useRef<HTMLInputElement>(null);

  const handleQuickExit = () => {
    window.location.replace(STRINGS.safety.quickExitTarget);
  };

  const handleFingerprintUpload = async (file: File) => {
    try {
      setFingerprintFileName(file.name);
      const text = await file.text();
      const parsed = JSON.parse(text) as FingerprintFile;
      setFingerprintFile(parsed);
      setTerminalLogs((prev) => [
        ...prev,
        `[LOAD] Loaded fingerprint file: ${file.name} (Case ID: ${parsed.caseId || 'unknown'})`,
      ]);
    } catch {
      setFingerprintFile(null);
      setOverallResult('MISMATCH');
      setOverallMessage('Invalid JSON format in fingerprint file.');
      setTerminalLogs((prev) => [
        ...prev,
        `[ERROR] Failed to parse fingerprint file: ${file.name}`,
      ]);
    }
  };

  const handleEvidenceUpload = (files: FileList | File[]) => {
    const list = Array.from(files);
    setEvidenceFiles((prev) => [...prev, ...list]);
    setTerminalLogs((prev) => [
      ...prev,
      `[LOAD] Added ${list.length} evidence file(s) for verification`,
    ]);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedHash(text);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  useEffect(() => {
    if (!fingerprintFile) {
      if (evidenceFiles.length > 0) {
        setOverallResult('IDLE');
        setOverallMessage('Please provide the fingerprint JSON file.');
      }
      return;
    }

    let isMounted = true;

    async function runVerification() {
      setIsVerifying(true);
      const logs: string[] = [];
      logs.push(`=== PRAMAAN VERIFICATION PROTOCOL ===`);
      logs.push(`Target Case ID: ${fingerprintFile!.caseId}`);
      logs.push(`Sealed At: ${fingerprintFile!.sealedAt}`);

      // Check 1: File format
      if (fingerprintFile!.version !== 'pramaan-1' || fingerprintFile!.algorithm !== 'SHA-256') {
        logs.push(`[FAIL] Format check failed: version=${fingerprintFile!.version}, alg=${fingerprintFile!.algorithm}`);
        if (isMounted) {
          setTerminalLogs(logs);
          setOverallResult('MISMATCH');
          setOverallMessage('Fingerprint format or version is not supported.');
          setIsVerifying(false);
        }
        return;
      }
      logs.push(`[PASS] Format check: version pramaan-1, algorithm SHA-256`);

      // Check 2: Custody chain
      logs.push(`[RUN] Verifying custody log integrity (${fingerprintFile!.custodyLog?.length || 0} entries)...`);
      const chainCheck = await verifyChain(fingerprintFile!.custodyLog || []);
      if (!chainCheck.ok) {
        logs.push(`[FAIL] ✗ Custody chain broken at entry #${chainCheck.brokenAt}: ${chainCheck.reason}`);
        if (isMounted) {
          setTerminalLogs(logs);
          setOverallResult('MISMATCH');
          setOverallMessage(`Custody chain broken at entry #${chainCheck.brokenAt}.`);
          setIsVerifying(false);
        }
        return;
      }
      logs.push(`[PASS] ✓ Custody chain verified: all ${fingerprintFile!.custodyLog.length} links intact.`);

      // Check 3: Seal consistency
      const log = fingerprintFile!.custodyLog || [];
      const sealIndex = log.findIndex(
        (e) => e.action === 'SEAL_GENERATED' && (!e.details?.merkleRoot || e.details?.merkleRoot === fingerprintFile!.merkleRoot)
      );
      const sealEntry = sealIndex !== -1 ? log[sealIndex] : log[log.length - 1];

      if (!sealEntry || sealEntry.action !== 'SEAL_GENERATED') {
        logs.push(`[FAIL] ✗ SEAL_GENERATED record not found in custody log.`);
        if (isMounted) {
          setTerminalLogs(logs);
          setOverallResult('MISMATCH');
          setOverallMessage('Sealing record missing from custody log.');
          setIsVerifying(false);
        }
        return;
      }

      let expectedCustodyHead = '0'.repeat(64);
      if (sealIndex > 0) {
        expectedCustodyHead = log[sealIndex - 1].entryHash;
      } else if (sealIndex === -1 && log.length >= 2) {
        expectedCustodyHead = log[log.length - 2].entryHash;
      }

      if (fingerprintFile!.custodyHead !== expectedCustodyHead) {
        logs.push(`[FAIL] ✗ custodyHead mismatch: ${fingerprintFile!.custodyHead} vs expected ${expectedCustodyHead}`);
        if (isMounted) {
          setTerminalLogs(logs);
          setOverallResult('MISMATCH');
          setOverallMessage('Seal custody head mismatch.');
          setIsVerifying(false);
        }
        return;
      }
      logs.push(`[PASS] ✓ Custody head matches log state before seal.`);

      // Recompute Merkle root
      const fileHashes = (fingerprintFile!.files || []).map((f) => f.sha256);
      if (fileHashes.length === 0) {
        logs.push(`[FAIL] ✗ Fingerprint contains 0 files.`);
        if (isMounted) {
          setTerminalLogs(logs);
          setOverallResult('MISMATCH');
          setOverallMessage('Fingerprint contains 0 files.');
          setIsVerifying(false);
        }
        return;
      }

      const recomputedTree = await buildMerkleTree(fileHashes);
      if (recomputedTree.root !== fingerprintFile!.merkleRoot) {
        logs.push(`[FAIL] ✗ Recomputed Merkle root (${recomputedTree.root}) does not match declared root (${fingerprintFile!.merkleRoot})`);
        if (isMounted) {
          setTerminalLogs(logs);
          setOverallResult('MISMATCH');
          setOverallMessage('Merkle tree root discrepancy detected.');
          setIsVerifying(false);
        }
        return;
      }
      logs.push(`[PASS] ✓ Merkle root matches (${fingerprintFile!.merkleRoot.substring(0, 16)}...).`);

      // Recompute case fingerprint
      const expectedFingerprint = await computeCaseFingerprint(
        fingerprintFile!.merkleRoot,
        fingerprintFile!.custodyHead
      );
      if (expectedFingerprint !== fingerprintFile!.caseFingerprint) {
        logs.push(`[FAIL] ✗ Case fingerprint mismatch: ${fingerprintFile!.caseFingerprint} vs ${expectedFingerprint}`);
        if (isMounted) {
          setTerminalLogs(logs);
          setOverallResult('MISMATCH');
          setOverallMessage('Case fingerprint mismatch.');
          setIsVerifying(false);
        }
        return;
      }
      logs.push(`[PASS] ✓ Case fingerprint verified (${fingerprintFile!.caseFingerprint.substring(0, 16)}...).`);

      // Check 4: Check evidence files if provided
      if (evidenceFiles.length === 0) {
        logs.push(`[PASS] ✓ Structural cryptographic checks passed: Chain intact, Merkle root verified.`);
        logs.push(`[WAIT] Awaiting evidence files in Step 2 for 1-to-1 comparison.`);
        if (isMounted) {
          setTerminalLogs(logs);
          setOverallResult('IDLE');
          setOverallMessage('Fingerprint JSON verified. Custody chain unbroken and Merkle root verified. Drop files into Step 2 to verify individual evidence.');
          setIsVerifying(false);
        }
        return;
      }

      logs.push(`[RUN] Fingerprinting ${evidenceFiles.length} evidence file(s)...`);
      const fileResults: CheckedFileResult[] = [];
      let allFilesMatched = true;

      for (const file of evidenceFiles) {
        logs.push(`[HASHING] Streaming SHA-256 for "${file.name}" (${file.size} bytes)...`);
        const hash = await hashFileStream(file, (p) => {
          if (isMounted) {
            setHashingProgress((prev) => ({ ...prev, [file.name]: p }));
          }
        });

        logs.push(`[HASHED] "${file.name}" => ${hash}`);

        const matchedByHash = fingerprintFile!.files.find(
          (f) => f.sha256.toLowerCase() === hash.toLowerCase()
        );

        if (matchedByHash) {
          const proof: MerkleProofStep[] = fingerprintFile!.proofs?.[matchedByHash.id] || [];
          const leaf = await computeLeafHash(hash);
          const proofOk = await verifyProof(leaf, proof, fingerprintFile!.merkleRoot);

          if (proofOk) {
            logs.push(`[MATCH] ✓ "${file.name}" matches ${matchedByHash.name} (id: ${matchedByHash.id}) and Merkle proof is valid.`);
            fileResults.push({
              file,
              computedHash: hash,
              status: 'MATCH',
              message: STRINGS.verify.statusMatch,
              matchedId: matchedByHash.id,
            });
          } else {
            logs.push(`[FAIL] ✗ "${file.name}" hash found, but Merkle inclusion proof failed.`);
            allFilesMatched = false;
            fileResults.push({
              file,
              computedHash: hash,
              status: 'CHANGED',
              message: 'Hash found in case, but Merkle proof failed.',
            });
          }
        } else {
          const matchedByName = fingerprintFile!.files.find(
            (f) => f.name.toLowerCase() === file.name.toLowerCase()
          );

          if (matchedByName) {
            logs.push(`[CHANGED] ✗ "${file.name}" name matches a sealed file, but its SHA-256 does NOT match.`);
            allFilesMatched = false;
            fileResults.push({
              file,
              computedHash: hash,
              status: 'CHANGED',
              message: STRINGS.verify.statusChanged,
            });
          } else {
            logs.push(`[NOT IN CASE] ✗ "${file.name}" is not part of this sealed case.`);
            allFilesMatched = false;
            fileResults.push({
              file,
              computedHash: hash,
              status: 'NOT_IN_CASE',
              message: STRINGS.verify.statusNotInCase,
            });
          }
        }
      }

      if (isMounted) {
        setCheckedFiles(fileResults);
        setTerminalLogs(logs);
        if (allFilesMatched) {
          setOverallResult('MATCH');
          setOverallMessage('All checked files match the sealed fingerprint.');
        } else {
          setOverallResult('MISMATCH');
          setOverallMessage('One or more files do not match the sealed fingerprint.');
        }
        setIsVerifying(false);
      }
    }

    runVerification();

    return () => {
      isMounted = false;
    };
  }, [fingerprintFile, evidenceFiles]);

  return (
    <div className="min-h-screen flex flex-col justify-between">
      {/* Top sticky terminal header */}
      <header className="sticky top-0 z-50 bg-terminal border-b-2 border-ink text-terminal-text px-4 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center space-x-3 text-xs md:text-sm font-mono">
          <span className="text-green font-bold">$</span>
          <span className="text-terminal-text font-bold">pramaan verify --offline</span>
          <span className="hidden sm:inline bg-field text-white px-2 py-0.5 rounded text-[11px] font-mono">
            STANDALONE
          </span>
        </div>
        <div className="flex items-center space-x-3">
          <a
            href="index.html"
            className="flex items-center space-x-1 text-xs font-mono px-3 py-1 bg-paper text-ink border border-ink rounded hover:bg-yellow transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Open Case Workspace</span>
          </a>
          <button
            data-guide="global.quickExit"
            onClick={handleQuickExit}
            className="text-xs font-mono px-3 py-1 bg-red text-white border border-ink rounded font-bold hover:opacity-90"
            title="Immediately leave this page"
          >
            {STRINGS.safety.quickExit}
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-5xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex-1">
        <div className="mb-8">
          <div className="inline-block px-3 py-1 bg-yellow text-ink border border-ink text-xs font-mono font-bold mb-3 uppercase">
            Standalone Verification Mode
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-ink">
            {STRINGS.verify.title}
          </h1>
          <p className="mt-2 text-muted text-sm sm:text-base max-w-2xl">
            {STRINGS.verify.subtitle}
          </p>
        </div>

        {/* Drop Zones */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Dropzone 1: Fingerprint JSON */}
          <div
            data-guide="verify.dropFp"
            onClick={() => fpInputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (e.dataTransfer.files[0]) {
                handleFingerprintUpload(e.dataTransfer.files[0]);
              }
            }}
            className={`neo-card p-6 cursor-pointer border-2 transition-all ${
              fingerprintFile
                ? 'border-green bg-green/10'
                : 'border-dashed border-ink hover:bg-white/60'
            }`}
          >
            <input
              type="file"
              data-guide="verify.selectFp"
              ref={fpInputRef}
              accept=".json"
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.[0]) {
                  handleFingerprintUpload(e.target.files[0]);
                }
              }}
            />
            <div className="flex items-center justify-between mb-3">
              <span className="font-mono text-xs font-bold uppercase bg-yellow text-ink px-2 py-0.5 border border-ink">
                STEP 1
              </span>
              {fingerprintFile && (
                <span className="font-mono text-xs text-green font-bold flex items-center gap-1">
                  <Check className="w-4 h-4" /> LOADED
                </span>
              )}
            </div>
            <h2 className="text-lg font-bold text-ink mb-1">
              {STRINGS.verify.dropFingerprintTitle}
            </h2>
            <p className="text-xs text-muted mb-4">
              {STRINGS.verify.dropFingerprintDesc}
            </p>
            {fingerprintFile ? (
              <div className="bg-terminal text-terminal-text p-3 rounded text-xs font-mono space-y-1">
                <div>File: <span className="text-yellow">{fingerprintFileName}</span></div>
                <div>Case ID: <span className="text-blue">{fingerprintFile.caseId}</span></div>
                <div>Files sealed: <span className="text-green">{fingerprintFile.files.length}</span></div>
                <div>Root: <span className="text-gray-400">{fingerprintFile.merkleRoot.substring(0, 16)}...</span></div>
              </div>
            ) : (
              <div className="border border-dashed border-muted py-6 text-center text-xs font-mono text-muted">
                + Click or drop pramaan-*.json here
              </div>
            )}
          </div>

          {/* Dropzone 2: Evidence Files */}
          <div
            data-guide="verify.dropFiles"
            onClick={() => filesInputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (e.dataTransfer.files.length > 0) {
                handleEvidenceUpload(e.dataTransfer.files);
              }
            }}
            className="neo-card p-6 cursor-pointer border-dashed border-2 border-ink hover:bg-white/60 transition-all"
          >
            <input
              type="file"
              data-guide="verify.selectFiles"
              ref={filesInputRef}
              multiple
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  handleEvidenceUpload(e.target.files);
                }
              }}
            />
            <div className="flex items-center justify-between mb-3">
              <span className="font-mono text-xs font-bold uppercase bg-pink text-ink px-2 py-0.5 border border-ink">
                STEP 2
              </span>
              {evidenceFiles.length > 0 && (
                <span className="font-mono text-xs text-ink font-bold">
                  {evidenceFiles.length} file{evidenceFiles.length === 1 ? '' : 's'} added
                </span>
              )}
            </div>
            <h2 className="text-lg font-bold text-ink mb-1">
              {STRINGS.verify.dropEvidenceTitle}
            </h2>
            <p className="text-xs text-muted mb-4">
              {STRINGS.verify.dropEvidenceDesc}
            </p>
            {evidenceFiles.length > 0 ? (
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {evidenceFiles.map((f, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-2 bg-paper border border-ink rounded text-xs font-mono"
                  >
                    <span className="truncate max-w-[200px]">{f.name}</span>
                    <span className="text-muted">{(f.size / 1024).toFixed(1)} KB</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="border border-dashed border-muted py-6 text-center text-xs font-mono text-muted">
                + Click or drop evidence files here to check
              </div>
            )}
          </div>
        </div>

        {/* Verification Status Banner when fingerprint is loaded and verified, awaiting files */}
        {fingerprintFile && overallResult === 'IDLE' && (
          <div
            data-guide="verify.stamp"
            aria-live="polite"
            className="mb-8 p-6 neo-card bg-paper border-4 border-ink relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6 shadow-brutal"
          >
            <div className="space-y-2 z-10 max-w-xl">
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-green flex items-center gap-1">
                <Check className="w-4 h-4 text-green" /> CRYPTOGRAPHIC VERIFICATION PASSED
              </span>
              <h3 className="text-2xl font-black text-ink">
                Fingerprint JSON Confirmed Intact
              </h3>
              <p className="text-sm font-mono text-muted">
                Custody hash chain is unbroken ({fingerprintFile.custodyLog?.length || 0} entries), Merkle root matches {fingerprintFile.files?.length || 0} sealed record(s), and Case Fingerprint is authentic.
              </p>
              <div className="pt-2 text-xs font-mono text-ink font-bold">
                👉 Now drag or choose evidence files into STEP 2 to cross-check file contents.
              </div>
            </div>

            {/* Rubber Stamp for Valid Fingerprint */}
            <div
              className="transform -rotate-6 border-4 px-6 py-3 font-mono font-black text-xl md:text-2xl tracking-widest uppercase select-none rounded shadow-brutal border-green text-green bg-green/10"
            >
              ✓ FINGERPRINT VALID
            </div>
          </div>
        )}

        {/* Verification Status & Big Rubber Stamp */}
        {overallResult !== 'IDLE' && (
          <div
            data-guide="verify.stamp"
            aria-live="polite"
            className="mb-8 p-6 neo-card bg-paper relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6"
          >
            <div className="space-y-2 z-10 max-w-xl">
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-muted">
                VERIFICATION OUTCOME
              </span>
              <h3 className="text-2xl font-black text-ink">
                {overallResult === 'MATCH' ? 'Integrity Confirmed' : 'Verification Issue Detected'}
              </h3>
              <p className="text-sm font-mono text-muted">{overallMessage}</p>
            </div>

            {/* Big Rubber Stamp */}
            <div
              className={`transform -rotate-6 border-4 px-6 py-3 font-mono font-black text-2xl md:text-3xl tracking-widest uppercase select-none rounded shadow-brutal transition-transform ${
                overallResult === 'MATCH'
                  ? 'border-green text-green bg-green/10'
                  : 'border-red text-red bg-red/10'
              }`}
            >
              {overallResult === 'MATCH' ? STRINGS.verify.matchStamp : STRINGS.verify.mismatchStamp}
            </div>
          </div>
        )}

        {/* Checked Files Detailed List */}
        {checkedFiles.length > 0 && (
          <div className="mb-8 space-y-4">
            <h3 className="text-xl font-black text-ink font-sans">
              Evaluated Files ({checkedFiles.length})
            </h3>
            <div className="space-y-3">
              {checkedFiles.map((res, i) => (
                <div
                  key={i}
                  className={`neo-card p-4 border-2 ${
                    res.status === 'MATCH'
                      ? 'border-green bg-green/5'
                      : 'border-red bg-red/5'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                    <div className="flex items-center space-x-2">
                      {res.status === 'MATCH' ? (
                        <span className="p-1 rounded bg-green text-ink border border-ink">
                          <Check className="w-4 h-4" />
                        </span>
                      ) : (
                        <span className="p-1 rounded bg-red text-white border border-ink">
                          <X className="w-4 h-4" />
                        </span>
                      )}
                      <span className="font-bold text-sm text-ink">{res.file.name}</span>
                      <span className="text-xs text-muted font-mono">
                        ({(res.file.size / 1024).toFixed(1)} KB)
                      </span>
                    </div>
                    <span
                      className={`text-xs font-mono font-bold px-2 py-0.5 rounded border border-ink ${
                        res.status === 'MATCH'
                          ? 'bg-green text-ink'
                          : 'bg-red text-white'
                      }`}
                    >
                      {res.status === 'MATCH' ? '✓ MATCH' : res.status === 'CHANGED' ? '✗ CHANGED' : '✗ NOT IN CASE'}
                    </span>
                  </div>

                  <p className="text-xs font-mono text-muted mb-3">{res.message}</p>

                  {/* Hash & Cross Check Box */}
                  <div className="bg-terminal text-terminal-text p-3 rounded font-mono text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-muted">Computed SHA-256:</span>
                      <button
                        data-guide="evidence.copyHash"
                        onClick={() => copyToClipboard(res.computedHash)}
                        className="flex items-center space-x-1 text-yellow hover:underline"
                        title="Copy SHA-256 hash"
                      >
                        <Copy className="w-3 h-3" />
                        <span>{copiedHash === res.computedHash ? 'COPIED!' : 'COPY'}</span>
                      </button>
                    </div>
                    <div className="break-all text-terminal-text bg-black/40 p-1.5 rounded font-mono text-[11px]">
                      {res.computedHash}
                    </div>

                    <div data-guide="verify.crosscheck" className="pt-2 border-t border-gray-800 text-[11px] text-gray-400 space-y-1">
                      <div className="text-muted font-bold">{STRINGS.verify.crossCheckTitle}</div>
                      <div>
                        <span className="text-green">Linux:</span> <code>sha256sum "{res.file.name}"</code>
                      </div>
                      <div>
                        <span className="text-blue">macOS:</span> <code>shasum -a 256 "{res.file.name}"</code>
                      </div>
                      <div>
                        <span className="text-yellow">Windows:</span> <code>Get-FileHash -Algorithm SHA256 "{res.file.name}"</code>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Timestamp Verification Card */}
        {fingerprintFile && (
          <div data-guide="verify.timestamp" className="neo-card p-6 bg-white border-2 border-ink mb-8 space-y-3 font-mono text-xs shadow-brutal">
            <div className="flex items-center justify-between border-b border-ink/20 pb-2">
              <span className="font-bold uppercase text-ink">PUBLIC TIMESTAMP ATTESTATION</span>
              <span className="px-2 py-0.5 bg-yellow/20 text-ink font-bold border border-yellow">
                {fingerprintFile.timestamp?.status?.toUpperCase() || 'DEMO / NOT ANCHORED'}
              </span>
            </div>
            <p className="text-muted">
              Attested Digest: <span className="text-ink font-bold break-all">{fingerprintFile.timestamp?.digest || fingerprintFile.caseFingerprint}</span>
            </p>
            {fingerprintFile.timestamp?.blockHeight && (
              <p className="text-muted">
                Bitcoin Block Height: <span className="text-ink font-bold">#{fingerprintFile.timestamp.blockHeight}</span>
              </p>
            )}
            <div className="bg-paper p-3 border border-ink/30 space-y-1">
              <div className="font-bold text-ink">Independent CLI verification:</div>
              <code>ots verify &lt;fingerprint_file.json.ots&gt;</code>
            </div>
          </div>
        )}

        {/* Terminal Output Log */}
        <div className="neo-card bg-terminal text-terminal-text border-2 border-ink p-4 mb-8">
          <div className="flex items-center space-x-2 text-xs font-mono text-muted pb-3 mb-3 border-b border-gray-800">
            <Terminal className="w-4 h-4 text-green" />
            <span>{STRINGS.verify.runTerminalTitle}</span>
            {isVerifying && (
              <span className="text-yellow animate-pulse ml-auto font-mono text-[11px]">
                [PROCESSING...]
              </span>
            )}
          </div>
          <div className="font-mono text-xs space-y-1 max-h-60 overflow-y-auto">
            {terminalLogs.length === 0 ? (
              <span className="text-gray-500">// Drop files above to start verification sequence...</span>
            ) : (
              terminalLogs.map((line, idx) => (
                <div
                  key={idx}
                  className={
                    line.includes('[FAIL]') || line.includes('[ERROR]') || line.includes('[CHANGED]')
                      ? 'text-red'
                      : line.includes('[PASS]') || line.includes('[MATCH]')
                      ? 'text-green'
                      : line.includes('===')
                      ? 'text-yellow font-bold'
                      : 'text-gray-300'
                  }
                >
                  {line}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Honest Limits Note */}
        <div className="neo-card p-4 bg-paper border-2 border-ink flex items-start space-x-3 mb-8">
          <ShieldAlert className="w-5 h-5 text-ink flex-shrink-0 mt-0.5" />
          <p className="text-xs text-muted leading-relaxed">
            {STRINGS.verify.limitsNote}
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t-2 border-ink bg-paper py-4 px-6 text-center text-xs font-mono text-muted">
        <span>{STRINGS.app.name} Standalone Verifier · {STRINGS.app.allSystemsLocal} · {STRINGS.app.draftNotice}</span>
      </footer>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <VerifyPage />
  </React.StrictMode>
);
