import { useState, useEffect } from 'react';

interface HashScrambleProps {
  targetHash: string;
  truncateLength?: number;
  durationMs?: number;
  className?: string;
}

const HEX_CHARS = '0123456789abcdef';

export function HashScramble({
  targetHash,
  truncateLength,
  durationMs = 600,
  className = '',
}: HashScrambleProps) {
  const displayTarget = truncateLength
    ? targetHash.substring(0, truncateLength) + '…'
    : targetHash;

  const [displayText, setDisplayText] = useState(displayTarget);

  useEffect(() => {
    // Check if user prefers reduced motion
    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;

    if (prefersReducedMotion || !targetHash) {
      setDisplayText(displayTarget);
      return;
    }

    const totalSteps = 12;
    const stepDuration = durationMs / totalSteps;
    let currentStep = 0;

    const interval = setInterval(() => {
      currentStep++;
      const progress = currentStep / totalSteps;
      const resolvedCharCount = Math.floor(progress * displayTarget.length);

      let scrambled = '';
      for (let i = 0; i < displayTarget.length; i++) {
        if (i < resolvedCharCount || displayTarget[i] === '…') {
          scrambled += displayTarget[i];
        } else {
          scrambled += HEX_CHARS[Math.floor(Math.random() * HEX_CHARS.length)];
        }
      }

      setDisplayText(scrambled);

      if (currentStep >= totalSteps) {
        clearInterval(interval);
        setDisplayText(displayTarget);
      }
    }, stepDuration);

    return () => clearInterval(interval);
  }, [targetHash, truncateLength, durationMs, displayTarget]);

  return <span className={`font-mono ${className}`}>{displayText}</span>;
}
