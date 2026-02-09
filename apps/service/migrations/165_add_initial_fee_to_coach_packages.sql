-- Migration 165: Add initial_fee_cents to coach_packages
-- Allows coaches to charge an additional one-time fee on top of the recurring price.

BEGIN;

ALTER TABLE public.coach_packages ADD COLUMN IF NOT EXISTS initial_fee_cents INTEGER NOT NULL DEFAULT 0;

COMMIT;
