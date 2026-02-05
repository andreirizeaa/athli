-- ================================================
-- Migration 123: Finalize client_questionnaires consolidation
-- ================================================
-- This migration:
-- 1. Adds sent_at, completed_at, answers columns to client_questionnaires
-- 2. Migrates data from client_questionnaire_logs
-- 3. Drops client_questionnaire_logs table
-- 4. Updates RLS policies for client access

-- ================================================
-- STEP 1: Add remaining columns to client_questionnaires
-- ================================================

-- Add sent_at column
ALTER TABLE public.client_questionnaires
  ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ;

-- Add completed_at column
ALTER TABLE public.client_questionnaires
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- Add answers column
ALTER TABLE public.client_questionnaires
  ADD COLUMN IF NOT EXISTS answers JSONB DEFAULT '[]'::jsonb;

-- ================================================
-- STEP 2: Migrate data from client_questionnaire_logs
-- ================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'client_questionnaire_logs') THEN
    -- Update client_questionnaires with data from logs
    UPDATE public.client_questionnaires cq
    SET
      answers = COALESCE(cql.answers, '[]'::jsonb),
      status = CASE
        WHEN cql.status = 'completed' THEN 'completed'
        WHEN cql.status = 'in-progress' THEN 'pending'
        ELSE COALESCE(cq.status, 'pending')
      END,
      completed_at = CASE WHEN cql.status = 'completed' THEN cql.updated_at ELSE NULL END,
      sent_at = COALESCE(cq.sent_at, cq.created_at)
    FROM public.client_questionnaire_logs cql
    WHERE cql.assignment_id = cq.id;

    RAISE NOTICE 'Migrated data from client_questionnaire_logs to client_questionnaires';
  END IF;
END $$;

-- ================================================
-- STEP 3: Drop client_questionnaire_logs table
-- ================================================
DO $$
BEGIN
  -- Drop FK constraints first
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'client_questionnaire_logs'
    AND constraint_type = 'FOREIGN KEY'
  ) THEN
    ALTER TABLE public.client_questionnaire_logs DROP CONSTRAINT IF EXISTS fk_client_questionnaire_logs_assignment;
    ALTER TABLE public.client_questionnaire_logs DROP CONSTRAINT IF EXISTS client_questionnaire_logs_assignment_id_fkey;
  END IF;

  -- Drop triggers
  DROP TRIGGER IF EXISTS trg_cql_updated_at ON public.client_questionnaire_logs;
  DROP TRIGGER IF EXISTS trg_cql_integrity ON public.client_questionnaire_logs;

  -- Drop indexes
  DROP INDEX IF EXISTS public.idx_quest_logs_client;
  DROP INDEX IF EXISTS public.idx_quest_logs_coach;
  DROP INDEX IF EXISTS public.idx_cql_coach_status_created;
  DROP INDEX IF EXISTS public.idx_client_questionnaire_logs_coach_questionnaire_id;

  -- Drop the table
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'client_questionnaire_logs') THEN
    DROP TABLE public.client_questionnaire_logs CASCADE;
    RAISE NOTICE 'Dropped client_questionnaire_logs table';
  END IF;
END $$;

-- Drop integrity function if exists
DROP FUNCTION IF EXISTS public.enforce_quest_log_integrity() CASCADE;

-- ================================================
-- STEP 4: Update RLS policies for client access
-- ================================================

-- Drop existing policies
DROP POLICY IF EXISTS cq_all ON public.client_questionnaires;
DROP POLICY IF EXISTS client_questionnaires_policy ON public.client_questionnaires;
DROP POLICY IF EXISTS cq_coach_all ON public.client_questionnaires;
DROP POLICY IF EXISTS cq_client_select ON public.client_questionnaires;
DROP POLICY IF EXISTS cq_client_update ON public.client_questionnaires;

-- Create coach policy (full access)
CREATE POLICY cq_coach_all ON public.client_questionnaires
  FOR ALL TO authenticated
  USING (coach_id = auth.uid())
  WITH CHECK (coach_id = auth.uid());

-- Create client policies (read own + update answers)
CREATE POLICY cq_client_select ON public.client_questionnaires
  FOR SELECT TO authenticated
  USING (client_id = auth.uid());

CREATE POLICY cq_client_update ON public.client_questionnaires
  FOR UPDATE TO authenticated
  USING (client_id = auth.uid())
  WITH CHECK (client_id = auth.uid());

-- ================================================
-- STEP 5: Add column comments
-- ================================================
COMMENT ON COLUMN public.client_questionnaires.status IS 'Status: draft (not sent), pending (sent, awaiting response), completed';
COMMENT ON COLUMN public.client_questionnaires.sent_at IS 'Timestamp when the questionnaire was sent to the client';
COMMENT ON COLUMN public.client_questionnaires.completed_at IS 'Timestamp when the questionnaire was completed by the client';
COMMENT ON COLUMN public.client_questionnaires.answers IS 'Client responses to the questionnaire questions';
