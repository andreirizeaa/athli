-- ================================================
-- Migration 116: Security and Performance Fixes
-- ================================================
-- Purpose: Fix Supabase linter issues
--
-- ERRORS Fixed:
-- - auth_users_exposed: Remove auth.users JOINs from views
-- - security_definer_view: Add security_invoker = true to views
--
-- WARNINGS Fixed:
-- - function_search_path_mutable: Add SET search_path = public to functions
-- - auth_rls_initplan: Replace auth.uid() with (SELECT auth.uid()) in RLS policies
-- ================================================

-- ================================================
-- STEP 1: Fix Views (Remove auth.users JOINs, Add security_invoker)
-- ================================================

-- 1.1 coach_profiles_full - Remove auth.users join
DROP VIEW IF EXISTS public.coach_profiles_full CASCADE;

CREATE OR REPLACE VIEW public.coach_profiles_full
WITH (security_invoker = true)
AS SELECT
  cp.id,
  up.email,
  COALESCE(up.name, '') AS name,
  up.profile_picture_url,
  COALESCE(up.signin_method, 'email') AS signin_method,
  cp.is_active,
  cp.is_archived,
  cp.status,
  cp.unique_code,
  cp.getting_started_checklist_complete,
  cp.created_at,
  cp.updated_at
FROM public.coach_profiles cp
LEFT JOIN public.user_profiles up ON up.id = cp.id AND up.user_type = 'coach';

COMMENT ON VIEW public.coach_profiles_full IS
'Complete coach profile view merging coach_profiles with user_profiles.
Use this view to get full coach data including name, email, and profile picture.';

GRANT SELECT ON public.coach_profiles_full TO authenticated;

-- 1.2 client_profiles_full - Remove auth.users join
DROP VIEW IF EXISTS public.client_profiles_full CASCADE;

CREATE OR REPLACE VIEW public.client_profiles_full
WITH (security_invoker = true)
AS SELECT
  cp.client_id,
  up.email,
  COALESCE(up.name, '') AS name,
  up.profile_picture_url,
  COALESCE(up.signin_method, 'email') AS signin_method,
  cp.date_of_birth,
  cp.gender,
  cp.height_cm,
  cp.phone,
  cp.country,
  cp.unit_system,
  cp.created_at,
  cp.updated_at
FROM public.client_profiles cp
LEFT JOIN public.user_profiles up ON up.id = cp.client_id;

COMMENT ON VIEW public.client_profiles_full IS
'Complete client profile view merging client_profiles with user_profiles.
Use this view to get full client data including name, email, and profile picture.';

GRANT SELECT ON public.client_profiles_full TO authenticated;

-- 1.3 coach_clients_view - Remove auth.users join
DROP VIEW IF EXISTS public.coach_clients_view CASCADE;

CREATE OR REPLACE VIEW public.coach_clients_view
WITH (security_invoker = true)
AS SELECT
  cca.coach_id,
  cca.client_id,
  cca.category,
  cca.status,
  cca.is_active,
  cca.is_archived,
  cca.invitation_sent_at,
  cca.connected_at,
  cca.invitation_token,
  cca.created_at,
  cca.updated_at,
  cp.date_of_birth,
  cp.gender,
  cp.height_cm,
  cp.phone,
  cp.country,
  cp.unit_system,
  COALESCE(up.name, up.email) AS full_name,
  up.email,
  up.profile_picture_url AS avatar_url,
  cts.last_activity,
  cts.last_7_days_training_completed,
  cts.last_7_days_training_total,
  cts.last_30_days_training_completed,
  cts.last_30_days_training_total
FROM public.coach_client_assignments cca
LEFT JOIN public.client_profiles cp ON cp.client_id = cca.client_id
LEFT JOIN public.user_profiles up ON up.id = cca.client_id
LEFT JOIN public.client_training_summary cts ON cts.client_id = cca.client_id;

COMMENT ON VIEW public.coach_clients_view IS
'Coach view of all their clients with merged profile data from user_profiles.';

GRANT SELECT ON public.coach_clients_view TO authenticated;

-- 1.4 musclewiki_compliance_report - Add security_invoker only (no auth.users)
DROP VIEW IF EXISTS public.musclewiki_compliance_report CASCADE;

CREATE OR REPLACE VIEW public.musclewiki_compliance_report
WITH (security_invoker = true)
AS SELECT
  DATE_TRUNC('day', created_at) as report_date,
  COUNT(*) as total_requests,
  SUM(CASE WHEN cache_hit THEN 1 ELSE 0 END) as cache_hits,
  SUM(CASE WHEN NOT cache_hit THEN 1 ELSE 0 END) as api_calls,
  ROUND(
    (SUM(CASE WHEN cache_hit THEN 1.0 ELSE 0.0 END) / NULLIF(COUNT(*), 0)) * 100,
    2
  ) as cache_hit_percentage,
  SUM(CASE WHEN content_type = 'metadata' THEN 1 ELSE 0 END) as metadata_requests,
  SUM(CASE WHEN content_type = 'thumbnail' THEN 1 ELSE 0 END) as thumbnail_requests,
  SUM(CASE WHEN content_type = 'video' THEN 1 ELSE 0 END) as video_requests,
  MIN(rate_limit_remaining) as min_rate_limit_remaining,
  ROUND(AVG(request_duration_ms)::NUMERIC, 2) as avg_response_ms
FROM public.musclewiki_api_audit_log
GROUP BY DATE_TRUNC('day', created_at)
ORDER BY report_date DESC;

COMMENT ON VIEW public.musclewiki_compliance_report IS
'Daily aggregated report showing API usage, cache efficiency, and content type
breakdown for compliance verification with MuscleWiki API Terms.';

GRANT SELECT ON public.musclewiki_compliance_report TO authenticated;

-- ================================================
-- STEP 2: Fix Functions (Add SET search_path = public)
-- ================================================

-- 2.1 extract_conversation_id_from_topic (from migration 100)
CREATE OR REPLACE FUNCTION public.extract_conversation_id_from_topic(topic TEXT)
RETURNS UUID
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
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

-- 2.2 handle_new_user (from migration 108)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2.3 handle_auth_user_update (from migration 108)
CREATE OR REPLACE FUNCTION public.handle_auth_user_update()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2.4 should_populate_exercise_cache (from migration 112)
CREATE OR REPLACE FUNCTION public.should_populate_exercise_cache()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

-- 2.5 start_exercise_cache_population (from migration 112)
CREATE OR REPLACE FUNCTION public.start_exercise_cache_population()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

-- 2.6 complete_exercise_cache_population (from migration 112)
CREATE OR REPLACE FUNCTION public.complete_exercise_cache_population(
  p_log_id UUID,
  p_status TEXT,
  p_total_fetched INTEGER DEFAULT 0,
  p_total_cached INTEGER DEFAULT 0,
  p_errors INTEGER DEFAULT 0,
  p_error_message TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

-- 2.7 get_exercise_cache_stats (from migration 112)
CREATE OR REPLACE FUNCTION public.get_exercise_cache_stats()
RETURNS TABLE (
  total_cached BIGINT,
  valid_cached BIGINT,
  expired_cached BIGINT,
  expiring_soon BIGINT,
  last_population TIMESTAMPTZ,
  needs_refresh BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

-- 2.8 trigger_exercise_cache_population (from migration 112)
CREATE OR REPLACE FUNCTION public.trigger_exercise_cache_population()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

-- ================================================
-- STEP 3: Fix RLS Policies (Use SELECT wrapper for auth.uid())
-- ================================================

-- 3.1 feature_requests policies
DROP POLICY IF EXISTS feature_requests_insert ON public.feature_requests;
DROP POLICY IF EXISTS feature_requests_update ON public.feature_requests;
DROP POLICY IF EXISTS feature_requests_delete ON public.feature_requests;

CREATE POLICY feature_requests_insert ON public.feature_requests
  FOR INSERT
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY feature_requests_update ON public.feature_requests
  FOR UPDATE
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY feature_requests_delete ON public.feature_requests
  FOR DELETE
  USING (user_id = (SELECT auth.uid()) AND status IS NULL);

-- 3.2 feature_request_upvotes policies
DROP POLICY IF EXISTS feature_request_upvotes_insert ON public.feature_request_upvotes;
DROP POLICY IF EXISTS feature_request_upvotes_delete ON public.feature_request_upvotes;

CREATE POLICY feature_request_upvotes_insert ON public.feature_request_upvotes
  FOR INSERT
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY feature_request_upvotes_delete ON public.feature_request_upvotes
  FOR DELETE
  USING (user_id = (SELECT auth.uid()));

-- 3.3 feature_request_replies policies
DROP POLICY IF EXISTS feature_request_replies_insert ON public.feature_request_replies;
DROP POLICY IF EXISTS feature_request_replies_delete ON public.feature_request_replies;

CREATE POLICY feature_request_replies_insert ON public.feature_request_replies
  FOR INSERT
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY feature_request_replies_delete ON public.feature_request_replies
  FOR DELETE
  USING (user_id = (SELECT auth.uid()));

-- ================================================
-- Migration Complete
-- ================================================
-- Summary of changes:
--
-- ERRORS Fixed (7):
-- 1. coach_profiles_full - Removed auth.users JOIN, added security_invoker
-- 2. client_profiles_full - Removed auth.users JOIN, added security_invoker
-- 3. coach_clients_view - Removed auth.users JOIN, added security_invoker
-- 4. musclewiki_compliance_report - Added security_invoker
--
-- WARNINGS Fixed:
-- Functions with SET search_path = public (8):
-- 1. extract_conversation_id_from_topic
-- 2. handle_new_user
-- 3. handle_auth_user_update
-- 4. should_populate_exercise_cache
-- 5. start_exercise_cache_population
-- 6. complete_exercise_cache_population
-- 7. get_exercise_cache_stats
-- 8. trigger_exercise_cache_population
--
-- RLS policies with (SELECT auth.uid()) (7):
-- 1. feature_requests_insert
-- 2. feature_requests_update
-- 3. feature_requests_delete
-- 4. feature_request_upvotes_insert
-- 5. feature_request_upvotes_delete
-- 6. feature_request_replies_insert
-- 7. feature_request_replies_delete
-- ================================================
