-- ================================================
-- ATHLI Authentication Tables Migration
-- ================================================
-- This script sets up the complete authentication system
-- including user profiles, triggers, and RLS policies
-- ================================================

-- ================================================
-- STEP 1: Drop existing tables (if any)
-- ================================================
DROP TABLE IF EXISTS public.user_profiles CASCADE;

-- ================================================
-- STEP 2: Create user_profiles table
-- ================================================
-- This table extends Supabase auth.users with additional profile information
-- Composite key: (id, user_type) to support same user being both coach and client in future
CREATE TABLE public.user_profiles (
  id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_type VARCHAR(20) NOT NULL CHECK (user_type IN ('coach', 'client')),
  email VARCHAR(255) NOT NULL,
  name VARCHAR(200) NOT NULL,
  profile_picture_url TEXT,
  signin_method VARCHAR(20) NOT NULL CHECK (signin_method IN ('email', 'google')),
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,

  -- Composite primary key to allow same user to have multiple profiles (coach + client)
  PRIMARY KEY (id, user_type)
);

-- ================================================
-- STEP 3: Create indexes for performance
-- ================================================
CREATE INDEX idx_user_profiles_id ON public.user_profiles(id);
CREATE INDEX idx_user_profiles_email ON public.user_profiles(email);
CREATE INDEX idx_user_profiles_user_type ON public.user_profiles(user_type);
CREATE INDEX idx_user_profiles_active ON public.user_profiles(is_active);

-- ================================================
-- STEP 4: Enable Row Level Security
-- ================================================
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- ================================================
-- STEP 5: Create RLS Policies
-- ================================================

-- Policy: Users can read their own profile(s)
CREATE POLICY "Users can read own profile"
  ON public.user_profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Policy: Users can update their own profile(s)
CREATE POLICY "Users can update own profile"
  ON public.user_profiles
  FOR UPDATE
  USING (auth.uid() = id);

-- Policy: Allow system to insert profiles (needed for trigger)
-- This uses SECURITY DEFINER in the function instead
CREATE POLICY "System can insert profiles"
  ON public.user_profiles
  FOR INSERT
  WITH CHECK (true);

-- Policy: Users can delete their own profile(s)
-- Note: When a profile is deleted, if it's the last profile for that user,
-- the trigger will also delete the user from auth.users
CREATE POLICY "Users can delete own profile"
  ON public.user_profiles
  FOR DELETE
  USING (auth.uid() = id);

-- ================================================
-- STEP 6: Create or replace utility functions
-- ================================================

-- Function: Update updated_at timestamp automatically
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function: Determine signin method from auth metadata
CREATE OR REPLACE FUNCTION public.get_signin_method(user_metadata jsonb)
RETURNS VARCHAR(20) AS $$
BEGIN
  -- Check if user signed in with OAuth provider
  IF user_metadata->>'provider' IS NOT NULL THEN
    RETURN user_metadata->>'provider';
  END IF;

  -- Check for Google-specific fields
  IF user_metadata->>'iss' LIKE '%google%' OR
     user_metadata->>'picture' IS NOT NULL OR
     user_metadata->>'email_verified' = 'true' THEN
    RETURN 'google';
  END IF;

  -- Default to email
  RETURN 'email';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function: Determine user type based on signup context
CREATE OR REPLACE FUNCTION public.get_user_type(user_metadata jsonb)
RETURNS VARCHAR(20) AS $$
BEGIN
  -- Check if user_type was explicitly set during signup
  IF user_metadata->>'user_type' IS NOT NULL THEN
    RETURN user_metadata->>'user_type';
  END IF;

  -- Default to 'coach' for /auth/ registration
  -- (client registration will be added later with explicit user_type)
  RETURN 'coach';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function: Get profile picture URL with fallback logic
CREATE OR REPLACE FUNCTION public.get_profile_picture_url(user_metadata jsonb)
RETURNS TEXT AS $$
BEGIN
  -- Priority 1: Custom uploaded profile picture (stored in metadata after upload)
  IF user_metadata->>'profile_picture_url' IS NOT NULL AND
     user_metadata->>'profile_picture_url' != '' THEN
    RETURN user_metadata->>'profile_picture_url';
  END IF;

  -- Priority 2: Google avatar URL
  IF user_metadata->>'avatar_url' IS NOT NULL AND
     user_metadata->>'avatar_url' != '' THEN
    RETURN user_metadata->>'avatar_url';
  END IF;

  -- Priority 3: Google picture URL (alternative field name)
  IF user_metadata->>'picture' IS NOT NULL AND
     user_metadata->>'picture' != '' THEN
    RETURN user_metadata->>'picture';
  END IF;

  -- No profile picture available
  RETURN NULL;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ================================================
-- STEP 7: Create trigger function to handle new users
-- ================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_user_type VARCHAR(20);
  v_signin_method VARCHAR(20);
  v_profile_picture_url TEXT;
BEGIN
  -- Determine user type
  v_user_type := public.get_user_type(NEW.raw_user_meta_data);

  -- Determine signin method
  v_signin_method := public.get_signin_method(NEW.raw_user_meta_data);

  -- Get profile picture URL
  v_profile_picture_url := public.get_profile_picture_url(NEW.raw_user_meta_data);

  -- Insert user profile
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
-- STEP 8: Create trigger function to sync auth.users changes to user_profiles
-- ================================================
CREATE OR REPLACE FUNCTION public.handle_user_update()
RETURNS TRIGGER AS $$
DECLARE
  v_profile_picture_url TEXT;
BEGIN
  -- Get updated profile picture URL
  v_profile_picture_url := public.get_profile_picture_url(NEW.raw_user_meta_data);

  -- Update all profiles for this user (could be both coach and client)
  UPDATE public.user_profiles
  SET
    email = COALESCE(NEW.email, email),
    name = COALESCE(NEW.raw_user_meta_data->>'name', name),
    profile_picture_url = COALESCE(v_profile_picture_url, profile_picture_url),
    updated_at = NOW()
  WHERE id = NEW.id;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the auth update
    RAISE WARNING 'Error updating user profile: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================
-- STEP 8.5: Create trigger function to delete auth user when profile is deleted
-- ================================================
-- This function deletes the user from auth.users when a profile is deleted
-- It only deletes from auth.users if this is the last remaining profile for that user
-- (since users can have multiple profiles: coach + client)
CREATE OR REPLACE FUNCTION public.handle_user_profile_delete()
RETURNS TRIGGER AS $$
DECLARE
  v_remaining_profiles INTEGER;
BEGIN
  -- Check if there are any remaining profiles for this user
  SELECT COUNT(*) INTO v_remaining_profiles
  FROM public.user_profiles
  WHERE id = OLD.id;

  -- If this was the last profile, delete the user from auth.users
  IF v_remaining_profiles = 0 THEN
    DELETE FROM auth.users
    WHERE id = OLD.id;
  END IF;

  RETURN OLD;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the profile deletion
    RAISE WARNING 'Error deleting auth user after profile deletion: %', SQLERRM;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================
-- STEP 9: Create triggers
-- ================================================

-- Trigger: Auto-update updated_at on user_profiles changes
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON public.user_profiles;
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger: Auto-create profile when new user signs up
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Trigger: Sync auth.users changes to user_profiles
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  WHEN (
    OLD.email IS DISTINCT FROM NEW.email OR
    OLD.raw_user_meta_data IS DISTINCT FROM NEW.raw_user_meta_data
  )
  EXECUTE FUNCTION public.handle_user_update();

-- Trigger: Delete auth user when profile is deleted (if last profile)
DROP TRIGGER IF EXISTS on_user_profile_deleted ON public.user_profiles;
CREATE TRIGGER on_user_profile_deleted
  AFTER DELETE ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_user_profile_delete();

-- ================================================
-- STEP 10: Grant necessary permissions
-- ================================================

-- Grant usage on schema
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;

-- Grant access to user_profiles table
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_profiles TO authenticated;
GRANT SELECT ON public.user_profiles TO anon;

-- ================================================
-- Migration Complete
-- ================================================
-- Next steps:
-- 1. Create profile-pictures storage bucket in Supabase Storage
-- 2. Configure bucket policies (see SUPABASE_AUTH_SETUP.md)
-- 3. Update frontend auth provider to use new fields
-- ================================================
