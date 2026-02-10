-- Remove duration_months column from coach_packages (unused, Stripe doesn't support it)
ALTER TABLE public.coach_packages
  DROP COLUMN IF EXISTS duration_months;
