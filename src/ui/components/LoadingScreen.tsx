import React, { useEffect, useState } from 'react';

interface LoadingScreenProps {
  onLoaded?: () => void;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = () => {
  const [progress, setProgress] = useState(12);
  const [currentStep, setCurrentStep] = useState('CALIBRATING LOCAL CRYPTO CORE...');

  useEffect(() => {
    const steps = [
      { at: 25, text: 'MOUNTING INDEXEDDB ENCRYPTED VAULT...' },
      { at: 50, text: 'SPAWNING SHA-256 PARALLEL WEB-WORKERS...' },
      { at: 75, text: 'INITIALIZING BSA SECTION 63(4) GATEWAY...' },
      { at: 92, text: 'VERIFYING FORENSIC CUSTODY STATE...' },
      { at: 100, text: 'SECURE SANDBOX READY' },
    ];

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timer);
          return 100;
        }
        const next = Math.min(prev + Math.floor(Math.random() * 8) + 4, 100);
        const match = steps.find((s) => next >= s.at && prev < s.at);
        if (match) {
          setCurrentStep(match.text);
        }
        return next;
      });
    }, 90);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-paper selection:bg-yellow select-none overflow-hidden px-4">
      {/* Background Dot Matrix Pattern */}
      <div
        className="absolute inset-0 pointer-events-none opacity-40"
        style={{
          backgroundImage:
            'radial-gradient(rgba(0, 0, 0, 0.22) 1px, transparent 1px)',
          backgroundSize: '20px 20px',
        }}
        aria-hidden="true"
      />

      {/* Ambient Radial Vignette for 3D Studio Depth */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(circle at 50% 45%, transparent 35%, rgba(15, 15, 15, 0.08) 75%, rgba(15, 15, 15, 0.22) 100%)',
        }}
        aria-hidden="true"
      />

      {/* 3D Scene Wrapper with Perspective */}
      <div
        className="relative z-10 flex flex-col items-center"
        style={{ perspective: '1200px' }}
      >
        {/* Floating 3D Card */}
        <div
          className="relative w-[340px] sm:w-[410px] bg-[#FAF7EE] border-[3px] border-ink rounded-lg p-6 sm:p-7 flex flex-col items-center"
          style={{
            transformStyle: 'preserve-3d',
            transform: 'rotateX(8deg) rotateY(-8deg) translateZ(10px)',
            boxShadow:
              '14px 14px 0px #0F0F0F, 0px 30px 60px -15px rgba(15, 15, 15, 0.35)',
            animation: 'pramaanFloat3D 4.5s ease-in-out infinite alternate',
          }}
        >
          {/* Top Registration Corner Marks (Forensic Calibration) */}
          <span className="absolute top-2 left-2 text-[10px] font-mono text-muted/60 select-none">
            ⌜ §63(4)
          </span>
          <span className="absolute top-2 right-2 text-[10px] font-mono text-muted/60 select-none">
            BSA-2023 ⌝
          </span>
          <span className="absolute bottom-2 left-2 text-[10px] font-mono text-muted/60 select-none">
            ⌞ SHA256
          </span>
          <span className="absolute bottom-2 right-2 text-[10px] font-mono text-muted/60 select-none">
            AIRGAP ⌟
          </span>

          {/* Subtitle Badge */}
          <div className="flex items-center gap-1.5 px-2.5 py-0.5 mb-4 bg-ink text-[#FFE500] font-mono font-black text-[10px] sm:text-[11px] tracking-widest uppercase rounded border border-black shadow-[2px_2px_0px_rgba(0,0,0,0.25)]">
            <span className="w-1.5 h-1.5 rounded-full bg-red animate-pulse" />
            <span>FORENSIC EVIDENCE SEALER</span>
          </div>

          {/* Logo 3D Elevation Container */}
          <div
            className="relative w-48 h-48 sm:w-56 sm:h-56 rounded-md overflow-hidden bg-[#FAF7EE] flex items-center justify-center p-2 mb-4"
            style={{
              transform: 'translateZ(25px)',
              filter: 'drop-shadow(0 10px 12px rgba(15,15,15,0.18))',
            }}
          >
            <img
              src="/logo.jpg"
              alt="Pramaan Logo"
              className="w-full h-full object-contain pointer-events-none select-none"
            />

            {/* 3D Holographic Light Beam Scanning Overlay */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background:
                  'linear-gradient(135deg, transparent 35%, rgba(255, 255, 255, 0.6) 50%, transparent 65%)',
                animation: 'pramaanLaserSweep 2.8s ease-in-out infinite',
              }}
              aria-hidden="true"
            />
          </div>

          {/* Progress Bar Container */}
          <div className="w-full mt-1 mb-3" style={{ transform: 'translateZ(18px)' }}>
            <div className="flex justify-between items-center text-[11px] font-mono font-bold text-ink mb-1.5">
              <span className="tracking-wider">INITIALIZING SYSTEM</span>
              <span className="bg-yellow px-1.5 py-0.2 border border-ink text-ink font-mono font-black">
                {progress}%
              </span>
            </div>

            {/* Industrial Hazard-Striped Progress Track */}
            <div className="w-full h-3.5 bg-white border-2 border-ink rounded overflow-hidden relative shadow-[inset_1px_1px_3px_rgba(0,0,0,0.15)]">
              <div
                className="h-full bg-yellow border-r-2 border-ink transition-all duration-150 ease-out"
                style={{
                  width: `${progress}%`,
                  backgroundImage:
                    'repeating-linear-gradient(45deg, #FFE24A, #FFE24A 8px, #FFD000 8px, #FFD000 16px)',
                }}
              />
            </div>
          </div>

          {/* Live Telemetry Step Indicator */}
          <div
            className="w-full flex items-center justify-center gap-2 py-1 px-2 bg-paper border border-ink/40 rounded text-center"
            style={{ transform: 'translateZ(15px)' }}
          >
            <div className="w-2 h-2 rounded-full border border-ink bg-green shrink-0 animate-ping" />
            <span className="font-mono text-[10px] sm:text-[11px] font-extrabold text-ink tracking-tight truncate">
              {currentStep}
            </span>
          </div>
        </div>

        {/* 3D Simulated Ground Shadow */}
        <div
          className="w-[280px] sm:w-[340px] h-6 bg-ink/20 rounded-[50%] blur-md mt-4 pointer-events-none"
          style={{
            transform: 'rotateX(80deg) translateZ(-40px)',
            animation: 'pramaanShadowPulse 4.5s ease-in-out infinite alternate',
          }}
          aria-hidden="true"
        />

        {/* Bottom Security Assurance Stamp */}
        <div className="mt-4 flex items-center gap-2 text-muted font-mono text-[11px]">
          <span className="text-ink font-black">◆</span>
          <span>100% AIR-GAPPED &amp; LOCAL BY DEFAULT</span>
          <span className="text-ink font-black">◆</span>
        </div>
      </div>

      {/* Embedded CSS Animations for High-Performance 3D Transforms */}
      <style>{`
        @keyframes pramaanFloat3D {
          0% {
            transform: rotateX(8deg) rotateY(-8deg) translateY(0px) translateZ(10px);
            box-shadow: 14px 14px 0px #0F0F0F, 0px 25px 45px -10px rgba(15, 15, 15, 0.28);
          }
          50% {
            transform: rotateX(-4deg) rotateY(6deg) translateY(-14px) translateZ(28px);
            box-shadow: 18px 22px 0px #0F0F0F, 0px 38px 65px -12px rgba(15, 15, 15, 0.35);
          }
          100% {
            transform: rotateX(7deg) rotateY(-6deg) translateY(0px) translateZ(10px);
            box-shadow: 14px 14px 0px #0F0F0F, 0px 25px 45px -10px rgba(15, 15, 15, 0.28);
          }
        }

        @keyframes pramaanLaserSweep {
          0% {
            transform: translateY(-120%) rotate(0deg);
            opacity: 0;
          }
          15% {
            opacity: 0.8;
          }
          50% {
            transform: translateY(120%) rotate(0deg);
            opacity: 0.8;
          }
          65% {
            opacity: 0;
          }
          100% {
            transform: translateY(120%) rotate(0deg);
            opacity: 0;
          }
        }

        @keyframes pramaanShadowPulse {
          0% {
            transform: scale(0.92);
            opacity: 0.25;
          }
          50% {
            transform: scale(1.08);
            opacity: 0.15;
          }
          100% {
            transform: scale(0.92);
            opacity: 0.25;
          }
        }
      `}</style>
    </div>
  );
};

