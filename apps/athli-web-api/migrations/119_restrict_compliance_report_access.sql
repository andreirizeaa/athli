-- Migration: Restrict access to MuscleWiki compliance report view
-- Purpose: The compliance report should only be accessible to service role,
--          not all authenticated users.
--
-- Views bypass RLS by default (security definer behavior). To fix this,
-- we recreate the view with security_invoker = on, which makes the view
-- check the invoker's permissions on the underlying tables.
-- ============================================================================

-- Drop the existing view
DROP VIEW IF EXISTS public.musclewiki_compliance_report;

-- Recreate with security_invoker = on (PostgreSQL 15+)
-- This ensures the view respects RLS policies on underlying tables
CREATE VIEW public.musclewiki_compliance_report
WITH (security_invoker = on)
AS
SELECT
  DATE_TRUNC('day', created_at) as report_date,
  COUNT(*) as total_requests,
  SUM(CASE WHEN cache_hit THEN 1 ELSE 0 END) as cache_hits,
  SUM(CASE WHEN NOT cache_hit THEN 1 ELSE 0 END) as api_calls,
  ROUND(
    (SUM(CASE WHEN cache_hit THEN 1.0 ELSE 0.0 END) / NULLIF(COUNT(*), 0)) * 100,
    2
  ) as cache_hit_percentage,
  SUM(CASE WHEN content_type = 'metadata' THEN 1 ELSE 0 END) as metadata_requests,
  SUM(CASE WHEN content_type = 'video' THEN 1 ELSE 0 END) as video_requests,
  MIN(rate_limit_remaining) as min_rate_limit_remaining,
  ROUND(AVG(request_duration_ms)::NUMERIC, 2) as avg_response_ms
FROM public.musclewiki_api_audit_log
GROUP BY DATE_TRUNC('day', created_at)
ORDER BY report_date DESC;

-- Revoke all access first
REVOKE ALL ON public.musclewiki_compliance_report FROM PUBLIC;
REVOKE ALL ON public.musclewiki_compliance_report FROM authenticated;
REVOKE ALL ON public.musclewiki_compliance_report FROM anon;

-- Grant access only to service_role
GRANT SELECT ON public.musclewiki_compliance_report TO service_role;

-- Update comment to document access restrictions
COMMENT ON VIEW public.musclewiki_compliance_report IS
'Daily aggregated report showing API usage, cache efficiency, and content type
breakdown for compliance verification with MuscleWiki API Terms.
Access restricted to service_role only. Uses security_invoker to respect RLS.';
