import React from 'react';
import { useFloating, offset, flip, shift, autoUpdate } from '@floating-ui/react';
import { GuideEntry } from './registry';
import { HelpCircle, AlertTriangle, ArrowRight, MessageSquare, X } from 'lucide-react';

interface GuidePopoverProps {
  entry: GuideEntry | null;
  targetElement: HTMLElement | null;
  onClose: () => void;
  onAskGuide?: (entry: GuideEntry) => void;
}

export const GuidePopover: React.FC<GuidePopoverProps> = ({
  entry,
  targetElement,
  onClose,
  onAskGuide,
}) => {
  const { refs, floatingStyles } = useFloating({
    elements: {
      reference: targetElement,
    },
    placement: 'bottom-start',
    whileElementsMounted: autoUpdate,
    middleware: [
      offset(10),
      flip({ fallbackPlacements: ['top-start', 'right', 'left'] }),
      shift({ padding: 12 }),
    ],
  });

  if (!entry || !targetElement) return null;

  const dataTagStyles: Record<string, { label: string; bg: string; text: string; border: string }> = {
    none: { label: 'NO DATA SAVED', bg: 'bg-gray-100', text: 'text-gray-800', border: 'border-gray-400' },
    device: { label: 'STAYS ON DEVICE', bg: 'bg-green/20', text: 'text-emerald-900', border: 'border-green' },
    fingerprint: { label: 'FINGERPRINT ONLY', bg: 'bg-yellow/20', text: 'text-amber-900', border: 'border-yellow' },
    helper: { label: 'HELPER COMPUTATION', bg: 'bg-blue/20', text: 'text-blue-900', border: 'border-blue' },
    cloud: { label: 'CLOUD AI (IF ENABLED)', bg: 'bg-pink/20', text: 'text-rose-900', border: 'border-pink' },
  };

  const tag = dataTagStyles[entry.data] || dataTagStyles.none;

  return (
    <div
      ref={refs.setFloating}
      data-guide-popover="true"
      style={{ ...floatingStyles, zIndex: 9999 }}
      className="guide-popover w-80 max-w-[90vw] bg-[#fffdf0] border-2 border-ink shadow-brutal p-4 relative font-sans text-ink select-none transform rotate-[-0.5deg]"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Decorative top yellow tape */}
      <div className="absolute -top-3 left-8 w-20 h-5 bg-yellow/85 border border-ink shadow-sm rotate-2 pointer-events-none" />

      {/* Header */}
      <div className="flex items-start justify-between border-b-2 border-ink pb-2 mb-2 pt-1">
        <div className="flex items-center space-x-1.5">
          <HelpCircle className="w-4 h-4 text-field shrink-0" />
          <h3 className="font-hand text-xl font-bold text-ink leading-tight">
            {entry.title}
          </h3>
        </div>
        <button
          onClick={onClose}
          className="text-ink hover:bg-black/10 p-0.5 rounded border border-transparent hover:border-ink transition-colors ml-2"
          aria-label="Close explanation"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <div className="space-y-2 text-xs leading-relaxed font-sans">
        <div>
          <p className="text-ink">{entry.what}</p>
        </div>

        {entry.when && (
          <div className="bg-paper p-1.5 border border-ink/40 text-[11px]">
            <span className="font-bold font-mono uppercase text-[10px] text-muted block mb-0.5">
              When to use:
            </span>
            <p className="text-ink">{entry.when}</p>
          </div>
        )}

        {entry.careful && (
          <div className="bg-red/10 border-l-2 border-red p-1.5 text-[11px] flex items-start space-x-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-red shrink-0 mt-0.5" />
            <p className="text-red font-medium">{entry.careful}</p>
          </div>
        )}

        {/* Data handling classification */}
        <div className="pt-1">
          <span
            className={`inline-block font-mono text-[9px] font-bold px-1.5 py-0.5 border ${tag.border} ${tag.bg} ${tag.text}`}
          >
            DATA: {tag.label}
          </span>
        </div>

        {entry.next && (
          <div className="pt-1 text-[11px] font-mono text-muted flex items-center space-x-1">
            <ArrowRight className="w-3 h-3 text-ink shrink-0" />
            <span>Next: {entry.next}</span>
          </div>
        )}
      </div>

      {/* Footer action: Ask Guide AI */}
      {onAskGuide && (
        <div className="mt-3 pt-2 border-t border-ink/20 flex justify-end">
          <button
            onClick={() => onAskGuide(entry)}
            className="flex items-center space-x-1 text-[11px] font-mono font-bold px-2 py-1 bg-ink text-paper hover:bg-field transition-colors"
          >
            <MessageSquare className="w-3 h-3" />
            <span>Ask Guide AI</span>
          </button>
        </div>
      )}
    </div>
  );
};

