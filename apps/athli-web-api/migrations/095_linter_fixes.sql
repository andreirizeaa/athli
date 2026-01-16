-- ================================================
-- Database Linter Fixes Migration
-- ================================================
-- Fixes Supabase database linter warnings for security and performance issues:
-- - 4 Security Issues (function search_path, always-true RLS policies)
-- - 19 auth_rls_initplan performance issues
-- - 2 multiple_permissive_policies issues
-- - 1 duplicate index
-- - 9 unindexed foreign keys
-- ================================================

BEGIN;

-- ================================================
-- STEP 1: Fix function search_path (Security)
-- ================================================
-- Both functions need SET search_path to prevent search_path manipulation attacks

-- 1.1: handle_new_user - add SET search_path
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
  IF v_user_type IS NULL OR v_user_type = '' THEN
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
      COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', ''),
      v_profile_picture_url,
      v_signin_method,
      true,
      UPPER(SUBSTRING(MD5(NEW.id::text || NOW()::text) FOR 14))
    );

    RAISE NOTICE 'Created coach profile for user: %', NEW.id;

  ELSIF v_user_type = 'client' THEN
    -- Client profiles are typically created via API with coach_id
    RAISE NOTICE 'Client user_type detected for user: %. Client profiles should be created via API.', NEW.id;
  END IF;

  -- Also insert into user_profiles (NO is_active column)
  INSERT INTO public.user_profiles (
    id,
    user_type,
    email,
    name,
    profile_picture_url,
    signin_method
  ) VALUES (
    NEW.id,
    v_user_type,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', ''),
    v_profile_picture_url,
    v_signin_method
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
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp;

-- 1.2: handle_user_update - add SET search_path
CREATE OR REPLACE FUNCTION public.handle_user_update()
RETURNS TRIGGER AS $$
DECLARE
  v_user_type VARCHAR(20);
  v_old_user_type VARCHAR(20);
  v_signin_method VARCHAR(20);
  v_profile_picture_url TEXT;
  v_profile_exists BOOLEAN;
  v_user_name TEXT;
BEGIN
  -- DEBUG: Log entry
  RAISE NOTICE '=== handle_user_update TRIGGERED for user: % ===', NEW.id;

  -- Get current and previous user_type from metadata
  v_user_type := NEW.raw_user_meta_data->>'user_type';
  v_old_user_type := OLD.raw_user_meta_data->>'user_type';

  -- DEBUG: Log values
  RAISE NOTICE 'OLD user_type: [%], NEW user_type: [%]', v_old_user_type, v_user_type;

  -- Get profile picture URL (used for both create and update)
  v_profile_picture_url := public.get_profile_picture_url(NEW.raw_user_meta_data);

  -- Get user name
  v_user_name := COALESCE(
    NULLIF(NEW.raw_user_meta_data->>'name', ''),
    NULLIF(NEW.raw_user_meta_data->>'full_name', ''),
    ''
  );

  -- CASE 1: user_type was just set (was null OR empty, now has value)
  -- This handles Google OAuth signup where user_type is set after user creation
  IF (v_old_user_type IS NULL OR v_old_user_type = '') AND
     (v_user_type IS NOT NULL AND v_user_type != '') THEN

    RAISE NOTICE 'CASE 1 TRIGGERED: user_type was just set to [%]', v_user_type;

    -- Validate user_type
    IF v_user_type NOT IN ('coach', 'client') THEN
      RAISE WARNING 'Invalid user_type: %. Skipping profile creation for user: %', v_user_type, NEW.id;
    ELSE
      -- Check if profile already exists in user_profiles
      SELECT EXISTS(
        SELECT 1 FROM public.user_profiles
        WHERE id = NEW.id AND user_type = v_user_type
      ) INTO v_profile_exists;

      RAISE NOTICE 'Profile exists check: %', v_profile_exists;

      IF NOT v_profile_exists THEN
        -- Determine signin method
        v_signin_method := public.get_signin_method(NEW.raw_user_meta_data);
        RAISE NOTICE 'Signin method: [%]', v_signin_method;

        -- Create profile based on user_type
        IF v_user_type = 'coach' THEN
          -- Insert into coach_profiles (has is_active column)
          RAISE NOTICE 'Attempting to insert into coach_profiles...';
          BEGIN
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
              v_user_name,
              v_profile_picture_url,
              v_signin_method,
              true,
              UPPER(SUBSTRING(MD5(NEW.id::text || NOW()::text) FOR 14))
            );
            RAISE NOTICE 'SUCCESS: Created coach_profiles entry for user: %', NEW.id;
          EXCEPTION
            WHEN unique_violation THEN
              RAISE NOTICE 'coach_profiles already exists for user: %', NEW.id;
            WHEN OTHERS THEN
              RAISE WARNING 'ERROR inserting coach_profiles: %', SQLERRM;
          END;
        END IF;

        -- Insert into user_profiles (NO is_active column in this table)
        RAISE NOTICE 'Attempting to insert into user_profiles...';
        BEGIN
          INSERT INTO public.user_profiles (
            id,
            user_type,
            email,
            name,
            profile_picture_url,
            signin_method
          ) VALUES (
            NEW.id,
            v_user_type,
            COALESCE(NEW.email, ''),
            v_user_name,
            v_profile_picture_url,
            v_signin_method
          );
          RAISE NOTICE 'SUCCESS: Created user_profiles entry for user: % with type: %', NEW.id, v_user_type;
        EXCEPTION
          WHEN unique_violation THEN
            RAISE NOTICE 'user_profiles already exists for user: % with type: %', NEW.id, v_user_type;
          WHEN OTHERS THEN
            RAISE WARNING 'ERROR inserting user_profiles: %', SQLERRM;
        END;
      ELSE
        RAISE NOTICE 'Profile already exists for user: % with type: %, skipping creation', NEW.id, v_user_type;
      END IF;
    END IF;
  ELSE
    RAISE NOTICE 'CASE 1 NOT triggered - conditions not met';
  END IF;

  -- CASE 2: Update existing profiles (original behavior)
  -- This syncs email, name, and profile picture changes to existing profiles
  UPDATE public.user_profiles
  SET
    email = COALESCE(NEW.email, email),
    name = COALESCE(NULLIF(v_user_name, ''), name),
    profile_picture_url = COALESCE(v_profile_picture_url, profile_picture_url),
    updated_at = NOW()
  WHERE id = NEW.id;

  -- Also update coach_profiles if exists
  UPDATE public.coach_profiles
  SET
    email = COALESCE(NEW.email, email),
    name = COALESCE(NULLIF(v_user_name, ''), name),
    profile_picture_url = COALESCE(v_profile_picture_url, profile_picture_url),
    updated_at = NOW()
  WHERE id = NEW.id;

  RAISE NOTICE '=== handle_user_update COMPLETED for user: % ===', NEW.id;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the auth update
    RAISE WARNING 'EXCEPTION in handle_user_update for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp;

-- ================================================
-- STEP 2: Fix RLS policies with always-true checks
-- ================================================
-- These "System can insert" policies use WITH CHECK (true) which the linter flags.
-- The triggers use SECURITY DEFINER so they bypass RLS anyway.
-- We'll restrict these to service_role only for better security.

-- 2.1: Fix coach_profiles "System can insert coach profiles"
DROP POLICY IF EXISTS "System can insert coach profiles" ON public.coach_profiles;
CREATE POLICY "System can insert coach profiles"
  ON public.coach_profiles
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- 2.2: Fix user_profiles "System can insert profiles"
DROP POLICY IF EXISTS "System can insert profiles" ON public.user_profiles;
CREATE POLICY "System can insert profiles"
  ON public.user_profiles
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- ================================================
-- STEP 3: Fix auth_rls_initplan performance issues
-- ================================================
-- Replace auth.uid() with (select auth.uid()) in all messaging policies
-- This prevents re-evaluation of auth.uid() for each row

-- 3.1: client_updates policies (fix the unified select policy from 080)
DROP POLICY IF EXISTS client_updates_select_policy ON public.client_updates;
CREATE POLICY client_updates_select_policy ON public.client_updates
    FOR SELECT
    USING (
        -- Coach access
        coach_id = (select auth.uid())
        OR
        -- Client access (direct ownership)
        client_id = (select auth.uid())
        OR
        -- Client access (via profile lookup - legacy/redundant check preserved for safety)
        EXISTS (
            SELECT 1 FROM public.client_profiles cp
            WHERE cp.client_id = client_updates.client_id
            AND cp.client_id = (select auth.uid())
        )
    );

-- Also fix the remaining client_updates policies
DROP POLICY IF EXISTS client_updates_coach_insert ON public.client_updates;
CREATE POLICY client_updates_coach_insert ON public.client_updates
  FOR INSERT
  WITH CHECK (coach_id = (select auth.uid()));

DROP POLICY IF EXISTS client_updates_coach_update ON public.client_updates;
CREATE POLICY client_updates_coach_update ON public.client_updates
  FOR UPDATE
  USING (coach_id = (select auth.uid()))
  WITH CHECK (coach_id = (select auth.uid()));

DROP POLICY IF EXISTS client_updates_coach_delete ON public.client_updates;
CREATE POLICY client_updates_coach_delete ON public.client_updates
  FOR DELETE
  USING (coach_id = (select auth.uid()));

-- 3.2: conversations policies
DROP POLICY IF EXISTS "Users view own conversations" ON public.conversations;
CREATE POLICY "Users view own conversations"
  ON public.conversations
  FOR SELECT
  USING (
    (select auth.uid()) = coach_id OR
    (select auth.uid()) = client_id
  );

DROP POLICY IF EXISTS "Users create own conversations" ON public.conversations;
CREATE POLICY "Users create own conversations"
  ON public.conversations
  FOR INSERT
  WITH CHECK (
    (select auth.uid()) = coach_id OR
    (select auth.uid()) = client_id
  );

-- 3.3: messages policies
DROP POLICY IF EXISTS "Users view own messages" ON public.messages;
CREATE POLICY "Users view own messages"
  ON public.messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = messages.conversation_id
      AND (c.coach_id = (select auth.uid()) OR c.client_id = (select auth.uid()))
    )
  );

DROP POLICY IF EXISTS "Users send messages" ON public.messages;
CREATE POLICY "Users send messages"
  ON public.messages
  FOR INSERT
  WITH CHECK (
    sender_id = (select auth.uid()) AND
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_id
      AND (c.coach_id = (select auth.uid()) OR c.client_id = (select auth.uid()))
    )
  );

DROP POLICY IF EXISTS "Users edit own messages" ON public.messages;
CREATE POLICY "Users edit own messages"
  ON public.messages
  FOR UPDATE
  USING (sender_id = (select auth.uid()))
  WITH CHECK (sender_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users delete own messages" ON public.messages;
CREATE POLICY "Users delete own messages"
  ON public.messages
  FOR DELETE
  USING (sender_id = (select auth.uid()));

-- 3.4: message_attachments policies
DROP POLICY IF EXISTS "Users view attachments in conversations" ON public.message_attachments;
CREATE POLICY "Users view attachments in conversations"
  ON public.message_attachments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = message_attachments.conversation_id
      AND (c.coach_id = (select auth.uid()) OR c.client_id = (select auth.uid()))
    )
  );

DROP POLICY IF EXISTS "Users upload attachments to conversations" ON public.message_attachments;
CREATE POLICY "Users upload attachments to conversations"
  ON public.message_attachments
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_id
      AND (c.coach_id = (select auth.uid()) OR c.client_id = (select auth.uid()))
    )
  );

DROP POLICY IF EXISTS "Users update attachments in conversations" ON public.message_attachments;
CREATE POLICY "Users update attachments in conversations"
  ON public.message_attachments
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_id
      AND (c.coach_id = (select auth.uid()) OR c.client_id = (select auth.uid()))
    )
  );

-- 3.5: message_reactions policies
DROP POLICY IF EXISTS "Users view reactions" ON public.message_reactions;
CREATE POLICY "Users view reactions"
  ON public.message_reactions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = message_reactions.conversation_id
      AND (c.coach_id = (select auth.uid()) OR c.client_id = (select auth.uid()))
    )
  );

DROP POLICY IF EXISTS "Users add reactions" ON public.message_reactions;
CREATE POLICY "Users add reactions"
  ON public.message_reactions
  FOR INSERT
  WITH CHECK (
    user_id = (select auth.uid()) AND
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_id
      AND (c.coach_id = (select auth.uid()) OR c.client_id = (select auth.uid()))
    )
  );

DROP POLICY IF EXISTS "Users remove own reactions" ON public.message_reactions;
CREATE POLICY "Users remove own reactions"
  ON public.message_reactions
  FOR DELETE
  USING (user_id = (select auth.uid()));

-- 3.6: message_read_receipts policies
DROP POLICY IF EXISTS "Users view read receipts" ON public.message_read_receipts;
CREATE POLICY "Users view read receipts"
  ON public.message_read_receipts
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = message_read_receipts.conversation_id
      AND (c.coach_id = (select auth.uid()) OR c.client_id = (select auth.uid()))
    )
  );

DROP POLICY IF EXISTS "Users update own read receipts" ON public.message_read_receipts;
CREATE POLICY "Users update own read receipts"
  ON public.message_read_receipts
  FOR UPDATE
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users insert own read receipts" ON public.message_read_receipts;
CREATE POLICY "Users insert own read receipts"
  ON public.message_read_receipts
  FOR INSERT
  WITH CHECK (user_id = (select auth.uid()));

-- 3.7: conversation_participants policies
DROP POLICY IF EXISTS "Users view own participant records" ON public.conversation_participants;
CREATE POLICY "Users view own participant records"
  ON public.conversation_participants
  FOR SELECT
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users update own participant records" ON public.conversation_participants;
CREATE POLICY "Users update own participant records"
  ON public.conversation_participants
  FOR UPDATE
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

-- 3.8: user_profiles SELECT policy - fix and consolidate (see STEP 4)

-- ================================================
-- STEP 4: Fix multiple permissive policies
-- ================================================

-- 4.1: Drop redundant cteh_select from client_training_exercise_history
-- The cteh_modify FOR ALL policy covers SELECT, so cteh_select is redundant
DROP POLICY IF EXISTS cteh_select ON public.client_training_exercise_history;

-- 4.2: Consolidate user_profiles SELECT policies
-- There are currently two overlapping SELECT policies:
-- - "Users can read own profile" (from 006)
-- - "Users can view own profile and conversation participants" (from 092)
-- We consolidate into one with optimized (select auth.uid())

DROP POLICY IF EXISTS "Users can read own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can view own profile and conversation participants" ON public.user_profiles;

CREATE POLICY "Users can view own profile and conversation participants"
ON user_profiles
FOR SELECT
USING (
  -- Allow users to see their own profile
  id = (select auth.uid())
  OR
  -- Allow users to see profiles of people they have conversations with
  -- This includes both coaches viewing their clients and clients viewing their coaches
  id IN (
    SELECT DISTINCT
      CASE
        WHEN coach_id = (select auth.uid()) THEN client_id
        WHEN client_id = (select auth.uid()) THEN coach_id
      END
    FROM conversations
    WHERE (coach_id = (select auth.uid()) OR client_id = (select auth.uid()))
      AND CASE
        WHEN coach_id = (select auth.uid()) THEN client_id
        WHEN client_id = (select auth.uid()) THEN coach_id
      END IS NOT NULL
  )
);

-- ================================================
-- STEP 5: Fix duplicate index
-- ================================================
-- Drop idx_messages_parent_message_id (from 091), keep idx_msg_parent (from 087)
-- Both index the same column, idx_msg_parent was created first

DROP INDEX IF EXISTS public.idx_messages_parent_message_id;

-- ================================================
-- STEP 6: Add missing foreign key indexes
-- ================================================
-- These indexes improve performance for foreign key lookups and JOINs

-- 6.1: client_checkin_logs(client_id)
CREATE INDEX IF NOT EXISTS idx_ccl_client_id
  ON public.client_checkin_logs(client_id);

-- 6.2: client_checkins(client_id)
CREATE INDEX IF NOT EXISTS idx_cc_client_id
  ON public.client_checkins(client_id);

-- 6.3: client_files(client_id)
CREATE INDEX IF NOT EXISTS idx_cf_client_id
  ON public.client_files(client_id);

-- 6.4: client_habits(client_id)
CREATE INDEX IF NOT EXISTS idx_ch_client_id
  ON public.client_habits(client_id);

-- 6.5: client_metrics(client_id)
CREATE INDEX IF NOT EXISTS idx_cm_client_id
  ON public.client_metrics(client_id);

-- 6.6: client_questionnaires(client_id)
CREATE INDEX IF NOT EXISTS idx_cq_client_id
  ON public.client_questionnaires(client_id);

-- 6.7: coach_client_assignments(client_id)
CREATE INDEX IF NOT EXISTS idx_cca_client_id
  ON public.coach_client_assignments(client_id);

-- 6.8: coach_notification_preferences(event_id)
CREATE INDEX IF NOT EXISTS idx_cnp_event_id
  ON public.coach_notification_preferences(event_id);

COMMIT;

-- ================================================
-- Migration Complete
-- ================================================
-- Summary of fixes:
-- - 2 functions now have SET search_path = public, pg_temp
-- - 2 always-true RLS policies now restricted to service_role
-- - 19+ RLS policies updated to use (select auth.uid())
-- - 1 redundant policy dropped (cteh_select)
-- - 2 user_profiles SELECT policies consolidated into 1
-- - 1 duplicate index dropped (idx_messages_parent_message_id)
-- - 8 new indexes created for unindexed foreign keys
-- ================================================
