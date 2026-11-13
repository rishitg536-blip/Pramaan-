import { AICallLogEntry } from '../core/types';
import { getSettings, saveAICall, appendCustodyLogEntry } from '../storage/db';
import { appendEntry } from '../core/custody';
import { sha256Hex } from '../core/hash';

export type GateCallKind =
  | 'stamp'
  | 'stampUpgrade'
  | 'transcribe'
  | 'explain'
  | 'ocr_cloud'
  | 'guide'
  | 'health';

export class NotAllowedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotAllowedError';
  }
}

export interface GateOptions {
  userConfirmed?: boolean;
  onCustodyLogged?: (entry: unknown) => void;
}

export function isLocalHelper(url: string): boolean {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname;
    return host === 'localhost' || host === '127.0.0.1' || host === '::1';
  } catch {
    return false;
  }
}

export async function callServer<T = unknown>(
  kind: GateCallKind,
  payload: unknown,
  opts: GateOptions = {}
): Promise<T> {
  const settings = await getSettings();
  const helperUrl = settings.helperUrl || 'http://127.0.0.1:8000';
  const isLocal = isLocalHelper(helperUrl);

  // 1. Permission checks
  let dataClass = 'none';
  let redacted = false;
  let endpoint = '/api/health';
  let method = 'POST';

  switch (kind) {
    case 'health':
      endpoint = '/api/health';
      method = 'GET';
      dataClass = 'none';
      break;

    case 'stamp':
      endpoint = '/api/stamp';
      dataClass = 'fingerprint_only';
      if (!opts.userConfirmed) {
        throw new NotAllowedError('Timestamp request requires user confirmation');
      }
      break;

    case 'stampUpgrade':
      endpoint = '/api/stamp/upgrade';
      dataClass = 'fingerprint_only';
      break;

    case 'transcribe':
      endpoint = '/api/transcribe';
      dataClass = 'audio';
      if (!isLocal && settings.mode !== 'cloud') {
        throw new NotAllowedError('Remote transcription requires Cloud AI mode');
      }
      if (!isLocal && !opts.userConfirmed) {
        throw new NotAllowedError('Remote transcription requires user confirmation');
      }
      break;

    case 'explain':
      endpoint = '/api/explain';
      dataClass = 'redacted_findings';
      redacted = true;
      if (settings.mode !== 'cloud') {
        throw new NotAllowedError('Cloud findings explanation is blocked in Local Mode');
      }
      if (!settings.cloudConsentAt) {
        throw new NotAllowedError('Cloud findings explanation requires Cloud AI consent');
      }
      break;

    case 'ocr_cloud':
      endpoint = '/api/ocr-cloud';
      dataClass = 'image';
      if (settings.mode !== 'cloud') {
        throw new NotAllowedError('Cloud vision OCR is blocked in Local Mode');
      }
      if (!settings.cloudConsentAt) {
        throw new NotAllowedError('Cloud vision OCR requires Cloud AI consent');
      }
      if (!opts.userConfirmed) {
        throw new NotAllowedError('Cloud vision OCR requires per-image user confirmation');
      }
      break;

    case 'guide':
      endpoint = '/api/guide';
      dataClass = 'guide_text';
      if (!settings.guideAiConsentAt) {
        throw new NotAllowedError('Guide AI requires Guide AI consent');
      }
      break;

    default:
      throw new NotAllowedError(`Unknown gate call kind: ${kind}`);
  }

  // 2. Compute payload metrics and hash
  let payloadStr = '';
  let payloadBytes = 0;
  let isFormData = false;

  if (payload instanceof FormData) {
    isFormData = true;
    payloadStr = 'multipart/form-data';
    payloadBytes = 1024; // approximate
  } else if (payload !== undefined && payload !== null) {
    payloadStr = JSON.stringify(payload);
    payloadBytes = new TextEncoder().encode(payloadStr).length;
  }

  const payloadHash = await sha256Hex(payloadStr);
  const callId = `call_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const nowIso = new Date().toISOString();

  // 3. Write aicalls row BEFORE sending
  const logEntry: AICallLogEntry = {
    id: callId,
    time: nowIso,
    kind,
    provider: isLocal ? 'localhost-helper' : 'cloud-llm',
    dataClass,
    redacted,
    bytes: payloadBytes,
    payloadHash,
    status: 'sent',
    userConfirmed: !!opts.userConfirmed,
  };

  await saveAICall(logEntry);

  // 4. Append AI_CALL custody log entry (if not health check)
  if (kind !== 'health') {
    try {
      const custodyEntry = await appendEntry([], 'AI_CALL', {
        callId,
        kind,
        provider: logEntry.provider,
        dataClass,
        redacted,
        bytes: payloadBytes,
        payloadHash,
      });
      await appendCustodyLogEntry(custodyEntry);
      if (opts.onCustodyLogged) {
        opts.onCustodyLogged(custodyEntry);
      }
    } catch (e) {
      console.warn('Failed to append AI_CALL custody entry:', e);
    }
  }

  // 5. Execute fetch request
  const url = `${helperUrl.replace(/\/+$/, '')}${endpoint}`;
  try {
    const fetchOpts: RequestInit = {
      method,
      headers: isFormData ? {} : { 'Content-Type': 'application/json' },
      body: method === 'GET' ? undefined : (isFormData ? (payload as FormData) : payloadStr),
    };

    const res = await fetch(url, fetchOpts);
    if (!res.ok) {
      const errText = await res.text();
      logEntry.status = 'failed';
      logEntry.error = `HTTP ${res.status}: ${errText.substring(0, 100)}`;
      await saveAICall(logEntry);
      throw new Error(logEntry.error);
    }

    const data = (await res.json()) as T;
    logEntry.status = 'success';
    await saveAICall(logEntry);
    return data;
  } catch (err: unknown) {
    logEntry.status = 'failed';
    logEntry.error = err instanceof Error ? err.message : String(err);
    await saveAICall(logEntry);
    throw err;
  }
}

