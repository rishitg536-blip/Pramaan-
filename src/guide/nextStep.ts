import { CaseDetails, SealSnapshot, DerivedItem } from '../core/types';
import { StoredEvidenceFile } from '../storage/db';

export interface NextStepRecommendation {
  stepNumber: number;
  title: string;
  actionText: string;
  targetSection: string;
  reason: string;
}

export function determineNextStep(
  files: StoredEvidenceFile[],
  details: CaseDetails,
  items: DerivedItem[],
  latestSeal: SealSnapshot | null,
  isTimestamped: boolean
): NextStepRecommendation {
  // Step 1: Add evidence
  if (files.length === 0) {
    return {
      stepNumber: 1,
      title: 'Collect Evidence Files',
      actionText: 'Add chats, screenshots, or voice notes in the Evidence section.',
      targetSection: 'evidence-section',
      reason: 'Pramaan needs your evidence files to calculate cryptographic SHA-256 fingerprints.',
    };
  }

  // Step 2: Respondent details
  if (!details.respondent?.name?.trim()) {
    return {
      stepNumber: 2,
      title: 'Identify the Respondent',
      actionText: 'Fill in the respondent name or online handle in the README.md editor.',
      targetSection: 'editor-section',
      reason: 'Section 63(4) Part A schedule drafts require naming the person or account involved.',
    };
  }

  // Step 3: Build & review timeline
  const unconfirmed = items.filter((it) => !it.confirmed);
  if (items.length === 0) {
    return {
      stepNumber: 3,
      title: 'Build Evidence Timeline',
      actionText: 'Click "MERGE & BUILD TIMELINE" in the Timeline section.',
      targetSection: 'section-timeline',
      reason: 'Parse chat records and align chronological evidence into a coherent sequence.',
    };
  }

  if (unconfirmed.length > 0) {
    return {
      stepNumber: 3,
      title: 'Review Timeline Items',
      actionText: `Review and confirm ${unconfirmed.length} item(s) in the Timeline.`,
      targetSection: 'section-timeline',
      reason: 'Automated helpers (OCR / parsing) should be confirmed by you before sealing.',
    };
  }

  // Step 4: Seal case
  if (!latestSeal) {
    return {
      stepNumber: 4,
      title: 'Calculate Cryptographic Seal',
      actionText: 'Click "CALCULATE SEAL & DERIVE FINGERPRINT" in the Seal section.',
      targetSection: 'seal-section',
      reason: 'Creates the Merkle tree root and tamper-evident case fingerprint.',
    };
  }

  // Step 5: Public Timestamp
  if (!isTimestamped) {
    return {
      stepNumber: 5,
      title: 'Anchor Public Timestamp',
      actionText: 'Submit case fingerprint to the public timestamp service in the Seal section.',
      targetSection: 'seal-section',
      reason: 'Proves the case fingerprint existed at a verifiable point in time on the public ledger.',
    };
  }

  // Step 6: Export & Review
  return {
    stepNumber: 6,
    title: 'Download Draft Certificate & Annex',
    actionText: 'Download the Section 63(4) draft PDF and Technical Annex for your legal counsel.',
    targetSection: 'seal-section',
    reason: 'Your evidence is fingerprinted, chained, and anchored. Provide these drafts to an expert or lawyer.',
  };
}

