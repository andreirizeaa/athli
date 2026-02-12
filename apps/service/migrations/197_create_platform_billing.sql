-- ============================================================
-- Migration 197: Platform Billing Tables
-- ============================================================
-- Creates tables for Athli platform billing (coaches subscribe to Athli):
--   - platform_subscriptions (coach's subscription to Athli Pro/Max)
--   - platform_addons (active add-ons: automations, ai_assistant, payments)
--   - platform_billing_activity (billing event log)
--   - coach_entitlements (cached feature flags for fast lookups)
-- ============================================================

BEGIN;

-- ============================================================
-- 1. ENUMS
-- ============================================================

-- Plan types
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'platform_plan_type') THEN
        CREATE TYPE platform_plan_type AS ENUM ('starter', 'pro', 'max');
    END IF;
END$$;

-- Subscription status
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'platform_subscription_status') THEN
        CREATE TYPE platform_subscription_status AS ENUM (
            'trialing',
            'active',
            'past_due',
            'cancelled',
            'paused',
            'unpaid'
        );
    END IF;
END$$;

-- Add-on types
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'platform_addon_type') THEN
        CREATE TYPE platform_addon_type AS ENUM ('automations', 'ai_assistant', 'payments');
    END IF;
END$$;

-- ============================================================
-- 2. TABLES
-- ============================================================

-- platform_subscriptions: Coach's subscription to Athli platform
CREATE TABLE IF NOT EXISTS public.platform_subscriptions (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coach_id                UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Stripe identifiers
    stripe_customer_id      TEXT NOT NULL UNIQUE,
    stripe_subscription_id  TEXT UNIQUE,  -- null for free tier

    -- Plan details
    plan_type               platform_plan_type NOT NULL DEFAULT 'starter',
    client_limit            INTEGER NOT NULL DEFAULT 5,
    billing_interval        TEXT CHECK (billing_interval IN ('month', 'year')),

    -- Price tracking (in cents)
    current_price_cents     INTEGER DEFAULT 0,
    currency                TEXT NOT NULL DEFAULT 'usd',

    -- Status
    status                  platform_subscription_status NOT NULL DEFAULT 'active',

    -- Period tracking
    current_period_start    TIMESTAMPTZ,
    current_period_end      TIMESTAMPTZ,
    trial_ends_at           TIMESTAMPTZ,

    -- Cancellation tracking
    cancel_at_period_end    BOOLEAN NOT NULL DEFAULT false,
    cancelled_at            TIMESTAMPTZ,
    cancellation_reason     TEXT,

    -- Metadata
    stripe_price_id         TEXT,  -- Current price ID for plan changes
    metadata                JSONB DEFAULT '{}',

    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_platform_subscriptions_status
    ON public.platform_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_platform_subscriptions_plan
    ON public.platform_subscriptions(plan_type);
CREATE INDEX IF NOT EXISTS idx_platform_subscriptions_stripe_customer
    ON public.platform_subscriptions(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_platform_subscriptions_period_end
    ON public.platform_subscriptions(current_period_end)
    WHERE status IN ('active', 'trialing', 'past_due');

COMMENT ON TABLE public.platform_subscriptions IS 'Athli platform subscriptions for coaches. One subscription per coach.';


-- platform_addons: Active add-ons for a coach
CREATE TABLE IF NOT EXISTS public.platform_addons (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coach_id                    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    addon_type                  platform_addon_type NOT NULL,

    -- Stripe identifiers (subscription item for add-on)
    stripe_subscription_item_id TEXT UNIQUE,
    stripe_price_id             TEXT,

    -- Price tracking
    price_cents                 INTEGER NOT NULL DEFAULT 0,
    billing_interval            TEXT CHECK (billing_interval IN ('month', 'year')),

    -- Status
    is_active                   BOOLEAN NOT NULL DEFAULT true,

    -- Period tracking (synced with main subscription)
    current_period_start        TIMESTAMPTZ,
    current_period_end          TIMESTAMPTZ,

    created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Each coach can only have one of each addon type
    UNIQUE (coach_id, addon_type)
);

CREATE INDEX IF NOT EXISTS idx_platform_addons_coach
    ON public.platform_addons(coach_id);
CREATE INDEX IF NOT EXISTS idx_platform_addons_active
    ON public.platform_addons(coach_id, is_active) WHERE is_active = true;

COMMENT ON TABLE public.platform_addons IS 'Active add-ons (automations, AI assistant, payments) for coaches.';


-- platform_billing_activity: Chronological log of platform billing events
CREATE TABLE IF NOT EXISTS public.platform_billing_activity (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coach_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Event details
    event_type      TEXT NOT NULL,
    description     TEXT NOT NULL,

    -- Amount (for payment events)
    amount_cents    INTEGER,
    currency        TEXT DEFAULT 'usd',

    -- References
    subscription_id UUID REFERENCES public.platform_subscriptions(id) ON DELETE SET NULL,
    addon_id        UUID REFERENCES public.platform_addons(id) ON DELETE SET NULL,

    -- Metadata and Stripe reference
    metadata        JSONB DEFAULT '{}',
    stripe_event_id TEXT,

    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_platform_billing_activity_coach
    ON public.platform_billing_activity(coach_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_platform_billing_activity_type
    ON public.platform_billing_activity(event_type);
CREATE INDEX IF NOT EXISTS idx_platform_billing_activity_stripe_event
    ON public.platform_billing_activity(stripe_event_id)
    WHERE stripe_event_id IS NOT NULL;

COMMENT ON TABLE public.platform_billing_activity IS 'Chronological log of platform billing events for coaches.';


-- coach_entitlements: Cached feature flags for fast access checks
CREATE TABLE IF NOT EXISTS public.coach_entitlements (
    coach_id                UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Plan info
    plan_type               platform_plan_type NOT NULL DEFAULT 'starter',
    client_limit            INTEGER NOT NULL DEFAULT 5,

    -- Feature flags from plan
    has_ai_workout_builder  BOOLEAN NOT NULL DEFAULT false,
    has_custom_exercises    BOOLEAN NOT NULL DEFAULT false,
    has_questionnaires      BOOLEAN NOT NULL DEFAULT false,
    has_habits_metrics      BOOLEAN NOT NULL DEFAULT false,
    storage_limit_gb        INTEGER NOT NULL DEFAULT 0,  -- 0 = unlimited (free has no storage, max has unlimited)
    has_broadcast_messaging BOOLEAN NOT NULL DEFAULT false,
    has_ai_todo_list        BOOLEAN NOT NULL DEFAULT false,
    has_priority_support    BOOLEAN NOT NULL DEFAULT false,

    -- Add-on flags
    has_automations         BOOLEAN NOT NULL DEFAULT false,
    has_ai_assistant        BOOLEAN NOT NULL DEFAULT false,
    has_payments            BOOLEAN NOT NULL DEFAULT false,

    -- Subscription status (for quick checks)
    subscription_status     platform_subscription_status NOT NULL DEFAULT 'active',
    is_trial                BOOLEAN NOT NULL DEFAULT false,
    trial_ends_at           TIMESTAMPTZ,

    updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.coach_entitlements IS 'Cached feature entitlements for fast access control checks.';


-- ============================================================
-- 3. AUTO-UPDATE TRIGGERS
-- ============================================================

DO $$
DECLARE
    tbl TEXT;
BEGIN
    FOR tbl IN SELECT unnest(ARRAY[
        'platform_subscriptions',
        'platform_addons',
        'coach_entitlements'
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
-- 4. FUNCTION: Sync entitlements from subscription + addons
-- ============================================================

CREATE OR REPLACE FUNCTION public.sync_coach_entitlements(p_coach_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_plan TEXT;
    v_client_limit INTEGER;
    v_status TEXT;
    v_is_trial BOOLEAN;
    v_trial_ends_at TIMESTAMPTZ;
    v_has_automations BOOLEAN;
    v_has_ai_assistant BOOLEAN;
    v_has_payments BOOLEAN;
BEGIN
    -- Get subscription details
    SELECT
        COALESCE(plan_type::TEXT, 'starter'),
        COALESCE(client_limit, 5),
        COALESCE(status::TEXT, 'active'),
        (status = 'trialing'),
        trial_ends_at
    INTO v_plan, v_client_limit, v_status, v_is_trial, v_trial_ends_at
    FROM public.platform_subscriptions
    WHERE coach_id = p_coach_id;

    -- If no subscription, use defaults
    IF v_plan IS NULL THEN
        v_plan := 'starter';
        v_client_limit := 5;
        v_status := 'active';
        v_is_trial := false;
    END IF;

    -- Get addon status
    SELECT
        COALESCE(bool_or(addon_type::TEXT = 'automations' AND is_active), false),
        COALESCE(bool_or(addon_type::TEXT = 'ai_assistant' AND is_active), false),
        COALESCE(bool_or(addon_type::TEXT = 'payments' AND is_active), false)
    INTO v_has_automations, v_has_ai_assistant, v_has_payments
    FROM public.platform_addons
    WHERE coach_id = p_coach_id;

    -- Upsert entitlements
    INSERT INTO public.coach_entitlements (
        coach_id,
        plan_type,
        client_limit,
        -- Plan features (Pro and Max get these)
        has_ai_workout_builder,
        has_custom_exercises,
        has_questionnaires,
        has_habits_metrics,
        storage_limit_gb,
        -- Max-only features
        has_broadcast_messaging,
        has_ai_todo_list,
        has_priority_support,
        -- Add-ons
        has_automations,
        has_ai_assistant,
        has_payments,
        -- Status
        subscription_status,
        is_trial,
        trial_ends_at
    ) VALUES (
        p_coach_id,
        v_plan::public.platform_plan_type,
        v_client_limit,
        -- Pro and Max features
        v_plan IN ('pro', 'max'),
        v_plan IN ('pro', 'max'),
        v_plan IN ('pro', 'max'),
        v_plan IN ('pro', 'max'),
        CASE
            WHEN v_plan = 'starter' THEN 0
            WHEN v_plan = 'pro' THEN 5
            WHEN v_plan = 'max' THEN -1  -- -1 = unlimited
        END,
        -- Max-only features
        v_plan = 'max',
        v_plan = 'max',
        v_plan = 'max',
        -- Add-ons
        COALESCE(v_has_automations, false),
        COALESCE(v_has_ai_assistant, false),
        COALESCE(v_has_payments, false),
        -- Status
        v_status::public.platform_subscription_status,
        v_is_trial,
        v_trial_ends_at
    )
    ON CONFLICT (coach_id) DO UPDATE SET
        plan_type = EXCLUDED.plan_type,
        client_limit = EXCLUDED.client_limit,
        has_ai_workout_builder = EXCLUDED.has_ai_workout_builder,
        has_custom_exercises = EXCLUDED.has_custom_exercises,
        has_questionnaires = EXCLUDED.has_questionnaires,
        has_habits_metrics = EXCLUDED.has_habits_metrics,
        storage_limit_gb = EXCLUDED.storage_limit_gb,
        has_broadcast_messaging = EXCLUDED.has_broadcast_messaging,
        has_ai_todo_list = EXCLUDED.has_ai_todo_list,
        has_priority_support = EXCLUDED.has_priority_support,
        has_automations = EXCLUDED.has_automations,
        has_ai_assistant = EXCLUDED.has_ai_assistant,
        has_payments = EXCLUDED.has_payments,
        subscription_status = EXCLUDED.subscription_status,
        is_trial = EXCLUDED.is_trial,
        trial_ends_at = EXCLUDED.trial_ends_at,
        updated_at = now();
END;
$$;


-- ============================================================
-- 5. TRIGGERS: Auto-sync entitlements on subscription/addon changes
-- ============================================================

CREATE OR REPLACE FUNCTION public.trigger_sync_entitlements()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        PERFORM public.sync_coach_entitlements(OLD.coach_id);
        RETURN OLD;
    ELSE
        PERFORM public.sync_coach_entitlements(NEW.coach_id);
        RETURN NEW;
    END IF;
END;
$$;

-- Trigger on platform_subscriptions
DROP TRIGGER IF EXISTS trg_sync_entitlements_on_subscription ON public.platform_subscriptions;
CREATE TRIGGER trg_sync_entitlements_on_subscription
    AFTER INSERT OR UPDATE OR DELETE ON public.platform_subscriptions
    FOR EACH ROW EXECUTE FUNCTION public.trigger_sync_entitlements();

-- Trigger on platform_addons
DROP TRIGGER IF EXISTS trg_sync_entitlements_on_addon ON public.platform_addons;
CREATE TRIGGER trg_sync_entitlements_on_addon
    AFTER INSERT OR UPDATE OR DELETE ON public.platform_addons
    FOR EACH ROW EXECUTE FUNCTION public.trigger_sync_entitlements();


-- ============================================================
-- 6. ENABLE RLS
-- ============================================================

ALTER TABLE public.platform_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_addons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_billing_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coach_entitlements ENABLE ROW LEVEL SECURITY;


-- ============================================================
-- 7. RLS POLICIES
-- ============================================================

-- platform_subscriptions: coach sees own only
CREATE POLICY platform_subscriptions_coach_select
    ON public.platform_subscriptions FOR SELECT
    TO authenticated
    USING (coach_id = auth.uid());

CREATE POLICY platform_subscriptions_service
    ON public.platform_subscriptions FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- platform_addons: coach sees own only
CREATE POLICY platform_addons_coach_select
    ON public.platform_addons FOR SELECT
    TO authenticated
    USING (coach_id = auth.uid());

CREATE POLICY platform_addons_service
    ON public.platform_addons FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- platform_billing_activity: coach sees own only
CREATE POLICY platform_billing_activity_coach_select
    ON public.platform_billing_activity FOR SELECT
    TO authenticated
    USING (coach_id = auth.uid());

CREATE POLICY platform_billing_activity_service
    ON public.platform_billing_activity FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- coach_entitlements: coach sees own only
CREATE POLICY coach_entitlements_coach_select
    ON public.coach_entitlements FOR SELECT
    TO authenticated
    USING (coach_id = auth.uid());

CREATE POLICY coach_entitlements_service
    ON public.coach_entitlements FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);


-- ============================================================
-- 8. VIEW: Subscription summary with addons
-- ============================================================

CREATE OR REPLACE VIEW public.coach_subscription_summary AS
SELECT
    ps.coach_id,
    ps.plan_type,
    ps.client_limit,
    ps.status,
    ps.billing_interval,
    ps.current_price_cents,
    ps.currency,
    ps.current_period_start,
    ps.current_period_end,
    ps.trial_ends_at,
    ps.cancel_at_period_end,
    ps.cancelled_at,
    -- Add-ons
    COALESCE(
        (SELECT json_agg(json_build_object(
            'type', pa.addon_type,
            'price_cents', pa.price_cents,
            'is_active', pa.is_active
        )) FROM public.platform_addons pa
        WHERE pa.coach_id = ps.coach_id AND pa.is_active = true),
        '[]'::json
    ) AS active_addons,
    -- Total monthly cost (base + addons)
    ps.current_price_cents + COALESCE(
        (SELECT SUM(pa.price_cents) FROM public.platform_addons pa
        WHERE pa.coach_id = ps.coach_id AND pa.is_active = true),
        0
    ) AS total_monthly_cents,
    ps.created_at,
    ps.updated_at
FROM public.platform_subscriptions ps;

COMMENT ON VIEW public.coach_subscription_summary IS 'Coach subscription with active addons and total cost.';

COMMIT;
