import { openDB, DBSchema, IDBPDatabase } from 'idb';
import {
  CustodyEntry,
  EvidenceFileMeta,
  CaseDetails,
  SealSnapshot,
  AICallLogEntry,
  DerivedRecord,
  DerivedItem,
  FindingsRun,
  TimestampRecord,
  AppSettings,
} from '../core/types';
import { appendEntry } from '../core/custody';

export interface StoredEvidenceFile extends EvidenceFileMeta {
  blob: Blob;
}

export interface CaseMeta {
  caseId: string;
  createdAt: string;
  title: string;
  details: CaseDetails;
  declarations: Record<string, boolean>;
  declarationsAckAt?: string;
}

interface PramaanDB extends DBSchema {
  meta: {
    key: string;
    value: CaseMeta;
  };
  files: {
    key: string;
    value: StoredEvidenceFile;
    indexes: { 'by-order': number };
  };
  log: {
    key: number;
    value: CustodyEntry;
  };
  seals: {
    key: number;
    value: SealSnapshot;
  };
  derived: {
    key: string;
    value: DerivedRecord;
  };
  findings: {
    key: string;
    value: FindingsRun;
  };
  aicalls: {
    key: string;
    value: AICallLogEntry;
  };
  timestamps: {
    key: number;
    value: TimestampRecord;
  };
  settings: {
    key: string;
    value: AppSettings;
  };
}

const DB_NAME = 'pramaan-db';
const DB_VERSION = 2;

let dbPromise: Promise<IDBPDatabase<PramaanDB>> | null = null;

export function getDB(): Promise<IDBPDatabase<PramaanDB>> {
  if (!dbPromise) {
    dbPromise = openDB<PramaanDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('meta')) {
          db.createObjectStore('meta');
        }
        if (!db.objectStoreNames.contains('files')) {
          const fileStore = db.createObjectStore('files', { keyPath: 'id' });
          fileStore.createIndex('by-order', 'order');
        }
        if (!db.objectStoreNames.contains('log')) {
          db.createObjectStore('log', { keyPath: 'index' });
        }
        if (!db.objectStoreNames.contains('seals')) {
          db.createObjectStore('seals', { keyPath: 'n' });
        }
        if (!db.objectStoreNames.contains('derived')) {
          db.createObjectStore('derived', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('findings')) {
          db.createObjectStore('findings', { keyPath: 'runId' });
        }
        if (!db.objectStoreNames.contains('aicalls')) {
          db.createObjectStore('aicalls', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('timestamps')) {
          db.createObjectStore('timestamps', { keyPath: 'n' });
        }
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings');
        }
      },
    });
  }
  return dbPromise;
}

export function generateCaseId(): string {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  let hex = '';
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, '0');
  }
  return hex;
}

export async function getOrCreateCaseMeta(): Promise<CaseMeta> {
  const db = await getDB();
  let meta = await db.get('meta', 'case');
  if (!meta) {
    const caseId = generateCaseId();
    const createdAt = new Date().toISOString();
    meta = {
      caseId,
      createdAt,
      title: 'Untitled case',
      details: {
        name: '',
        parentage: '',
        address: '',
        relationship: '',
      },
      declarations: {},
    };

    // Compute the genesis entry BEFORE opening any transaction
    const genesis = await appendEntry([], 'CASE_CREATED', {
      caseId,
      title: meta.title,
    });

    // Write meta and log entry safely without active transaction timeout
    await db.put('meta', meta, 'case');
    const existingLog = await db.getAll('log');
    if (existingLog.length === 0) {
      await db.put('log', genesis);
    }
  }
  return meta;
}

export async function updateCaseDetails(
  details: CaseDetails,
  title?: string
): Promise<void> {
  const db = await getDB();
  const meta = await getOrCreateCaseMeta();
  meta.details = details;
  if (title !== undefined) {
    meta.title = title;
  }
  await db.put('meta', meta, 'case');
}

export async function updateDeclarations(
  declarations: Record<string, boolean>,
  acknowledgedAt?: string
): Promise<void> {
  const db = await getDB();
  const meta = await getOrCreateCaseMeta();
  meta.declarations = declarations;
  if (acknowledgedAt) {
    meta.declarationsAckAt = acknowledgedAt;
  }
  await db.put('meta', meta, 'case');
}

export async function getEvidenceFiles(): Promise<StoredEvidenceFile[]> {
  const db = await getDB();
  const files = await db.getAllFromIndex('files', 'by-order');
  return files;
}

export async function getCustodyLog(): Promise<CustodyEntry[]> {
  const db = await getDB();
  return db.getAll('log');
}

export async function getSeals(): Promise<SealSnapshot[]> {
  const db = await getDB();
  return db.getAll('seals');
}

export async function getLatestSeal(): Promise<SealSnapshot | null> {
  const seals = await getSeals();
  if (seals.length === 0) return null;
  seals.sort((a, b) => b.n - a.n);
  return seals[0];
}

export async function addFileWithLog(
  file: StoredEvidenceFile,
  logEntry: CustodyEntry
): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(['files', 'log'], 'readwrite');
  await tx.objectStore('files').put(file);
  await tx.objectStore('log').put(logEntry);
  await tx.done;
}

export async function removeFileWithLog(
  fileId: string,
  logEntry?: CustodyEntry
): Promise<void> {
  const db = await getDB();
  const stores: ('files' | 'log' | 'derived')[] = logEntry
    ? ['files', 'log', 'derived']
    : ['files', 'derived'];
  const tx = db.transaction(stores, 'readwrite');
  await tx.objectStore('files').delete(fileId);
  if (logEntry) {
    await tx.objectStore('log').put(logEntry);
  }
  const derivedStore = tx.objectStore('derived');
  const allDerived = await derivedStore.getAll();
  for (const rec of allDerived) {
    if (rec.fileId === fileId) {
      await derivedStore.delete(rec.id);
    }
  }
  await tx.done;
}

export async function saveSealWithLog(
  seal: SealSnapshot,
  logEntry: CustodyEntry
): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(['seals', 'log'], 'readwrite');
  await tx.objectStore('seals').put(seal);
  await tx.objectStore('log').put(logEntry);
  await tx.done;
}

export async function appendCustodyLogEntry(entry: CustodyEntry): Promise<void> {
  const db = await getDB();
  await db.put('log', entry);
}

export async function getSettings(): Promise<AppSettings> {
  const db = await getDB();
  const settings = await db.get('settings', 'current');
  if (!settings) {
    const defaultSettings: AppSettings = {
      mode: 'local',
      helperUrl: 'http://127.0.0.1:8000',
      autoLockSeconds: 300,
      lang: 'en',
    };
    await db.put('settings', defaultSettings, 'current');
    return defaultSettings;
  }
  return settings;
}

export async function updateSettings(partial: Partial<AppSettings>): Promise<AppSettings> {
  const db = await getDB();
  const current = await getSettings();
  const updated = { ...current, ...partial };
  await db.put('settings', updated, 'current');
  return updated;
}

export async function getDerivedRecords(): Promise<DerivedRecord[]> {
  const db = await getDB();
  return db.getAll('derived');
}

export async function getAllDerivedItems(): Promise<DerivedItem[]> {
  const records = await getDerivedRecords();
  return records.flatMap((r) => r.items);
}

export async function updateDerivedItem(item: DerivedItem): Promise<void> {
  const db = await getDB();
  const records = await db.getAll('derived');
  for (const rec of records) {
    const idx = rec.items.findIndex((it) => it.id === item.id);
    if (idx !== -1) {
      rec.items[idx] = item;
      await db.put('derived', rec);
      break;
    }
  }
}

export async function saveDerivedRecord(
  rec: DerivedRecord,
  logEntry?: CustodyEntry
): Promise<void> {
  const db = await getDB();
  const stores: ('derived' | 'log')[] = logEntry ? ['derived', 'log'] : ['derived'];
  const tx = db.transaction(stores, 'readwrite');
  await tx.objectStore('derived').put(rec);
  if (logEntry) {
    await tx.objectStore('log').put(logEntry);
  }
  await tx.done;
}

export async function getFindingsRuns(): Promise<FindingsRun[]> {
  const db = await getDB();
  return db.getAll('findings');
}

export async function saveFindingsRun(
  run: FindingsRun,
  logEntry?: CustodyEntry
): Promise<void> {
  const db = await getDB();
  const stores: ('findings' | 'log')[] = logEntry ? ['findings', 'log'] : ['findings'];
  const tx = db.transaction(stores, 'readwrite');
  await tx.objectStore('findings').put(run);
  if (logEntry) {
    await tx.objectStore('log').put(logEntry);
  }
  await tx.done;
}

export async function getAICalls(): Promise<AICallLogEntry[]> {
  const db = await getDB();
  return db.getAll('aicalls');
}

export async function saveAICall(entry: AICallLogEntry): Promise<void> {
  const db = await getDB();
  await db.put('aicalls', entry);
}

export async function getTimestampRecord(sealNo: number): Promise<TimestampRecord | undefined> {
  const db = await getDB();
  return db.get('timestamps', sealNo);
}

export async function saveTimestampRecord(rec: TimestampRecord): Promise<void> {
  const db = await getDB();
  await db.put('timestamps', rec);
}

export async function wipeAllData(): Promise<void> {
  try {
    if (dbPromise) {
      const db = await dbPromise;
      try {
        const storeNames = Array.from(db.objectStoreNames) as any[];
        const tx = db.transaction(storeNames, 'readwrite');
        for (const store of storeNames) {
          tx.objectStore(store).clear();
        }
        await tx.done;
      } catch (e) {
        console.warn('Could not clear stores in active DB:', e);
      }
      db.close();
      dbPromise = null;
    }
  } catch (err) {
    console.warn('Error during DB closing:', err);
  }

  await new Promise<void>((resolve) => {
    try {
      const req = indexedDB.deleteDatabase(DB_NAME);
      req.onsuccess = () => resolve();
      req.onerror = () => resolve();
      req.onblocked = () => {
        resolve();
      };
      setTimeout(resolve, 300);
    } catch {
      resolve();
    }
  });

  try {
    sessionStorage.removeItem('pramaan_intake_completed');
    localStorage.removeItem('pramaan_intake_completed');
  } catch {
    // ignore
  }
}
