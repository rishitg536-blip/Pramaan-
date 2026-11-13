import { useState } from 'react';
import { STRINGS } from '../strings';
import { wipeAllData } from '../../storage/db';
import { AlertTriangle, X } from 'lucide-react';

interface WipeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function WipeModal({ isOpen, onClose }: WipeModalProps) {
  const [typedInput, setTypedInput] = useState('');
  const [isWiping, setIsWiping] = useState(false);

  if (!isOpen) return null;

  const handleWipe = async () => {
    if (typedInput !== 'WIPE') return;
    setIsWiping(true);
    await wipeAllData();
    window.location.reload();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="neo-card bg-paper max-w-md w-full p-6 border-4 border-red shadow-brutal-lg">
        <div className="flex items-center justify-between pb-3 border-b-2 border-ink mb-4">
          <div className="flex items-center space-x-2 text-red font-bold font-mono">
            <AlertTriangle className="w-5 h-5" />
            <span>{STRINGS.safety.wipeTitle}</span>
          </div>
          <button
            data-guide="wipe.close"
            onClick={onClose}
            className="p-1 hover:bg-gray-200 rounded border border-ink"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-sm text-ink mb-4 leading-relaxed">
          {STRINGS.safety.wipeDescription}
        </p>

        <div className="mb-4">
          <label className="block text-xs font-mono font-bold uppercase mb-1">
            {STRINGS.safety.wipeConfirmPrompt}
          </label>
          <input
            type="text"
            data-guide="wipe.input"
            value={typedInput}
            onChange={(e) => setTypedInput(e.target.value.toUpperCase())}
            placeholder="WIPE"
            className="w-full font-mono text-sm uppercase px-3 py-2 border-2 border-ink rounded bg-white focus:outline-none focus:ring-2 focus:ring-red"
            autoFocus
          />
        </div>

        <div className="flex items-center justify-end space-x-3">
          <button
            data-guide="wipe.cancel"
            onClick={onClose}
            className="neo-btn px-4 py-2 bg-paper text-ink font-mono text-xs font-bold"
          >
            {STRINGS.safety.cancel}
          </button>
          <button
            data-guide="wipe.confirm"
            onClick={handleWipe}
            disabled={typedInput !== 'WIPE' || isWiping}
            className="neo-btn px-4 py-2 bg-red text-white font-mono text-xs font-bold disabled:opacity-40"
          >
            {isWiping ? 'WIPING...' : STRINGS.safety.wipeButton}
          </button>
        </div>
      </div>
    </div>
  );
}
