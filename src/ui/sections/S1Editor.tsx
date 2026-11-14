import { useState, useEffect, useRef } from 'react';
import { CaseDetails, CustodyEntry, SealSnapshot } from '../../core/types';
import { STRINGS } from '../strings';
import { canonicalJson } from '../../core/canonical';
import { sha256Hex } from '../../core/hash';
import { appendCustodyLogEntry, updateCaseDetails } from '../../storage/db';
import { appendEntry } from '../../core/custody';

interface S1EditorProps {
  details: CaseDetails;
  caseTitle: string;
  filesCount: number;
  log: CustodyEntry[];
  latestSeal: SealSnapshot | null;
  onDetailsUpdated: (details: CaseDetails, title: string, newLogEntry?: CustodyEntry) => void;
  onNavigateSection: (sectionId: string) => void;
  onOpenIntake?: () => void;
}

export function S1Editor({
  details,
  caseTitle,
  filesCount,
  log,
  latestSeal,
  onDetailsUpdated,
  onNavigateSection,
  onOpenIntake,
}: S1EditorProps) {
  const [formData, setFormData] = useState<CaseDetails>(details);
  const [title, setTitle] = useState(caseTitle);
  const lastLoggedHashRef = useRef<string>('');
  const lastLogTimeRef = useRef<number>(0);

  useEffect(() => {
    setFormData(details);
  }, [details]);

  useEffect(() => {
    setTitle(caseTitle);
  }, [caseTitle]);

  // Debounced autosave
  useEffect(() => {
    const timer = setTimeout(async () => {
      await updateCaseDetails(formData, title);

      // Check if we should log DETAILS_SAVED
      const hasAnyField =
        formData.name.trim() ||
        formData.parentage.trim() ||
        formData.address.trim();

      if (hasAnyField) {
        const canonical = canonicalJson(formData);
        const detailsHash = await sha256Hex(canonical);
        const now = Date.now();

        // Log if first save or 30 seconds since last log and details hash changed
        if (
          !lastLoggedHashRef.current ||
          (detailsHash !== lastLoggedHashRef.current && now - lastLogTimeRef.current > 30000)
        ) {
          lastLoggedHashRef.current = detailsHash;
          lastLogTimeRef.current = now;

          const entry = await appendEntry(log, 'DETAILS_SAVED', { detailsHash });
          await appendCustodyLogEntry(entry);
          onDetailsUpdated(formData, title, entry);
          return;
        }
      }

      onDetailsUpdated(formData, title);
    }, 500);

    return () => clearTimeout(timer);
  }, [formData, title]);

  const lastLogTime = log.length > 0 ? log[log.length - 1].time : 'just now';

  return (
    <section id="readme-section" className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-4 flex items-center justify-between">
        <span className="px-2.5 py-0.5 bg-amber-400 text-ink border-2 border-ink text-[10px] font-mono font-black uppercase tracking-wider shadow-brutal-sm">
          FEATURE 01 // CASE DOSSIER &amp; REGISTRATION (README.md)
        </span>
      </div>
      {/* Editor Main Window */}
      <div className="neo-card bg-terminal text-terminal-text border-2 border-ink rounded-lg shadow-brutal overflow-hidden relative">
        {/* Taped label in top-right */}
        <div className="absolute top-2 right-4 z-20 transform -rotate-3 bg-sky-200 text-ink border border-ink px-2.5 py-0.5 shadow-sm font-mono text-[10px] uppercase font-bold tracking-wider select-none hidden sm:block">
          {STRINGS.editor.lastUpdated}: {new Date(lastLogTime).toLocaleTimeString()}
        </div>

        {/* Top window header bar */}
        <div className="bg-black/90 px-4 py-3 border-b border-gray-800 flex flex-wrap items-center justify-between gap-3 select-none">
          {/* Traffic light dots */}
          <div className="flex items-center space-x-2">
            <span className="w-3 h-3 rounded-full bg-red border border-black/40" />
            <span className="w-3 h-3 rounded-full bg-yellow border border-black/40" />
            <span className="w-3 h-3 rounded-full bg-green border border-black/40" />
            <span className="ml-2 font-mono text-xs text-gray-400 font-bold hidden sm:inline">
              case-workspace — bash
            </span>
          </div>

          {/* Navigation tabs */}
          <div className="flex items-center space-x-1 sm:space-x-2 text-xs font-mono">
            <button
              data-guide="editor.tab.readme"
              onClick={() => onNavigateSection('readme-section')}
              className="px-2.5 py-1 rounded bg-gray-800 text-yellow font-bold border border-gray-700"
            >
              README.md
            </button>
            <button
              data-guide="editor.tab.evidence"
              onClick={() => onNavigateSection('evidence-section')}
              className="px-2.5 py-1 rounded text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
            >
              evidence/
            </button>
            <button
              data-guide="editor.tab.timeline"
              onClick={() => onNavigateSection('section-timeline')}
              className="px-2.5 py-1 rounded text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
            >
              timeline
            </button>
            <button
              data-guide="editor.tab.custody"
              onClick={() => onNavigateSection('custody-section')}
              className="px-2.5 py-1 rounded text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
            >
              custody.log
            </button>
            <button
              data-guide="editor.tab.certificate"
              onClick={() => onNavigateSection('seal-section')}
              className="px-2.5 py-1 rounded text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
            >
              seal &amp; certify
            </button>
          </div>
        </div>

        {/* Status chip strip */}
        <div className="bg-black/60 px-4 py-1.5 border-b border-gray-900 flex flex-wrap items-center gap-2 text-[11px] font-mono">
          <span data-guide="editor.chip.files" className="px-2 py-0.5 rounded bg-gray-900 text-green border border-gray-800">
            files {filesCount}
          </span>
          <span data-guide="editor.chip.log" className="px-2 py-0.5 rounded bg-gray-900 text-blue border border-gray-800">
            log {log.length}
          </span>
          <span data-guide="editor.chip.branch" className="px-2 py-0.5 rounded bg-gray-900 text-yellow border border-gray-800">
            branch main
          </span>
          <span data-guide="editor.chip.seal" className="px-2 py-0.5 rounded bg-gray-900 text-pink border border-gray-800">
            seal {latestSeal ? `#${latestSeal.n}` : 'none'}
          </span>
          {onOpenIntake && (
            <button
              type="button"
              onClick={onOpenIntake}
              className="ml-auto px-2 py-0.5 rounded bg-yellow text-ink border border-ink text-[10px] font-mono font-bold uppercase tracking-wider hover:bg-yellow/90 shadow-[1px_1px_0px_#000]"
            >
              ✎ RE-OPEN INTAKE
            </button>
          )}
        </div>

        {/* Editor Body: Left Inputs + Right Live Preview */}
        <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[460px]">
          {/* Left Form (Editor Lines) */}
          <div className="lg:col-span-7 p-4 sm:p-6 font-mono text-sm space-y-4 border-b lg:border-b-0 lg:border-r border-gray-800 bg-[#0c0c0c]">
            {/* Line 1: Heading */}
            <div className="flex items-baseline space-x-3">
              <span className="text-green text-xs w-5 text-right select-none font-bold">1</span>
              <span className="font-hand text-3xl sm:text-4xl text-green leading-none">
                {STRINGS.editor.heading}
              </span>
            </div>

            {/* Line 2: Empty line */}
            <div className="flex items-center space-x-3">
              <span className="text-gray-700 text-xs w-5 text-right select-none">2</span>
              <span className="text-gray-600">// Enter the deponent details for Section 63(4) Part A</span>
            </div>

            {/* Line 3: Name */}
            <div className="flex flex-col sm:flex-row sm:items-baseline space-y-1 sm:space-y-0 sm:space-x-3">
              <div className="flex items-center space-x-3 sm:w-52 flex-shrink-0">
                <span className="text-green text-xs w-5 text-right select-none">3</span>
                <span className="text-yellow font-bold">{STRINGS.editor.nameLabel}</span>
              </div>
              <input
                data-guide="readme.name"
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder={STRINGS.editor.namePlaceholder}
                className="flex-1 bg-black/60 border border-gray-800 text-terminal-text px-2.5 py-1 rounded focus:outline-none focus:border-yellow font-mono text-xs sm:text-sm"
              />
            </div>

            {/* Line 4: Parentage */}
            <div className="flex flex-col sm:flex-row sm:items-baseline space-y-1 sm:space-y-0 sm:space-x-3">
              <div className="flex items-center space-x-3 sm:w-52 flex-shrink-0">
                <span className="text-green text-xs w-5 text-right select-none">4</span>
                <span className="text-yellow font-bold">{STRINGS.editor.parentageLabel}</span>
              </div>
              <input
                data-guide="readme.parentage"
                type="text"
                value={formData.parentage}
                onChange={(e) => setFormData({ ...formData, parentage: e.target.value })}
                placeholder={STRINGS.editor.parentagePlaceholder}
                className="flex-1 bg-black/60 border border-gray-800 text-terminal-text px-2.5 py-1 rounded focus:outline-none focus:border-yellow font-mono text-xs sm:text-sm"
              />
            </div>

            {/* Line 5: Address */}
            <div className="flex flex-col sm:flex-row sm:items-start space-y-1 sm:space-y-0 sm:space-x-3">
              <div className="flex items-center space-x-3 sm:w-52 flex-shrink-0 pt-1">
                <span className="text-green text-xs w-5 text-right select-none">5</span>
                <span className="text-yellow font-bold">{STRINGS.editor.addressLabel}</span>
              </div>
              <textarea
                data-guide="readme.address"
                rows={2}
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder={STRINGS.editor.addressPlaceholder}
                className="flex-1 bg-black/60 border border-gray-800 text-terminal-text px-2.5 py-1 rounded focus:outline-none focus:border-yellow font-mono text-xs sm:text-sm resize-none"
              />
            </div>

            {/* Line 6: Case title */}
            <div className="flex flex-col sm:flex-row sm:items-baseline space-y-1 sm:space-y-0 sm:space-x-3">
              <div className="flex items-center space-x-3 sm:w-52 flex-shrink-0">
                <span className="text-green text-xs w-5 text-right select-none">6</span>
                <span className="text-blue font-bold">{STRINGS.editor.caseTitleLabel}</span>
              </div>
              <input
                data-guide="readme.title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={STRINGS.editor.caseTitlePlaceholder}
                className="flex-1 bg-black/60 border border-gray-800 text-terminal-text px-2.5 py-1 rounded focus:outline-none focus:border-blue font-mono text-xs sm:text-sm"
              />
            </div>
          </div>

          {/* Right Pane: Live Preview & Runtime Traces */}
          <div data-guide="readme.preview" className="lg:col-span-5 p-4 sm:p-6 bg-black/80 flex flex-col justify-between space-y-6">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-gray-800 mb-4">
                <span className="font-mono text-xs font-bold text-gray-400">
                  {STRINGS.editor.previewTitle}
                </span>
                <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-green/20 text-green border border-green/40">
                  {STRINGS.editor.previewActive}
                </span>
              </div>

              {/* Live Preview Cards */}
              <div className="space-y-3 font-mono text-xs">
                <div>
                  <span className="text-gray-500 block mb-0.5">Deponent Name:</span>
                  {formData.name ? (
                    <span className="text-white font-bold">{formData.name}</span>
                  ) : (
                    <span className="px-2 py-0.5 bg-pink/20 text-pink border border-pink/40 rounded text-[11px]">
                      {STRINGS.editor.requiredPartA}
                    </span>
                  )}
                </div>

                <div>
                  <span className="text-gray-500 block mb-0.5">Parentage:</span>
                  {formData.parentage ? (
                    <span className="text-white">{formData.parentage}</span>
                  ) : (
                    <span className="px-2 py-0.5 bg-pink/20 text-pink border border-pink/40 rounded text-[11px]">
                      {STRINGS.editor.requiredPartA}
                    </span>
                  )}
                </div>

                <div>
                  <span className="text-gray-500 block mb-0.5">Address:</span>
                  {formData.address ? (
                    <span className="text-white">{formData.address}</span>
                  ) : (
                    <span className="px-2 py-0.5 bg-pink/20 text-pink border border-pink/40 rounded text-[11px]">
                      {STRINGS.editor.requiredPartA}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Runtime Traces */}
            <div data-guide="readme.traces" className="pt-4 border-t border-gray-800">
              <span className="font-mono text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-2">
                {STRINGS.editor.runtimeTraces(log.length)}
              </span>
              <div className="space-y-1.5 font-mono text-[11px] max-h-36 overflow-y-auto">
                {log.slice(-4).reverse().map((entry) => (
                  <div key={entry.index} className="flex items-center space-x-2 text-gray-400 truncate">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        entry.action === 'FILE_ADDED'
                          ? 'bg-green'
                          : entry.action === 'SEAL_GENERATED'
                          ? 'bg-yellow'
                          : entry.action === 'DETAILS_SAVED'
                          ? 'bg-blue'
                          : 'bg-gray-500'
                      }`}
                    />
                    <span className="text-gray-600">#{entry.index}</span>
                    <span className="text-gray-300">{entry.action}</span>
                    <span className="text-gray-500 text-[10px] truncate">
                      {new Date(entry.time).toLocaleTimeString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
