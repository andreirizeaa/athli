-- Migration 193: Remove initial_fee_cents from coach_packages
-- Stripe doesn't support initial fees, so we're removing this feature

BEGIN;

ALTER TABLE public.coach_packages DROP COLUMN IF EXISTS initial_fee_cents;

COMMIT;
