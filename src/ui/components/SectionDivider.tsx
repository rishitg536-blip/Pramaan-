import React from 'react';

interface SectionDividerProps {
  sectionNumber: string;
  title: string;
  nextSection?: string;
  accentColor?: 'yellow' | 'blue' | 'purple' | 'green' | 'red' | 'amber' | 'slate';
}

export const SectionDivider: React.FC<SectionDividerProps> = ({
  sectionNumber,
  title,
  nextSection,
}) => {
  return (
    <div
      className="w-full my-6 select-none relative z-20"
      role="separator"
      aria-label={`Crime scene boundary end of section ${sectionNumber}: ${title}`}
    >
      {/* Crime Scene Yellow & Black Barrier Belt */}
      <div className="relative w-full bg-[#FFE500] border-y-[3px] border-ink shadow-[0_4px_0px_#0F0F0F] overflow-hidden">
        {/* Top diagonal black & yellow hazard stripe bar */}
        <div
          className="h-2 w-full border-b border-black/80"
          style={{
            backgroundImage:
              'repeating-linear-gradient(-45deg, #000000 0px, #000000 12px, #FFE500 12px, #FFE500 24px)',
          }}
          aria-hidden="true"
        />

        {/* Realistic tape gloss/reflection overlay */}
        <div
          className="absolute inset-0 pointer-events-none opacity-25"
          style={{
            background:
              'linear-gradient(180deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.1) 40%, rgba(0,0,0,0.2) 100%)',
          }}
          aria-hidden="true"
        />

        {/* Tape Content Container */}
        <div className="relative py-1.5 px-3 sm:px-6 flex items-center justify-between gap-3 text-ink font-mono font-black text-xs tracking-wider uppercase overflow-hidden whitespace-nowrap">
          {/* Left Police Tape Caution Markings */}
          <div className="flex items-center gap-2.5 shrink-0 text-[11px] sm:text-xs">
            <span className="text-sm">⚠</span>
            <span className="tracking-widest font-extrabold">CRIME SCENE</span>
            <span className="opacity-70 font-sans font-bold">///</span>
            <span className="tracking-widest font-extrabold">DO NOT CROSS</span>
            <span className="opacity-70 font-sans font-bold hidden sm:inline">///</span>
            <span className="tracking-wider hidden md:inline opacity-90">
              FORENSIC EVIDENCE INTEGRITY
            </span>
            <span className="opacity-70 font-sans font-bold hidden md:inline">///</span>
          </div>

          {/* Center Forensic Case Evidence Tag */}
          <div className="shrink-0 z-10 flex items-center gap-2 bg-ink text-[#FFE500] px-3.5 py-1 border-2 border-black rounded shadow-[2px_2px_0px_rgba(0,0,0,0.4)] font-mono text-[11px] sm:text-xs font-bold">
            <span
              className="inline-block w-2 h-2 rounded-full bg-red animate-pulse"
              title="Forensic Boundary Active"
            />
            <span className="text-[#FFE500] font-black tracking-wider">
              [ END OF SECTION {sectionNumber} ]
            </span>
            <span className="text-white hidden lg:inline tracking-wide font-medium">
              {title}
            </span>
            {nextSection && (
              <>
                <span className="text-yellow/70 hidden sm:inline">|</span>
                <span className="text-white/90 hidden sm:inline text-[10px] tracking-normal font-sans">
                  NEXT: <strong className="text-yellow">{nextSection}</strong>
                </span>
              </>
            )}
          </div>

          {/* Right Police Tape Caution Markings */}
          <div className="flex items-center gap-2.5 shrink-0 text-[11px] sm:text-xs">
            <span className="opacity-70 font-sans font-bold hidden md:inline">///</span>
            <span className="tracking-wider hidden md:inline opacity-90">
              SECTION 63(4) BSA
            </span>
            <span className="opacity-70 font-sans font-bold hidden sm:inline">///</span>
            <span className="tracking-widest font-extrabold">EVIDENCE SEALED</span>
            <span className="opacity-70 font-sans font-bold">///</span>
            <span className="tracking-widest font-extrabold">DO NOT TAMPER</span>
            <span className="text-sm">⚠</span>
          </div>
        </div>

        {/* Bottom diagonal black & yellow hazard stripe bar */}
        <div
          className="h-2 w-full border-t border-black/80"
          style={{
            backgroundImage:
              'repeating-linear-gradient(-45deg, #000000 0px, #000000 12px, #FFE500 12px, #FFE500 24px)',
          }}
          aria-hidden="true"
        />
      </div>
    </div>
  );
};
