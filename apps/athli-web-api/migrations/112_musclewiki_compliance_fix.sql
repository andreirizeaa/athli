-- Migration: MuscleWiki API Terms Compliance Fix
-- Purpose: Ensure compliance with MuscleWiki API Terms of Use
--
-- Key compliance requirements from MuscleWiki Terms:
-- Section 3 - Caching Rules:
--   - Metadata (text only): May be cached for up to 30 days ✓
--   - Thumbnails & bodymap images: May be cached for up to 24 hours
--   - Videos: Transient caching only (NO persistent storage)
--
-- Section 8 - Attribution:
--   - Must display "Powered by MuscleWiki" when showing exercise data

-- ============================================================================
-- STEP 1: Remove video URL columns from exercise cache
-- Per Section 2.1 & 3: Videos require transient caching only
-- We must NOT store video URLs in our database
-- ============================================================================

-- Drop video URL columns (they should never have been stored)
ALTER TABLE public.musclewiki_exercise_cache
  DROP COLUMN IF EXISTS male_video_front_url,
  DROP COLUMN IF EXISTS male_video_side_url,
  DROP COLUMN IF EXISTS female_video_front_url,
  DROP COLUMN IF EXISTS female_video_side_url;

-- Also remove image_urls as these may include bodymap images
ALTER TABLE public.musclewiki_exercise_cache
  DROP COLUMN IF EXISTS image_urls;

-- Remove raw_data as it may contain video/image URLs
ALTER TABLE public.musclewiki_exercise_cache
  DROP COLUMN IF EXISTS raw_data;

-- ============================================================================
-- STEP 2: Create separate thumbnail cache with 24-hour TTL
-- Per Section 3: Thumbnails may only be cached for up to 24 hours
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.musclewiki_thumbnail_cache (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Reference to exercise
  musclewiki_id TEXT NOT NULL,

  -- Thumbnail URL from MuscleWiki CDN (NOT the actual image data)
  thumbnail_url TEXT NOT NULL,

  -- Cache management - STRICT 24 HOUR TTL per MuscleWiki Terms Section 3
  cached_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  cache_expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '24 hours'),

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT uq_mwtc_musclewiki_id UNIQUE (musclewiki_id)
);

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_mwtc_musclewiki_id ON public.musclewiki_thumbnail_cache(musclewiki_id);
CREATE INDEX IF NOT EXISTS idx_mwtc_cache_expires ON public.musclewiki_thumbnail_cache(cache_expires_at);

-- RLS for thumbnail cache
ALTER TABLE public.musclewiki_thumbnail_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY musclewiki_thumbnail_cache_select ON public.musclewiki_thumbnail_cache
  FOR SELECT
  USING (true);

-- ============================================================================
-- STEP 3: Remove thumbnail_url from main exercise cache
-- Thumbnails must be in separate table with 24h TTL
-- ============================================================================

ALTER TABLE public.musclewiki_exercise_cache
  DROP COLUMN IF EXISTS thumbnail_url;

-- ============================================================================
-- STEP 4: Update function to get thumbnail with compliance check
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_musclewiki_thumbnail(p_musclewiki_id TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_thumbnail_url TEXT;
BEGIN
  -- Only return thumbnail if within 24-hour cache window
  SELECT thumbnail_url INTO v_thumbnail_url
  FROM public.musclewiki_thumbnail_cache
  WHERE musclewiki_id = p_musclewiki_id
    AND cache_expires_at > now();  -- MUST check expiry for compliance

  RETURN v_thumbnail_url;
END;
$$;

-- ============================================================================
-- STEP 5: Function to cache thumbnail with 24h TTL
-- ============================================================================

CREATE OR REPLACE FUNCTION public.cache_musclewiki_thumbnail(
  p_musclewiki_id TEXT,
  p_thumbnail_url TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

-- ============================================================================
-- STEP 6: Function to clean expired thumbnails (should run frequently)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.cleanup_expired_musclewiki_thumbnails()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

-- ============================================================================
-- STEP 7: Add compliance tracking columns to audit log
-- ============================================================================

ALTER TABLE public.musclewiki_api_audit_log
  ADD COLUMN IF NOT EXISTS content_type TEXT,  -- 'metadata', 'thumbnail', 'video'
  ADD COLUMN IF NOT EXISTS compliance_note TEXT;  -- Any compliance-related notes

-- ============================================================================
-- STEP 8: Update compliance view to show content type breakdown
-- ============================================================================

DROP VIEW IF EXISTS public.musclewiki_compliance_report;

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
  -- Content type breakdown
  SUM(CASE WHEN content_type = 'metadata' THEN 1 ELSE 0 END) as metadata_requests,
  SUM(CASE WHEN content_type = 'thumbnail' THEN 1 ELSE 0 END) as thumbnail_requests,
  SUM(CASE WHEN content_type = 'video' THEN 1 ELSE 0 END) as video_requests,
  MIN(rate_limit_remaining) as min_rate_limit_remaining,
  ROUND(AVG(request_duration_ms)::NUMERIC, 2) as avg_response_ms
FROM public.musclewiki_api_audit_log
GROUP BY DATE_TRUNC('day', created_at)
ORDER BY report_date DESC;

GRANT SELECT ON public.musclewiki_compliance_report TO authenticated;

-- ============================================================================
-- STEP 9: Update comments for compliance documentation
-- ============================================================================

COMMENT ON TABLE public.musclewiki_exercise_cache IS
'Cache for MuscleWiki API exercise METADATA ONLY (text).
Cached for up to 7 days (within 30 day limit per MuscleWiki Terms Section 3).
NO video URLs or image data stored per Terms Section 2.1.';

COMMENT ON TABLE public.musclewiki_thumbnail_cache IS
'Separate cache for MuscleWiki thumbnails with STRICT 24-hour TTL.
Per MuscleWiki API Terms Section 3: Thumbnails may only be cached for 24 hours.
URLs point to MuscleWiki CDN - we do NOT store the actual image files.';

COMMENT ON TABLE public.musclewiki_api_audit_log IS
'Audit log for all MuscleWiki API interactions.
Used to prove compliance with MuscleWiki API Terms of Use.
Tracks cache hits/misses, content types, and rate limits.';

COMMENT ON FUNCTION public.get_musclewiki_thumbnail IS
'Get thumbnail URL only if within 24-hour cache window per MuscleWiki Terms.';

COMMENT ON FUNCTION public.cache_musclewiki_thumbnail IS
'Cache thumbnail URL with strict 24-hour TTL per MuscleWiki Terms Section 3.';

-- ============================================================================
-- COMPLIANCE NOTES
-- ============================================================================
--
-- This migration ensures compliance with MuscleWiki API Terms of Use:
--
-- Section 2 - Media Content Restrictions:
--   ✓ We do NOT download/store video files
--   ✓ We do NOT store video URLs persistently
--   ✓ Videos are fetched fresh from API each time (transient only)
--
-- Section 3 - Caching Rules:
--   ✓ Metadata: Cached for 7 days (within 30 day limit)
--   ✓ Thumbnails: Separate cache with strict 24-hour TTL
--   ✓ Videos: No caching - fetched fresh each request
--
-- Section 8 - Attribution:
--   ✓ UI components must display "Powered by MuscleWiki"
--   (implemented in frontend components)
--
-- ============================================================================
