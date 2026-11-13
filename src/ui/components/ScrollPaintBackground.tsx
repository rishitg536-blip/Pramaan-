import React, { useEffect, useState, useMemo } from 'react';

export const ScrollPaintBackground: React.FC = () => {
  const [scrollProgress, setScrollProgress] = useState(0);
  const [windowHeight, setWindowHeight] = useState(
    typeof window !== 'undefined' ? window.innerHeight : 800
  );

  useEffect(() => {
    let ticking = false;

    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const totalScroll =
            document.documentElement.scrollHeight - window.innerHeight;
          const currentY = window.scrollY;
          if (totalScroll > 0) {
            setScrollProgress(Math.min(1, Math.max(0, currentY / totalScroll)));
          }
          ticking = false;
        });
        ticking = true;
      }
    };

    const onResize = () => {
      setWindowHeight(window.innerHeight);
      onScroll();
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);
    onScroll();

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  // Compute live forensic hashes and coordinates derived deterministically from scroll position
  const { currentHash, laserY, stageName, elevation } = useMemo(() => {
    // Smooth laser Y position traveling gracefully across viewport height (15% to 85%)
    const clampedY = 100 + scrollProgress * (windowHeight - 200);

    // Dynamic mock forensic SHA-256 hash fragment that changes as you scroll
    const hexChars = '0123456789abcdef';
    const seed = Math.floor(scrollProgress * 256);
    let h = '';
    for (let i = 0; i < 16; i++) {
      h += hexChars[(seed * (i + 3) + i * 7) % 16];
    }

    let stage = '00. OVERVIEW';
    if (scrollProgress > 0.12) stage = '01. DOSSIER';
    if (scrollProgress > 0.28) stage = '02. EVIDENCE';
    if (scrollProgress > 0.44) stage = '03. TIMELINE';
    if (scrollProgress > 0.60) stage = '04. CHECKS';
    if (scrollProgress > 0.74) stage = '05. CUSTODY';
    if (scrollProgress > 0.88) stage = '06. SEAL';

    const elevVal = (scrollProgress * 24.5).toFixed(1);

    return {
      currentHash: `0x${h}...`,
      laserY: clampedY,
      stageName: stage,
      elevation: `+${elevVal}m`,
    };
  }, [scrollProgress, windowHeight]);

  const pctDisplay = Math.round(scrollProgress * 100);

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none z-30 overflow-hidden select-none"
    >
      {/* 1. Luminous Forensic Laser Scan Line traveling with scroll */}
      <div
        className="absolute left-0 right-0 pointer-events-none transition-transform duration-75 ease-out"
        style={{
          transform: `translate3d(0, ${laserY}px, 0)`,
        }}
      >
        {/* Soft cyan/blue laser bloom aura */}
        <div className="w-full h-8 -mt-4 bg-gradient-to-b from-transparent via-cyan-400/10 to-transparent" />

        {/* Razor-sharp core laser scanning beam */}
        <div className="w-full h-[2px] bg-gradient-to-r from-transparent via-cyan-400 via-50% to-transparent opacity-75 shadow-[0_0_12px_rgba(34,211,238,0.8)]" />

        {/* Laser HUD pill on the right margin */}
        <div className="absolute right-4 -top-3.5 hidden md:flex items-center space-x-2 bg-ink/90 text-cyan-300 border border-cyan-400/60 px-2.5 py-0.5 rounded shadow-[0_0_10px_rgba(34,211,238,0.3)] font-mono text-[9px] uppercase tracking-wider backdrop-blur-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
          <span>SCANNING</span>
          <span className="text-white/60">|</span>
          <span className="text-white font-bold">{stageName}</span>
          <span className="text-cyan-400 font-mono">{pctDisplay}%</span>
        </div>

        {/* Laser HUD pill on the left margin */}
        <div className="absolute left-4 -top-3.5 hidden lg:flex items-center space-x-2 bg-ink/90 text-yellow border border-yellow/60 px-2 py-0.5 rounded shadow-sm font-mono text-[9px] uppercase tracking-wider backdrop-blur-sm">
          <span className="text-yellow font-bold">SHA-256</span>
          <span className="text-white/90 font-mono">{currentHash}</span>
        </div>
      </div>

      {/* 2. Left Gutter Technical Telemetry Stream */}
      <div className="absolute top-24 left-3 font-mono text-[9px] text-ink/35 hidden xl:flex flex-col space-y-4 select-none">
        <div className="flex items-center space-x-1 font-bold text-ink/60">
          <span className="w-1.5 h-1.5 rounded-full bg-green inline-block" />
          <span>BSA 63(4) SCANNER</span>
        </div>
        <div>DEPTH: {elevation}</div>
        <div>BLOCK: #870420</div>
        <div>CHKS: 12 RULES</div>
        <div className="pt-4 border-t border-ink/20">
          <div className="text-[8px] text-ink/40 tracking-widest">CHAIN HEAD</div>
          <div className="font-mono text-[8px] truncate max-w-[80px]">{currentHash}</div>
        </div>
      </div>

      {/* 3. Right Gutter Progress Bar */}
      <div className="absolute right-2 top-28 bottom-28 w-1 hidden sm:flex flex-col items-center select-none">
        <div className="w-[2px] h-full bg-ink/10 relative rounded-full overflow-hidden">
          <div
            className="w-full bg-gradient-to-b from-yellow via-blue to-green transition-all duration-75 rounded-full"
            style={{ height: `${pctDisplay}%` }}
          />
        </div>
      </div>

      {/* 4. Subtle corner architectural drafting crosshairs */}
      <div className="absolute top-16 left-2 text-ink/20 font-mono text-xs select-none">┌</div>
      <div className="absolute top-16 right-2 text-ink/20 font-mono text-xs select-none">┐</div>
      <div className="absolute bottom-6 left-2 text-ink/20 font-mono text-xs select-none">└</div>
      <div className="absolute bottom-6 right-2 text-ink/20 font-mono text-xs select-none">┘</div>
    </div>
  );
};
