import { useEffect, useState } from 'react';
import { STRINGS } from '../strings';
import { StoredEvidenceFile } from '../../storage/db';
import { CustodyEntry, SealSnapshot, CaseDetails } from '../../core/types';
import { ShieldCheck } from 'lucide-react';

interface S0HeroProps {
  files: StoredEvidenceFile[];
  log: CustodyEntry[];
  latestSeal: SealSnapshot | null;
  caseTitle?: string;
  details?: CaseDetails;
  onEditCaseDetails?: () => void;
}

function useCountUp(target: number, duration: number = 500) {
  const [count, setCount] = useState(target);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;
    if (prefersReducedMotion) {
      setCount(target);
      return;
    }

    let start = 0;
    const diff = target - start;
    if (diff === 0) {
      setCount(0);
      return;
    }
    const steps = 15;
    const stepDuration = duration / steps;
    let currentStep = 0;

    const timer = setInterval(() => {
      currentStep++;
      const current = Math.round(start + (diff * (currentStep / steps)));
      setCount(current);
      if (currentStep >= steps) {
        clearInterval(timer);
        setCount(target);
      }
    }, stepDuration);

    return () => clearInterval(timer);
  }, [target, duration]);

  return count;
}

export function S0Hero({
  files,
  log,
  latestSeal,
  caseTitle,
  details,
  onEditCaseDetails,
}: S0HeroProps) {
  const animatedFilesCount = useCountUp(files.length);
  const animatedLogCount = useCountUp(log.length);

  // Calculate file type breakdown for segmented activity bar
  const totalFiles = files.length;
  let chatCount = 0;
  let imageCount = 0;
  let audioCount = 0;
  let otherCount = 0;

  for (const f of files) {
    const mime = f.mimeType.toLowerCase();
    const name = f.name.toLowerCase();
    if (mime.startsWith('image/')) {
      imageCount++;
    } else if (mime.startsWith('audio/')) {
      audioCount++;
    } else if (name.endsWith('.txt') || name.endsWith('.zip') || mime.includes('text') || name.includes('chat')) {
      chatCount++;
    } else {
      otherCount++;
    }
  }

  const chatPct = totalFiles > 0 ? Math.round((chatCount / totalFiles) * 100) : 0;
  const imagePct = totalFiles > 0 ? Math.round((imageCount / totalFiles) * 100) : 0;
  const audioPct = totalFiles > 0 ? Math.round((audioCount / totalFiles) * 100) : 0;
  const otherPct = totalFiles > 0 ? Math.max(0, 100 - (chatPct + imagePct + audioPct)) : 0;

  return (
    <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-8 pb-12">
      {/* Top Section Tag */}
      <div className="mb-4 flex items-center justify-between">
        <span className="px-2.5 py-0.5 bg-yellow text-ink border-2 border-ink text-[10px] font-mono font-black uppercase tracking-wider shadow-brutal-sm">
          FEATURE 00 // OVERVIEW &amp; TELEMETRY
        </span>
      </div>
      {/* Breadcrumb & Privacy Badge */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="font-mono text-xs sm:text-sm text-blue font-bold flex items-center space-x-1.5">
          <span>pramaan</span>
          <span className="text-muted">/</span>
          <span className="text-ink">README.md</span>
        </div>
        <div className="inline-flex items-center space-x-1.5 px-3 py-1 bg-green/15 text-ink border border-ink rounded-full text-xs font-mono font-bold">
          <ShieldCheck className="w-3.5 h-3.5 text-green" />
          <span>{STRINGS.app.deviceOnlyChip}</span>
        </div>
      </div>

      {/* Main Headline */}
      <div className="max-w-4xl mb-8">
        <h1 className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tight text-ink leading-[1.05]">
          {STRINGS.app.tagline}
        </h1>
        <p className="mt-4 text-base sm:text-xl text-muted font-sans font-medium max-w-2xl leading-relaxed">
          {STRINGS.app.subline}
        </p>
      </div>

      {/* Active Case Dossier Banner (details from login page) */}
      {details && (details.name || caseTitle) && (
        <div className="neo-card p-5 bg-white border-2 border-ink shadow-[4px_4px_0px_#0F0F0F] rounded-md mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <span className="px-2 py-0.5 bg-yellow text-ink border border-ink text-[10px] font-mono font-black uppercase">
                  REGISTERED CASE DOSSIER
                </span>
                <span className="text-xs font-mono text-muted">
                  SECTION 63(4) BSA
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-black font-sans text-ink uppercase tracking-wide">
                {caseTitle || 'Untitled Case Dossier'}
              </h2>
              <div className="text-xs font-mono text-muted flex flex-wrap items-center gap-x-4 gap-y-1 pt-1">
                {details.name && (
                  <span>
                    DEPONENT: <strong className="text-ink">{details.name}</strong>
                    {details.parentage ? ` (${details.parentage})` : ''}
                  </span>
                )}
                {details.address && (
                  <span className="truncate max-w-xs sm:max-w-md">
                    ADDR: <span className="text-ink">{details.address}</span>
                  </span>
                )}
                {details.device?.model && (
                  <span>
                    DEVICE: <strong className="text-ink">{details.device.sourceType || 'Device'} — {details.device.model}</strong>
                    {details.device.colour ? ` (${details.device.colour})` : ''}
                  </span>
                )}
                {details.device?.identifier && (
                  <span>
                    ID: <strong className="text-ink">{details.device.identifier}</strong>
                  </span>
                )}
              </div>
            </div>

            {onEditCaseDetails && (
              <button
                type="button"
                onClick={onEditCaseDetails}
                className="self-start md:self-center px-3.5 py-1.5 bg-paper hover:bg-yellow text-ink font-mono text-xs font-bold border-2 border-ink shadow-[2px_2px_0px_#0F0F0F] rounded transition-all cursor-pointer whitespace-nowrap"
              >
                ✎ EDIT DETAILS
              </button>
            )}
          </div>
        </div>
      )}

      {/* Stat counters row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {/* Stat 1: Files */}
        <div data-guide="hero.stat.files" className="neo-card p-4 bg-paper">
          <div className="text-3xl sm:text-4xl font-black font-sans text-ink">
            {animatedFilesCount}
          </div>
          <div className="text-[11px] font-mono text-muted uppercase tracking-wider mt-1">
            {STRINGS.stats.files}
          </div>
        </div>

        {/* Stat 2: Log entries */}
        <div data-guide="hero.stat.log" className="neo-card p-4 bg-paper">
          <div className="text-3xl sm:text-4xl font-black font-sans text-ink">
            {animatedLogCount}
          </div>
          <div className="text-[11px] font-mono text-muted uppercase tracking-wider mt-1">
            {STRINGS.stats.logEntries}
          </div>
        </div>

        {/* Stat 3: Seal Status */}
        <div data-guide="hero.stat.seal" className="neo-card p-4 bg-paper">
          <div className="text-xl sm:text-2xl font-black font-sans text-ink truncate">
            {latestSeal ? `#${latestSeal.n}` : 'NONE'}
          </div>
          <div className="text-[11px] font-mono text-muted uppercase tracking-wider mt-1">
            {latestSeal ? STRINGS.stats.sealNumber(latestSeal.n) : STRINGS.stats.sealNone}
          </div>
        </div>

        {/* Stat 4: Timestamp */}
        <div data-guide="hero.stat.timestamp" className="neo-card p-4 bg-paper">
          <div className="text-xl sm:text-2xl font-black font-sans text-muted">
            PENDING
          </div>
          <div className="text-[11px] font-mono text-muted uppercase tracking-wider mt-1">
            {STRINGS.stats.timestampPlaceholder}
          </div>
        </div>
      </div>

      {/* Segmented activity bar */}
      {totalFiles > 0 && (
        <div data-guide="hero.typeBar" className="neo-card p-4 bg-paper mb-6">
          <div className="flex items-center justify-between text-xs font-mono text-muted mb-2">
            <span className="font-bold text-ink uppercase tracking-wider">Evidence Breakdown</span>
            <span>{totalFiles} total</span>
          </div>
          {/* Segmented bar */}
          <div className="h-4 w-full bg-gray-100 rounded-sm overflow-hidden flex border border-ink">
            {chatPct > 0 && (
              <div
                style={{ width: `${chatPct}%` }}
                className="bg-yellow transition-all duration-300"
                title={`Chat exports: ${chatCount} (${chatPct}%)`}
              />
            )}
            {imagePct > 0 && (
              <div
                style={{ width: `${imagePct}%` }}
                className="bg-green transition-all duration-300"
                title={`Images: ${imageCount} (${imagePct}%)`}
              />
            )}
            {audioPct > 0 && (
              <div
                style={{ width: `${audioPct}%` }}
                className="bg-blue transition-all duration-300"
                title={`Voice notes: ${audioCount} (${audioPct}%)`}
              />
            )}
            {otherPct > 0 && (
              <div
                style={{ width: `${otherPct}%` }}
                className="bg-pink transition-all duration-300"
                title={`Other files: ${otherCount} (${otherPct}%)`}
              />
            )}
          </div>
          {/* Legend */}
          <div className="flex flex-wrap items-center gap-4 mt-3 text-xs font-mono">
            <div className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-yellow border border-ink" />
              <span>Chat exports: {chatPct}%</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-green border border-ink" />
              <span>Images: {imagePct}%</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue border border-ink" />
              <span>Voice notes: {audioPct}%</span>
            </div>
            {otherCount > 0 && (
              <div className="flex items-center space-x-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-pink border border-ink" />
                <span>Other: {otherPct}%</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Empty State handwritten hint */}
      {totalFiles === 0 && (
        <div className="text-center sm:text-left mt-2">
          <span className="font-hand text-2xl text-blue -rotate-2 inline-block">
            add your first evidence file below ↓
          </span>
        </div>
      )}
    </section>
  );
}
