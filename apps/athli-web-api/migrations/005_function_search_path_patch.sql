-- ================================================
-- ATHLI Function Search Path Security Patch
-- ================================================
-- This patch adds SET search_path to all functions to prevent
-- search path hijacking attacks (Supabase linter warning 0011)
-- ================================================

-- Run this AFTER all other migrations

-- ================================================
-- Auth Functions (001_create_auth_tables.sql)
-- ================================================

-- update_updated_at_column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- get_signin_method
CREATE OR REPLACE FUNCTION public.get_signin_method(user_metadata jsonb)
RETURNS VARCHAR(20)
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public, pg_temp
AS $$
BEGIN
  IF user_metadata->>'provider' IS NOT NULL THEN
    RETURN user_metadata->>'provider';
  END IF;

  IF user_metadata->>'iss' LIKE '%google%' OR
     user_metadata->>'picture' IS NOT NULL OR
     user_metadata->>'email_verified' = 'true' THEN
    RETURN 'google';
  END IF;

  RETURN 'email';
END;
$$;

-- get_user_type
CREATE OR REPLACE FUNCTION public.get_user_type(user_metadata jsonb)
RETURNS VARCHAR(20)
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public, pg_temp
AS $$
BEGIN
  IF user_metadata->>'user_type' IS NOT NULL THEN
    RETURN user_metadata->>'user_type';
  END IF;

  RETURN 'coach';
END;
$$;

-- get_profile_picture_url
CREATE OR REPLACE FUNCTION public.get_profile_picture_url(user_metadata jsonb)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public, pg_temp
AS $$
BEGIN
  IF user_metadata->>'profile_picture_url' IS NOT NULL AND
     user_metadata->>'profile_picture_url' != '' THEN
    RETURN user_metadata->>'profile_picture_url';
  END IF;

  IF user_metadata->>'avatar_url' IS NOT NULL AND
     user_metadata->>'avatar_url' != '' THEN
    RETURN user_metadata->>'avatar_url';
  END IF;

  IF user_metadata->>'picture' IS NOT NULL AND
     user_metadata->>'picture' != '' THEN
    RETURN user_metadata->>'picture';
  END IF;

  RETURN NULL;
END;
$$;

-- handle_new_user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_type VARCHAR(20);
  v_signin_method VARCHAR(20);
  v_profile_picture_url TEXT;
BEGIN
  v_user_type := public.get_user_type(NEW.raw_user_meta_data);
  v_signin_method := public.get_signin_method(NEW.raw_user_meta_data);
  v_profile_picture_url := public.get_profile_picture_url(NEW.raw_user_meta_data);

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
    RETURN NEW;
  WHEN OTHERS THEN
    RAISE WARNING 'Error creating user profile: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- handle_user_update
CREATE OR REPLACE FUNCTION public.handle_user_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_profile_picture_url TEXT;
BEGIN
  v_profile_picture_url := public.get_profile_picture_url(NEW.raw_user_meta_data);

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
    RAISE WARNING 'Error updating user profile: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- handle_user_profile_delete
CREATE OR REPLACE FUNCTION public.handle_user_profile_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_remaining_profiles INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_remaining_profiles
  FROM public.user_profiles
  WHERE id = OLD.id;

  IF v_remaining_profiles = 0 THEN
    DELETE FROM auth.users
    WHERE id = OLD.id;
  END IF;

  RETURN OLD;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error deleting auth user after profile deletion: %', SQLERRM;
    RETURN OLD;
END;
$$;

-- ================================================
-- Client Management Functions (003_create_client_profiles_table.sql)
-- ================================================

-- set_updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

-- protect_client_profile_fields
CREATE OR REPLACE FUNCTION public.protect_client_profile_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.uid() = OLD.client_id THEN
    IF NEW.coach_id           IS DISTINCT FROM OLD.coach_id           THEN RAISE EXCEPTION 'Clients cannot change their coach.'; END IF;
    IF NEW.status             IS DISTINCT FROM OLD.status             THEN RAISE EXCEPTION 'Clients cannot change their connection status.'; END IF;
    IF NEW.connected_at       IS DISTINCT FROM OLD.connected_at       THEN RAISE EXCEPTION 'Clients cannot change their connection date.'; END IF;
    IF NEW.invitation_sent_at IS DISTINCT FROM OLD.invitation_sent_at THEN RAISE EXCEPTION 'Clients cannot change invitation timestamp.'; END IF;
    IF NEW.created_at         IS DISTINCT FROM OLD.created_at         THEN RAISE EXCEPTION 'Clients cannot change profile creation date.'; END IF;
    IF NEW.category           IS DISTINCT FROM OLD.category           THEN RAISE EXCEPTION 'Clients cannot change category.'; END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- block_file_path_change
CREATE OR REPLACE FUNCTION public.block_file_path_change()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.file_path IS DISTINCT FROM OLD.file_path THEN
    RAISE EXCEPTION 'file_path cannot be changed';
  END IF;
  RETURN NEW;
END;
$$;

-- protect_checkin_review_fields
CREATE OR REPLACE FUNCTION public.protect_checkin_review_fields()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.uid() = OLD.client_id THEN
    IF NEW.coach_comment IS DISTINCT FROM OLD.coach_comment THEN
      RAISE EXCEPTION 'Clients cannot edit coach_comment.';
    END IF;
    IF NEW.reviewed_at IS DISTINCT FROM OLD.reviewed_at THEN
      RAISE EXCEPTION 'Clients cannot edit reviewed_at.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- set_training_summary_updated_by
CREATE OR REPLACE FUNCTION public.set_training_summary_updated_by()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_by := auth.uid();
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

-- set_habit_log_updated_fields
CREATE OR REPLACE FUNCTION public.set_habit_log_updated_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_by := auth.uid();
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

-- ================================================
-- Messaging Functions (004_create_messaging.sql)
-- ================================================

-- is_conversation_participant
CREATE OR REPLACE FUNCTION public.is_conversation_participant(
  p_conversation_id UUID,
  p_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.conversations
    WHERE id = p_conversation_id
    AND (participant_1_id = p_user_id OR participant_2_id = p_user_id)
  );
END;
$$;

-- get_or_create_conversation
CREATE OR REPLACE FUNCTION public.get_or_create_conversation(
  p_user1_id UUID,
  p_user2_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_conversation_id UUID;
  v_participant_1_id UUID;
  v_participant_2_id UUID;
BEGIN
  IF p_user1_id = p_user2_id THEN
    RAISE EXCEPTION 'Cannot create conversation with yourself';
  END IF;
  
  IF p_user1_id < p_user2_id THEN
    v_participant_1_id := p_user1_id;
    v_participant_2_id := p_user2_id;
  ELSE
    v_participant_1_id := p_user2_id;
    v_participant_2_id := p_user1_id;
  END IF;
  
  SELECT id INTO v_conversation_id
  FROM public.conversations
  WHERE participant_1_id = v_participant_1_id
    AND participant_2_id = v_participant_2_id;
  
  IF v_conversation_id IS NULL THEN
    INSERT INTO public.conversations (participant_1_id, participant_2_id)
    VALUES (v_participant_1_id, v_participant_2_id)
    RETURNING id INTO v_conversation_id;
  END IF;
  
  RETURN v_conversation_id;
END;
$$;

-- update_conversation_timestamp
CREATE OR REPLACE FUNCTION public.update_conversation_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE public.conversations
  SET 
    last_message_at = NEW.sent_at,
    last_message_preview = CASE
      WHEN NEW.is_deleted THEN NULL
      WHEN NEW.message_type = 'text' THEN LEFT(NEW.content, 100)
      WHEN NEW.message_type = 'image' THEN '📷 Image'
      WHEN NEW.message_type = 'video' THEN '🎥 Video'
      WHEN NEW.message_type = 'file' THEN '📎 File'
      WHEN NEW.message_type = 'audio' THEN '🎵 Audio'
      ELSE 'Message'
    END,
    updated_at = now()
  WHERE id = NEW.conversation_id;
  
  RETURN NEW;
END;
$$;

-- create_conversation_participants
CREATE OR REPLACE FUNCTION public.create_conversation_participants()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.conversation_participants (
    conversation_id, user_id, other_user_id
  ) VALUES (
    NEW.id, NEW.participant_1_id, NEW.participant_2_id
  );
  
  INSERT INTO public.conversation_participants (
    conversation_id, user_id, other_user_id
  ) VALUES (
    NEW.id, NEW.participant_2_id, NEW.participant_1_id
  );
  
  INSERT INTO public.message_read_receipts (conversation_id, user_id)
  VALUES 
    (NEW.id, NEW.participant_1_id),
    (NEW.id, NEW.participant_2_id);
  
  RETURN NEW;
END;
$$;

-- ================================================
-- Migration Complete
-- ================================================
-- All functions now have SET search_path = public, pg_temp
-- This prevents search path hijacking attacks
-- ================================================
