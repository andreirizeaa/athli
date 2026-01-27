-- Migration: Create MuscleWiki exercise cache tables
-- Purpose: Cache MuscleWiki API data to minimize API calls and comply with their caching policy
-- This provides audit logging to prove compliance with API terms of service

-- ============================================================================
-- MUSCLEWIKI EXERCISE CACHE TABLE
-- Stores cached exercise data from MuscleWiki API
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.musclewiki_exercise_cache (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),

  -- MuscleWiki exercise identifier (from their API)
  musclewiki_id TEXT NOT NULL UNIQUE,

  -- Basic exercise information
  name TEXT NOT NULL,
  name_alternative TEXT,
  slug TEXT,

  -- Categorization
  category TEXT,                    -- e.g., 'Barbell', 'Dumbbell', 'Machine', 'Cable', 'Bodyweight'
  difficulty TEXT,                  -- e.g., 'Beginner', 'Intermediate', 'Advanced'
  force TEXT,                       -- e.g., 'Push', 'Pull', 'Static'
  mechanic TEXT,                    -- e.g., 'Compound', 'Isolation'

  -- Muscle targeting
  target_muscles JSONB DEFAULT '[]'::jsonb,           -- Primary muscles targeted
  synergist_muscles JSONB DEFAULT '[]'::jsonb,        -- Secondary/synergist muscles
  stabilizer_muscles JSONB DEFAULT '[]'::jsonb,       -- Stabilizer muscles

  -- Content
  instructions JSONB DEFAULT '[]'::jsonb,             -- Array of instruction steps
  tips JSONB DEFAULT '[]'::jsonb,                     -- Array of tips

  -- Media URLs (stored but not the actual files - we link to MuscleWiki's CDN)
  thumbnail_url TEXT,
  male_video_front_url TEXT,
  male_video_side_url TEXT,
  female_video_front_url TEXT,
  female_video_side_url TEXT,

  -- Image URLs
  image_urls JSONB DEFAULT '[]'::jsonb,

  -- Full raw response from API (for reference)
  raw_data JSONB,

  -- Cache management
  cached_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  cache_expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '7 days'),
  last_accessed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  access_count INTEGER NOT NULL DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for musclewiki_exercise_cache
CREATE INDEX idx_mwec_musclewiki_id ON public.musclewiki_exercise_cache(musclewiki_id);
CREATE INDEX idx_mwec_name ON public.musclewiki_exercise_cache(name);
CREATE INDEX idx_mwec_category ON public.musclewiki_exercise_cache(category);
CREATE INDEX idx_mwec_difficulty ON public.musclewiki_exercise_cache(difficulty);
CREATE INDEX idx_mwec_cache_expires ON public.musclewiki_exercise_cache(cache_expires_at);
CREATE INDEX idx_mwec_target_muscles ON public.musclewiki_exercise_cache USING gin(target_muscles);

-- Full-text search index for exercise search
CREATE INDEX idx_mwec_name_search ON public.musclewiki_exercise_cache USING gin(to_tsvector('english', name));

-- ============================================================================
-- MUSCLEWIKI FILTER OPTIONS CACHE
-- Caches the available filter options from MuscleWiki API
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.musclewiki_filter_cache (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),

  filter_type TEXT NOT NULL,              -- 'category', 'muscle', 'difficulty', 'force', 'mechanic'
  filter_value TEXT NOT NULL,
  display_label TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,

  -- Cache management
  cached_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  cache_expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '30 days'),

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT uq_mwfc_type_value UNIQUE (filter_type, filter_value)
);

CREATE INDEX idx_mwfc_filter_type ON public.musclewiki_filter_cache(filter_type);

-- ============================================================================
-- MUSCLEWIKI API AUDIT LOG
-- Tracks all API calls made to MuscleWiki for compliance and monitoring
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.musclewiki_api_audit_log (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),

  -- API call details
  endpoint TEXT NOT NULL,                 -- The endpoint called (e.g., '/exercises', '/search')
  method TEXT NOT NULL DEFAULT 'GET',     -- HTTP method
  query_params JSONB,                     -- Query parameters used

  -- Response details
  response_status INTEGER,                -- HTTP status code
  response_size_bytes INTEGER,            -- Size of response
  exercises_returned INTEGER DEFAULT 0,   -- Number of exercises returned

  -- Cache behavior
  cache_hit BOOLEAN NOT NULL DEFAULT false,    -- Was this served from cache?
  cache_miss_reason TEXT,                      -- Why was API called? ('not_cached', 'expired', 'force_refresh')

  -- Context
  request_source TEXT,                    -- 'web_app', 'mobile_app', 'background_sync'
  user_id UUID,                           -- Optional: which user triggered this

  -- Timing
  request_duration_ms INTEGER,            -- How long the API call took

  -- Compliance
  rate_limit_remaining INTEGER,           -- Rate limit remaining from response headers
  rate_limit_reset_at TIMESTAMPTZ,        -- When rate limit resets

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for audit log
CREATE INDEX idx_mwaal_created_at ON public.musclewiki_api_audit_log(created_at DESC);
CREATE INDEX idx_mwaal_endpoint ON public.musclewiki_api_audit_log(endpoint);
CREATE INDEX idx_mwaal_cache_hit ON public.musclewiki_api_audit_log(cache_hit);

-- Partition hint: Consider partitioning by month if this table grows large
-- For now, we'll add a retention policy

-- ============================================================================
-- MUSCLEWIKI SYNC METADATA
-- Tracks the overall sync status and configuration
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.musclewiki_sync_metadata (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),

  sync_type TEXT NOT NULL UNIQUE,         -- 'full_catalog', 'filters', 'incremental'

  last_sync_at TIMESTAMPTZ,
  last_sync_status TEXT,                  -- 'success', 'partial', 'failed'
  last_sync_count INTEGER DEFAULT 0,      -- Number of exercises synced
  last_sync_duration_ms INTEGER,
  last_error_message TEXT,

  -- Configuration
  sync_enabled BOOLEAN NOT NULL DEFAULT true,
  sync_interval_hours INTEGER NOT NULL DEFAULT 168,  -- Default: weekly (168 hours)

  -- Statistics
  total_exercises_cached INTEGER DEFAULT 0,
  total_api_calls_today INTEGER DEFAULT 0,
  api_calls_reset_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Insert default sync metadata records
INSERT INTO public.musclewiki_sync_metadata (sync_type, sync_interval_hours)
VALUES
  ('full_catalog', 168),    -- Full sync weekly
  ('filters', 720),         -- Filters sync monthly (30 days)
  ('incremental', 24)       -- Incremental sync daily
ON CONFLICT (sync_type) DO NOTHING;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Updated_at trigger for exercise cache
CREATE TRIGGER trg_mwec_updated_at
  BEFORE UPDATE ON public.musclewiki_exercise_cache
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Updated_at trigger for filter cache
CREATE TRIGGER trg_mwfc_updated_at
  BEFORE UPDATE ON public.musclewiki_filter_cache
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Updated_at trigger for sync metadata
CREATE TRIGGER trg_mwsm_updated_at
  BEFORE UPDATE ON public.musclewiki_sync_metadata
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function to record exercise access and update access stats
CREATE OR REPLACE FUNCTION public.record_musclewiki_exercise_access(p_musclewiki_id TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.musclewiki_exercise_cache
  SET
    last_accessed_at = now(),
    access_count = access_count + 1
  WHERE musclewiki_id = p_musclewiki_id;
END;
$$;

-- Function to get valid cached exercises (not expired)
CREATE OR REPLACE FUNCTION public.get_cached_musclewiki_exercises(
  p_limit INTEGER DEFAULT 100,
  p_offset INTEGER DEFAULT 0,
  p_category TEXT DEFAULT NULL,
  p_difficulty TEXT DEFAULT NULL,
  p_search_term TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  musclewiki_id TEXT,
  name TEXT,
  category TEXT,
  difficulty TEXT,
  target_muscles JSONB,
  thumbnail_url TEXT,
  is_cache_valid BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
    mwec.thumbnail_url,
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

-- Function to log API calls
CREATE OR REPLACE FUNCTION public.log_musclewiki_api_call(
  p_endpoint TEXT,
  p_method TEXT DEFAULT 'GET',
  p_query_params JSONB DEFAULT NULL,
  p_response_status INTEGER DEFAULT NULL,
  p_response_size_bytes INTEGER DEFAULT NULL,
  p_exercises_returned INTEGER DEFAULT 0,
  p_cache_hit BOOLEAN DEFAULT false,
  p_cache_miss_reason TEXT DEFAULT NULL,
  p_request_source TEXT DEFAULT 'web_app',
  p_user_id UUID DEFAULT NULL,
  p_request_duration_ms INTEGER DEFAULT NULL,
  p_rate_limit_remaining INTEGER DEFAULT NULL,
  p_rate_limit_reset_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

-- Function to get API usage statistics for compliance reporting
CREATE OR REPLACE FUNCTION public.get_musclewiki_usage_stats(
  p_days INTEGER DEFAULT 30
)
RETURNS TABLE (
  period_start TIMESTAMPTZ,
  period_end TIMESTAMPTZ,
  total_api_calls BIGINT,
  cache_hits BIGINT,
  cache_misses BIGINT,
  cache_hit_rate NUMERIC,
  avg_response_time_ms NUMERIC,
  total_exercises_served BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

-- Function to clean up old audit logs (retention policy)
CREATE OR REPLACE FUNCTION public.cleanup_musclewiki_audit_logs(
  p_retention_days INTEGER DEFAULT 90
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

-- Exercise cache: Read-only for authenticated users, write requires service role
ALTER TABLE public.musclewiki_exercise_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY musclewiki_exercise_cache_select ON public.musclewiki_exercise_cache
  FOR SELECT
  USING (true);  -- Anyone can read cached exercises

-- Filter cache: Same as exercise cache
ALTER TABLE public.musclewiki_filter_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY musclewiki_filter_cache_select ON public.musclewiki_filter_cache
  FOR SELECT
  USING (true);

-- Audit log: Only service role can insert, authenticated users can read
ALTER TABLE public.musclewiki_api_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY musclewiki_api_audit_log_select ON public.musclewiki_api_audit_log
  FOR SELECT
  USING (true);

-- Sync metadata: Read for all, write for service role
ALTER TABLE public.musclewiki_sync_metadata ENABLE ROW LEVEL SECURITY;

CREATE POLICY musclewiki_sync_metadata_select ON public.musclewiki_sync_metadata
  FOR SELECT
  USING (true);

-- ============================================================================
-- VIEWS
-- ============================================================================

-- View for compliance reporting
CREATE OR REPLACE VIEW public.musclewiki_compliance_report AS
SELECT
  DATE_TRUNC('day', created_at) as report_date,
  COUNT(*) as total_requests,
  SUM(CASE WHEN cache_hit THEN 1 ELSE 0 END) as cache_hits,
  SUM(CASE WHEN NOT cache_hit THEN 1 ELSE 0 END) as api_calls,
  ROUND(
    (SUM(CASE WHEN cache_hit THEN 1.0 ELSE 0.0 END) / NULLIF(COUNT(*), 0)) * 100,
    2
  ) as cache_hit_percentage,
  MIN(rate_limit_remaining) as min_rate_limit_remaining,
  ROUND(AVG(request_duration_ms)::NUMERIC, 2) as avg_response_ms
FROM public.musclewiki_api_audit_log
GROUP BY DATE_TRUNC('day', created_at)
ORDER BY report_date DESC;

-- Grant access to views
GRANT SELECT ON public.musclewiki_compliance_report TO authenticated;

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON TABLE public.musclewiki_exercise_cache IS 'Cache for MuscleWiki API exercise data. Exercises are cached for 7 days by default to minimize API calls.';
COMMENT ON TABLE public.musclewiki_filter_cache IS 'Cache for MuscleWiki API filter options (categories, muscles, etc.). Cached for 30 days.';
COMMENT ON TABLE public.musclewiki_api_audit_log IS 'Audit log for all MuscleWiki API interactions. Used for compliance monitoring and proving adherence to API terms.';
COMMENT ON TABLE public.musclewiki_sync_metadata IS 'Metadata for tracking sync operations and API usage statistics.';
COMMENT ON VIEW public.musclewiki_compliance_report IS 'Daily aggregated report showing API usage and cache efficiency for compliance purposes.';
