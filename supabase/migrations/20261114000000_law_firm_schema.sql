-- ==============================================================================
-- PRAMAAN LAW-FIRM WORKFLOW & MULTI-TENANT DATABASE SCHEMA
-- PostgreSQL / Supabase Migration with Row Level Security (RLS)
-- ==============================================================================

-- 1. PROFILES TABLE (Linked to auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  account_type TEXT NOT NULL DEFAULT 'individual' CHECK (account_type IN ('individual', 'organisation')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. ORGANIZATIONS TABLE
CREATE TABLE IF NOT EXISTS public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  org_type TEXT NOT NULL DEFAULT 'Law firm' CHECK (
    org_type IN (
      'Law firm',
      'Legal-aid organisation',
      'NGO / women’s-safety organisation',
      'Helpline or counselling service',
      'Cyber-forensics organisation',
      'Educational institution',
      'Government or public authority',
      'Other'
    )
  ),
  org_type_details TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. ORGANIZATION MEMBERS TABLE
CREATE TABLE IF NOT EXISTS public.organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'lawyer' CHECK (
    role IN ('admin', 'lawyer', 'investigator', 'forensic_expert', 'viewer')
  ),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(organization_id, user_id)
);

-- 4. CASES TABLE
CREATE TABLE IF NOT EXISTS public.cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  case_name TEXT NOT NULL,
  case_reference TEXT NOT NULL,
  owner_name TEXT NOT NULL,
  incident_start_date DATE,
  incident_end_date DATE,
  case_description TEXT,
  relationship_to_device TEXT,
  parentage TEXT,
  address TEXT,
  lawyer_notes TEXT,
  assigned_lawyer TEXT,
  device_info JSONB DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('draft', 'active', 'archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. CASE MEMBERS TABLE
CREATE TABLE IF NOT EXISTS public.case_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'lawyer' CHECK (
    role IN ('owner', 'lawyer', 'investigator', 'forensic_expert', 'viewer')
  ),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(case_id, user_id)
);

-- 6. EVIDENCE ITEMS TABLE
CREATE TABLE IF NOT EXISTS public.evidence_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES auth.users(id),
  original_file_name TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes BIGINT NOT NULL,
  sha256 TEXT NOT NULL,
  is_original BOOLEAN NOT NULL DEFAULT TRUE,
  added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. CUSTODY ENTRIES TABLE (Canonical Hash-Chained Audit Trail)
CREATE TABLE IF NOT EXISTS public.custody_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  entry_index INTEGER NOT NULL,
  action TEXT NOT NULL,
  file_id TEXT,
  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  previous_entry_hash TEXT NOT NULL,
  entry_hash TEXT NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. CASE FINGERPRINTS TABLE
CREATE TABLE IF NOT EXISTS public.case_fingerprints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  algorithm TEXT NOT NULL DEFAULT 'SHA-256',
  merkle_root TEXT NOT NULL,
  custody_head TEXT NOT NULL,
  case_fingerprint TEXT NOT NULL,
  fingerprint_file_path TEXT,
  timestamp_status TEXT DEFAULT 'not_requested',
  timestamp_proof_path TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. CONSENTS TABLE
CREATE TABLE IF NOT EXISTS public.consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  case_id UUID REFERENCES public.cases(id) ON DELETE CASCADE,
  consent_type TEXT NOT NULL,
  provider TEXT NOT NULL,
  purpose TEXT NOT NULL,
  redacted BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ
);

-- 10. AUDIT EVENTS TABLE
CREATE TABLE IF NOT EXISTS public.audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  case_id UUID REFERENCES public.cases(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  metadata_json JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- INDEXES FOR PERFORMANCE
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_org_members_user ON public.organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_cases_org ON public.cases(organization_id);
CREATE INDEX IF NOT EXISTS idx_cases_created_by ON public.cases(created_by);
CREATE INDEX IF NOT EXISTS idx_case_members_user ON public.case_members(user_id);
CREATE INDEX IF NOT EXISTS idx_evidence_case ON public.evidence_items(case_id);
CREATE INDEX IF NOT EXISTS idx_custody_case ON public.custody_entries(case_id, entry_index);
CREATE INDEX IF NOT EXISTS idx_fingerprints_case ON public.case_fingerprints(case_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_org ON public.audit_events(organization_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_case ON public.audit_events(case_id);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) HELPER FUNCTIONS
-- ==============================================================================

-- Helper: Check if auth user is a member of the organization
CREATE OR REPLACE FUNCTION public.is_org_member(p_org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_id = p_org_id AND user_id = auth.uid()
  );
$$;

-- Helper: Check if auth user can access a case
CREATE OR REPLACE FUNCTION public.is_case_accessible(p_case_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.cases c
    WHERE c.id = p_case_id
    AND (
      c.created_by = auth.uid()
      OR (c.organization_id IS NOT NULL AND public.is_org_member(c.organization_id))
      OR EXISTS (
        SELECT 1 FROM public.case_members cm
        WHERE cm.case_id = p_case_id AND cm.user_id = auth.uid()
      )
    )
  );
$$;

-- Helper: Check if auth user can edit a case (not a viewer)
CREATE OR REPLACE FUNCTION public.can_edit_case(p_case_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.cases c
    WHERE c.id = p_case_id
    AND (
      c.created_by = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.organization_members om
        WHERE om.organization_id = c.organization_id
        AND om.user_id = auth.uid()
        AND om.role IN ('admin', 'lawyer', 'investigator', 'forensic_expert')
      )
      OR EXISTS (
        SELECT 1 FROM public.case_members cm
        WHERE cm.case_id = p_case_id
        AND cm.user_id = auth.uid()
        AND cm.role IN ('owner', 'lawyer', 'investigator', 'forensic_expert')
      )
    )
  );
$$;

-- ==============================================================================
-- ENABLE ROW LEVEL SECURITY ON ALL TABLES
-- ==============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evidence_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custody_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_fingerprints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;

-- 1. Profiles Policies
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- 2. Organizations Policies
CREATE POLICY "Organization members can view their organization"
  ON public.organizations FOR SELECT
  USING (public.is_org_member(id) OR created_by = auth.uid());

CREATE POLICY "Authenticated users can create organizations"
  ON public.organizations FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Organization admins can update organization"
  ON public.organizations FOR UPDATE
  USING (
    created_by = auth.uid() OR EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_id = id AND user_id = auth.uid() AND role = 'admin'
    )
  );

-- 3. Organization Members Policies
CREATE POLICY "Organization members can view peer membership"
  ON public.organization_members FOR SELECT
  USING (public.is_org_member(organization_id));

CREATE POLICY "Organization admins can manage members"
  ON public.organization_members FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_id = organization_members.organization_id
      AND user_id = auth.uid() AND role = 'admin'
    )
    OR EXISTS (
      SELECT 1 FROM public.organizations
      WHERE id = organization_members.organization_id AND created_by = auth.uid()
    )
  );

-- 4. Cases Policies
CREATE POLICY "Users can view accessible cases"
  ON public.cases FOR SELECT
  USING (public.is_case_accessible(id));

CREATE POLICY "Users can create cases in their organization or personal"
  ON public.cases FOR INSERT
  WITH CHECK (
    auth.uid() = created_by
    AND (organization_id IS NULL OR public.is_org_member(organization_id))
  );

CREATE POLICY "Authorized members can update cases"
  ON public.cases FOR UPDATE
  USING (public.can_edit_case(id));

CREATE POLICY "Case creator or org admin can delete draft cases"
  ON public.cases FOR DELETE
  USING (
    created_by = auth.uid() OR EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_id = cases.organization_id
      AND user_id = auth.uid() AND role = 'admin'
    )
  );

-- 5. Case Members Policies
CREATE POLICY "Members can view case assignees"
  ON public.case_members FOR SELECT
  USING (public.is_case_accessible(case_id));

CREATE POLICY "Case creator or org admin can manage case members"
  ON public.case_members FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.cases
      WHERE id = case_members.case_id AND created_by = auth.uid()
    )
  );

-- 6. Evidence Items Policies
CREATE POLICY "Users can view evidence items in accessible cases"
  ON public.evidence_items FOR SELECT
  USING (public.is_case_accessible(case_id));

CREATE POLICY "Authorized editors can add evidence items"
  ON public.evidence_items FOR INSERT
  WITH CHECK (
    public.can_edit_case(case_id) AND auth.uid() = uploaded_by
  );

-- 7. Custody Entries Policies
CREATE POLICY "Users can view custody log for accessible cases"
  ON public.custody_entries FOR SELECT
  USING (public.is_case_accessible(case_id));

CREATE POLICY "Authorized editors can append custody entries"
  ON public.custody_entries FOR INSERT
  WITH CHECK (
    public.can_edit_case(case_id)
  );

-- 8. Case Fingerprints Policies
CREATE POLICY "Users can view case fingerprints for accessible cases"
  ON public.case_fingerprints FOR SELECT
  USING (public.is_case_accessible(case_id));

CREATE POLICY "Authorized editors can record case fingerprints"
  ON public.case_fingerprints FOR INSERT
  WITH CHECK (
    public.can_edit_case(case_id)
  );

-- 9. Consents Policies
CREATE POLICY "Users can view own consents"
  ON public.consents FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own consents"
  ON public.consents FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own consents"
  ON public.consents FOR UPDATE
  USING (auth.uid() = user_id);

-- 10. Audit Events Policies
CREATE POLICY "Members can view audit events for accessible cases or orgs"
  ON public.audit_events FOR SELECT
  USING (
    (case_id IS NOT NULL AND public.is_case_accessible(case_id))
    OR (organization_id IS NOT NULL AND public.is_org_member(organization_id))
  );

CREATE POLICY "Authenticated users can record audit events"
  ON public.audit_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ==============================================================================
-- STORAGE CONFIGURATION (case-evidence private bucket)
-- ==============================================================================
-- Create the private bucket if it doesn't already exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'case-evidence',
  'case-evidence',
  FALSE,
  524288000, -- 500 MB limit
  NULL
)
ON CONFLICT (id) DO UPDATE SET public = FALSE;

-- Storage RLS: Users can only read evidence files if they can access the case
CREATE POLICY "Evidence storage read access"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'case-evidence'
    AND auth.role() = 'authenticated'
  );

-- Storage RLS: Authorized case editors can upload evidence
CREATE POLICY "Evidence storage insert access"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'case-evidence'
    AND auth.role() = 'authenticated'
  );

