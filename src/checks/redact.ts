/**
 * Tokenized redaction for privacy before transmission or external explanation
 * Replaces phone numbers, email addresses, and designated names with stable replacement tokens.
 */

export interface RedactionResult {
  redactedText: string;
  tokenMap: Record<string, string>; // token -> original
  reverseMap: Record<string, string>; // original -> token
}

export function redactText(
  text: string,
  extraNamesToRedact: string[] = []
): RedactionResult {
  const tokenMap: Record<string, string> = {};
  const reverseMap: Record<string, string> = {};

  let phoneCounter = 1;
  let emailCounter = 1;
  let personCounter = 1;

  function getToken(original: string, prefix: string, counterRef: () => number): string {
    const trimmed = original.trim();
    if (reverseMap[trimmed]) {
      return reverseMap[trimmed];
    }
    const token = `[${prefix}_${counterRef()}]`;
    reverseMap[trimmed] = token;
    tokenMap[token] = trimmed;
    return token;
  }

  // 1. Redact emails
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
  let processed = text.replace(emailRegex, (match) => {
    return getToken(match, 'EMAIL', () => emailCounter++);
  });

  // 2. Redact phone numbers (India 10-digit, +91, with spaces or hyphens)
  const phoneRegex = /(?:\+?91[\s-]?)?[6-9]\d{4}[\s-]?\d{5}\b/g;
  processed = processed.replace(phoneRegex, (match) => {
    return getToken(match, 'PHONE', () => phoneCounter++);
  });

  // 3. Redact custom names/parties
  for (const name of extraNamesToRedact) {
    if (!name || name.trim().length < 3) continue;
    const escaped = name.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const nameRegex = new RegExp(`\\b${escaped}\\b`, 'gi');
    processed = processed.replace(nameRegex, (match) => {
      return getToken(match, 'PERSON', () => personCounter++);
    });
  }

  return {
    redactedText: processed,
    tokenMap,
    reverseMap,
  };
}

export function restoreRedacted(
  redactedText: string,
  tokenMap: Record<string, string>
): string {
  let restored = redactedText;
  for (const [token, original] of Object.entries(tokenMap)) {
    restored = restored.split(token).join(original);
  }
  return restored;
}

