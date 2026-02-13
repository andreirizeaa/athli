-- ============================================================================
-- Migration 206: Create Stripe Price Lookup Table
-- ============================================================================
-- Purpose: Cache Stripe product and price IDs to avoid creating duplicates
-- on every checkout session. Maps (price_type, plan_type/addon_type,
-- client_limit, billing_interval) -> stripe_price_id
-- ============================================================================

-- Create the price lookup table
CREATE TABLE public.platform_stripe_prices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stripe_product_id TEXT NOT NULL,
    stripe_price_id TEXT NOT NULL UNIQUE,
    price_type TEXT NOT NULL CHECK (price_type IN ('plan', 'addon')),
    plan_type TEXT CHECK (plan_type IN ('pro', 'max')),
    addon_type TEXT CHECK (addon_type IN ('automations', 'ai_assistant', 'payments')),
    client_limit INTEGER,
    billing_interval TEXT NOT NULL CHECK (billing_interval IN ('month', 'year')),
    unit_amount_cents INTEGER NOT NULL,
    currency TEXT NOT NULL DEFAULT 'usd',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Unique constraint: one price per configuration
    -- NULLS NOT DISTINCT ensures NULL addon_type or NULL plan_type are treated as equal
    UNIQUE NULLS NOT DISTINCT (price_type, plan_type, addon_type, client_limit, billing_interval)
);

-- Add constraints to ensure data integrity
ALTER TABLE public.platform_stripe_prices
ADD CONSTRAINT chk_plan_requires_plan_type
    CHECK (price_type != 'plan' OR plan_type IS NOT NULL);

ALTER TABLE public.platform_stripe_prices
ADD CONSTRAINT chk_plan_requires_client_limit
    CHECK (price_type != 'plan' OR client_limit IS NOT NULL);

ALTER TABLE public.platform_stripe_prices
ADD CONSTRAINT chk_addon_requires_addon_type
    CHECK (price_type != 'addon' OR addon_type IS NOT NULL);

ALTER TABLE public.platform_stripe_prices
ADD CONSTRAINT chk_addon_no_client_limit
    CHECK (price_type != 'addon' OR client_limit IS NULL);

-- Index for fast lookups
CREATE INDEX idx_stripe_prices_lookup
ON public.platform_stripe_prices (price_type, plan_type, addon_type, client_limit, billing_interval)
WHERE is_active = true;

-- RLS policies (service role access only - no direct client access)
ALTER TABLE public.platform_stripe_prices ENABLE ROW LEVEL SECURITY;

-- Allow service role full access
CREATE POLICY "Service role full access" ON public.platform_stripe_prices
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

COMMENT ON TABLE public.platform_stripe_prices IS
'Cache table mapping plan/addon configurations to Stripe product and price IDs. Prevents duplicate product/price creation in Stripe.';
