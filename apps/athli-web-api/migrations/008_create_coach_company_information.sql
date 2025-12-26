-- ================================================
-- ATHLI Coach Company Information: Profile & Branding
-- ================================================

-- STEP 1: Drop current objects if they exist (Idempotency)
DROP TABLE IF EXISTS public.coach_company_information CASCADE;

-- STEP 2: Create coach_company_information table
CREATE TABLE public.coach_company_information (
  id           UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id     UUID NOT NULL UNIQUE, -- One company profile per coach

  company_name TEXT NOT NULL,
  website      TEXT,
  linkedin     TEXT,
  location     TEXT, -- Store country name or code
  specialities JSONB NOT NULL DEFAULT '[]'::jsonb,
  logo_url     TEXT,

  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT fk_coach_company_owner
    FOREIGN KEY (coach_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- STEP 3: Indexes
-- Lookup by coach_id (already indexed by PK UNIQUE, but good for clarity)
CREATE INDEX idx_coach_company_owner ON public.coach_company_information(coach_id);

-- STEP 4: Enable RLS
ALTER TABLE public.coach_company_information ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coach_company_information FORCE ROW LEVEL SECURITY;

-- STEP 5: RLS Policies for Table
-- Public read access for everyone
CREATE POLICY cci_select_public
  ON public.coach_company_information
  FOR SELECT
  TO public
  USING (true);

-- Authenticated coaches can manage their own data
CREATE POLICY cci_insert
  ON public.coach_company_information
  FOR INSERT
  TO authenticated
  WITH CHECK (coach_id = (select auth.uid()));

CREATE POLICY cci_update
  ON public.coach_company_information
  FOR UPDATE
  TO authenticated
  USING (coach_id = (select auth.uid()))
  WITH CHECK (coach_id = (select auth.uid()));

CREATE POLICY cci_delete
  ON public.coach_company_information
  FOR DELETE
  TO authenticated
  USING (coach_id = (select auth.uid()));

-- STEP 6: Triggers
-- Automated updated_at timestamp refinement
CREATE TRIGGER trg_coach_company_updated_at
  BEFORE UPDATE ON public.coach_company_information
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- STEP 7: Storage Policies for 'coach-company' bucket
-- ================================================
-- Assumes bucket 'coach-company' is created via setup-company.md

-- Drop policies if they exist (Idempotency)
DROP POLICY IF EXISTS "Public company logos are viewable by anyone" ON storage.objects;
DROP POLICY IF EXISTS "Coaches can upload company logo" ON storage.objects;
DROP POLICY IF EXISTS "Coaches can update company logo" ON storage.objects;
DROP POLICY IF EXISTS "Coaches can delete company logo" ON storage.objects;

-- Policy 1: Public access to view company logos
CREATE POLICY "Public company logos are viewable by anyone"
ON storage.objects FOR SELECT
USING (bucket_id = 'coach-company');

-- Policy 2: Coaches can upload their own logo
-- Files should be stored as: coach-company/{coach_id}/{filename}
CREATE POLICY "Coaches can upload company logo"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'coach-company' AND
  (select auth.uid())::text = (storage.foldername(name))[1]
);

-- Policy 3: Coaches can update their own logo
CREATE POLICY "Coaches can update company logo"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'coach-company' AND
  (select auth.uid())::text = (storage.foldername(name))[1]
);

-- Policy 4: Coaches can delete their own logo
CREATE POLICY "Coaches can delete company logo"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'coach-company' AND
  (select auth.uid())::text = (storage.foldername(name))[1]
);
