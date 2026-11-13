import { CustodyEntry } from '../../core/types';
import { STRINGS } from '../strings';

interface GitTickerProps {
  entries: CustodyEntry[];
  isGuideMode?: boolean;
  onToggleGuide?: () => void;
  mode?: 'local' | 'cloud';
  onOpenPrivacy?: () => void;
}

export function GitTicker({
  entries,
  isGuideMode,
  onToggleGuide,
  mode = 'local',
  onOpenPrivacy,
}: GitTickerProps) {
  const handleQuickExit = () => {
    window.location.replace(STRINGS.safety.quickExitTarget);
  };

  const getActionPillClass = (action: string) => {
    switch (action) {
      case 'FILE_ADDED':
        return 'bg-green text-ink';
      case 'DETAILS_SAVED':
        return 'bg-blue text-white';
      case 'SEAL_GENERATED':
        return 'bg-yellow text-ink';
      case 'EXPORT_GENERATED':
        return 'bg-pink text-ink';
      default:
        return 'bg-paper text-ink';
    }
  };

  const getEntrySummary = (entry: CustodyEntry) => {
    if (entry.action === 'FILE_ADDED') {
      return `added ${(entry.details?.name as string) || 'evidence file'}`;
    }
    if (entry.action === 'DETAILS_SAVED') {
      return 'updated case details';
    }
    if (entry.action === 'SEAL_GENERATED') {
      return `sealed case (${(entry.details?.fileCount as number) || 0} files)`;
    }
    if (entry.action === 'EXPORT_GENERATED') {
      return `exported ${(entry.details?.kind as string) || 'artifact'}`;
    }
    if (entry.action === 'FILE_VERIFIED') {
      return `re-verified file`;
    }
    return 'initialized repository';
  };

  return (
    <div
      data-guide="global.ticker"
      className="sticky top-0 z-40 bg-terminal border-b-2 border-ink text-terminal-text h-14 flex items-center justify-between px-3 md:px-6 shadow-sm overflow-hidden select-none"
    >
      {/* Left git status chip */}
      <div className="flex items-center space-x-2 flex-shrink-0 z-10 bg-terminal pr-3">
        <span className="font-mono text-xs font-bold text-green hidden sm:inline">
          {STRINGS.ticker.prefix}
        </span>
        <span className="font-mono text-xs px-2 py-0.5 rounded bg-gray-800 text-yellow border border-gray-700">
          {STRINGS.ticker.branch}
        </span>
        <span className="font-mono text-xs text-muted">
          {entries.length === 0
            ? STRINGS.ticker.empty
            : STRINGS.ticker.commits(entries.length)}
        </span>
      </div>

      {/* Auto-scrolling ticker track */}
      {entries.length > 0 && (
        <div className="flex-1 overflow-hidden relative mx-4 hidden md:block">
          <div className="ticker-track flex items-center space-x-4">
            {/* Repeat list twice for smooth infinite loop */}
            {[...entries, ...entries].map((entry, idx) => (
              <div
                key={idx}
                className="flex items-center space-x-2 px-3 py-1 bg-black/60 border border-gray-800 rounded font-mono text-xs flex-shrink-0"
              >
                <span className="text-red font-bold">
                  {entry.entryHash.substring(0, 7)}
                </span>
                <span
                  className={`px-1.5 py-0.2 rounded text-[10px] font-bold border border-ink ${getActionPillClass(
                    entry.action
                  )}`}
                >
                  {entry.action}
                </span>
                <span className="text-gray-300 truncate max-w-[200px]">
                  {getEntrySummary(entry)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Right control buttons */}
      <div className="flex items-center space-x-2 flex-shrink-0 z-10 bg-terminal pl-3">
        {onToggleGuide && (
          <button
            data-guide="global.guidePill"
            data-guide-toggle="true"
            onClick={onToggleGuide}
            className={`text-[11px] font-mono font-bold px-2.5 py-1 rounded border border-ink transition-colors ${
              isGuideMode
                ? 'bg-yellow text-ink shadow-brutal-sm'
                : 'bg-gray-800 text-gray-300 hover:text-white'
            }`}
          >
            {isGuideMode ? 'GUIDE ON' : 'GUIDE MODE'}
          </button>
        )}

        {onOpenPrivacy && (
          <button
            data-guide="global.modeChip"
            onClick={onOpenPrivacy}
            className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded border ${
              mode === 'cloud'
                ? 'bg-pink/20 text-pink border-pink'
                : 'bg-green/20 text-green border-green'
            }`}
          >
            {mode.toUpperCase()}
          </button>
        )}

        <button
          data-guide="global.quickExit"
          onClick={handleQuickExit}
          className="text-xs font-mono font-bold px-3 py-1 bg-red text-white border border-ink rounded shadow-brutal-sm hover:opacity-90 active:translate-y-0.5"
          title="Immediately leave this page"
        >
          {STRINGS.safety.quickExit}
        </button>
      </div>
    </div>
  );
}
