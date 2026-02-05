-- ================================================
-- Migration 124: Add status column to client_checkins
-- ================================================

-- Add status column with default 'draft'
ALTER TABLE public.client_checkins
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'live', 'paused'));

-- Update existing check-ins: if they have questions, set to 'live', otherwise 'draft'
UPDATE public.client_checkins
SET status = CASE
  WHEN questions IS NOT NULL AND jsonb_array_length(questions) > 0 THEN 'live'
  ELSE 'draft'
END
WHERE status IS NULL;

-- Add comment
COMMENT ON COLUMN public.client_checkins.status IS 'Status: draft (not published), live (active), paused (temporarily disabled)';
