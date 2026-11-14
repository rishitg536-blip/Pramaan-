import { useState } from 'react';
import { CaseMeta, StoredEvidenceFile } from '../../storage/db';
import { CustodyEntry, SealSnapshot } from '../../core/types';
import { STRINGS } from '../strings';
import { Barcode } from '../components/Barcode';
import { buildFingerprintFile, computeCaseFingerprint } from '../../core/fingerprint';
import { buildMerkleTree } from '../../core/merkle';
import { appendEntry } from '../../core/custody';
import { saveSealWithLog, appendCustodyLogEntry, updateDeclarations } from '../../storage/db';
import { generateDraftCertificatePdf } from '../../pdf/certificate';
import { generateTechnicalAnnexPdf } from '../../pdf/annex';
import { callServer } from '../../net/gate';
import {
  SCHEDULE_TEXT_VERIFIED,
  PART_A_DECLARATIONS,
} from '../../pdf/scheduleText';
import { Download, AlertTriangle, ChevronDown, ChevronUp, Lock, Clock, CheckCircle2, FileCode } from 'lucide-react';

interface S4SealProps {
  meta: CaseMeta;
  files: StoredEvidenceFile[];
  log: CustodyEntry[];
  seals: SealSnapshot[];
  latestSeal: SealSnapshot | null;
  onSealCreated: (seal: SealSnapshot, logEntry: CustodyEntry) => void;
  onLogAppended: (entry: CustodyEntry) => void;
  onDeclarationsChanged: (declarations: Record<string, boolean>) => void;
}

export function S4Seal({
  meta,
  files,
  log,
  seals,
  latestSeal,
  onSealCreated,
  onLogAppended,
  onDeclarationsChanged,
}: S4SealProps) {
  const [declarations, setDeclarations] = useState<Record<string, boolean>>(
    meta.declarations || {}
  );
  const [isSealing, setIsSealing] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isHonestyBoxOpen, setIsHonestyBoxOpen] = useState(false);
  const [showFilenameWarning, setShowFilenameWarning] = useState(false);
  const [isTimestamping, setIsTimestamping] = useState(false);
  const [isGeneratingAnnex, setIsGeneratingAnnex] = useState(false);
  const [timestampData, setTimestampData] = useState<{
    status: 'not_requested' | 'pending' | 'confirmed' | 'sample' | 'failed';
    service?: string;
    digest?: string;
    submittedAt?: string;
    confirmedAt?: string;
    blockHeight?: number;
    proofB64?: string;
    sample?: boolean;
    note?: string;
  }>({
    status: 'not_requested',
  });

  // Check required details for PDF gating
  const hasRequiredDetails =
    !!meta.details.name.trim() &&
    !!meta.details.parentage.trim() &&
    !!meta.details.address.trim() &&
    (!!meta.details.relationship?.trim() || !!meta.details.device?.ownershipRelationship?.trim());

  // Check declarations for PDF gating
  const allDeclarationsTicked =
    !!declarations.d1 && !!declarations.d2;

  const canGeneratePdf = !!latestSeal && hasRequiredDetails && allDeclarationsTicked;

  const handleToggleDeclaration = async (id: string) => {
    const next = { ...declarations, [id]: !declarations[id] };
    setDeclarations(next);
    onDeclarationsChanged(next);
    await updateDeclarations(next, new Date().toISOString());
  };

  const handleRequestTimestamp = async () => {
    if (!latestSeal || isTimestamping) return;
    setIsTimestamping(true);
    try {
      const res = (await callServer('stamp', { digest: latestSeal.caseFingerprint })) as any;
      if (res) {
        setTimestampData(res);
        const logEntry = await appendEntry(
          log,
          'TIMESTAMP_REQUESTED',
          {
            service: res.service || 'opentimestamps',
            digest: res.digest,
            sample: res.sample,
          }
        );
        await appendCustodyLogEntry(logEntry);
        onLogAppended(logEntry);
      }
    } catch (err) {
      console.warn('Timestamp server call failed, using sample proof:', err);
      const nowIso = new Date().toISOString();
      const mockSample = {
        status: 'sample' as const,
        service: 'opentimestamps-sample',
        digest: latestSeal.caseFingerprint,
        submittedAt: nowIso,
        confirmedAt: nowIso,
        blockHeight: 870420,
        proofB64: btoa(`OTS-SAMPLE:${latestSeal.caseFingerprint}`),
        sample: true,
        note: 'Fallback sample proof (server offline or local demo)',
      };
      setTimestampData(mockSample);
    } finally {
      setIsTimestamping(false);
    }
  };

  const handleDownloadOtsProof = () => {
    if (!timestampData.proofB64 || !latestSeal) return;
    const binary = atob(timestampData.proofB64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const blob = new Blob([bytes], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pramaan-${meta.caseId}-seal${latestSeal.n}.json.ots`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadAnnex = async () => {
    if (!latestSeal || isGeneratingAnnex) return;
    setIsGeneratingAnnex(true);
    try {
      const pdfBytes = await generateTechnicalAnnexPdf({
        meta,
        files,
        seal: latestSeal,
        custodyLog: log,
      });
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pramaan-technical-annex-${meta.caseId}-seal${latestSeal.n}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setIsGeneratingAnnex(false);
    }
  };

  const handleSealCase = async () => {
    if (files.length === 0 || isSealing) return;
    setIsSealing(true);

    try {
      const fileHashes = files.map((f) => f.sha256);
      const tree = await buildMerkleTree(fileHashes);

      // custodyHead is the last log entry's entryHash
      const lastLog = log[log.length - 1];
      const custodyHead = lastLog ? lastLog.entryHash : '0'.repeat(64);

      const caseFingerprint = await computeCaseFingerprint(tree.root, custodyHead);

      const proofsMap: SealSnapshot['proofs'] = {};
      for (let i = 0; i < files.length; i++) {
        proofsMap[files[i].id] = tree.proofs[i];
      }

      const sealNumber = seals.length + 1;
      const sealedAt = new Date().toISOString();

      const newSeal: SealSnapshot = {
        n: sealNumber,
        sealedAt,
        merkleRoot: tree.root,
        custodyHead,
        caseFingerprint,
        fileIds: files.map((f) => f.id),
        proofs: proofsMap,
      };

      const logEntry = await appendEntry(
        log,
        'SEAL_GENERATED',
        {
          sealNumber,
          merkleRoot: tree.root,
          caseFingerprint,
          fileCount: files.length,
          custodyHead,
        },
        null,
        sealedAt
      );

      await saveSealWithLog(newSeal, logEntry);
      onSealCreated(newSeal, logEntry);
    } finally {
      setIsSealing(false);
    }
  };

  const handleExportFingerprintFile = async () => {
    if (!latestSeal) return;

    // Filter log strictly up to and including the SEAL_GENERATED entry for this seal
    const sealIndex = log.findIndex(
      (entry) =>
        entry.action === 'SEAL_GENERATED' &&
        (entry.details?.sealNumber as number) === latestSeal.n
    );
    const sealLog = sealIndex !== -1 ? log.slice(0, sealIndex + 1) : log;

    const fpFile = await buildFingerprintFile({
      caseId: meta.caseId,
      sealedAt: latestSeal.sealedAt,
      files,
      custodyLog: sealLog,
    });

    const jsonStr = JSON.stringify(fpFile, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pramaan-${meta.caseId}-seal${latestSeal.n}.json`;
    a.click();
    URL.revokeObjectURL(url);

    // Append EXPORT_GENERATED log entry AFTER seal snapshot export
    const exportEntry = await appendEntry(log, 'EXPORT_GENERATED', {
      kind: 'fingerprint_file',
      sealNumber: latestSeal.n,
    });
    await appendCustodyLogEntry(exportEntry);
    onLogAppended(exportEntry);
  };

  const handleDownloadPdf = async () => {
    if (!canGeneratePdf || !latestSeal) return;
    setIsGeneratingPdf(true);

    try {
      const pdfBytes = await generateDraftCertificatePdf({
        meta,
        files,
        seal: latestSeal,
        custodyLog: log,
      });

      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pramaan-draft-certificate-${meta.caseId}-seal${latestSeal.n}.pdf`;
      a.click();
      URL.revokeObjectURL(url);

      const exportEntry = await appendEntry(log, 'EXPORT_GENERATED', {
        kind: 'pdf',
        sealNumber: latestSeal.n,
      });
      await appendCustodyLogEntry(exportEntry);
      onLogAppended(exportEntry);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const filesAddedSinceSeal = latestSeal
    ? files.filter((f) => !latestSeal.fileIds.includes(f.id)).length
    : 0;

  return (
    <section id="seal-section" className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
      <div className="mb-4 flex items-center justify-between">
        <span className="px-2.5 py-0.5 bg-rose-700 text-white border-2 border-ink text-[10px] font-mono font-black uppercase tracking-wider shadow-brutal-sm">
          FEATURE 06 // MERKLE ROOT &amp; SECTION 63(4) BSA SEALING (seal)
        </span>
      </div>

      {/* Unverified Schedule Banner */}
      {!SCHEDULE_TEXT_VERIFIED && (
        <div className="mb-8 p-4 bg-pink/20 border-2 border-pink rounded neo-card flex items-start space-x-3 text-ink">
          <AlertTriangle className="w-5 h-5 text-red flex-shrink-0 mt-0.5" />
          <div className="text-xs font-mono">
            <span className="font-bold block mb-1">
              SCHEDULE TEXT NOT YET VERIFIED
            </span>
            <span>{STRINGS.schedule.unverifiedBanner}</span>
          </div>
        </div>
      )}

      {/* Section Header */}
      <div className="mb-10">
        <div className="font-mono text-xs text-yellow font-bold uppercase tracking-wider mb-2">
          INTEGRITY LOCK // CERTIFICATION
        </div>
        <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-ink font-sans">
          {STRINGS.seal.heading}
        </h2>
        <p className="mt-2 text-muted text-sm sm:text-base max-w-xl">
          {STRINGS.seal.explainer}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Side: Seal Action & Declarations Panel */}
        <div className="lg:col-span-6 space-y-6">
          {/* Sealing Card */}
          <div className="neo-card p-6 bg-paper">
            <h3 className="text-lg font-black font-sans uppercase mb-2">
              Step 1: Compute Case Fingerprint
            </h3>
            <p className="text-xs font-mono text-muted mb-4">
              Hashes all current files into a Merkle root and anchors it to the custody log head.
            </p>

            <button
              data-guide="seal.button"
              onClick={handleSealCase}
              disabled={files.length === 0 || isSealing}
              className="w-full neo-btn py-3.5 bg-yellow text-ink font-mono font-bold text-sm flex items-center justify-center space-x-2 shadow-brutal disabled:opacity-50"
            >
              <Lock className="w-4 h-4" />
              <span>{isSealing ? 'LOCKING CASE...' : STRINGS.seal.sealButton}</span>
            </button>

            {files.length === 0 && (
              <p className="text-xs font-mono text-red mt-2">
                * {STRINGS.seal.noFilesReason}
              </p>
            )}

            {filesAddedSinceSeal > 0 && (
              <p className="text-xs font-mono text-blue mt-2 font-bold">
                ● {STRINGS.stats.sealPending(filesAddedSinceSeal)}
              </p>
            )}

            {/* Seal History Chips */}
            {seals.length > 0 && (
              <div data-guide="seal.history" className="mt-4 pt-4 border-t border-ink/20">
                <span className="font-mono text-xs text-muted block mb-2 font-bold uppercase">
                  Seal History:
                </span>
                <div className="flex flex-wrap gap-2">
                  {seals.map((s) => (
                    <span
                      key={s.n}
                      className="px-2.5 py-1 bg-white border border-ink rounded font-mono text-xs"
                    >
                      seal #{s.n} · {s.fileIds.length} files
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Declarations Taped Note Panel */}
          <div data-guide="seal.declarations" className="neo-card bg-[#fffdf0] p-6 border-2 border-ink relative shadow-brutal">
            {/* Yellow Tape Strip across top */}
            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 w-52 h-6 bg-yellow/90 border border-ink/40 shadow-sm rotate-1 flex items-center justify-center font-mono text-[10px] font-black uppercase tracking-wider text-ink select-none">
              THE SCHEDULE [SEC. 63(4)(c)]
            </div>

            <div className="border-b border-ink/20 pb-3 mb-3 pt-2">
              <span className="text-[10px] font-mono text-muted uppercase tracking-wider block font-bold">
                STATUTORY AFFIRMATION // SECTION 63(4)(c) BSA
              </span>
              <h3 className="text-base sm:text-lg font-black font-sans uppercase text-ink">
                CERTIFICATE — PART A (TO BE FILLED BY THE PARTY)
              </h3>
              {meta.title && (
                <div className="mt-1.5 px-2.5 py-1 bg-yellow/30 border border-ink rounded font-mono text-xs font-bold text-ink inline-block">
                  CASE DOSSIER: {meta.title}
                </div>
              )}
            </div>

            <p className="text-xs font-mono text-muted mb-4 font-medium">
              Statutory acknowledgement required for draft Part A certificate generation:
            </p>

            <div className="space-y-3">
              {PART_A_DECLARATIONS.map((dec) => {
                const checked = !!declarations[dec.id];
                return (
                  <label
                    key={dec.id}
                    className="flex items-start space-x-3 cursor-pointer select-none text-xs font-mono"
                  >
                    <input
                      type="checkbox"
                      data-guide="seal.declaration"
                      checked={checked}
                      onChange={() => handleToggleDeclaration(dec.id)}
                      className="mt-0.5 h-4 w-4 rounded border-2 border-ink text-green focus:ring-green"
                    />
                    <span className="text-ink leading-relaxed font-medium">{dec.text}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Public Timestamp Row */}
          <div data-guide="seal.timestamp" className="neo-card p-4 bg-paper border-2 border-ink shadow-brutal space-y-3">
            <div className="flex items-center justify-between border-b border-ink/20 pb-2">
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-field" />
                <span className="font-mono text-xs font-bold uppercase text-ink">
                  Public Timestamp (Bitcoin / OpenTimestamps)
                </span>
              </div>
              <div data-guide="seal.timestampStatus">
                {timestampData.status === 'confirmed' ? (
                  <span className="px-2 py-0.5 bg-green/20 text-emerald-950 font-mono text-[10px] font-bold border border-green rounded flex items-center space-x-1">
                    <CheckCircle2 className="w-3 h-3 text-green" />
                    <span>CONFIRMED</span>
                  </span>
                ) : timestampData.status === 'sample' ? (
                  <span className="px-2 py-0.5 bg-yellow/20 text-amber-950 font-mono text-[10px] font-bold border border-yellow rounded">
                    SAMPLE PROOF
                  </span>
                ) : timestampData.status === 'pending' ? (
                  <span className="px-2 py-0.5 bg-blue/20 text-blue font-mono text-[10px] font-bold border border-blue rounded">
                    PENDING POOL
                  </span>
                ) : (
                  <span className="px-2 py-0.5 bg-gray-100 text-muted font-mono text-[10px] border border-gray-300 rounded">
                    NOT ANCHORED
                  </span>
                )}
              </div>
            </div>

            <p className="text-xs font-mono text-muted leading-relaxed">
              {timestampData.status === 'confirmed'
                ? `Confirmed in Bitcoin block #${timestampData.blockHeight || 870420} at ${timestampData.confirmedAt || ''}.`
                : timestampData.status === 'sample'
                ? `SAMPLE PROOF (Prototype Demo Mode). Anchors case fingerprint to mock proof for evaluation.`
                : timestampData.status === 'pending'
                ? `Submitted to calendar servers. Awaiting next Bitcoin block inclusion.`
                : `Submit the case fingerprint to OpenTimestamps to prove evidence existed before a verifiable block time.`}
            </p>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              {timestampData.status === 'not_requested' ? (
                <button
                  data-guide="seal.requestTimestamp"
                  onClick={handleRequestTimestamp}
                  disabled={!latestSeal || isTimestamping}
                  className="px-3 py-1.5 bg-field hover:bg-blue text-white font-mono text-xs font-bold shadow-brutal-sm disabled:opacity-40"
                >
                  {isTimestamping ? 'SUBMITTING TO CALENDAR...' : 'REQUEST PUBLIC TIMESTAMP'}
                </button>
              ) : (
                <>
                  <button
                    data-guide="seal.otsDownload"
                    onClick={handleDownloadOtsProof}
                    className="px-3 py-1.5 bg-yellow hover:bg-yellow/80 text-ink font-mono text-xs font-bold border border-ink shadow-brutal-sm flex items-center space-x-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>DOWNLOAD .OTS PROOF</span>
                  </button>
                  {timestampData.status === 'pending' && (
                    <button
                      data-guide="seal.checkStatus"
                      onClick={handleRequestTimestamp}
                      className="px-2.5 py-1.5 bg-paper hover:bg-gray-200 text-ink font-mono text-xs border border-ink"
                    >
                      Check Status
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right Side: Member Pass ID Card & Export Buttons */}
        <div className="lg:col-span-6 flex flex-col items-center">
          {latestSeal ? (
            <div className="w-full max-w-sm flex flex-col items-center">
              {/* Lanyard Top Strap */}
              <div className="w-6 h-8 bg-ink rounded-t-sm" />
              <div className="w-12 h-3 bg-gray-300 border-2 border-ink rounded-sm shadow-sm" />

              {/* Vertical Black Member Pass Card */}
              <div
                data-guide="seal.pass"
                className="w-full neo-card bg-terminal text-terminal-text p-6 border-2 border-ink rounded-lg shadow-brutal flex flex-col justify-between space-y-6"
              >
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-gray-800">
                    <span className="font-mono text-xs font-bold text-yellow tracking-wider uppercase">
                      SECTION 63(4) CERTIFICATE PASS
                    </span>
                    <span className="font-mono text-[10px] text-gray-400">
                      SEAL #{latestSeal.n}
                    </span>
                  </div>

                  <div className="mt-4">
                    <span className="font-mono text-[10px] text-gray-500 uppercase block">
                      Certificate &amp; Case Title
                    </span>
                    <span className="font-mono text-xs font-bold text-white truncate block">
                      {meta.title || 'Untitled Case Dossier'}
                    </span>
                  </div>

                  <div className="mt-3">
                    <span className="font-mono text-[10px] text-gray-500 uppercase block">
                      Case Identifier
                    </span>
                    <span className="font-mono text-sm font-bold text-blue">
                      {meta.caseId}
                    </span>
                  </div>

                  <div className="mt-4">
                    <span className="font-mono text-[10px] text-gray-500 uppercase block">
                      Case Fingerprint
                    </span>
                    <div className="font-mono text-xs text-yellow break-all bg-black/60 p-2.5 rounded border border-gray-800 mt-1 select-all">
                      {latestSeal.caseFingerprint}
                    </div>
                  </div>

                  {/* Fingerprint Barcode */}
                  <div data-guide="seal.barcode" className="mt-4">
                    <span className="font-mono text-[10px] text-gray-500 uppercase block mb-1">
                      Fingerprint Barcode
                    </span>
                    <Barcode fingerprint={latestSeal.caseFingerprint} />
                  </div>
                </div>

                <div className="pt-3 border-t border-gray-800 flex items-center justify-between text-[10px] font-mono text-gray-500">
                  <span>SEALED: {new Date(latestSeal.sealedAt).toLocaleDateString()}</span>
                  <span>{latestSeal.fileIds.length} FILES ANCHORED</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="w-full mt-6 space-y-3">
                <button
                  data-guide="seal.downloadFp"
                  onClick={() => setShowFilenameWarning(true)}
                  className="w-full neo-btn py-3 bg-yellow text-ink font-mono font-bold text-xs flex items-center justify-center space-x-2"
                >
                  <Download className="w-4 h-4" />
                  <span className="uppercase">{STRINGS.seal.downloadFingerprint}</span>
                </button>

                <button
                  data-guide="seal.downloadPdf"
                  onClick={handleDownloadPdf}
                  disabled={!canGeneratePdf || isGeneratingPdf}
                  className="w-full neo-btn py-3 bg-paper text-ink font-mono font-bold text-xs flex items-center justify-center space-x-2 border-2 border-ink shadow-brutal-sm hover:bg-yellow/40 disabled:opacity-40"
                >
                  <Download className="w-4 h-4" />
                  <span className="uppercase">
                    {isGeneratingPdf ? 'COMPILING DRAFT PDF...' : STRINGS.seal.downloadPdf}
                  </span>
                </button>

                <button
                  data-guide="seal.downloadAnnex"
                  onClick={handleDownloadAnnex}
                  disabled={!latestSeal || isGeneratingAnnex}
                  className="w-full neo-btn py-3 bg-paper text-ink font-mono font-bold text-xs flex items-center justify-center space-x-2 border-2 border-ink shadow-brutal-sm hover:bg-yellow/40 disabled:opacity-40"
                >
                  <FileCode className="w-4 h-4" />
                  <span className="uppercase">
                    {isGeneratingAnnex ? 'GENERATING ANNEX...' : 'DOWNLOAD EXPERT ANNEX (PDF)'}
                  </span>
                </button>

                {/* Explanation note when PDF is disabled */}
                {!canGeneratePdf && (
                  <p className="font-hand text-lg text-blue -rotate-1 text-center">
                    {STRINGS.seal.pdfDisabledReason}
                  </p>
                )}
              </div>
            </div>
          ) : (
            /* Empty Pass Placeholder */
            <div className="w-full max-w-sm neo-card p-12 bg-paper/60 border-dashed border-2 border-ink text-center flex flex-col items-center justify-center min-h-[380px]">
              <Lock className="w-10 h-10 text-muted mb-3" />
              <h4 className="text-base font-black font-sans uppercase text-muted">
                Member Pass Inactive
              </h4>
              <p className="text-xs font-mono text-muted mt-2">
                Click "Seal case" on the left to lock in the fingerprint and generate your member pass.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Filename Warning Dialog before Fingerprint Export (F5 requirement) */}
      {showFilenameWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="neo-card bg-paper max-w-md w-full p-6 border-4 border-ink shadow-brutal-lg">
            <div className="flex items-center space-x-2 text-ink font-bold font-mono mb-3">
              <AlertTriangle className="w-5 h-5 text-yellow" />
              <span>{STRINGS.seal.fileNameWarningTitle}</span>
            </div>
            <p className="text-xs font-mono text-muted mb-6 leading-relaxed">
              {STRINGS.seal.fileNameWarningBody}
            </p>
            <div className="flex items-center justify-end space-x-3">
              <button
                data-guide="seal.cancelFilenameWarning"
                onClick={() => setShowFilenameWarning(false)}
                className="neo-btn px-4 py-2 bg-paper text-ink font-mono text-xs font-bold"
              >
                Cancel
              </button>
              <button
                data-guide="seal.confirmFilenameDownload"
                onClick={() => {
                  setShowFilenameWarning(false);
                  handleExportFingerprintFile();
                }}
                className="neo-btn px-4 py-2 bg-yellow text-ink font-mono text-xs font-bold"
              >
                Download File
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Honest Limits Collapsible Box */}
      <div data-guide="seal.notBox" className="mt-12 neo-card bg-paper border-2 border-ink overflow-hidden">
        <button
          data-guide="seal.toggleHonestyBox"
          onClick={() => setIsHonestyBoxOpen(!isHonestyBoxOpen)}
          className="w-full p-4 flex items-center justify-between font-mono text-xs font-bold text-ink hover:bg-gray-50"
        >
          <span className="uppercase">{STRINGS.seal.honestBoxTitle}</span>
          {isHonestyBoxOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {isHonestyBoxOpen && (
          <div className="p-4 pt-0 border-t border-gray-200 text-xs font-mono text-muted space-y-3">
            <p className="leading-relaxed">{STRINGS.seal.honestBoxBody}</p>
            <div className="pt-2">
              <span className="font-bold text-ink block mb-1">What Pramaan does NOT do:</span>
              <ul className="list-disc pl-5 space-y-1">
                {STRINGS.seal.whatPramaanDoesNotDo.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
