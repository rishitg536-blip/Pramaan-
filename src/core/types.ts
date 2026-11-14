export type CustodyAction =
  | 'CASE_CREATED'
  | 'DETAILS_SAVED'
  | 'FILE_ADDED'
  | 'FILE_REMOVED'
  | 'FILE_VERIFIED'
  | 'SEAL_GENERATED'
  | 'EXPORT_GENERATED'
  | 'PARSE_RUN'
  | 'OCR_RUN'
  | 'TRANSCRIBE_RUN'
  | 'TIMELINE_CONFIRMED'
  | 'FINDINGS_RUN'
  | 'AI_CALL'
  | 'TIMESTAMP_REQUESTED'
  | 'TIMESTAMP_CONFIRMED';

export interface CustodyEntry {
  index: number;
  time: string;
  action: CustodyAction | string;
  fileId: string | null;
  details: Record<string, unknown>;
  prevHash: string;
  entryHash: string;
}

export interface MerkleProofStep {
  side: 'left' | 'right';
  hash: string;
}

export interface EvidenceFileMeta {
  id: string;
  order: number;
  name: string;
  size: number;
  mimeType: string;
  lastModified: number;
  sha256: string;
  leaf: string;
  addedAt: string;
}

export interface CaseDetails {
  name: string;
  parentage: string;
  address: string;
  relationship: string;
  title?: string;
  respondent?: {
    name?: string;
    address?: string;
    relationship?: string;
  };
  deponent?: {
    name?: string;
    address?: string;
    relationship?: string;
  };
  period?: {
    start?: string;
    end?: string;
  };
  device?: {
    model?: string;
    os?: string;
    custodian?: string;
  };
}

export interface SealSnapshot {
  n: number;
  sealedAt: string;
  merkleRoot: string;
  custodyHead: string;
  caseFingerprint: string;
  fileIds: string[];
  proofs: Record<string, MerkleProofStep[]>;
}

export interface FingerprintFile {
  version: 'pramaan-1';
  algorithm: 'SHA-256';
  caseId: string;
  sealedAt: string;
  files: Array<{
    id: string;
    name: string;
    size: number;
    sha256: string;
    addedAt: string;
    leaf: string;
  }>;
  merkleRoot: string;
  proofs: Record<string, MerkleProofStep[]>;
  custodyHead: string;
  caseFingerprint: string;
  custodyLog: CustodyEntry[];
  timestamp: {
    status: 'not_requested' | 'pending' | 'confirmed' | 'sample' | 'failed';
    service?: string;
    digest?: string;
    submittedAt?: string;
    confirmedAt?: string;
    blockHeight?: number;
    proofB64?: string;
    sample?: boolean;
    note?: string;
  };
}

export interface AICallLogEntry {
  id: string;
  time: string;
  kind: string;
  provider: string;
  dataClass: string;
  redacted: boolean;
  bytes: number;
  payloadHash: string;
  status: 'sent' | 'success' | 'failed' | 'blocked';
  userConfirmed: boolean;
  error?: string;
}

export interface DerivedItem {
  id: string;
  ts?: string;
  text: string;
  sender?: string | null;
  confidence?: number;
  sourceRef: {
    fileId: string;
    fileName: string;
    line?: number;
    bbox?: number[];
  };
  confirmed: boolean;
  userText?: string;
  flags?: string[];
  attachment?: {
    name?: string;
    omitted: boolean;
  };
}

export interface DerivedRecord {
  id: string;
  fileId: string;
  kind: 'parsed' | 'ocr' | 'transcript';
  tool: string;
  toolVersion: string;
  createdAt: string;
  outputHash: string;
  output: unknown;
  items: DerivedItem[];
}

export type FindingLevel = 'ok' | 'info' | 'warn' | 'alert';

export interface Finding {
  id: string;
  ruleId: string;
  level: FindingLevel;
  claim: string;
  evidence: Array<{
    file: string;
    where?: string;
  }>;
  explain: string;
  action: string;
  params?: Record<string, unknown>;
}

export interface FindingsRun {
  runId: string;
  createdAt: string;
  rulesetVersion: string;
  params: Record<string, unknown>;
  findings: Finding[];
  outputHash: string;
}

export interface TimestampRecord {
  n: number;
  digest: string;
  service: string;
  status: 'not_requested' | 'pending' | 'confirmed' | 'sample' | 'failed';
  submittedAt: string;
  confirmedAt?: string;
  blockHeight?: number;
  proofB64?: string;
  sample: boolean;
}

export interface AppSettings {
  mode: 'local' | 'cloud';
  cloudConsentAt?: string;
  guideAiConsentAt?: string;
  helperUrl: string;
  autoLockSeconds: number;
  lang: string;
  lockEnabled?: boolean;
  pin?: string;
  duressPin?: string;
}

export interface VerificationCheckResult {
  step: string;
  passed: boolean;
  message: string;
}

export interface FileVerificationResult {
  filename: string;
  status: 'MATCH' | 'CHANGED' | 'NOT_IN_CASE';
  message: string;
  computedHash: string;
  expectedHash?: string;
}

