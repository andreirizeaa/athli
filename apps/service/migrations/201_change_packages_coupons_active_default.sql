-- Change default of is_active to false for packages and coupons
-- Packages/coupons are now created as inactive by default
-- Users must have payments addon + Stripe connected to toggle them to active
-- Only active packages/coupons are synced to Stripe

-- Change default for coach_packages
ALTER TABLE public.coach_packages ALTER COLUMN is_active SET DEFAULT false;

-- Change default for coach_coupons
ALTER TABLE public.coach_coupons ALTER COLUMN is_active SET DEFAULT false;

-- Add comment explaining the behavior
COMMENT ON COLUMN public.coach_packages.is_active IS 'Whether the package is active. Defaults to false. Can only be set to true when coach has payments addon and Stripe connected. Active packages are synced to Stripe.';
COMMENT ON COLUMN public.coach_coupons.is_active IS 'Whether the coupon is active. Defaults to false. Can only be set to true when coach has payments addon and Stripe connected. Active coupons are synced to Stripe.';
