-- Migration 191: Add sales/revenue tracking columns to coach_packages
-- Tracks per-package: sales count, active subscriptions, cancellations, refunds, and revenue

BEGIN;

-- Add stats columns to coach_packages
ALTER TABLE public.coach_packages ADD COLUMN IF NOT EXISTS sales_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.coach_packages ADD COLUMN IF NOT EXISTS active_subscriptions_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.coach_packages ADD COLUMN IF NOT EXISTS cancellations_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.coach_packages ADD COLUMN IF NOT EXISTS refunds_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.coach_packages ADD COLUMN IF NOT EXISTS total_revenue_cents BIGINT NOT NULL DEFAULT 0;

-- Add index for sorting packages by revenue/sales
CREATE INDEX IF NOT EXISTS idx_coach_packages_revenue ON public.coach_packages(coach_id, total_revenue_cents DESC);

COMMIT;
