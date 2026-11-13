import { describe, it, expect } from 'vitest';
import { runForensicChecks } from '../src/checks/rules';
import { DerivedItem, CustodyEntry, CaseDetails } from '../src/core/types';

describe('Forensic Consistency Checker (Rules C-001 to C-012)', () => {
  const dummyDetails: CaseDetails = {
    name: 'Priya Sharma',
    parentage: 'D/o R. Sharma',
    address: 'Delhi',
    relationship: 'Self',
    respondent: { name: 'Rahul V', address: 'Delhi', relationship: 'Colleague' },
    deponent: { name: 'Priya Sharma', address: 'Delhi', relationship: 'Self' },
    period: { start: '2026-08-01', end: '2026-08-15' },
    device: { model: 'OnePlus 11', os: 'Android 14', custodian: 'Priya Sharma' },
  };

  it('detects C-001 timestamp inversion', () => {
    const items: DerivedItem[] = [
      {
        id: '1',
        ts: '2026-08-10T10:00:00',
        text: 'Hello',
        sourceRef: { fileId: 'f1', fileName: 'chat.txt', line: 1 },
        confirmed: true,
      },
      {
        id: '2',
        ts: '2026-08-10T09:30:00', // Earlier time after later time!
        text: 'Previous message out of order',
        sourceRef: { fileId: 'f1', fileName: 'chat.txt', line: 2 },
        confirmed: true,
      },
    ];

    const findings = runForensicChecks([], items, dummyDetails, []);
    const f = findings.find((x) => x.ruleId === 'C-001');
    expect(f).toBeDefined();
    expect(f?.level).toBe('alert');
  });

  it('detects C-002 deleted message markers', () => {
    const items: DerivedItem[] = [
      {
        id: '1',
        ts: '2026-08-10T10:00:00',
        text: 'This message was deleted',
        flags: ['deleted'],
        sourceRef: { fileId: 'f1', fileName: 'chat.txt', line: 1 },
        confirmed: true,
      },
    ];

    const findings = runForensicChecks([], items, dummyDetails, []);
    const f = findings.find((x) => x.ruleId === 'C-002');
    expect(f).toBeDefined();
  });

  it('detects C-003 edited message markers', () => {
    const items: DerivedItem[] = [
      {
        id: '1',
        ts: '2026-08-10T10:00:00',
        text: 'Meet me at noon',
        flags: ['edited'],
        sourceRef: { fileId: 'f1', fileName: 'chat.txt', line: 1 },
        confirmed: true,
      },
    ];

    const findings = runForensicChecks([], items, dummyDetails, []);
    const f = findings.find((x) => x.ruleId === 'C-003');
    expect(f).toBeDefined();
  });

  it('detects C-004 missing attachments', () => {
    const items: DerivedItem[] = [
      {
        id: '1',
        ts: '2026-08-10T10:00:00',
        text: 'audio_threat.opus',
        attachment: { name: 'audio_threat.opus', omitted: false },
        sourceRef: { fileId: 'f1', fileName: 'chat.txt', line: 1 },
        confirmed: true,
      },
    ];

    const findings = runForensicChecks([], items, dummyDetails, []);
    const f = findings.find((x) => x.ruleId === 'C-004');
    expect(f).toBeDefined();
    expect(f?.explain).toContain('audio_threat.opus');
  });

  it('detects C-005 sender name inconsistency using Levenshtein distance', () => {
    const items: DerivedItem[] = [
      {
        id: '1',
        ts: '2026-08-10T10:00:00',
        sender: 'Rahul Verma',
        text: 'Hello',
        sourceRef: { fileId: 'f1', fileName: 'chat.txt', line: 1 },
        confirmed: true,
      },
      {
        id: '2',
        ts: '2026-08-10T10:05:00',
        sender: 'Rahull Verma', // 1 typo distance
        text: 'Are you there?',
        sourceRef: { fileId: 'f1', fileName: 'chat.txt', line: 2 },
        confirmed: true,
      },
    ];

    const findings = runForensicChecks([], items, dummyDetails, []);
    const f = findings.find((x) => x.ruleId === 'C-005');
    expect(f).toBeDefined();
  });

  it('detects C-010 missing respondent details', () => {
    const emptyRespondentDetails: CaseDetails = {
      ...dummyDetails,
      respondent: { name: '', address: '', relationship: '' },
    };

    const findings = runForensicChecks([], [], emptyRespondentDetails, []);
    const f = findings.find((x) => x.ruleId === 'C-010');
    expect(f).toBeDefined();
  });

  it('validates C-011 custody chain continuity', () => {
    const validLog: CustodyEntry[] = [
      {
        index: 0,
        time: '2026-08-10T10:00:00.000Z',
        action: 'CASE_CREATED',
        fileId: null,
        details: {},
        prevHash: '0000000000000000000000000000000000000000000000000000000000000000',
        entryHash: 'b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9',
      },
    ];

    const findings = runForensicChecks([], [], dummyDetails, validLog);
    const f = findings.find((x) => x.ruleId === 'C-011');
    expect(f).toBeDefined();
  });
});

