-- Migration 038: Fix broken views from 037 and cleanup cp.coach_id references
-- Usage: Fixes views that referenced renamed tables (assignments -> client_*)
--        and ensures no policies/functions reference the dropped cp.coach_id column.

-- 1. Fix Views that were referencing invalid table names in 037
DROP VIEW IF EXISTS public.client_checkins_view CASCADE;
CREATE OR REPLACE VIEW public.client_checkins_view 
WITH (security_invoker = true)
AS
SELECT 
    cc.id as assignment_id,
    cc.client_id,
    cc.coach_id,
    -- cc.checkin_id column might was dropped in 037? 
    -- 037 line 151: DROP COLUMN IF EXISTS checkin_id. 
    -- So we should NOT select checkin_id.
    -- Wait, 037 says: Backfill... DROP COLUMN checkin_id.
    -- So client_checkins (table) now HAS the data directly (name, description, questions).
    -- So the VIEW is likely redundant or should just select from the table?
    -- If the frontend expects a view structure, we can map it.
    cc.name,
    cc.description,
    cc.questions,
    cc.schedule_config,
    cc.cron_expression
FROM public.client_checkins cc;

DROP VIEW IF EXISTS public.client_questionnaires_view CASCADE;
CREATE OR REPLACE VIEW public.client_questionnaires_view 
WITH (security_invoker = true)
AS
SELECT 
    cq.id as assignment_id,
    cq.client_id,
    cq.coach_id,
    -- cq.questionnaire_id was dropped in 037
    cq.name,
    cq.description,
    cq.questions
FROM public.client_questionnaires cq;

DROP VIEW IF EXISTS public.client_files_view CASCADE;
CREATE OR REPLACE VIEW public.client_files_view 
WITH (security_invoker = true)
AS
SELECT 
    cf.id as assignment_id,
    cf.client_id,
    cf.coach_id,
    -- cf.file_id was dropped in 037
    cf.filename,
    cf.file_path,
    cf.mime_type,
    cf.size,
    cf.created_at
FROM public.client_files cf;


-- 2. Ensure RLS policies on client_training_summary do NOT use cp.coach_id
-- (Safety measure against 005 lingering)
DROP POLICY IF EXISTS cts_select ON public.client_training_summary;
CREATE POLICY cts_select
ON public.client_training_summary
FOR SELECT
TO authenticated
USING (
  (select auth.uid()) = client_id
  OR EXISTS (
    SELECT 1 FROM public.coach_client_assignments cca
    WHERE cca.client_id = client_training_summary.client_id
      AND cca.coach_id = (select auth.uid())
  )
);

-- 3. Ensure Triggers do not use cp.coach_id
-- Update enforce_coach_private_integrity just in case
CREATE OR REPLACE FUNCTION public.enforce_coach_private_integrity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE v_coach uuid;
BEGIN
  -- Search in assignments (cca)
  SELECT cca.coach_id INTO v_coach 
  FROM public.coach_client_assignments cca 
  WHERE cca.client_id = NEW.client_id
  LIMIT 1;

  IF v_coach IS NULL THEN 
    -- Soft fallback: allow insert without coach_id if not found? 
    -- No, data integrity requires it.
    -- But if user is Client, maybe they don't have coach assignment yet?
    -- This trigger is for coach-private data usually?
    RAISE EXCEPTION 'client_id % has no coach assignment', NEW.client_id; 
  END IF;
  
  NEW.coach_id := v_coach;
  RETURN NEW;
END;
$$;

-- 4. Recreate coach_checkins_review_view to use client_files (if needed) or correct tables
-- 037 defined it using client_checkin_logs and client_checkin_assignments (renamed to client_checkins?)
-- 037 line 204: JOIN public.client_checkin_assignments cca
-- This was broken too.
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
-- Join client_checkins (renamed from client_checkin_assignments)
JOIN public.client_checkins cc ON ccl.assignment_id = cc.id
JOIN public.user_profiles up ON up.id = ccl.client_id;

GRANT SELECT ON public.coach_checkins_review_view TO authenticated;
