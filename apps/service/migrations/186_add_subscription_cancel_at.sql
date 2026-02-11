-- ============================================================
-- Migration: Add cancel_at column to client_subscriptions
-- ============================================================
-- This column stores when a subscription is scheduled to be cancelled.
-- When a user cancels via Stripe's billing portal, Stripe sets cancel_at
-- to indicate the future cancellation date (usually end of billing period).
-- ============================================================

-- Add cancel_at column
ALTER TABLE public.client_subscriptions
ADD COLUMN IF NOT EXISTS cancel_at TIMESTAMPTZ;

COMMENT ON COLUMN public.client_subscriptions.cancel_at IS 'When the subscription is scheduled to be cancelled (future date from Stripe)';

-- Add index for querying subscriptions scheduled for cancellation
CREATE INDEX IF NOT EXISTS idx_client_subscriptions_cancel_at
ON public.client_subscriptions(cancel_at)
WHERE cancel_at IS NOT NULL;
