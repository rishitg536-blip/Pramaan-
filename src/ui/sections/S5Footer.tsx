import { useState } from 'react';
import { STRINGS } from '../strings';
import { WipeModal } from '../components/WipeModal';
import { ArrowUp, ExternalLink } from 'lucide-react';

interface S5FooterProps {
  onNavigateSection: (sectionId: string) => void;
}

export function S5Footer({ onNavigateSection }: S5FooterProps) {
  const [isWipeOpen, setIsWipeOpen] = useState(false);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="border-t-2 border-ink bg-paper py-12 px-4 sm:px-6 relative">
      <div className="max-w-6xl mx-auto">
        <div className="mb-4 flex items-center justify-between">
          <span className="px-2.5 py-0.5 bg-ink text-yellow border-2 border-ink text-[10px] font-mono font-black uppercase tracking-wider shadow-brutal-sm">
            FEATURE 07 // SYSTEM SAFETY, NAVIGATION &amp; PURGE (footer)
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Panel 1: NAVIGATE (Yellow top bar) */}
        <div data-guide="footer.nav" className="neo-card bg-paper overflow-hidden">
          <div className="bg-yellow px-4 py-2 border-b-2 border-ink font-mono text-xs font-bold uppercase tracking-wider text-ink">
            NAVIGATE
          </div>
          <div className="p-4 space-y-2 text-xs font-mono">
            <button
              data-guide="footer.nav.readme"
              onClick={() => onNavigateSection('readme-section')}
              className="block text-ink hover:text-blue hover:underline font-bold"
            >
              → 01. Case Details (README.md)
            </button>
            <button
              data-guide="footer.nav.evidence"
              onClick={() => onNavigateSection('evidence-section')}
              className="block text-ink hover:text-blue hover:underline font-bold"
            >
              → 02. Evidence Cards (evidence/)
            </button>
            <button
              data-guide="footer.nav.timeline"
              onClick={() => onNavigateSection('section-timeline')}
              className="block text-ink hover:text-blue hover:underline font-bold"
            >
              → 03. Timeline &amp; Consistency
            </button>
            <button
              data-guide="footer.nav.custody"
              onClick={() => onNavigateSection('custody-section')}
              className="block text-ink hover:text-blue hover:underline font-bold"
            >
              → 04. Custody Chain (custody.log)
            </button>
            <button
              data-guide="footer.nav.seal"
              onClick={() => onNavigateSection('seal-section')}
              className="block text-ink hover:text-blue hover:underline font-bold"
            >
              → 05. Seal &amp; Certify (Section 63(4))
            </button>
            <a
              data-guide="global.verifyPill"
              href="verify.html"
              className="block text-green hover:underline font-bold pt-2 border-t border-gray-100 flex items-center space-x-1"
            >
              <span>→ Standalone Verify Page</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

        {/* Panel 2: ABOUT (Pink top bar) */}
        <div className="neo-card bg-paper overflow-hidden">
          <div className="bg-pink px-4 py-2 border-b-2 border-ink font-mono text-xs font-bold uppercase tracking-wider text-ink">
            ABOUT PRAMAAN
          </div>
          <div className="p-4 space-y-2 text-xs font-mono text-muted leading-relaxed">
            <p>
              Local-first evidence fingerprinting and tamper-evident custody logging tool designed for Indian BSA Section 63(4) Part A compliance.
            </p>
            <p className="text-ink font-bold">
              {STRINGS.app.syntheticDataNotice}
            </p>
            <div className="pt-2">
              <button
                data-guide="footer.wipe"
                onClick={() => setIsWipeOpen(true)}
                className="text-red hover:underline font-bold uppercase tracking-wider text-[11px]"
              >
                ⚠ Wipe All Case Data (Reset Browser DB)
              </button>
            </div>
          </div>
        </div>
      </div>
      </div>

      {/* Bottom Status Strip */}
      <div className="max-w-6xl mx-auto pt-6 border-t border-ink/20 flex flex-col sm:flex-row items-center justify-between text-xs font-mono text-muted gap-4">
        <div className="flex items-center space-x-2">
          <span className="w-2 h-2 rounded-full bg-green" />
          <span>{STRINGS.app.allSystemsLocal}</span>
          <span>·</span>
          <span>v2.0.0-tier2</span>
        </div>
        <div className="text-center sm:text-right">
          <span>{STRINGS.app.draftNotice}</span>
        </div>
      </div>

      {/* Floating element: Circular "Back to top" bottom-left */}
      <button
        data-guide="global.backToTop"
        onClick={scrollToTop}
        className="fixed bottom-6 left-6 z-40 w-11 h-11 rounded-full neo-btn bg-paper text-ink flex items-center justify-center shadow-brutal hover:bg-yellow"
        title="Back to top"
      >
        <ArrowUp className="w-5 h-5" />
      </button>

      {/* Floating element: Green pill "verify a file ↗" bottom-right */}
      <a
        href="verify.html"
        className="fixed bottom-6 right-6 z-40 px-4 py-2.5 rounded-full neo-btn bg-green text-ink font-mono font-bold text-xs flex items-center space-x-1.5 shadow-brutal hover:bg-emerald-400"
      >
        <span>verify a file</span>
        <ExternalLink className="w-4 h-4" />
      </a>

      {/* Wipe Confirmation Modal */}
      <WipeModal isOpen={isWipeOpen} onClose={() => setIsWipeOpen(false)} />
    </footer>
  );
}
