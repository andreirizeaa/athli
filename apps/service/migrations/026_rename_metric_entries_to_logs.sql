-- ================================================
-- 026: Rename client_metric_entries to client_metric_logs
-- ================================================
-- This migration renames the client_metric_entries table to client_metric_logs
-- for consistency with other log tables (client_habit_logs, client_checkin_logs)
-- ================================================

-- Rename the table
ALTER TABLE IF EXISTS public.client_metric_entries 
  RENAME TO client_metric_logs;

-- Update any indexes to reflect new table name
ALTER INDEX IF EXISTS idx_entries_query 
  RENAME TO idx_metric_logs_query;

ALTER INDEX IF EXISTS idx_entries_coach_recent 
  RENAME TO idx_metric_logs_coach_recent;

ALTER INDEX IF EXISTS idx_entries_client_history 
  RENAME TO idx_metric_logs_client_history;

ALTER INDEX IF EXISTS idx_client_metric_entries_coach_metric_id 
  RENAME TO idx_client_metric_logs_coach_metric_id;

-- ================================================
-- Migration Complete
-- ================================================
