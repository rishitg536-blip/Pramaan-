/**
 * Plain-language templates for consistency findings.
 * Note: Under no circumstances should words like "court-ready", "guaranteed", "admissible",
 * "authentic", "fake", "genuine", or "certified" appear.
 * Allowed verbs: "matches", "does not match", "cannot tell".
 */

export interface RuleTemplate {
  ruleId: string;
  title: string;
  defaultLevel: 'ok' | 'info' | 'warn' | 'alert';
  claimTemplate: (params: Record<string, unknown>) => string;
  explainTemplate: (params: Record<string, unknown>) => string;
  actionTemplate: (params: Record<string, unknown>) => string;
}

export const RULE_TEMPLATES: Record<string, RuleTemplate> = {
  'C-001': {
    ruleId: 'C-001',
    title: 'Timestamp Inversion / Jump',
    defaultLevel: 'alert',
    claimTemplate: (p) =>
      `Timestamp sequence jump observed: ${p.earlierTime || 'Earlier'} appears after ${p.laterTime || 'Later'}.`,
    explainTemplate: () =>
      `A message or entry timestamp appears earlier than the previous entry. This does not match a normal linear chat export order and could indicate rearranged text or clock skew.`,
    actionTemplate: () =>
      `Review original device export or export chat again without manual editing.`,
  },

  'C-002': {
    ruleId: 'C-002',
    title: 'Deleted Message Notice',
    defaultLevel: 'info',
    claimTemplate: (p) =>
      `Chat export contains ${p.count || 1} deleted message marker(s).`,
    explainTemplate: () =>
      `WhatsApp records "This message was deleted" when a participant removes content. The content is missing from the export text.`,
    actionTemplate: () =>
      `If you have screenshots taken before deletion, add them to the evidence collection.`,
  },

  'C-003': {
    ruleId: 'C-003',
    title: 'Edited Message Notice',
    defaultLevel: 'info',
    claimTemplate: (p) =>
      `Chat export contains ${p.count || 1} edited message notice(s).`,
    explainTemplate: () =>
      `A message was edited by the sender after being sent. WhatsApp notes this modification in the raw export.`,
    actionTemplate: () =>
      `Check if earlier screenshot shows the unedited wording.`,
  },

  'C-004': {
    ruleId: 'C-004',
    title: 'Missing Attachment File',
    defaultLevel: 'warn',
    claimTemplate: (p) =>
      `Media attachment "${p.fileName || 'file'}" is mentioned in chat but not found in evidence collection.`,
    explainTemplate: (p) =>
      `The chat log mentions an attached media file "${p.fileName || 'file'}", but this file was not added to Pramaan.`,
    actionTemplate: () =>
      `Locate the media file in WhatsApp media folder and add it to evidence.`,
  },

  'C-005': {
    ruleId: 'C-005',
    title: 'Sender Name / Contact Inconsistency',
    defaultLevel: 'warn',
    claimTemplate: (p) =>
      `Sender name "${p.nameA}" differs slightly from "${p.nameB}".`,
    explainTemplate: () =>
      `Two sender identities in the evidence differ by only a few characters. Pramaan cannot tell if they are the same person or separate contacts.`,
    actionTemplate: () =>
      `Verify phone numbers or contact details to clarify identity in case details.`,
  },

  'C-006': {
    ruleId: 'C-006',
    title: 'Duplicate Evidence Item',
    defaultLevel: 'info',
    claimTemplate: (p) =>
      `Identical file or message appears multiple times: "${p.item || 'Item'}".`,
    explainTemplate: () =>
      `The same message text and timestamp, or duplicate file hash, exists in multiple places.`,
    actionTemplate: () =>
      `Confirm whether duplicate is intentional or redundant.`,
  },

  'C-007': {
    ruleId: 'C-007',
    title: 'Screenshot vs Chat Timestamp Discrepancy',
    defaultLevel: 'warn',
    claimTemplate: (p) =>
      `Screenshot timestamp (${p.screenTs}) does not match chat log timestamp (${p.chatTs}).`,
    explainTemplate: () =>
      `The time displayed in the screenshot image does not match the timestamp recorded in the chat export for the same conversation slice.`,
    actionTemplate: () =>
      `Check timezone differences between device clock and export settings.`,
  },

  'C-008': {
    ruleId: 'C-008',
    title: 'Voice Note Duration Discrepancy',
    defaultLevel: 'warn',
    claimTemplate: (p) =>
      `Voice note length (${p.audioDuration}s) does not match chat note indicator (${p.chatDuration}s).`,
    explainTemplate: () =>
      `The audio file duration does not match the recorded duration string in the chat text.`,
    actionTemplate: () =>
      `Ensure the audio file matches the exact export and was not truncated.`,
  },

  'C-009': {
    ruleId: 'C-009',
    title: 'Unconfirmed Helper Output',
    defaultLevel: 'info',
    claimTemplate: (p) =>
      `${p.count || 1} OCR or transcription item(s) have not been confirmed by you.`,
    explainTemplate: () =>
      `Machine OCR and speech transcription are automated helper outputs. They must be reviewed and confirmed for accuracy.`,
    actionTemplate: () =>
      `Review helper items in timeline and click "Confirm ✓" on verified lines.`,
  },

  'C-010': {
    ruleId: 'C-010',
    title: 'Incomplete Case Details / Respondent Info',
    defaultLevel: 'warn',
    claimTemplate: () =>
      `Respondent information or case title is missing in case details.`,
    explainTemplate: () =>
      `Section 63(4) Part A schedule drafts require specifying the person against whom evidence is presented.`,
    actionTemplate: () =>
      `Open README.md editor and enter the name, relationship, or handle of the respondent.`,
  },

  'C-011': {
    ruleId: 'C-011',
    title: 'Custody Chain Hash Continuity Check',
    defaultLevel: 'alert',
    claimTemplate: (p) =>
      p.valid
        ? `Custody chain continuity confirmed (${p.count || 0} entries checked).`
        : `Custody chain continuity broken at entry #${p.entryIndex || 0}.`,
    explainTemplate: (p) =>
      p.valid
        ? `All custody log entries match their cryptographic hashes in unbroken sequence.`
        : `The hash of entry #${p.entryIndex} does not match the previous hash pointer.`,
    actionTemplate: (p) =>
      p.valid
        ? `No action needed; custody ledger is intact.`
        : `Inspect custody log to locate modified records or restore from backup.`,
  },

  'C-012': {
    ruleId: 'C-012',
    title: 'Device Evidence File Hash Integrity',
    defaultLevel: 'alert',
    claimTemplate: (p) =>
      p.valid
        ? `All ${p.fileCount || 0} stored evidence files match their sealed hashes.`
        : `File "${p.fileName}" does not match its sealed SHA-256 hash.`,
    explainTemplate: (p) =>
      p.valid
        ? `Cryptographic recalculation shows every file matches its initial fingerprint.`
        : `SHA-256 recomputation shows the file data has changed since it was added to the case.`,
    actionTemplate: (p) =>
      p.valid
        ? `No action needed.`
        : `Re-import the original file or check device storage integrity.`,
  },
};
