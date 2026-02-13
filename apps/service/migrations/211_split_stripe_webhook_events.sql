-- Migration 211: Split stripe_webhook_events into two separate tables
-- One for coach payments (client payments) and one for platform billing (subscriptions)

-- Create table for payment webhook events (coach payment processing for clients)
CREATE TABLE IF NOT EXISTS public.stripe_payment_webhook_events (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    payload JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create table for billing webhook events (platform subscription billing)
CREATE TABLE IF NOT EXISTS public.stripe_billing_webhook_events (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    payload JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add indexes for querying by type and time
CREATE INDEX IF NOT EXISTS idx_stripe_payment_webhook_events_type
    ON public.stripe_payment_webhook_events(type);
CREATE INDEX IF NOT EXISTS idx_stripe_payment_webhook_events_created_at
    ON public.stripe_payment_webhook_events(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_stripe_billing_webhook_events_type
    ON public.stripe_billing_webhook_events(type);
CREATE INDEX IF NOT EXISTS idx_stripe_billing_webhook_events_created_at
    ON public.stripe_billing_webhook_events(created_at DESC);

-- Grant permissions
GRANT ALL ON public.stripe_payment_webhook_events TO authenticated, service_role;
GRANT ALL ON public.stripe_billing_webhook_events TO authenticated, service_role;

-- Enable RLS (but we typically disable it for these internal tables)
ALTER TABLE public.stripe_payment_webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stripe_billing_webhook_events ENABLE ROW LEVEL SECURITY;

-- Service role bypasses RLS, so no policies needed since these tables
-- are only accessed by the backend service

-- Drop the old unified table
DROP TABLE IF EXISTS public.stripe_webhook_events;

COMMENT ON TABLE public.stripe_payment_webhook_events IS 'Stores processed Stripe webhook events for coach payment processing (client payments)';
COMMENT ON TABLE public.stripe_billing_webhook_events IS 'Stores processed Stripe webhook events for platform subscription billing';
