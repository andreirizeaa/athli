-- Add unique constraint for Stripe sync upserts
-- NULLs are treated as distinct in PostgreSQL, so rows without Stripe IDs are unaffected
ALTER TABLE public.coach_packages
  ADD CONSTRAINT uq_coach_packages_stripe_ids UNIQUE (coach_id, stripe_product_id, stripe_price_id);
