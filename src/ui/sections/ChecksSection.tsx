import React, { useState } from 'react';
import { Finding } from '../../core/types';
import {
  ShieldAlert,
  AlertTriangle,
  Info,
  CheckCircle,
  HelpCircle,
  Sparkles,
  ArrowRight,
  ClipboardCheck,
} from 'lucide-react';

interface ChecksSectionProps {
  findings: Finding[];
  isChecking: boolean;
  onRunChecks: () => void;
  onExplainWithAI?: (finding: Finding) => Promise<string | null>;
  isCloudMode: boolean;
  readiness: {
    filesCount: number;
    hasRespondent: boolean;
    isSealed: boolean;
    unconfirmedCount: number;
    isTimestamped: boolean;
  };
}

export const ChecksSection: React.FC<ChecksSectionProps> = ({
  findings,
  isChecking,
  onRunChecks,
  onExplainWithAI,
  isCloudMode,
  readiness,
}) => {
  const [activeExplainId, setActiveExplainId] = useState<string | null>(null);
  const [aiExplanations, setAiExplanations] = useState<Record<string, string>>({});
  const [loadingAiId, setLoadingAiId] = useState<string | null>(null);

  const alertCount = findings.filter((f) => f.level === 'alert').length;
  const warnCount = findings.filter((f) => f.level === 'warn').length;
  const infoCount = findings.filter((f) => f.level === 'info').length;
  const okCount = findings.filter((f) => f.level === 'ok').length;

  const handleExplain = async (finding: Finding) => {
    if (activeExplainId === finding.id) {
      setActiveExplainId(null);
      return;
    }
    setActiveExplainId(finding.id);

    if (onExplainWithAI && isCloudMode && !aiExplanations[finding.id]) {
      setLoadingAiId(finding.id);
      try {
        const explanation = await onExplainWithAI(finding);
        if (explanation) {
          setAiExplanations((prev) => ({ ...prev, [finding.id]: explanation }));
        }
      } catch (err) {
        console.error('Failed to get AI explanation:', err);
      } finally {
        setLoadingAiId(null);
      }
    }
  };

  const getLevelBadge = (level: Finding['level']) => {
    switch (level) {
      case 'alert':
        return (
          <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-red text-white border border-ink flex items-center space-x-1">
            <ShieldAlert className="w-3 h-3" />
            <span>ALERT</span>
          </span>
        );
      case 'warn':
        return (
          <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-yellow text-ink border border-ink flex items-center space-x-1">
            <AlertTriangle className="w-3 h-3" />
            <span>WARNING</span>
          </span>
        );
      case 'info':
        return (
          <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-blue/20 text-blue border border-blue flex items-center space-x-1">
            <Info className="w-3 h-3" />
            <span>NOTICE</span>
          </span>
        );
      case 'ok':
        return (
          <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-green/20 text-emerald-950 border border-green flex items-center space-x-1">
            <CheckCircle className="w-3 h-3" />
            <span>PASSED</span>
          </span>
        );
    }
  };

  return (
    <section id="section-checks" className="py-8 px-4 sm:px-6 lg:px-8 border-b-4 border-ink bg-paper">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <span className="px-2.5 py-0.5 bg-emerald-600 text-white border-2 border-ink text-[10px] font-mono font-black uppercase tracking-wider shadow-brutal-sm">
            FEATURE 04 // FORENSIC CONSISTENCY ENGINE (checks)
          </span>
        </div>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b-2 border-ink pb-4">
          <div>
            <div className="flex items-center space-x-2">
              <ShieldAlert className="w-5 h-5 text-emerald-700" />
              <h2 className="text-xl font-bold font-mono uppercase tracking-wider text-ink">
                FORENSIC CONSISTENCY CHECKER
              </h2>
            </div>
            <p className="text-xs font-mono text-muted mt-1">
              Deterministic rule checks (C-001 through C-012) for timestamp sequence, gaps, and name variations.
            </p>
          </div>

          <div>
            <button
              data-guide="checks.run"
              onClick={onRunChecks}
              disabled={isChecking}
              className="neo-btn px-4 py-2 bg-field hover:bg-blue text-white font-mono text-xs font-bold flex items-center space-x-2 shadow-brutal disabled:opacity-50"
            >
              <span>{isChecking ? 'EVALUATING RULES...' : 'RUN FORENSIC CHECKS'}</span>
            </button>
          </div>
        </div>

        {/* Readiness Checklist Card */}
        <div data-guide="checks.readiness" className="neo-card p-4 bg-paper border-2 border-ink shadow-brutal">
          <div className="flex items-center space-x-2 border-b border-ink/20 pb-2 mb-3">
            <ClipboardCheck className="w-4 h-4 text-ink" />
            <span className="font-mono text-xs font-bold uppercase text-ink">
              CASE EVIDENCE READINESS CHECKLIST
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs font-mono">
            <div className="flex items-center space-x-2">
              <CheckCircle
                className={`w-4 h-4 shrink-0 ${readiness.filesCount > 0 ? 'text-green' : 'text-gray-300'}`}
              />
              <span className={readiness.filesCount > 0 ? 'text-ink font-semibold' : 'text-muted'}>
                1. Evidence files added ({readiness.filesCount})
              </span>
            </div>

            <div className="flex items-center space-x-2">
              <CheckCircle
                className={`w-4 h-4 shrink-0 ${readiness.hasRespondent ? 'text-green' : 'text-gray-300'}`}
              />
              <span className={readiness.hasRespondent ? 'text-ink font-semibold' : 'text-muted'}>
                2. Respondent identified in README
              </span>
            </div>

            <div className="flex items-center space-x-2">
              <CheckCircle
                className={`w-4 h-4 shrink-0 ${readiness.unconfirmedCount === 0 && readiness.filesCount > 0 ? 'text-green' : 'text-gray-300'}`}
              />
              <span
                className={
                  readiness.unconfirmedCount === 0 && readiness.filesCount > 0
                    ? 'text-ink font-semibold'
                    : 'text-muted'
                }
              >
                3. Timeline items reviewed
              </span>
            </div>

            <div className="flex items-center space-x-2">
              <CheckCircle
                className={`w-4 h-4 shrink-0 ${readiness.isSealed ? 'text-green' : 'text-gray-300'}`}
              />
              <span className={readiness.isSealed ? 'text-ink font-semibold' : 'text-muted'}>
                4. Cryptographic seal calculated
              </span>
            </div>

            <div className="flex items-center space-x-2">
              <CheckCircle
                className={`w-4 h-4 shrink-0 ${readiness.isTimestamped ? 'text-green' : 'text-gray-300'}`}
              />
              <span className={readiness.isTimestamped ? 'text-ink font-semibold' : 'text-muted'}>
                5. Public timestamp anchored
              </span>
            </div>
          </div>
        </div>

        {/* Summary stats bar */}
        <div data-guide="checks.summary" className="flex flex-wrap items-center gap-3 font-mono text-xs">
          <div className="px-3 py-1 bg-paper border border-ink flex items-center space-x-1.5 shadow-sm">
            <span className="font-bold text-red">{alertCount}</span>
            <span className="text-muted">ALERTS</span>
          </div>
          <div className="px-3 py-1 bg-paper border border-ink flex items-center space-x-1.5 shadow-sm">
            <span className="font-bold text-yellow">{warnCount}</span>
            <span className="text-muted">WARNINGS</span>
          </div>
          <div className="px-3 py-1 bg-paper border border-ink flex items-center space-x-1.5 shadow-sm">
            <span className="font-bold text-blue">{infoCount}</span>
            <span className="text-muted">NOTICES</span>
          </div>
          <div className="px-3 py-1 bg-paper border border-ink flex items-center space-x-1.5 shadow-sm">
            <span className="font-bold text-green">{okCount}</span>
            <span className="text-muted">PASSED</span>
          </div>
        </div>

        {/* Findings list */}
        {findings.length === 0 ? (
          <div className="p-8 text-center border-2 border-dashed border-ink/40 bg-paper font-mono text-xs text-muted">
            No forensic checks evaluated yet. Click "RUN FORENSIC CHECKS" to analyze evidence files and timeline.
          </div>
        ) : (
          <div className="space-y-3">
            {findings.map((f) => (
              <div
                key={f.id}
                data-guide="checks.finding"
                className="neo-card bg-paper border-2 border-ink shadow-brutal overflow-hidden"
              >
                {/* Finding Header */}
                <div className="p-3 bg-paper border-b-2 border-ink flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center space-x-2">
                    {getLevelBadge(f.level)}
                    <span className="font-mono text-xs font-bold text-ink">
                      [{f.ruleId}] {f.claim}
                    </span>
                  </div>

                  <button
                    data-guide="checks.explainToggle"
                    onClick={() => handleExplain(f)}
                    className="text-xs font-mono font-bold flex items-center space-x-1 text-field hover:text-blue hover:underline"
                  >
                    {isCloudMode ? (
                      <Sparkles className="w-3.5 h-3.5 text-pink" />
                    ) : (
                      <HelpCircle className="w-3.5 h-3.5" />
                    )}
                    <span>{activeExplainId === f.id ? 'Hide Explanation' : 'Explain Plainly'}</span>
                  </button>
                </div>

                {/* Finding Body */}
                <div className="p-4 space-y-3">
                  {/* Evidence source tags */}
                  {f.evidence && f.evidence.length > 0 && (
                    <div className="flex flex-wrap gap-2 text-[11px] font-mono text-muted">
                      <span className="font-bold">Sources:</span>
                      {f.evidence.map((ev, i) => (
                        <span key={i} className="px-1.5 py-0.5 bg-paper border border-ink/30 text-ink">
                          {ev.file} {ev.where ? `(${ev.where})` : ''}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Plain language explanation or AI breakdown */}
                  <div className="text-xs font-sans text-ink space-y-1.5">
                    <p className="leading-relaxed">{f.explain}</p>

                    {/* Action to take */}
                    <div data-guide="checks.action" className="p-2 bg-yellow/15 border-l-2 border-yellow flex items-start space-x-1.5 mt-2">
                      <ArrowRight className="w-3.5 h-3.5 text-ink shrink-0 mt-0.5" />
                      <p className="font-mono text-[11px] text-ink">
                        <strong className="uppercase">Recommended Next Step:</strong> {f.action}
                      </p>
                    </div>

                    {/* Expanded AI / Extended explanation */}
                    {activeExplainId === f.id && (
                      <div className="mt-3 p-3 bg-paper border border-ink font-mono text-xs space-y-2">
                        <div className="font-bold uppercase text-[10px] text-muted flex items-center space-x-1">
                          <Sparkles className="w-3 h-3 text-pink" />
                          <span>Detailed Plain-Language Breakdown</span>
                        </div>
                        {loadingAiId === f.id ? (
                          <div className="flex items-center space-x-2 text-muted">
                            <div className="w-3 h-3 border-2 border-ink border-t-transparent rounded-full animate-spin" />
                            <span>Requesting safe redacted plain-language explanation...</span>
                          </div>
                        ) : (
                          <p className="text-ink whitespace-pre-wrap leading-relaxed font-sans text-xs">
                            {aiExplanations[f.id] ||
                              `This check inspects forensic consistency for rule ${f.ruleId}. Remember that findings indicate matches or discrepancies in the records provided, but do not provide legal guarantees. Present these technical findings to your legal representative along with the Section 63(4) draft certificate.`}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

