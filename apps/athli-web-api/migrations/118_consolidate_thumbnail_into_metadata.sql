-- Migration: Consolidate thumbnail URLs into exercise metadata cache
-- Purpose: Thumbnail URLs are metadata (text strings), not actual images.
--          They should be stored with other exercise metadata using 30-day TTL.
--
-- COMPLIANCE UPDATE:
-- Per MuscleWiki Terms Section 3, the 24-hour caching limit applies to
-- ACTUAL image/thumbnail bytes, not to URLs (which are text metadata).
-- URLs pointing to MuscleWiki CDN are metadata and can use 30-day TTL.
--
-- The frontend image proxy handles actual image caching compliance:
-- - Cache-Control: max-age=86400 (24 hours) for proxied images
-- - In-memory cache clears on session end
-- ============================================================================

-- ============================================================================
-- 1. Add thumbnail_url column to exercise cache
-- ============================================================================
ALTER TABLE public.musclewiki_exercise_cache
ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;

COMMENT ON COLUMN public.musclewiki_exercise_cache.thumbnail_url IS
'MuscleWiki CDN URL for exercise thumbnail. This is metadata (text), not the
actual image. Actual images are proxied in real-time with 24h HTTP cache.';

-- ============================================================================
-- 2. Migrate existing thumbnail URLs from thumbnail cache
-- ============================================================================
UPDATE public.musclewiki_exercise_cache ec
SET thumbnail_url = tc.thumbnail_url
FROM public.musclewiki_thumbnail_cache tc
WHERE ec.musclewiki_id = tc.musclewiki_id
  AND ec.thumbnail_url IS NULL;

-- ============================================================================
-- 3. Update exercise cache TTL default to 30 days
-- ============================================================================
ALTER TABLE public.musclewiki_exercise_cache
ALTER COLUMN cache_expires_at SET DEFAULT (now() + INTERVAL '30 days');

-- ============================================================================
-- 4. Extend existing entries to 30 days from their cached_at date
-- ============================================================================
UPDATE public.musclewiki_exercise_cache
SET cache_expires_at = cached_at + INTERVAL '30 days'
WHERE cache_expires_at < cached_at + INTERVAL '30 days';

-- ============================================================================
-- 5. Drop thumbnail-specific functions
-- ============================================================================
DROP FUNCTION IF EXISTS public.cache_musclewiki_thumbnail(TEXT, TEXT);
DROP FUNCTION IF EXISTS public.get_musclewiki_thumbnail(TEXT);
DROP FUNCTION IF EXISTS public.cleanup_expired_musclewiki_thumbnails();

-- ============================================================================
-- 6. Drop RLS policy before dropping table
-- ============================================================================
DROP POLICY IF EXISTS musclewiki_thumbnail_cache_select ON public.musclewiki_thumbnail_cache;

-- ============================================================================
-- 7. Drop the separate thumbnail cache table
-- ============================================================================
DROP TABLE IF EXISTS public.musclewiki_thumbnail_cache;

-- ============================================================================
-- 8. Update table comment to reflect new structure
-- ============================================================================
COMMENT ON TABLE public.musclewiki_exercise_cache IS
'Cache for MuscleWiki API exercise metadata including thumbnail URLs.
30-day TTL per MuscleWiki Terms Section 3 (metadata caching limit).
NO video URLs stored per Terms Section 2.
Actual thumbnail images are proxied via /exercises/images/bulk with 24h HTTP cache.';

-- ============================================================================
-- 9. Update the get_cached_musclewiki_exercises function to include thumbnail_url
-- Must DROP first because return type is changing (adding thumbnail_url column)
-- ============================================================================
DROP FUNCTION IF EXISTS public.get_cached_musclewiki_exercises(INTEGER, INTEGER, TEXT, TEXT, TEXT);

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

-- ============================================================================
-- 10. Update should_populate_exercise_cache to use 30-day window
-- ============================================================================
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
  -- Check total cached exercises
  SELECT COUNT(*) INTO v_total_cached
  FROM public.musclewiki_exercise_cache;

  -- If cache is empty, definitely need to populate
  IF v_total_cached < 100 THEN
    RETURN TRUE;
  END IF;

  -- Check how many are expired or expiring soon (within 5 days for 30-day TTL)
  SELECT COUNT(*) INTO v_expired_count
  FROM public.musclewiki_exercise_cache
  WHERE cache_expires_at < (now() + INTERVAL '5 days');

  -- If more than 10% are expired/expiring, need to refresh
  IF v_expired_count > (v_total_cached * 0.1) THEN
    RETURN TRUE;
  END IF;

  -- Check last successful population
  SELECT started_at INTO v_last_population
  FROM public.musclewiki_cache_population_log
  WHERE status = 'success'
  ORDER BY started_at DESC
  LIMIT 1;

  -- If never populated or last population was more than 25 days ago (5 days before 30-day expiry)
  IF v_last_population IS NULL OR v_last_population < (now() - INTERVAL '25 days') THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$;

-- ============================================================================
-- 11. Update compliance report view to remove thumbnail references
-- Must DROP first because we're removing a column (thumbnail_requests)
-- ============================================================================
DROP VIEW IF EXISTS public.musclewiki_compliance_report;

CREATE VIEW public.musclewiki_compliance_report AS
SELECT
  DATE_TRUNC('day', created_at) as report_date,
  COUNT(*) as total_requests,
  SUM(CASE WHEN cache_hit THEN 1 ELSE 0 END) as cache_hits,
  SUM(CASE WHEN NOT cache_hit THEN 1 ELSE 0 END) as api_calls,
  ROUND(
    (SUM(CASE WHEN cache_hit THEN 1.0 ELSE 0.0 END) / NULLIF(COUNT(*), 0)) * 100,
    2
  ) as cache_hit_percentage,
  -- Content type breakdown for compliance verification
  SUM(CASE WHEN content_type = 'metadata' THEN 1 ELSE 0 END) as metadata_requests,
  SUM(CASE WHEN content_type = 'video' THEN 1 ELSE 0 END) as video_requests,
  MIN(rate_limit_remaining) as min_rate_limit_remaining,
  ROUND(AVG(request_duration_ms)::NUMERIC, 2) as avg_response_ms
FROM public.musclewiki_api_audit_log
GROUP BY DATE_TRUNC('day', created_at)
ORDER BY report_date DESC;

GRANT SELECT ON public.musclewiki_compliance_report TO authenticated;

-- ============================================================================
-- 12. Log this migration for audit purposes
-- ============================================================================
INSERT INTO public.musclewiki_api_audit_log (
  endpoint,
  method,
  cache_hit,
  content_type,
  compliance_note
) VALUES (
  'migration/118_consolidate_thumbnail_into_metadata',
  'MIGRATION',
  true,
  'metadata',
  'Consolidated thumbnail URLs into exercise metadata cache with 30-day TTL. URLs are text metadata, not actual images. Actual images proxied with 24h HTTP cache per Terms.'
);
