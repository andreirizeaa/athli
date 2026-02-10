-- Add account_type column to coach_stripe_accounts
-- Supports 'express' (legacy, created by Athli) and 'standard' (OAuth, coach's own account)

ALTER TABLE public.coach_stripe_accounts
  ADD COLUMN IF NOT EXISTS account_type TEXT NOT NULL DEFAULT 'express';
