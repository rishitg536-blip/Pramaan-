import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { GUIDE_REGISTRY, GuideEntry } from './registry';
import { GuidePopover } from './popover';

interface GuideContextValue {
  isGuideMode: boolean;
  toggleGuideMode: (value?: boolean) => void;
  openGuide: (guideId: string, element?: HTMLElement) => void;
  closeGuide: () => void;
  activeEntry: GuideEntry | null;
  onAskGuidePrompt: (prompt: string) => void;
  setAskGuideHandler: (handler: (prompt: string) => void) => void;
}

const GuideContext = createContext<GuideContextValue | null>(null);

export const useGuide = () => {
  const ctx = useContext(GuideContext);
  if (!ctx) {
    throw new Error('useGuide must be used within a GuideProvider');
  }
  return ctx;
};

interface GuideProviderProps {
  children: ReactNode;
}

function resolveGuideMatch(target: HTMLElement): { entry: GuideEntry; element: HTMLElement } | null {
  // 1. Direct or ancestor data-guide attribute
  const guideEl = target.closest('[data-guide]') as HTMLElement | null;
  if (guideEl) {
    const guideId = guideEl.getAttribute('data-guide');
    if (guideId && GUIDE_REGISTRY[guideId]) {
      return { entry: GUIDE_REGISTRY[guideId], element: guideEl };
    }
  }

  // 2. Interactive elements (button, input, select, textarea, link, role=button)
  const interactiveEl = target.closest(
    'button, input, select, textarea, a, [role="button"], label'
  ) as HTMLElement | null;

  if (interactiveEl) {
    const text = (interactiveEl.textContent || '').toLowerCase().trim();
    const title = (interactiveEl.getAttribute('title') || '').toLowerCase();
    const aria = (interactiveEl.getAttribute('aria-label') || '').toLowerCase();
    const id = (interactiveEl.getAttribute('id') || '').toLowerCase();
    const placeholder = (interactiveEl.getAttribute('placeholder') || '').toLowerCase();
    const combined = `${text} ${title} ${aria} ${id} ${placeholder}`;

    // Common heuristics mapped to existing registry entries
    if (combined.includes('verify again') || combined.includes('re-check')) {
      if (GUIDE_REGISTRY['evidence.verify']) return { entry: GUIDE_REGISTRY['evidence.verify'], element: interactiveEl };
    }
    if (combined.includes('tamper 1-byte') || combined.includes('tampered')) {
      if (GUIDE_REGISTRY['evidence.tamperDemo']) return { entry: GUIDE_REGISTRY['evidence.tamperDemo'], element: interactiveEl };
    }
    if (combined.includes('simulate tamper')) {
      if (GUIDE_REGISTRY['custody.simulateTamper']) return { entry: GUIDE_REGISTRY['custody.simulateTamper'], element: interactiveEl };
    }
    if (combined.includes('restore chain')) {
      if (GUIDE_REGISTRY['custody.restoreChain']) return { entry: GUIDE_REGISTRY['custody.restoreChain'], element: interactiveEl };
    }
    if (combined.includes('request public timestamp') || combined.includes('ots')) {
      if (GUIDE_REGISTRY['seal.requestTimestamp']) return { entry: GUIDE_REGISTRY['seal.requestTimestamp'], element: interactiveEl };
    }
    if (combined.includes('merge & build timeline') || combined.includes('timeline')) {
      if (GUIDE_REGISTRY['timeline.merge']) return { entry: GUIDE_REGISTRY['timeline.merge'], element: interactiveEl };
    }
    if (combined.includes('run all checks') || combined.includes('checks')) {
      if (GUIDE_REGISTRY['checks.runAll']) return { entry: GUIDE_REGISTRY['checks.runAll'], element: interactiveEl };
    }
    if (combined.includes('seal case') || combined.includes('seal')) {
      if (GUIDE_REGISTRY['seal.button']) return { entry: GUIDE_REGISTRY['seal.button'], element: interactiveEl };
    }
    if (combined.includes('wipe') || combined.includes('reset database')) {
      if (GUIDE_REGISTRY['footer.wipe']) return { entry: GUIDE_REGISTRY['footer.wipe'], element: interactiveEl };
    }
    if (combined.includes('quick exit') || combined.includes('panic')) {
      if (GUIDE_REGISTRY['global.quickExit']) return { entry: GUIDE_REGISTRY['global.quickExit'], element: interactiveEl };
    }

    // Dynamic fallback for any other button/control
    const rawLabel =
      interactiveEl.getAttribute('aria-label') ||
      interactiveEl.getAttribute('title') ||
      (interactiveEl.textContent || '').trim().replace(/\s+/g, ' ') ||
      interactiveEl.getAttribute('placeholder') ||
      `${interactiveEl.tagName.toUpperCase()} Feature`;

    const cleanLabel = rawLabel.length > 32 ? rawLabel.slice(0, 30) + '...' : rawLabel;

    return {
      element: interactiveEl,
      entry: {
        id: `auto.${interactiveEl.tagName.toLowerCase()}`,
        title: cleanLabel || 'Interactive Control',
        what: `Interactive control (${interactiveEl.tagName.toLowerCase()}). Features work side-by-side in Guide Mode: hover to see explanations, click or type to execute the feature normally.`,
        data: 'device',
      },
    };
  }

  return null;
}

export const GuideProvider: React.FC<GuideProviderProps> = ({ children }) => {
  const [isGuideMode, setIsGuideMode] = useState<boolean>(false);
  const [activeEntry, setActiveEntry] = useState<GuideEntry | null>(null);
  const [targetElement, setTargetElement] = useState<HTMLElement | null>(null);
  const [askGuideHandler, setAskGuideHandlerState] = useState<((prompt: string) => void) | null>(null);
  const dismissTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const toggleGuideMode = useCallback((value?: boolean) => {
    setIsGuideMode((prev) => {
      const next = typeof value === 'boolean' ? value : !prev;
      if (!next) {
        setActiveEntry(null);
        setTargetElement(null);
      }
      return next;
    });
  }, []);

  const openGuide = useCallback((guideId: string, element?: HTMLElement) => {
    const entry = GUIDE_REGISTRY[guideId];
    if (entry) {
      setActiveEntry(entry);
      setTargetElement(element || (document.querySelector(`[data-guide="${guideId}"]`) as HTMLElement | null) || document.body);
    } else {
      console.warn(`[Guide] Unregistered guide ID: "${guideId}"`);
    }
  }, []);

  const closeGuide = useCallback(() => {
    setActiveEntry(null);
    setTargetElement(null);
  }, []);

  const handleAskGuide = useCallback((entry: GuideEntry) => {
    closeGuide();
    if (askGuideHandler) {
      askGuideHandler(`Explain the feature "${entry.title}" and how I should use it safely.`);
    }
  }, [closeGuide, askGuideHandler]);

  // Hover-driven inspection with side-by-side feature execution
  useEffect(() => {
    if (!isGuideMode) return;

    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      // If hovering inside the popover itself or the exit banner, don't close
      if (
        target.closest('[data-guide-popover="true"]') ||
        target.closest('.guide-popover') ||
        target.closest('[data-guide-toggle="true"]') ||
        target.closest('.guide-banner')
      ) {
        if (dismissTimeoutRef.current) {
          clearTimeout(dismissTimeoutRef.current);
          dismissTimeoutRef.current = null;
        }
        return;
      }

      // Check for guide match
      const match = resolveGuideMatch(target);
      if (match) {
        if (dismissTimeoutRef.current) {
          clearTimeout(dismissTimeoutRef.current);
          dismissTimeoutRef.current = null;
        }
        setActiveEntry(match.entry);
        setTargetElement(match.element);
        return;
      }

      // Debounce dismissal when moving over background whitespace
      if (!dismissTimeoutRef.current) {
        dismissTimeoutRef.current = setTimeout(() => {
          setActiveEntry(null);
          setTargetElement(null);
          dismissTimeoutRef.current = null;
        }, 350);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (activeEntry) {
          closeGuide();
        } else {
          toggleGuideMode(false);
        }
      }
    };

    window.addEventListener('mouseover', handleMouseOver);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('mouseover', handleMouseOver);
      window.removeEventListener('keydown', handleKeyDown);
      if (dismissTimeoutRef.current) {
        clearTimeout(dismissTimeoutRef.current);
        dismissTimeoutRef.current = null;
      }
    };
  }, [isGuideMode, activeEntry, closeGuide, toggleGuideMode]);

  return (
    <GuideContext.Provider
      value={{
        isGuideMode,
        toggleGuideMode,
        openGuide,
        closeGuide,
        activeEntry,
        onAskGuidePrompt: (prompt: string) => askGuideHandler && askGuideHandler(prompt),
        setAskGuideHandler: (fn) => setAskGuideHandlerState(() => fn),
      }}
    >
      <div className={isGuideMode ? 'guide-mode-active' : ''}>
        {children}
      </div>

      {isGuideMode && (
        <div className="guide-banner fixed bottom-4 left-4 z-40 bg-yellow text-ink border-2 border-ink px-3 py-1 font-mono text-xs font-bold shadow-brutal flex items-center space-x-2 animate-bounce">
          <span>ℹ GUIDE MODE ACTIVE: Hover any button to inspect (features work side-by-side)</span>
          <button
            data-guide-toggle="true"
            onClick={() => toggleGuideMode(false)}
            className="ml-2 bg-ink text-paper px-1.5 py-0.5 text-[10px] uppercase hover:bg-red"
          >
            Exit (Esc)
          </button>
        </div>
      )}

      {activeEntry && targetElement && (
        <GuidePopover
          entry={activeEntry}
          targetElement={targetElement}
          onClose={closeGuide}
          onAskGuide={askGuideHandler ? handleAskGuide : undefined}
        />
      )}
    </GuideContext.Provider>
  );
};
