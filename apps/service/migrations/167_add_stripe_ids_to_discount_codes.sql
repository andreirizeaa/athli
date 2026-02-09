-- Migration 167: Add Stripe coupon/promo-code IDs to discount_codes
-- These are populated when syncing discount codes to Stripe.

BEGIN;

ALTER TABLE public.discount_codes ADD COLUMN IF NOT EXISTS stripe_coupon_id TEXT;
ALTER TABLE public.discount_codes ADD COLUMN IF NOT EXISTS stripe_promo_code_id TEXT;

COMMIT;
