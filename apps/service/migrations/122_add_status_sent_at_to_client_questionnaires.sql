-- ================================================
-- Migration 122: Add status, sent_at, completed_at to client_questionnaires
-- ================================================
-- This migration adds status tracking columns to client_questionnaires table
-- to support draft/pending/completed workflow.

-- Add status column with default 'draft'
ALTER TABLE public.client_questionnaires
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'completed'));

-- Add sent_at column for when the questionnaire was sent to the client
ALTER TABLE public.client_questionnaires
  ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ;

-- Add completed_at column for when the questionnaire was completed
ALTER TABLE public.client_questionnaires
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- Update existing records: if they have a completed_at, set status to completed
-- Otherwise, set to pending (assuming they were already sent)
UPDATE public.client_questionnaires
SET status = CASE
  WHEN completed_at IS NOT NULL THEN 'completed'
  ELSE 'pending'
END,
sent_at = COALESCE(sent_at, created_at)
WHERE status IS NULL OR status = 'draft';

-- For new records, default to draft status
COMMENT ON COLUMN public.client_questionnaires.status IS 'Status of the questionnaire: draft (not sent), pending (sent, awaiting response), completed';
COMMENT ON COLUMN public.client_questionnaires.sent_at IS 'Timestamp when the questionnaire was sent to the client';
COMMENT ON COLUMN public.client_questionnaires.completed_at IS 'Timestamp when the questionnaire was completed by the client';
