-- Migration 164: Redesign coach_packages for in-app management & add discount_codes
-- Packages are now created in-app; Stripe IDs are set lazily at checkout time.

BEGIN;

-- ─── 1. Modify coach_packages ───────────────────────────────────────────

-- Make Stripe IDs nullable (packages are created in-app, Stripe IDs added later at checkout time)
ALTER TABLE public.coach_packages ALTER COLUMN stripe_product_id DROP NOT NULL;
ALTER TABLE public.coach_packages ALTER COLUMN stripe_price_id DROP NOT NULL;

-- Drop the old unique constraint that relied on Stripe IDs
ALTER TABLE public.coach_packages DROP CONSTRAINT IF EXISTS coach_packages_coach_id_stripe_product_id_stripe_price_id_key;

-- Add new columns
ALTER TABLE public.coach_packages ADD COLUMN IF NOT EXISTS is_visible BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE public.coach_packages ADD COLUMN IF NOT EXISTS benefits JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.coach_packages ADD COLUMN IF NOT EXISTS free_trial_days INTEGER DEFAULT 0;
ALTER TABLE public.coach_packages ADD COLUMN IF NOT EXISTS duration_months INTEGER;  -- null = until cancelled
ALTER TABLE public.coach_packages ADD COLUMN IF NOT EXISTS onboarding_id UUID REFERENCES public.coach_onboardings(id) ON DELETE SET NULL;

-- ─── 2. Create discount_codes table ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.discount_codes (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coach_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    code            TEXT NOT NULL,
    discount_type   TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
    discount_value  NUMERIC(10,2) NOT NULL,
    currency        TEXT DEFAULT 'usd',
    duration_months INTEGER,
    max_redemptions INTEGER,
    redemption_count INTEGER NOT NULL DEFAULT 0,
    expires_at      TIMESTAMPTZ,
    is_active       BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (coach_id, code)
);

-- Index for fast lookups by coach
CREATE INDEX IF NOT EXISTS idx_discount_codes_coach_id ON public.discount_codes(coach_id);

-- RLS
ALTER TABLE public.discount_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coaches can manage own discount codes"
    ON public.discount_codes
    FOR ALL
    USING (coach_id = auth.uid())
    WITH CHECK (coach_id = auth.uid());

-- updated_at trigger
CREATE TRIGGER set_discount_codes_updated_at
    BEFORE UPDATE ON public.discount_codes
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

COMMIT;
