import { distance } from 'fastest-levenshtein';
import { Finding, DerivedItem, CustodyEntry, CaseDetails } from '../core/types';
import { StoredEvidenceFile } from '../storage/db';
import { RULE_TEMPLATES } from './templates';

export function runForensicChecks(
  files: StoredEvidenceFile[],
  items: DerivedItem[],
  details: CaseDetails,
  log: CustodyEntry[]
): Finding[] {
  const findings: Finding[] = [];

  // Helper to build finding from template
  function addFinding(
    ruleId: string,
    params: Record<string, unknown>,
    evidence: Array<{ file: string; where?: string }>,
    levelOverride?: 'ok' | 'info' | 'warn' | 'alert'
  ) {
    const tpl = RULE_TEMPLATES[ruleId];
    if (!tpl) return;
    findings.push({
      id: `f-${ruleId}-${findings.length + 1}`,
      ruleId,
      level: levelOverride || tpl.defaultLevel,
      claim: tpl.claimTemplate(params),
      explain: tpl.explainTemplate(params),
      action: tpl.actionTemplate(params),
      evidence,
      params,
    });
  }

  // --- C-001: Timestamp Sequence Inversion ---
  const sourceGroups: Record<string, DerivedItem[]> = {};
  for (const it of items) {
    const key = it.sourceRef.fileName;
    if (!sourceGroups[key]) sourceGroups[key] = [];
    sourceGroups[key].push(it);
  }

  for (const [fileName, groupItems] of Object.entries(sourceGroups)) {
    for (let i = 1; i < groupItems.length; i++) {
      const prev = groupItems[i - 1];
      const curr = groupItems[i];
      if (prev.ts && curr.ts && curr.ts < prev.ts) {
        addFinding(
          'C-001',
          { earlierTime: curr.ts, laterTime: prev.ts },
          [
            { file: fileName, where: `Line ${curr.sourceRef.line || i + 1}` },
            { file: fileName, where: `Line ${prev.sourceRef.line || i}` },
          ]
        );
        break; // Report once per file to avoid flooding
      }
    }
  }

  // --- C-002: Deleted Messages ---
  const deletedItems = items.filter((it) => it.flags?.includes('deleted'));
  if (deletedItems.length > 0) {
    addFinding(
      'C-002',
      { count: deletedItems.length },
      deletedItems.slice(0, 3).map((d) => ({
        file: d.sourceRef.fileName,
        where: `Line ${d.sourceRef.line || '?'}`,
      }))
    );
  }

  // --- C-003: Edited Messages ---
  const editedItems = items.filter((it) => it.flags?.includes('edited'));
  if (editedItems.length > 0) {
    addFinding(
      'C-003',
      { count: editedItems.length },
      editedItems.slice(0, 3).map((e) => ({
        file: e.sourceRef.fileName,
        where: `Line ${e.sourceRef.line || '?'}`,
      }))
    );
  }

  // --- C-004: Missing Attachments ---
  const missingAttachments: DerivedItem[] = [];

  for (const it of items) {
    if (it.attachment?.name) {
      const attachName = it.attachment.name.toLowerCase();
      const exists = files.some(
        (f) =>
          f.name.toLowerCase() === attachName ||
          f.name.toLowerCase().includes(attachName) ||
          attachName.includes(f.name.toLowerCase())
      );
      if (!exists) {
        missingAttachments.push(it);
      }
    }
  }

  if (missingAttachments.length > 0) {
    for (const m of missingAttachments) {
      addFinding(
        'C-004',
        { fileName: m.attachment?.name },
        [{ file: m.sourceRef.fileName, where: `Line ${m.sourceRef.line || '?'}` }]
      );
    }
  }

  // --- C-005: Sender Name Inconsistency (Levenshtein) ---
  const senders = Array.from(
    new Set(items.map((i) => i.sender?.trim()).filter((s): s is string => !!s && s.length >= 3))
  );

  for (let i = 0; i < senders.length; i++) {
    for (let j = i + 1; j < senders.length; j++) {
      const s1 = senders[i];
      const s2 = senders[j];
      const d = distance(s1.toLowerCase(), s2.toLowerCase());
      if (d > 0 && d <= 2) {
        addFinding('C-005', { nameA: s1, nameB: s2, distance: d }, [
          { file: 'WhatsApp export', where: `Senders "${s1}" and "${s2}"` },
        ]);
      }
    }
  }

  // --- C-006: Duplicate Items ---
  const seenHashes = new Set<string>();
  for (const f of files) {
    if (seenHashes.has(f.sha256)) {
      addFinding('C-006', { item: f.name }, [{ file: f.name }]);
    }
    seenHashes.add(f.sha256);
  }

  // --- C-009: Unconfirmed Helper Items ---
  const unconfirmed = items.filter((it) => !it.confirmed);
  if (unconfirmed.length > 0) {
    addFinding(
      'C-009',
      { count: unconfirmed.length },
      unconfirmed.slice(0, 3).map((u) => ({
        file: u.sourceRef.fileName,
        where: `Line ${u.sourceRef.line || '?'}`,
      }))
    );
  }

  // --- C-010: Incomplete Case Details / Respondent ---
  const respondentName = details.respondent?.name?.trim();
  if (!respondentName) {
    addFinding('C-010', {}, [{ file: 'README.md', where: 'Respondent Section' }]);
  }

  // --- C-011: Custody Continuity ---
  if (log.length > 0) {
    let brokenIndex = -1;
    for (let i = 1; i < log.length; i++) {
      if (log[i].prevHash !== log[i - 1].entryHash) {
        brokenIndex = i;
        break;
      }
    }

    if (brokenIndex !== -1) {
      addFinding(
        'C-011',
        { valid: false, entryIndex: brokenIndex },
        [{ file: 'custody.log', where: `Entry #${brokenIndex}` }],
        'alert'
      );
    } else {
      addFinding(
        'C-011',
        { valid: true, count: log.length },
        [{ file: 'custody.log', where: `All ${log.length} entries` }],
        'ok'
      );
    }
  }

  // --- C-012: Device File Hash Integrity ---
  if (files.length > 0) {
    const corruptFile = files.find((f) => !f.sha256 || f.sha256.length !== 64);
    if (corruptFile) {
      addFinding(
        'C-012',
        { valid: false, fileName: corruptFile.name },
        [{ file: corruptFile.name }],
        'alert'
      );
    } else {
      addFinding(
        'C-012',
        { valid: true, fileCount: files.length },
        files.map((f) => ({ file: f.name })),
        'ok'
      );
    }
  }

  return findings;
}

