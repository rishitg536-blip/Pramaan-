import React, { useEffect, useState, useRef, useCallback } from 'react';

interface LoadingScreenProps {
  isReady: boolean;
  onFinish: () => void;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ isReady: _isReady, onFinish }) => {
  const [progress, setProgress] = useState(15);
  const [isExiting, setIsExiting] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const hasStartedExitRef = useRef(false);
  const onFinishRef = useRef(onFinish);
  const exitTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    onFinishRef.current = onFinish;
  });

  // Check user preference for reduced motion
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // Trigger smooth exit transition
  const triggerExit = useCallback(() => {
    if (hasStartedExitRef.current) return;
    hasStartedExitRef.current = true;
    setProgress(100);
    setIsExiting(true);

    const exitDuration = prefersReducedMotion ? 120 : 700;
    exitTimerRef.current = setTimeout(() => {
      onFinishRef.current();
    }, exitDuration);
  }, [prefersReducedMotion]);

  // Global skip listener (Escape key)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        triggerExit();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [triggerExit]);

  // Progress engine: automatically advances progress and automatically transitions after exactly 2.0s
  useEffect(() => {
    const startTime = Date.now();
    const duration = 2000;

    const timer = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(Math.round((elapsed / duration) * 100), 100);
      setProgress(Math.max(pct, 15));

      if (elapsed >= duration) {
        clearInterval(timer);
        triggerExit();
      }
    }, 35);

    return () => clearInterval(timer);
  }, [triggerExit]);

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
    };
  }, []);

  const handleSkipClick = (e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation();
    triggerExit();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Pramaan loading screen"
      className={`fixed inset-0 z-[9999] flex flex-col justify-between select-none overflow-hidden transition-all duration-700 ease-[cubic-bezier(0.76,0,0.24,1)] ${
        isExiting
          ? prefersReducedMotion
            ? 'opacity-0 pointer-events-none'
            : '-translate-y-full opacity-95 pointer-events-none'
          : 'translate-y-0 opacity-100'
      }`}
      style={{
        backgroundColor: '#FAF7EE',
      }}
    >
      {/* Subtle Dot Grid Pattern */}
      <div
        className="absolute inset-0 pointer-events-none opacity-45"
        style={{
          backgroundImage:
            'radial-gradient(rgba(15, 15, 15, 0.13) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
        aria-hidden="true"
      />

      {/* Faint Paper Vignette Depth */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(circle at 50% 50%, rgba(255, 255, 255, 0.55) 0%, rgba(15, 15, 15, 0.04) 100%)',
        }}
        aria-hidden="true"
      />

      {/* Top Margin Spacer */}
      <div className="w-full pt-6 sm:pt-10 px-6 sm:px-10 flex justify-between items-center opacity-0 pointer-events-none select-none">
        <span className="text-xs font-mono">PRAMAAN</span>
      </div>

      {/* Visual Center Composition */}
      <div className="relative z-10 w-full max-w-xl mx-auto px-6 flex flex-col items-center justify-center -mt-4">
        {/* Abstract Minimalist Pramaan Hash & Technical Motif (draws in gently) */}
        <div
          className={`w-full max-w-xs sm:max-w-sm mb-4 sm:mb-6 transition-all duration-1000 ease-out ${
            prefersReducedMotion ? 'opacity-100' : 'opacity-70 delay-100'
          }`}
          aria-hidden="true"
        >
          <svg
            viewBox="0 0 320 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-full h-auto text-ink/30"
          >
            {/* Fine guideline with calibration ticks */}
            <line
              x1="10"
              y1="10"
              x2="310"
              y2="10"
              stroke="currentColor"
              strokeWidth="0.75"
              strokeDasharray="2 4"
            />
            {/* Center nodes & Merkle reference point */}
            <circle cx="160" cy="10" r="2.5" fill="currentColor" />
            <circle cx="80" cy="10" r="1.5" fill="currentColor" />
            <circle cx="240" cy="10" r="1.5" fill="currentColor" />
            <line x1="10" y1="5" x2="10" y2="15" stroke="currentColor" strokeWidth="1" />
            <line x1="310" y1="5" x2="310" y2="15" stroke="currentColor" strokeWidth="1" />
          </svg>
        </div>

        {/* Primary Dominant Brand Mark: Official Pramaan Logo */}
        <div
          className={`relative flex items-center justify-center transition-all duration-1000 ease-out ${
            prefersReducedMotion
              ? 'opacity-100 transform-none'
              : 'opacity-100 transform scale-100 translate-y-0 delay-150 animate-pramaanIntro'
          }`}
        >
          <img
            src="/branding/Pramaan_logo.png"
            alt="Pramaan"
            className="w-56 sm:w-64 md:w-72 max-w-[82vw] h-auto object-contain pointer-events-none select-none drop-shadow-sm"
          />
        </div>

        {/* Restrained Approved Supporting Line */}
        <div
          className={`mt-4 sm:mt-5 transition-all duration-1000 ease-out ${
            prefersReducedMotion
              ? 'opacity-100'
              : 'opacity-90 delay-300 animate-pramaanSubtext'
          }`}
        >
          <p
            className="font-sans text-[10px] sm:text-[11px] font-semibold text-ink/75 uppercase text-center"
            style={{
              letterSpacing: '0.24em',
            }}
          >
            PRIVATE • CHECKABLE • ORGANIZED
          </p>
        </div>
      </div>

      {/* Bottom Utility Bar: Loading Status (Left) & Skip Control (Right) */}
      <div className="w-full pb-6 sm:pb-10 px-6 sm:px-10 flex items-end justify-between z-10 font-sans">
        {/* Bottom Left: Loading Status & Minimalist Progress Bar */}
        <div className="flex flex-col items-start space-y-2">
          <span
            className="text-[10px] sm:text-[11px] font-semibold text-ink/75 tracking-[0.16em] uppercase"
          >
            LOADING PRAMAAN
          </span>

          {/* Thin Minimalist Progress Track */}
          <div
            className="w-28 sm:w-40 h-[2px] bg-black/10 rounded-full overflow-hidden"
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Application loading progress"
          >
            <div
              className="h-full bg-ink transition-all duration-150 ease-out rounded-full"
              style={{
                width: `${progress}%`,
              }}
            />
          </div>
        </div>

        {/* Bottom Right: Unobtrusive Skip Control */}
        <div>
          <button
            type="button"
            onClick={handleSkipClick}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleSkipClick(e);
              }
            }}
            tabIndex={0}
            aria-label="Skip initial loading screen"
            className="text-[10px] sm:text-[11px] font-medium text-ink/55 hover:text-ink transition-colors tracking-[0.14em] uppercase focus:outline-none focus:ring-1 focus:ring-ink/40 px-2 py-1 rounded cursor-pointer select-none"
          >
            TAP OR ESC TO SKIP
          </button>
        </div>
      </div>

      {/* Editorial Intro Animations */}
      <style>{`
        @keyframes pramaanIntro {
          0% {
            opacity: 0;
            transform: translateY(10px) scale(0.98);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes pramaanSubtext {
          0% {
            opacity: 0;
            letter-spacing: 0.16em;
          }
          100% {
            opacity: 0.75;
            letter-spacing: 0.24em;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .animate-pramaanIntro,
          .animate-pramaanSubtext {
            animation: none !important;
            transform: none !important;
          }
        }
      `}</style>
    </div>
  );
};
