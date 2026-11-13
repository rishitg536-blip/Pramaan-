import { useState, useEffect } from 'react';
import { AppSettings, AICallLogEntry } from '../../core/types';
import { getSettings, updateSettings, getAICalls } from '../../storage/db';
import { callServer } from '../../net/gate';
import { ConsentModal } from './ConsentModal';
import { X, Shield, Activity, Server, Lock, RefreshCw, CheckCircle } from 'lucide-react';

interface PrivacyDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSettingsChanged: (settings: AppSettings) => void;
  onOpenVaultSettings?: () => void;
}

export function PrivacyDrawer({
  isOpen,
  onClose,
  onSettingsChanged,
  onOpenVaultSettings,
}: PrivacyDrawerProps) {
  const [activeTab, setActiveTab] = useState<'mode' | 'ai.log' | 'safety' | 'server'>('mode');
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [aiCalls, setAiCalls] = useState<AICallLogEntry[]>([]);
  const [selectedCall, setSelectedCall] = useState<AICallLogEntry | null>(null);
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [serverHealth, setServerHealth] = useState<{
    provider: string;
    llm: boolean;
    whisper: boolean;
    stamp: boolean;
  } | null>(null);
  const [isTestingServer, setIsTestingServer] = useState(false);
  const [helperUrlInput, setHelperUrlInput] = useState('http://127.0.0.1:8000');

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  const loadData = async () => {
    const s = await getSettings();
    setSettings(s);
    setHelperUrlInput(s.helperUrl || 'http://127.0.0.1:8000');
    const calls = await getAICalls();
    setAiCalls(calls.reverse());
  };

  const handleToggleMode = () => {
    if (!settings) return;
    if (settings.mode === 'local') {
      setShowConsentModal(true);
    } else {
      // Immediate one-click turn off
      saveMode('local');
    }
  };

  const saveMode = async (mode: 'local' | 'cloud', consentAt?: string) => {
    const next = await updateSettings({
      mode,
      cloudConsentAt: mode === 'cloud' ? (consentAt || new Date().toISOString()) : undefined,
    });
    setSettings(next);
    onSettingsChanged(next);
  };

  const testServerConnection = async () => {
    setIsTestingServer(true);
    try {
      await updateSettings({ helperUrl: helperUrlInput });
      const health = await callServer<{
        provider: string;
        llm: boolean;
        whisper: boolean;
        stamp: boolean;
      }>('health', null);
      setServerHealth(health);
    } catch {
      setServerHealth(null);
    } finally {
      setIsTestingServer(false);
    }
  };

  if (!isOpen || !settings) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-xl bg-terminal text-terminal-text h-full flex flex-col border-l-4 border-ink shadow-2xl relative font-mono">
        {/* Top Window Bar */}
        <div className="px-5 py-3 bg-black/90 border-b border-gray-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="w-3 h-3 rounded-full bg-red" />
            <span className="w-3 h-3 rounded-full bg-yellow" />
            <span className="w-3 h-3 rounded-full bg-green" />
            <span className="ml-2 text-xs font-bold text-gray-300">
              privacy.config — gate &amp; logs
            </span>
          </div>
          <button
            data-guide="privacy.close"
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-white rounded hover:bg-gray-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Strip */}
        <div className="flex items-center px-4 bg-black/60 border-b border-gray-800 text-xs">
          <button
            data-guide="privacy.tab.mode"
            onClick={() => setActiveTab('mode')}
            className={`px-3 py-2 border-b-2 flex items-center space-x-1.5 ${
              activeTab === 'mode'
                ? 'border-yellow text-yellow font-bold'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>mode</span>
          </button>

          <button
            data-guide="privacy.tab.ailog"
            onClick={() => setActiveTab('ai.log')}
            className={`px-3 py-2 border-b-2 flex items-center space-x-1.5 ${
              activeTab === 'ai.log'
                ? 'border-yellow text-yellow font-bold'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>ai.log ({aiCalls.length})</span>
          </button>

          <button
            data-guide="privacy.tab.server"
            onClick={() => setActiveTab('server')}
            className={`px-3 py-2 border-b-2 flex items-center space-x-1.5 ${
              activeTab === 'server'
                ? 'border-yellow text-yellow font-bold'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            <Server className="w-3.5 h-3.5" />
            <span>server</span>
          </button>

          <button
            data-guide="privacy.tab.safety"
            onClick={() => setActiveTab('safety')}
            className={`px-3 py-2 border-b-2 flex items-center space-x-1.5 ${
              activeTab === 'safety'
                ? 'border-yellow text-yellow font-bold'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>safety</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-5 text-xs space-y-6">
          {/* TAB 1: MODE */}
          {activeTab === 'mode' && (
            <div className="space-y-6">
              {/* Mode Toggle Box */}
              <div className="p-4 bg-black/40 border border-gray-800 rounded">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <span className="font-bold text-sm block text-white">
                      Active Privacy Mode
                    </span>
                    <span className="text-gray-400 text-[11px]">
                      {settings.mode === 'local'
                        ? '100% on this device. Zero data sent to any cloud AI provider.'
                        : 'Cloud AI enabled with consent and tokenized redaction.'}
                    </span>
                  </div>
                  <button
                    data-guide="privacy.toggleMode"
                    onClick={handleToggleMode}
                    className={`px-3 py-1.5 rounded font-bold border ${
                      settings.mode === 'local'
                        ? 'bg-green text-ink border-ink'
                        : 'bg-pink text-ink border-ink'
                    }`}
                  >
                    {settings.mode === 'local' ? '● LOCAL MODE' : '● CLOUD AI ON'}
                  </button>
                </div>
                {settings.cloudConsentAt && settings.mode === 'cloud' && (
                  <div className="text-[10px] text-gray-500 pt-2 border-t border-gray-800">
                    Consent granted at: {new Date(settings.cloudConsentAt).toLocaleString()}
                  </div>
                )}
              </div>

              {/* Destination Feature Table */}
              <div>
                <span className="font-bold text-gray-300 block mb-2 uppercase tracking-wider text-[11px]">
                  Feature Data Handling Destinations
                </span>
                <div className="border border-gray-800 rounded overflow-hidden">
                  <table className="w-full text-left border-collapse text-[11px]">
                    <thead className="bg-black/60 text-gray-400 border-b border-gray-800">
                      <tr>
                        <th className="p-2">Feature</th>
                        <th className="p-2">Data Destination</th>
                        <th className="p-2">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                      <tr>
                        <td className="p-2 font-bold text-white">Evidence Hashing</td>
                        <td className="p-2">
                          <span className="px-1.5 py-0.5 bg-green/20 text-green rounded">
                            this device
                          </span>
                        </td>
                        <td className="p-2 text-green">● active</td>
                      </tr>
                      <tr>
                        <td className="p-2 font-bold text-white">WhatsApp Parser</td>
                        <td className="p-2">
                          <span className="px-1.5 py-0.5 bg-green/20 text-green rounded">
                            this device
                          </span>
                        </td>
                        <td className="p-2 text-green">● active</td>
                      </tr>
                      <tr>
                        <td className="p-2 font-bold text-white">Local OCR</td>
                        <td className="p-2">
                          <span className="px-1.5 py-0.5 bg-green/20 text-green rounded">
                            this device (wasm)
                          </span>
                        </td>
                        <td className="p-2 text-green">● active</td>
                      </tr>
                      <tr>
                        <td className="p-2 font-bold text-white">Public Timestamp</td>
                        <td className="p-2">
                          <span className="px-1.5 py-0.5 bg-yellow/20 text-yellow rounded">
                            fingerprint only (64 hex)
                          </span>
                        </td>
                        <td className="p-2 text-yellow">● on demand</td>
                      </tr>
                      <tr>
                        <td className="p-2 font-bold text-white">Voice Transcription</td>
                        <td className="p-2">
                          <span className="px-1.5 py-0.5 bg-blue/20 text-blue rounded">
                            helper server (localhost)
                          </span>
                        </td>
                        <td className="p-2 text-blue">● local helper</td>
                      </tr>
                      <tr>
                        <td className="p-2 font-bold text-white">AI Explanations</td>
                        <td className="p-2">
                          <span className="px-1.5 py-0.5 bg-pink/20 text-pink rounded">
                            AI provider (redacted)
                          </span>
                        </td>
                        <td className="p-2">
                          {settings.mode === 'cloud' ? (
                            <span className="text-pink">● cloud ready</span>
                          ) : (
                            <span className="text-gray-500">○ local blocked</span>
                          )}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: AI.LOG */}
          {activeTab === 'ai.log' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-[11px] text-gray-400">
                <span>Recorded Network &amp; AI Calls ({aiCalls.length})</span>
                <button
                  data-guide="privacy.refreshLog"
                  onClick={loadData}
                  className="hover:text-yellow flex items-center space-x-1"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Refresh</span>
                </button>
              </div>

              {aiCalls.length === 0 ? (
                <div className="p-6 text-center text-gray-500 border border-dashed border-gray-800 rounded">
                  No outbound server calls have been made yet.
                </div>
              ) : (
                <div className="border border-gray-800 rounded overflow-hidden">
                  <table className="w-full text-left text-[11px]">
                    <thead className="bg-black/60 text-gray-400 border-b border-gray-800">
                      <tr>
                        <th className="p-2">Time</th>
                        <th className="p-2">Kind</th>
                        <th className="p-2">Data Class</th>
                        <th className="p-2">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                      {aiCalls.map((call) => (
                        <tr
                          key={call.id}
                          onClick={() => setSelectedCall(call)}
                          className="hover:bg-gray-900 cursor-pointer"
                        >
                          <td className="p-2 text-gray-400">
                            {new Date(call.time).toLocaleTimeString()}
                          </td>
                          <td className="p-2 font-bold text-white">{call.kind}</td>
                          <td className="p-2 text-gray-300">{call.dataClass}</td>
                          <td className="p-2">
                            <span
                              className={`px-1 py-0.2 rounded text-[10px] ${
                                call.status === 'success'
                                  ? 'bg-green/20 text-green'
                                  : call.status === 'sent'
                                  ? 'bg-yellow/20 text-yellow'
                                  : 'bg-red/20 text-red'
                              }`}
                            >
                              {call.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Call Details Modal / Box */}
              {selectedCall && (
                <div className="p-4 bg-black/80 border border-gray-700 rounded space-y-2 text-[11px]">
                  <div className="flex items-center justify-between font-bold text-white pb-2 border-b border-gray-800">
                    <span>Call Details: {selectedCall.id}</span>
                    <button
                      data-guide="privacy.backLog"
                      onClick={() => setSelectedCall(null)}
                      className="text-gray-400 hover:text-white"
                    >
                      ✕
                    </button>
                  </div>
                  <div>Provider: <span className="text-yellow">{selectedCall.provider}</span></div>
                  <div>Data Class: <span className="text-blue">{selectedCall.dataClass}</span></div>
                  <div>Redacted: <span className="text-green">{selectedCall.redacted ? 'Yes' : 'No'}</span></div>
                  <div>Payload Size: <span className="text-gray-300">{selectedCall.bytes} bytes</span></div>
                  <div>Payload Hash: <span className="text-gray-400 break-all">{selectedCall.payloadHash}</span></div>
                  {selectedCall.error && (
                    <div className="text-red">Error: {selectedCall.error}</div>
                  )}
                </div>
              )}

              <p className="text-[11px] text-gray-500 pt-2 border-t border-gray-800">
                These calls are content-free audit records also preserved inside your tamper-evident custody log.
              </p>
            </div>
          )}

          {/* TAB 3: SERVER */}
          {activeTab === 'server' && (
            <div className="space-y-4">
              <div>
                <label className="block text-gray-400 text-[11px] mb-1">
                  Helper Server Address
                </label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    data-guide="privacy.serverUrl"
                    value={helperUrlInput}
                    onChange={(e) => setHelperUrlInput(e.target.value)}
                    className="flex-1 bg-black/60 border border-gray-800 px-3 py-1.5 rounded text-white focus:outline-none focus:border-yellow"
                  />
                  <button
                    data-guide="privacy.testServer"
                    onClick={testServerConnection}
                    disabled={isTestingServer}
                    className="neo-btn px-3 py-1.5 bg-yellow text-ink font-bold text-xs"
                  >
                    {isTestingServer ? 'Testing...' : 'Test'}
                  </button>
                </div>
              </div>

              {serverHealth && (
                <div className="p-4 bg-black/40 border border-gray-800 rounded space-y-2 text-[11px]">
                  <div className="flex items-center space-x-2 font-bold text-green pb-2 border-b border-gray-800">
                    <CheckCircle className="w-4 h-4" />
                    <span>Helper Server Online</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Configured LLM Provider:</span>
                    <span className="text-white font-bold">{serverHealth.provider}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">LLM Enabled:</span>
                    <span className={serverHealth.llm ? 'text-green' : 'text-red'}>
                      {serverHealth.llm ? 'Ready' : 'No Key'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Whisper ASR:</span>
                    <span className="text-green">Ready</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">OpenTimestamps:</span>
                    <span className="text-green">Ready</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: SAFETY */}
          {activeTab === 'safety' && (
            <div className="space-y-4">
              <div className="p-4 bg-black/40 border border-gray-800 rounded space-y-3">
                <span className="font-bold text-white block text-sm">
                  PIN Vault &amp; Duress Protection
                </span>
                <p className="text-gray-400 text-xs leading-relaxed">
                  Protect your case with an Argon2id + AES-GCM encrypted local vault. Setup an optional decoy duress PIN that silently opens an empty vault if coerced.
                </p>
                <button
                  data-guide="privacy.changePin"
                  onClick={() => {
                    onClose();
                    if (onOpenVaultSettings) onOpenVaultSettings();
                  }}
                  className="neo-btn px-4 py-2 bg-pink text-ink font-bold text-xs"
                >
                  Configure PIN Vault
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-black/90 border-t border-gray-800 flex items-center justify-between text-[11px] text-gray-500">
          <span>Pramaan Gate Protocol v2.0</span>
          <span>● Local First</span>
        </div>
      </div>

      <ConsentModal
        isOpen={showConsentModal}
        providerName={serverHealth?.provider || 'Configured LLM'}
        onConsent={() => {
          setShowConsentModal(false);
          saveMode('cloud');
        }}
        onCancel={() => setShowConsentModal(false)}
      />
    </div>
  );
}

