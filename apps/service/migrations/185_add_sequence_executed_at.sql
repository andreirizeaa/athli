-- Migration 185: Sequence execution tracking and cleanup

-- ============================================================================
-- PART 1: Add sequence_executed_at for idempotent sequence execution
-- ============================================================================

ALTER TABLE "public"."client_package_assignments"
ADD COLUMN IF NOT EXISTS "sequence_executed_at" TIMESTAMPTZ DEFAULT NULL;

COMMENT ON COLUMN "public"."client_package_assignments"."sequence_executed_at"
IS 'Timestamp when the package sequence was executed for this client. Used for idempotency.';


-- ============================================================================
-- PART 2: Remove sequence_id from coach_unique_codes (not needed)
-- Sequences are executed via packages, not via unique codes
-- ============================================================================

-- Drop the trigger that auto-creates codes for sequences
DROP TRIGGER IF EXISTS trg_create_sequence_invite_code ON public.coach_sequences;

-- Drop the trigger function
DROP FUNCTION IF EXISTS public.create_sequence_invite_code();

-- Delete orphan codes that were created just for sequences (no onboarding_id)
-- Only run if sequence_id column exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'coach_unique_codes'
    AND column_name = 'sequence_id'
  ) THEN
    DELETE FROM public.coach_unique_codes
    WHERE sequence_id IS NOT NULL
      AND onboarding_id IS NULL;
  END IF;
END $$;

-- Drop the index on sequence_id
DROP INDEX IF EXISTS idx_coach_unique_codes_sequence_id;

-- Remove sequence_id column from coach_unique_codes
ALTER TABLE public.coach_unique_codes
DROP COLUMN IF EXISTS sequence_id;


-- ============================================================================
-- PART 3: Update handle_user_update to not reference sequence_id
-- and properly include signin_method
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_user_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_name TEXT;
  new_email TEXT;
  new_user_type TEXT;
  new_timezone TEXT;
  new_signin_method VARCHAR(20);
  new_profile_picture_url TEXT;
  profile_exists BOOLEAN;
  new_unique_code TEXT;
  max_attempts INT := 10;
  attempt INT := 0;
BEGIN
  -- Extract metadata
  new_name := COALESCE(
    NEW.raw_user_meta_data->>'name',
    NEW.raw_user_meta_data->>'full_name',
    split_part(NEW.email, '@', 1)
  );
  new_email := COALESCE(NEW.email, NEW.raw_user_meta_data->>'email');
  new_user_type := COALESCE(NEW.raw_user_meta_data->>'user_type', 'coach');
  new_timezone := COALESCE(
    NEW.raw_user_meta_data->>'timezone',
    'UTC'
  );
  new_signin_method := public.get_signin_method(NEW.raw_user_meta_data);
  new_profile_picture_url := public.get_profile_picture_url(NEW.raw_user_meta_data);

  -- Check if profile exists
  SELECT EXISTS(SELECT 1 FROM public.user_profiles WHERE id = NEW.id) INTO profile_exists;

  IF profile_exists THEN
    -- Update existing profile
    UPDATE public.user_profiles
    SET
      name = COALESCE(new_name, name),
      email = COALESCE(new_email, email),
      user_type = COALESCE(new_user_type, user_type),
      timezone = COALESCE(new_timezone, timezone),
      updated_at = NOW()
    WHERE id = NEW.id;
  ELSE
    -- Insert new profile
    INSERT INTO public.user_profiles (id, name, email, user_type, timezone, signin_method, profile_picture_url, created_at, updated_at)
    VALUES (NEW.id, new_name, new_email, new_user_type, new_timezone, new_signin_method, new_profile_picture_url, NOW(), NOW());

    -- If coach, create coach_profiles entry and generate unique code
    IF new_user_type = 'coach' THEN
      INSERT INTO public.coach_profiles (coach_id)
      VALUES (NEW.id)
      ON CONFLICT (coach_id) DO NOTHING;

      -- Generate unique code for the coach
      LOOP
        attempt := attempt + 1;
        new_unique_code := public.generate_unique_code(12);

        BEGIN
          INSERT INTO public.coach_unique_codes (coach_id, code, onboarding_id)
          VALUES (NEW.id, new_unique_code, NULL);
          EXIT; -- Success
        EXCEPTION WHEN unique_violation THEN
          IF attempt >= max_attempts THEN
            RAISE EXCEPTION 'Could not generate unique code after % attempts', max_attempts;
          END IF;
        END;
      END LOOP;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;
