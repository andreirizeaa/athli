-- ================================================
-- ATHLI Profile Tables Refactoring
-- ================================================
-- This migration decomposites user_profiles into:
--   - coach_profiles (for coaches)
--   - client_profiles (already exists, enhanced)
-- And removes the user_type field from user_profiles
-- ================================================

-- ================================================
-- STEP 1: Create coach_profiles table
-- ================================================

DROP TABLE IF EXISTS public.coach_profiles CASCADE;

CREATE TABLE public.coach_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  name VARCHAR(200) NOT NULL,
  profile_picture_url TEXT,
  signin_method VARCHAR(20) NOT NULL CHECK (signin_method IN ('email', 'google')) DEFAULT 'email',
  is_active BOOLEAN DEFAULT true NOT NULL,
  is_archived BOOLEAN DEFAULT false NOT NULL,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending')),
  unique_code VARCHAR(20) UNIQUE, -- Invite code for clients
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create indexes
CREATE INDEX idx_coach_profiles_email ON public.coach_profiles(email);
CREATE INDEX idx_coach_profiles_active ON public.coach_profiles(is_active);
CREATE INDEX idx_coach_profiles_unique_code ON public.coach_profiles(unique_code);

-- ================================================
-- STEP 2: Migrate coach data from user_profiles
-- ================================================

INSERT INTO public.coach_profiles (id, email, name, profile_picture_url, signin_method, is_active, created_at, updated_at)
SELECT 
  id, 
  email, 
  name, 
  profile_picture_url, 
  signin_method, 
  is_active, 
  created_at, 
  updated_at
FROM public.user_profiles
WHERE user_type = 'coach'
ON CONFLICT (id) DO NOTHING;

-- Generate unique codes for coaches who don't have one
UPDATE public.coach_profiles
SET unique_code = UPPER(SUBSTRING(MD5(id::text || NOW()::text) FOR 8))
WHERE unique_code IS NULL;

-- ================================================
-- STEP 3: Update client_profiles table
-- ================================================
-- Add email, name, profile_picture_url, signin_method columns if not present
-- The client_profiles table already exists from 003_client_and_coach_tables.sql

-- Add columns (safe - will silently fail if they exist)
DO $$
BEGIN
  -- Add email column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'client_profiles' 
                 AND column_name = 'email') THEN
    ALTER TABLE public.client_profiles ADD COLUMN email VARCHAR(255);
  END IF;

  -- Add name column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'client_profiles' 
                 AND column_name = 'name') THEN
    ALTER TABLE public.client_profiles ADD COLUMN name VARCHAR(200);
  END IF;

  -- Add profile_picture_url column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'client_profiles' 
                 AND column_name = 'profile_picture_url') THEN
    ALTER TABLE public.client_profiles ADD COLUMN profile_picture_url TEXT;
  END IF;

  -- Add signin_method column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'client_profiles' 
                 AND column_name = 'signin_method') THEN
    ALTER TABLE public.client_profiles ADD COLUMN signin_method VARCHAR(20) DEFAULT 'email';
  END IF;
END $$;

-- Populate client_profiles with data from user_profiles for existing clients
UPDATE public.client_profiles cp
SET 
  email = up.email,
  name = up.name,
  profile_picture_url = up.profile_picture_url,
  signin_method = up.signin_method
FROM public.user_profiles up
WHERE cp.client_id = up.id AND up.user_type = 'client';

-- ================================================
-- STEP 4: Enable RLS on coach_profiles
-- ================================================

ALTER TABLE public.coach_profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Coaches can read their own profile
DROP POLICY IF EXISTS "Coaches can read own profile" ON public.coach_profiles;
CREATE POLICY "Coaches can read own profile"
  ON public.coach_profiles
  FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = id);

-- Policy: Coaches can update their own profile
DROP POLICY IF EXISTS "Coaches can update own profile" ON public.coach_profiles;
CREATE POLICY "Coaches can update own profile"
  ON public.coach_profiles
  FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = id);

-- Policy: System can insert profiles
DROP POLICY IF EXISTS "System can insert coach profiles" ON public.coach_profiles;
CREATE POLICY "System can insert coach profiles"
  ON public.coach_profiles
  FOR INSERT
  WITH CHECK (true);

-- Policy: Coaches can delete their own profile
DROP POLICY IF EXISTS "Coaches can delete own profile" ON public.coach_profiles;
CREATE POLICY "Coaches can delete own profile"
  ON public.coach_profiles
  FOR DELETE
  TO authenticated
  USING ((SELECT auth.uid()) = id);

-- ================================================
-- STEP 5: Update handle_new_user trigger
-- ================================================
-- This trigger now determines where to insert based on user_type in metadata

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_user_type VARCHAR(20);
  v_signin_method VARCHAR(20);
  v_profile_picture_url TEXT;
BEGIN
  -- Determine user type from metadata
  v_user_type := COALESCE(NEW.raw_user_meta_data->>'user_type', 'coach');
  
  -- Determine signin method
  v_signin_method := public.get_signin_method(NEW.raw_user_meta_data);
  
  -- Get profile picture URL
  v_profile_picture_url := public.get_profile_picture_url(NEW.raw_user_meta_data);
  
  -- Insert into appropriate profile table based on user_type
  IF v_user_type = 'coach' THEN
    INSERT INTO public.coach_profiles (
      id,
      email,
      name,
      profile_picture_url,
      signin_method,
      is_active,
      unique_code
    ) VALUES (
      NEW.id,
      COALESCE(NEW.email, ''),
      COALESCE(NEW.raw_user_meta_data->>'name', ''),
      v_profile_picture_url,
      v_signin_method,
      true,
      UPPER(SUBSTRING(MD5(NEW.id::text || NOW()::text) FOR 8))
    );
  ELSIF v_user_type = 'client' THEN
    -- Client profiles are created via API, not trigger
    -- This handles edge cases where a client might sign up directly
    -- The coach_id would need to be set separately
    NULL;
  END IF;
  
  -- Also insert into legacy user_profiles for backward compatibility
  INSERT INTO public.user_profiles (
    id,
    user_type,
    email,
    name,
    profile_picture_url,
    signin_method,
    is_active
  ) VALUES (
    NEW.id,
    v_user_type,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    v_profile_picture_url,
    v_signin_method,
    true
  );
  
  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    -- Profile already exists, ignore
    RETURN NEW;
  WHEN OTHERS THEN
    -- Log error but don't fail the auth signup
    RAISE WARNING 'Error creating user profile: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================
-- STEP 6: Update coach_clients_view to support new profile tables
-- ================================================
-- Note: Migration 020 moved coach-client relationship data to coach_client_assignments
-- and removed those columns from client_profiles. The view joins:
-- coach_client_assignments (relationship) + client_profiles (extra data) + user_profiles or auth.users (name/email)

DROP VIEW IF EXISTS public.coach_clients_view CASCADE;

CREATE OR REPLACE VIEW public.coach_clients_view AS
SELECT
  cca.coach_id,
  cca.client_id,
  cca.category,
  cca.status,
  cca.is_active,
  cca.is_archived,
  cca.invitation_sent_at,
  cca.connected_at,
  cca.created_at,
  cca.updated_at,
  -- Client personal data from client_profiles
  cp.date_of_birth,
  cp.gender,
  cp.height_cm,
  cp.phone,
  cp.country,
  cp.city,
  cp.unit_system,
  -- Client identity from user_profiles or auth.users (fallback)
  COALESCE(cp.name, up.name, au.raw_user_meta_data->>'name', au.email) AS full_name,
  COALESCE(cp.email, up.email, au.email) AS email,
  COALESCE(cp.profile_picture_url, up.profile_picture_url, au.raw_user_meta_data->>'avatar_url') AS avatar_url,
  -- Training summary
  cts.last_activity,
  cts.last_7_days_training_completed,
  cts.last_7_days_training_total,
  cts.last_30_days_training_completed,
  cts.last_30_days_training_total
FROM public.coach_client_assignments cca
LEFT JOIN public.client_profiles cp ON cp.client_id = cca.client_id
LEFT JOIN public.user_profiles up ON up.id = cca.client_id
LEFT JOIN auth.users au ON au.id = cca.client_id
LEFT JOIN public.client_training_summary cts ON cts.client_id = cca.client_id;

-- ================================================
-- STEP 7: Grant permissions
-- ================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON public.coach_profiles TO authenticated;
GRANT SELECT ON public.coach_profiles TO anon;

-- ================================================
-- STEP 8: Create updated_at trigger for coach_profiles
-- ================================================

DROP TRIGGER IF EXISTS update_coach_profiles_updated_at ON public.coach_profiles;
CREATE TRIGGER update_coach_profiles_updated_at
  BEFORE UPDATE ON public.coach_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ================================================
-- Migration Complete
-- ================================================
-- Note: user_profiles table is kept for backward compatibility
-- Future migrations can deprecate it once all code is updated
-- ================================================
