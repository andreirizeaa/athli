-- ============================================================
-- Migration 208: Fix Entitlements Trigger on Delete
-- ============================================================
-- The sync_coach_entitlements trigger was causing FK violations
-- when deleting coaches because it tried to upsert entitlements
-- for a coach that was being deleted.
-- ============================================================

BEGIN;

-- Fix the trigger function to not sync on DELETE operations
CREATE OR REPLACE FUNCTION public.trigger_sync_entitlements()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        -- On delete, just delete the entitlements row instead of syncing
        -- The cascade will handle this, but be explicit
        DELETE FROM public.coach_entitlements WHERE coach_id = OLD.coach_id;
        RETURN OLD;
    ELSE
        PERFORM public.sync_coach_entitlements(NEW.coach_id);
        RETURN NEW;
    END IF;
END;
$$;

-- Also fix sync_coach_entitlements to check if coach exists before upserting
CREATE OR REPLACE FUNCTION public.sync_coach_entitlements(p_coach_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_plan TEXT;
    v_client_limit INTEGER;
    v_status TEXT;
    v_is_trial BOOLEAN;
    v_trial_ends_at TIMESTAMPTZ;
    v_has_automations BOOLEAN;
    v_has_ai_assistant BOOLEAN;
    v_has_payments BOOLEAN;
    v_coach_exists BOOLEAN;
BEGIN
    -- Check if coach still exists in auth.users
    SELECT EXISTS(SELECT 1 FROM auth.users WHERE id = p_coach_id) INTO v_coach_exists;

    IF NOT v_coach_exists THEN
        -- Coach is being deleted, just clean up entitlements
        DELETE FROM public.coach_entitlements WHERE coach_id = p_coach_id;
        RETURN;
    END IF;

    -- Get subscription details
    SELECT
        COALESCE(plan_type::TEXT, 'starter'),
        COALESCE(client_limit, 5),
        COALESCE(status::TEXT, 'active'),
        (status = 'trialing'),
        trial_ends_at
    INTO v_plan, v_client_limit, v_status, v_is_trial, v_trial_ends_at
    FROM public.platform_subscriptions
    WHERE coach_id = p_coach_id;

    -- If no subscription, use defaults
    IF v_plan IS NULL THEN
        v_plan := 'starter';
        v_client_limit := 5;
        v_status := 'active';
        v_is_trial := false;
    END IF;

    -- Get addon status
    SELECT
        COALESCE(bool_or(addon_type::TEXT = 'automations' AND is_active), false),
        COALESCE(bool_or(addon_type::TEXT = 'ai_assistant' AND is_active), false),
        COALESCE(bool_or(addon_type::TEXT = 'payments' AND is_active), false)
    INTO v_has_automations, v_has_ai_assistant, v_has_payments
    FROM public.platform_addons
    WHERE coach_id = p_coach_id;

    -- Upsert entitlements
    INSERT INTO public.coach_entitlements (
        coach_id,
        plan_type,
        client_limit,
        -- Plan features (Pro and Max get these)
        has_ai_workout_builder,
        has_custom_exercises,
        has_questionnaires,
        has_habits_metrics,
        storage_limit_gb,
        -- Max-only features
        has_broadcast_messaging,
        has_ai_todo_list,
        has_priority_support,
        -- Add-ons
        has_automations,
        has_ai_assistant,
        has_payments,
        -- Status
        subscription_status,
        is_trial,
        trial_ends_at
    ) VALUES (
        p_coach_id,
        v_plan::public.platform_plan_type,
        v_client_limit,
        -- Pro and Max features
        v_plan IN ('pro', 'max'),
        v_plan IN ('pro', 'max'),
        v_plan IN ('pro', 'max'),
        v_plan IN ('pro', 'max'),
        CASE
            WHEN v_plan = 'starter' THEN 0
            WHEN v_plan = 'pro' THEN 5
            WHEN v_plan = 'max' THEN -1  -- -1 = unlimited
        END,
        -- Max-only features
        v_plan = 'max',
        v_plan = 'max',
        v_plan = 'max',
        -- Add-ons
        COALESCE(v_has_automations, false),
        COALESCE(v_has_ai_assistant, false),
        COALESCE(v_has_payments, false),
        -- Status
        v_status::public.platform_subscription_status,
        v_is_trial,
        v_trial_ends_at
    )
    ON CONFLICT (coach_id) DO UPDATE SET
        plan_type = EXCLUDED.plan_type,
        client_limit = EXCLUDED.client_limit,
        has_ai_workout_builder = EXCLUDED.has_ai_workout_builder,
        has_custom_exercises = EXCLUDED.has_custom_exercises,
        has_questionnaires = EXCLUDED.has_questionnaires,
        has_habits_metrics = EXCLUDED.has_habits_metrics,
        storage_limit_gb = EXCLUDED.storage_limit_gb,
        has_broadcast_messaging = EXCLUDED.has_broadcast_messaging,
        has_ai_todo_list = EXCLUDED.has_ai_todo_list,
        has_priority_support = EXCLUDED.has_priority_support,
        has_automations = EXCLUDED.has_automations,
        has_ai_assistant = EXCLUDED.has_ai_assistant,
        has_payments = EXCLUDED.has_payments,
        subscription_status = EXCLUDED.subscription_status,
        is_trial = EXCLUDED.is_trial,
        trial_ends_at = EXCLUDED.trial_ends_at,
        updated_at = now();
END;
$$;

COMMIT;
