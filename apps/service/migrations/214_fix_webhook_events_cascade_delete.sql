-- Migration 214: Fix foreign key constraints on webhook event tables to cascade on delete
-- This allows coach profiles to be deleted even when there are webhook events referencing them

-- Fix stripe_billing_webhook_events
ALTER TABLE public.stripe_billing_webhook_events
DROP CONSTRAINT IF EXISTS stripe_billing_webhook_events_coach_id_fkey;

ALTER TABLE public.stripe_billing_webhook_events
ADD CONSTRAINT stripe_billing_webhook_events_coach_id_fkey
FOREIGN KEY (coach_id) REFERENCES public.coach_profiles(id) ON DELETE CASCADE;

-- Fix stripe_payment_webhook_events coach_id
ALTER TABLE public.stripe_payment_webhook_events
DROP CONSTRAINT IF EXISTS stripe_payment_webhook_events_coach_id_fkey;

ALTER TABLE public.stripe_payment_webhook_events
ADD CONSTRAINT stripe_payment_webhook_events_coach_id_fkey
FOREIGN KEY (coach_id) REFERENCES public.coach_profiles(id) ON DELETE CASCADE;

-- Fix stripe_payment_webhook_events client_id
ALTER TABLE public.stripe_payment_webhook_events
DROP CONSTRAINT IF EXISTS stripe_payment_webhook_events_client_id_fkey;

ALTER TABLE public.stripe_payment_webhook_events
ADD CONSTRAINT stripe_payment_webhook_events_client_id_fkey
FOREIGN KEY (client_id) REFERENCES public.client_profiles(client_id) ON DELETE CASCADE;

COMMENT ON TABLE public.stripe_billing_webhook_events IS 'Stores processed Stripe webhook events for platform subscription billing. Cascades on coach deletion.';
COMMENT ON TABLE public.stripe_payment_webhook_events IS 'Stores processed Stripe webhook events for coach payment processing (client payments). Cascades on coach/client deletion.';
