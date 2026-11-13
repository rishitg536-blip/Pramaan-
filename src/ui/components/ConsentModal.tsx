import { useState } from 'react';
import { AlertTriangle, X, ShieldAlert } from 'lucide-react';

interface ConsentModalProps {
  isOpen: boolean;
  providerName: string;
  onConsent: () => void;
  onCancel: () => void;
}

export function ConsentModal({
  isOpen,
  providerName,
  onConsent,
  onCancel,
}: ConsentModalProps) {
  const [understood, setUnderstood] = useState(false);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="neo-card bg-[#fffdf0] max-w-lg w-full p-6 border-4 border-ink shadow-brutal-lg relative transform -rotate-0.5">
        {/* Yellow tape on top */}
        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 w-36 h-6 bg-yellow/90 border border-ink shadow-sm rotate-1 select-none" />

        <div className="flex items-center justify-between pb-3 border-b-2 border-ink mb-4 pt-2">
          <div className="flex items-center space-x-2 text-ink font-bold font-mono text-sm">
            <ShieldAlert className="w-5 h-5 text-pink" />
            <span>CLOUD AI PRIVACY CONSENT</span>
          </div>
          <button
            data-guide="consent.close"
            onClick={onCancel}
            className="p-1 hover:bg-gray-200 rounded border border-ink"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3 text-xs font-mono text-ink mb-5 leading-relaxed">
          <p className="font-bold">
            Before turning on Cloud AI assistance, review what data leaves your device:
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-muted">
            <li>
              <strong className="text-ink">AI Findings Explanations:</strong> Structured, tokenized findings (names, phone numbers and addresses are redacted locally with stable replacement tokens before transmission).
            </li>
            <li>
              <strong className="text-ink">Cloud Vision OCR (Optional):</strong> Full screenshot image is sent to the provider only when you explicitly click "Cloud OCR" on an image.
            </li>
            <li>
              <strong className="text-ink">Guide AI Agent:</strong> Your specific question and high-level file count totals (e.g. "3 files added"). No evidence files, extracted text, or names are sent.
            </li>
            <li>
              <strong className="text-ink">Destination:</strong> Handled by helper server and forwarded to <span className="text-blue font-bold">{providerName.toUpperCase()}</span>.
            </li>
          </ul>

          <div className="p-3 bg-pink/10 border border-pink rounded text-ink flex items-start space-x-2 mt-2">
            <AlertTriangle className="w-4 h-4 text-red flex-shrink-0 mt-0.5" />
            <span>
              Redaction is automated and not perfect. Context can still potentially identify individuals. The provider should be configured with zero-retention / no-training terms.
            </span>
          </div>
        </div>

        <label className="flex items-start space-x-2 text-xs font-mono cursor-pointer select-none mb-6">
          <input
            type="checkbox"
            data-guide="consent.confirm"
            checked={understood}
            onChange={(e) => setUnderstood(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-2 border-ink text-green focus:ring-green"
          />
          <span className="text-ink font-bold">
            I understand what is sent and consent to enabling Cloud AI features.
          </span>
        </label>

        <div className="flex items-center justify-end space-x-3">
          <button
            data-guide="consent.cancel"
            onClick={onCancel}
            className="neo-btn px-4 py-2 bg-paper text-ink font-mono text-xs font-bold"
          >
            Cancel (Keep Local)
          </button>
          <button
            data-guide="consent.enable"
            onClick={onConsent}
            disabled={!understood}
            className="neo-btn px-4 py-2 bg-pink text-ink font-mono text-xs font-bold disabled:opacity-40"
          >
            Enable Cloud AI
          </button>
        </div>
      </div>
    </div>
  );
}

