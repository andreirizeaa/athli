-- ================================================
-- Fix Supabase Security Linter Issues
-- ================================================
-- This migration addresses security and performance issues identified by Supabase linter.

-- ================================================
-- 1. FIX VIEWS: Use security_invoker and restrict access
-- ================================================

-- Fix coach_clients_all_view: Use security_invoker=true to respect caller's permissions
-- This view joins auth.users so we need to use security_invoker to prevent exposure
DROP VIEW IF EXISTS public.coach_clients_all_view;
CREATE VIEW public.coach_clients_all_view
WITH (security_invoker = true)
AS SELECT
  cca.coach_id,
  cca.client_id,
  cca.category,
  cca.status,
  cca.is_active,
  cca.is_archived,
  cca.invitation_sent_at,
  cca.connected_at,
  cca.created_at,
  cca.updated_at,
  cp.date_of_birth,
  cp.gender,
  cp.height_cm,
  cp.phone,
  cp.country,
  COALESCE(up.name, au.raw_user_meta_data->>'name', au.email) AS full_name,
  COALESCE(up.email, au.email) AS email,
  COALESCE(up.profile_picture_url, au.raw_user_meta_data->>'avatar_url') AS avatar_url,
  up.timezone,
  cts.last_activity,
  cts.last_7_days_training_completed,
  cts.last_7_days_training_total,
  cts.last_30_days_training_completed,
  cts.last_30_days_training_total
FROM public.coach_client_assignments cca
LEFT JOIN public.client_profiles cp ON cp.client_id = cca.client_id
LEFT JOIN public.user_profiles up ON up.id = cca.client_id AND up.user_type = 'client'
LEFT JOIN auth.users au ON au.id = cca.client_id
LEFT JOIN public.client_training_summary cts ON cts.client_id = cca.client_id;

COMMENT ON VIEW public.coach_clients_all_view IS
'Coach view of all their clients with merged profile data. Uses security_invoker to respect caller permissions.';

-- Revoke from anon, only allow authenticated
REVOKE ALL ON public.coach_clients_all_view FROM anon;
GRANT SELECT ON public.coach_clients_all_view TO authenticated;

-- Fix coach_subscription_summary: Use security_invoker=true
DROP VIEW IF EXISTS public.coach_subscription_summary;
CREATE VIEW public.coach_subscription_summary
WITH (security_invoker = true)
AS SELECT
    ps.coach_id,
    ps.plan_type,
    ps.client_limit,
    ps.status,
    ps.billing_interval,
    ps.current_price_cents,
    ps.currency,
    ps.current_period_start,
    ps.current_period_end,
    ps.trial_ends_at,
    ps.cancel_at_period_end,
    ps.cancelled_at,
    -- Add-ons
    COALESCE(
        (SELECT json_agg(json_build_object(
            'type', pa.addon_type,
            'price_cents', pa.price_cents,
            'is_active', pa.is_active
        )) FROM public.platform_addons pa
        WHERE pa.coach_id = ps.coach_id AND pa.is_active = true),
        '[]'::json
    ) AS active_addons,
    -- Total monthly cost (base + addons)
    ps.current_price_cents + COALESCE(
        (SELECT SUM(pa.price_cents) FROM public.platform_addons pa
        WHERE pa.coach_id = ps.coach_id AND pa.is_active = true),
        0
    ) AS total_monthly_cents,
    ps.created_at,
    ps.updated_at
FROM public.platform_subscriptions ps;

COMMENT ON VIEW public.coach_subscription_summary IS 'Coach subscription with active addons and total cost. Uses security_invoker to respect caller permissions.';

-- Revoke from anon, only allow authenticated
REVOKE ALL ON public.coach_subscription_summary FROM anon;
GRANT SELECT ON public.coach_subscription_summary TO authenticated;

-- ================================================
-- 2. FIX FUNCTIONS: Add search_path
-- ================================================

-- Fix generate_unique_code
CREATE OR REPLACE FUNCTION public.generate_unique_code()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  result TEXT := '';
  i INTEGER;
  attempts INTEGER := 0;
  max_attempts INTEGER := 100;
BEGIN
  LOOP
    result := '';
    FOR i IN 1..6 LOOP
      result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    END LOOP;

    -- Check if code already exists
    IF NOT EXISTS (SELECT 1 FROM public.user_profiles WHERE unique_code = result) THEN
      RETURN result;
    END IF;

    attempts := attempts + 1;
    IF attempts >= max_attempts THEN
      RAISE EXCEPTION 'Could not generate unique code after % attempts', max_attempts;
    END IF;
  END LOOP;
END;
$$;

-- Fix claim_assignment_notifications
CREATE OR REPLACE FUNCTION public.claim_assignment_notifications(
  p_client_id UUID,
  p_coach_id UUID
)
RETURNS TABLE (
  id UUID,
  item_type TEXT,
  item_name TEXT,
  schedule_config JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  DELETE FROM public.client_assignment_notification_queue q
  WHERE q.client_id = p_client_id
    AND q.coach_id = p_coach_id
  RETURNING q.id, q.item_type, q.item_name, q.schedule_config;
END;
$$;

-- Fix cleanup_assignment_notification_queue
CREATE OR REPLACE FUNCTION public.cleanup_assignment_notification_queue()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.client_assignment_notification_queue
  WHERE created_at < NOW() - INTERVAL '1 hour';
END;
$$;

-- Fix replicate_coach_push_token
CREATE OR REPLACE FUNCTION public.replicate_coach_push_token()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- When a coach push token is inserted/updated, also add it to client_push_tokens
  -- if the coach is also a client (has a client_profiles entry)
  IF EXISTS (SELECT 1 FROM public.client_profiles WHERE client_id = NEW.coach_id) THEN
    INSERT INTO public.client_push_tokens (client_id, expo_push_token, device_id)
    VALUES (NEW.coach_id, NEW.expo_push_token, NEW.device_id)
    ON CONFLICT (client_id, expo_push_token) DO UPDATE
    SET device_id = EXCLUDED.device_id,
        updated_at = NOW();
  END IF;
  RETURN NEW;
END;
$$;

-- Fix cleanup_habit_reminder_logs
CREATE OR REPLACE FUNCTION public.cleanup_habit_reminder_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.habit_reminder_log
  WHERE reminder_date < CURRENT_DATE - INTERVAL '30 days';
END;
$$;

-- ================================================
-- 3. FIX RLS POLICIES: Use (select auth.uid()) for performance
-- ================================================

-- Fix habit_reminder_log policy
DROP POLICY IF EXISTS client_view_own_habit_reminder_log ON public.habit_reminder_log;
CREATE POLICY client_view_own_habit_reminder_log ON public.habit_reminder_log
FOR SELECT TO authenticated
USING (client_id = (SELECT auth.uid()));

-- Fix billing_activity policy
DROP POLICY IF EXISTS billing_activity_coach_select ON public.billing_activity;
CREATE POLICY billing_activity_coach_select ON public.billing_activity
FOR SELECT TO authenticated
USING (coach_id = (SELECT auth.uid()));

-- Fix platform_subscriptions policy
DROP POLICY IF EXISTS platform_subscriptions_coach_select ON public.platform_subscriptions;
CREATE POLICY platform_subscriptions_coach_select ON public.platform_subscriptions
FOR SELECT TO authenticated
USING (coach_id = (SELECT auth.uid()));

-- Fix platform_addons policy
DROP POLICY IF EXISTS platform_addons_coach_select ON public.platform_addons;
CREATE POLICY platform_addons_coach_select ON public.platform_addons
FOR SELECT TO authenticated
USING (coach_id = (SELECT auth.uid()));

-- Fix platform_billing_activity policy
DROP POLICY IF EXISTS platform_billing_activity_coach_select ON public.platform_billing_activity;
CREATE POLICY platform_billing_activity_coach_select ON public.platform_billing_activity
FOR SELECT TO authenticated
USING (coach_id = (SELECT auth.uid()));

-- Fix coach_entitlements policy
DROP POLICY IF EXISTS coach_entitlements_coach_select ON public.coach_entitlements;
CREATE POLICY coach_entitlements_coach_select ON public.coach_entitlements
FOR SELECT TO authenticated
USING (coach_id = (SELECT auth.uid()));

-- ================================================
-- 4. FIX ai_assistant_daily_usage: Consolidate policies
-- ================================================

-- Drop the problematic service policy (always true)
DROP POLICY IF EXISTS ai_assistant_daily_usage_service_policy ON public.ai_assistant_daily_usage;

-- Fix the select policy to use (select auth.uid())
DROP POLICY IF EXISTS ai_assistant_daily_usage_select_policy ON public.ai_assistant_daily_usage;
CREATE POLICY ai_assistant_daily_usage_select_policy ON public.ai_assistant_daily_usage
FOR SELECT TO authenticated
USING (coach_id = (SELECT auth.uid()));

-- Add a proper service_role policy for all operations
CREATE POLICY ai_assistant_daily_usage_service_role_policy ON public.ai_assistant_daily_usage
FOR ALL TO service_role
USING (true)
WITH CHECK (true);

-- ================================================
-- 5. ADD POLICIES: Tables with RLS but no policies
-- ================================================

-- client_assignment_notification_queue: Only service_role should access
CREATE POLICY client_assignment_notification_queue_service_role ON public.client_assignment_notification_queue
FOR ALL TO service_role
USING (true)
WITH CHECK (true);

-- stripe_billing_webhook_events: Only service_role should access
CREATE POLICY stripe_billing_webhook_events_service_role ON public.stripe_billing_webhook_events
FOR ALL TO service_role
USING (true)
WITH CHECK (true);

-- stripe_payment_webhook_events: Only service_role should access
CREATE POLICY stripe_payment_webhook_events_service_role ON public.stripe_payment_webhook_events
FOR ALL TO service_role
USING (true)
WITH CHECK (true);
