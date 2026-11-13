import React, { useState } from 'react';
import { Lock } from 'lucide-react';

interface LockScreenProps {
  isLocked: boolean;
  onUnlock: (pin: string) => boolean; // returns true if unlocked (real or decoy)
}

export const LockScreen: React.FC<LockScreenProps> = ({ isLocked, onUnlock }) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

  if (!isLocked) return null;

  const handleDigit = (digit: string) => {
    if (pin.length < 6) {
      const next = pin + digit;
      setPin(next);
      setError(false);
      if (next.length === 6) {
        const success = onUnlock(next);
        if (!success) {
          setError(true);
          setPin('');
        }
      }
    }
  };

  const handleBackspace = () => {
    setPin((prev) => prev.slice(0, -1));
    setError(false);
  };

  const handleClear = () => {
    setPin('');
    setError(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-paper/95 backdrop-blur-md">
      <div
        data-guide="lock.pad"
        className="neo-card bg-white max-w-sm w-full p-6 border-4 border-ink shadow-brutal-lg space-y-6 text-center select-none"
      >
        <div className="flex justify-center">
          <div className="w-12 h-12 bg-yellow border-2 border-ink shadow-brutal flex items-center justify-center">
            <Lock className="w-6 h-6 text-ink" />
          </div>
        </div>

        <div>
          <h2 className="font-mono text-base font-bold uppercase text-ink">
            PRAMAAN VAULT LOCKED
          </h2>
          <p className="font-mono text-xs text-muted mt-1">
            Enter your 6-digit PIN to access evidence workspace.
          </p>
        </div>

        {/* PIN Dots */}
        <div className="flex justify-center space-x-3 my-4">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className={`w-4 h-4 border-2 border-ink rounded-full transition-all ${
                pin.length > i ? 'bg-ink scale-110' : 'bg-paper'
              } ${error ? 'border-red bg-red/20' : ''}`}
            />
          ))}
        </div>

        {error && (
          <p className="font-mono text-xs text-red font-bold animate-shake">
            Incorrect PIN. Please try again.
          </p>
        )}

        {/* Keypad */}
        <div data-guide="lock.pad" className="grid grid-cols-3 gap-2 max-w-[240px] mx-auto pt-2">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '⌫'].map((btn) => (
            <button
              key={btn}
              onClick={() => {
                if (btn === 'C') handleClear();
                else if (btn === '⌫') handleBackspace();
                else handleDigit(btn);
              }}
              className="h-12 border-2 border-ink bg-paper hover:bg-yellow text-ink font-mono text-sm font-bold shadow-brutal-sm active:translate-x-0.5 active:translate-y-0.5"
            >
              {btn}
            </button>
          ))}
        </div>

        <div className="pt-2 border-t border-ink/20">
          <button
            data-guide="lock.forgot"
            onClick={() => {
              alert(
                'Pramaan is strictly zero-knowledge. If you lose your PIN, the local cryptographic vault cannot be recovered by anyone.'
              );
            }}
            className="text-[11px] font-mono text-muted hover:text-ink underline"
          >
            Forgot your PIN?
          </button>
        </div>
      </div>
    </div>
  );
};

