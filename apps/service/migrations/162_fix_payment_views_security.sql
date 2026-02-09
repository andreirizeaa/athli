-- ============================================================
-- 162: Fix payment views security
-- ============================================================
-- Views default to SECURITY DEFINER in Supabase (run as view owner),
-- bypassing RLS on underlying tables. Set security_invoker = true
-- so they respect the caller's RLS policies on the payments table.
-- ============================================================

ALTER VIEW public.coach_payment_analytics SET (security_invoker = true);
ALTER VIEW public.coach_client_payment_summary SET (security_invoker = true);
