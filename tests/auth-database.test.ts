import { describe, it, expect, beforeEach } from 'vitest';
import {
  signIn,
  signUp,
  fetchUserCases,
  createCaseRecord,
  deleteCaseRecord,
  resetPassword,
  logAuditEvent,
  safeStorage,
} from '../src/lib/supabase';

describe('Pramaan Law-Firm Authentication & Multi-Tenant Database', () => {
  beforeEach(() => {
    safeStorage.clear();
  });

  it('signs up an Individual user with individual account type and no organization', async () => {
    const { user, error } = await signUp({
      email: 'investigator.rahul@example.com',
      password: 'SecurePassword123!',
      fullName: 'Rahul Verma',
      accountType: 'individual',
    });

    expect(error).toBeNull();
    expect(user).toBeDefined();
    expect(user?.email).toBe('investigator.rahul@example.com');
    expect(user?.accountType).toBe('individual');
    expect(user?.orgId).toBeUndefined();
  });

  it('signs up an Organisation user with organisation profile, organisation type and admin role', async () => {
    const { user, error } = await signUp({
      email: 'managing.partner@apexlaw.in',
      password: 'FirmPassword2026!',
      fullName: 'Adv. Ananya Iyer',
      accountType: 'organisation',
      organizationName: 'Apex Legal & Cyber Forensics LLP',
      organizationType: 'Law firm',
    });

    expect(error).toBeNull();
    expect(user).toBeDefined();
    expect(user?.email).toBe('managing.partner@apexlaw.in');
    expect(user?.accountType).toBe('organisation');
    expect(user?.orgName).toBe('Apex Legal & Cyber Forensics LLP');
    expect(user?.orgType).toBe('Law firm');
    expect(user?.orgId).toBeDefined();
  });

  it('rejects duplicate email registrations', async () => {
    await signUp({
      email: 'lawyer1@chamber.org',
      password: 'Password123',
      fullName: 'Lawyer One',
      accountType: 'individual',
    });

    const res = await signUp({
      email: 'lawyer1@chamber.org',
      password: 'Password456',
      fullName: 'Lawyer One Duplicate',
      accountType: 'individual',
    });

    expect(res.error).toBeDefined();
    expect(res.error?.message).toContain('already exists');
  });

  it('authenticates user with valid credentials and rejects invalid password', async () => {
    await signUp({
      email: 'expert@forensics.org',
      password: 'CorrectPassword123',
      fullName: 'Forensic Analyst',
      accountType: 'individual',
    });

    // Wrong password
    const failRes = await signIn('expert@forensics.org', 'WrongPassword');
    expect(failRes.user).toBeNull();
    expect(failRes.error).toBeDefined();

    // Correct password
    const successRes = await signIn('expert@forensics.org', 'CorrectPassword123');
    expect(successRes.error).toBeNull();
    expect(successRes.user?.email).toBe('expert@forensics.org');
  });

  it('enforces multi-tenant isolation: Two organizations cannot access each other cases', async () => {
    // Org A
    const { user: userA } = await signUp({
      email: 'admin@firm-alpha.com',
      password: 'PassAlpha123!',
      fullName: 'Alpha Admin',
      accountType: 'organisation',
      organizationName: 'Alpha Law Associates',
      organizationType: 'Law firm',
    });

    // Org B
    const { user: userB } = await signUp({
      email: 'director@ngo-beta.org',
      password: 'PassBeta123!',
      fullName: 'Beta Director',
      accountType: 'organisation',
      organizationName: 'Beta Women Protection Network',
      organizationType: 'NGO / women’s-safety organisation',
    });

    // Create case for Org A
    const caseA = await createCaseRecord({
      organization_id: userA?.orgId,
      created_by: userA!.id,
      case_name: 'State vs Alpha Defendant',
      case_reference: 'CR-ALPHA-01',
      owner_name: 'Complainant Alpha',
      status: 'active',
    });

    // Create case for Org B
    const caseB = await createCaseRecord({
      organization_id: userB?.orgId,
      created_by: userB!.id,
      case_name: 'Inquiry Beta Evidence',
      case_reference: 'CR-BETA-02',
      owner_name: 'Victim Beta',
      status: 'active',
    });

    // Fetch cases for Org A
    const orgACases = await fetchUserCases(userA!.id, userA!.orgId);
    expect(orgACases.some((c) => c.id === caseA.id)).toBe(true);
    expect(orgACases.some((c) => c.id === caseB.id)).toBe(false);

    // Fetch cases for Org B
    const orgBCases = await fetchUserCases(userB!.id, userB!.orgId);
    expect(orgBCases.some((c) => c.id === caseB.id)).toBe(true);
    expect(orgBCases.some((c) => c.id === caseA.id)).toBe(false);
  });

  it('records audit events without storing raw passwords', async () => {
    await logAuditEvent('CASE_ACCESS', 'case', 'case_123', {
      action: 'viewed_evidence',
    });

    const rawAudit = safeStorage.getItem('pramaan_cloud_audit');
    expect(rawAudit).toBeDefined();
    expect(rawAudit).toContain('CASE_ACCESS');
    expect(rawAudit).toContain('case_123');
    expect(rawAudit).not.toContain('password');
  });

  it('resets password request flow gracefully', async () => {
    await signUp({
      email: 'attorney@chamber.in',
      password: 'OriginalPass123',
      fullName: 'Senior Counsel',
      accountType: 'individual',
    });

    const res = await resetPassword('attorney@chamber.in');
    expect(res.success).toBe(true);
    expect(res.error).toBeNull();
  });

  it('deletes a case record and removes it from accessible case list', async () => {
    const { user } = await signUp({
      email: 'investigator.del@example.com',
      password: 'PassToDelete123!',
      fullName: 'Forensic Lead',
      accountType: 'individual',
    });

    const caseItem = await createCaseRecord({
      created_by: user!.id,
      case_name: 'Obsolete Case Dossier',
      case_reference: 'CR-DEL-009',
      owner_name: 'Temporary Deponent',
      status: 'draft',
    });

    const beforeCases = await fetchUserCases(user!.id);
    expect(beforeCases.some((c) => c.id === caseItem.id)).toBe(true);

    await deleteCaseRecord(caseItem.id);

    const afterCases = await fetchUserCases(user!.id);
    expect(afterCases.some((c) => c.id === caseItem.id)).toBe(false);

    const rawAudit = safeStorage.getItem('pramaan_cloud_audit');
    expect(rawAudit).toContain('CASE_DELETE');
  });
});

