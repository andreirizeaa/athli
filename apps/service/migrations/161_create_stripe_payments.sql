-- ============================================================
-- 161: Stripe Connect Payment Tables
-- ============================================================
-- Creates tables for Stripe Connect integration:
--   - coach_stripe_accounts (coach ↔ Stripe Express account)
--   - coach_packages (cached mirror of Stripe products/prices)
--   - client_package_assignments (coach assigns packages to clients)
--   - payments (one-time payment records)
--   - client_subscriptions (recurring subscription records)
--   - stripe_webhook_events (idempotency tracking)
-- Plus views for analytics and access gating, and RLS policies.
-- ============================================================

-- ============================================================
-- 1. TABLES
-- ============================================================

-- coach_stripe_accounts
CREATE TABLE IF NOT EXISTS public.coach_stripe_accounts (
    coach_id        UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    stripe_account_id TEXT NOT NULL UNIQUE,
    onboarding_complete BOOLEAN NOT NULL DEFAULT false,
    charges_enabled   BOOLEAN NOT NULL DEFAULT false,
    payouts_enabled   BOOLEAN NOT NULL DEFAULT false,
    details_submitted BOOLEAN NOT NULL DEFAULT false,
    default_currency  TEXT,
    country           TEXT,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.coach_stripe_accounts IS 'Links each coach to their Stripe Express connected account. One account per coach (PK enforced).';

-- coach_packages
CREATE TABLE IF NOT EXISTS public.coach_packages (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coach_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    stripe_product_id TEXT NOT NULL,
    stripe_price_id   TEXT NOT NULL,
    name              TEXT NOT NULL,
    description       TEXT,
    amount_cents      INTEGER NOT NULL,
    currency          TEXT NOT NULL DEFAULT 'usd',
    interval          TEXT NOT NULL DEFAULT 'one_time'
                      CHECK (interval IN ('one_time', 'week', 'month', 'year')),
    interval_count    INTEGER,
    is_active         BOOLEAN NOT NULL DEFAULT true,
    sort_order        INTEGER NOT NULL DEFAULT 0,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (coach_id, stripe_product_id, stripe_price_id)
);

CREATE INDEX IF NOT EXISTS idx_coach_packages_coach_id ON public.coach_packages(coach_id);
CREATE INDEX IF NOT EXISTS idx_coach_packages_active ON public.coach_packages(coach_id, is_active) WHERE is_active = true;

COMMENT ON TABLE public.coach_packages IS 'Cached mirror of a coach''s Stripe products/prices. Synced via API and webhooks.';

-- client_package_assignments
CREATE TABLE IF NOT EXISTS public.client_package_assignments (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coach_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    client_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    package_id  UUID NOT NULL REFERENCES public.coach_packages(id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    is_active   BOOLEAN NOT NULL DEFAULT true,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_client_package_assignments_client ON public.client_package_assignments(client_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_client_package_assignments_coach ON public.client_package_assignments(coach_id);
CREATE INDEX IF NOT EXISTS idx_client_package_assignments_package ON public.client_package_assignments(package_id);

COMMENT ON TABLE public.client_package_assignments IS 'Coach assigns specific packages to clients. If a client has active assignments, they must have paid for at least one to access the app.';

-- payments
CREATE TABLE IF NOT EXISTS public.payments (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coach_id                    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    client_id                   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    package_id                  UUID REFERENCES public.coach_packages(id) ON DELETE SET NULL,
    stripe_checkout_session_id  TEXT UNIQUE,
    stripe_payment_intent_id    TEXT UNIQUE,
    amount_cents                INTEGER NOT NULL,
    currency                    TEXT NOT NULL DEFAULT 'usd',
    status                      TEXT NOT NULL DEFAULT 'pending'
                                CHECK (status IN ('pending', 'succeeded', 'failed', 'refunded', 'disputed', 'cancelled')),
    failure_reason              TEXT,
    paid_at                     TIMESTAMPTZ,
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payments_coach ON public.payments(coach_id);
CREATE INDEX IF NOT EXISTS idx_payments_client ON public.payments(client_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_coach_client ON public.payments(coach_id, client_id);
CREATE INDEX IF NOT EXISTS idx_payments_paid_at ON public.payments(paid_at DESC) WHERE paid_at IS NOT NULL;

COMMENT ON TABLE public.payments IS 'Every one-time payment attempt and outcome. Source of truth comes from Stripe webhooks.';

-- client_subscriptions
CREATE TABLE IF NOT EXISTS public.client_subscriptions (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coach_id                UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    client_id               UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    package_id              UUID REFERENCES public.coach_packages(id) ON DELETE SET NULL,
    stripe_subscription_id  TEXT NOT NULL UNIQUE,
    stripe_customer_id      TEXT NOT NULL,
    status                  TEXT NOT NULL DEFAULT 'active'
                            CHECK (status IN ('active', 'past_due', 'cancelled', 'unpaid', 'trialing')),
    current_period_start    TIMESTAMPTZ,
    current_period_end      TIMESTAMPTZ,
    cancel_at_period_end    BOOLEAN NOT NULL DEFAULT false,
    cancelled_at            TIMESTAMPTZ,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_client_subscriptions_coach ON public.client_subscriptions(coach_id);
CREATE INDEX IF NOT EXISTS idx_client_subscriptions_client ON public.client_subscriptions(client_id);
CREATE INDEX IF NOT EXISTS idx_client_subscriptions_status ON public.client_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_client_subscriptions_period_end ON public.client_subscriptions(current_period_end) WHERE status IN ('active', 'past_due');

COMMENT ON TABLE public.client_subscriptions IS 'Recurring subscription records. Status synced via Stripe webhooks.';

-- stripe_webhook_events
CREATE TABLE IF NOT EXISTS public.stripe_webhook_events (
    id           TEXT PRIMARY KEY,
    type         TEXT NOT NULL,
    processed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    payload      JSONB NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_type ON public.stripe_webhook_events(type);

COMMENT ON TABLE public.stripe_webhook_events IS 'Idempotency tracking for Stripe webhooks. Prevents duplicate processing.';


-- ============================================================
-- 2. AUTO-UPDATE TRIGGERS
-- ============================================================

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

DO $$
DECLARE
    tbl TEXT;
BEGIN
    FOR tbl IN SELECT unnest(ARRAY[
        'coach_stripe_accounts',
        'coach_packages',
        'client_package_assignments',
        'payments',
        'client_subscriptions'
    ])
    LOOP
        EXECUTE format(
            'DROP TRIGGER IF EXISTS trg_%s_updated_at ON public.%I;
             CREATE TRIGGER trg_%s_updated_at
             BEFORE UPDATE ON public.%I
             FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();',
            tbl, tbl, tbl, tbl
        );
    END LOOP;
END;
$$;


-- ============================================================
-- 3. VIEWS
-- ============================================================

-- Coach payment analytics: total revenue, counts, etc.
CREATE OR REPLACE VIEW public.coach_payment_analytics AS
SELECT
    p.coach_id,
    COALESCE(SUM(p.amount_cents) FILTER (WHERE p.status = 'succeeded'), 0)::bigint AS total_revenue_cents,
    COUNT(*) FILTER (WHERE p.status = 'succeeded')::int AS successful_count,
    COUNT(*) FILTER (WHERE p.status = 'failed')::int AS failed_count,
    COUNT(DISTINCT p.client_id) FILTER (WHERE p.status = 'succeeded')::int AS paying_client_count,
    MAX(p.paid_at) AS last_payment_at
FROM public.payments p
GROUP BY p.coach_id;

-- Per coach+client payment summary
CREATE OR REPLACE VIEW public.coach_client_payment_summary AS
SELECT
    p.coach_id,
    p.client_id,
    COALESCE(SUM(p.amount_cents) FILTER (WHERE p.status = 'succeeded'), 0)::bigint AS total_paid_cents,
    COUNT(*) FILTER (WHERE p.status = 'succeeded')::int AS successful_count,
    COUNT(*) FILTER (WHERE p.status = 'failed')::int AS failed_count,
    MAX(p.paid_at) AS last_payment_at,
    MAX(p.updated_at) FILTER (WHERE p.status = 'failed') AS last_failure_at
FROM public.payments p
GROUP BY p.coach_id, p.client_id;


-- ============================================================
-- 4. ENABLE RLS
-- ============================================================

ALTER TABLE public.coach_stripe_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coach_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_package_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stripe_webhook_events ENABLE ROW LEVEL SECURITY;


-- ============================================================
-- 5. RLS POLICIES
-- ============================================================

-- coach_stripe_accounts: coach sees own only
CREATE POLICY coach_stripe_accounts_coach_select
    ON public.coach_stripe_accounts FOR SELECT
    TO authenticated
    USING (coach_id = auth.uid());

CREATE POLICY coach_stripe_accounts_coach_insert
    ON public.coach_stripe_accounts FOR INSERT
    TO authenticated
    WITH CHECK (coach_id = auth.uid());

CREATE POLICY coach_stripe_accounts_coach_update
    ON public.coach_stripe_accounts FOR UPDATE
    TO authenticated
    USING (coach_id = auth.uid());

-- Service role bypasses RLS for webhook updates
CREATE POLICY coach_stripe_accounts_service
    ON public.coach_stripe_accounts FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- coach_packages: coach manages own; clients can view active packages of assigned coach
CREATE POLICY coach_packages_coach_all
    ON public.coach_packages FOR ALL
    TO authenticated
    USING (coach_id = auth.uid())
    WITH CHECK (coach_id = auth.uid());

CREATE POLICY coach_packages_client_select
    ON public.coach_packages FOR SELECT
    TO authenticated
    USING (
        is_active = true
        AND EXISTS (
            SELECT 1 FROM public.coach_client_assignments cca
            WHERE cca.coach_id = coach_packages.coach_id
              AND cca.client_id = auth.uid()
              AND cca.status = 'accepted'
        )
    );

CREATE POLICY coach_packages_service
    ON public.coach_packages FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- client_package_assignments: coach manages; client reads own
CREATE POLICY client_package_assignments_coach_all
    ON public.client_package_assignments FOR ALL
    TO authenticated
    USING (coach_id = auth.uid())
    WITH CHECK (coach_id = auth.uid());

CREATE POLICY client_package_assignments_client_select
    ON public.client_package_assignments FOR SELECT
    TO authenticated
    USING (client_id = auth.uid());

CREATE POLICY client_package_assignments_service
    ON public.client_package_assignments FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- payments: coach sees own; client sees own
CREATE POLICY payments_coach_select
    ON public.payments FOR SELECT
    TO authenticated
    USING (coach_id = auth.uid());

CREATE POLICY payments_client_select
    ON public.payments FOR SELECT
    TO authenticated
    USING (client_id = auth.uid());

CREATE POLICY payments_service
    ON public.payments FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- client_subscriptions: same as payments
CREATE POLICY client_subscriptions_coach_select
    ON public.client_subscriptions FOR SELECT
    TO authenticated
    USING (coach_id = auth.uid());

CREATE POLICY client_subscriptions_client_select
    ON public.client_subscriptions FOR SELECT
    TO authenticated
    USING (client_id = auth.uid());

CREATE POLICY client_subscriptions_service
    ON public.client_subscriptions FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- stripe_webhook_events: service role only
CREATE POLICY stripe_webhook_events_service
    ON public.stripe_webhook_events FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
