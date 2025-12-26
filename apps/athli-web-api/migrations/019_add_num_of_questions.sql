-- ================================================
-- Migration 019: Add num_of_questions column to forms tables
-- ================================================

-- Add num_of_questions column to coach_checkins
ALTER TABLE public.coach_checkins
ADD COLUMN IF NOT EXISTS num_of_questions INTEGER DEFAULT 0;

-- Add num_of_questions column to coach_questionnaires
ALTER TABLE public.coach_questionnaires
ADD COLUMN IF NOT EXISTS num_of_questions INTEGER DEFAULT 0;

