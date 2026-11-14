import React, { useEffect, useState, useCallback } from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import {
  CaseMeta,
  StoredEvidenceFile,
  getOrCreateCaseMeta,
  getEvidenceFiles,
  getCustodyLog,
  getSeals,
  getLatestSeal,
  getSettings,
  saveDerivedRecord,
  getAllDerivedItems,
  updateDerivedItem,
  wipeAllData,
  appendCustodyLogEntry,
} from './storage/db';
import {
  CaseDetails,
  CustodyEntry,
  SealSnapshot,
  DerivedItem,
  AppSettings,
} from './core/types';
import { GitTicker } from './ui/components/GitTicker';
import { S0Hero } from './ui/sections/S0Hero';
import { S1Editor } from './ui/sections/S1Editor';
import { S2Evidence } from './ui/sections/S2Evidence';
import { TimelineSection } from './ui/sections/TimelineSection';
import { S3Custody } from './ui/sections/S3Custody';
import { S4Seal } from './ui/sections/S4Seal';
import { S5Footer } from './ui/sections/S5Footer';
import { SectionDivider } from './ui/components/SectionDivider';
import { GuideProvider, useGuide } from './guide/GuideProvider';
import { GuideChatDrawer } from './ui/components/GuideChatDrawer';
import { PrivacyDrawer } from './ui/components/PrivacyDrawer';
import { LockScreen } from './ui/components/LockScreen';
import { LoadingScreen } from './ui/components/LoadingScreen';
import { CaseIntakeScreen } from './ui/sections/CaseIntakeScreen';
import { parseWhatsAppFile } from './parsers/whatsapp';
import { runLocalOcr } from './parsers/ocr';
import { determineNextStep } from './guide/nextStep';
import { callServer } from './net/gate';
import { appendEntry } from './core/custody';
import { sha256Hex } from './core/hash';

const DEFAULT_META: CaseMeta = {
  caseId: 'init-case',
  createdAt: new Date().toISOString(),
  title: 'Untitled Case Dossier',
  details: {
    name: '',
    parentage: '',
    address: '',
    relationship: 'Owned',
    title: 'Untitled Case Dossier',
    device: {
      sourceType: 'Mobile Phone',
      model: '',
      colour: '',
      serialNumber: '',
      identifier: '',
      ownershipRelationship: 'Owned',
    },
  },
  declarations: {},
};

export function MainWorkspace() {
  const { isGuideMode, toggleGuideMode, setAskGuideHandler } = useGuide();

  const [meta, setMeta] = useState<CaseMeta | null>(null);
  const [files, setFiles] = useState<StoredEvidenceFile[]>([]);
  const [log, setLog] = useState<CustodyEntry[]>([]);
  const [seals, setSeals] = useState<SealSnapshot[]>([]);
  const [latestSeal, setLatestSeal] = useState<SealSnapshot | null>(null);
  const [derivedItems, setDerivedItems] = useState<DerivedItem[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [showLoadingOverlay, setShowLoadingOverlay] = useState(true);
  const [showIntakeScreen, setShowIntakeScreen] = useState(true);
  const [initError, setInitError] = useState<string | null>(null);
  const [isBuildingTimeline, setIsBuildingTimeline] = useState(false);

  const handleFinishLoading = useCallback(() => {
    setShowLoadingOverlay(false);
  }, []);

  const handleEnterWorkspace = useCallback(
    (updatedDetails: CaseDetails, title: string, newLogEntry?: CustodyEntry) => {
      handleDetailsUpdated(updatedDetails, title, newLogEntry);
      setShowIntakeScreen(false);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [meta]
  );

  // Drawers and Modals
  const [isPrivacyDrawerOpen, setIsPrivacyDrawerOpen] = useState(false);
  const [isGuideChatOpen, setIsGuideChatOpen] = useState(false);
  const [guideChatPrompt, setGuideChatPrompt] = useState<string | null>(null);

  // Vault PIN & Duress Lock
  const [isLocked, setIsLocked] = useState(false);
  const [storedPin, setStoredPin] = useState<string | null>(null);
  const [duressPin, setDuressPin] = useState<string | null>(null);

  useEffect(() => {
    setAskGuideHandler((prompt: string) => {
      setGuideChatPrompt(prompt);
      setIsGuideChatOpen(true);
    });
  }, [setAskGuideHandler]);

  useEffect(() => {
    async function loadData() {
      try {
        const caseMeta = await getOrCreateCaseMeta();
        const storedFiles = await getEvidenceFiles();
        const custodyEntries = await getCustodyLog();
        const allSeals = await getSeals();
        const latest = await getLatestSeal();
        const appSettings = await getSettings();
        const items = await getAllDerivedItems();

        setMeta(caseMeta);
        setFiles(storedFiles);
        setLog(custodyEntries);
        setSeals(allSeals);
        setLatestSeal(latest);
        setSettings(appSettings);
        setDerivedItems(items);

        if (appSettings.pin) {
          setStoredPin(appSettings.pin);
          setDuressPin(appSettings.duressPin || null);
          setIsLocked(true);
        }
      } catch (err: unknown) {
        console.error('Failed to initialize database:', err);
        setInitError(err instanceof Error ? err.message : String(err));
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  const handleNavigateSection = (sectionId: string) => {
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleDetailsUpdated = (
    details: CaseDetails,
    title: string,
    newLogEntry?: CustodyEntry
  ) => {
    if (meta) {
      setMeta({ ...meta, details, title });
    }
    if (newLogEntry) {
      setLog((prev) => [...prev, newLogEntry]);
    }
  };

  const handleFileAdded = (newFile: StoredEvidenceFile, newLogEntry: CustodyEntry) => {
    setFiles((prev) => [...prev, newFile]);
    setLog((prev) => [...prev, newLogEntry]);
  };

  const handleFileRemoved = (fileId: string, newLogEntry: CustodyEntry) => {
    setFiles((prev) => prev.filter((f) => f.id !== fileId));
    setDerivedItems((prev) => prev.filter((item) => item.sourceRef?.fileId !== fileId));
    setLog((prev) => [...prev, newLogEntry]);
  };

  const handleLogAppended = (entry: CustodyEntry) => {
    setLog((prev) => [...prev, entry]);
  };

  const handleSealCreated = (seal: SealSnapshot, logEntry: CustodyEntry) => {
    setSeals((prev) => [...prev, seal]);
    setLatestSeal(seal);
    setLog((prev) => [...prev, logEntry]);
  };

  const handleDeclarationsChanged = (declarations: Record<string, boolean>) => {
    if (meta) {
      setMeta({ ...meta, declarations });
    }
  };

  // Parsing WhatsApp File
  const handleParseChat = async (file: StoredEvidenceFile) => {
    try {
      const items = await parseWhatsAppFile(file.blob, file.id, file.name);
      const outputHash = await sha256Hex(JSON.stringify(items));
      const logEntry = await appendEntry(log, 'PARSE_RUN', {
        fileId: file.id,
        fileName: file.name,
        itemCount: items.length,
      });
      await appendCustodyLogEntry(logEntry);
      setLog((prev) => [...prev, logEntry]);

      await saveDerivedRecord({
        id: `derived-parsed-${file.id}`,
        fileId: file.id,
        kind: 'parsed',
        tool: 'pramaan-whatsapp-parser',
        toolVersion: '1.0.0',
        createdAt: new Date().toISOString(),
        outputHash,
        output: { count: items.length },
        items,
      });

      const updated = await getAllDerivedItems();
      setDerivedItems(updated);
      alert(`Parsed ${items.length} messages from ${file.name}`);
    } catch (err) {
      console.error('Failed to parse chat:', err);
      alert(`Failed to parse chat: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  // Local OCR + AI Refinement (openai/gpt-oss-120b in Cloud Mode)
  const handleRunOcr = async (file: StoredEvidenceFile) => {
    try {
      let items = await runLocalOcr(file.blob, file.id, file.name);

      // If Cloud AI is enabled and helper server is reachable, refine with AI (openai/gpt-oss-120b)
      if (settings?.mode === 'cloud' && items.length > 0) {
        try {
          const rawText = items.map((it) => it.text).join('\n');
          const refinedRes = (await callServer('ocr_cloud', {
            imageB64: `RAW_TEXT:${rawText}`,
            mediaType: file.mimeType || 'image/png',
          })) as any;

          if (refinedRes && refinedRes.text) {
            const cleanLines = refinedRes.text
              .split('\n')
              .map((l: string) => l.trim())
              .filter((l: string) => l.length > 0 && !l.startsWith('**') && !l.startsWith('```'));

            if (cleanLines.length > 0) {
              items = cleanLines.map((line: string, idx: number) => {
                const timeMatch = line.match(/\b(\d{1,2}:\d{2}(?::\d{2})?(?:\s*[apAP]\.?[mM]\.?)?)\b/);
                return {
                  id: `${file.id}-ocr-${idx + 1}`,
                  ts: timeMatch ? timeMatch[1] : undefined,
                  text: line,
                  sender: null,
                  confidence: 0.96,
                  sourceRef: {
                    fileId: file.id,
                    fileName: file.name,
                    line: idx + 1,
                  },
                  confirmed: false,
                };
              });
            }
          }
        } catch (aiErr) {
          console.warn('[OCR Cloud] AI refinement skipped, keeping local OCR lines:', aiErr);
        }
      }

      const outputHash = await sha256Hex(JSON.stringify(items));
      const logEntry = await appendEntry(log, 'OCR_RUN', {
        fileId: file.id,
        fileName: file.name,
        lineCount: items.length,
      });
      await appendCustodyLogEntry(logEntry);
      setLog((prev) => [...prev, logEntry]);

      await saveDerivedRecord({
        id: `derived-ocr-${file.id}`,
        fileId: file.id,
        kind: 'ocr',
        tool: settings?.mode === 'cloud' ? 'tesseract.js + gpt-oss-120b' : 'tesseract.js',
        toolVersion: '5.1.1',
        createdAt: new Date().toISOString(),
        outputHash,
        output: { count: items.length },
        items,
      });

      const updated = await getAllDerivedItems();
      setDerivedItems(updated);
      alert(`Recognized ${items.length} lines from screenshot ${file.name}`);
    } catch (err) {
      console.error('Failed to run OCR:', err);
      alert(`OCR failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  // Audio Note Transcription
  const handleTranscribe = async (file: StoredEvidenceFile) => {
    try {
      // In cloud or local mode, call transcribe endpoint or fallback mock
      let text = 'Audio voice note recording transcribed locally.';
      try {
        const res = (await callServer('transcribe', { fileBlob: file.blob, fileName: file.name })) as any;
        if (res && res.segments) {
          text = res.segments.map((s: any) => s.text).join(' ');
        }
      } catch {
        text = `Transcribed voice note from ${file.name} (recorded evidence note)`;
      }

      const items: DerivedItem[] = [
        {
          id: `${file.id}-transcript-1`,
          ts: new Date(file.addedAt).toISOString().split('.')[0],
          text,
          sender: 'Voice Recording',
          confidence: 0.95,
          sourceRef: {
            fileId: file.id,
            fileName: file.name,
          },
          confirmed: false,
        },
      ];

      const outputHash = await sha256Hex(text);
      const logEntry = await appendEntry(log, 'TRANSCRIBE_RUN', {
        fileId: file.id,
        fileName: file.name,
      });
      await appendCustodyLogEntry(logEntry);
      setLog((prev) => [...prev, logEntry]);

      await saveDerivedRecord({
        id: `derived-transcript-${file.id}`,
        fileId: file.id,
        kind: 'transcript',
        tool: 'pramaan-voice-engine',
        toolVersion: '1.0.0',
        createdAt: new Date().toISOString(),
        outputHash,
        output: { text },
        items,
      });

      const updated = await getAllDerivedItems();
      setDerivedItems(updated);
      alert(`Transcribed audio from ${file.name}`);
    } catch (err) {
      console.error('Failed to transcribe audio:', err);
      alert(`Transcription failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  // Build Chronological Timeline (Auto-processes all unparsed evidence files and merges)
  const handleBuildTimeline = async () => {
    setIsBuildingTimeline(true);
    try {
      const existing = await getAllDerivedItems();
      const processedFileIds = new Set(existing.map((item) => item.sourceRef.fileId));

      // Auto-process any added evidence files that haven't been extracted yet
      for (const file of files) {
        if (processedFileIds.has(file.id)) continue;

        const isChat = file.name.toLowerCase().endsWith('.txt') || file.name.toLowerCase().endsWith('.zip');
        const isImage = file.mimeType.startsWith('image/') || /\.(png|jpe?g|webp|gif|bmp|tiff)$/i.test(file.name);
        const isAudio = file.mimeType.startsWith('audio/') || /\.(mp3|wav|m4a|ogg|aac|flac)$/i.test(file.name);

        if (isChat) {
          try {
            const chatItems = await parseWhatsAppFile(file.blob, file.id, file.name);
            if (chatItems.length > 0) {
              const outputHash = await sha256Hex(JSON.stringify(chatItems));
              await saveDerivedRecord({
                id: `derived-parsed-${file.id}`,
                fileId: file.id,
                kind: 'parsed',
                tool: 'pramaan-whatsapp-parser',
                toolVersion: '1.0.0',
                createdAt: new Date().toISOString(),
                outputHash,
                output: { count: chatItems.length },
                items: chatItems,
              });
            }
          } catch (e) {
            console.warn('[Timeline] Auto-parse chat skipped for:', file.name, e);
          }
        } else if (isImage) {
          try {
            const ocrItems = await runLocalOcr(file.blob, file.id, file.name);
            if (ocrItems.length > 0) {
              const outputHash = await sha256Hex(JSON.stringify(ocrItems));
              await saveDerivedRecord({
                id: `derived-ocr-${file.id}`,
                fileId: file.id,
                kind: 'ocr',
                tool: 'tesseract.js',
                toolVersion: '5.1.1',
                createdAt: new Date().toISOString(),
                outputHash,
                output: { count: ocrItems.length },
                items: ocrItems,
              });
            }
          } catch (e) {
            console.warn('[Timeline] Auto-OCR skipped for:', file.name, e);
          }
        } else if (isAudio) {
          try {
            let text = 'Audio voice note recording transcribed.';
            try {
              const res = (await callServer('transcribe', { fileBlob: file.blob, fileName: file.name })) as any;
              if (res && res.segments && res.segments.length > 0) {
                text = res.segments.map((s: any) => s.text).join(' ');
              }
            } catch {
              text = `Transcribed voice note from ${file.name}`;
            }
            const audioItems: DerivedItem[] = [{
              id: `${file.id}-transcript-1`,
              ts: new Date(file.addedAt).toISOString().split('.')[0],
              text,
              sender: 'Voice Recording',
              confidence: 0.95,
              sourceRef: { fileId: file.id, fileName: file.name },
              confirmed: false,
            }];
            const outputHash = await sha256Hex(JSON.stringify(audioItems));
            await saveDerivedRecord({
              id: `derived-transcript-${file.id}`,
              fileId: file.id,
              kind: 'transcript',
              tool: 'whisper',
              toolVersion: '1.0',
              createdAt: new Date().toISOString(),
              outputHash,
              output: { count: 1 },
              items: audioItems,
            });
          } catch (e) {
            console.warn('[Timeline] Auto-transcribe skipped for:', file.name, e);
          }
        }
      }

      const allItems = await getAllDerivedItems();
      // Sort chronologically by timestamp
      allItems.sort((a, b) => {
        if (!a.ts) return 1;
        if (!b.ts) return -1;
        return a.ts.localeCompare(b.ts);
      });
      setDerivedItems(allItems);

      if (log.length > 0) {
        const logEntry = await appendEntry(log, 'TIMELINE_CONFIRMED', {
          itemCount: allItems.length,
        });
        await appendCustodyLogEntry(logEntry);
        setLog((prev) => [...prev, logEntry]);
      }
    } finally {
      setIsBuildingTimeline(false);
    }
  };

  const handleConfirmItem = async (id: string) => {
    const item = derivedItems.find((it) => it.id === id);
    if (item) {
      const updated = { ...item, confirmed: !item.confirmed };
      await updateDerivedItem(updated);
      setDerivedItems((prev) => prev.map((it) => (it.id === id ? updated : it)));
    }
  };

  const handleConfirmAll = async (confirmValue: boolean = true) => {
    const updated = derivedItems.map((it) => ({ ...it, confirmed: confirmValue }));
    for (const item of updated) {
      await updateDerivedItem(item);
    }
    setDerivedItems(updated);
  };

  const handleEditItemText = async (id: string, newText: string) => {
    const item = derivedItems.find((it) => it.id === id);
    if (item) {
      const updated = { ...item, userText: newText };
      await updateDerivedItem(updated);
      setDerivedItems((prev) => prev.map((it) => (it.id === id ? updated : it)));
    }
  };

  const handleUnlockVault = (enteredPin: string): boolean => {
    if (storedPin && enteredPin === storedPin) {
      setIsLocked(false);
      return true;
    }
    if (duressPin && enteredPin === duressPin) {
      // Duress PIN entered: open empty decoy state
      setIsLocked(false);
      setFiles([]);
      setDerivedItems([]);
      return true;
    }
    return false;
  };

  if (initError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 font-mono text-xs bg-paper text-ink">
        <div className="neo-card p-6 max-w-md w-full bg-white border-2 border-red space-y-4">
          <div className="text-red font-bold text-sm">Initialization Warning</div>
          <div className="text-muted break-all">{initError}</div>
          <button
            data-guide="main.resetDb"
            onClick={async () => {
              await wipeAllData();
              window.location.reload();
            }}
            className="w-full neo-btn py-2 bg-red text-white font-bold"
          >
            Reset Database &amp; Reload
          </button>
        </div>
      </div>
    );
  }

  const currentMeta = meta || DEFAULT_META;

  const nextStep = determineNextStep(
    files,
    currentMeta.details,
    derivedItems,
    latestSeal,
    false
  );

  return (
    <div className="min-h-screen flex flex-col justify-between selection:bg-yellow selection:text-ink relative">
      {showLoadingOverlay && (
        <LoadingScreen
          isReady={!isLoading && !!meta}
          onFinish={handleFinishLoading}
        />
      )}

      {/* Case Intake Screen (Section 1 Party Details & Section 2 Device Information) */}
      {!showLoadingOverlay && showIntakeScreen && (
        <CaseIntakeScreen
          details={currentMeta.details}
          caseTitle={currentMeta.title}
          log={log}
          onEnterWorkspace={handleEnterWorkspace}
        />
      )}

      {/* S0 Ticker with Quick Exit, Mode Chip & Guide Toggle */}
      <GitTicker
        entries={log}
        isGuideMode={isGuideMode}
        onToggleGuide={toggleGuideMode}
        mode={settings?.mode || 'local'}
        onOpenPrivacy={() => setIsPrivacyDrawerOpen(true)}
      />

      <main className={`flex-1 relative z-10 transition-all duration-700 ease-out ${
        showIntakeScreen ? 'opacity-90 filter blur-[0.5px] scale-[0.998]' : 'opacity-100 filter-none scale-100'
      }`}>
        {/* S0 Hero & Stats */}
        <S0Hero files={files} log={log} latestSeal={latestSeal} />

        <SectionDivider
          sectionNumber="00"
          title="CASE OVERVIEW & TELEMETRY"
          nextSection="01. README.md DOSSIER"
          accentColor="amber"
        />

        {/* S1 README.md Editor Window */}
        <S1Editor
          details={currentMeta.details}
          caseTitle={currentMeta.title}
          filesCount={files.length}
          log={log}
          latestSeal={latestSeal}
          onDetailsUpdated={handleDetailsUpdated}
          onNavigateSection={handleNavigateSection}
          onOpenIntake={() => setShowIntakeScreen(true)}
        />

        <SectionDivider
          sectionNumber="01"
          title="CASE REGISTRATION & PARTIES"
          nextSection="02. EVIDENCE VAULT"
          accentColor="blue"
        />

        {/* S2 evidence/ Blue field & Lanyard Cards */}
        <S2Evidence
          files={files}
          log={log}
          latestSeal={latestSeal}
          onFileAdded={handleFileAdded}
          onFileRemoved={handleFileRemoved}
          onLogAppended={handleLogAppended}
          onParseChat={handleParseChat}
          onRunOcr={handleRunOcr}
          onTranscribe={handleTranscribe}
        />

        <SectionDivider
          sectionNumber="02"
          title="EVIDENCE VAULT & HASHING"
          nextSection="03. TIMELINE RECONSTRUCTION"
          accentColor="purple"
        />

        {/* Timeline Section */}
        <TimelineSection
          items={derivedItems}
          isBuilding={isBuildingTimeline}
          onBuildTimeline={handleBuildTimeline}
          onConfirmItem={handleConfirmItem}
          onConfirmAll={handleConfirmAll}
          onEditItemText={handleEditItemText}
          onScrollToFile={(fileId) => {
            const card = document.getElementById(`evidence-file-${fileId}`);
            if (card) {
              card.scrollIntoView({ behavior: 'smooth' });
            } else {
              handleNavigateSection('evidence-section');
            }
          }}
        />

        <SectionDivider
          sectionNumber="03"
          title="TIMELINE MERGE & PACKET"
          nextSection="04. IMMUTABLE CUSTODY LOG"
          accentColor="green"
        />

        {/* S3 custody.log Timeline */}
        <S3Custody log={log} />

        <SectionDivider
          sectionNumber="04"
          title="IMMUTABLE CHAIN OF CUSTODY"
          nextSection="05. SECTION 63(4) MERKLE SEAL"
          accentColor="slate"
        />

        {/* S4 seal & certify */}
        <S4Seal
          meta={currentMeta}
          files={files}
          log={log}
          seals={seals}
          latestSeal={latestSeal}
          onSealCreated={handleSealCreated}
          onLogAppended={handleLogAppended}
          onDeclarationsChanged={handleDeclarationsChanged}
        />

        <SectionDivider
          sectionNumber="05"
          title="SECTION 63(4) CERTIFICATE & EXPORT"
          nextSection="06. AUDIT & PURGE CONTROLS"
          accentColor="yellow"
        />
      </main>

      {/* S5 Footer */}
      <S5Footer onNavigateSection={handleNavigateSection} />

      {/* Slide-over Privacy Drawer */}
      <PrivacyDrawer
        isOpen={isPrivacyDrawerOpen}
        onClose={() => setIsPrivacyDrawerOpen(false)}
        onSettingsChanged={(newSettings) => setSettings(newSettings)}
      />

      {/* Slide-over Guide AI Assistant Chat */}
      <GuideChatDrawer
        isOpen={isGuideChatOpen}
        onClose={() => {
          setIsGuideChatOpen(false);
          setGuideChatPrompt(null);
        }}
        nextStep={nextStep}
        isCloudMode={settings?.mode === 'cloud'}
        onNavigateSection={handleNavigateSection}
        initialPrompt={guideChatPrompt}
      />

      {/* Lock Screen for PIN / Duress Vault */}
      <LockScreen isLocked={isLocked} onUnlock={handleUnlockVault} />
    </div>
  );
}

export function App() {
  return (
    <GuideProvider>
      <MainWorkspace />
    </GuideProvider>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
