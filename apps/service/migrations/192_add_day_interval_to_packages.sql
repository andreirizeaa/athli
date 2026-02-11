-- Migration 192: Add 'day' interval to coach_packages
-- Stripe supports daily recurring prices, but our CHECK constraint didn't include it

BEGIN;

-- Drop the old constraint and add a new one that includes 'day'
ALTER TABLE public.coach_packages DROP CONSTRAINT IF EXISTS coach_packages_interval_check;
ALTER TABLE public.coach_packages ADD CONSTRAINT coach_packages_interval_check
  CHECK (interval IN ('one_time', 'day', 'week', 'month', 'year'));

COMMIT;
