-- ================================================
-- Restore coach_checkins_review_view
-- ================================================
-- Re-creates the view that might have been dropped.
-- FILTER: Only includes logs where status = 'review'.
-- ================================================

DROP VIEW IF EXISTS public.coach_checkins_review_view CASCADE;

CREATE OR REPLACE VIEW public.coach_checkins_review_view 
WITH (security_invoker = true)
AS
SELECT 
    ccl.id as log_id,
    ccl.client_id,
    ccl.assignment_id,
    ccl.submission_date,
    ccl.answers,
    ccl.status as review_status,
    ccl.coach_comment,
    up.name as client_name,
    up.profile_picture_url as client_avatar,
    cc.name as checkin_name,
    ccl.coach_id
FROM public.client_checkin_logs ccl
JOIN public.client_checkins cc ON ccl.assignment_id = cc.id
JOIN public.user_profiles up ON up.id = ccl.client_id
WHERE ccl.status = 'review';

GRANT SELECT ON public.coach_checkins_review_view TO authenticated;
