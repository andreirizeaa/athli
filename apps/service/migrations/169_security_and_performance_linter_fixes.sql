-- ================================================
-- 169: Security and Performance Linter Fixes
-- ================================================
-- Fixes the following linter issues:
--   1. function_search_path_mutable: Add SET search_path to functions
--   2. rls_enabled_no_policy: Add policy to client_push_notification_log
--   3. auth_rls_initplan: Wrap auth.uid() with (select auth.uid())
--   4. multiple_permissive_policies: Consolidate SELECT policies
-- ================================================

-- ============================================================================
-- 1. FIX FUNCTION SEARCH_PATH_MUTABLE
-- ============================================================================

-- 1a. get_flow_trigger_type
CREATE OR REPLACE FUNCTION public.get_flow_trigger_type(p_flow_data JSONB)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
SET search_path = 'public'
AS $$
DECLARE
  v_node JSONB;
BEGIN
  FOR v_node IN SELECT jsonb_array_elements(p_flow_data->'nodes')
  LOOP
    IF v_node->>'type' = 'trigger' AND v_node->'data'->'option'->>'id' IS NOT NULL THEN
      RETURN v_node->'data'->'option'->>'id';
    END IF;
  END LOOP;
  RETURN NULL;
END;
$$;

-- 1b. cleanup_client_push_notification_log
CREATE OR REPLACE FUNCTION public.cleanup_client_push_notification_log()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  DELETE FROM public.client_push_notification_log
  WHERE notification_date < CURRENT_DATE - INTERVAL '7 days';
END;
$$;

-- 1c. trigger_client_push_notifications
CREATE OR REPLACE FUNCTION public.trigger_client_push_notifications()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_supabase_url TEXT;
  v_service_key TEXT;
BEGIN
  BEGIN
    v_supabase_url := current_setting('app.settings.supabase_url', true);
    v_service_key := current_setting('app.settings.service_role_key', true);
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Supabase settings not configured. Set app.settings.supabase_url and app.settings.service_role_key';
    RETURN;
  END;

  IF v_supabase_url IS NULL OR v_service_key IS NULL THEN
    RAISE NOTICE 'Supabase settings not configured';
    RETURN;
  END IF;

  PERFORM net.http_post(
    url := v_supabase_url || '/functions/v1/client-push-notification',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_service_key
    ),
    body := jsonb_build_object('triggered_by', 'cron')
  );
END;
$$;

-- 1d. update_flow_executions_updated_at
CREATE OR REPLACE FUNCTION public.update_flow_executions_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- 1e. create_participant_records
CREATE OR REPLACE FUNCTION public.create_participant_records()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO public.conversation_participants (
    conversation_id, user_id, other_user_id
  ) VALUES (
    NEW.id, NEW.coach_id, NEW.client_id
  )
  ON CONFLICT (conversation_id, user_id) DO NOTHING;

  INSERT INTO public.conversation_participants (
    conversation_id, user_id, other_user_id
  ) VALUES (
    NEW.id, NEW.client_id, NEW.coach_id
  )
  ON CONFLICT (conversation_id, user_id) DO NOTHING;

  INSERT INTO public.message_read_receipts (conversation_id, user_id)
  VALUES
    (NEW.id, NEW.coach_id),
    (NEW.id, NEW.client_id)
  ON CONFLICT (conversation_id, user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- ============================================================================
-- 2. FIX RLS_ENABLED_NO_POLICY: client_push_notification_log
-- ============================================================================

DROP POLICY IF EXISTS "cpnl_service" ON public.client_push_notification_log;
CREATE POLICY "cpnl_service" ON public.client_push_notification_log
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ============================================================================
-- 3. FIX AUTH_RLS_INITPLAN: Wrap auth.uid() with (select auth.uid())
-- ============================================================================

-- 3a. client_tasks
DROP POLICY IF EXISTS "ct_all" ON public.client_tasks;
CREATE POLICY "ct_all" ON public.client_tasks
    TO authenticated
    USING  ((client_id = (select auth.uid())) OR (coach_id = (select auth.uid())))
    WITH CHECK ((client_id = (select auth.uid())) OR (coach_id = (select auth.uid())));

-- 3b. coach_notifications (3 policies)
DROP POLICY IF EXISTS "Coaches can view own notifications" ON public.coach_notifications;
CREATE POLICY "Coaches can view own notifications"
  ON public.coach_notifications FOR SELECT
  TO authenticated
  USING (coach_id = (select auth.uid()));

DROP POLICY IF EXISTS "Coaches can update own notifications" ON public.coach_notifications;
CREATE POLICY "Coaches can update own notifications"
  ON public.coach_notifications FOR UPDATE
  TO authenticated
  USING (coach_id = (select auth.uid()))
  WITH CHECK (coach_id = (select auth.uid()));

DROP POLICY IF EXISTS "Coaches can delete own notifications" ON public.coach_notifications;
CREATE POLICY "Coaches can delete own notifications"
  ON public.coach_notifications FOR DELETE
  TO authenticated
  USING (coach_id = (select auth.uid()));

-- 3c. coach_notification_preferences (3 policies)
DROP POLICY IF EXISTS "Coaches can view own notification preferences" ON public.coach_notification_preferences;
CREATE POLICY "Coaches can view own notification preferences"
  ON public.coach_notification_preferences FOR SELECT
  TO authenticated
  USING (coach_id = (select auth.uid()));

DROP POLICY IF EXISTS "Coaches can update own notification preferences" ON public.coach_notification_preferences;
CREATE POLICY "Coaches can update own notification preferences"
  ON public.coach_notification_preferences FOR UPDATE
  TO authenticated
  USING (coach_id = (select auth.uid()))
  WITH CHECK (coach_id = (select auth.uid()));

DROP POLICY IF EXISTS "Coaches can insert own notification preferences" ON public.coach_notification_preferences;
CREATE POLICY "Coaches can insert own notification preferences"
  ON public.coach_notification_preferences FOR INSERT
  TO authenticated
  WITH CHECK (coach_id = (select auth.uid()));

-- 3d. coach_push_tokens (4 policies)
DROP POLICY IF EXISTS "Coaches can view own push tokens" ON public.coach_push_tokens;
CREATE POLICY "Coaches can view own push tokens"
  ON public.coach_push_tokens FOR SELECT
  TO authenticated
  USING (coach_id = (select auth.uid()));

DROP POLICY IF EXISTS "Coaches can insert own push tokens" ON public.coach_push_tokens;
CREATE POLICY "Coaches can insert own push tokens"
  ON public.coach_push_tokens FOR INSERT
  TO authenticated
  WITH CHECK (coach_id = (select auth.uid()));

DROP POLICY IF EXISTS "Coaches can update own push tokens" ON public.coach_push_tokens;
CREATE POLICY "Coaches can update own push tokens"
  ON public.coach_push_tokens FOR UPDATE
  TO authenticated
  USING (coach_id = (select auth.uid()))
  WITH CHECK (coach_id = (select auth.uid()));

DROP POLICY IF EXISTS "Coaches can delete own push tokens" ON public.coach_push_tokens;
CREATE POLICY "Coaches can delete own push tokens"
  ON public.coach_push_tokens FOR DELETE
  TO authenticated
  USING (coach_id = (select auth.uid()));

-- 3e. client_push_tokens (4 policies)
DROP POLICY IF EXISTS "Clients can view own push tokens" ON public.client_push_tokens;
CREATE POLICY "Clients can view own push tokens"
  ON public.client_push_tokens FOR SELECT
  TO authenticated
  USING (client_id = (select auth.uid()));

DROP POLICY IF EXISTS "Clients can insert own push tokens" ON public.client_push_tokens;
CREATE POLICY "Clients can insert own push tokens"
  ON public.client_push_tokens FOR INSERT
  TO authenticated
  WITH CHECK (client_id = (select auth.uid()));

DROP POLICY IF EXISTS "Clients can update own push tokens" ON public.client_push_tokens;
CREATE POLICY "Clients can update own push tokens"
  ON public.client_push_tokens FOR UPDATE
  TO authenticated
  USING (client_id = (select auth.uid()))
  WITH CHECK (client_id = (select auth.uid()));

DROP POLICY IF EXISTS "Clients can delete own push tokens" ON public.client_push_tokens;
CREATE POLICY "Clients can delete own push tokens"
  ON public.client_push_tokens FOR DELETE
  TO authenticated
  USING (client_id = (select auth.uid()));

-- 3f. conversation_presence (4 policies)
DROP POLICY IF EXISTS "Users can insert own presence" ON public.conversation_presence;
CREATE POLICY "Users can insert own presence"
  ON public.conversation_presence FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update own presence" ON public.conversation_presence;
CREATE POLICY "Users can update own presence"
  ON public.conversation_presence FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can delete own presence" ON public.conversation_presence;
CREATE POLICY "Users can delete own presence"
  ON public.conversation_presence FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Participants can view presence" ON public.conversation_presence;
CREATE POLICY "Participants can view presence"
  ON public.conversation_presence FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_id
        AND (c.coach_id = (select auth.uid()) OR c.client_id = (select auth.uid()))
    )
  );

-- 3g. flow_executions
DROP POLICY IF EXISTS "fe_auth_read" ON public.flow_executions;
CREATE POLICY "fe_auth_read" ON public.flow_executions
  FOR SELECT TO authenticated
  USING (coach_id = (select auth.uid()) OR client_id = (select auth.uid()));

-- 3h. flow_execution_log
DROP POLICY IF EXISTS "fel_auth_read" ON public.flow_execution_log;
CREATE POLICY "fel_auth_read" ON public.flow_execution_log
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.flow_executions fe
      WHERE fe.id = execution_id
        AND (fe.coach_id = (select auth.uid()) OR fe.client_id = (select auth.uid()))
    )
  );

-- 3i. coach_stripe_accounts (3 policies)
DROP POLICY IF EXISTS coach_stripe_accounts_coach_select ON public.coach_stripe_accounts;
CREATE POLICY coach_stripe_accounts_coach_select
    ON public.coach_stripe_accounts FOR SELECT
    TO authenticated
    USING (coach_id = (select auth.uid()));

DROP POLICY IF EXISTS coach_stripe_accounts_coach_insert ON public.coach_stripe_accounts;
CREATE POLICY coach_stripe_accounts_coach_insert
    ON public.coach_stripe_accounts FOR INSERT
    TO authenticated
    WITH CHECK (coach_id = (select auth.uid()));

DROP POLICY IF EXISTS coach_stripe_accounts_coach_update ON public.coach_stripe_accounts;
CREATE POLICY coach_stripe_accounts_coach_update
    ON public.coach_stripe_accounts FOR UPDATE
    TO authenticated
    USING (coach_id = (select auth.uid()));

-- 3j. discount_codes
DROP POLICY IF EXISTS "Coaches can manage own discount codes" ON public.discount_codes;
CREATE POLICY "Coaches can manage own discount codes"
    ON public.discount_codes
    FOR ALL
    USING (coach_id = (select auth.uid()))
    WITH CHECK (coach_id = (select auth.uid()));

-- ============================================================================
-- 4. FIX MULTIPLE_PERMISSIVE_POLICIES: Consolidate SELECT policies
-- ============================================================================

-- 4a. coach_packages: merge coach_all SELECT and client_select into one
DROP POLICY IF EXISTS coach_packages_coach_all ON public.coach_packages;
DROP POLICY IF EXISTS coach_packages_client_select ON public.coach_packages;

-- Consolidated SELECT policy for both coach and client
CREATE POLICY coach_packages_select ON public.coach_packages
    FOR SELECT TO authenticated
    USING (
        coach_id = (select auth.uid())
        OR (
            is_active = true
            AND EXISTS (
                SELECT 1 FROM public.coach_client_assignments cca
                WHERE cca.coach_id = coach_packages.coach_id
                  AND cca.client_id = (select auth.uid())
                  AND cca.status = 'accepted'
            )
        )
    );

-- Coach-only INSERT/UPDATE/DELETE
CREATE POLICY coach_packages_coach_insert ON public.coach_packages
    FOR INSERT TO authenticated
    WITH CHECK (coach_id = (select auth.uid()));

CREATE POLICY coach_packages_coach_update ON public.coach_packages
    FOR UPDATE TO authenticated
    USING (coach_id = (select auth.uid()))
    WITH CHECK (coach_id = (select auth.uid()));

CREATE POLICY coach_packages_coach_delete ON public.coach_packages
    FOR DELETE TO authenticated
    USING (coach_id = (select auth.uid()));

-- 4b. client_package_assignments: merge coach_all SELECT and client_select
DROP POLICY IF EXISTS client_package_assignments_coach_all ON public.client_package_assignments;
DROP POLICY IF EXISTS client_package_assignments_client_select ON public.client_package_assignments;

-- Consolidated SELECT
CREATE POLICY client_package_assignments_select ON public.client_package_assignments
    FOR SELECT TO authenticated
    USING (coach_id = (select auth.uid()) OR client_id = (select auth.uid()));

-- Coach-only INSERT/UPDATE/DELETE
CREATE POLICY client_package_assignments_coach_insert ON public.client_package_assignments
    FOR INSERT TO authenticated
    WITH CHECK (coach_id = (select auth.uid()));

CREATE POLICY client_package_assignments_coach_update ON public.client_package_assignments
    FOR UPDATE TO authenticated
    USING (coach_id = (select auth.uid()))
    WITH CHECK (coach_id = (select auth.uid()));

CREATE POLICY client_package_assignments_coach_delete ON public.client_package_assignments
    FOR DELETE TO authenticated
    USING (coach_id = (select auth.uid()));

-- 4c. payments: merge coach_select and client_select
DROP POLICY IF EXISTS payments_coach_select ON public.payments;
DROP POLICY IF EXISTS payments_client_select ON public.payments;

CREATE POLICY payments_select ON public.payments
    FOR SELECT TO authenticated
    USING (coach_id = (select auth.uid()) OR client_id = (select auth.uid()));

-- 4d. client_subscriptions: merge coach_select and client_select
DROP POLICY IF EXISTS client_subscriptions_coach_select ON public.client_subscriptions;
DROP POLICY IF EXISTS client_subscriptions_client_select ON public.client_subscriptions;

CREATE POLICY client_subscriptions_select ON public.client_subscriptions
    FOR SELECT TO authenticated
    USING (coach_id = (select auth.uid()) OR client_id = (select auth.uid()));
