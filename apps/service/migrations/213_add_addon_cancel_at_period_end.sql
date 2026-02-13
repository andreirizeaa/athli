-- Add cancel_at_period_end column to platform_addons table
-- This allows scheduling addon cancellation at the end of billing period (like subscription cancellation)

ALTER TABLE public.platform_addons
ADD COLUMN IF NOT EXISTS cancel_at_period_end BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.platform_addons.cancel_at_period_end IS 'When true, the addon is scheduled for cancellation at the end of the current billing period.';
