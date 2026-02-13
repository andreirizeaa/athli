-- Migration 212: Add coach_id and client_id columns to webhook event tables

-- Add coach_id to billing webhook events
ALTER TABLE public.stripe_billing_webhook_events
ADD COLUMN IF NOT EXISTS coach_id UUID REFERENCES public.coach_profiles(id);

-- Add coach_id and client_id to payment webhook events
-- Note: client_profiles uses client_id as primary key, not id
ALTER TABLE public.stripe_payment_webhook_events
ADD COLUMN IF NOT EXISTS coach_id UUID REFERENCES public.coach_profiles(id),
ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES public.client_profiles(client_id);

-- Add indexes for querying by coach/client
CREATE INDEX IF NOT EXISTS idx_stripe_billing_webhook_events_coach_id
    ON public.stripe_billing_webhook_events(coach_id);

CREATE INDEX IF NOT EXISTS idx_stripe_payment_webhook_events_coach_id
    ON public.stripe_payment_webhook_events(coach_id);

CREATE INDEX IF NOT EXISTS idx_stripe_payment_webhook_events_client_id
    ON public.stripe_payment_webhook_events(client_id);
