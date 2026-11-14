import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface Profile {
  id: string;
  email: string;
  full_name?: string;
  account_type: 'individual' | 'organisation';
  created_at?: string;
  updated_at?: string;
}

export interface Organization {
  id: string;
  name: string;
  org_type: string;
  org_type_details?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface CaseRecord {
  id: string;
  organization_id?: string | null;
  created_by: string;
  case_name: string;
  case_reference: string;
  owner_name: string;
  incident_start_date?: string | null;
  incident_end_date?: string | null;
  case_description?: string | null;
  relationship_to_device?: string | null;
  parentage?: string | null;
  address?: string | null;
  lawyer_notes?: string | null;
  assigned_lawyer?: string | null;
  device_info?: Record<string, unknown>;
  status: 'draft' | 'active' | 'archived';
  created_at: string;
  updated_at: string;
  evidence_count?: number;
  last_fingerprint_status?: string;
}

const envObj = (typeof import.meta !== 'undefined' && (import.meta as any).env) || {};
const supabaseUrl: string = envObj.VITE_SUPABASE_URL || '';
const supabaseAnonKey: string = envObj.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = (): boolean => {
  return Boolean(
    supabaseUrl &&
    supabaseAnonKey &&
    !supabaseUrl.includes('your_supabase_project_url') &&
    !supabaseAnonKey.includes('your_supabase_anon_key')
  );
};

// Create client if configured, otherwise null
export const supabase: SupabaseClient | null = isSupabaseConfigured()
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

// ============================================================================
// LOCAL / DEMO SESSION SIMULATION FOR TEST & PREVIEW ENVIRONMENTS
// ============================================================================
// ============================================================================
// UNIVERSAL STORAGE HELPER (BROWSER & NODE / TEST COMPATIBLE)
// ============================================================================
const memoryStore = new Map<string, string>();

export const safeStorage = {
  getItem: (key: string): string | null => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(key);
      }
      return memoryStore.get(key) ?? null;
    } catch {
      return memoryStore.get(key) ?? null;
    }
  },
  setItem: (key: string, value: string): void => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, value);
      }
      memoryStore.set(key, value);
    } catch {
      memoryStore.set(key, value);
    }
  },
  removeItem: (key: string): void => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
      }
      memoryStore.delete(key);
    } catch {
      memoryStore.delete(key);
    }
  },
  clear: (): void => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.clear();
      }
      memoryStore.clear();
    } catch {
      memoryStore.clear();
    }
  },
};

// When Supabase credentials are not yet deployed in .env, we provide a secure,
// persistent in-memory/localStorage layer so full law-firm multi-user flows
// can be tested and demonstrated cleanly without network failures.

const DEMO_USERS_KEY = 'pramaan_cloud_users';
const DEMO_SESSION_KEY = 'pramaan_cloud_session';
const DEMO_ORGS_KEY = 'pramaan_cloud_orgs';
const DEMO_CASES_KEY = 'pramaan_cloud_cases';
const DEMO_AUDIT_KEY = 'pramaan_cloud_audit';

export interface AuthUser {
  id: string;
  email?: string;
  fullName?: string;
  accountType?: 'individual' | 'organisation';
  orgId?: string;
  orgName?: string;
  orgType?: string;
  orgTypeDetails?: string;
  user_metadata?: Record<string, any>;
  [key: string]: any;
}

export type DemoUser = AuthUser & {
  passwordHash: string;
};

function getDemoUsers(): DemoUser[] {
  try {
    const raw = safeStorage.getItem(DEMO_USERS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveDemoUsers(users: DemoUser[]) {
  try {
    safeStorage.setItem(DEMO_USERS_KEY, JSON.stringify(users));
  } catch {
    // ignore
  }
}

export function getDemoSession(): { user: DemoUser | null } {
  try {
    const raw = safeStorage.getItem(DEMO_SESSION_KEY);
    return raw ? JSON.parse(raw) : { user: null };
  } catch {
    return { user: null };
  }
}

function setDemoSession(user: DemoUser | null) {
  try {
    if (user) {
      safeStorage.setItem(DEMO_SESSION_KEY, JSON.stringify({ user }));
    } else {
      safeStorage.removeItem(DEMO_SESSION_KEY);
    }
  } catch {
    // ignore
  }
}

// ============================================================================
// AUTHENTICATION API
// ============================================================================

export interface SignUpParams {
  email: string;
  password: string;
  fullName: string;
  accountType: 'individual' | 'organisation';
  organizationName?: string;
  organizationType?: string;
  organizationTypeDetails?: string;
}

export async function signIn(email: string, password: string): Promise<{ user: AuthUser | null; error: Error | null }> {
  const cleanEmail = email.trim().toLowerCase();

  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password,
    });
    if (error) return { user: null, error };
    return { user: data.user as unknown as AuthUser, error: null };
  }

  // Demo / local fallback auth
  const users = getDemoUsers();
  const matched = users.find((u) => u.email === cleanEmail && u.passwordHash === btoa(password));
  if (!matched) {
    return { user: null, error: new Error('Invalid email or password. Please check your credentials.') };
  }
  setDemoSession(matched);
  await logAuditEvent('AUTH_SIGN_IN', 'user', matched.id, { email: matched.email });
  return { user: matched, error: null };
}

export async function signUp(params: SignUpParams): Promise<{ user: AuthUser | null; error: Error | null }> {
  const cleanEmail = params.email.trim().toLowerCase();

  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password: params.password,
      options: {
        data: {
          full_name: params.fullName,
          account_type: params.accountType,
          organization_name: params.organizationName,
          organization_type: params.organizationType,
        },
      },
    });

    if (error) return { user: null, error };

    // Record organization if organization account
    if (data.user && params.accountType === 'organisation' && params.organizationName) {
      try {
        const { data: orgData, error: orgErr } = await supabase
          .from('organizations')
          .insert({
            name: params.organizationName,
            org_type: params.organizationType || 'Law firm',
            org_type_details: params.organizationTypeDetails || null,
            created_by: data.user.id,
          })
          .select()
          .single();

        if (orgData && !orgErr) {
          await supabase.from('organization_members').insert({
            organization_id: orgData.id,
            user_id: data.user.id,
            role: 'admin',
          });
        }
      } catch (e) {
        console.warn('Could not auto-create organization record:', e);
      }
    }

    return { user: data.user as unknown as AuthUser, error: null };
  }

  // Demo / local storage signup
  const users = getDemoUsers();
  if (users.some((u) => u.email === cleanEmail)) {
    return { user: null, error: new Error('An account with this email already exists.') };
  }

  const userId = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const orgId = params.accountType === 'organisation' ? `org_${Date.now()}_${Math.random().toString(36).substring(2, 7)}` : undefined;

  const newUser: DemoUser = {
    id: userId,
    email: cleanEmail,
    passwordHash: btoa(params.password),
    fullName: params.fullName,
    accountType: params.accountType,
    orgId,
    orgName: params.organizationName,
    orgType: params.organizationType,
    orgTypeDetails: params.organizationTypeDetails,
  };

  users.push(newUser);
  saveDemoUsers(users);
  setDemoSession(newUser);

  // If organization, save org record
  if (params.accountType === 'organisation' && orgId && params.organizationName) {
    try {
      const orgsRaw = safeStorage.getItem(DEMO_ORGS_KEY);
      const orgs: Organization[] = orgsRaw ? JSON.parse(orgsRaw) : [];
      orgs.push({
        id: orgId,
        name: params.organizationName,
        org_type: params.organizationType || 'Law firm',
        org_type_details: params.organizationTypeDetails,
        created_by: userId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      safeStorage.setItem(DEMO_ORGS_KEY, JSON.stringify(orgs));
    } catch {
      // ignore
    }
  }

  await logAuditEvent('AUTH_SIGN_UP', 'user', userId, {
    email: cleanEmail,
    accountType: params.accountType,
    orgId,
  });

  return { user: newUser, error: null };
}

export async function signOut(): Promise<void> {
  if (isSupabaseConfigured() && supabase) {
    await supabase.auth.signOut();
  }
  setDemoSession(null);
  safeStorage.removeItem('pramaan_intake_completed');
}

export async function resetPassword(email: string): Promise<{ success: boolean; error: Error | null }> {
  const cleanEmail = email.trim().toLowerCase();
  if (isSupabaseConfigured() && supabase) {
    const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail);
    if (error) return { success: false, error };
    return { success: true, error: null };
  }

  // Demo fallback
  const users = getDemoUsers();
  const exists = users.some((u) => u.email === cleanEmail);
  if (!exists) {
    return { success: false, error: new Error('No account found with this email address.') };
  }
  return { success: true, error: null };
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  if (isSupabaseConfigured() && supabase) {
    const { data } = await supabase.auth.getUser();
    return data.user as unknown as AuthUser;
  }
  const session = getDemoSession();
  return session.user;
}

// ============================================================================
// CASES & ORGANIZATIONS DATA API
// ============================================================================

export async function fetchUserCases(userId: string, orgId?: string | null): Promise<CaseRecord[]> {
  if (isSupabaseConfigured() && supabase) {
    let query = supabase.from('cases').select('*').order('updated_at', { ascending: false });
    if (orgId) {
      query = query.eq('organization_id', orgId);
    } else {
      query = query.or(`created_by.eq.${userId},organization_id.is.null`);
    }
    const { data, error } = await query;
    if (error) throw error;
    return data as CaseRecord[];
  }

  // Demo / local fallback
  try {
    const raw = safeStorage.getItem(DEMO_CASES_KEY);
    const all: CaseRecord[] = raw ? JSON.parse(raw) : [];
    if (orgId) {
      return all.filter((c) => c.organization_id === orgId);
    }
    return all.filter((c) => c.created_by === userId || !c.organization_id);
  } catch {
    return [];
  }
}

export async function createCaseRecord(caseData: Omit<CaseRecord, 'id' | 'created_at' | 'updated_at'>): Promise<CaseRecord> {
  const now = new Date().toISOString();

  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase
      .from('cases')
      .insert({
        ...caseData,
        created_at: now,
        updated_at: now,
      })
      .select()
      .single();

    if (error) throw error;
    await logAuditEvent('CASE_CREATE', 'case', data.id, { case_name: data.case_name });
    return data as CaseRecord;
  }

  // Demo fallback
  const id = `case_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const record: CaseRecord = {
    ...caseData,
    id,
    created_at: now,
    updated_at: now,
    evidence_count: 0,
    last_fingerprint_status: 'Unsealed',
  };

  try {
    const raw = safeStorage.getItem(DEMO_CASES_KEY);
    const all: CaseRecord[] = raw ? JSON.parse(raw) : [];
    all.unshift(record);
    safeStorage.setItem(DEMO_CASES_KEY, JSON.stringify(all));
  } catch {
    // ignore
  }

  await logAuditEvent('CASE_CREATE', 'case', id, { case_name: record.case_name });
  return record;
}

export async function updateCaseRecord(caseId: string, updates: Partial<CaseRecord>): Promise<void> {
  const now = new Date().toISOString();

  if (isSupabaseConfigured() && supabase) {
    const { error } = await supabase
      .from('cases')
      .update({
        ...updates,
        updated_at: now,
      })
      .eq('id', caseId);

    if (error) throw error;
    await logAuditEvent('CASE_UPDATE', 'case', caseId, updates);
    return;
  }

  // Demo fallback
  try {
    const raw = safeStorage.getItem(DEMO_CASES_KEY);
    const all: CaseRecord[] = raw ? JSON.parse(raw) : [];
    const idx = all.findIndex((c) => c.id === caseId);
    if (idx !== -1) {
      all[idx] = { ...all[idx], ...updates, updated_at: now };
      safeStorage.setItem(DEMO_CASES_KEY, JSON.stringify(all));
    }
  } catch {
    // ignore
  }

  await logAuditEvent('CASE_UPDATE', 'case', caseId, updates);
}

export async function deleteCaseRecord(caseId: string): Promise<void> {
  if (isSupabaseConfigured() && supabase) {
    const { error } = await supabase
      .from('cases')
      .delete()
      .eq('id', caseId);

    if (error) throw error;
    await logAuditEvent('CASE_DELETE', 'case', caseId);
    return;
  }

  // Demo fallback
  try {
    const raw = safeStorage.getItem(DEMO_CASES_KEY);
    const all: CaseRecord[] = raw ? JSON.parse(raw) : [];
    const filtered = all.filter((c) => c.id !== caseId);
    safeStorage.setItem(DEMO_CASES_KEY, JSON.stringify(filtered));
  } catch {
    // ignore
  }

  await logAuditEvent('CASE_DELETE', 'case', caseId);
}

// ============================================================================
// AUDIT EVENT LOGGING
// ============================================================================

export async function logAuditEvent(
  action: string,
  resourceType: string,
  resourceId?: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  const user = await getCurrentUser();
  const userId = user?.id || null;
  const now = new Date().toISOString();

  if (isSupabaseConfigured() && supabase && userId) {
    try {
      await supabase.from('audit_events').insert({
        action,
        resource_type: resourceType,
        resource_id: resourceId || null,
        user_id: userId,
        metadata_json: metadata || {},
        created_at: now,
      });
    } catch (e) {
      console.warn('Failed to insert audit event in Supabase:', e);
    }
    return;
  }

  // Demo fallback
  try {
    const raw = safeStorage.getItem(DEMO_AUDIT_KEY);
    const all = raw ? JSON.parse(raw) : [];
    all.push({
      id: `audit_${Date.now()}`,
      action,
      resourceType,
      resourceId,
      userId,
      metadata,
      createdAt: now,
    });
    // Keep max 200 events
    if (all.length > 200) all.shift();
    safeStorage.setItem(DEMO_AUDIT_KEY, JSON.stringify(all));
  } catch {
    // ignore
  }
}

