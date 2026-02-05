-- Fix get_signin_method to properly detect Apple sign-in
-- The current logic incorrectly identifies Apple users as Google users

-- Step 1: Update check constraints to allow 'apple' as a valid signin method
ALTER TABLE "public"."user_profiles"
  DROP CONSTRAINT IF EXISTS "user_profiles_signin_method_check";

ALTER TABLE "public"."user_profiles"
  ADD CONSTRAINT "user_profiles_signin_method_check"
  CHECK (signin_method::text = ANY (ARRAY['email'::character varying, 'google'::character varying, 'apple'::character varying]::text[]));

ALTER TABLE "public"."coach_profiles"
  DROP CONSTRAINT IF EXISTS "coach_profiles_signin_method_check";

ALTER TABLE "public"."coach_profiles"
  ADD CONSTRAINT "coach_profiles_signin_method_check"
  CHECK (signin_method::text = ANY (ARRAY['email'::character varying, 'google'::character varying, 'apple'::character varying]::text[]));

-- Step 2: Fix the get_signin_method function to properly detect Apple sign-ins
-- Note: This function receives raw_user_meta_data, not raw_app_meta_data
-- For OAuth detection, we need to check auth.users.raw_app_meta_data->>'provider'
-- But since this function only gets user_metadata, we rely on other indicators

CREATE OR REPLACE FUNCTION "public"."get_signin_method"("user_metadata" "jsonb")
RETURNS character varying
LANGUAGE "plpgsql" IMMUTABLE
SET "search_path" TO 'public', 'pg_temp'
AS $$
BEGIN
  -- Check if provider is explicitly set in user_metadata (sometimes set)
  IF user_metadata->>'provider' IS NOT NULL THEN
    RETURN user_metadata->>'provider';
  END IF;

  -- Check issuer (iss) field - most reliable for OAuth providers
  -- Apple: https://appleid.apple.com
  -- Google: https://accounts.google.com
  IF user_metadata->>'iss' IS NOT NULL THEN
    IF user_metadata->>'iss' LIKE '%appleid.apple.com%' THEN
      RETURN 'apple';
    ELSIF user_metadata->>'iss' LIKE '%accounts.google.com%' OR user_metadata->>'iss' LIKE '%google%' THEN
      RETURN 'google';
    END IF;
  END IF;

  -- Check for Apple private relay email (reliable Apple indicator)
  IF user_metadata->>'email' LIKE '%@privaterelay.appleid.com' THEN
    RETURN 'apple';
  END IF;

  -- Check for Google-specific indicators
  IF user_metadata->>'picture' IS NOT NULL AND
     user_metadata->>'picture' LIKE '%googleusercontent.com%' THEN
    RETURN 'google';
  END IF;

  -- Default to email for everything else
  RETURN 'email';
END;
$$;

ALTER FUNCTION "public"."get_signin_method"("user_metadata" "jsonb") OWNER TO "postgres";

-- Step 3: Update existing records that were incorrectly set to 'google'
-- This will fix users who signed in with Apple but were marked as Google
-- We check both raw_app_meta_data and raw_user_meta_data for Apple indicators
UPDATE public.user_profiles
SET signin_method = 'apple'
WHERE signin_method = 'google'
  AND id IN (
    SELECT id
    FROM auth.users
    WHERE raw_app_meta_data->>'provider' = 'apple'
       OR raw_user_meta_data->>'iss' LIKE '%appleid.apple.com%'
       OR email LIKE '%@privaterelay.appleid.com'
  );

UPDATE public.coach_profiles
SET signin_method = 'apple'
WHERE signin_method = 'google'
  AND id IN (
    SELECT id
    FROM auth.users
    WHERE raw_app_meta_data->>'provider' = 'apple'
       OR raw_user_meta_data->>'iss' LIKE '%appleid.apple.com%'
       OR email LIKE '%@privaterelay.appleid.com'
  );

UPDATE public.client_profiles
SET signin_method = 'apple'
WHERE signin_method = 'google'
  AND client_id IN (
    SELECT id
    FROM auth.users
    WHERE raw_app_meta_data->>'provider' = 'apple'
       OR raw_user_meta_data->>'iss' LIKE '%appleid.apple.com%'
       OR email LIKE '%@privaterelay.appleid.com'
  );
