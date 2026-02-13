-- ============================================================================
-- Migration 218: Make referred_coach_id nullable
-- ============================================================================
-- Fix for migration 216 - the column needs to be nullable for ON DELETE SET NULL
-- to work when a referred coach deletes their account.
-- ============================================================================

ALTER TABLE public.coach_referrals
ALTER COLUMN referred_coach_id DROP NOT NULL;
