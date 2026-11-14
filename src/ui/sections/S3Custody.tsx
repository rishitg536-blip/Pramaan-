import { useState, useEffect } from 'react';
import { CustodyEntry } from '../../core/types';
import { STRINGS } from '../strings';
import { verifyChain } from '../../core/custody';
import { Check, AlertTriangle, Terminal, ChevronDown, ChevronUp, Clock } from 'lucide-react';

interface S3CustodyProps {
  log: CustodyEntry[];
}

export function S3Custody({ log }: S3CustodyProps) {
  const [activeLog, setActiveLog] = useState<CustodyEntry[]>(log);
  const [isOldestFirst, setIsOldestFirst] = useState(false);
  const [isTerminalView, setIsTerminalView] = useState(false);
  const [expandedIndices, setExpandedIndices] = useState<Record<number, boolean>>({});
  const [chainIntegrity, setChainIntegrity] = useState<{ ok: boolean; brokenAt?: number; reason?: string }>({
    ok: true,
  });
  const [isSimulatedTamper, setIsSimulatedTamper] = useState(false);

  // Check ?demo=1 flag
  const isDemoMode = new URLSearchParams(window.location.search).get('demo') === '1';

  useEffect(() => {
    if (!isSimulatedTamper) {
      setActiveLog(log);
    }
  }, [log, isSimulatedTamper]);

  useEffect(() => {
    async function checkChain() {
      const result = await verifyChain(activeLog);
      setChainIntegrity(result);
    }
    checkChain();
  }, [activeLog]);

  const toggleExpand = (index: number) => {
    setExpandedIndices((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  const handleSimulateTamper = () => {
    if (activeLog.length < 2) return;
    const copy = JSON.parse(JSON.stringify(activeLog)) as CustodyEntry[];
    // Mutate an old entry details
    copy[1].details = { ...copy[1].details, tampered: true };
    setActiveLog(copy);
    setIsSimulatedTamper(true);
  };

  const handleRestoreChain = () => {
    setActiveLog(log);
    setIsSimulatedTamper(false);
  };

  const displayedEntries = [...activeLog].sort((a, b) =>
    isOldestFirst ? a.index - b.index : b.index - a.index
  );

  const getPillColor = (action: string) => {
    switch (action) {
      case 'FILE_ADDED':
        return 'bg-green text-ink';
      case 'DETAILS_SAVED':
        return 'bg-blue text-white';
      case 'SEAL_GENERATED':
        return 'bg-yellow text-ink';
      case 'EXPORT_GENERATED':
        return 'bg-pink text-ink';
      case 'FILE_VERIFIED':
        return 'bg-purple-200 text-ink';
      case 'TIMELINE_CONFIRMED':
        return 'bg-purple-600 text-white';
      case 'PARSE_RUN':
      case 'OCR_RUN':
      case 'TRANSCRIBE_RUN':
        return 'bg-amber-200 text-ink';
      case 'CASE_CREATED':
        return 'bg-stone-300 text-ink';
      default:
        return 'bg-paper text-ink';
    }
  };

  const getEntryTitle = (entry: CustodyEntry): string => {
    switch (entry.action) {
      case 'CASE_CREATED':
        return 'Case Created (Genesis)';
      case 'DETAILS_SAVED':
        return 'Case Details Saved';
      case 'FILE_ADDED':
        return `Added "${(entry.details?.name as string) || 'Evidence File'}"`;
      case 'FILE_VERIFIED':
        return `File Verified: "${(entry.details?.name as string) || 'Evidence File'}"`;
      case 'PARSE_RUN':
        return `Parsed Chat Log: "${(entry.details?.fileName as string) || 'WhatsApp'}"`;
      case 'OCR_RUN':
        return `OCR Text Extracted: "${(entry.details?.fileName as string) || 'Screenshot'}"`;
      case 'TRANSCRIBE_RUN':
        return `Audio Transcribed: "${(entry.details?.fileName as string) || 'Voice note'}"`;
      case 'TIMELINE_CONFIRMED':
        return `Evidence Timeline Confirmed (${entry.details?.itemCount ?? 0} items)`;
      case 'FINDINGS_RUN':
        return `Evidence Rules Analyzed (${entry.details?.ruleCount ?? 0} rules)`;
      case 'SEAL_GENERATED':
        return `Case Sealed & Certified (Seal #${entry.details?.sealNumber ?? 1})`;
      case 'EXPORT_GENERATED':
        return (entry.details?.kind as string) === 'pdf'
          ? 'Draft Certificate PDF Downloaded'
          : `Draft Artifact Exported (${(entry.details?.kind as string) || 'PDF'})`;
      case 'AI_CALL':
        return `AI Privacy Query (${(entry.details?.kind as string) || 'Analysis'})`;
      case 'TIMESTAMP_REQUESTED':
        return 'External Timestamp Anchor Requested';
      case 'TIMESTAMP_CONFIRMED':
        return 'External Timestamp Anchor Confirmed';
      default:
        return entry.action.replace(/_/g, ' ');
    }
  };

  return (
    <section id="custody-section" className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
      <div className="mb-4 flex items-center justify-between">
        <span className="px-2.5 py-0.5 bg-slate-800 text-white border-2 border-ink text-[10px] font-mono font-black uppercase tracking-wider shadow-brutal-sm">
          FEATURE 05 // IMMUTABLE CHAIN OF CUSTODY (custody.log)
        </span>
      </div>

      {/* Section Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
        <div>
          <div className="font-mono text-xs text-blue font-bold uppercase tracking-wider mb-2">
            HASH CHAIN // LOG
          </div>
          <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-ink font-sans">
            {STRINGS.custody.heading}
          </h2>
          <p className="mt-2 text-muted text-sm sm:text-base max-w-xl">
            {STRINGS.custody.explainer}
          </p>
        </div>

        {/* Chain Integrity Badge */}
        <div className="flex flex-col items-start md:items-end space-y-2">
          <div
            data-guide="custody.badge"
            className={`neo-card px-4 py-2 flex items-center space-x-2 font-mono text-xs font-bold ${
              chainIntegrity.ok
                ? 'bg-green/15 text-ink border-2 border-green'
                : 'bg-red/15 text-red border-2 border-red'
            }`}
          >
            {chainIntegrity.ok ? (
              <>
                <Check className="w-4 h-4 text-green" />
                <span>{STRINGS.custody.chainOk(activeLog.length)}</span>
              </>
            ) : (
              <>
                <AlertTriangle className="w-4 h-4 text-red" />
                <span>{STRINGS.custody.chainBroken(chainIntegrity.brokenAt ?? 0)}</span>
              </>
            )}
          </div>

          <div className="text-[11px] font-mono text-muted flex items-center space-x-1">
            <Clock className="w-3 h-3" />
            <span>{STRINGS.custody.deviceClockNote}</span>
          </div>
        </div>
      </div>

      {/* Control Bar & Demo Helpers */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-8 pb-4 border-b-2 border-ink">
        <div className="flex items-center space-x-2 text-xs font-mono">
          <button
            data-guide="custody.sort"
            onClick={() => setIsOldestFirst(!isOldestFirst)}
            className="neo-btn px-3 py-1.5 bg-paper text-ink font-bold"
          >
            {isOldestFirst ? STRINGS.custody.sortNewest : STRINGS.custody.sortOldest}
          </button>
          <button
            data-guide="custody.terminal"
            onClick={() => setIsTerminalView(!isTerminalView)}
            className="neo-btn px-3 py-1.5 bg-paper text-ink font-bold flex items-center space-x-1"
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>
              {isTerminalView ? STRINGS.custody.toggleTimeline : STRINGS.custody.toggleTerminal}
            </span>
          </button>
        </div>

        {/* Demo button behind ?demo=1 */}
        {isDemoMode && (
          <div className="flex items-center space-x-2">
            {!isSimulatedTamper ? (
              <button
                data-guide="custody.simulateTamper"
                onClick={handleSimulateTamper}
                className="neo-btn px-3 py-1.5 bg-red text-white text-xs font-mono font-bold"
                title="Simulates tampering with a past entry to show red broken state"
              >
                {STRINGS.custody.simulateTamper}
              </button>
            ) : (
              <button
                data-guide="custody.restoreChain"
                onClick={handleRestoreChain}
                className="neo-btn px-3 py-1.5 bg-green text-ink text-xs font-mono font-bold"
              >
                {STRINGS.custody.restoreChain}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Render Terminal View or Timeline */}
      {isTerminalView ? (
        /* Terminal View Panel */
        <div className="neo-card bg-terminal text-terminal-text p-6 font-mono text-xs overflow-x-auto shadow-brutal border-2 border-ink">
          <div className="text-gray-500 mb-4 pb-2 border-b border-gray-800 flex items-center justify-between">
            <span>$ git log --pretty=format:"%h %ad %s" --date=iso</span>
            <span className="text-yellow">{activeLog.length} entries</span>
          </div>
          <div className="space-y-2">
            {displayedEntries.map((entry) => (
              <div key={entry.index} className="flex items-start space-x-3">
                <span className="text-red font-bold">{entry.entryHash.substring(0, 8)}</span>
                <span className="text-gray-500 select-none">{entry.time}</span>
                <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold border border-ink ${getPillColor(entry.action)}`}>
                  {entry.action}
                </span>
                <span className="text-gray-300">
                  {entry.action === 'FILE_ADDED'
                    ? `file: ${(entry.details?.name as string) || ''}`
                    : entry.action === 'DETAILS_SAVED'
                    ? `hash: ${(entry.details?.detailsHash as string)?.substring(0, 12)}...`
                    : entry.action === 'SEAL_GENERATED'
                    ? `merkle: ${(entry.details?.merkleRoot as string)?.substring(0, 12)}...`
                    : entry.action === 'TIMELINE_CONFIRMED'
                    ? `confirmed: ${entry.details?.itemCount ?? 0} items`
                    : entry.action === 'EXPORT_GENERATED'
                    ? `pdf draft (seal #${entry.details?.sealNumber ?? 1})`
                    : entry.action === 'PARSE_RUN'
                    ? `parsed: ${(entry.details?.fileName as string) || ''}`
                    : getEntryTitle(entry)}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Alternating Timeline */
        <div className="relative py-4">
          {/* Central 3px vertical ink line */}
          <div className="absolute left-4 md:left-1/2 top-0 bottom-0 w-[3px] bg-ink transform md:-translate-x-1/2 z-0" />

          <div className="space-y-8 relative z-10">
            {displayedEntries.map((entry, idx) => {
              const isEven = idx % 2 === 0;
              const isExpanded = !!expandedIndices[entry.index];

              return (
                <div
                  key={entry.index}
                  className={`flex flex-col md:flex-row items-start ${
                    isEven ? 'md:flex-row-reverse' : ''
                  }`}
                >
                  {/* Content Card (Half width on desktop) */}
                  <div className="w-full md:w-[46%] pl-12 md:pl-0">
                    <div data-guide="custody.entry" className="neo-card p-5 bg-paper border-2 border-ink hover:shadow-brutal-lg transition-shadow">
                      {/* Top metadata */}
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                        <span className="font-mono text-xs font-bold text-red">
                          {entry.entryHash.substring(0, 8)}
                        </span>
                        <span
                          className={`font-mono text-[10px] font-bold uppercase px-2 py-0.5 rounded border border-ink ${getPillColor(
                            entry.action
                          )}`}
                        >
                          {entry.action}
                        </span>
                      </div>

                      <div className="font-mono text-xs text-muted mb-2">
                        #{entry.index} · {new Date(entry.time).toLocaleString()}
                      </div>

                      <h4 className="text-base font-bold text-ink mb-1 font-sans">
                        {getEntryTitle(entry)}
                      </h4>

                      {/* Expandable JSON details */}
                      <button
                        data-guide="custody.expand"
                        onClick={() => toggleExpand(entry.index)}
                        className="mt-3 flex items-center space-x-1 text-xs font-mono font-bold text-blue hover:underline"
                      >
                        {isExpanded ? (
                          <>
                            <ChevronUp className="w-3.5 h-3.5" />
                            <span>{STRINGS.custody.hideFullEntry}</span>
                          </>
                        ) : (
                          <>
                            <ChevronDown className="w-3.5 h-3.5" />
                            <span>{STRINGS.custody.showFullEntry}</span>
                          </>
                        )}
                      </button>

                      {isExpanded && (
                        <div className="mt-3 pt-3 border-t border-ink/20 bg-terminal text-terminal-text p-3 rounded font-mono text-[11px] space-y-2">
                          <div>
                            <span className="text-gray-400">prevHash:</span>
                            <div className="break-all text-gray-300">{entry.prevHash}</div>
                          </div>
                          <div>
                            <span className="text-gray-400">entryHash:</span>
                            <div className="break-all text-yellow">{entry.entryHash}</div>
                          </div>
                          <div>
                            <span className="text-gray-400">details:</span>
                            <pre className="text-gray-300 overflow-x-auto">
                              {JSON.stringify(entry.details, null, 2)}
                            </pre>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Circular Node in Center */}
                  <div className="absolute left-4 md:left-1/2 transform -translate-x-1/2 w-7 h-7 rounded-full bg-paper border-3 border-ink flex items-center justify-center shadow-sm">
                    <span
                      className={`w-3 h-3 rounded-full ${
                        entry.action === 'FILE_ADDED'
                          ? 'bg-green'
                          : entry.action === 'SEAL_GENERATED'
                          ? 'bg-yellow'
                          : entry.action === 'DETAILS_SAVED'
                          ? 'bg-blue'
                          : 'bg-red'
                      }`}
                    />
                  </div>

                  {/* Empty Spacer on other half for desktop layout */}
                  <div className="hidden md:block w-[46%]" />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
