import JSZip from 'jszip';
import { DerivedItem } from '../core/types';

// Regex patterns to match timestamp and sender prefix
// Android: 15/08/2026, 9:41 pm - Alice: Message
// iOS: [15/08/2026, 09:41:22 PM] Alice: Message
const ANDROID_PREFIX = /^(\d{1,4}[/.-]\d{1,2}[/.-]\d{2,4}),?\s+(\d{1,2}:\d{2}(?::\d{2})?(?:\s*[apAP]\.?[mM]\.?)?)\s*-\s*(?:([^:]+):\s*)?(.*)$/;
const IOS_PREFIX = /^\[(\d{1,4}[/.-]\d{1,2}[/.-]\d{2,4}),?\s+(\d{1,2}:\d{2}(?::\d{2})?(?:\s*[apAP]\.?[mM]\.?)?)\]\s*(?:([^:]+):\s*)?(.*)$/;

interface RawParsedMessage {
  rawDate: string;
  rawTime: string;
  sender: string | null;
  text: string;
  line: number;
}

/**
 * Clean invisible unicode artifacts from WhatsApp exports
 */
export function cleanWhatsAppLine(line: string): string {
  return line
    .replace(/[\u200e\u200f]/g, '') // LTR / RTL marks
    .replace(/[\u202f\u00a0]/g, ' ') // Narrow and non-breaking spaces
    .trimEnd();
}

/**
 * Determine whether dates are predominantly DD/MM/YYYY or MM/DD/YYYY
 */
function detectDateOrder(rawMessages: RawParsedMessage[]): 'DMY' | 'MDY' | 'YMD' {
  for (const msg of rawMessages) {
    const parts = msg.rawDate.split(/[/.-]/).map((p) => parseInt(p, 10));
    if (parts.length === 3) {
      if (parts[0] > 1000) return 'YMD';
      if (parts[0] > 12) return 'DMY';
      if (parts[1] > 12) return 'MDY';
    }
  }
  return 'DMY'; // Default to DMY (India/UK/intl WhatsApp export standard)
}

/**
 * Convert raw date & time into ISO-like string YYYY-MM-DDTHH:mm:ss
 */
function normalizeTimestamp(rawDate: string, rawTime: string, dateOrder: 'DMY' | 'MDY' | 'YMD'): string {
  const dateParts = rawDate.split(/[/.-]/).map((p) => parseInt(p, 10));
  let year = 2026;
  let month = 1;
  let day = 1;

  if (dateOrder === 'YMD') {
    year = dateParts[0];
    month = dateParts[1];
    day = dateParts[2];
  } else if (dateOrder === 'MDY') {
    month = dateParts[0];
    day = dateParts[1];
    year = dateParts[2];
  } else {
    day = dateParts[0];
    month = dateParts[1];
    year = dateParts[2];
  }

  // Handle 2-digit years (e.g. 26 -> 2026)
  if (year < 100) {
    year = year < 70 ? 2000 + year : 1900 + year;
  }

  // Parse time
  const timeClean = rawTime.trim().toLowerCase();
  const isPM = timeClean.includes('pm') || timeClean.includes('p.m.');
  const isAM = timeClean.includes('am') || timeClean.includes('a.m.');
  const timeDigits = timeClean.replace(/[^\d:]/g, '');
  const [hStr, mStr, sStr] = timeDigits.split(':');

  let hours = parseInt(hStr || '0', 10);
  const minutes = parseInt(mStr || '0', 10);
  const seconds = sStr ? parseInt(sStr, 10) : 0;

  if (isPM && hours < 12) {
    hours += 12;
  } else if (isAM && hours === 12) {
    hours = 0;
  }

  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${year}-${pad(month)}-${pad(day)}T${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

/**
 * Parse WhatsApp chat export text into standard DerivedItems
 */
export function parseWhatsAppText(
  rawText: string,
  fileId: string,
  fileName: string
): DerivedItem[] {
  const lines = rawText.split(/\r?\n/);
  const rawMessages: RawParsedMessage[] = [];
  let currentMsg: RawParsedMessage | null = null;

  for (let i = 0; i < lines.length; i++) {
    const originalLine = lines[i];
    const line = cleanWhatsAppLine(originalLine);
    if (!line && !currentMsg) continue;

    const androidMatch = line.match(ANDROID_PREFIX);
    const iosMatch = line.match(IOS_PREFIX);
    const match = androidMatch || iosMatch;

    if (match) {
      if (currentMsg) {
        rawMessages.push(currentMsg);
      }
      currentMsg = {
        rawDate: match[1],
        rawTime: match[2],
        sender: match[3] ? match[3].trim() : null,
        text: match[4] || '',
        line: i + 1,
      };
    } else if (currentMsg) {
      // Multi-line continuation
      currentMsg.text += '\n' + originalLine;
    }
  }

  if (currentMsg) {
    rawMessages.push(currentMsg);
  }

  const dateOrder = detectDateOrder(rawMessages);

  return rawMessages.map((msg, index) => {
    let cleanText = msg.text.trim();
    const flags: string[] = [];
    let attachment: { name?: string; omitted: boolean } | undefined;

    // Detect edited markers
    if (cleanText.includes('<This message was edited>')) {
      flags.push('edited');
      cleanText = cleanText.replace(/<This message was edited>/g, '').trim();
    } else if (/\(edited\)$/i.test(cleanText)) {
      flags.push('edited');
      cleanText = cleanText.replace(/\(edited\)$/i, '').trim();
    }

    // Detect deleted markers
    if (
      cleanText === 'This message was deleted' ||
      cleanText === 'You deleted this message'
    ) {
      flags.push('deleted');
    }

    // Detect attachments
    if (cleanText.includes('<Media omitted>') || cleanText.includes('<media omitted>')) {
      attachment = { omitted: true };
    } else {
      const attachMatch = cleanText.match(/^(?:<attached:\s*([^>]+)>|([^(\n]+)\s*\(file attached\))/i);
      if (attachMatch) {
        const name = (attachMatch[1] || attachMatch[2] || '').trim();
        attachment = { name, omitted: false };
      }
    }

    // Detect system messages
    if (!msg.sender) {
      flags.push('system');
    }

    const ts = normalizeTimestamp(msg.rawDate, msg.rawTime, dateOrder);

    return {
      id: `${fileId}-msg-${index + 1}`,
      ts,
      text: cleanText,
      sender: msg.sender,
      confidence: 1.0,
      sourceRef: {
        fileId,
        fileName,
        line: msg.line,
      },
      confirmed: false,
      flags: flags.length > 0 ? flags : undefined,
      attachment,
    };
  });
}

/**
 * Parse WhatsApp file (supports .txt or .zip containing chat text)
 */
export async function parseWhatsAppFile(
  fileOrBlob: Blob,
  fileId: string,
  fileName: string
): Promise<DerivedItem[]> {
  const lowerName = fileName.toLowerCase();

  if (lowerName.endsWith('.zip')) {
    const buffer = await fileOrBlob.arrayBuffer();
    const zip = await JSZip.loadAsync(buffer);
    // Find _chat.txt or any .txt file
    let chatFile = zip.file('_chat.txt');
    if (!chatFile) {
      const txtFiles = zip.file(/\.txt$/i);
      if (txtFiles.length > 0) {
        chatFile = txtFiles[0];
      }
    }

    if (!chatFile) {
      throw new Error('No .txt chat export found inside the zip archive.');
    }

    const text = await chatFile.async('text');
    return parseWhatsAppText(text, fileId, fileName);
  }

  const text = await fileOrBlob.text();
  return parseWhatsAppText(text, fileId, fileName);
}
