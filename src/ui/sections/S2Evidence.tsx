import { useState, useRef } from 'react';
import { StoredEvidenceFile } from '../../storage/db';
import { CustodyEntry, SealSnapshot } from '../../core/types';
import { STRINGS } from '../strings';
import { HashScramble } from '../components/HashScramble';
import { hashFileWithWorker } from '../../workers/hashClient';
import { computeLeafHash } from '../../core/merkle';
import { appendEntry } from '../../core/custody';
import { addFileWithLog, removeFileWithLog, appendCustodyLogEntry } from '../../storage/db';
import { Plus, Copy, Download, RefreshCw, FileText, Image as ImageIcon, Music, AlertCircle, Trash2 } from 'lucide-react';

interface S2EvidenceProps {
  files: StoredEvidenceFile[];
  log: CustodyEntry[];
  latestSeal: SealSnapshot | null;
  onFileAdded: (newFile: StoredEvidenceFile, newLogEntry: CustodyEntry) => void;
  onFileRemoved?: (fileId: string, newLogEntry: CustodyEntry) => void;
  onLogAppended: (entry: CustodyEntry) => void;
  onParseChat?: (file: StoredEvidenceFile) => void;
  onRunOcr?: (file: StoredEvidenceFile) => void;
  onTranscribe?: (file: StoredEvidenceFile) => void;
}

export function S2Evidence({
  files,
  log,
  latestSeal,
  onFileAdded,
  onFileRemoved,
  onLogAppended,
  onParseChat,
  onRunOcr,
  onTranscribe,
}: S2EvidenceProps) {
  const [isHashing, setIsHashing] = useState(false);
  const [hashingProgress, setHashingProgress] = useState<number>(0);
  const [hashingFileName, setHashingFileName] = useState<string>('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [verifyStatus, setVerifyStatus] = useState<Record<string, 'MATCH' | 'MISMATCH' | 'VERIFYING'>>({});
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check ?demo=1 URL flag
  const isDemoMode = new URLSearchParams(window.location.search).get('demo') === '1';

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleFilesSelected = async (fileList: FileList | File[]) => {
    const incoming = Array.from(fileList);
    if (incoming.length === 0) return;

    for (const file of incoming) {
      if (file.size > 500 * 1024 * 1024) {
        showToast(STRINGS.evidence.largeFileWarning);
      }

      setIsHashing(true);
      setHashingFileName(file.name);
      setHashingProgress(0);

      try {
        const sha256 = await hashFileWithWorker(file, (p) => {
          setHashingProgress(p);
        });

        // Check duplicate hash
        const isDuplicate = files.some(
          (f) => f.sha256.toLowerCase() === sha256.toLowerCase()
        );

        if (isDuplicate) {
          showToast(STRINGS.evidence.duplicateToast);
          setIsHashing(false);
          continue;
        }

        const leaf = await computeLeafHash(sha256);
        const fileId = `f_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        const addedAt = new Date().toISOString();

        const storedFile: StoredEvidenceFile = {
          id: fileId,
          order: files.length,
          name: file.name,
          size: file.size,
          mimeType: file.type || 'application/octet-stream',
          lastModified: file.lastModified,
          sha256,
          leaf,
          addedAt,
          blob: file,
        };

        const logEntry = await appendEntry(
          log,
          'FILE_ADDED',
          {
            name: file.name,
            size: file.size,
            mimeType: file.type,
            lastModified: file.lastModified,
            sha256,
          },
          fileId,
          addedAt
        );

        await addFileWithLog(storedFile, logEntry);
        onFileAdded(storedFile, logEntry);
      } catch (err) {
        console.error('Failed to hash and add evidence file:', err);
        showToast(STRINGS.evidence.readError);
      } finally {
        setIsHashing(false);
      }
    }
  };

  const handleCopyHash = (hash: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedHash(hash);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  const handleDownloadOriginal = (file: StoredEvidenceFile) => {
    const url = URL.createObjectURL(file.blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleVerifyAgain = async (file: StoredEvidenceFile) => {
    setVerifyStatus((prev) => ({ ...prev, [file.id]: 'VERIFYING' }));
    const computed = await hashFileWithWorker(file.blob);
    const matches = computed.toLowerCase() === file.sha256.toLowerCase();

    setVerifyStatus((prev) => ({
      ...prev,
      [file.id]: matches ? 'MATCH' : 'MISMATCH',
    }));

    const logEntry = await appendEntry(
      log,
      'FILE_VERIFIED',
      { fileId: file.id, name: file.name, matches },
      file.id
    );
    await appendCustodyLogEntry(logEntry);
    onLogAppended(logEntry);
  };

  const handleRemoveFile = async (file: StoredEvidenceFile) => {
    const confirmed = window.confirm(
      `Remove "${file.name}" from evidence?\n\nYou can re-upload it again if it was selected by mistake.`
    );
    if (!confirmed) return;

    try {
      const logEntry = await appendEntry(
        log,
        'FILE_REMOVED',
        {
          fileId: file.id,
          name: file.name,
          sha256: file.sha256,
          size: file.size,
          reason: 'Removed by user for correction or re-upload',
        },
        file.id
      );

      await removeFileWithLog(file.id, logEntry);
      if (onFileRemoved) {
        onFileRemoved(file.id, logEntry);
      }
      showToast(`Removed "${file.name}". You can now upload the correct file.`);
    } catch (err: unknown) {
      console.error('Failed to remove file:', err);
      showToast('Failed to remove evidence file.');
    }
  };

  const handleDownloadTampered = async (file: StoredEvidenceFile) => {
    const buffer = await file.blob.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    if (bytes.length > 0) {
      // Flip a bit in the middle of the file
      const mid = Math.floor(bytes.length / 2);
      bytes[mid] = bytes[mid] ^ 0xff;
    }
    const tamperedBlob = new Blob([bytes], { type: file.mimeType });
    const url = URL.createObjectURL(tamperedBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tampered-1byte-${file.name}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getFileIcon = (mime: string, _name?: string) => {
    if (mime.startsWith('image/')) return <ImageIcon className="w-4 h-4 text-green" />;
    if (mime.startsWith('audio/')) return <Music className="w-4 h-4 text-blue" />;
    return <FileText className="w-4 h-4 text-yellow" />;
  };

  return (
    <section id="evidence-section" className="blue-field py-16 px-4 sm:px-6 relative text-white border-y-2 border-ink">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-18 right-6 z-50 bg-pink text-ink border-2 border-ink font-mono text-xs font-bold px-4 py-2.5 rounded shadow-brutal flex items-center space-x-2 animate-bounce">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      <div className="max-w-6xl mx-auto">
        <div className="mb-4 flex items-center justify-between">
          <span className="px-2.5 py-0.5 bg-yellow text-ink border-2 border-ink text-[10px] font-mono font-black uppercase tracking-wider shadow-brutal-sm">
            FEATURE 02 // EVIDENCE INGESTION &amp; CRYPTOGRAPHIC VAULT (/evidence)
          </span>
        </div>

        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
          <div>
            <div className="font-mono text-xs text-yellow font-bold uppercase tracking-wider mb-2">
              STORAGE // DIRECTORY: /evidence
            </div>
            <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-white font-sans">
              {STRINGS.evidence.heading}
            </h2>
            <p className="mt-2 text-white/80 text-sm sm:text-base max-w-xl">
              {STRINGS.evidence.subtext}
            </p>
          </div>

          <div className="flex flex-col items-start md:items-end space-y-1">
            <span className="font-hand text-2xl text-yellow -rotate-3 select-none">
              {STRINGS.evidence.scrollHint}
            </span>
            <div className="text-xs font-mono text-white/70">
              {STRINGS.evidence.whatsappHint}
            </div>
          </div>
        </div>

        {/* Lanyards Horizontal Scrolling Row */}
        <div className="overflow-x-auto pb-8 pt-4 flex items-start space-x-6 snap-x snap-mandatory scrollbar-thin">
          {/* Card 0: Add Evidence Card */}
          <div
            data-guide="evidence.add"
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (e.dataTransfer.files) {
                handleFilesSelected(e.dataTransfer.files);
              }
            }}
            className="flex-shrink-0 w-72 sm:w-80 min-h-[380px] neo-card bg-paper/95 text-ink p-6 border-dashed border-4 border-ink flex flex-col items-center justify-center text-center cursor-pointer hover:bg-white transition-all snap-start group select-none"
          >
            <input
              type="file"
              ref={fileInputRef}
              data-guide="evidence.fileInput"
              multiple
              className="hidden"
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  handleFilesSelected(e.target.files);
                }
                e.target.value = '';
              }}
            />
            {isHashing ? (
              <div className="space-y-3">
                <div className="w-12 h-12 border-4 border-blue border-t-transparent rounded-full animate-spin mx-auto" />
                <span className="font-mono text-xs font-bold text-blue block">
                  {STRINGS.evidence.fingerprinting}
                </span>
                <span className="font-mono text-[11px] text-muted truncate max-w-[200px] block">
                  {hashingFileName} ({Math.round(hashingProgress * 100)}%)
                </span>
              </div>
            ) : (
              <>
                <div className="w-14 h-14 rounded-full bg-yellow border-2 border-ink flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-brutal-sm">
                  <Plus className="w-7 h-7 text-ink" />
                </div>
                <h3 className="text-lg font-black font-sans uppercase">Add Evidence</h3>
                <p className="text-xs font-mono text-muted mt-1">
                  {STRINGS.evidence.dropPrompt}
                </p>
                <div className="mt-4 px-3 py-1 bg-field/10 border border-field text-field rounded text-[11px] font-mono">
                  Images · Audio · WhatsApp Exports
                </div>
              </>
            )}
          </div>

          {/* Evidence Lanyard Cards */}
          {files.map((file, idx) => {
            const isSealed = latestSeal && latestSeal.fileIds.includes(file.id);
            const isImage = file.mimeType.startsWith('image/');
            const vState = verifyStatus[file.id];

            return (
              <div
                key={file.id}
                className="flex-shrink-0 w-72 sm:w-80 swing-card snap-start select-none flex flex-col items-center"
              >
                {/* Lanyard Strap & Clip */}
                <div className="w-4 h-6 bg-ink mb-[-2px] z-10 rounded-t-sm" />
                <div className="w-8 h-3 bg-gray-400 border-2 border-ink rounded-sm z-10 shadow-sm" />

                {/* ID Badge Card */}
                <div
                  id={`evidence-file-${file.id}`}
                  data-guide="evidence.card"
                  className="w-full neo-card bg-paper text-ink p-5 relative overflow-hidden flex flex-col justify-between min-h-[360px]"
                >
                  {/* Big Ghosted Index Number */}
                  <span className="absolute top-2 right-4 text-7xl font-black font-sans text-black/5 select-none pointer-events-none">
                    {(idx + 1).toString().padStart(2, '0')}
                  </span>

                  <div>
                    {/* Top tag and seal stamp */}
                    <div className="flex items-center justify-between mb-3 z-10">
                      <span
                        data-guide="evidence.chip.text"
                        className="font-mono text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-ink text-white rounded"
                      >
                        FILE_{(idx + 1).toString().padStart(2, '0')} · {file.mimeType.split('/')[0].toUpperCase()}
                      </span>

                      {/* Rotated Stamp Chip */}
                      <span
                        data-guide="evidence.sealedStamp"
                        className={`font-mono text-[10px] font-black uppercase px-2 py-0.5 border-2 transform -rotate-4 rounded shadow-sm ${
                          isSealed
                            ? 'border-green text-green bg-green/10'
                            : 'border-red text-red bg-red/10'
                        }`}
                      >
                        {isSealed ? STRINGS.evidence.statusSealed : STRINGS.evidence.statusNotSealed}
                      </span>
                    </div>

                    {/* Polaroid Thumbnail for Images */}
                    {isImage && (
                      <div className="mb-3 p-1.5 bg-white border border-ink rounded shadow-sm transform -rotate-1">
                        <div className="h-28 w-full bg-gray-100 overflow-hidden flex items-center justify-center">
                          <img
                            src={URL.createObjectURL(file.blob)}
                            alt={file.name}
                            className="h-full w-full object-cover"
                          />
                        </div>
                      </div>
                    )}

                    {/* Filename & Meta */}
                    <div className="flex items-start space-x-2 mb-2">
                      <span className="mt-1 flex-shrink-0">
                        {getFileIcon(file.mimeType, file.name)}
                      </span>
                      <div className="truncate">
                        <h4 className="text-sm font-bold text-ink truncate font-sans" title={file.name}>
                          {file.name}
                        </h4>
                        <div className="text-[11px] font-mono text-muted">
                          {(file.size / 1024).toFixed(1)} KB · {new Date(file.addedAt).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>

                    {/* SHA-256 Box with Scramble */}
                    <div
                      data-guide="evidence.hash"
                      className="mt-3 bg-terminal text-terminal-text p-2.5 rounded text-xs font-mono border border-ink"
                    >
                      <div className="flex items-center justify-between text-[10px] text-gray-400 mb-1">
                        <span>SHA-256:</span>
                        <button
                          data-guide="evidence.copyHash"
                          onClick={() => handleCopyHash(file.sha256)}
                          className="hover:text-yellow flex items-center space-x-1"
                          title={STRINGS.evidence.copyHash}
                        >
                          <Copy className="w-3 h-3" />
                          <span>{copiedHash === file.sha256 ? STRINGS.evidence.hashCopied : 'COPY'}</span>
                        </button>
                      </div>
                      <div className="text-yellow text-[11px] font-mono break-all">
                        <HashScramble targetHash={file.sha256} truncateLength={16} />
                      </div>
                    </div>

                    {/* Helper action buttons (Parse / OCR / Transcribe) */}
                    {(() => {
                      const isChat = file.name.toLowerCase().endsWith('.txt') || file.name.toLowerCase().endsWith('.zip');
                      const isImage = file.mimeType.startsWith('image/') || /\.(png|jpe?g|webp|gif|bmp|tiff)$/i.test(file.name);
                      const isAudio = file.mimeType.startsWith('audio/') || /\.(mp3|wav|m4a|ogg|aac|flac)$/i.test(file.name);

                      return (
                        <div className="mt-2.5 flex flex-wrap gap-1.5">
                          {isChat && onParseChat && (
                            <button
                              data-guide="evidence.parse"
                              onClick={() => onParseChat(file)}
                              className="px-2 py-0.5 bg-yellow text-ink border border-ink text-[10px] font-mono font-bold hover:bg-yellow/80 shadow-brutal-sm"
                            >
                              PARSE CHAT
                            </button>
                          )}
                          {isImage && onRunOcr && (
                            <button
                              data-guide="evidence.ocr"
                              onClick={() => onRunOcr(file)}
                              className="px-2 py-0.5 bg-pink/20 text-rose-950 border border-pink text-[10px] font-mono font-bold hover:bg-pink/40 shadow-brutal-sm"
                            >
                              RUN OCR
                            </button>
                          )}
                          {isAudio && onTranscribe && (
                            <button
                              data-guide="evidence.transcribe"
                              onClick={() => onTranscribe(file)}
                              className="px-2 py-0.5 bg-green/20 text-emerald-950 border border-green text-[10px] font-mono font-bold hover:bg-green/40 shadow-brutal-sm"
                            >
                              TRANSCRIBE NOTE
                            </button>
                          )}
                        </div>
                      );
                    })()}
                  </div>

                  {/* Actions Bar */}
                  <div className="mt-4 pt-3 border-t border-ink/20 flex flex-wrap items-center justify-between gap-2">
                    <button
                      data-guide="evidence.download"
                      onClick={() => handleDownloadOriginal(file)}
                      className="p-1.5 hover:bg-gray-200 rounded text-ink flex items-center space-x-1 font-mono text-[10px] font-bold"
                      title={STRINGS.evidence.downloadOriginal}
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>ORIGINAL</span>
                    </button>

                    <button
                      data-guide="evidence.verifyAgain"
                      onClick={() => handleVerifyAgain(file)}
                      disabled={vState === 'VERIFYING'}
                      className="p-1.5 hover:bg-gray-200 rounded text-ink flex items-center space-x-1 font-mono text-[10px] font-bold"
                      title={STRINGS.evidence.verifyAgain}
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${vState === 'VERIFYING' ? 'animate-spin' : ''}`} />
                      <span>{vState ? (vState === 'MATCH' ? '✓ MATCH' : '✗ BROKEN') : 'RE-CHECK'}</span>
                    </button>

                    <button
                      data-guide="evidence.remove"
                      onClick={() => handleRemoveFile(file)}
                      className="p-1.5 hover:bg-red/15 text-red border border-red/40 rounded flex items-center space-x-1 font-mono text-[10px] font-bold transition-colors"
                      title="Remove file so you can re-upload if selected by mistake"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>REMOVE</span>
                    </button>

                    {/* Demo 1-byte tampered copy (visible only under ?demo=1) */}
                    {isDemoMode && (
                      <button
                        data-guide="evidence.tamperDemo"
                        onClick={() => handleDownloadTampered(file)}
                        className="w-full mt-1 px-2 py-1 bg-red text-white text-[10px] font-mono font-bold rounded hover:opacity-90 flex items-center justify-center space-x-1"
                        title="Download copy with 1 byte modified"
                      >
                        <span>TAMPER 1-BYTE (DEMO)</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom Explainer */}
        <div
          data-guide="evidence.tip"
          className="mt-4 bg-white/10 backdrop-blur-sm border border-white/20 p-4 rounded text-xs font-mono text-white/90 max-w-xl"
        >
          {STRINGS.evidence.hashExplainer}
        </div>
      </div>
    </section>
  );
}
