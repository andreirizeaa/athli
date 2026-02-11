-- Add coupon_id to payments table for per-package coupon tracking
ALTER TABLE public.payments
ADD COLUMN IF NOT EXISTS coupon_id UUID REFERENCES public.coach_coupons(id) ON DELETE SET NULL;

-- Index for efficient querying of coupon usage per package
CREATE INDEX IF NOT EXISTS idx_payments_coupon_package
ON public.payments(coupon_id, package_id)
WHERE coupon_id IS NOT NULL;
