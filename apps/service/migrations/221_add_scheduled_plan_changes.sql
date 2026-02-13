-- Add scheduled plan change columns to platform_subscriptions table
-- These allow scheduling plan downgrades for end of billing period
-- (upgrades are applied immediately, downgrades wait until renewal)

ALTER TABLE public.platform_subscriptions
ADD COLUMN IF NOT EXISTS scheduled_plan_type platform_plan_type DEFAULT NULL;

ALTER TABLE public.platform_subscriptions
ADD COLUMN IF NOT EXISTS scheduled_client_limit INTEGER DEFAULT NULL;

COMMENT ON COLUMN public.platform_subscriptions.scheduled_plan_type IS 'When set, the plan will change to this type at the next billing period (used for downgrades).';
COMMENT ON COLUMN public.platform_subscriptions.scheduled_client_limit IS 'When set, the client limit will change to this value at the next billing period (used for downgrades).';
