-- ================================================
-- 234: Fix Flow Execution Deduplication
-- ================================================
-- The partial unique index idx_fe_trigger_key_active only prevents
-- duplicates among non-terminal rows. Once a flow_execution completes,
-- its trigger_key leaves the index and the next cron run creates a
-- duplicate for the same still-present client_tasks row.
--
-- Fix: replace the partial index with a full unique index on trigger_key.
-- Since trigger_key includes due_date, different days still get separate keys.
-- ================================================

-- 1. Clean up existing duplicate completed rows (keep earliest per trigger_key)
DELETE FROM public.flow_executions
WHERE id NOT IN (
  SELECT MIN(id::text)::uuid
  FROM public.flow_executions
  GROUP BY trigger_key
);

-- 2. Drop the partial unique index
DROP INDEX IF EXISTS idx_fe_trigger_key_active;

-- 3. Create a full unique index (no WHERE clause)
CREATE UNIQUE INDEX idx_fe_trigger_key_unique
  ON public.flow_executions (trigger_key);
