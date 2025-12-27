-- ================================================
-- 022: Database Security Hardening (Linter Fixes)
-- ================================================

-- 1. Restoring RLS for client_profiles
-- (Previous migration 020 dropped the coach_id column, which cascaded away old policies)
ALTER TABLE public.client_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_profiles FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cp_coach_all" ON public.client_profiles;
CREATE POLICY "cp_coach_all" ON public.client_profiles
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.coach_client_assignments cca WHERE cca.client_id = client_profiles.client_id AND cca.coach_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.coach_client_assignments cca WHERE cca.client_id = client_profiles.client_id AND cca.coach_id = auth.uid()));

DROP POLICY IF EXISTS "cp_client_read" ON public.client_profiles;
CREATE POLICY "cp_client_read" ON public.client_profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = client_id);

DROP POLICY IF EXISTS "cp_client_update" ON public.client_profiles;
CREATE POLICY "cp_client_update" ON public.client_profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = client_id)
  WITH CHECK (auth.uid() = client_id);

-- 2. Harden coach_clients_view (SECURITY INVOKER)
-- Using security_invoker ensure RLS of underlying tables is respected
CREATE OR REPLACE VIEW public.coach_clients_view 
WITH (security_invoker = true)
AS
SELECT 
    cca.coach_id,
    cca.client_id,
    cca.status,
    cca.category,
    cca.is_active,
    cca.is_archived,
    cca.connected_at,
    cca.created_at,
    up.name as full_name,
    up.email,
    up.profile_picture_url as avatar_url,
    cp.phone,
    cp.gender,
    cp.date_of_birth
FROM public.coach_client_assignments cca
JOIN public.user_profiles up ON up.id = cca.client_id AND up.user_type = 'client'
LEFT JOIN public.client_profiles cp ON cp.client_id = cca.client_id;

-- 3. Fix Function Search Paths (Security hardening against search_path hijacking)
-- 3.1 get_coach_notification_settings
ALTER FUNCTION public.get_coach_notification_settings(UUID) SET search_path = public;

-- 3.2 resolve_coach_item_name_conflict
ALTER FUNCTION public.resolve_coach_item_name_conflict() SET search_path = public;

-- 4. Re-grant permissions (just in case)
GRANT SELECT ON public.coach_clients_view TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_profiles TO authenticated;
