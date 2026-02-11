-- ============================================================
-- Migration: Create billing_activity table
-- ============================================================
-- This table stores a chronological log of all billing events
-- for coaches to track client activity: payments, cancellations,
-- renewals, reactivations, payment failures, etc.
-- ============================================================

-- Create billing_activity table
CREATE TABLE IF NOT EXISTS public.billing_activity (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coach_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    client_id       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    package_id      UUID REFERENCES public.coach_packages(id) ON DELETE SET NULL,
    subscription_id UUID REFERENCES public.client_subscriptions(id) ON DELETE SET NULL,

    -- Event type: payment_succeeded, payment_failed, subscription_created,
    -- subscription_cancelled, subscription_reactivated, subscription_renewed,
    -- refund_issued, dispute_created, payment_method_updated
    event_type      TEXT NOT NULL,

    -- Human-readable description
    description     TEXT NOT NULL,

    -- Optional amount for payment-related events
    amount_cents    INTEGER,
    currency        TEXT DEFAULT 'usd',

    -- Additional metadata (e.g., failure reason, cancellation reason)
    metadata        JSONB DEFAULT '{}',

    -- Stripe references for debugging
    stripe_event_id TEXT,

    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_billing_activity_coach
ON public.billing_activity(coach_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_billing_activity_client
ON public.billing_activity(client_id, created_at DESC)
WHERE client_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_billing_activity_type
ON public.billing_activity(event_type);

CREATE INDEX IF NOT EXISTS idx_billing_activity_stripe_event
ON public.billing_activity(stripe_event_id)
WHERE stripe_event_id IS NOT NULL;

COMMENT ON TABLE public.billing_activity IS 'Chronological log of all billing events for coach dashboards.';

-- RLS
ALTER TABLE public.billing_activity ENABLE ROW LEVEL SECURITY;

-- Coach can view their own activity
CREATE POLICY billing_activity_coach_select
    ON public.billing_activity FOR SELECT
    TO authenticated
    USING (coach_id = auth.uid());

-- Service role can insert/update (for webhooks)
CREATE POLICY billing_activity_service
    ON public.billing_activity FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
