-- ================================================
-- ATHLI Fix Auth Trigger for Mobile Sign-In
-- ================================================
-- This migration fixes the handle_new_user() trigger to prevent
-- automatic profile creation when users sign in on mobile apps
-- without going through the web signup flow.
--
-- Key Change:
-- - Removes the default 'coach' fallback for user_type
-- - Only creates profiles when user_type is explicitly set in metadata
-- - Preserves web app signup flow (which sets user_type explicitly)
-- ================================================

-- ================================================
-- STEP 1: Update handle_new_user trigger function
-- ================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_user_type VARCHAR(20);
  v_signin_method VARCHAR(20);
  v_profile_picture_url TEXT;
BEGIN
  -- Get user type from metadata (NO DEFAULT FALLBACK)
  -- This ensures profiles are only created when explicitly requested via web signup
  v_user_type := NEW.raw_user_meta_data->>'user_type';

  -- If user_type is not set, don't create any profile
  -- This prevents auto-creation for mobile sign-ins where user hasn't signed up via web
  IF v_user_type IS NULL THEN
    RAISE NOTICE 'Skipping profile creation - no user_type in metadata for user: %', NEW.id;
    RETURN NEW;
  END IF;

  -- Validate user_type
  IF v_user_type NOT IN ('coach', 'client') THEN
    RAISE WARNING 'Invalid user_type in metadata: %. Skipping profile creation for user: %', v_user_type, NEW.id;
    RETURN NEW;
  END IF;

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
      UPPER(SUBSTRING(MD5(NEW.id::text || NOW()::text) FOR 14))
    );

    RAISE NOTICE 'Created coach profile for user: %', NEW.id;

  ELSIF v_user_type = 'client' THEN
    -- Client profiles are typically created via API with coach_id
    -- This handles edge cases where a client might sign up directly
    -- Note: coach_id would need to be set separately via API
    RAISE NOTICE 'Client user_type detected for user: %. Client profiles should be created via API.', NEW.id;
    -- We don't auto-create client profiles here as they require a coach_id
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
    RAISE NOTICE 'Profile already exists for user: %', NEW.id;
    RETURN NEW;
  WHEN OTHERS THEN
    -- Log error but don't fail the auth signup
    RAISE WARNING 'Error creating user profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================
-- STEP 2: Add comment explaining the behavior
-- ================================================
COMMENT ON FUNCTION public.handle_new_user() IS
'Automatically creates user profiles (coach_profiles/client_profiles) when user_type is explicitly set in raw_user_meta_data.
Web signup flow sets user_type explicitly. Mobile sign-in without prior signup will skip profile creation,
allowing the mobile app to show "No Account Found" message.';

-- ================================================
-- Migration Complete
-- ================================================
-- Expected Behavior After Migration:
--
-- Web App Signup (Coach):
--   1. POST /api/v1/auth/coach/register with user_metadata.user_type = 'coach'
--   2. Trigger creates coach_profiles entry ✓
--   3. User can sign in on web and mobile ✓
--
-- Web App Signup (Google):
--   1. POST /api/v1/auth/coach/google with user_metadata.user_type = 'coach'
--   2. Trigger creates coach_profiles entry ✓
--   3. User can sign in on web and mobile ✓
--
-- Mobile App Sign-In (Without Prior Signup):
--   1. User signs in with Google (no user_metadata.user_type set)
--   2. auth.users entry created, but NO profile created ✓
--   3. Mobile app validation finds no profile ✓
--   4. Shows "No Account Found" message ✓
-- ================================================
