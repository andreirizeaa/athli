


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "wrappers" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."block_file_path_change"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
  IF NEW.file_path IS DISTINCT FROM OLD.file_path THEN
    RAISE EXCEPTION 'file_path cannot be changed';
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."block_file_path_change"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."broadcast_message_changes"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  topic TEXT;
  payload JSONB;
  attachments_json JSONB;
  reactions_json JSONB;
BEGIN
  -- Topic format: conversation:{id}:messages
  topic := 'conversation:' || COALESCE(NEW.conversation_id, OLD.conversation_id) || ':messages';

  IF TG_OP = 'DELETE' THEN
    payload := jsonb_build_object(
      'type', 'DELETE',
      'id', OLD.id,
      'conversation_id', OLD.conversation_id
    );
  ELSE
    -- Skip broadcast if message is waiting for attachments
    -- (unless it's being marked as ready)
    IF NEW.attachments_ready = FALSE AND 
       (TG_OP = 'INSERT' OR (OLD.attachments_ready = FALSE AND NEW.attachments_ready = FALSE)) THEN
      -- Don't broadcast yet - waiting for attachments
      RETURN NEW;
    END IF;

    -- Query attachments for this message with pre-generated URLs
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'id', ma.id,
        'message_id', ma.message_id,
        'conversation_id', ma.conversation_id,
        'bucket_id', ma.bucket_id,
        'file_path', ma.file_path,
        'filename', ma.filename,
        'mime_type', ma.mime_type,
        'size_bytes', ma.size_bytes,
        'thumbnail_path', ma.thumbnail_path,
        'width', ma.width,
        'height', ma.height,
        'duration_seconds', ma.duration_seconds,
        'upload_status', ma.upload_status,
        'created_at', ma.created_at
      )
    ), '[]'::jsonb)
    INTO attachments_json
    FROM public.message_attachments ma
    WHERE ma.message_id = NEW.id;

    -- Query reactions for this message
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'id', mr.id,
        'message_id', mr.message_id,
        'conversation_id', mr.conversation_id,
        'user_id', mr.user_id,
        'reaction', mr.reaction,
        'created_at', mr.created_at
      )
    ), '[]'::jsonb)
    INTO reactions_json
    FROM public.message_reactions mr
    WHERE mr.message_id = NEW.id;

    payload := jsonb_build_object(
      'type', TG_OP,
      'id', NEW.id,
      'conversation_id', NEW.conversation_id,
      'sender_id', NEW.sender_id,
      'content', NEW.content,
      'message_type', NEW.message_type,
      'parent_message_id', NEW.parent_message_id,
      'status', NEW.status,
      'sent_at', NEW.sent_at,
      'read_at', NEW.read_at,
      'edited_at', NEW.edited_at,
      'is_deleted', NEW.is_deleted,
      'deleted_at', NEW.deleted_at,
      'created_at', NEW.created_at,
      'attachment_count', COALESCE(NEW.attachment_count, 0),
      'attachments_ready', COALESCE(NEW.attachments_ready, TRUE),
      'idempotency_key', NEW.idempotency_key,
      'attachments', attachments_json,
      'reactions', reactions_json
    );
  END IF;

  -- Send broadcast using realtime.send
  PERFORM realtime.send(
    payload,
    'message_change',
    topic,
    true
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;


ALTER FUNCTION "public"."broadcast_message_changes"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."broadcast_message_changes"() IS 'Broadcasts message changes to Supabase Realtime. Waits for attachments_ready before broadcasting messages with attachments.';



CREATE OR REPLACE FUNCTION "public"."broadcast_message_on_reaction"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  topic TEXT;
  payload JSONB;
  attachments_json JSONB;
  reactions_json JSONB;
  msg RECORD;
  reaction_message_id UUID;
BEGIN
  -- Get the message ID from either NEW or OLD
  reaction_message_id := COALESCE(NEW.message_id, OLD.message_id);

  -- Get the parent message
  SELECT * INTO msg FROM public.messages WHERE id = reaction_message_id;

  IF msg IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Build topic
  topic := 'conversation:' || msg.conversation_id || ':messages';

  -- Query attachments for this message
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', ma.id,
      'message_id', ma.message_id,
      'conversation_id', ma.conversation_id,
      'bucket_id', ma.bucket_id,
      'file_path', ma.file_path,
      'filename', ma.filename,
      'mime_type', ma.mime_type,
      'size_bytes', ma.size_bytes,
      'thumbnail_path', ma.thumbnail_path,
      'width', ma.width,
      'height', ma.height,
      'duration_seconds', ma.duration_seconds,
      'upload_status', ma.upload_status,
      'created_at', ma.created_at
    )
  ), '[]'::jsonb)
  INTO attachments_json
  FROM public.message_attachments ma
  WHERE ma.message_id = reaction_message_id;

  -- Query ALL reactions for this message (including the one just inserted)
  -- For INSERT/UPDATE, include NEW; for DELETE, exclude OLD
  IF TG_OP = 'DELETE' THEN
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'id', mr.id,
        'message_id', mr.message_id,
        'conversation_id', mr.conversation_id,
        'user_id', mr.user_id,
        'reaction', mr.reaction,
        'created_at', mr.created_at
      )
    ), '[]'::jsonb)
    INTO reactions_json
    FROM public.message_reactions mr
    WHERE mr.message_id = reaction_message_id
    AND mr.id != OLD.id;  -- Exclude deleted reaction
  ELSE
    -- For INSERT, we need to include the NEW reaction explicitly
    -- since it may not be visible in the table yet
    SELECT COALESCE(jsonb_agg(reaction_obj), '[]'::jsonb)
    INTO reactions_json
    FROM (
      -- Existing reactions (excluding NEW.id to avoid duplicates)
      SELECT jsonb_build_object(
        'id', mr.id,
        'message_id', mr.message_id,
        'conversation_id', mr.conversation_id,
        'user_id', mr.user_id,
        'reaction', mr.reaction,
        'created_at', mr.created_at
      ) as reaction_obj
      FROM public.message_reactions mr
      WHERE mr.message_id = reaction_message_id
      AND mr.id != NEW.id
      UNION ALL
      -- Include the NEW reaction explicitly
      SELECT jsonb_build_object(
        'id', NEW.id,
        'message_id', NEW.message_id,
        'conversation_id', NEW.conversation_id,
        'user_id', NEW.user_id,
        'reaction', NEW.reaction,
        'created_at', NEW.created_at
      ) as reaction_obj
    ) combined;
  END IF;

  -- Build payload
  payload := jsonb_build_object(
    'type', 'UPDATE',
    'id', msg.id,
    'conversation_id', msg.conversation_id,
    'sender_id', msg.sender_id,
    'content', msg.content,
    'message_type', msg.message_type,
    'parent_message_id', msg.parent_message_id,
    'status', msg.status,
    'sent_at', msg.sent_at,
    'read_at', msg.read_at,
    'edited_at', msg.edited_at,
    'is_deleted', msg.is_deleted,
    'deleted_at', msg.deleted_at,
    'created_at', msg.created_at,
    'attachment_count', COALESCE(msg.attachment_count, 0),
    'attachments', attachments_json,
    'reactions', reactions_json
  );

  -- Send broadcast
  PERFORM realtime.send(
    payload,
    'message_change',
    topic,
    true
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;


ALTER FUNCTION "public"."broadcast_message_on_reaction"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."broadcast_message_on_reaction"() IS 'Broadcasts parent message with reactions when a reaction is inserted, updated, or removed';



CREATE OR REPLACE FUNCTION "public"."cache_musclewiki_thumbnail"("p_musclewiki_id" "text", "p_thumbnail_url" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  INSERT INTO public.musclewiki_thumbnail_cache (
    musclewiki_id,
    thumbnail_url,
    cached_at,
    cache_expires_at
  ) VALUES (
    p_musclewiki_id,
    p_thumbnail_url,
    now(),
    now() + INTERVAL '24 hours'  -- Strict 24h TTL per MuscleWiki Terms
  )
  ON CONFLICT (musclewiki_id) DO UPDATE SET
    thumbnail_url = EXCLUDED.thumbnail_url,
    cached_at = now(),
    cache_expires_at = now() + INTERVAL '24 hours';
END;
$$;


ALTER FUNCTION "public"."cache_musclewiki_thumbnail"("p_musclewiki_id" "text", "p_thumbnail_url" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."cache_musclewiki_thumbnail"("p_musclewiki_id" "text", "p_thumbnail_url" "text") IS 'Cache thumbnail URL with strict 24-hour TTL per MuscleWiki Terms Section 3.';



CREATE OR REPLACE FUNCTION "public"."can_receive_conversation_broadcast"("p_conversation_id" "uuid", "p_user_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.conversations
    WHERE id = p_conversation_id
    AND (coach_id = p_user_id OR client_id = p_user_id)
  );
$$;


ALTER FUNCTION "public"."can_receive_conversation_broadcast"("p_conversation_id" "uuid", "p_user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."can_receive_conversation_broadcast"("p_conversation_id" "uuid", "p_user_id" "uuid") IS 'Checks if a user can receive broadcasts for a conversation. Used for private channel authorization.';



CREATE OR REPLACE FUNCTION "public"."check_attachments_complete"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_expected_count INTEGER;
  v_actual_count INTEGER;
  v_attachments_ready BOOLEAN;
BEGIN
  -- Get expected attachment count and current ready status
  SELECT attachment_count, attachments_ready 
  INTO v_expected_count, v_attachments_ready
  FROM public.messages
  WHERE id = NEW.message_id;
  
  -- If message is already ready, skip
  IF v_attachments_ready = TRUE THEN
    RETURN NEW;
  END IF;
  
  -- Count completed attachments
  SELECT COUNT(*) INTO v_actual_count
  FROM public.message_attachments
  WHERE message_id = NEW.message_id
    AND upload_status = 'completed';
  
  -- If all attachments are uploaded, mark message as ready
  IF v_actual_count >= COALESCE(v_expected_count, 0) THEN
    UPDATE public.messages
    SET attachments_ready = TRUE
    WHERE id = NEW.message_id;
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."check_attachments_complete"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cleanup_expired_musclewiki_thumbnails"() RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  DELETE FROM public.musclewiki_thumbnail_cache
  WHERE cache_expires_at < now();

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  RETURN v_deleted_count;
END;
$$;


ALTER FUNCTION "public"."cleanup_expired_musclewiki_thumbnails"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cleanup_musclewiki_audit_logs"("p_retention_days" integer DEFAULT 90) RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  DELETE FROM public.musclewiki_api_audit_log
  WHERE created_at < now() - (p_retention_days || ' days')::INTERVAL;

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  RETURN v_deleted_count;
END;
$$;


ALTER FUNCTION "public"."cleanup_musclewiki_audit_logs"("p_retention_days" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."complete_exercise_cache_population"("p_log_id" "uuid", "p_status" "text", "p_total_fetched" integer DEFAULT 0, "p_total_cached" integer DEFAULT 0, "p_errors" integer DEFAULT 0, "p_error_message" "text" DEFAULT NULL::"text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  UPDATE public.musclewiki_cache_population_log
  SET
    completed_at = now(),
    status = p_status,
    total_fetched = p_total_fetched,
    total_cached = p_total_cached,
    errors = p_errors,
    error_message = p_error_message
  WHERE id = p_log_id;
END;
$$;


ALTER FUNCTION "public"."complete_exercise_cache_population"("p_log_id" "uuid", "p_status" "text", "p_total_fetched" integer, "p_total_cached" integer, "p_errors" integer, "p_error_message" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_conversation_on_client_assignment"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
  -- Create conversation when status becomes 'accepted' OR 'connected'
  -- Skip for 'invited', 'bounced', and 'archived' statuses
  IF (NEW.status = 'accepted' OR NEW.status = 'connected')
     AND (OLD IS NULL OR (OLD.status <> 'accepted' AND OLD.status <> 'connected')) THEN

    -- Create conversation (trigger will create participant records automatically)
    INSERT INTO public.conversations (coach_id, client_id)
    VALUES (NEW.coach_id, NEW.client_id)
    ON CONFLICT (coach_id, client_id) DO NOTHING;

  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."create_conversation_on_client_assignment"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_participant_records"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
  -- Create participant record for coach
  INSERT INTO public.conversation_participants (
    conversation_id, user_id, other_user_id
  ) VALUES (
    NEW.id, NEW.coach_id, NEW.client_id
  );

  -- Create participant record for client
  INSERT INTO public.conversation_participants (
    conversation_id, user_id, other_user_id
  ) VALUES (
    NEW.id, NEW.client_id, NEW.coach_id
  );

  -- Create initial read receipt records
  INSERT INTO public.message_read_receipts (conversation_id, user_id)
  VALUES
    (NEW.id, NEW.coach_id),
    (NEW.id, NEW.client_id);

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."create_participant_records"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."decrement_upvote_count"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  UPDATE public.feature_requests
  SET upvote_count = GREATEST(0, upvote_count - 1)
  WHERE id = OLD.feature_request_id;
  RETURN OLD;
END;
$$;


ALTER FUNCTION "public"."decrement_upvote_count"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."enforce_checkin_assignment_integrity"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE v_coach uuid;
BEGIN
  SELECT cp.coach_id INTO v_coach FROM public.client_profiles cp WHERE cp.client_id = NEW.client_id;
  IF v_coach IS NULL THEN RAISE EXCEPTION 'client_id has no client_profile'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.coach_checkins c WHERE c.id = NEW.coach_checkin_id AND c.coach_id = v_coach) THEN
    RAISE EXCEPTION 'coach_checkin_id does not belong to client coach';
  END IF;
  NEW.coach_id := v_coach;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."enforce_checkin_assignment_integrity"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."enforce_checkin_log_integrity"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE v_coach uuid;
BEGIN
  SELECT cca.coach_id INTO v_coach
  FROM public.coach_client_assignments cca
  WHERE cca.client_id = NEW.client_id
  LIMIT 1;

  IF v_coach IS NULL THEN RAISE EXCEPTION 'client_id has no coach assignment'; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.client_checkins cc
    WHERE cc.client_id = NEW.client_id
      AND cc.id = NEW.assignment_id
  ) THEN
    RAISE EXCEPTION 'assignment_id does not exist for this client';
  END IF;

  NEW.coach_id := v_coach;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."enforce_checkin_log_integrity"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."enforce_coach_private_integrity"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE v_coach uuid;
BEGIN
  -- Get coach from assignment (not client_profiles)
  SELECT cca.coach_id INTO v_coach 
  FROM public.coach_client_assignments cca 
  WHERE cca.client_id = NEW.client_id
  LIMIT 1;

  IF v_coach IS NULL THEN 
    RAISE EXCEPTION 'client_id % has no coach assignment', NEW.client_id; 
  END IF;
  
  NEW.coach_id := v_coach;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."enforce_coach_private_integrity"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."enforce_file_assignment_integrity"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE v_coach uuid;
DECLARE v_path text;
BEGIN
  SELECT cp.coach_id INTO v_coach
  FROM public.client_profiles cp
  WHERE cp.client_id = NEW.client_id;

  IF v_coach IS NULL THEN
    RAISE EXCEPTION 'client_id has no client_profile';
  END IF;

  SELECT cf.file_path INTO v_path
  FROM public.coach_files cf
  WHERE cf.id = NEW.coach_file_id
    AND cf.coach_id = v_coach;

  IF v_path IS NULL THEN
    RAISE EXCEPTION 'coach_file_id does not belong to client coach';
  END IF;

  NEW.coach_id := v_coach;
  NEW.coach_file_path := v_path; -- Denormalized for Storage speed
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."enforce_file_assignment_integrity"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."enforce_habit_assignment_integrity"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE v_coach uuid;
BEGIN
  SELECT cp.coach_id INTO v_coach
  FROM public.client_profiles cp
  WHERE cp.client_id = NEW.client_id;

  IF v_coach IS NULL THEN
    RAISE EXCEPTION 'client_id has no client_profile';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.coach_habits ch
    WHERE ch.id = NEW.coach_habit_id
      AND ch.coach_id = v_coach
  ) THEN
    RAISE EXCEPTION 'coach_habit_id does not belong to client coach';
  END IF;

  NEW.coach_id := v_coach;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."enforce_habit_assignment_integrity"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."enforce_habit_log_integrity"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE v_coach uuid;
BEGIN
  SELECT cca.coach_id INTO v_coach
  FROM public.coach_client_assignments cca
  WHERE cca.client_id = NEW.client_id
  LIMIT 1;

  IF v_coach IS NULL THEN RAISE EXCEPTION 'client_id has no coach assignment'; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.client_habits ch
    WHERE ch.client_id = NEW.client_id
      AND ch.id = NEW.assignment_id
  ) THEN
    RAISE EXCEPTION 'assignment_id does not exist for this client';
  END IF;

  NEW.coach_id := v_coach;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."enforce_habit_log_integrity"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."enforce_metric_assignment_integrity"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE v_coach uuid;
BEGIN
  SELECT cp.coach_id INTO v_coach
  FROM public.client_profiles cp
  WHERE cp.client_id = NEW.client_id;

  IF v_coach IS NULL THEN
    RAISE EXCEPTION 'client_id has no client_profile';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.coach_metrics cm
    WHERE cm.id = NEW.coach_metric_id
      AND cm.coach_id = v_coach
  ) THEN
    RAISE EXCEPTION 'coach_metric_id does not belong to client coach';
  END IF;

  NEW.coach_id := v_coach;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."enforce_metric_assignment_integrity"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."enforce_metric_entry_integrity"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE v_coach uuid;
BEGIN
  -- Get coach from assignment
  SELECT cca.coach_id INTO v_coach
  FROM public.coach_client_assignments cca
  WHERE cca.client_id = NEW.client_id
  LIMIT 1;

  IF v_coach IS NULL THEN RAISE EXCEPTION 'client_id has no coach assignment'; END IF;

  -- Check assignment exists (now in client_metrics table)
  IF NOT EXISTS (
    SELECT 1 FROM public.client_metrics cm
    WHERE cm.client_id = NEW.client_id
      AND cm.id = NEW.assignment_id
  ) THEN
    RAISE EXCEPTION 'metric is not assigned to client';
  END IF;

  NEW.coach_id := v_coach;
  NEW.created_by := COALESCE(NEW.created_by, auth.uid());
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."enforce_metric_entry_integrity"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."enforce_metric_log_integrity"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE v_coach uuid;
BEGIN
  SELECT cca.coach_id INTO v_coach
  FROM public.coach_client_assignments cca
  WHERE cca.client_id = NEW.client_id
  LIMIT 1;

  IF v_coach IS NULL THEN RAISE EXCEPTION 'client_id has no coach assignment'; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.client_metrics cm
    WHERE cm.client_id = NEW.client_id
      AND cm.id = NEW.assignment_id
  ) THEN
    RAISE EXCEPTION 'assignment_id does not exist for this client';
  END IF;

  NEW.coach_id := v_coach;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."enforce_metric_log_integrity"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."enforce_photo_log_integrity"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE v_coach uuid;
BEGIN
  SELECT cca.coach_id INTO v_coach
  FROM public.coach_client_assignments cca
  WHERE cca.client_id = NEW.client_id
  LIMIT 1;

  IF v_coach IS NULL THEN RAISE EXCEPTION 'client_id has no coach assignment'; END IF;

  NEW.coach_id := v_coach;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."enforce_photo_log_integrity"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."enforce_quest_assignment_integrity"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE v_coach uuid;
BEGIN
  SELECT cp.coach_id INTO v_coach FROM public.client_profiles cp WHERE cp.client_id = NEW.client_id;
  IF v_coach IS NULL THEN RAISE EXCEPTION 'client_id has no client_profile'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.coach_questionnaires c WHERE c.id = NEW.coach_questionnaire_id AND c.coach_id = v_coach) THEN
    RAISE EXCEPTION 'coach_questionnaire_id does not belong to client coach';
  END IF;
  NEW.coach_id := v_coach;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."enforce_quest_assignment_integrity"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."enforce_quest_log_integrity"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE v_coach uuid;
BEGIN
  SELECT cca.coach_id INTO v_coach
  FROM public.coach_client_assignments cca
  WHERE cca.client_id = NEW.client_id
  LIMIT 1;

  IF v_coach IS NULL THEN RAISE EXCEPTION 'client_id has no coach assignment'; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.client_questionnaires cq
    WHERE cq.client_id = NEW.client_id
      AND cq.id = NEW.assignment_id
  ) THEN
    RAISE EXCEPTION 'assignment_id does not exist for this client';
  END IF;

  NEW.coach_id := v_coach;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."enforce_quest_log_integrity"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."enforce_todolist_client_belongs_to_coach"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
  -- Defense-in-depth: Coach MUST match auth.uid() (if user session)
  IF auth.uid() IS NOT NULL AND NEW.coach_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'coach_id must equal auth.uid()';
  END IF;

  -- Normalize / validate (matches your CHECK constraints)
  IF NEW.type = 'general' THEN
    NEW.client_id := NULL; -- Force consistency
    RETURN NEW;
  ELSIF NEW.type = 'client' THEN
    IF NEW.client_id IS NULL THEN
      RAISE EXCEPTION 'type=client requires client_id';
    END IF;

    -- Use coach_client_assignments instead of client_profiles.coach_id
    IF NOT EXISTS (
      SELECT 1
      FROM public.coach_client_assignments cca
      WHERE cca.client_id = NEW.client_id
        AND cca.coach_id = NEW.coach_id
    ) THEN
      RAISE EXCEPTION 'client_id does not belong to this coach';
    END IF;

    RETURN NEW;
  ELSE
    RAISE EXCEPTION 'invalid type (expected client/general)';
  END IF;
END;
$$;


ALTER FUNCTION "public"."enforce_todolist_client_belongs_to_coach"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."extract_conversation_id_from_topic"("topic" "text") RETURNS "uuid"
    LANGUAGE "plpgsql" IMMUTABLE
    SET "search_path" TO 'public'
    AS $$
DECLARE
  parts TEXT[];
  conv_id TEXT;
BEGIN
  parts := string_to_array(topic, ':');

  IF array_length(parts, 1) != 3 THEN
    RETURN NULL;
  END IF;

  IF parts[1] != 'conversation' OR parts[3] != 'messages' THEN
    RETURN NULL;
  END IF;

  conv_id := parts[2];

  BEGIN
    RETURN conv_id::UUID;
  EXCEPTION WHEN OTHERS THEN
    RETURN NULL;
  END;
END;
$$;


ALTER FUNCTION "public"."extract_conversation_id_from_topic"("topic" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."extract_conversation_id_from_topic"("topic" "text") IS 'Extracts conversation UUID from a realtime topic string. Format: conversation:{uuid}:messages';



CREATE OR REPLACE FUNCTION "public"."generate_short_id"() RETURNS "text"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
    chars TEXT := 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    result TEXT := '';
    i INTEGER;
BEGIN
    -- Generate 8 random characters
    FOR i IN 1..8 LOOP
        result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    END LOOP;
    RETURN result;
END;
$$;


ALTER FUNCTION "public"."generate_short_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_short_id"("p_len" integer DEFAULT 12) RETURNS "text"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
    alphabet CONSTANT text := '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
    result text := '';
    buf bytea;
    b int;
    i int;
BEGIN
    IF p_len < 1 THEN
        RAISE EXCEPTION 'p_len must be >= 1';
    END IF;

    -- Generate random characters using rejection sampling to avoid modulo bias
    WHILE length(result) < p_len LOOP
        buf := gen_random_bytes(p_len);
        FOR i IN 0..length(buf)-1 LOOP
            b := get_byte(buf, i);

            -- Rejection sampling: 248 = 62 * 4 (largest multiple of 62 that fits in a byte)
            IF b < 248 THEN
                result := result || substr(alphabet, (b % 62) + 1, 1);
                EXIT WHEN length(result) = p_len;
            END IF;
        END LOOP;
    END LOOP;

    RETURN result;
END;
$$;


ALTER FUNCTION "public"."generate_short_id"("p_len" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_cached_musclewiki_exercises"("p_limit" integer DEFAULT 100, "p_offset" integer DEFAULT 0, "p_category" "text" DEFAULT NULL::"text", "p_difficulty" "text" DEFAULT NULL::"text", "p_search_term" "text" DEFAULT NULL::"text") RETURNS TABLE("id" "uuid", "musclewiki_id" "text", "name" "text", "category" "text", "difficulty" "text", "target_muscles" "jsonb", "is_cache_valid" boolean)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    mwec.id,
    mwec.musclewiki_id,
    mwec.name,
    mwec.category,
    mwec.difficulty,
    mwec.target_muscles,
    (mwec.cache_expires_at > now()) as is_cache_valid
  FROM public.musclewiki_exercise_cache mwec
  WHERE
    (p_category IS NULL OR mwec.category = p_category)
    AND (p_difficulty IS NULL OR mwec.difficulty = p_difficulty)
    AND (p_search_term IS NULL OR mwec.name ILIKE '%' || p_search_term || '%')
  ORDER BY mwec.name ASC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;


ALTER FUNCTION "public"."get_cached_musclewiki_exercises"("p_limit" integer, "p_offset" integer, "p_category" "text", "p_difficulty" "text", "p_search_term" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_coach_notification_settings"("coach_uuid" "uuid") RETURNS TABLE("event_id" "uuid", "event_key" "text", "name" "text", "description" "text", "category" "text", "enabled" boolean)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
    -- Verify caller is authenticated and is the coach requesting their own settings
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    IF auth.uid() != coach_uuid THEN
        RAISE EXCEPTION 'Unauthorized: Can only access your own notification settings';
    END IF;

    RETURN QUERY
    SELECT
      ane.id AS event_id,
      ane.event_key,
      ane.name,
      ane.description,
      ane.category,
      COALESCE(cnp.enabled, ane.default_enabled) AS enabled
    FROM public.available_notification_events ane
    LEFT JOIN public.coach_notification_preferences cnp
      ON ane.id = cnp.event_id
      AND cnp.coach_id = coach_uuid
    ORDER BY ane.category, ane.event_key;
END;
$$;


ALTER FUNCTION "public"."get_coach_notification_settings"("coach_uuid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_exercise_cache_stats"() RETURNS TABLE("total_cached" bigint, "valid_cached" bigint, "expired_cached" bigint, "expiring_soon" bigint, "last_population" timestamp with time zone, "needs_refresh" boolean)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM public.musclewiki_exercise_cache)::BIGINT AS total_cached,
    (SELECT COUNT(*) FROM public.musclewiki_exercise_cache WHERE cache_expires_at > now())::BIGINT AS valid_cached,
    (SELECT COUNT(*) FROM public.musclewiki_exercise_cache WHERE cache_expires_at <= now())::BIGINT AS expired_cached,
    (SELECT COUNT(*) FROM public.musclewiki_exercise_cache WHERE cache_expires_at BETWEEN now() AND (now() + INTERVAL '2 days'))::BIGINT AS expiring_soon,
    (SELECT started_at FROM public.musclewiki_cache_population_log WHERE status = 'success' ORDER BY started_at DESC LIMIT 1) AS last_population,
    public.should_populate_exercise_cache() AS needs_refresh;
END;
$$;


ALTER FUNCTION "public"."get_exercise_cache_stats"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_musclewiki_thumbnail"("p_musclewiki_id" "text") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_thumbnail_url TEXT;
BEGIN
  -- Only return thumbnail if within 24-hour cache window per Terms
  SELECT thumbnail_url INTO v_thumbnail_url
  FROM public.musclewiki_thumbnail_cache
  WHERE musclewiki_id = p_musclewiki_id
    AND cache_expires_at > now();  -- MUST check expiry for compliance

  RETURN v_thumbnail_url;
END;
$$;


ALTER FUNCTION "public"."get_musclewiki_thumbnail"("p_musclewiki_id" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_musclewiki_thumbnail"("p_musclewiki_id" "text") IS 'Get thumbnail URL only if within 24-hour cache window per MuscleWiki Terms.';



CREATE OR REPLACE FUNCTION "public"."get_musclewiki_usage_stats"("p_days" integer DEFAULT 30) RETURNS TABLE("period_start" timestamp with time zone, "period_end" timestamp with time zone, "total_api_calls" bigint, "cache_hits" bigint, "cache_misses" bigint, "cache_hit_rate" numeric, "avg_response_time_ms" numeric, "total_exercises_served" bigint)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    now() - (p_days || ' days')::INTERVAL as period_start,
    now() as period_end,
    COUNT(*)::BIGINT as total_api_calls,
    SUM(CASE WHEN cache_hit THEN 1 ELSE 0 END)::BIGINT as cache_hits,
    SUM(CASE WHEN NOT cache_hit THEN 1 ELSE 0 END)::BIGINT as cache_misses,
    ROUND(
      (SUM(CASE WHEN cache_hit THEN 1.0 ELSE 0.0 END) / NULLIF(COUNT(*), 0)) * 100,
      2
    ) as cache_hit_rate,
    ROUND(AVG(request_duration_ms)::NUMERIC, 2) as avg_response_time_ms,
    SUM(exercises_returned)::BIGINT as total_exercises_served
  FROM public.musclewiki_api_audit_log
  WHERE created_at >= now() - (p_days || ' days')::INTERVAL;
END;
$$;


ALTER FUNCTION "public"."get_musclewiki_usage_stats"("p_days" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_or_create_conversation"("p_coach_id" "uuid", "p_client_id" "uuid") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_conversation_id UUID;
BEGIN
  -- Verify caller is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Verify caller is either the coach or the client in this conversation
  IF auth.uid() != p_coach_id AND auth.uid() != p_client_id THEN
    RAISE EXCEPTION 'Unauthorized: You must be a participant in the conversation';
  END IF;

  -- Ensure no self-messaging
  IF p_coach_id = p_client_id THEN
    RAISE EXCEPTION 'Cannot create conversation with yourself';
  END IF;

  -- Try to find existing conversation
  SELECT id INTO v_conversation_id
  FROM public.conversations
  WHERE coach_id = p_coach_id
    AND client_id = p_client_id;

  -- Create if doesn't exist
  IF v_conversation_id IS NULL THEN
    INSERT INTO public.conversations (coach_id, client_id)
    VALUES (p_coach_id, p_client_id)
    RETURNING id INTO v_conversation_id;
  END IF;

  RETURN v_conversation_id;
END;
$$;


ALTER FUNCTION "public"."get_or_create_conversation"("p_coach_id" "uuid", "p_client_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_profile_picture_url"("user_metadata" "jsonb") RETURNS "text"
    LANGUAGE "plpgsql" IMMUTABLE
    SET "search_path" TO 'public', 'pg_temp'
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


ALTER FUNCTION "public"."get_profile_picture_url"("user_metadata" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_signin_method"("user_metadata" "jsonb") RETURNS character varying
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


CREATE OR REPLACE FUNCTION "public"."get_storage_signed_url"("p_bucket_id" "text", "p_file_path" "text", "p_expiry_seconds" integer DEFAULT 3600) RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'storage'
    AS $$
DECLARE
  v_signed_url TEXT;
BEGIN
  -- Generate a signed URL for the attachment
  -- This uses Supabase's storage.fpath API
  SELECT storage.fpath(p_bucket_id, p_file_path) INTO v_signed_url;
  RETURN v_signed_url;
EXCEPTION
  WHEN OTHERS THEN
    -- Return NULL if URL generation fails
    RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."get_storage_signed_url"("p_bucket_id" "text", "p_file_path" "text", "p_expiry_seconds" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_type"("user_metadata" "jsonb") RETURNS character varying
    LANGUAGE "plpgsql" IMMUTABLE
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
  IF user_metadata->>'user_type' IS NOT NULL THEN
    RETURN user_metadata->>'user_type';
  END IF;

  RETURN 'coach';
END;
$$;


ALTER FUNCTION "public"."get_user_type"("user_metadata" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_auth_user_update"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_user_type VARCHAR(20);
  v_old_user_type VARCHAR(20);
  v_signin_method VARCHAR(20);
  v_profile_picture_url TEXT;
  v_profile_exists BOOLEAN;
  v_user_name TEXT;
BEGIN
  v_user_type := NEW.raw_user_meta_data->>'user_type';
  v_old_user_type := OLD.raw_user_meta_data->>'user_type';

  IF v_user_type IS NULL THEN
    RETURN NEW;
  END IF;

  v_signin_method := public.get_signin_method(NEW.raw_user_meta_data);
  v_profile_picture_url := public.get_profile_picture_url(NEW.raw_user_meta_data);

  v_user_name := COALESCE(
    NEW.raw_user_meta_data->>'name',
    NEW.raw_user_meta_data->>'full_name',
    ''
  );

  IF v_user_type IS DISTINCT FROM v_old_user_type THEN
    IF v_user_type = 'coach' THEN
      SELECT EXISTS(SELECT 1 FROM public.coach_profiles WHERE id = NEW.id) INTO v_profile_exists;
      IF NOT v_profile_exists THEN
        INSERT INTO public.coach_profiles (
          id,
          is_active,
          unique_code
        ) VALUES (
          NEW.id,
          true,
          UPPER(SUBSTRING(MD5(NEW.id::text || NOW()::text || random()::text) FOR 14))
        );
      END IF;
    ELSIF v_user_type = 'client' THEN
      SELECT EXISTS(SELECT 1 FROM public.user_profiles WHERE id = NEW.id) INTO v_profile_exists;
      IF NOT v_profile_exists THEN
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
      END IF;
    END IF;
  END IF;

  UPDATE public.user_profiles
  SET
    email = COALESCE(NEW.email, email),
    name = COALESCE(NULLIF(v_user_name, ''), name),
    profile_picture_url = COALESCE(v_profile_picture_url, profile_picture_url),
    updated_at = NOW()
  WHERE id = NEW.id;

  UPDATE public.coach_profiles
  SET updated_at = NOW()
  WHERE id = NEW.id;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error in handle_auth_user_update: %', SQLERRM;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_auth_user_update"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_client_account_deletion"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'storage'
    AS $$
DECLARE
  v_file_paths TEXT[];
  v_path TEXT;
BEGIN
  -- Collect all photo paths from client_photo_logs before they cascade delete
  SELECT ARRAY_AGG(DISTINCT path) INTO v_file_paths
  FROM (
    SELECT front_photo_path AS path FROM public.client_photo_logs WHERE client_id = OLD.client_id AND front_photo_path IS NOT NULL
    UNION
    SELECT side_photo_path AS path FROM public.client_photo_logs WHERE client_id = OLD.client_id AND side_photo_path IS NOT NULL
    UNION
    SELECT back_photo_path AS path FROM public.client_photo_logs WHERE client_id = OLD.client_id AND back_photo_path IS NOT NULL
  ) AS paths;

  -- Delete each file from client_photos bucket
  IF v_file_paths IS NOT NULL THEN
    FOREACH v_path IN ARRAY v_file_paths
    LOOP
      DELETE FROM storage.objects 
      WHERE bucket_id = 'client_photos' 
        AND name = v_path;
    END LOOP;
  END IF;

  -- Also delete any files that follow the {client_id}/... pattern
  -- This catches any files that might not be tracked in photo_logs
  DELETE FROM storage.objects 
  WHERE bucket_id = 'client_photos' 
    AND name LIKE OLD.client_id::text || '/%';

  RETURN OLD;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the deletion - data cleanup is best effort
    RAISE WARNING 'Error cleaning up client storage for client %: %', OLD.client_id, SQLERRM;
    RETURN OLD;
END;
$$;


ALTER FUNCTION "public"."handle_client_account_deletion"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_client_auth_cleanup"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth'
    AS $$
BEGIN
  -- Delete from user_profiles (if exists)
  DELETE FROM public.user_profiles 
  WHERE id = OLD.client_id;

  -- Delete from auth.users (this will cascade to other auth-related tables)
  DELETE FROM auth.users 
  WHERE id = OLD.client_id;

  RETURN OLD;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail - the main profile is already deleted
    RAISE WARNING 'Error cleaning up auth for client %: %', OLD.client_id, SQLERRM;
    RETURN OLD;
END;
$$;


ALTER FUNCTION "public"."handle_client_auth_cleanup"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_coach_setup"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- This function is triggered from coach_profiles INSERT
  -- No need to check user_type - if we're here, it's a coach
  
  -- 1. Create default preferences (theme, language, units, color_preset)
  INSERT INTO public.coach_preferences (coach_id, theme, language, units, color_preset)
  VALUES (NEW.id, 'light', 'en', 'metric', 'default')
  ON CONFLICT (coach_id) DO NOTHING;

  -- 2. Generate and insert unique coach code
  INSERT INTO public.coach_unique_codes (coach_id, code)
  VALUES (
      NEW.id, 
      upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 8))
  )
  ON CONFLICT (coach_id, code) DO NOTHING;

  -- 3. Create default notification preferences
  INSERT INTO public.coach_notification_preferences (coach_id, event_id, enabled)
  SELECT 
    NEW.id, 
    id, 
    true -- We default all to enabled for new coaches
  FROM public.available_notification_events
  ON CONFLICT DO NOTHING;

  -- 3.5. Create Getting Started checklist row
  INSERT INTO public.coach_getting_started_checklist (coach_id)
  VALUES (NEW.id)
  ON CONFLICT (coach_id) DO NOTHING;

  -- 4. Create default flows (The 5 fixed flows)
  -- Flow 1: New Client Sign Up
  INSERT INTO public.coach_flows (coach_id, name, description, flow_data, is_active)
  VALUES (
      NEW.id,
      'New Client Sign Up',
      'Triggered when a new client accepts your invitation.',
      '{"nodes": [{"id": "trigger", "type": "trigger", "position": {"x": 400, "y": 50}, "data": {"label": "Trigger", "subtitle": "New client sign up", "option": {"id": "new-client-signup", "name": "New client sign up"}}}, {"id": "add-action-trigger", "type": "addAction", "position": {"x": 400, "y": 200}, "data": {"metadata": {"index": 0}}}, {"id": "end", "type": "end", "position": {"x": 400, "y": 300}, "data": {"label": "End"}}], "edges": [{"id": "trigger-to-add", "source": "trigger", "target": "add-action-trigger", "type": "smoothstep"}, {"id": "add-to-end", "source": "add-action-trigger", "target": "end", "type": "smoothstep"}]}'::jsonb,
      false
  )
  ON CONFLICT DO NOTHING;

  -- Flow 2: Missed Check-in
  INSERT INTO public.coach_flows (coach_id, name, description, flow_data, is_active)
  VALUES (
      NEW.id,
      'Missed Check-in',
      'Triggered when a client misses a scheduled check-in.',
      '{"nodes": [{"id": "trigger", "type": "trigger", "position": {"x": 400, "y": 50}, "data": {"label": "Trigger", "subtitle": "Missed check in", "option": {"id": "missed-check-in", "name": "Missed check in"}}}, {"id": "add-action-trigger", "type": "addAction", "position": {"x": 400, "y": 200}, "data": {"metadata": {"index": 0}}}, {"id": "end", "type": "end", "position": {"x": 400, "y": 300}, "data": {"label": "End"}}], "edges": [{"id": "trigger-to-add", "source": "trigger", "target": "add-action-trigger", "type": "smoothstep"}, {"id": "add-to-end", "source": "add-action-trigger", "target": "end", "type": "smoothstep"}]}'::jsonb,
      false
  )
  ON CONFLICT DO NOTHING;

  -- Flow 3: Check-in Completed
  INSERT INTO public.coach_flows (coach_id, name, description, flow_data, is_active)
  VALUES (
      NEW.id,
      'Check-in Completed',
      'Triggered when a client completes a check-in.',
      '{"nodes": [{"id": "trigger", "type": "trigger", "position": {"x": 400, "y": 50}, "data": {"label": "Trigger", "subtitle": "Check in completed", "option": {"id": "check-in-completed", "name": "Check in completed"}}}, {"id": "add-action-trigger", "type": "addAction", "position": {"x": 400, "y": 200}, "data": {"metadata": {"index": 0}}}, {"id": "end", "type": "end", "position": {"x": 400, "y": 300}, "data": {"label": "End"}}], "edges": [{"id": "trigger-to-add", "source": "trigger", "target": "add-action-trigger", "type": "smoothstep"}, {"id": "add-to-end", "source": "add-action-trigger", "target": "end", "type": "smoothstep"}]}'::jsonb,
      false
  )
  ON CONFLICT DO NOTHING;

  -- Flow 4: Missed Workout
  INSERT INTO public.coach_flows (coach_id, name, description, flow_data, is_active)
  VALUES (
      NEW.id,
      'Missed Workout',
      'Triggered when a client misses a scheduled workout.',
      '{"nodes": [{"id": "trigger", "type": "trigger", "position": {"x": 400, "y": 50}, "data": {"label": "Trigger", "subtitle": "Missed workout", "option": {"id": "missed-workout", "name": "Missed workout"}}}, {"id": "add-action-trigger", "type": "addAction", "position": {"x": 400, "y": 200}, "data": {"metadata": {"index": 0}}}, {"id": "end", "type": "end", "position": {"x": 400, "y": 300}, "data": {"label": "End"}}], "edges": [{"id": "trigger-to-add", "source": "trigger", "target": "add-action-trigger", "type": "smoothstep"}, {"id": "add-to-end", "source": "add-action-trigger", "target": "end", "type": "smoothstep"}]}'::jsonb,
      false
  )
  ON CONFLICT DO NOTHING;

  -- Flow 5: Workout Finished
  INSERT INTO public.coach_flows (coach_id, name, description, flow_data, is_active)
  VALUES (
      NEW.id,
      'Workout Finished',
      'Triggered when a client completes a workout.',
      '{"nodes": [{"id": "trigger", "type": "trigger", "position": {"x": 400, "y": 50}, "data": {"label": "Trigger", "subtitle": "Workout finished", "option": {"id": "workout-finished", "name": "Workout finished"}}}, {"id": "add-action-trigger", "type": "addAction", "position": {"x": 400, "y": 200}, "data": {"metadata": {"index": 0}}}, {"id": "end", "type": "end", "position": {"x": 400, "y": 300}, "data": {"label": "End"}}], "edges": [{"id": "trigger-to-add", "source": "trigger", "target": "add-action-trigger", "type": "smoothstep"}, {"id": "add-to-end", "source": "add-action-trigger", "target": "end", "type": "smoothstep"}]}'::jsonb,
      false
  )
  ON CONFLICT DO NOTHING;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error seeding coach defaults: %', SQLERRM;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_coach_setup"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_user_type VARCHAR(20);
  v_signin_method VARCHAR(20);
  v_profile_picture_url TEXT;
BEGIN
  v_user_type := NEW.raw_user_meta_data->>'user_type';

  IF v_user_type IS NULL THEN
    RAISE WARNING 'user_type not specified in signup metadata for user %', NEW.id;
    RETURN NEW;
  END IF;

  v_signin_method := public.get_signin_method(NEW.raw_user_meta_data);
  v_profile_picture_url := public.get_profile_picture_url(NEW.raw_user_meta_data);

  IF v_user_type = 'coach' THEN
    INSERT INTO public.coach_profiles (
      id,
      is_active,
      unique_code
    ) VALUES (
      NEW.id,
      true,
      UPPER(SUBSTRING(MD5(NEW.id::text || NOW()::text || random()::text) FOR 14))
    );
  END IF;

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
    RETURN NEW;
  WHEN OTHERS THEN
    RAISE WARNING 'Error creating user profile: %', SQLERRM;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."handle_new_user"() IS 'Automatically creates user profiles (coach_profiles/client_profiles) when user_type is explicitly set in raw_user_meta_data.
Web signup flow sets user_type explicitly. Mobile sign-in without prior signup will skip profile creation,
allowing the mobile app to show "No Account Found" message.';



CREATE OR REPLACE FUNCTION "public"."handle_user_profile_delete"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
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


ALTER FUNCTION "public"."handle_user_profile_delete"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_user_update"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_user_type VARCHAR(20);
  v_old_user_type VARCHAR(20);
  v_signin_method VARCHAR(20);
  v_profile_picture_url TEXT;
  v_profile_exists BOOLEAN;
  v_user_name TEXT;
BEGIN
  -- Get current and previous user_type from metadata
  v_user_type := NEW.raw_user_meta_data->>'user_type';
  v_old_user_type := OLD.raw_user_meta_data->>'user_type';

  -- Get profile picture URL (used for user_profiles)
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

    -- Validate user_type
    IF v_user_type NOT IN ('coach', 'client') THEN
      RAISE WARNING 'Invalid user_type: %. Skipping profile creation for user: %', v_user_type, NEW.id;
    ELSE
      -- Check if profile already exists in user_profiles
      SELECT EXISTS(
        SELECT 1 FROM public.user_profiles
        WHERE id = NEW.id AND user_type = v_user_type
      ) INTO v_profile_exists;

      IF NOT v_profile_exists THEN
        -- Determine signin method
        v_signin_method := public.get_signin_method(NEW.raw_user_meta_data);

        -- Create coach_profiles entry if user is a coach
        -- coach_profiles only has: id, is_active, is_archived, status, unique_code, created_at, updated_at, getting_started_checklist_complete
        IF v_user_type = 'coach' THEN
          BEGIN
            INSERT INTO public.coach_profiles (
              id,
              is_active,
              unique_code
            ) VALUES (
              NEW.id,
              true,
              UPPER(SUBSTRING(MD5(NEW.id::text || NOW()::text || random()::text) FOR 14))
            );
          EXCEPTION
            WHEN unique_violation THEN
              NULL; -- Profile already exists, continue
            WHEN OTHERS THEN
              RAISE WARNING 'Error inserting coach_profiles for user %: %', NEW.id, SQLERRM;
          END;
        END IF;

        -- Create user_profiles entry for ALL users (coaches and clients)
        -- user_profiles has: id, user_type, email, name, profile_picture_url, signin_method, created_at, updated_at
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
        EXCEPTION
          WHEN unique_violation THEN
            NULL; -- Profile already exists, continue
          WHEN OTHERS THEN
            RAISE WARNING 'Error inserting user_profiles for user %: %', NEW.id, SQLERRM;
        END;
      END IF;
    END IF;
  END IF;

  -- CASE 2: Update existing user_profiles with any metadata changes
  -- Only user_profiles has email, name, profile_picture_url columns
  UPDATE public.user_profiles
  SET
    email = COALESCE(NEW.email, email),
    name = COALESCE(NULLIF(v_user_name, ''), name),
    profile_picture_url = COALESCE(v_profile_picture_url, profile_picture_url),
    updated_at = NOW()
  WHERE id = NEW.id;

  -- Update coach_profiles timestamp if it exists
  -- coach_profiles does NOT have email, name, profile_picture_url columns
  UPDATE public.coach_profiles
  SET updated_at = NOW()
  WHERE id = NEW.id;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the auth update
    RAISE WARNING 'Exception in handle_user_update for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_user_update"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."handle_user_update"() IS 'Handles auth.users updates by:
1. Creating profiles when user_type is set for the first time (OAuth signup flow)
2. Syncing email, name, and profile picture changes to user_profiles

Schema notes:
- user_profiles stores: email, name, profile_picture_url, signin_method
- coach_profiles only stores: is_active, is_archived, status, unique_code
- client_profiles only stores: date_of_birth, gender, height_cm, phone, country, unit_system';



CREATE OR REPLACE FUNCTION "public"."increment_upvote_count"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  UPDATE public.feature_requests
  SET upvote_count = upvote_count + 1
  WHERE id = NEW.feature_request_id;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."increment_upvote_count"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_conversation_participant"("p_conversation_id" "uuid", "p_user_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.conversations
    WHERE id = p_conversation_id
    AND (coach_id = p_user_id OR client_id = p_user_id)
  );
$$;


ALTER FUNCTION "public"."is_conversation_participant"("p_conversation_id" "uuid", "p_user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."is_conversation_participant"("p_conversation_id" "uuid", "p_user_id" "uuid") IS 'Checks if a user is a participant (coach or client) in a conversation. Used for Realtime authorization.';



CREATE OR REPLACE FUNCTION "public"."log_musclewiki_api_call"("p_endpoint" "text", "p_method" "text" DEFAULT 'GET'::"text", "p_query_params" "jsonb" DEFAULT NULL::"jsonb", "p_response_status" integer DEFAULT NULL::integer, "p_response_size_bytes" integer DEFAULT NULL::integer, "p_exercises_returned" integer DEFAULT 0, "p_cache_hit" boolean DEFAULT false, "p_cache_miss_reason" "text" DEFAULT NULL::"text", "p_request_source" "text" DEFAULT 'web_app'::"text", "p_user_id" "uuid" DEFAULT NULL::"uuid", "p_request_duration_ms" integer DEFAULT NULL::integer, "p_rate_limit_remaining" integer DEFAULT NULL::integer, "p_rate_limit_reset_at" timestamp with time zone DEFAULT NULL::timestamp with time zone) RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO public.musclewiki_api_audit_log (
    endpoint,
    method,
    query_params,
    response_status,
    response_size_bytes,
    exercises_returned,
    cache_hit,
    cache_miss_reason,
    request_source,
    user_id,
    request_duration_ms,
    rate_limit_remaining,
    rate_limit_reset_at
  ) VALUES (
    p_endpoint,
    p_method,
    p_query_params,
    p_response_status,
    p_response_size_bytes,
    p_exercises_returned,
    p_cache_hit,
    p_cache_miss_reason,
    p_request_source,
    p_user_id,
    p_request_duration_ms,
    p_rate_limit_remaining,
    p_rate_limit_reset_at
  )
  RETURNING id INTO v_log_id;

  -- Update daily API call counter
  UPDATE public.musclewiki_sync_metadata
  SET
    total_api_calls_today = CASE
      WHEN api_calls_reset_at IS NULL OR api_calls_reset_at < CURRENT_DATE
      THEN 1
      ELSE total_api_calls_today + 1
    END,
    api_calls_reset_at = CASE
      WHEN api_calls_reset_at IS NULL OR api_calls_reset_at < CURRENT_DATE
      THEN CURRENT_DATE + INTERVAL '1 day'
      ELSE api_calls_reset_at
    END
  WHERE sync_type = 'full_catalog';

  RETURN v_log_id;
END;
$$;


ALTER FUNCTION "public"."log_musclewiki_api_call"("p_endpoint" "text", "p_method" "text", "p_query_params" "jsonb", "p_response_status" integer, "p_response_size_bytes" integer, "p_exercises_returned" integer, "p_cache_hit" boolean, "p_cache_miss_reason" "text", "p_request_source" "text", "p_user_id" "uuid", "p_request_duration_ms" integer, "p_rate_limit_remaining" integer, "p_rate_limit_reset_at" timestamp with time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."mark_checklist_automate_onboardings"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF NEW.name = 'New Client Sign Up' AND NEW.is_active = true THEN
    UPDATE public.coach_getting_started_checklist
    SET automate_onboardings = true, updated_at = now()
    WHERE coach_id = NEW.coach_id AND automate_onboardings = false;
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."mark_checklist_automate_onboardings"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."mark_checklist_check_ins_forms_questionnaire"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  UPDATE public.coach_getting_started_checklist
  SET check_ins_forms = true, updated_at = now()
  WHERE coach_id = NEW.coach_id AND check_ins_forms = false;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."mark_checklist_check_ins_forms_questionnaire"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."mark_checklist_custom_exercises"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  UPDATE public.coach_getting_started_checklist
  SET custom_exercises = true, updated_at = now()
  WHERE coach_id = NEW.coach_id AND custom_exercises = false;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."mark_checklist_custom_exercises"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."mark_checklist_lifestyle_habits"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  UPDATE public.coach_getting_started_checklist
  SET lifestyle_habits = true, updated_at = now()
  WHERE coach_id = NEW.coach_id AND lifestyle_habits = false;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."mark_checklist_lifestyle_habits"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."mark_checklist_on_demand_resources"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  UPDATE public.coach_getting_started_checklist
  SET on_demand_resources = true, updated_at = now()
  WHERE coach_id = NEW.coach_id AND on_demand_resources = false;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."mark_checklist_on_demand_resources"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."mark_checklist_powerful_flows"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF NEW.name != 'New Client Sign Up' AND NEW.is_active = true THEN
    UPDATE public.coach_getting_started_checklist
    SET powerful_flows = true, updated_at = now()
    WHERE coach_id = NEW.coach_id AND powerful_flows = false;
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."mark_checklist_powerful_flows"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."mark_checklist_program_templates"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  UPDATE public.coach_getting_started_checklist
  SET program_templates = true, updated_at = now()
  WHERE coach_id = NEW.coach_id AND program_templates = false;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."mark_checklist_program_templates"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."mark_checklist_track_metrics"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  UPDATE public.coach_getting_started_checklist
  SET track_metrics = true, updated_at = now()
  WHERE coach_id = NEW.coach_id AND track_metrics = false;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."mark_checklist_track_metrics"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."mark_checklist_workout_ai"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  UPDATE public.coach_getting_started_checklist
  SET workout_ai = true, updated_at = now()
  WHERE coach_id = NEW.coach_id AND workout_ai = false;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."mark_checklist_workout_ai"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."mark_message_attachments_ready"("p_message_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  UPDATE public.messages
  SET attachments_ready = TRUE
  WHERE id = p_message_id;
END;
$$;


ALTER FUNCTION "public"."mark_message_attachments_ready"("p_message_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."protect_checkin_review_fields"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
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


ALTER FUNCTION "public"."protect_checkin_review_fields"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."protect_client_profile_fields"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF auth.uid() = OLD.client_id THEN
    IF NEW.created_at IS DISTINCT FROM OLD.created_at THEN RAISE EXCEPTION 'Clients cannot change profile creation date.'; END IF;
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."protect_client_profile_fields"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."record_musclewiki_exercise_access"("p_musclewiki_id" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  UPDATE public.musclewiki_exercise_cache
  SET
    last_accessed_at = now(),
    access_count = access_count + 1
  WHERE musclewiki_id = p_musclewiki_id;
END;
$$;


ALTER FUNCTION "public"."record_musclewiki_exercise_access"("p_musclewiki_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."resolve_coach_item_name_conflict"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $_$
DECLARE
    base_name TEXT;
    target_name TEXT;
    counter INTEGER := 2;
    exists_already BOOLEAN;
BEGIN
    base_name := NEW.name;
    target_name := base_name;

    -- Look for conflicts within the same coach's library
    LOOP
        EXECUTE format(
            'SELECT EXISTS (SELECT 1 FROM public.%I WHERE coach_id = $1 AND lower(name) = lower($2) AND id IS DISTINCT FROM $3)',
            TG_TABLE_NAME
        )
        INTO exists_already
        USING NEW.coach_id, target_name, NEW.id;

        IF NOT exists_already THEN
            EXIT;
        END IF;

        -- Conflict found.
        -- First attempt: Append " Copy"
        -- Subsequent attempts: Append " Copy 2", " Copy 3", etc.
        
        -- If we are at the first conflict with the original name, try " Copy"
        IF target_name = base_name THEN
            target_name := base_name || ' Copy';
        ELSE
            -- We already tried " Copy" or " Copy N", try the next one
            -- Note: To keep it simple and robust, we just restart loop with " Copy N" logic
            -- but since we are inside a loop, we can just track state or try next candidate.
            -- This simple logic below works for "Name" -> "Name Copy" -> "Name Copy 2"
            
            target_name := base_name || ' Copy ' || counter;
            counter := counter + 1;
        END IF;
    END LOOP;

    NEW.name := target_name;
    RETURN NEW;
END;
$_$;


ALTER FUNCTION "public"."resolve_coach_item_name_conflict"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_client_item_coach_id"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
  IF NEW.coach_id IS NULL THEN
    SELECT cca.coach_id INTO NEW.coach_id
    FROM public.coach_client_assignments cca
    WHERE cca.client_id = NEW.client_id
    LIMIT 1;
    
    IF NEW.coach_id IS NULL THEN
      RAISE EXCEPTION 'client_id % has no coach assignment', NEW.client_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_client_item_coach_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_habit_log_updated_fields"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
  NEW.updated_by := auth.uid();
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_habit_log_updated_fields"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_training_summary_updated_by"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
  NEW.updated_by := auth.uid();
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_training_summary_updated_by"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."should_populate_exercise_cache"() RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_total_cached INTEGER;
  v_expired_count INTEGER;
  v_last_population TIMESTAMPTZ;
BEGIN
  SELECT COUNT(*) INTO v_total_cached
  FROM public.musclewiki_exercise_cache;

  IF v_total_cached < 100 THEN
    RETURN TRUE;
  END IF;

  SELECT COUNT(*) INTO v_expired_count
  FROM public.musclewiki_exercise_cache
  WHERE cache_expires_at < (now() + INTERVAL '2 days');

  IF v_expired_count > (v_total_cached * 0.1) THEN
    RETURN TRUE;
  END IF;

  SELECT started_at INTO v_last_population
  FROM public.musclewiki_cache_population_log
  WHERE status = 'success'
  ORDER BY started_at DESC
  LIMIT 1;

  IF v_last_population IS NULL OR v_last_population < (now() - INTERVAL '5 days') THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$;


ALTER FUNCTION "public"."should_populate_exercise_cache"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."start_exercise_cache_population"() RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO public.musclewiki_cache_population_log (status, triggered_by)
  VALUES ('running', 'cron')
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$;


ALTER FUNCTION "public"."start_exercise_cache_population"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trigger_exercise_cache_population"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_supabase_url TEXT;
  v_service_key TEXT;
BEGIN
  IF NOT public.should_populate_exercise_cache() THEN
    RAISE NOTICE 'Cache is up to date, skipping population';
    RETURN;
  END IF;

  BEGIN
    v_supabase_url := current_setting('app.settings.supabase_url', true);
    v_service_key := current_setting('app.settings.service_role_key', true);
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Supabase settings not configured. Set app.settings.supabase_url and app.settings.service_role_key';
    RETURN;
  END;

  IF v_supabase_url IS NULL OR v_service_key IS NULL THEN
    RAISE NOTICE 'Supabase URL or service key not configured';
    RETURN;
  END IF;

  PERFORM net.http_post(
    url := v_supabase_url || '/functions/v1/populate-exercise-cache',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_service_key
    ),
    body := jsonb_build_object('triggered_by', 'cron')
  );

  RAISE NOTICE 'Cache population triggered successfully';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Failed to trigger cache population: %', SQLERRM;
END;
$$;


ALTER FUNCTION "public"."trigger_exercise_cache_population"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_conversation_on_message"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  UPDATE public.conversations
  SET
    last_message_at = NEW.sent_at,
    last_message_type = NEW.message_type,
    last_message_sender_id = NEW.sender_id,
    last_message_preview = CASE
      WHEN NEW.is_deleted THEN NULL
      WHEN NEW.message_type = 'text' THEN LEFT(NEW.content, 100)
      WHEN NEW.message_type = 'image' THEN '📷 Photo'
      WHEN NEW.message_type = 'video' THEN '🎥 Video'
      WHEN NEW.message_type = 'audio' THEN '🎵 Voice Message'
      WHEN NEW.message_type = 'file' THEN '📎 File'
      ELSE 'Message'
    END,
    updated_at = now()
  WHERE id = NEW.conversation_id;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_conversation_on_message"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."update_conversation_on_message"() IS 'Updates conversation preview when a new message is sent. Uses SECURITY DEFINER to bypass RLS.';



CREATE OR REPLACE FUNCTION "public"."update_message_status_on_read"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
  -- Update all unread messages sent before the new read time
  UPDATE public.messages
  SET
    status = 'read',
    read_at = NEW.last_read_at
  WHERE conversation_id = NEW.conversation_id
    AND sender_id <> NEW.user_id -- Not the reader's own messages
    AND sent_at <= NEW.last_read_at
    AND status = 'sent'; -- Only update if not already read

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_message_status_on_read"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_coach_role"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.coach_profiles
    WHERE coach_id = NEW.coach_id
  ) THEN
    RAISE EXCEPTION 'Referenced user is not a coach.';
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."validate_coach_role"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."client_profiles" (
    "client_id" "uuid" NOT NULL,
    "date_of_birth" "date",
    "gender" "text",
    "height_cm" integer,
    "phone" "text",
    "country" "text",
    "unit_system" "text" DEFAULT 'metric'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "client_profiles_gender_check" CHECK (("gender" = ANY (ARRAY['male'::"text", 'female'::"text", 'other'::"text", 'prefer_not_to_say'::"text"]))),
    CONSTRAINT "client_profiles_unit_system_check" CHECK (("unit_system" = ANY (ARRAY['metric'::"text", 'imperial'::"text"])))
);

ALTER TABLE ONLY "public"."client_profiles" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."client_profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."client_training_summary" (
    "client_id" "uuid" NOT NULL,
    "last_activity" timestamp with time zone,
    "last_7_days_training_completed" integer DEFAULT 0 NOT NULL,
    "last_7_days_training_total" integer DEFAULT 0 NOT NULL,
    "last_30_days_training_completed" integer DEFAULT 0 NOT NULL,
    "last_30_days_training_total" integer DEFAULT 0 NOT NULL,
    "updated_by" "uuid",
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "chk_counts" CHECK ((("last_7_days_training_completed" >= 0) AND ("last_7_days_training_total" >= 0) AND ("last_30_days_training_completed" >= 0) AND ("last_30_days_training_total" >= 0) AND ("last_7_days_training_completed" <= "last_7_days_training_total") AND ("last_30_days_training_completed" <= "last_30_days_training_total")))
);

ALTER TABLE ONLY "public"."client_training_summary" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."client_training_summary" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."coach_client_assignments" (
    "coach_id" "uuid" NOT NULL,
    "client_id" "uuid" NOT NULL,
    "category" "text",
    "status" "text" DEFAULT 'invited'::"text" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "is_archived" boolean DEFAULT false NOT NULL,
    "invitation_sent_at" timestamp with time zone,
    "connected_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "invitation_token" character varying(8),
    "email_bounced_at" timestamp with time zone,
    CONSTRAINT "check_no_self_assignment" CHECK (("coach_id" <> "client_id")),
    CONSTRAINT "coach_client_assignments_category_check" CHECK ((("category" IS NULL) OR ("category" = ANY (ARRAY['online'::"text", 'in-person'::"text", 'hybrid'::"text"])))),
    CONSTRAINT "coach_client_assignments_status_check" CHECK (("status" = ANY (ARRAY['invited'::"text", 'accepted'::"text", 'bounced'::"text", 'connected'::"text", 'archived'::"text"])))
);

ALTER TABLE ONLY "public"."coach_client_assignments" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."coach_client_assignments" OWNER TO "postgres";


COMMENT ON COLUMN "public"."coach_client_assignments"."category" IS 'Training category: online, in-person, or hybrid. NULL when client first signs up; coach sets this later based on training arrangement.';



COMMENT ON COLUMN "public"."coach_client_assignments"."status" IS 'Client relationship status:
- invited: Coach sent invite, stub created, awaiting signup
- bounced: Email delivery failed (future use)
- accepted: Client signed up, conversation created, visible to coach
- connected: Active engagement (future use)
- archived: Relationship soft-deleted';



COMMENT ON COLUMN "public"."coach_client_assignments"."invitation_token" IS '8-character invitation code for client invites. Set explicitly by application code when creating invitations. NULL for non-invited relationships.';



COMMENT ON COLUMN "public"."coach_client_assignments"."email_bounced_at" IS 'Timestamp when email delivery failed (for future email service integration)';



CREATE TABLE IF NOT EXISTS "public"."user_profiles" (
    "id" "uuid" NOT NULL,
    "user_type" character varying(20) NOT NULL,
    "email" character varying(255) NOT NULL,
    "name" character varying(200) NOT NULL,
    "profile_picture_url" "text",
    "signin_method" character varying(20) NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "user_profiles_signin_method_check" CHECK ((("signin_method")::"text" = ANY (ARRAY[('email'::character varying)::"text", ('google'::character varying)::"text", ('apple'::character varying)::"text"]))),
    CONSTRAINT "user_profiles_user_type_check" CHECK ((("user_type")::"text" = ANY ((ARRAY['coach'::character varying, 'client'::character varying])::"text"[])))
);


ALTER TABLE "public"."user_profiles" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."athletes_grid_view" WITH ("security_invoker"='true') AS
 SELECT "cp"."client_id" AS "id",
    "up"."name",
    "up"."profile_picture_url" AS "avatar",
    "up"."email",
    "cts"."last_activity",
    COALESCE("cts"."last_7_days_training_completed", 0) AS "last7DaysTraining",
    COALESCE("cts"."last_30_days_training_completed", 0) AS "last30DaysTraining",
    "cp"."phone",
    "cp"."country",
    "cp"."gender",
    "cp"."height_cm",
    "cca"."category",
    "cca"."is_active",
    "cca"."is_archived",
    (("cca"."status" = 'accepted'::"text") OR ("cca"."status" = 'connected'::"text")) AS "connected",
    "cca"."status" AS "connectionStatus",
        CASE
            WHEN ("cca"."connected_at" IS NOT NULL) THEN (CURRENT_DATE - ("cca"."connected_at")::"date")
            ELSE 0
        END AS "clientFor",
        CASE
            WHEN ("cp"."date_of_birth" IS NOT NULL) THEN (EXTRACT(year FROM "age"(("cp"."date_of_birth")::timestamp with time zone)))::integer
            ELSE NULL::integer
        END AS "age",
    "cca"."coach_id",
    "cp"."created_at",
    "cp"."updated_at"
   FROM ((("public"."client_profiles" "cp"
     LEFT JOIN "public"."user_profiles" "up" ON (("cp"."client_id" = "up"."id")))
     LEFT JOIN "public"."client_training_summary" "cts" ON (("cp"."client_id" = "cts"."client_id")))
     LEFT JOIN "public"."coach_client_assignments" "cca" ON (("cp"."client_id" = "cca"."client_id")));


ALTER VIEW "public"."athletes_grid_view" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."available_notification_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "event_key" "text" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "category" "text" DEFAULT 'general'::"text" NOT NULL,
    "default_enabled" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

ALTER TABLE ONLY "public"."available_notification_events" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."available_notification_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."client_bio" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "client_id" "uuid" NOT NULL,
    "coach_id" "uuid" NOT NULL,
    "bio" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

ALTER TABLE ONLY "public"."client_bio" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."client_bio" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."client_checkin_logs" (
    "client_id" "uuid" NOT NULL,
    "coach_id" "uuid" NOT NULL,
    "submission_date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "answers" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "status" "text" DEFAULT 'assigned'::"text" NOT NULL,
    "coach_comment" "text",
    "reviewed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "assignment_id" "uuid" NOT NULL,
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    CONSTRAINT "client_checkin_logs_status_check" CHECK (("status" = ANY (ARRAY['assigned'::"text", 'review'::"text", 'reviewed'::"text"])))
);

ALTER TABLE ONLY "public"."client_checkin_logs" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."client_checkin_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."client_checkins" (
    "client_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "coach_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "questions" "jsonb" DEFAULT '[]'::"jsonb",
    "schedule_config" "jsonb",
    "cron_expression" "text",
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL
);

ALTER TABLE ONLY "public"."client_checkins" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."client_checkins" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."client_files" (
    "client_id" "uuid" NOT NULL,
    "display_name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "bucket_id" "text" DEFAULT 'coach_files'::"text",
    "file_path" "text" NOT NULL,
    "mime_type" "text",
    "size" bigint,
    "coach_id" "uuid" NOT NULL,
    "filename" "text" NOT NULL,
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL
);

ALTER TABLE ONLY "public"."client_files" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."client_files" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."client_goals" (
    "client_id" "uuid" NOT NULL,
    "coach_id" "uuid" NOT NULL,
    "goal" "text" NOT NULL,
    "target_date" "date",
    "achieved" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "details" "text"
);

ALTER TABLE ONLY "public"."client_goals" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."client_goals" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."client_habit_logs" (
    "client_id" "uuid" NOT NULL,
    "coach_id" "uuid" NOT NULL,
    "date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "completed" boolean DEFAULT false NOT NULL,
    "created_by" "uuid" DEFAULT "auth"."uid"(),
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_by" "uuid",
    "updated_at" timestamp with time zone,
    "assignment_id" "uuid" NOT NULL,
    "value" numeric,
    "status" "text",
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    CONSTRAINT "client_habit_logs_status_check" CHECK (("status" = ANY (ARRAY['completed'::"text", 'skipped'::"text", 'partial'::"text"])))
);

ALTER TABLE ONLY "public"."client_habit_logs" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."client_habit_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."client_habits" (
    "client_id" "uuid" NOT NULL,
    "custom_schedule" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "amount" numeric,
    "unit" "text",
    "period" "text",
    "coach_id" "uuid" NOT NULL,
    "schedule_type" "text",
    "days_of_week" smallint[],
    "times_of_day" time without time zone[],
    "timezone" "text" DEFAULT 'UTC'::"text",
    "start_date" "date",
    "end_date" "date",
    "schedule_config" "jsonb" DEFAULT '{}'::"jsonb",
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    CONSTRAINT "client_habit_assignments_period_check" CHECK (("period" = ANY (ARRAY['daily'::"text", 'weekly'::"text"]))),
    CONSTRAINT "client_habits_schedule_type_check" CHECK (("schedule_type" = ANY (ARRAY['daily'::"text", 'weekly'::"text", 'custom'::"text"])))
);

ALTER TABLE ONLY "public"."client_habits" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."client_habits" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."client_injuries" (
    "client_id" "uuid" NOT NULL,
    "coach_id" "uuid" NOT NULL,
    "injury" "text" NOT NULL,
    "status" "text",
    "date" "date",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "details" "text"
);

ALTER TABLE ONLY "public"."client_injuries" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."client_injuries" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."client_metric_logs" (
    "client_id" "uuid" NOT NULL,
    "coach_id" "uuid" NOT NULL,
    "value" numeric NOT NULL,
    "date" "date" DEFAULT "now"() NOT NULL,
    "created_by" "uuid" DEFAULT "auth"."uid"(),
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "assignment_id" "uuid" NOT NULL,
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL
);

ALTER TABLE ONLY "public"."client_metric_logs" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."client_metric_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."client_metrics" (
    "client_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "name" "text" NOT NULL,
    "unit" "text",
    "description" "text",
    "value_kind" "text",
    "coach_id" "uuid" NOT NULL,
    "min_value" numeric,
    "max_value" numeric,
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "cron_expression" "text",
    "schedule_config" "jsonb" DEFAULT '{}'::"jsonb",
    CONSTRAINT "client_metric_assignments_value_kind_check" CHECK (("value_kind" = ANY (ARRAY['number'::"text", 'percent'::"text", 'duration'::"text", 'score'::"text"])))
);

ALTER TABLE ONLY "public"."client_metrics" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."client_metrics" OWNER TO "postgres";


COMMENT ON COLUMN "public"."client_metrics"."cron_expression" IS 'Cron expression for metric logging schedule';



COMMENT ON COLUMN "public"."client_metrics"."schedule_config" IS 'JSON configuration for schedule UI state (frequency, selectedDays, monthlyOption, etc.)';



CREATE TABLE IF NOT EXISTS "public"."client_notes" (
    "client_id" "uuid" NOT NULL,
    "coach_id" "uuid" NOT NULL,
    "is_pinned" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "title" "text" NOT NULL,
    "body" "text",
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL
);

ALTER TABLE ONLY "public"."client_notes" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."client_notes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."client_photo_logs" (
    "client_id" "uuid" NOT NULL,
    "coach_id" "uuid" NOT NULL,
    "date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "front_photo_path" "text",
    "side_photo_path" "text",
    "back_photo_path" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL
);

ALTER TABLE ONLY "public"."client_photo_logs" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."client_photo_logs" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."client_profiles_full" WITH ("security_invoker"='true') AS
 SELECT "cp"."client_id",
    "up"."email",
    COALESCE("up"."name", ''::character varying) AS "name",
    "up"."profile_picture_url",
    COALESCE("up"."signin_method", 'email'::character varying) AS "signin_method",
    "cp"."date_of_birth",
    "cp"."gender",
    "cp"."height_cm",
    "cp"."phone",
    "cp"."country",
    "cp"."unit_system",
    "cp"."created_at",
    "cp"."updated_at"
   FROM ("public"."client_profiles" "cp"
     LEFT JOIN "public"."user_profiles" "up" ON (("up"."id" = "cp"."client_id")));


ALTER VIEW "public"."client_profiles_full" OWNER TO "postgres";


COMMENT ON VIEW "public"."client_profiles_full" IS 'Complete client profile view merging client_profiles with user_profiles.
Use this view to get full client data including name, email, and profile picture.';



CREATE TABLE IF NOT EXISTS "public"."client_questionnaire_logs" (
    "client_id" "uuid" NOT NULL,
    "coach_id" "uuid" NOT NULL,
    "answers" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "status" "text" DEFAULT 'assigned'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "assignment_id" "uuid" NOT NULL,
    "submission_date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    CONSTRAINT "client_questionnaire_logs_status_check" CHECK (("status" = ANY (ARRAY['assigned'::"text", 'in-progress'::"text", 'completed'::"text"])))
);

ALTER TABLE ONLY "public"."client_questionnaire_logs" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."client_questionnaire_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."client_questionnaires" (
    "client_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "coach_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "questions" "jsonb" DEFAULT '[]'::"jsonb",
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL
);

ALTER TABLE ONLY "public"."client_questionnaires" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."client_questionnaires" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."client_training" (
    "client_id" "uuid" NOT NULL,
    "date" "date" NOT NULL,
    "coach_id" "uuid" NOT NULL,
    "training_data" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "chk_training_data_is_object" CHECK (("jsonb_typeof"("training_data") = 'object'::"text"))
);

ALTER TABLE ONLY "public"."client_training" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."client_training" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."client_training_exercise_history" (
    "client_id" "uuid" NOT NULL,
    "coach_id" "uuid" NOT NULL,
    "date" "date" NOT NULL,
    "workout_id" "text" NOT NULL,
    "workout_name" "text" NOT NULL,
    "exercise_id" "text" NOT NULL,
    "exercise_data" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "row_id" bigint NOT NULL,
    CONSTRAINT "chk_exercise_data_is_object" CHECK (("jsonb_typeof"("exercise_data") = 'object'::"text"))
);

ALTER TABLE ONLY "public"."client_training_exercise_history" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."client_training_exercise_history" OWNER TO "postgres";


ALTER TABLE "public"."client_training_exercise_history" ALTER COLUMN "row_id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."client_training_exercise_history_row_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."client_training_history" (
    "client_id" "uuid" NOT NULL,
    "coach_id" "uuid" NOT NULL,
    "date" "date" NOT NULL,
    "workout_id" "text" NOT NULL,
    "status" "text" DEFAULT 'not_started'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "client_training_history_status_check" CHECK (("status" = ANY (ARRAY['in_progress'::"text", 'completed'::"text", 'missed'::"text"])))
);

ALTER TABLE ONLY "public"."client_training_history" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."client_training_history" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."client_updates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "client_id" "uuid" NOT NULL,
    "coach_id" "uuid" NOT NULL,
    "update" "text" NOT NULL,
    "update_timestamp" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."client_updates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."coach_auto_todolist" (
    "coach_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "type" "text" NOT NULL,
    "client_id" "uuid",
    "completed" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "client_user_type" character varying(20) DEFAULT 'client'::character varying,
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    CONSTRAINT "chk_cat_type_client" CHECK (((("type" = 'general'::"text") AND ("client_id" IS NULL)) OR (("type" = 'client'::"text") AND ("client_id" IS NOT NULL)))),
    CONSTRAINT "coach_auto_todolist_client_user_type_check" CHECK ((("client_user_type")::"text" = 'client'::"text")),
    CONSTRAINT "coach_auto_todolist_type_check" CHECK (("type" = ANY (ARRAY['client'::"text", 'general'::"text"])))
);

ALTER TABLE ONLY "public"."coach_auto_todolist" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."coach_auto_todolist" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."coach_checkins" (
    "coach_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "schedule_config" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "cron_expression" "text",
    "questions" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "num_of_questions" integer DEFAULT 0,
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL
);

ALTER TABLE ONLY "public"."coach_checkins" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."coach_checkins" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."coach_checkins_review_view" WITH ("security_invoker"='true') AS
 SELECT "ccl"."id" AS "log_id",
    "ccl"."client_id",
    "ccl"."assignment_id",
    "ccl"."submission_date",
    "ccl"."answers",
    "ccl"."status" AS "review_status",
    "ccl"."coach_comment",
    "up"."name" AS "client_name",
    "up"."profile_picture_url" AS "client_avatar",
    "cc"."name" AS "checkin_name",
    "ccl"."coach_id"
   FROM (("public"."client_checkin_logs" "ccl"
     JOIN "public"."client_checkins" "cc" ON (("ccl"."assignment_id" = "cc"."id")))
     JOIN "public"."user_profiles" "up" ON (("up"."id" = "ccl"."client_id")))
  WHERE ("ccl"."status" = 'review'::"text");


ALTER VIEW "public"."coach_checkins_review_view" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."coach_clients_view" WITH ("security_invoker"='true') AS
 SELECT "cca"."coach_id",
    "cca"."client_id",
    "cca"."category",
    "cca"."status",
    "cca"."is_active",
    "cca"."is_archived",
    "cca"."invitation_sent_at",
    "cca"."connected_at",
    "cca"."invitation_token",
    "cca"."created_at",
    "cca"."updated_at",
    "cp"."date_of_birth",
    "cp"."gender",
    "cp"."height_cm",
    "cp"."phone",
    "cp"."country",
    "cp"."unit_system",
    COALESCE("up"."name", "up"."email") AS "full_name",
    "up"."email",
    "up"."profile_picture_url" AS "avatar_url",
    "cts"."last_activity",
    "cts"."last_7_days_training_completed",
    "cts"."last_7_days_training_total",
    "cts"."last_30_days_training_completed",
    "cts"."last_30_days_training_total"
   FROM ((("public"."coach_client_assignments" "cca"
     LEFT JOIN "public"."client_profiles" "cp" ON (("cp"."client_id" = "cca"."client_id")))
     LEFT JOIN "public"."user_profiles" "up" ON (("up"."id" = "cca"."client_id")))
     LEFT JOIN "public"."client_training_summary" "cts" ON (("cts"."client_id" = "cca"."client_id")));


ALTER VIEW "public"."coach_clients_view" OWNER TO "postgres";


COMMENT ON VIEW "public"."coach_clients_view" IS 'Coach view of all their clients with merged profile data from user_profiles.';



CREATE TABLE IF NOT EXISTS "public"."coach_company_information" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "coach_id" "uuid" NOT NULL,
    "company_name" "text",
    "website" "text",
    "linkedin" "text",
    "location" "text",
    "specialities" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "logo_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

ALTER TABLE ONLY "public"."coach_company_information" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."coach_company_information" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."coach_exercises" (
    "coach_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "category" "text",
    "muscle_group" "text"[],
    "video_link" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "is_favourite" boolean DEFAULT false NOT NULL,
    "difficulty" "text"
);

ALTER TABLE ONLY "public"."coach_exercises" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."coach_exercises" OWNER TO "postgres";


COMMENT ON COLUMN "public"."coach_exercises"."category" IS 'Equipment type from MuscleWiki: Barbell, Bodyweight, Cables, Dumbbells, etc.';



COMMENT ON COLUMN "public"."coach_exercises"."muscle_group" IS 'Target muscles from MuscleWiki: Chest, Back, Shoulders, etc.';



COMMENT ON COLUMN "public"."coach_exercises"."difficulty" IS 'Difficulty level from MuscleWiki: Novice, Intermediate, Advanced';



CREATE TABLE IF NOT EXISTS "public"."coach_files" (
    "coach_id" "uuid" NOT NULL,
    "bucket_id" "text" DEFAULT 'coach_files'::"text" NOT NULL,
    "file_path" "text" NOT NULL,
    "filename" "text" NOT NULL,
    "mime_type" "text",
    "size" bigint,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    CONSTRAINT "chk_bucket_id" CHECK (("bucket_id" = 'coach_files'::"text"))
);

ALTER TABLE ONLY "public"."coach_files" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."coach_files" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."coach_flows" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "coach_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "flow_data" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

ALTER TABLE ONLY "public"."coach_flows" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."coach_flows" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."coach_getting_started_checklist" (
    "coach_id" "uuid" NOT NULL,
    "client_app_demo" boolean DEFAULT false NOT NULL,
    "coach_app_demo" boolean DEFAULT false NOT NULL,
    "workout_ai" boolean DEFAULT false NOT NULL,
    "program_templates" boolean DEFAULT false NOT NULL,
    "custom_exercises" boolean DEFAULT false NOT NULL,
    "automate_onboardings" boolean DEFAULT false NOT NULL,
    "check_ins_forms" boolean DEFAULT false NOT NULL,
    "powerful_flows" boolean DEFAULT false NOT NULL,
    "lifestyle_habits" boolean DEFAULT false NOT NULL,
    "track_metrics" boolean DEFAULT false NOT NULL,
    "on_demand_resources" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

ALTER TABLE ONLY "public"."coach_getting_started_checklist" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."coach_getting_started_checklist" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."coach_habits" (
    "coach_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "schedule_type" "text" DEFAULT 'daily'::"text" NOT NULL,
    "days_of_week" smallint[],
    "times_of_day" time without time zone[],
    "timezone" "text" DEFAULT 'UTC'::"text" NOT NULL,
    "start_date" "date" DEFAULT CURRENT_DATE,
    "end_date" "date",
    "schedule_config" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    CONSTRAINT "chk_days_of_week" CHECK ((("days_of_week" IS NULL) OR ("days_of_week" <@ ARRAY[(0)::smallint, (1)::smallint, (2)::smallint, (3)::smallint, (4)::smallint, (5)::smallint, (6)::smallint]))),
    CONSTRAINT "chk_habit_dates" CHECK ((("end_date" IS NULL) OR ("start_date" IS NULL) OR ("start_date" <= "end_date"))),
    CONSTRAINT "coach_habits_schedule_type_check" CHECK (("schedule_type" = ANY (ARRAY['daily'::"text", 'weekly'::"text", 'custom'::"text"])))
);

ALTER TABLE ONLY "public"."coach_habits" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."coach_habits" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."coach_metrics" (
    "coach_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "unit" "text",
    "description" "text",
    "value_kind" "text" DEFAULT 'number'::"text" NOT NULL,
    "min_value" numeric,
    "max_value" numeric,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "cron_expression" "text",
    "schedule_config" "jsonb" DEFAULT '{}'::"jsonb",
    CONSTRAINT "chk_metric_range" CHECK ((("min_value" IS NULL) OR ("max_value" IS NULL) OR ("min_value" <= "max_value"))),
    CONSTRAINT "coach_metrics_value_kind_check" CHECK (("value_kind" = ANY (ARRAY['number'::"text", 'percent'::"text", 'duration'::"text", 'score'::"text"])))
);

ALTER TABLE ONLY "public"."coach_metrics" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."coach_metrics" OWNER TO "postgres";


COMMENT ON COLUMN "public"."coach_metrics"."cron_expression" IS 'Cron expression for metric logging schedule (default for new assignments)';



COMMENT ON COLUMN "public"."coach_metrics"."schedule_config" IS 'JSON configuration for schedule UI state (frequency, selectedDays, monthlyOption, etc.)';



CREATE TABLE IF NOT EXISTS "public"."coach_notification_preferences" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "coach_id" "uuid" NOT NULL,
    "event_id" "uuid" NOT NULL,
    "enabled" boolean NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

ALTER TABLE ONLY "public"."coach_notification_preferences" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."coach_notification_preferences" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."coach_own_todolist" (
    "coach_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "information" "text",
    "type" "text" NOT NULL,
    "client_id" "uuid",
    "due_date" timestamp with time zone NOT NULL,
    "completed" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "client_user_type" character varying(20) DEFAULT 'client'::character varying,
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    CONSTRAINT "chk_cot_type_client" CHECK (((("type" = 'general'::"text") AND ("client_id" IS NULL)) OR (("type" = 'client'::"text") AND ("client_id" IS NOT NULL)))),
    CONSTRAINT "coach_own_todolist_client_user_type_check" CHECK ((("client_user_type")::"text" = 'client'::"text")),
    CONSTRAINT "coach_own_todolist_type_check" CHECK (("type" = ANY (ARRAY['client'::"text", 'general'::"text"])))
);

ALTER TABLE ONLY "public"."coach_own_todolist" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."coach_own_todolist" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."coach_preferences" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "coach_id" "uuid" NOT NULL,
    "theme" "text" DEFAULT 'light'::"text" NOT NULL,
    "language" "text" DEFAULT 'en'::"text" NOT NULL,
    "units" "text" DEFAULT 'metric'::"text" NOT NULL,
    "color_preset" "text" DEFAULT 'default'::"text" NOT NULL,
    "timezone" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

ALTER TABLE ONLY "public"."coach_preferences" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."coach_preferences" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."coach_profiles" (
    "id" "uuid" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "is_archived" boolean DEFAULT false NOT NULL,
    "status" character varying(20) DEFAULT 'active'::character varying,
    "unique_code" character varying(20),
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "getting_started_checklist_complete" boolean DEFAULT false NOT NULL,
    CONSTRAINT "coach_profiles_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['active'::character varying, 'inactive'::character varying, 'pending'::character varying])::"text"[])))
);


ALTER TABLE "public"."coach_profiles" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."coach_profiles_full" WITH ("security_invoker"='true') AS
 SELECT "cp"."id",
    "up"."email",
    COALESCE("up"."name", ''::character varying) AS "name",
    "up"."profile_picture_url",
    COALESCE("up"."signin_method", 'email'::character varying) AS "signin_method",
    "cp"."is_active",
    "cp"."is_archived",
    "cp"."status",
    "cp"."unique_code",
    "cp"."getting_started_checklist_complete",
    "cp"."created_at",
    "cp"."updated_at"
   FROM ("public"."coach_profiles" "cp"
     LEFT JOIN "public"."user_profiles" "up" ON ((("up"."id" = "cp"."id") AND (("up"."user_type")::"text" = 'coach'::"text"))));


ALTER VIEW "public"."coach_profiles_full" OWNER TO "postgres";


COMMENT ON VIEW "public"."coach_profiles_full" IS 'Complete coach profile view merging coach_profiles with user_profiles.
Use this view to get full coach data including name, email, and profile picture.';



CREATE TABLE IF NOT EXISTS "public"."coach_programs" (
    "coach_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "program_data" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "is_favourite" boolean DEFAULT false NOT NULL,
    "type" "text",
    "difficulty" "text",
    "weeks" integer,
    "total_workouts" integer DEFAULT 0
);

ALTER TABLE ONLY "public"."coach_programs" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."coach_programs" OWNER TO "postgres";


COMMENT ON COLUMN "public"."coach_programs"."program_data" IS 'Program structure containing only the days/schema array';



COMMENT ON COLUMN "public"."coach_programs"."type" IS 'Program type (e.g., strength, hypertrophy, endurance)';



COMMENT ON COLUMN "public"."coach_programs"."difficulty" IS 'Program difficulty level (e.g., beginner, intermediate, advanced)';



COMMENT ON COLUMN "public"."coach_programs"."weeks" IS 'Total number of weeks in the program';



CREATE TABLE IF NOT EXISTS "public"."coach_questionnaires" (
    "coach_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "questions" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "num_of_questions" integer DEFAULT 0,
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL
);

ALTER TABLE ONLY "public"."coach_questionnaires" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."coach_questionnaires" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."coach_sections" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "coach_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "section_type" "text" NOT NULL,
    "section_data" "jsonb" DEFAULT '{"items": []}'::"jsonb" NOT NULL,
    "number_of_exercises" integer DEFAULT 0 NOT NULL,
    "is_favourite" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "coach_sections_section_type_check" CHECK (("section_type" = ANY (ARRAY['regular'::"text", 'amrap'::"text", 'tabata'::"text", 'hiit'::"text", 'emom'::"text", 'circuits'::"text"])))
);


ALTER TABLE "public"."coach_sections" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."coach_unique_codes" (
    "coach_id" "uuid" NOT NULL,
    "code" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."coach_unique_codes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."coach_workouts" (
    "coach_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "workout_data" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "total_exercises" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "type" "text",
    "equipment" "text"[],
    "difficulty" "text",
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "is_favourite" boolean DEFAULT false NOT NULL
);

ALTER TABLE ONLY "public"."coach_workouts" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."coach_workouts" OWNER TO "postgres";


COMMENT ON COLUMN "public"."coach_workouts"."workout_data" IS 'Workout structure containing only sections array and execution tracking fields';



CREATE TABLE IF NOT EXISTS "public"."conversation_participants" (
    "conversation_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "other_user_id" "uuid" NOT NULL,
    "is_archived" boolean DEFAULT false NOT NULL,
    "is_muted" boolean DEFAULT false NOT NULL,
    "is_pinned" boolean DEFAULT false NOT NULL,
    "archived_at" timestamp with time zone,
    "muted_at" timestamp with time zone,
    "pinned_at" timestamp with time zone,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "chk_cp_no_self" CHECK (("user_id" <> "other_user_id"))
);


ALTER TABLE "public"."conversation_participants" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."conversations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "coach_id" "uuid" NOT NULL,
    "client_id" "uuid" NOT NULL,
    "last_message_at" timestamp with time zone,
    "last_message_preview" "text",
    "last_message_type" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "last_message_sender_id" "uuid",
    CONSTRAINT "chk_no_self_messaging" CHECK (("coach_id" <> "client_id"))
);


ALTER TABLE "public"."conversations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."feature_request_replies" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "feature_request_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "user_name" "text" NOT NULL,
    "user_type" "text" NOT NULL,
    "profile_picture_url" "text",
    "message" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "feature_request_replies_user_type_check" CHECK (("user_type" = ANY (ARRAY['coach'::"text", 'client'::"text"])))
);


ALTER TABLE "public"."feature_request_replies" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."feature_request_upvotes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "feature_request_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."feature_request_upvotes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."feature_requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "upvote_count" integer DEFAULT 0 NOT NULL,
    "user_id" "uuid" NOT NULL,
    "user_name" "text" NOT NULL,
    "user_type" "text" NOT NULL,
    "profile_picture_url" "text",
    "status" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "feature_requests_status_check" CHECK (("status" = ANY (ARRAY[NULL::"text", 'in_progress'::"text", 'completed'::"text"]))),
    CONSTRAINT "feature_requests_user_type_check" CHECK (("user_type" = ANY (ARRAY['coach'::"text", 'client'::"text"])))
);


ALTER TABLE "public"."feature_requests" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."message_attachments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "message_id" "uuid" NOT NULL,
    "conversation_id" "uuid" NOT NULL,
    "bucket_id" "text" DEFAULT 'message_attachments'::"text" NOT NULL,
    "file_path" "text" NOT NULL,
    "filename" "text" NOT NULL,
    "mime_type" "text",
    "size_bytes" bigint,
    "thumbnail_path" "text",
    "width" integer,
    "height" integer,
    "duration_seconds" integer,
    "upload_status" "text" DEFAULT 'completed'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "chk_bucket_id" CHECK (("bucket_id" = 'message_attachments'::"text")),
    CONSTRAINT "chk_file_path_format" CHECK (("file_path" ~ '^[0-9a-f-]+/[0-9a-f-]+/.+$'::"text")),
    CONSTRAINT "message_attachments_upload_status_check" CHECK (("upload_status" = ANY (ARRAY['pending'::"text", 'uploading'::"text", 'completed'::"text", 'failed'::"text"])))
);


ALTER TABLE "public"."message_attachments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."message_reactions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "message_id" "uuid" NOT NULL,
    "conversation_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "reaction" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "message_reactions_reaction_check" CHECK (("reaction" = ANY (ARRAY['👍'::"text", '❤️'::"text", '😂'::"text", '😮'::"text", '😢'::"text", '🙏'::"text"])))
);


ALTER TABLE "public"."message_reactions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."message_read_receipts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "conversation_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "last_read_message_id" "uuid",
    "last_read_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."message_read_receipts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "conversation_id" "uuid" NOT NULL,
    "sender_id" "uuid" NOT NULL,
    "content" "text",
    "message_type" "text" DEFAULT 'text'::"text" NOT NULL,
    "parent_message_id" "uuid",
    "status" "text" DEFAULT 'sent'::"text" NOT NULL,
    "sent_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "read_at" timestamp with time zone,
    "edited_at" timestamp with time zone,
    "is_deleted" boolean DEFAULT false NOT NULL,
    "deleted_at" timestamp with time zone,
    "deleted_by_sender" boolean DEFAULT false,
    "deleted_by_recipient" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "attachment_count" integer DEFAULT 0,
    "idempotency_key" "text",
    "attachments_ready" boolean DEFAULT true,
    CONSTRAINT "chk_content_required" CHECK (((("message_type" = 'text'::"text") AND ("content" IS NOT NULL)) OR ("message_type" = ANY (ARRAY['image'::"text", 'video'::"text", 'audio'::"text", 'file'::"text"])))),
    CONSTRAINT "messages_message_type_check" CHECK (("message_type" = ANY (ARRAY['text'::"text", 'image'::"text", 'video'::"text", 'audio'::"text", 'file'::"text"]))),
    CONSTRAINT "messages_status_check" CHECK (("status" = ANY (ARRAY['sending'::"text", 'sent'::"text", 'read'::"text", 'failed'::"text"])))
);


ALTER TABLE "public"."messages" OWNER TO "postgres";


COMMENT ON COLUMN "public"."messages"."idempotency_key" IS 'Client-provided unique key to prevent duplicate messages on retry. Format: {sender_id}-{timestamp}-{random}';



COMMENT ON COLUMN "public"."messages"."attachments_ready" IS 'FALSE when message is waiting for attachments to be uploaded. TRUE when ready to display.';



CREATE TABLE IF NOT EXISTS "public"."musclewiki_api_audit_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "endpoint" "text" NOT NULL,
    "method" "text" DEFAULT 'GET'::"text" NOT NULL,
    "query_params" "jsonb",
    "response_status" integer,
    "response_size_bytes" integer,
    "exercises_returned" integer DEFAULT 0,
    "cache_hit" boolean DEFAULT false NOT NULL,
    "cache_miss_reason" "text",
    "request_source" "text",
    "user_id" "uuid",
    "request_duration_ms" integer,
    "rate_limit_remaining" integer,
    "rate_limit_reset_at" timestamp with time zone,
    "content_type" "text",
    "compliance_note" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."musclewiki_api_audit_log" OWNER TO "postgres";


COMMENT ON TABLE "public"."musclewiki_api_audit_log" IS 'Audit log for all MuscleWiki API interactions.
Used to prove compliance with MuscleWiki API Terms of Use.
Tracks cache hits/misses, content types, and rate limits.';



CREATE TABLE IF NOT EXISTS "public"."musclewiki_cache_population_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "started_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "completed_at" timestamp with time zone,
    "status" "text" DEFAULT 'running'::"text" NOT NULL,
    "total_fetched" integer DEFAULT 0,
    "total_cached" integer DEFAULT 0,
    "errors" integer DEFAULT 0,
    "error_message" "text",
    "triggered_by" "text" DEFAULT 'cron'::"text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."musclewiki_cache_population_log" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."musclewiki_compliance_report" WITH ("security_invoker"='true') AS
 SELECT "date_trunc"('day'::"text", "created_at") AS "report_date",
    "count"(*) AS "total_requests",
    "sum"(
        CASE
            WHEN "cache_hit" THEN 1
            ELSE 0
        END) AS "cache_hits",
    "sum"(
        CASE
            WHEN (NOT "cache_hit") THEN 1
            ELSE 0
        END) AS "api_calls",
    "round"((("sum"(
        CASE
            WHEN "cache_hit" THEN 1.0
            ELSE 0.0
        END) / (NULLIF("count"(*), 0))::numeric) * (100)::numeric), 2) AS "cache_hit_percentage",
    "sum"(
        CASE
            WHEN ("content_type" = 'metadata'::"text") THEN 1
            ELSE 0
        END) AS "metadata_requests",
    "sum"(
        CASE
            WHEN ("content_type" = 'thumbnail'::"text") THEN 1
            ELSE 0
        END) AS "thumbnail_requests",
    "sum"(
        CASE
            WHEN ("content_type" = 'video'::"text") THEN 1
            ELSE 0
        END) AS "video_requests",
    "min"("rate_limit_remaining") AS "min_rate_limit_remaining",
    "round"("avg"("request_duration_ms"), 2) AS "avg_response_ms"
   FROM "public"."musclewiki_api_audit_log"
  GROUP BY ("date_trunc"('day'::"text", "created_at"))
  ORDER BY ("date_trunc"('day'::"text", "created_at")) DESC;


ALTER VIEW "public"."musclewiki_compliance_report" OWNER TO "postgres";


COMMENT ON VIEW "public"."musclewiki_compliance_report" IS 'Daily aggregated report showing API usage, cache efficiency, and content type
breakdown for compliance verification with MuscleWiki API Terms.';



CREATE TABLE IF NOT EXISTS "public"."musclewiki_exercise_cache" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "musclewiki_id" "text" NOT NULL,
    "name" "text" NOT NULL,
    "name_alternative" "text",
    "slug" "text",
    "category" "text",
    "difficulty" "text",
    "force" "text",
    "mechanic" "text",
    "target_muscles" "jsonb" DEFAULT '[]'::"jsonb",
    "synergist_muscles" "jsonb" DEFAULT '[]'::"jsonb",
    "stabilizer_muscles" "jsonb" DEFAULT '[]'::"jsonb",
    "instructions" "jsonb" DEFAULT '[]'::"jsonb",
    "tips" "jsonb" DEFAULT '[]'::"jsonb",
    "cached_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "cache_expires_at" timestamp with time zone DEFAULT ("now"() + '7 days'::interval) NOT NULL,
    "last_accessed_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "access_count" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."musclewiki_exercise_cache" OWNER TO "postgres";


COMMENT ON TABLE "public"."musclewiki_exercise_cache" IS 'Cache for MuscleWiki API exercise METADATA ONLY (text).
Cached for up to 7 days (within 30 day limit per MuscleWiki Terms Section 3).
NO video URLs stored per Terms Section 2.1. Thumbnails in separate table.';



CREATE TABLE IF NOT EXISTS "public"."musclewiki_filter_cache" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "filter_type" "text" NOT NULL,
    "filter_value" "text" NOT NULL,
    "display_label" "text" NOT NULL,
    "sort_order" integer DEFAULT 0,
    "cached_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "cache_expires_at" timestamp with time zone DEFAULT ("now"() + '30 days'::interval) NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."musclewiki_filter_cache" OWNER TO "postgres";


COMMENT ON TABLE "public"."musclewiki_filter_cache" IS 'Cache for MuscleWiki API filter options (categories, muscles, etc.).
Cached for 30 days (max allowed per Terms Section 3).';



CREATE TABLE IF NOT EXISTS "public"."musclewiki_sync_metadata" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "sync_type" "text" NOT NULL,
    "last_sync_at" timestamp with time zone,
    "last_sync_status" "text",
    "last_sync_count" integer DEFAULT 0,
    "last_sync_duration_ms" integer,
    "last_error_message" "text",
    "sync_enabled" boolean DEFAULT true NOT NULL,
    "sync_interval_hours" integer DEFAULT 168 NOT NULL,
    "total_exercises_cached" integer DEFAULT 0,
    "total_api_calls_today" integer DEFAULT 0,
    "api_calls_reset_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."musclewiki_sync_metadata" OWNER TO "postgres";


COMMENT ON TABLE "public"."musclewiki_sync_metadata" IS 'Metadata for tracking sync operations and API usage statistics.';



CREATE TABLE IF NOT EXISTS "public"."musclewiki_thumbnail_cache" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "musclewiki_id" "text" NOT NULL,
    "thumbnail_url" "text" NOT NULL,
    "cached_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "cache_expires_at" timestamp with time zone DEFAULT ("now"() + '24:00:00'::interval) NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."musclewiki_thumbnail_cache" OWNER TO "postgres";


COMMENT ON TABLE "public"."musclewiki_thumbnail_cache" IS 'Separate cache for MuscleWiki thumbnails with STRICT 24-hour TTL.
Per MuscleWiki API Terms Section 3: Thumbnails may only be cached for 24 hours.
URLs point to MuscleWiki CDN - we do NOT store the actual image files.';



CREATE OR REPLACE VIEW "public"."v_my_notification_settings" WITH ("security_invoker"='true') AS
 SELECT "event_id",
    "event_key",
    "name",
    "description",
    "category",
    "enabled"
   FROM "public"."get_coach_notification_settings"("auth"."uid"()) "get_coach_notification_settings"("event_id", "event_key", "name", "description", "category", "enabled");


ALTER VIEW "public"."v_my_notification_settings" OWNER TO "postgres";


ALTER TABLE ONLY "public"."available_notification_events"
    ADD CONSTRAINT "available_notification_events_event_key_key" UNIQUE ("event_key");



ALTER TABLE ONLY "public"."available_notification_events"
    ADD CONSTRAINT "available_notification_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."client_bio"
    ADD CONSTRAINT "client_bio_client_id_key" UNIQUE ("client_id");



ALTER TABLE ONLY "public"."client_bio"
    ADD CONSTRAINT "client_bio_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."client_checkin_logs"
    ADD CONSTRAINT "client_checkin_logs_assignment_submission_unique" UNIQUE ("assignment_id", "submission_date");



ALTER TABLE ONLY "public"."client_checkin_logs"
    ADD CONSTRAINT "client_checkin_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."client_checkins"
    ADD CONSTRAINT "client_checkins_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."client_files"
    ADD CONSTRAINT "client_files_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."client_goals"
    ADD CONSTRAINT "client_goals_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."client_habit_logs"
    ADD CONSTRAINT "client_habit_logs_assignment_date_unique" UNIQUE ("assignment_id", "date");



ALTER TABLE ONLY "public"."client_habit_logs"
    ADD CONSTRAINT "client_habit_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."client_habits"
    ADD CONSTRAINT "client_habits_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."client_injuries"
    ADD CONSTRAINT "client_injuries_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."client_metric_logs"
    ADD CONSTRAINT "client_metric_logs_assignment_date_unique" UNIQUE ("assignment_id", "date");



ALTER TABLE ONLY "public"."client_metric_logs"
    ADD CONSTRAINT "client_metric_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."client_metrics"
    ADD CONSTRAINT "client_metrics_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."client_notes"
    ADD CONSTRAINT "client_notes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."client_photo_logs"
    ADD CONSTRAINT "client_photo_logs_client_date_unique" UNIQUE ("client_id", "date");



ALTER TABLE ONLY "public"."client_photo_logs"
    ADD CONSTRAINT "client_photo_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."client_profiles"
    ADD CONSTRAINT "client_profiles_pkey" PRIMARY KEY ("client_id");



ALTER TABLE ONLY "public"."client_questionnaire_logs"
    ADD CONSTRAINT "client_questionnaire_logs_assignment_submission_unique" UNIQUE ("assignment_id", "submission_date");



ALTER TABLE ONLY "public"."client_questionnaire_logs"
    ADD CONSTRAINT "client_questionnaire_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."client_questionnaires"
    ADD CONSTRAINT "client_questionnaires_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."client_training_exercise_history"
    ADD CONSTRAINT "client_training_exercise_history_pkey" PRIMARY KEY ("client_id", "coach_id", "date", "workout_id", "exercise_id", "row_id");



ALTER TABLE ONLY "public"."client_training_history"
    ADD CONSTRAINT "client_training_history_pkey" PRIMARY KEY ("client_id", "coach_id", "date", "workout_id");



ALTER TABLE ONLY "public"."client_training"
    ADD CONSTRAINT "client_training_new_pkey1" PRIMARY KEY ("client_id", "date", "coach_id");



ALTER TABLE ONLY "public"."client_training_summary"
    ADD CONSTRAINT "client_training_summary_pkey" PRIMARY KEY ("client_id");



ALTER TABLE ONLY "public"."client_updates"
    ADD CONSTRAINT "client_updates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."coach_auto_todolist"
    ADD CONSTRAINT "coach_auto_todolist_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."coach_checkins"
    ADD CONSTRAINT "coach_checkins_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."coach_client_assignments"
    ADD CONSTRAINT "coach_client_assignments_pkey" PRIMARY KEY ("coach_id", "client_id");



ALTER TABLE ONLY "public"."coach_company_information"
    ADD CONSTRAINT "coach_company_information_coach_id_key" UNIQUE ("coach_id");



ALTER TABLE ONLY "public"."coach_company_information"
    ADD CONSTRAINT "coach_company_information_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."coach_exercises"
    ADD CONSTRAINT "coach_exercises_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."coach_files"
    ADD CONSTRAINT "coach_files_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."coach_flows"
    ADD CONSTRAINT "coach_flows_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."coach_getting_started_checklist"
    ADD CONSTRAINT "coach_getting_started_checklist_pkey" PRIMARY KEY ("coach_id");



ALTER TABLE ONLY "public"."coach_habits"
    ADD CONSTRAINT "coach_habits_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."coach_metrics"
    ADD CONSTRAINT "coach_metrics_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."coach_notification_preferences"
    ADD CONSTRAINT "coach_notification_preferences_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."coach_own_todolist"
    ADD CONSTRAINT "coach_own_todolist_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."coach_preferences"
    ADD CONSTRAINT "coach_preferences_coach_id_key" UNIQUE ("coach_id");



ALTER TABLE ONLY "public"."coach_preferences"
    ADD CONSTRAINT "coach_preferences_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."coach_profiles"
    ADD CONSTRAINT "coach_profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."coach_profiles"
    ADD CONSTRAINT "coach_profiles_unique_code_key" UNIQUE ("unique_code");



ALTER TABLE ONLY "public"."coach_programs"
    ADD CONSTRAINT "coach_programs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."coach_questionnaires"
    ADD CONSTRAINT "coach_questionnaires_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."coach_sections"
    ADD CONSTRAINT "coach_sections_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."coach_unique_codes"
    ADD CONSTRAINT "coach_unique_codes_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."coach_unique_codes"
    ADD CONSTRAINT "coach_unique_codes_pkey" PRIMARY KEY ("coach_id", "code");



ALTER TABLE ONLY "public"."coach_workouts"
    ADD CONSTRAINT "coach_workouts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."conversation_participants"
    ADD CONSTRAINT "conversation_participants_pkey" PRIMARY KEY ("conversation_id", "user_id");



ALTER TABLE ONLY "public"."conversations"
    ADD CONSTRAINT "conversations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."feature_request_replies"
    ADD CONSTRAINT "feature_request_replies_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."feature_request_upvotes"
    ADD CONSTRAINT "feature_request_upvotes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."feature_requests"
    ADD CONSTRAINT "feature_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."message_attachments"
    ADD CONSTRAINT "message_attachments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."message_reactions"
    ADD CONSTRAINT "message_reactions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."message_read_receipts"
    ADD CONSTRAINT "message_read_receipts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."musclewiki_api_audit_log"
    ADD CONSTRAINT "musclewiki_api_audit_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."musclewiki_cache_population_log"
    ADD CONSTRAINT "musclewiki_cache_population_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."musclewiki_exercise_cache"
    ADD CONSTRAINT "musclewiki_exercise_cache_musclewiki_id_key" UNIQUE ("musclewiki_id");



ALTER TABLE ONLY "public"."musclewiki_exercise_cache"
    ADD CONSTRAINT "musclewiki_exercise_cache_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."musclewiki_filter_cache"
    ADD CONSTRAINT "musclewiki_filter_cache_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."musclewiki_sync_metadata"
    ADD CONSTRAINT "musclewiki_sync_metadata_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."musclewiki_sync_metadata"
    ADD CONSTRAINT "musclewiki_sync_metadata_sync_type_key" UNIQUE ("sync_type");



ALTER TABLE ONLY "public"."musclewiki_thumbnail_cache"
    ADD CONSTRAINT "musclewiki_thumbnail_cache_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."coach_notification_preferences"
    ADD CONSTRAINT "unique_coach_event" UNIQUE ("coach_id", "event_id");



ALTER TABLE ONLY "public"."conversations"
    ADD CONSTRAINT "uq_conversation_coach_client" UNIQUE ("coach_id", "client_id");



ALTER TABLE ONLY "public"."feature_request_upvotes"
    ADD CONSTRAINT "uq_fru_feature_request_user" UNIQUE ("feature_request_id", "user_id");



ALTER TABLE ONLY "public"."musclewiki_filter_cache"
    ADD CONSTRAINT "uq_mwfc_type_value" UNIQUE ("filter_type", "filter_value");



ALTER TABLE ONLY "public"."musclewiki_thumbnail_cache"
    ADD CONSTRAINT "uq_mwtc_musclewiki_id" UNIQUE ("musclewiki_id");



ALTER TABLE ONLY "public"."message_reactions"
    ADD CONSTRAINT "uq_reaction_user_message" UNIQUE ("message_id", "user_id");



ALTER TABLE ONLY "public"."message_read_receipts"
    ADD CONSTRAINT "uq_receipt_user_conversation" UNIQUE ("conversation_id", "user_id");



ALTER TABLE ONLY "public"."user_profiles"
    ADD CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("id", "user_type");



CREATE INDEX "idx_attach_conversation" ON "public"."message_attachments" USING "btree" ("conversation_id");



CREATE INDEX "idx_attach_message" ON "public"."message_attachments" USING "btree" ("message_id");



CREATE INDEX "idx_cat_client_user_composite" ON "public"."coach_auto_todolist" USING "btree" ("client_id", "client_user_type") WHERE ("client_id" IS NOT NULL);



CREATE INDEX "idx_cat_coach_completed" ON "public"."coach_auto_todolist" USING "btree" ("coach_id", "completed");



CREATE INDEX "idx_cc_client_id" ON "public"."client_checkins" USING "btree" ("client_id");



CREATE INDEX "idx_cca_client_id" ON "public"."coach_client_assignments" USING "btree" ("client_id");



CREATE INDEX "idx_cca_invitation_token" ON "public"."coach_client_assignments" USING "btree" ("invitation_token");



CREATE INDEX "idx_ccl_client_id" ON "public"."client_checkin_logs" USING "btree" ("client_id");



CREATE INDEX "idx_ccl_coach_status_date" ON "public"."client_checkin_logs" USING "btree" ("coach_id", "status", "submission_date" DESC);



CREATE INDEX "idx_cf_client_id" ON "public"."client_files" USING "btree" ("client_id");



CREATE INDEX "idx_cg_client" ON "public"."client_goals" USING "btree" ("client_id");



CREATE INDEX "idx_ch_client_id" ON "public"."client_habits" USING "btree" ("client_id");



CREATE INDEX "idx_checkin_logs_coach" ON "public"."client_checkin_logs" USING "btree" ("coach_id", "submission_date" DESC);



CREATE INDEX "idx_checkins_coach" ON "public"."coach_checkins" USING "btree" ("coach_id");



CREATE INDEX "idx_ci_client" ON "public"."client_injuries" USING "btree" ("client_id");



CREATE INDEX "idx_client_bio_coach_id" ON "public"."client_bio" USING "btree" ("coach_id");



CREATE INDEX "idx_client_checkins_assignment" ON "public"."client_checkin_logs" USING "btree" ("assignment_id");



CREATE INDEX "idx_client_goals_coach_id" ON "public"."client_goals" USING "btree" ("coach_id");



CREATE INDEX "idx_client_habit_logs_client_assignment" ON "public"."client_habit_logs" USING "btree" ("client_id", "assignment_id");



CREATE INDEX "idx_client_habits_assignment" ON "public"."client_habit_logs" USING "btree" ("assignment_id");



CREATE INDEX "idx_client_injuries_coach_id" ON "public"."client_injuries" USING "btree" ("coach_id");



CREATE INDEX "idx_client_metric_logs_client_assignment" ON "public"."client_metric_logs" USING "btree" ("client_id", "assignment_id");



CREATE INDEX "idx_client_metrics_assignment" ON "public"."client_metric_logs" USING "btree" ("assignment_id");



CREATE INDEX "idx_client_notes_coach_id" ON "public"."client_notes" USING "btree" ("coach_id");



CREATE INDEX "idx_client_photo_logs_client_date" ON "public"."client_photo_logs" USING "btree" ("client_id", "date");



CREATE INDEX "idx_client_photo_logs_date" ON "public"."client_photo_logs" USING "btree" ("date");



CREATE INDEX "idx_client_questionnaires_assignment" ON "public"."client_questionnaire_logs" USING "btree" ("assignment_id");



CREATE INDEX "idx_client_training_coach_date" ON "public"."client_training" USING "btree" ("coach_id", "date");



CREATE INDEX "idx_cm_client_id" ON "public"."client_metrics" USING "btree" ("client_id");



CREATE INDEX "idx_cn_client_pinned" ON "public"."client_notes" USING "btree" ("client_id", "is_pinned" DESC, "created_at" DESC);



CREATE INDEX "idx_cnp_event_id" ON "public"."coach_notification_preferences" USING "btree" ("event_id");



CREATE INDEX "idx_coach_auto_todolist_client_id" ON "public"."coach_auto_todolist" USING "btree" ("client_id") WHERE ("client_id" IS NOT NULL);



CREATE INDEX "idx_coach_checkins_coach_id_lower_name" ON "public"."coach_checkins" USING "btree" ("coach_id", "lower"("name"));



CREATE INDEX "idx_coach_client_assignments_invitation_token" ON "public"."coach_client_assignments" USING "btree" ("invitation_token") WHERE ("invitation_token" IS NOT NULL);



CREATE INDEX "idx_coach_company_owner" ON "public"."coach_company_information" USING "btree" ("coach_id");



CREATE INDEX "idx_coach_exercises_coach_id_lower_name" ON "public"."coach_exercises" USING "btree" ("coach_id", "lower"("name"));



CREATE INDEX "idx_coach_flows_coach_id_lower_name" ON "public"."coach_flows" USING "btree" ("coach_id", "lower"("name"));



CREATE INDEX "idx_coach_habits_coach_id_lower_name" ON "public"."coach_habits" USING "btree" ("coach_id", "lower"("name"));



CREATE INDEX "idx_coach_metrics_coach_id_lower_name" ON "public"."coach_metrics" USING "btree" ("coach_id", "lower"("name"));



CREATE INDEX "idx_coach_notif_prefs_owner" ON "public"."coach_notification_preferences" USING "btree" ("coach_id");



CREATE INDEX "idx_coach_own_todolist_client_id" ON "public"."coach_own_todolist" USING "btree" ("client_id") WHERE ("client_id" IS NOT NULL);



CREATE INDEX "idx_coach_preferences_owner" ON "public"."coach_preferences" USING "btree" ("coach_id");



CREATE INDEX "idx_coach_profiles_active" ON "public"."coach_profiles" USING "btree" ("is_active");



CREATE INDEX "idx_coach_profiles_unique_code" ON "public"."coach_profiles" USING "btree" ("unique_code");



CREATE INDEX "idx_coach_programs_coach_id_lower_name" ON "public"."coach_programs" USING "btree" ("coach_id", "lower"("name"));



CREATE INDEX "idx_coach_programs_difficulty" ON "public"."coach_programs" USING "btree" ("difficulty") WHERE ("difficulty" IS NOT NULL);



CREATE INDEX "idx_coach_programs_type" ON "public"."coach_programs" USING "btree" ("type") WHERE ("type" IS NOT NULL);



CREATE INDEX "idx_coach_questionnaires_coach_id_lower_name" ON "public"."coach_questionnaires" USING "btree" ("coach_id", "lower"("name"));



CREATE INDEX "idx_coach_workouts_coach_id_lower_name" ON "public"."coach_workouts" USING "btree" ("coach_id", "lower"("name"));



CREATE INDEX "idx_coach_workouts_type" ON "public"."coach_workouts" USING "btree" ("type");



CREATE INDEX "idx_conv_client" ON "public"."conversations" USING "btree" ("client_id");



CREATE INDEX "idx_conv_client_last_msg" ON "public"."conversations" USING "btree" ("client_id", "last_message_at" DESC NULLS LAST);



CREATE INDEX "idx_conv_coach" ON "public"."conversations" USING "btree" ("coach_id");



CREATE INDEX "idx_conv_coach_last_msg" ON "public"."conversations" USING "btree" ("coach_id", "last_message_at" DESC NULLS LAST);



CREATE INDEX "idx_conv_last_message" ON "public"."conversations" USING "btree" ("last_message_at" DESC NULLS LAST);



CREATE INDEX "idx_cot_client_user_composite" ON "public"."coach_own_todolist" USING "btree" ("client_id", "client_user_type") WHERE ("client_id" IS NOT NULL);



CREATE INDEX "idx_cot_coach_completed" ON "public"."coach_own_todolist" USING "btree" ("coach_id", "completed");



CREATE INDEX "idx_cot_coach_due" ON "public"."coach_own_todolist" USING "btree" ("coach_id", "due_date");



CREATE INDEX "idx_cot_open_due" ON "public"."coach_own_todolist" USING "btree" ("coach_id", "due_date") WHERE ("completed" = false);



CREATE INDEX "idx_cp_other_user" ON "public"."conversation_participants" USING "btree" ("other_user_id");



CREATE INDEX "idx_cp_user" ON "public"."conversation_participants" USING "btree" ("user_id");



CREATE INDEX "idx_cp_user_archived" ON "public"."conversation_participants" USING "btree" ("user_id", "is_archived");



CREATE INDEX "idx_cp_user_pinned" ON "public"."conversation_participants" USING "btree" ("user_id", "is_pinned") WHERE ("is_pinned" = true);



CREATE INDEX "idx_cq_client_id" ON "public"."client_questionnaires" USING "btree" ("client_id");



CREATE INDEX "idx_cql_coach_status_created" ON "public"."client_questionnaire_logs" USING "btree" ("coach_id", "status", "created_at" DESC);



CREATE INDEX "idx_cteh_client_exercise_date" ON "public"."client_training_exercise_history" USING "btree" ("client_id", "exercise_id", "date" DESC);



CREATE INDEX "idx_cteh_coach_exercise" ON "public"."client_training_exercise_history" USING "btree" ("coach_id", "exercise_id");



CREATE INDEX "idx_cth_client_date" ON "public"."client_training_history" USING "btree" ("client_id", "date");



CREATE INDEX "idx_cth_coach_date_status" ON "public"."client_training_history" USING "btree" ("coach_id", "date", "status");



CREATE INDEX "idx_cts_activity" ON "public"."client_training_summary" USING "btree" ("last_activity" DESC);



CREATE INDEX "idx_cts_client_activity" ON "public"."client_training_summary" USING "btree" ("client_id", "last_activity" DESC);



CREATE INDEX "idx_cu_client_timestamp" ON "public"."client_updates" USING "btree" ("client_id", "update_timestamp" DESC);



CREATE INDEX "idx_cu_coach" ON "public"."client_updates" USING "btree" ("coach_id");



CREATE INDEX "idx_exercises_coach" ON "public"."coach_exercises" USING "btree" ("coach_id");



CREATE INDEX "idx_files_coach" ON "public"."coach_files" USING "btree" ("coach_id");



CREATE INDEX "idx_flows_coach" ON "public"."coach_flows" USING "btree" ("coach_id");



CREATE INDEX "idx_fr_created_at" ON "public"."feature_requests" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_fr_status" ON "public"."feature_requests" USING "btree" ("status");



CREATE INDEX "idx_fr_upvote_count" ON "public"."feature_requests" USING "btree" ("upvote_count" DESC);



CREATE INDEX "idx_fr_user_id" ON "public"."feature_requests" USING "btree" ("user_id");



CREATE INDEX "idx_frr_feature_request_created" ON "public"."feature_request_replies" USING "btree" ("feature_request_id", "created_at");



CREATE INDEX "idx_fru_feature_request" ON "public"."feature_request_upvotes" USING "btree" ("feature_request_id");



CREATE INDEX "idx_fru_user" ON "public"."feature_request_upvotes" USING "btree" ("user_id");



CREATE INDEX "idx_habits_coach" ON "public"."coach_habits" USING "btree" ("coach_id");



CREATE INDEX "idx_logs_client_history" ON "public"."client_habit_logs" USING "btree" ("client_id", "date" DESC);



CREATE INDEX "idx_logs_coach_recent" ON "public"."client_habit_logs" USING "btree" ("coach_id", "date" DESC);



CREATE INDEX "idx_mcpl_started_at" ON "public"."musclewiki_cache_population_log" USING "btree" ("started_at" DESC);



CREATE INDEX "idx_mcpl_status" ON "public"."musclewiki_cache_population_log" USING "btree" ("status");



CREATE UNIQUE INDEX "idx_messages_idempotency_key" ON "public"."messages" USING "btree" ("idempotency_key") WHERE ("idempotency_key" IS NOT NULL);



CREATE INDEX "idx_messages_pending_attachments" ON "public"."messages" USING "btree" ("conversation_id", "attachments_ready") WHERE ("attachments_ready" = false);



CREATE INDEX "idx_metric_logs_client_history" ON "public"."client_metric_logs" USING "btree" ("client_id", "date" DESC);



CREATE INDEX "idx_metric_logs_coach_recent" ON "public"."client_metric_logs" USING "btree" ("coach_id", "date" DESC);



CREATE INDEX "idx_metrics_coach" ON "public"."coach_metrics" USING "btree" ("coach_id");



CREATE INDEX "idx_msg_active" ON "public"."messages" USING "btree" ("conversation_id", "sent_at" DESC) WHERE ("is_deleted" = false);



CREATE INDEX "idx_msg_conversation_sent" ON "public"."messages" USING "btree" ("conversation_id", "sent_at" DESC);



CREATE INDEX "idx_msg_parent" ON "public"."messages" USING "btree" ("parent_message_id") WHERE ("parent_message_id" IS NOT NULL);



CREATE INDEX "idx_msg_sender" ON "public"."messages" USING "btree" ("sender_id");



CREATE INDEX "idx_msg_sent_at" ON "public"."messages" USING "btree" ("sent_at" DESC);



CREATE INDEX "idx_msg_status" ON "public"."messages" USING "btree" ("conversation_id", "status") WHERE ("status" = ANY (ARRAY['sending'::"text", 'failed'::"text"]));



CREATE INDEX "idx_mwaal_cache_hit" ON "public"."musclewiki_api_audit_log" USING "btree" ("cache_hit");



CREATE INDEX "idx_mwaal_content_type" ON "public"."musclewiki_api_audit_log" USING "btree" ("content_type");



CREATE INDEX "idx_mwaal_created_at" ON "public"."musclewiki_api_audit_log" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_mwaal_endpoint" ON "public"."musclewiki_api_audit_log" USING "btree" ("endpoint");



CREATE INDEX "idx_mwec_cache_expires" ON "public"."musclewiki_exercise_cache" USING "btree" ("cache_expires_at");



CREATE INDEX "idx_mwec_category" ON "public"."musclewiki_exercise_cache" USING "btree" ("category");



CREATE INDEX "idx_mwec_difficulty" ON "public"."musclewiki_exercise_cache" USING "btree" ("difficulty");



CREATE INDEX "idx_mwec_musclewiki_id" ON "public"."musclewiki_exercise_cache" USING "btree" ("musclewiki_id");



CREATE INDEX "idx_mwec_name" ON "public"."musclewiki_exercise_cache" USING "btree" ("name");



CREATE INDEX "idx_mwec_name_search" ON "public"."musclewiki_exercise_cache" USING "gin" ("to_tsvector"('"english"'::"regconfig", "name"));



CREATE INDEX "idx_mwec_target_muscles" ON "public"."musclewiki_exercise_cache" USING "gin" ("target_muscles");



CREATE INDEX "idx_mwfc_filter_type" ON "public"."musclewiki_filter_cache" USING "btree" ("filter_type");



CREATE INDEX "idx_mwtc_cache_expires" ON "public"."musclewiki_thumbnail_cache" USING "btree" ("cache_expires_at");



CREATE INDEX "idx_mwtc_musclewiki_id" ON "public"."musclewiki_thumbnail_cache" USING "btree" ("musclewiki_id");



CREATE INDEX "idx_notif_events_key" ON "public"."available_notification_events" USING "btree" ("event_key");



CREATE INDEX "idx_photo_logs_client_date" ON "public"."client_photo_logs" USING "btree" ("client_id", "date" DESC);



CREATE INDEX "idx_photo_logs_coach_date" ON "public"."client_photo_logs" USING "btree" ("coach_id", "date" DESC);



CREATE INDEX "idx_programs_coach" ON "public"."coach_programs" USING "btree" ("coach_id");



CREATE INDEX "idx_quest_coach" ON "public"."coach_questionnaires" USING "btree" ("coach_id");



CREATE INDEX "idx_quest_logs_client" ON "public"."client_questionnaire_logs" USING "btree" ("client_id");



CREATE INDEX "idx_quest_logs_coach" ON "public"."client_questionnaire_logs" USING "btree" ("coach_id");



CREATE INDEX "idx_reaction_conversation" ON "public"."message_reactions" USING "btree" ("conversation_id");



CREATE INDEX "idx_reaction_message" ON "public"."message_reactions" USING "btree" ("message_id");



CREATE INDEX "idx_reaction_user" ON "public"."message_reactions" USING "btree" ("user_id");



CREATE INDEX "idx_receipt_conversation" ON "public"."message_read_receipts" USING "btree" ("conversation_id");



CREATE INDEX "idx_receipt_message" ON "public"."message_read_receipts" USING "btree" ("last_read_message_id") WHERE ("last_read_message_id" IS NOT NULL);



CREATE INDEX "idx_receipt_user" ON "public"."message_read_receipts" USING "btree" ("user_id");



CREATE INDEX "idx_sections_coach" ON "public"."coach_sections" USING "btree" ("coach_id");



CREATE INDEX "idx_sections_coach_type" ON "public"."coach_sections" USING "btree" ("coach_id", "section_type");



CREATE INDEX "idx_sections_type" ON "public"."coach_sections" USING "btree" ("section_type");



CREATE INDEX "idx_user_profiles_email" ON "public"."user_profiles" USING "btree" ("email");



CREATE INDEX "idx_user_profiles_id" ON "public"."user_profiles" USING "btree" ("id");



CREATE INDEX "idx_user_profiles_user_type" ON "public"."user_profiles" USING "btree" ("user_type");



CREATE INDEX "idx_workouts_coach" ON "public"."coach_workouts" USING "btree" ("coach_id");



CREATE UNIQUE INDEX "uq_attach_file_path" ON "public"."message_attachments" USING "btree" ("bucket_id", "file_path");



CREATE UNIQUE INDEX "uq_coach_files_path" ON "public"."coach_files" USING "btree" ("bucket_id", "file_path");



CREATE UNIQUE INDEX "uq_coach_sections_name_ci" ON "public"."coach_sections" USING "btree" ("coach_id", "lower"("name"));



CREATE OR REPLACE TRIGGER "enforce_checkin_log_integrity_trigger" BEFORE INSERT OR UPDATE ON "public"."client_checkin_logs" FOR EACH ROW EXECUTE FUNCTION "public"."enforce_checkin_log_integrity"();



CREATE OR REPLACE TRIGGER "enforce_habit_log_integrity_trigger" BEFORE INSERT OR UPDATE ON "public"."client_habit_logs" FOR EACH ROW EXECUTE FUNCTION "public"."enforce_habit_log_integrity"();



CREATE OR REPLACE TRIGGER "enforce_metric_log_integrity_trigger" BEFORE INSERT OR UPDATE ON "public"."client_metric_logs" FOR EACH ROW EXECUTE FUNCTION "public"."enforce_metric_log_integrity"();



CREATE OR REPLACE TRIGGER "enforce_photo_log_integrity_trigger" BEFORE INSERT OR UPDATE ON "public"."client_photo_logs" FOR EACH ROW EXECUTE FUNCTION "public"."enforce_photo_log_integrity"();



CREATE OR REPLACE TRIGGER "enforce_quest_log_integrity_trigger" BEFORE INSERT OR UPDATE ON "public"."client_questionnaire_logs" FOR EACH ROW EXECUTE FUNCTION "public"."enforce_quest_log_integrity"();



CREATE OR REPLACE TRIGGER "on_coach_profile_created" AFTER INSERT ON "public"."coach_profiles" FOR EACH ROW EXECUTE FUNCTION "public"."handle_new_coach_setup"();



CREATE OR REPLACE TRIGGER "on_user_profile_deleted" AFTER DELETE ON "public"."user_profiles" FOR EACH ROW EXECUTE FUNCTION "public"."handle_user_profile_delete"();



CREATE OR REPLACE TRIGGER "trg_available_notif_updated_at" BEFORE UPDATE ON "public"."available_notification_events" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_broadcast_message_changes" AFTER INSERT OR DELETE OR UPDATE ON "public"."messages" FOR EACH ROW EXECUTE FUNCTION "public"."broadcast_message_changes"();



CREATE OR REPLACE TRIGGER "trg_broadcast_message_on_reaction" AFTER INSERT OR DELETE OR UPDATE ON "public"."message_reactions" FOR EACH ROW EXECUTE FUNCTION "public"."broadcast_message_on_reaction"();



CREATE OR REPLACE TRIGGER "trg_cat_client_integrity" BEFORE INSERT OR UPDATE ON "public"."coach_auto_todolist" FOR EACH ROW EXECUTE FUNCTION "public"."enforce_todolist_client_belongs_to_coach"();



CREATE OR REPLACE TRIGGER "trg_cat_updated_at" BEFORE UPDATE ON "public"."coach_auto_todolist" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_cb_integrity" BEFORE INSERT OR UPDATE ON "public"."client_bio" FOR EACH ROW EXECUTE FUNCTION "public"."enforce_coach_private_integrity"();



CREATE OR REPLACE TRIGGER "trg_cb_updated_at" BEFORE UPDATE ON "public"."client_bio" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_cc_coach_id" BEFORE INSERT ON "public"."client_checkins" FOR EACH ROW EXECUTE FUNCTION "public"."set_client_item_coach_id"();



CREATE OR REPLACE TRIGGER "trg_cc_updated_at" BEFORE UPDATE ON "public"."coach_checkins" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_cca_updated_at" BEFORE UPDATE ON "public"."client_checkins" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_cca_updated_at" BEFORE UPDATE ON "public"."coach_client_assignments" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_ce_updated_at" BEFORE UPDATE ON "public"."coach_exercises" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_cf_block_path_change" BEFORE UPDATE OF "file_path" ON "public"."coach_files" FOR EACH ROW EXECUTE FUNCTION "public"."block_file_path_change"();



CREATE OR REPLACE TRIGGER "trg_cf_coach_id" BEFORE INSERT ON "public"."client_files" FOR EACH ROW EXECUTE FUNCTION "public"."set_client_item_coach_id"();



CREATE OR REPLACE TRIGGER "trg_cf_updated_at" BEFORE UPDATE ON "public"."coach_files" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_cfa_updated_at" BEFORE UPDATE ON "public"."client_files" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_cg_integrity" BEFORE INSERT OR UPDATE ON "public"."client_goals" FOR EACH ROW EXECUTE FUNCTION "public"."enforce_coach_private_integrity"();



CREATE OR REPLACE TRIGGER "trg_cg_updated_at" BEFORE UPDATE ON "public"."client_goals" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_cgsc_updated_at" BEFORE UPDATE ON "public"."coach_getting_started_checklist" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_ch_coach_id" BEFORE INSERT ON "public"."client_habits" FOR EACH ROW EXECUTE FUNCTION "public"."set_client_item_coach_id"();



CREATE OR REPLACE TRIGGER "trg_ch_updated_at" BEFORE UPDATE ON "public"."coach_habits" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_cha_updated_at" BEFORE UPDATE ON "public"."client_habits" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_check_attachments_complete" AFTER INSERT OR UPDATE OF "upload_status" ON "public"."message_attachments" FOR EACH ROW WHEN (("new"."upload_status" = 'completed'::"text")) EXECUTE FUNCTION "public"."check_attachments_complete"();



CREATE OR REPLACE TRIGGER "trg_checklist_automate_onboardings" AFTER INSERT OR UPDATE ON "public"."coach_flows" FOR EACH ROW EXECUTE FUNCTION "public"."mark_checklist_automate_onboardings"();



CREATE OR REPLACE TRIGGER "trg_checklist_check_ins_forms_q" AFTER INSERT ON "public"."coach_questionnaires" FOR EACH ROW EXECUTE FUNCTION "public"."mark_checklist_check_ins_forms_questionnaire"();



CREATE OR REPLACE TRIGGER "trg_checklist_custom_exercises" AFTER INSERT ON "public"."coach_exercises" FOR EACH ROW EXECUTE FUNCTION "public"."mark_checklist_custom_exercises"();



CREATE OR REPLACE TRIGGER "trg_checklist_lifestyle_habits" AFTER INSERT ON "public"."coach_habits" FOR EACH ROW EXECUTE FUNCTION "public"."mark_checklist_lifestyle_habits"();



CREATE OR REPLACE TRIGGER "trg_checklist_on_demand_resources" AFTER INSERT ON "public"."coach_files" FOR EACH ROW EXECUTE FUNCTION "public"."mark_checklist_on_demand_resources"();



CREATE OR REPLACE TRIGGER "trg_checklist_powerful_flows" AFTER INSERT OR UPDATE ON "public"."coach_flows" FOR EACH ROW EXECUTE FUNCTION "public"."mark_checklist_powerful_flows"();



CREATE OR REPLACE TRIGGER "trg_checklist_program_templates" AFTER INSERT ON "public"."coach_programs" FOR EACH ROW EXECUTE FUNCTION "public"."mark_checklist_program_templates"();



CREATE OR REPLACE TRIGGER "trg_checklist_track_metrics" AFTER INSERT ON "public"."coach_metrics" FOR EACH ROW EXECUTE FUNCTION "public"."mark_checklist_track_metrics"();



CREATE OR REPLACE TRIGGER "trg_checklist_workout_ai" AFTER INSERT ON "public"."coach_workouts" FOR EACH ROW EXECUTE FUNCTION "public"."mark_checklist_workout_ai"();



CREATE OR REPLACE TRIGGER "trg_ci_integrity" BEFORE INSERT OR UPDATE ON "public"."client_injuries" FOR EACH ROW EXECUTE FUNCTION "public"."enforce_coach_private_integrity"();



CREATE OR REPLACE TRIGGER "trg_ci_updated_at" BEFORE UPDATE ON "public"."client_injuries" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_client_account_deletion" BEFORE DELETE ON "public"."client_profiles" FOR EACH ROW EXECUTE FUNCTION "public"."handle_client_account_deletion"();



CREATE OR REPLACE TRIGGER "trg_client_auth_cleanup" AFTER DELETE ON "public"."client_profiles" FOR EACH ROW EXECUTE FUNCTION "public"."handle_client_auth_cleanup"();



CREATE OR REPLACE TRIGGER "trg_cm_coach_id" BEFORE INSERT ON "public"."client_metrics" FOR EACH ROW EXECUTE FUNCTION "public"."set_client_item_coach_id"();



CREATE OR REPLACE TRIGGER "trg_cm_updated_at" BEFORE UPDATE ON "public"."coach_metrics" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_cma_updated_at" BEFORE UPDATE ON "public"."client_metrics" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_cn_integrity" BEFORE INSERT OR UPDATE ON "public"."client_notes" FOR EACH ROW EXECUTE FUNCTION "public"."enforce_coach_private_integrity"();



CREATE OR REPLACE TRIGGER "trg_cn_updated_at" BEFORE UPDATE ON "public"."client_notes" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_coach_company_updated_at" BEFORE UPDATE ON "public"."coach_company_information" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_coach_notif_prefs_updated_at" BEFORE UPDATE ON "public"."coach_notification_preferences" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_coach_preferences_updated_at" BEFORE UPDATE ON "public"."coach_preferences" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_conversations_updated_at" BEFORE UPDATE ON "public"."conversations" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "trg_cot_client_integrity" BEFORE INSERT OR UPDATE ON "public"."coach_own_todolist" FOR EACH ROW EXECUTE FUNCTION "public"."enforce_todolist_client_belongs_to_coach"();



CREATE OR REPLACE TRIGGER "trg_cot_updated_at" BEFORE UPDATE ON "public"."coach_own_todolist" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_cp_protect" BEFORE UPDATE ON "public"."client_profiles" FOR EACH ROW EXECUTE FUNCTION "public"."protect_client_profile_fields"();



CREATE OR REPLACE TRIGGER "trg_cp_updated_at" BEFORE UPDATE ON "public"."client_profiles" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_cprog_updated_at" BEFORE UPDATE ON "public"."coach_programs" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_cq_coach_id" BEFORE INSERT ON "public"."client_questionnaires" FOR EACH ROW EXECUTE FUNCTION "public"."set_client_item_coach_id"();



CREATE OR REPLACE TRIGGER "trg_cq_updated_at" BEFORE UPDATE ON "public"."coach_questionnaires" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_cqa_updated_at" BEFORE UPDATE ON "public"."client_questionnaires" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_create_conversation_on_client_assignment" AFTER INSERT OR UPDATE OF "status" ON "public"."coach_client_assignments" FOR EACH ROW EXECUTE FUNCTION "public"."create_conversation_on_client_assignment"();



CREATE OR REPLACE TRIGGER "trg_create_participant_records" AFTER INSERT ON "public"."conversations" FOR EACH ROW EXECUTE FUNCTION "public"."create_participant_records"();



CREATE OR REPLACE TRIGGER "trg_cts_audit" BEFORE INSERT OR UPDATE ON "public"."client_training_summary" FOR EACH ROW EXECUTE FUNCTION "public"."set_training_summary_updated_by"();



CREATE OR REPLACE TRIGGER "trg_cu_updated_at" BEFORE UPDATE ON "public"."client_updates" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_cw_updated_at" BEFORE UPDATE ON "public"."coach_workouts" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_flows_updated_at" BEFORE UPDATE ON "public"."coach_flows" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_fr_updated_at" BEFORE UPDATE ON "public"."feature_requests" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_fru_decrement_count" AFTER DELETE ON "public"."feature_request_upvotes" FOR EACH ROW EXECUTE FUNCTION "public"."decrement_upvote_count"();



CREATE OR REPLACE TRIGGER "trg_fru_increment_count" AFTER INSERT ON "public"."feature_request_upvotes" FOR EACH ROW EXECUTE FUNCTION "public"."increment_upvote_count"();



CREATE OR REPLACE TRIGGER "trg_mwec_updated_at" BEFORE UPDATE ON "public"."musclewiki_exercise_cache" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_mwfc_updated_at" BEFORE UPDATE ON "public"."musclewiki_filter_cache" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_mwsm_updated_at" BEFORE UPDATE ON "public"."musclewiki_sync_metadata" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_participants_updated_at" BEFORE UPDATE ON "public"."conversation_participants" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "trg_receipts_updated_at" BEFORE UPDATE ON "public"."message_read_receipts" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "trg_resolve_checkin_name_conflict" BEFORE INSERT OR UPDATE OF "name" ON "public"."coach_checkins" FOR EACH ROW EXECUTE FUNCTION "public"."resolve_coach_item_name_conflict"();



CREATE OR REPLACE TRIGGER "trg_resolve_exercise_name_conflict" BEFORE INSERT OR UPDATE OF "name" ON "public"."coach_exercises" FOR EACH ROW EXECUTE FUNCTION "public"."resolve_coach_item_name_conflict"();



CREATE OR REPLACE TRIGGER "trg_resolve_flow_name_conflict" BEFORE INSERT OR UPDATE OF "name" ON "public"."coach_flows" FOR EACH ROW EXECUTE FUNCTION "public"."resolve_coach_item_name_conflict"();



CREATE OR REPLACE TRIGGER "trg_resolve_habit_name_conflict" BEFORE INSERT OR UPDATE OF "name" ON "public"."coach_habits" FOR EACH ROW EXECUTE FUNCTION "public"."resolve_coach_item_name_conflict"();



CREATE OR REPLACE TRIGGER "trg_resolve_metric_name_conflict" BEFORE INSERT OR UPDATE OF "name" ON "public"."coach_metrics" FOR EACH ROW EXECUTE FUNCTION "public"."resolve_coach_item_name_conflict"();



CREATE OR REPLACE TRIGGER "trg_resolve_program_name_conflict" BEFORE INSERT OR UPDATE OF "name" ON "public"."coach_programs" FOR EACH ROW EXECUTE FUNCTION "public"."resolve_coach_item_name_conflict"();



CREATE OR REPLACE TRIGGER "trg_resolve_questionnaire_name_conflict" BEFORE INSERT OR UPDATE OF "name" ON "public"."coach_questionnaires" FOR EACH ROW EXECUTE FUNCTION "public"."resolve_coach_item_name_conflict"();



CREATE OR REPLACE TRIGGER "trg_resolve_section_name_conflict" BEFORE INSERT OR UPDATE OF "name" ON "public"."coach_sections" FOR EACH ROW EXECUTE FUNCTION "public"."resolve_coach_item_name_conflict"();



CREATE OR REPLACE TRIGGER "trg_resolve_workout_name_conflict" BEFORE INSERT OR UPDATE OF "name" ON "public"."coach_workouts" FOR EACH ROW EXECUTE FUNCTION "public"."resolve_coach_item_name_conflict"();



CREATE OR REPLACE TRIGGER "trg_update_conversation_on_message" AFTER INSERT OR UPDATE OF "content", "is_deleted", "message_type" ON "public"."messages" FOR EACH ROW EXECUTE FUNCTION "public"."update_conversation_on_message"();



CREATE OR REPLACE TRIGGER "trg_update_message_status_on_read" AFTER INSERT OR UPDATE OF "last_read_at" ON "public"."message_read_receipts" FOR EACH ROW EXECUTE FUNCTION "public"."update_message_status_on_read"();



CREATE OR REPLACE TRIGGER "update_coach_profiles_updated_at" BEFORE UPDATE ON "public"."coach_profiles" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_user_profiles_updated_at" BEFORE UPDATE ON "public"."user_profiles" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."coach_profiles"
    ADD CONSTRAINT "coach_profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."coach_unique_codes"
    ADD CONSTRAINT "coach_unique_codes_coach_id_fkey" FOREIGN KEY ("coach_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."message_attachments"
    ADD CONSTRAINT "fk_attach_conversation" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."message_attachments"
    ADD CONSTRAINT "fk_attach_message" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."coach_auto_todolist"
    ADD CONSTRAINT "fk_auto_todo_client_user" FOREIGN KEY ("client_id", "client_user_type") REFERENCES "public"."user_profiles"("id", "user_type") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."coach_auto_todolist"
    ADD CONSTRAINT "fk_cat_client" FOREIGN KEY ("client_id") REFERENCES "public"."client_profiles"("client_id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."coach_auto_todolist"
    ADD CONSTRAINT "fk_cat_coach" FOREIGN KEY ("coach_id") REFERENCES "public"."coach_profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."client_bio"
    ADD CONSTRAINT "fk_cb_client" FOREIGN KEY ("client_id") REFERENCES "public"."client_profiles"("client_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."client_bio"
    ADD CONSTRAINT "fk_cb_coach" FOREIGN KEY ("coach_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."client_checkins"
    ADD CONSTRAINT "fk_cca_client" FOREIGN KEY ("client_id") REFERENCES "public"."client_profiles"("client_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."coach_client_assignments"
    ADD CONSTRAINT "fk_cca_client" FOREIGN KEY ("client_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."coach_client_assignments"
    ADD CONSTRAINT "fk_cca_client_profile" FOREIGN KEY ("client_id") REFERENCES "public"."client_profiles"("client_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."coach_client_assignments"
    ADD CONSTRAINT "fk_cca_coach" FOREIGN KEY ("coach_id") REFERENCES "public"."coach_profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."client_checkin_logs"
    ADD CONSTRAINT "fk_ccl_client" FOREIGN KEY ("client_id") REFERENCES "public"."client_profiles"("client_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."client_files"
    ADD CONSTRAINT "fk_cfa_client" FOREIGN KEY ("client_id") REFERENCES "public"."client_profiles"("client_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."client_goals"
    ADD CONSTRAINT "fk_cg_client" FOREIGN KEY ("client_id") REFERENCES "public"."client_profiles"("client_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."client_goals"
    ADD CONSTRAINT "fk_cg_coach" FOREIGN KEY ("coach_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."client_habits"
    ADD CONSTRAINT "fk_cha_client" FOREIGN KEY ("client_id") REFERENCES "public"."client_profiles"("client_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."coach_getting_started_checklist"
    ADD CONSTRAINT "fk_checklist_coach" FOREIGN KEY ("coach_id") REFERENCES "public"."coach_profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."client_habit_logs"
    ADD CONSTRAINT "fk_chl_client" FOREIGN KEY ("client_id") REFERENCES "public"."client_profiles"("client_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."client_injuries"
    ADD CONSTRAINT "fk_ci_client" FOREIGN KEY ("client_id") REFERENCES "public"."client_profiles"("client_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."client_injuries"
    ADD CONSTRAINT "fk_ci_coach" FOREIGN KEY ("coach_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."client_checkin_logs"
    ADD CONSTRAINT "fk_client_checkin_logs_assignment" FOREIGN KEY ("assignment_id") REFERENCES "public"."client_checkins"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."client_habit_logs"
    ADD CONSTRAINT "fk_client_habit_logs_assignment" FOREIGN KEY ("assignment_id") REFERENCES "public"."client_habits"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."client_metric_logs"
    ADD CONSTRAINT "fk_client_metric_logs_assignment" FOREIGN KEY ("assignment_id") REFERENCES "public"."client_metrics"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."client_profiles"
    ADD CONSTRAINT "fk_client_profile" FOREIGN KEY ("client_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."client_questionnaire_logs"
    ADD CONSTRAINT "fk_client_questionnaire_logs_assignment" FOREIGN KEY ("assignment_id") REFERENCES "public"."client_questionnaires"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."client_metrics"
    ADD CONSTRAINT "fk_cma_client" FOREIGN KEY ("client_id") REFERENCES "public"."client_profiles"("client_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."client_metric_logs"
    ADD CONSTRAINT "fk_cme_client" FOREIGN KEY ("client_id") REFERENCES "public"."client_profiles"("client_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."client_notes"
    ADD CONSTRAINT "fk_cn_client" FOREIGN KEY ("client_id") REFERENCES "public"."client_profiles"("client_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."client_notes"
    ADD CONSTRAINT "fk_cn_coach" FOREIGN KEY ("coach_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."coach_checkins"
    ADD CONSTRAINT "fk_coach_checkins_owner" FOREIGN KEY ("coach_id") REFERENCES "public"."coach_profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."coach_company_information"
    ADD CONSTRAINT "fk_coach_company_owner" FOREIGN KEY ("coach_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."coach_exercises"
    ADD CONSTRAINT "fk_coach_exercises_owner" FOREIGN KEY ("coach_id") REFERENCES "public"."coach_profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."coach_files"
    ADD CONSTRAINT "fk_coach_files_owner" FOREIGN KEY ("coach_id") REFERENCES "public"."coach_profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."coach_flows"
    ADD CONSTRAINT "fk_coach_flows_owner" FOREIGN KEY ("coach_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."coach_habits"
    ADD CONSTRAINT "fk_coach_habits_owner" FOREIGN KEY ("coach_id") REFERENCES "public"."coach_profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."coach_metrics"
    ADD CONSTRAINT "fk_coach_metrics_owner" FOREIGN KEY ("coach_id") REFERENCES "public"."coach_profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."coach_notification_preferences"
    ADD CONSTRAINT "fk_coach_notif_owner" FOREIGN KEY ("coach_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."coach_preferences"
    ADD CONSTRAINT "fk_coach_preferences_owner" FOREIGN KEY ("coach_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."coach_programs"
    ADD CONSTRAINT "fk_coach_programs_owner" FOREIGN KEY ("coach_id") REFERENCES "public"."coach_profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."coach_questionnaires"
    ADD CONSTRAINT "fk_coach_quest_owner" FOREIGN KEY ("coach_id") REFERENCES "public"."coach_profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."coach_sections"
    ADD CONSTRAINT "fk_coach_sections_owner" FOREIGN KEY ("coach_id") REFERENCES "public"."coach_profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."coach_workouts"
    ADD CONSTRAINT "fk_coach_workouts_owner" FOREIGN KEY ("coach_id") REFERENCES "public"."coach_profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."conversations"
    ADD CONSTRAINT "fk_conv_client" FOREIGN KEY ("client_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."conversations"
    ADD CONSTRAINT "fk_conv_coach" FOREIGN KEY ("coach_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."coach_own_todolist"
    ADD CONSTRAINT "fk_cot_client" FOREIGN KEY ("client_id") REFERENCES "public"."client_profiles"("client_id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."coach_own_todolist"
    ADD CONSTRAINT "fk_cot_coach" FOREIGN KEY ("coach_id") REFERENCES "public"."coach_profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."conversation_participants"
    ADD CONSTRAINT "fk_cp_conversation" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."conversation_participants"
    ADD CONSTRAINT "fk_cp_other_user" FOREIGN KEY ("other_user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."conversation_participants"
    ADD CONSTRAINT "fk_cp_user" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."client_photo_logs"
    ADD CONSTRAINT "fk_cpl_client" FOREIGN KEY ("client_id") REFERENCES "public"."client_profiles"("client_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."client_questionnaires"
    ADD CONSTRAINT "fk_cqa_client" FOREIGN KEY ("client_id") REFERENCES "public"."client_profiles"("client_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."client_questionnaire_logs"
    ADD CONSTRAINT "fk_cql_client" FOREIGN KEY ("client_id") REFERENCES "public"."client_profiles"("client_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."client_training"
    ADD CONSTRAINT "fk_ct_client" FOREIGN KEY ("client_id") REFERENCES "public"."client_profiles"("client_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."client_training"
    ADD CONSTRAINT "fk_ct_coach" FOREIGN KEY ("coach_id") REFERENCES "public"."coach_profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."client_training_exercise_history"
    ADD CONSTRAINT "fk_cteh_client" FOREIGN KEY ("client_id") REFERENCES "public"."client_profiles"("client_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."client_training_exercise_history"
    ADD CONSTRAINT "fk_cteh_coach" FOREIGN KEY ("coach_id") REFERENCES "public"."coach_profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."client_training_exercise_history"
    ADD CONSTRAINT "fk_cteh_training_history" FOREIGN KEY ("client_id", "coach_id", "date", "workout_id") REFERENCES "public"."client_training_history"("client_id", "coach_id", "date", "workout_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."client_training_history"
    ADD CONSTRAINT "fk_cth_client" FOREIGN KEY ("client_id") REFERENCES "public"."client_profiles"("client_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."client_training_history"
    ADD CONSTRAINT "fk_cth_coach" FOREIGN KEY ("coach_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."client_updates"
    ADD CONSTRAINT "fk_cu_client" FOREIGN KEY ("client_id") REFERENCES "public"."client_profiles"("client_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."client_updates"
    ADD CONSTRAINT "fk_cu_coach" FOREIGN KEY ("coach_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."feature_requests"
    ADD CONSTRAINT "fk_fr_user" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."feature_request_replies"
    ADD CONSTRAINT "fk_frr_feature_request" FOREIGN KEY ("feature_request_id") REFERENCES "public"."feature_requests"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."feature_request_replies"
    ADD CONSTRAINT "fk_frr_user" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."feature_request_upvotes"
    ADD CONSTRAINT "fk_fru_feature_request" FOREIGN KEY ("feature_request_id") REFERENCES "public"."feature_requests"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."feature_request_upvotes"
    ADD CONSTRAINT "fk_fru_user" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "fk_msg_conversation" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "fk_msg_parent" FOREIGN KEY ("parent_message_id") REFERENCES "public"."messages"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "fk_msg_sender" FOREIGN KEY ("sender_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."coach_notification_preferences"
    ADD CONSTRAINT "fk_notif_event" FOREIGN KEY ("event_id") REFERENCES "public"."available_notification_events"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."coach_own_todolist"
    ADD CONSTRAINT "fk_own_todo_client_user" FOREIGN KEY ("client_id", "client_user_type") REFERENCES "public"."user_profiles"("id", "user_type") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."message_reactions"
    ADD CONSTRAINT "fk_reaction_conversation" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."message_reactions"
    ADD CONSTRAINT "fk_reaction_message" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."message_reactions"
    ADD CONSTRAINT "fk_reaction_user" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."message_read_receipts"
    ADD CONSTRAINT "fk_receipt_conversation" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."message_read_receipts"
    ADD CONSTRAINT "fk_receipt_message" FOREIGN KEY ("last_read_message_id") REFERENCES "public"."messages"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."message_read_receipts"
    ADD CONSTRAINT "fk_receipt_user" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."client_training_summary"
    ADD CONSTRAINT "fk_training_summary_client" FOREIGN KEY ("client_id") REFERENCES "public"."client_profiles"("client_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_profiles"
    ADD CONSTRAINT "user_profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Authenticated users can view cache population log" ON "public"."musclewiki_cache_population_log" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Available events are viewable by authenticated users" ON "public"."available_notification_events" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Coaches can delete own profile" ON "public"."coach_profiles" FOR DELETE TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "id"));



CREATE POLICY "Coaches can delete their own notification preferences" ON "public"."coach_notification_preferences" FOR DELETE TO "authenticated" USING (("coach_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Coaches can insert their own notification preferences" ON "public"."coach_notification_preferences" FOR INSERT TO "authenticated" WITH CHECK (("coach_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Coaches can read own profile" ON "public"."coach_profiles" FOR SELECT TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "id"));



CREATE POLICY "Coaches can update own profile" ON "public"."coach_profiles" FOR UPDATE TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "id"));



CREATE POLICY "Coaches can update their own notification preferences" ON "public"."coach_notification_preferences" FOR UPDATE TO "authenticated" USING (("coach_id" = ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK (("coach_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Coaches can view own unique code" ON "public"."coach_unique_codes" FOR SELECT TO "authenticated" USING (("coach_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Coaches can view their own notification preferences" ON "public"."coach_notification_preferences" FOR SELECT TO "authenticated" USING (("coach_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Service role can manage cache population log" ON "public"."musclewiki_cache_population_log" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "System can insert coach profiles" ON "public"."coach_profiles" FOR INSERT TO "service_role" WITH CHECK (true);



CREATE POLICY "System can insert profiles" ON "public"."user_profiles" FOR INSERT TO "service_role" WITH CHECK (true);



CREATE POLICY "Users add reactions" ON "public"."message_reactions" FOR INSERT WITH CHECK ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) AND (EXISTS ( SELECT 1
   FROM "public"."conversations" "c"
  WHERE (("c"."id" = "message_reactions"."conversation_id") AND (("c"."coach_id" = ( SELECT "auth"."uid"() AS "uid")) OR ("c"."client_id" = ( SELECT "auth"."uid"() AS "uid"))))))));



CREATE POLICY "Users can delete own profile" ON "public"."user_profiles" FOR DELETE TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "id"));



CREATE POLICY "Users can update own profile" ON "public"."user_profiles" FOR UPDATE TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "id")) WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "id"));



CREATE POLICY "Users can view own profile and conversation participants" ON "public"."user_profiles" FOR SELECT USING ((("id" = ( SELECT "auth"."uid"() AS "uid")) OR ("id" IN ( SELECT DISTINCT
        CASE
            WHEN ("conversations"."coach_id" = ( SELECT "auth"."uid"() AS "uid")) THEN "conversations"."client_id"
            WHEN ("conversations"."client_id" = ( SELECT "auth"."uid"() AS "uid")) THEN "conversations"."coach_id"
            ELSE NULL::"uuid"
        END AS "case"
   FROM "public"."conversations"
  WHERE ((("conversations"."coach_id" = ( SELECT "auth"."uid"() AS "uid")) OR ("conversations"."client_id" = ( SELECT "auth"."uid"() AS "uid"))) AND (
        CASE
            WHEN ("conversations"."coach_id" = ( SELECT "auth"."uid"() AS "uid")) THEN "conversations"."client_id"
            WHEN ("conversations"."client_id" = ( SELECT "auth"."uid"() AS "uid")) THEN "conversations"."coach_id"
            ELSE NULL::"uuid"
        END IS NOT NULL))))));



CREATE POLICY "Users create own conversations" ON "public"."conversations" FOR INSERT WITH CHECK (((( SELECT "auth"."uid"() AS "uid") = "coach_id") OR (( SELECT "auth"."uid"() AS "uid") = "client_id")));



CREATE POLICY "Users delete own messages" ON "public"."messages" FOR DELETE USING (("sender_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users edit own messages" ON "public"."messages" FOR UPDATE USING (("sender_id" = ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK (("sender_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users insert own read receipts" ON "public"."message_read_receipts" FOR INSERT WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users remove own reactions" ON "public"."message_reactions" FOR DELETE USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users send messages" ON "public"."messages" FOR INSERT WITH CHECK ((("sender_id" = ( SELECT "auth"."uid"() AS "uid")) AND (EXISTS ( SELECT 1
   FROM "public"."conversations" "c"
  WHERE (("c"."id" = "messages"."conversation_id") AND (("c"."coach_id" = ( SELECT "auth"."uid"() AS "uid")) OR ("c"."client_id" = ( SELECT "auth"."uid"() AS "uid"))))))));



CREATE POLICY "Users update attachments in conversations" ON "public"."message_attachments" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."conversations" "c"
  WHERE (("c"."id" = "message_attachments"."conversation_id") AND (("c"."coach_id" = ( SELECT "auth"."uid"() AS "uid")) OR ("c"."client_id" = ( SELECT "auth"."uid"() AS "uid")))))));



CREATE POLICY "Users update own participant records" ON "public"."conversation_participants" FOR UPDATE USING (("user_id" = ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users update own read receipts" ON "public"."message_read_receipts" FOR UPDATE USING (("user_id" = ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users upload attachments to conversations" ON "public"."message_attachments" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."conversations" "c"
  WHERE (("c"."id" = "message_attachments"."conversation_id") AND (("c"."coach_id" = ( SELECT "auth"."uid"() AS "uid")) OR ("c"."client_id" = ( SELECT "auth"."uid"() AS "uid")))))));



CREATE POLICY "Users view attachments in conversations" ON "public"."message_attachments" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."conversations" "c"
  WHERE (("c"."id" = "message_attachments"."conversation_id") AND (("c"."coach_id" = ( SELECT "auth"."uid"() AS "uid")) OR ("c"."client_id" = ( SELECT "auth"."uid"() AS "uid")))))));



CREATE POLICY "Users view own conversations" ON "public"."conversations" FOR SELECT USING (((( SELECT "auth"."uid"() AS "uid") = "coach_id") OR (( SELECT "auth"."uid"() AS "uid") = "client_id")));



CREATE POLICY "Users view own messages" ON "public"."messages" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."conversations" "c"
  WHERE (("c"."id" = "messages"."conversation_id") AND (("c"."coach_id" = ( SELECT "auth"."uid"() AS "uid")) OR ("c"."client_id" = ( SELECT "auth"."uid"() AS "uid")))))));



CREATE POLICY "Users view own participant records" ON "public"."conversation_participants" FOR SELECT USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users view reactions" ON "public"."message_reactions" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."conversations" "c"
  WHERE (("c"."id" = "message_reactions"."conversation_id") AND (("c"."coach_id" = ( SELECT "auth"."uid"() AS "uid")) OR ("c"."client_id" = ( SELECT "auth"."uid"() AS "uid")))))));



CREATE POLICY "Users view read receipts" ON "public"."message_read_receipts" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."conversations" "c"
  WHERE (("c"."id" = "message_read_receipts"."conversation_id") AND (("c"."coach_id" = ( SELECT "auth"."uid"() AS "uid")) OR ("c"."client_id" = ( SELECT "auth"."uid"() AS "uid")))))));



ALTER TABLE "public"."available_notification_events" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "cat_manage" ON "public"."coach_auto_todolist" TO "authenticated" USING (("coach_id" = ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK (("coach_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "cb_manage" ON "public"."client_bio" TO "authenticated" USING (("coach_id" = ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK (("coach_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "cc_all" ON "public"."client_checkins" TO "authenticated" USING ((("client_id" = ( SELECT "auth"."uid"() AS "uid")) OR ("coach_id" = ( SELECT "auth"."uid"() AS "uid")))) WITH CHECK ((("client_id" = ( SELECT "auth"."uid"() AS "uid")) OR ("coach_id" = ( SELECT "auth"."uid"() AS "uid"))));



CREATE POLICY "cc_all" ON "public"."coach_checkins" TO "authenticated" USING (("coach_id" = ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK (("coach_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "cca_delete" ON "public"."coach_client_assignments" FOR DELETE TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "coach_id"));



CREATE POLICY "cca_insert" ON "public"."coach_client_assignments" FOR INSERT TO "authenticated" WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "coach_id"));



CREATE POLICY "cca_select" ON "public"."coach_client_assignments" FOR SELECT TO "authenticated" USING (((( SELECT "auth"."uid"() AS "uid") = "coach_id") OR (( SELECT "auth"."uid"() AS "uid") = "client_id")));



CREATE POLICY "cca_update" ON "public"."coach_client_assignments" FOR UPDATE TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "coach_id")) WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "coach_id"));



CREATE POLICY "cci_delete" ON "public"."coach_company_information" FOR DELETE TO "authenticated" USING (("coach_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "cci_insert" ON "public"."coach_company_information" FOR INSERT TO "authenticated" WITH CHECK (("coach_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "cci_select_public" ON "public"."coach_company_information" FOR SELECT USING (true);



CREATE POLICY "cci_update" ON "public"."coach_company_information" FOR UPDATE TO "authenticated" USING (("coach_id" = ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK (("coach_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "ccl_shared" ON "public"."client_checkin_logs" TO "authenticated" USING (((( SELECT "auth"."uid"() AS "uid") = "client_id") OR (( SELECT "auth"."uid"() AS "uid") = "coach_id"))) WITH CHECK (((( SELECT "auth"."uid"() AS "uid") = "client_id") OR (( SELECT "auth"."uid"() AS "uid") = "coach_id")));



CREATE POLICY "ce_manage" ON "public"."coach_exercises" TO "authenticated" USING (("coach_id" = ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK (("coach_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "cf_all" ON "public"."client_files" TO "authenticated" USING ((("client_id" = ( SELECT "auth"."uid"() AS "uid")) OR ("coach_id" = ( SELECT "auth"."uid"() AS "uid")))) WITH CHECK ((("client_id" = ( SELECT "auth"."uid"() AS "uid")) OR ("coach_id" = ( SELECT "auth"."uid"() AS "uid"))));



CREATE POLICY "cf_all" ON "public"."coach_files" TO "authenticated" USING (("coach_id" = ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK (("coach_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "cf_all" ON "public"."coach_flows" TO "authenticated" USING (("coach_id" = ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK (("coach_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "cg_manage" ON "public"."client_goals" TO "authenticated" USING (("coach_id" = ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK (("coach_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "cgsc_coach_all" ON "public"."coach_getting_started_checklist" TO "authenticated" USING (("coach_id" = ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK (("coach_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "ch_all" ON "public"."client_habits" TO "authenticated" USING ((("client_id" = ( SELECT "auth"."uid"() AS "uid")) OR ("coach_id" = ( SELECT "auth"."uid"() AS "uid")))) WITH CHECK ((("client_id" = ( SELECT "auth"."uid"() AS "uid")) OR ("coach_id" = ( SELECT "auth"."uid"() AS "uid"))));



CREATE POLICY "ch_all" ON "public"."coach_habits" TO "authenticated" USING (("coach_id" = ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK (("coach_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "chl_all" ON "public"."client_habit_logs" TO "authenticated" USING ((("client_id" = ( SELECT "auth"."uid"() AS "uid")) OR ("coach_id" = ( SELECT "auth"."uid"() AS "uid")))) WITH CHECK ((("client_id" = ( SELECT "auth"."uid"() AS "uid")) OR ("coach_id" = ( SELECT "auth"."uid"() AS "uid"))));



CREATE POLICY "ci_manage" ON "public"."client_injuries" TO "authenticated" USING (("coach_id" = ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK (("coach_id" = ( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."client_bio" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."client_checkin_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."client_checkins" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."client_files" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."client_goals" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."client_habit_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."client_habits" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."client_injuries" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."client_metric_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."client_metrics" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."client_notes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."client_photo_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."client_profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."client_questionnaire_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."client_questionnaires" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."client_training" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."client_training_exercise_history" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."client_training_history" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."client_training_summary" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."client_updates" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "client_updates_coach_delete" ON "public"."client_updates" FOR DELETE USING (("coach_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "client_updates_coach_insert" ON "public"."client_updates" FOR INSERT WITH CHECK (("coach_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "client_updates_coach_update" ON "public"."client_updates" FOR UPDATE USING (("coach_id" = ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK (("coach_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "client_updates_select_policy" ON "public"."client_updates" FOR SELECT USING ((("coach_id" = ( SELECT "auth"."uid"() AS "uid")) OR ("client_id" = ( SELECT "auth"."uid"() AS "uid")) OR (EXISTS ( SELECT 1
   FROM "public"."client_profiles" "cp"
  WHERE (("cp"."client_id" = "client_updates"."client_id") AND ("cp"."client_id" = ( SELECT "auth"."uid"() AS "uid")))))));



CREATE POLICY "cm_all" ON "public"."client_metrics" TO "authenticated" USING ((("client_id" = ( SELECT "auth"."uid"() AS "uid")) OR ("coach_id" = ( SELECT "auth"."uid"() AS "uid")))) WITH CHECK ((("client_id" = ( SELECT "auth"."uid"() AS "uid")) OR ("coach_id" = ( SELECT "auth"."uid"() AS "uid"))));



CREATE POLICY "cm_all" ON "public"."coach_metrics" TO "authenticated" USING (("coach_id" = ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK (("coach_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "cml_all" ON "public"."client_metric_logs" TO "authenticated" USING ((("client_id" = ( SELECT "auth"."uid"() AS "uid")) OR ("coach_id" = ( SELECT "auth"."uid"() AS "uid")))) WITH CHECK ((("client_id" = ( SELECT "auth"."uid"() AS "uid")) OR ("coach_id" = ( SELECT "auth"."uid"() AS "uid"))));



CREATE POLICY "cn_manage" ON "public"."client_notes" TO "authenticated" USING (("coach_id" = ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK (("coach_id" = ( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."coach_auto_todolist" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."coach_checkins" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."coach_client_assignments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."coach_company_information" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."coach_exercises" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."coach_files" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."coach_flows" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."coach_getting_started_checklist" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."coach_habits" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."coach_metrics" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."coach_notification_preferences" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."coach_own_todolist" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "coach_p_delete" ON "public"."coach_preferences" FOR DELETE TO "authenticated" USING (("coach_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "coach_p_insert" ON "public"."coach_preferences" FOR INSERT TO "authenticated" WITH CHECK (("coach_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "coach_p_select" ON "public"."coach_preferences" FOR SELECT TO "authenticated" USING (("coach_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "coach_p_update" ON "public"."coach_preferences" FOR UPDATE TO "authenticated" USING (("coach_id" = ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK (("coach_id" = ( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."coach_preferences" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."coach_profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."coach_programs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."coach_questionnaires" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."coach_sections" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "coach_sections_delete" ON "public"."coach_sections" FOR DELETE USING ((( SELECT "auth"."uid"() AS "uid") = "coach_id"));



CREATE POLICY "coach_sections_insert" ON "public"."coach_sections" FOR INSERT WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "coach_id"));



CREATE POLICY "coach_sections_select" ON "public"."coach_sections" FOR SELECT USING ((( SELECT "auth"."uid"() AS "uid") = "coach_id"));



CREATE POLICY "coach_sections_update" ON "public"."coach_sections" FOR UPDATE USING ((( SELECT "auth"."uid"() AS "uid") = "coach_id")) WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "coach_id"));



ALTER TABLE "public"."coach_unique_codes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."coach_workouts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."conversation_participants" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."conversations" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "cot_manage" ON "public"."coach_own_todolist" TO "authenticated" USING (("coach_id" = ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK (("coach_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "cp_delete" ON "public"."client_profiles" FOR DELETE TO "authenticated" USING (((( SELECT "auth"."uid"() AS "uid") = "client_id") OR (EXISTS ( SELECT 1
   FROM "public"."coach_client_assignments" "cca"
  WHERE (("cca"."client_id" = "client_profiles"."client_id") AND ("cca"."coach_id" = ( SELECT "auth"."uid"() AS "uid")))))));



CREATE POLICY "cp_insert_coach" ON "public"."client_profiles" FOR INSERT TO "authenticated" WITH CHECK ((("client_id" = ( SELECT "auth"."uid"() AS "uid")) OR (EXISTS ( SELECT 1
   FROM "public"."coach_client_assignments" "cca"
  WHERE (("cca"."client_id" = "client_profiles"."client_id") AND ("cca"."coach_id" = ( SELECT "auth"."uid"() AS "uid")))))));



CREATE POLICY "cp_select" ON "public"."client_profiles" FOR SELECT TO "authenticated" USING ((("client_id" = ( SELECT "auth"."uid"() AS "uid")) OR (EXISTS ( SELECT 1
   FROM "public"."coach_client_assignments" "cca"
  WHERE (("cca"."client_id" = "client_profiles"."client_id") AND ("cca"."coach_id" = ( SELECT "auth"."uid"() AS "uid")))))));



CREATE POLICY "cp_update" ON "public"."client_profiles" FOR UPDATE TO "authenticated" USING ((("client_id" = ( SELECT "auth"."uid"() AS "uid")) OR (EXISTS ( SELECT 1
   FROM "public"."coach_client_assignments" "cca"
  WHERE (("cca"."client_id" = "client_profiles"."client_id") AND ("cca"."coach_id" = ( SELECT "auth"."uid"() AS "uid"))))))) WITH CHECK ((("client_id" = ( SELECT "auth"."uid"() AS "uid")) OR (EXISTS ( SELECT 1
   FROM "public"."coach_client_assignments" "cca"
  WHERE (("cca"."client_id" = "client_profiles"."client_id") AND ("cca"."coach_id" = ( SELECT "auth"."uid"() AS "uid")))))));



CREATE POLICY "cpl_shared" ON "public"."client_photo_logs" TO "authenticated" USING (((( SELECT "auth"."uid"() AS "uid") = "client_id") OR (( SELECT "auth"."uid"() AS "uid") = "coach_id"))) WITH CHECK (((( SELECT "auth"."uid"() AS "uid") = "client_id") OR (( SELECT "auth"."uid"() AS "uid") = "coach_id")));



CREATE POLICY "cprog_manage" ON "public"."coach_programs" TO "authenticated" USING (("coach_id" = ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK (("coach_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "cq_all" ON "public"."client_questionnaires" TO "authenticated" USING ((("client_id" = ( SELECT "auth"."uid"() AS "uid")) OR ("coach_id" = ( SELECT "auth"."uid"() AS "uid")))) WITH CHECK ((("client_id" = ( SELECT "auth"."uid"() AS "uid")) OR ("coach_id" = ( SELECT "auth"."uid"() AS "uid"))));



CREATE POLICY "cq_all" ON "public"."coach_questionnaires" TO "authenticated" USING (("coach_id" = ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK (("coach_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "cql_shared" ON "public"."client_questionnaire_logs" TO "authenticated" USING (((( SELECT "auth"."uid"() AS "uid") = "client_id") OR (( SELECT "auth"."uid"() AS "uid") = "coach_id"))) WITH CHECK (((( SELECT "auth"."uid"() AS "uid") = "client_id") OR (( SELECT "auth"."uid"() AS "uid") = "coach_id")));



CREATE POLICY "ct_delete_coach" ON "public"."client_training" FOR DELETE TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "coach_id"));



CREATE POLICY "ct_insert_coach" ON "public"."client_training" FOR INSERT TO "authenticated" WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "coach_id"));



CREATE POLICY "ct_select" ON "public"."client_training" FOR SELECT TO "authenticated" USING (((( SELECT "auth"."uid"() AS "uid") = "client_id") OR (( SELECT "auth"."uid"() AS "uid") = "coach_id")));



CREATE POLICY "ct_update_shared" ON "public"."client_training" FOR UPDATE TO "authenticated" USING (((( SELECT "auth"."uid"() AS "uid") = "client_id") OR (( SELECT "auth"."uid"() AS "uid") = "coach_id"))) WITH CHECK (((( SELECT "auth"."uid"() AS "uid") = "client_id") OR (( SELECT "auth"."uid"() AS "uid") = "coach_id")));



CREATE POLICY "cteh_modify" ON "public"."client_training_exercise_history" TO "authenticated" USING (((( SELECT "auth"."uid"() AS "uid") = "client_id") OR (( SELECT "auth"."uid"() AS "uid") = "coach_id"))) WITH CHECK (((( SELECT "auth"."uid"() AS "uid") = "client_id") OR (( SELECT "auth"."uid"() AS "uid") = "coach_id")));



CREATE POLICY "cth_delete" ON "public"."client_training_history" FOR DELETE USING (((( SELECT "auth"."uid"() AS "uid") = "client_id") OR (( SELECT "auth"."uid"() AS "uid") = "coach_id")));



CREATE POLICY "cth_insert" ON "public"."client_training_history" FOR INSERT WITH CHECK (((( SELECT "auth"."uid"() AS "uid") = "client_id") OR (( SELECT "auth"."uid"() AS "uid") = "coach_id")));



CREATE POLICY "cth_select" ON "public"."client_training_history" FOR SELECT USING (((( SELECT "auth"."uid"() AS "uid") = "client_id") OR (( SELECT "auth"."uid"() AS "uid") = "coach_id")));



CREATE POLICY "cth_update" ON "public"."client_training_history" FOR UPDATE USING (((( SELECT "auth"."uid"() AS "uid") = "client_id") OR (( SELECT "auth"."uid"() AS "uid") = "coach_id"))) WITH CHECK (((( SELECT "auth"."uid"() AS "uid") = "client_id") OR (( SELECT "auth"."uid"() AS "uid") = "coach_id")));



CREATE POLICY "cts_client_insert" ON "public"."client_training_summary" FOR INSERT TO "authenticated" WITH CHECK (("client_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "cts_client_update" ON "public"."client_training_summary" FOR UPDATE TO "authenticated" USING (("client_id" = ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK (("client_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "cts_select" ON "public"."client_training_summary" FOR SELECT TO "authenticated" USING (((( SELECT "auth"."uid"() AS "uid") = "client_id") OR (EXISTS ( SELECT 1
   FROM "public"."coach_client_assignments" "cca"
  WHERE (("cca"."client_id" = "client_training_summary"."client_id") AND ("cca"."coach_id" = ( SELECT "auth"."uid"() AS "uid")))))));



CREATE POLICY "cw_manage" ON "public"."coach_workouts" TO "authenticated" USING (("coach_id" = ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK (("coach_id" = ( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."feature_request_replies" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "feature_request_replies_delete" ON "public"."feature_request_replies" FOR DELETE USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "feature_request_replies_insert" ON "public"."feature_request_replies" FOR INSERT WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "feature_request_replies_select" ON "public"."feature_request_replies" FOR SELECT USING (true);



ALTER TABLE "public"."feature_request_upvotes" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "feature_request_upvotes_delete" ON "public"."feature_request_upvotes" FOR DELETE USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "feature_request_upvotes_insert" ON "public"."feature_request_upvotes" FOR INSERT WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "feature_request_upvotes_select" ON "public"."feature_request_upvotes" FOR SELECT USING (true);



ALTER TABLE "public"."feature_requests" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "feature_requests_delete" ON "public"."feature_requests" FOR DELETE USING ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("status" IS NULL)));



CREATE POLICY "feature_requests_insert" ON "public"."feature_requests" FOR INSERT WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "feature_requests_select" ON "public"."feature_requests" FOR SELECT USING (true);



CREATE POLICY "feature_requests_update" ON "public"."feature_requests" FOR UPDATE USING (("user_id" = ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."message_attachments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."message_reactions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."message_read_receipts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."messages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."musclewiki_api_audit_log" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "musclewiki_api_audit_log_select" ON "public"."musclewiki_api_audit_log" FOR SELECT USING (true);



ALTER TABLE "public"."musclewiki_cache_population_log" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."musclewiki_exercise_cache" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "musclewiki_exercise_cache_select" ON "public"."musclewiki_exercise_cache" FOR SELECT USING (true);



ALTER TABLE "public"."musclewiki_filter_cache" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "musclewiki_filter_cache_select" ON "public"."musclewiki_filter_cache" FOR SELECT USING (true);



ALTER TABLE "public"."musclewiki_sync_metadata" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "musclewiki_sync_metadata_select" ON "public"."musclewiki_sync_metadata" FOR SELECT USING (true);



ALTER TABLE "public"."musclewiki_thumbnail_cache" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "musclewiki_thumbnail_cache_select" ON "public"."musclewiki_thumbnail_cache" FOR SELECT USING (true);



ALTER TABLE "public"."user_profiles" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."conversation_participants";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."conversations";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."message_reactions";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."message_read_receipts";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."messages";



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";
























































































































































































































































































































REVOKE ALL ON FUNCTION "public"."block_file_path_change"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."block_file_path_change"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."block_file_path_change"() TO "service_role";



GRANT ALL ON FUNCTION "public"."broadcast_message_changes"() TO "anon";
GRANT ALL ON FUNCTION "public"."broadcast_message_changes"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."broadcast_message_changes"() TO "service_role";



GRANT ALL ON FUNCTION "public"."broadcast_message_on_reaction"() TO "anon";
GRANT ALL ON FUNCTION "public"."broadcast_message_on_reaction"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."broadcast_message_on_reaction"() TO "service_role";



GRANT ALL ON FUNCTION "public"."cache_musclewiki_thumbnail"("p_musclewiki_id" "text", "p_thumbnail_url" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."cache_musclewiki_thumbnail"("p_musclewiki_id" "text", "p_thumbnail_url" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."cache_musclewiki_thumbnail"("p_musclewiki_id" "text", "p_thumbnail_url" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."can_receive_conversation_broadcast"("p_conversation_id" "uuid", "p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."can_receive_conversation_broadcast"("p_conversation_id" "uuid", "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_receive_conversation_broadcast"("p_conversation_id" "uuid", "p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."check_attachments_complete"() TO "anon";
GRANT ALL ON FUNCTION "public"."check_attachments_complete"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_attachments_complete"() TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_expired_musclewiki_thumbnails"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_expired_musclewiki_thumbnails"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_expired_musclewiki_thumbnails"() TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_musclewiki_audit_logs"("p_retention_days" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_musclewiki_audit_logs"("p_retention_days" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_musclewiki_audit_logs"("p_retention_days" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."complete_exercise_cache_population"("p_log_id" "uuid", "p_status" "text", "p_total_fetched" integer, "p_total_cached" integer, "p_errors" integer, "p_error_message" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."complete_exercise_cache_population"("p_log_id" "uuid", "p_status" "text", "p_total_fetched" integer, "p_total_cached" integer, "p_errors" integer, "p_error_message" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."complete_exercise_cache_population"("p_log_id" "uuid", "p_status" "text", "p_total_fetched" integer, "p_total_cached" integer, "p_errors" integer, "p_error_message" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."create_conversation_on_client_assignment"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."create_conversation_on_client_assignment"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_conversation_on_client_assignment"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."create_participant_records"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."create_participant_records"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_participant_records"() TO "service_role";



GRANT ALL ON FUNCTION "public"."decrement_upvote_count"() TO "anon";
GRANT ALL ON FUNCTION "public"."decrement_upvote_count"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."decrement_upvote_count"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."enforce_checkin_assignment_integrity"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."enforce_checkin_assignment_integrity"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."enforce_checkin_assignment_integrity"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."enforce_checkin_log_integrity"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."enforce_checkin_log_integrity"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."enforce_checkin_log_integrity"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."enforce_coach_private_integrity"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."enforce_coach_private_integrity"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."enforce_coach_private_integrity"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."enforce_file_assignment_integrity"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."enforce_file_assignment_integrity"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."enforce_file_assignment_integrity"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."enforce_habit_assignment_integrity"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."enforce_habit_assignment_integrity"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."enforce_habit_assignment_integrity"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."enforce_habit_log_integrity"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."enforce_habit_log_integrity"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."enforce_habit_log_integrity"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."enforce_metric_assignment_integrity"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."enforce_metric_assignment_integrity"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."enforce_metric_assignment_integrity"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."enforce_metric_entry_integrity"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."enforce_metric_entry_integrity"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."enforce_metric_entry_integrity"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."enforce_metric_log_integrity"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."enforce_metric_log_integrity"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."enforce_metric_log_integrity"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."enforce_photo_log_integrity"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."enforce_photo_log_integrity"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."enforce_photo_log_integrity"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."enforce_quest_assignment_integrity"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."enforce_quest_assignment_integrity"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."enforce_quest_assignment_integrity"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."enforce_quest_log_integrity"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."enforce_quest_log_integrity"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."enforce_quest_log_integrity"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."enforce_todolist_client_belongs_to_coach"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."enforce_todolist_client_belongs_to_coach"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."enforce_todolist_client_belongs_to_coach"() TO "service_role";



GRANT ALL ON FUNCTION "public"."extract_conversation_id_from_topic"("topic" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."extract_conversation_id_from_topic"("topic" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."extract_conversation_id_from_topic"("topic" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."generate_short_id"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."generate_short_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_short_id"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."generate_short_id"("p_len" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."generate_short_id"("p_len" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_short_id"("p_len" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_cached_musclewiki_exercises"("p_limit" integer, "p_offset" integer, "p_category" "text", "p_difficulty" "text", "p_search_term" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_cached_musclewiki_exercises"("p_limit" integer, "p_offset" integer, "p_category" "text", "p_difficulty" "text", "p_search_term" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_cached_musclewiki_exercises"("p_limit" integer, "p_offset" integer, "p_category" "text", "p_difficulty" "text", "p_search_term" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_coach_notification_settings"("coach_uuid" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_coach_notification_settings"("coach_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_coach_notification_settings"("coach_uuid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_exercise_cache_stats"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_exercise_cache_stats"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_exercise_cache_stats"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_musclewiki_thumbnail"("p_musclewiki_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_musclewiki_thumbnail"("p_musclewiki_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_musclewiki_thumbnail"("p_musclewiki_id" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_musclewiki_usage_stats"("p_days" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_musclewiki_usage_stats"("p_days" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_musclewiki_usage_stats"("p_days" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_or_create_conversation"("p_coach_id" "uuid", "p_client_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_or_create_conversation"("p_coach_id" "uuid", "p_client_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_or_create_conversation"("p_coach_id" "uuid", "p_client_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_profile_picture_url"("user_metadata" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_profile_picture_url"("user_metadata" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_profile_picture_url"("user_metadata" "jsonb") TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_signin_method"("user_metadata" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_signin_method"("user_metadata" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_signin_method"("user_metadata" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_storage_signed_url"("p_bucket_id" "text", "p_file_path" "text", "p_expiry_seconds" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_storage_signed_url"("p_bucket_id" "text", "p_file_path" "text", "p_expiry_seconds" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_storage_signed_url"("p_bucket_id" "text", "p_file_path" "text", "p_expiry_seconds" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_user_type"("user_metadata" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_user_type"("user_metadata" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_type"("user_metadata" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_auth_user_update"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_auth_user_update"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_auth_user_update"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."handle_client_account_deletion"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."handle_client_account_deletion"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_client_account_deletion"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."handle_client_auth_cleanup"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."handle_client_auth_cleanup"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_client_auth_cleanup"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."handle_new_coach_setup"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."handle_new_coach_setup"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_coach_setup"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."handle_new_user"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."handle_user_profile_delete"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."handle_user_profile_delete"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_user_profile_delete"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."handle_user_update"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."handle_user_update"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_user_update"() TO "service_role";



GRANT ALL ON FUNCTION "public"."increment_upvote_count"() TO "anon";
GRANT ALL ON FUNCTION "public"."increment_upvote_count"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_upvote_count"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."is_conversation_participant"("p_conversation_id" "uuid", "p_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."is_conversation_participant"("p_conversation_id" "uuid", "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_conversation_participant"("p_conversation_id" "uuid", "p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."log_musclewiki_api_call"("p_endpoint" "text", "p_method" "text", "p_query_params" "jsonb", "p_response_status" integer, "p_response_size_bytes" integer, "p_exercises_returned" integer, "p_cache_hit" boolean, "p_cache_miss_reason" "text", "p_request_source" "text", "p_user_id" "uuid", "p_request_duration_ms" integer, "p_rate_limit_remaining" integer, "p_rate_limit_reset_at" timestamp with time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."log_musclewiki_api_call"("p_endpoint" "text", "p_method" "text", "p_query_params" "jsonb", "p_response_status" integer, "p_response_size_bytes" integer, "p_exercises_returned" integer, "p_cache_hit" boolean, "p_cache_miss_reason" "text", "p_request_source" "text", "p_user_id" "uuid", "p_request_duration_ms" integer, "p_rate_limit_remaining" integer, "p_rate_limit_reset_at" timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_musclewiki_api_call"("p_endpoint" "text", "p_method" "text", "p_query_params" "jsonb", "p_response_status" integer, "p_response_size_bytes" integer, "p_exercises_returned" integer, "p_cache_hit" boolean, "p_cache_miss_reason" "text", "p_request_source" "text", "p_user_id" "uuid", "p_request_duration_ms" integer, "p_rate_limit_remaining" integer, "p_rate_limit_reset_at" timestamp with time zone) TO "service_role";



REVOKE ALL ON FUNCTION "public"."mark_checklist_automate_onboardings"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."mark_checklist_automate_onboardings"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."mark_checklist_automate_onboardings"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."mark_checklist_check_ins_forms_questionnaire"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."mark_checklist_check_ins_forms_questionnaire"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."mark_checklist_check_ins_forms_questionnaire"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."mark_checklist_custom_exercises"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."mark_checklist_custom_exercises"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."mark_checklist_custom_exercises"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."mark_checklist_lifestyle_habits"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."mark_checklist_lifestyle_habits"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."mark_checklist_lifestyle_habits"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."mark_checklist_on_demand_resources"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."mark_checklist_on_demand_resources"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."mark_checklist_on_demand_resources"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."mark_checklist_powerful_flows"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."mark_checklist_powerful_flows"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."mark_checklist_powerful_flows"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."mark_checklist_program_templates"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."mark_checklist_program_templates"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."mark_checklist_program_templates"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."mark_checklist_track_metrics"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."mark_checklist_track_metrics"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."mark_checklist_track_metrics"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."mark_checklist_workout_ai"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."mark_checklist_workout_ai"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."mark_checklist_workout_ai"() TO "service_role";



GRANT ALL ON FUNCTION "public"."mark_message_attachments_ready"("p_message_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."mark_message_attachments_ready"("p_message_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."mark_message_attachments_ready"("p_message_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."protect_checkin_review_fields"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."protect_checkin_review_fields"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."protect_checkin_review_fields"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."protect_client_profile_fields"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."protect_client_profile_fields"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."protect_client_profile_fields"() TO "service_role";



GRANT ALL ON FUNCTION "public"."record_musclewiki_exercise_access"("p_musclewiki_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."record_musclewiki_exercise_access"("p_musclewiki_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."record_musclewiki_exercise_access"("p_musclewiki_id" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."resolve_coach_item_name_conflict"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."resolve_coach_item_name_conflict"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."resolve_coach_item_name_conflict"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."set_client_item_coach_id"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."set_client_item_coach_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_client_item_coach_id"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."set_habit_log_updated_fields"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."set_habit_log_updated_fields"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_habit_log_updated_fields"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."set_training_summary_updated_by"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."set_training_summary_updated_by"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_training_summary_updated_by"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."set_updated_at"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."should_populate_exercise_cache"() TO "anon";
GRANT ALL ON FUNCTION "public"."should_populate_exercise_cache"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."should_populate_exercise_cache"() TO "service_role";



GRANT ALL ON FUNCTION "public"."start_exercise_cache_population"() TO "anon";
GRANT ALL ON FUNCTION "public"."start_exercise_cache_population"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."start_exercise_cache_population"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trigger_exercise_cache_population"() TO "anon";
GRANT ALL ON FUNCTION "public"."trigger_exercise_cache_population"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trigger_exercise_cache_population"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."update_conversation_on_message"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."update_conversation_on_message"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_conversation_on_message"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."update_message_status_on_read"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."update_message_status_on_read"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_message_status_on_read"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."update_updated_at_column"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."validate_coach_role"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."validate_coach_role"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_coach_role"() TO "service_role";





















GRANT ALL ON TABLE "public"."client_profiles" TO "anon";
GRANT ALL ON TABLE "public"."client_profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."client_profiles" TO "service_role";



GRANT ALL ON TABLE "public"."client_training_summary" TO "anon";
GRANT ALL ON TABLE "public"."client_training_summary" TO "authenticated";
GRANT ALL ON TABLE "public"."client_training_summary" TO "service_role";



GRANT ALL ON TABLE "public"."coach_client_assignments" TO "anon";
GRANT ALL ON TABLE "public"."coach_client_assignments" TO "authenticated";
GRANT ALL ON TABLE "public"."coach_client_assignments" TO "service_role";



GRANT ALL ON TABLE "public"."user_profiles" TO "anon";
GRANT ALL ON TABLE "public"."user_profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."user_profiles" TO "service_role";



GRANT ALL ON TABLE "public"."athletes_grid_view" TO "anon";
GRANT ALL ON TABLE "public"."athletes_grid_view" TO "authenticated";
GRANT ALL ON TABLE "public"."athletes_grid_view" TO "service_role";



GRANT ALL ON TABLE "public"."available_notification_events" TO "anon";
GRANT ALL ON TABLE "public"."available_notification_events" TO "authenticated";
GRANT ALL ON TABLE "public"."available_notification_events" TO "service_role";



GRANT ALL ON TABLE "public"."client_bio" TO "anon";
GRANT ALL ON TABLE "public"."client_bio" TO "authenticated";
GRANT ALL ON TABLE "public"."client_bio" TO "service_role";



GRANT ALL ON TABLE "public"."client_checkin_logs" TO "anon";
GRANT ALL ON TABLE "public"."client_checkin_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."client_checkin_logs" TO "service_role";



GRANT ALL ON TABLE "public"."client_checkins" TO "anon";
GRANT ALL ON TABLE "public"."client_checkins" TO "authenticated";
GRANT ALL ON TABLE "public"."client_checkins" TO "service_role";



GRANT ALL ON TABLE "public"."client_files" TO "anon";
GRANT ALL ON TABLE "public"."client_files" TO "authenticated";
GRANT ALL ON TABLE "public"."client_files" TO "service_role";



GRANT ALL ON TABLE "public"."client_goals" TO "anon";
GRANT ALL ON TABLE "public"."client_goals" TO "authenticated";
GRANT ALL ON TABLE "public"."client_goals" TO "service_role";



GRANT ALL ON TABLE "public"."client_habit_logs" TO "anon";
GRANT ALL ON TABLE "public"."client_habit_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."client_habit_logs" TO "service_role";



GRANT ALL ON TABLE "public"."client_habits" TO "anon";
GRANT ALL ON TABLE "public"."client_habits" TO "authenticated";
GRANT ALL ON TABLE "public"."client_habits" TO "service_role";



GRANT ALL ON TABLE "public"."client_injuries" TO "anon";
GRANT ALL ON TABLE "public"."client_injuries" TO "authenticated";
GRANT ALL ON TABLE "public"."client_injuries" TO "service_role";



GRANT ALL ON TABLE "public"."client_metric_logs" TO "anon";
GRANT ALL ON TABLE "public"."client_metric_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."client_metric_logs" TO "service_role";



GRANT ALL ON TABLE "public"."client_metrics" TO "anon";
GRANT ALL ON TABLE "public"."client_metrics" TO "authenticated";
GRANT ALL ON TABLE "public"."client_metrics" TO "service_role";



GRANT ALL ON TABLE "public"."client_notes" TO "anon";
GRANT ALL ON TABLE "public"."client_notes" TO "authenticated";
GRANT ALL ON TABLE "public"."client_notes" TO "service_role";



GRANT ALL ON TABLE "public"."client_photo_logs" TO "anon";
GRANT ALL ON TABLE "public"."client_photo_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."client_photo_logs" TO "service_role";



GRANT ALL ON TABLE "public"."client_profiles_full" TO "anon";
GRANT ALL ON TABLE "public"."client_profiles_full" TO "authenticated";
GRANT ALL ON TABLE "public"."client_profiles_full" TO "service_role";



GRANT ALL ON TABLE "public"."client_questionnaire_logs" TO "anon";
GRANT ALL ON TABLE "public"."client_questionnaire_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."client_questionnaire_logs" TO "service_role";



GRANT ALL ON TABLE "public"."client_questionnaires" TO "anon";
GRANT ALL ON TABLE "public"."client_questionnaires" TO "authenticated";
GRANT ALL ON TABLE "public"."client_questionnaires" TO "service_role";



GRANT ALL ON TABLE "public"."client_training" TO "anon";
GRANT ALL ON TABLE "public"."client_training" TO "authenticated";
GRANT ALL ON TABLE "public"."client_training" TO "service_role";



GRANT ALL ON TABLE "public"."client_training_exercise_history" TO "anon";
GRANT ALL ON TABLE "public"."client_training_exercise_history" TO "authenticated";
GRANT ALL ON TABLE "public"."client_training_exercise_history" TO "service_role";



GRANT ALL ON SEQUENCE "public"."client_training_exercise_history_row_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."client_training_exercise_history_row_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."client_training_exercise_history_row_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."client_training_history" TO "anon";
GRANT ALL ON TABLE "public"."client_training_history" TO "authenticated";
GRANT ALL ON TABLE "public"."client_training_history" TO "service_role";



GRANT ALL ON TABLE "public"."client_updates" TO "anon";
GRANT ALL ON TABLE "public"."client_updates" TO "authenticated";
GRANT ALL ON TABLE "public"."client_updates" TO "service_role";



GRANT ALL ON TABLE "public"."coach_auto_todolist" TO "anon";
GRANT ALL ON TABLE "public"."coach_auto_todolist" TO "authenticated";
GRANT ALL ON TABLE "public"."coach_auto_todolist" TO "service_role";



GRANT ALL ON TABLE "public"."coach_checkins" TO "anon";
GRANT ALL ON TABLE "public"."coach_checkins" TO "authenticated";
GRANT ALL ON TABLE "public"."coach_checkins" TO "service_role";



GRANT ALL ON TABLE "public"."coach_checkins_review_view" TO "anon";
GRANT ALL ON TABLE "public"."coach_checkins_review_view" TO "authenticated";
GRANT ALL ON TABLE "public"."coach_checkins_review_view" TO "service_role";



GRANT ALL ON TABLE "public"."coach_clients_view" TO "anon";
GRANT ALL ON TABLE "public"."coach_clients_view" TO "authenticated";
GRANT ALL ON TABLE "public"."coach_clients_view" TO "service_role";



GRANT ALL ON TABLE "public"."coach_company_information" TO "anon";
GRANT ALL ON TABLE "public"."coach_company_information" TO "authenticated";
GRANT ALL ON TABLE "public"."coach_company_information" TO "service_role";



GRANT ALL ON TABLE "public"."coach_exercises" TO "anon";
GRANT ALL ON TABLE "public"."coach_exercises" TO "authenticated";
GRANT ALL ON TABLE "public"."coach_exercises" TO "service_role";



GRANT ALL ON TABLE "public"."coach_files" TO "anon";
GRANT ALL ON TABLE "public"."coach_files" TO "authenticated";
GRANT ALL ON TABLE "public"."coach_files" TO "service_role";



GRANT ALL ON TABLE "public"."coach_flows" TO "anon";
GRANT ALL ON TABLE "public"."coach_flows" TO "authenticated";
GRANT ALL ON TABLE "public"."coach_flows" TO "service_role";



GRANT ALL ON TABLE "public"."coach_getting_started_checklist" TO "anon";
GRANT ALL ON TABLE "public"."coach_getting_started_checklist" TO "authenticated";
GRANT ALL ON TABLE "public"."coach_getting_started_checklist" TO "service_role";



GRANT ALL ON TABLE "public"."coach_habits" TO "anon";
GRANT ALL ON TABLE "public"."coach_habits" TO "authenticated";
GRANT ALL ON TABLE "public"."coach_habits" TO "service_role";



GRANT ALL ON TABLE "public"."coach_metrics" TO "anon";
GRANT ALL ON TABLE "public"."coach_metrics" TO "authenticated";
GRANT ALL ON TABLE "public"."coach_metrics" TO "service_role";



GRANT ALL ON TABLE "public"."coach_notification_preferences" TO "anon";
GRANT ALL ON TABLE "public"."coach_notification_preferences" TO "authenticated";
GRANT ALL ON TABLE "public"."coach_notification_preferences" TO "service_role";



GRANT ALL ON TABLE "public"."coach_own_todolist" TO "anon";
GRANT ALL ON TABLE "public"."coach_own_todolist" TO "authenticated";
GRANT ALL ON TABLE "public"."coach_own_todolist" TO "service_role";



GRANT ALL ON TABLE "public"."coach_preferences" TO "anon";
GRANT ALL ON TABLE "public"."coach_preferences" TO "authenticated";
GRANT ALL ON TABLE "public"."coach_preferences" TO "service_role";



GRANT ALL ON TABLE "public"."coach_profiles" TO "anon";
GRANT ALL ON TABLE "public"."coach_profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."coach_profiles" TO "service_role";



GRANT ALL ON TABLE "public"."coach_profiles_full" TO "anon";
GRANT ALL ON TABLE "public"."coach_profiles_full" TO "authenticated";
GRANT ALL ON TABLE "public"."coach_profiles_full" TO "service_role";



GRANT ALL ON TABLE "public"."coach_programs" TO "anon";
GRANT ALL ON TABLE "public"."coach_programs" TO "authenticated";
GRANT ALL ON TABLE "public"."coach_programs" TO "service_role";



GRANT ALL ON TABLE "public"."coach_questionnaires" TO "anon";
GRANT ALL ON TABLE "public"."coach_questionnaires" TO "authenticated";
GRANT ALL ON TABLE "public"."coach_questionnaires" TO "service_role";



GRANT ALL ON TABLE "public"."coach_sections" TO "anon";
GRANT ALL ON TABLE "public"."coach_sections" TO "authenticated";
GRANT ALL ON TABLE "public"."coach_sections" TO "service_role";



GRANT ALL ON TABLE "public"."coach_unique_codes" TO "anon";
GRANT ALL ON TABLE "public"."coach_unique_codes" TO "authenticated";
GRANT ALL ON TABLE "public"."coach_unique_codes" TO "service_role";



GRANT ALL ON TABLE "public"."coach_workouts" TO "anon";
GRANT ALL ON TABLE "public"."coach_workouts" TO "authenticated";
GRANT ALL ON TABLE "public"."coach_workouts" TO "service_role";



GRANT ALL ON TABLE "public"."conversation_participants" TO "anon";
GRANT ALL ON TABLE "public"."conversation_participants" TO "authenticated";
GRANT ALL ON TABLE "public"."conversation_participants" TO "service_role";



GRANT ALL ON TABLE "public"."conversations" TO "anon";
GRANT ALL ON TABLE "public"."conversations" TO "authenticated";
GRANT ALL ON TABLE "public"."conversations" TO "service_role";



GRANT ALL ON TABLE "public"."feature_request_replies" TO "anon";
GRANT ALL ON TABLE "public"."feature_request_replies" TO "authenticated";
GRANT ALL ON TABLE "public"."feature_request_replies" TO "service_role";



GRANT ALL ON TABLE "public"."feature_request_upvotes" TO "anon";
GRANT ALL ON TABLE "public"."feature_request_upvotes" TO "authenticated";
GRANT ALL ON TABLE "public"."feature_request_upvotes" TO "service_role";



GRANT ALL ON TABLE "public"."feature_requests" TO "anon";
GRANT ALL ON TABLE "public"."feature_requests" TO "authenticated";
GRANT ALL ON TABLE "public"."feature_requests" TO "service_role";



GRANT ALL ON TABLE "public"."message_attachments" TO "anon";
GRANT ALL ON TABLE "public"."message_attachments" TO "authenticated";
GRANT ALL ON TABLE "public"."message_attachments" TO "service_role";



GRANT ALL ON TABLE "public"."message_reactions" TO "anon";
GRANT ALL ON TABLE "public"."message_reactions" TO "authenticated";
GRANT ALL ON TABLE "public"."message_reactions" TO "service_role";



GRANT ALL ON TABLE "public"."message_read_receipts" TO "anon";
GRANT ALL ON TABLE "public"."message_read_receipts" TO "authenticated";
GRANT ALL ON TABLE "public"."message_read_receipts" TO "service_role";



GRANT ALL ON TABLE "public"."messages" TO "anon";
GRANT ALL ON TABLE "public"."messages" TO "authenticated";
GRANT ALL ON TABLE "public"."messages" TO "service_role";



GRANT ALL ON TABLE "public"."musclewiki_api_audit_log" TO "anon";
GRANT ALL ON TABLE "public"."musclewiki_api_audit_log" TO "authenticated";
GRANT ALL ON TABLE "public"."musclewiki_api_audit_log" TO "service_role";



GRANT ALL ON TABLE "public"."musclewiki_cache_population_log" TO "anon";
GRANT ALL ON TABLE "public"."musclewiki_cache_population_log" TO "authenticated";
GRANT ALL ON TABLE "public"."musclewiki_cache_population_log" TO "service_role";



GRANT ALL ON TABLE "public"."musclewiki_compliance_report" TO "anon";
GRANT ALL ON TABLE "public"."musclewiki_compliance_report" TO "authenticated";
GRANT ALL ON TABLE "public"."musclewiki_compliance_report" TO "service_role";



GRANT ALL ON TABLE "public"."musclewiki_exercise_cache" TO "anon";
GRANT ALL ON TABLE "public"."musclewiki_exercise_cache" TO "authenticated";
GRANT ALL ON TABLE "public"."musclewiki_exercise_cache" TO "service_role";



GRANT ALL ON TABLE "public"."musclewiki_filter_cache" TO "anon";
GRANT ALL ON TABLE "public"."musclewiki_filter_cache" TO "authenticated";
GRANT ALL ON TABLE "public"."musclewiki_filter_cache" TO "service_role";



GRANT ALL ON TABLE "public"."musclewiki_sync_metadata" TO "anon";
GRANT ALL ON TABLE "public"."musclewiki_sync_metadata" TO "authenticated";
GRANT ALL ON TABLE "public"."musclewiki_sync_metadata" TO "service_role";



GRANT ALL ON TABLE "public"."musclewiki_thumbnail_cache" TO "anon";
GRANT ALL ON TABLE "public"."musclewiki_thumbnail_cache" TO "authenticated";
GRANT ALL ON TABLE "public"."musclewiki_thumbnail_cache" TO "service_role";



GRANT ALL ON TABLE "public"."v_my_notification_settings" TO "anon";
GRANT ALL ON TABLE "public"."v_my_notification_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."v_my_notification_settings" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































drop extension if exists "pg_net";

alter table "public"."coach_profiles" drop constraint "coach_profiles_status_check";

alter table "public"."user_profiles" drop constraint "user_profiles_user_type_check";

alter table "public"."coach_profiles" add constraint "coach_profiles_status_check" CHECK (((status)::text = ANY ((ARRAY['active'::character varying, 'inactive'::character varying, 'pending'::character varying])::text[]))) not valid;

alter table "public"."coach_profiles" validate constraint "coach_profiles_status_check";

alter table "public"."user_profiles" add constraint "user_profiles_user_type_check" CHECK (((user_type)::text = ANY ((ARRAY['coach'::character varying, 'client'::character varying])::text[]))) not valid;

alter table "public"."user_profiles" validate constraint "user_profiles_user_type_check";

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TRIGGER on_auth_user_updated AFTER UPDATE ON auth.users FOR EACH ROW WHEN ((((old.email)::text IS DISTINCT FROM (new.email)::text) OR (old.raw_user_meta_data IS DISTINCT FROM new.raw_user_meta_data))) EXECUTE FUNCTION public.handle_user_update();


  create policy "Allow authenticated users to delete realtime messages"
  on "realtime"."messages"
  as permissive
  for delete
  to authenticated
using (true);



  create policy "Allow authenticated users to receive realtime messages"
  on "realtime"."messages"
  as permissive
  for select
  to authenticated
using (true);



  create policy "Allow authenticated users to send realtime messages"
  on "realtime"."messages"
  as permissive
  for insert
  to authenticated
with check (true);



  create policy "Allow authenticated users to update realtime messages"
  on "realtime"."messages"
  as permissive
  for update
  to authenticated
using (true)
with check (true);



  create policy "Coaches can delete company logo"
  on "storage"."objects"
  as permissive
  for delete
  to authenticated
using (((bucket_id = 'coach-company'::text) AND ((( SELECT auth.uid() AS uid))::text = (storage.foldername(name))[1])));



  create policy "Coaches can update company logo"
  on "storage"."objects"
  as permissive
  for update
  to authenticated
using (((bucket_id = 'coach-company'::text) AND ((( SELECT auth.uid() AS uid))::text = (storage.foldername(name))[1])));



  create policy "Coaches can upload company logo"
  on "storage"."objects"
  as permissive
  for insert
  to authenticated
with check (((bucket_id = 'coach-company'::text) AND ((( SELECT auth.uid() AS uid))::text = (storage.foldername(name))[1])));



  create policy "Public company logos are viewable by anyone"
  on "storage"."objects"
  as permissive
  for select
  to public
using ((bucket_id = 'coach-company'::text));



  create policy "Public profile pictures are viewable by anyone"
  on "storage"."objects"
  as permissive
  for select
  to public
using ((bucket_id = 'profile-pictures'::text));



  create policy "Users can delete own profile picture"
  on "storage"."objects"
  as permissive
  for delete
  to public
using (((bucket_id = 'profile-pictures'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])));



  create policy "Users can update own profile picture"
  on "storage"."objects"
  as permissive
  for update
  to public
using (((bucket_id = 'profile-pictures'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])));



  create policy "Users can upload own profile picture"
  on "storage"."objects"
  as permissive
  for insert
  to public
with check (((bucket_id = 'profile-pictures'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])));



  create policy "storage_client_photos_manage"
  on "storage"."objects"
  as permissive
  for all
  to authenticated
using (((bucket_id = 'client_photos'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)))
with check (((bucket_id = 'client_photos'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));



  create policy "storage_client_read"
  on "storage"."objects"
  as permissive
  for select
  to authenticated
using (((bucket_id = 'coach_files'::text) AND (EXISTS ( SELECT 1
   FROM public.client_files cf
  WHERE ((cf.client_id = auth.uid()) AND (cf.file_path = objects.name))))));



  create policy "storage_coach_manage"
  on "storage"."objects"
  as permissive
  for all
  to authenticated
using (((bucket_id = 'coach_files'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)))
with check (((bucket_id = 'coach_files'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));



  create policy "storage_coach_read_client_photos"
  on "storage"."objects"
  as permissive
  for select
  to authenticated
using (((bucket_id = 'client_photos'::text) AND (EXISTS ( SELECT 1
   FROM public.coach_client_assignments cca
  WHERE (((cca.client_id)::text = (storage.foldername(objects.name))[1]) AND ((cca.coach_id = ( SELECT auth.uid() AS uid)) OR (cca.client_id = ( SELECT auth.uid() AS uid))))))));



  create policy "storage_message_attachments_delete"
  on "storage"."objects"
  as permissive
  for delete
  to public
using (((bucket_id = 'message_attachments'::text) AND (EXISTS ( SELECT 1
   FROM (public.message_attachments ma
     JOIN public.conversations c ON ((c.id = ma.conversation_id)))
  WHERE ((ma.file_path = objects.name) AND ((c.coach_id = auth.uid()) OR (c.client_id = auth.uid())))))));



  create policy "storage_message_attachments_read"
  on "storage"."objects"
  as permissive
  for select
  to public
using (((bucket_id = 'message_attachments'::text) AND (EXISTS ( SELECT 1
   FROM (public.message_attachments ma
     JOIN public.conversations c ON ((c.id = ma.conversation_id)))
  WHERE ((ma.file_path = objects.name) AND ((c.coach_id = auth.uid()) OR (c.client_id = auth.uid())))))));



  create policy "storage_message_attachments_update"
  on "storage"."objects"
  as permissive
  for update
  to public
using (((bucket_id = 'message_attachments'::text) AND (EXISTS ( SELECT 1
   FROM (public.message_attachments ma
     JOIN public.conversations c ON ((c.id = ma.conversation_id)))
  WHERE ((ma.file_path = objects.name) AND ((c.coach_id = auth.uid()) OR (c.client_id = auth.uid())))))));



  create policy "storage_message_attachments_upload"
  on "storage"."objects"
  as permissive
  for insert
  to public
with check (((bucket_id = 'message_attachments'::text) AND (EXISTS ( SELECT 1
   FROM public.conversations c
  WHERE (((c.id)::text = split_part(objects.name, '/'::text, 1)) AND ((c.coach_id = auth.uid()) OR (c.client_id = auth.uid())))))));



