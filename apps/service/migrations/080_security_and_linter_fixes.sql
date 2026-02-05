-- Migration: Security and Linter Fixes
-- Fixes: security_definer_view, extension_in_public, rls_disabled_in_public, multiple_permissive_policies

-- 1. Fix 'security_definer_view' for coach_clients_view
-- Ensure the view uses the permissions of the invoker (querying user) rather than the definer (owner)
-- This is critical for RLS to work correctly through the view
ALTER VIEW public.coach_clients_view SET (security_invoker = true);

-- 2. Fix 'extension_in_public' for wrappers
-- Move wrappers extension to a dedicated schema to keep public clean
CREATE SCHEMA IF NOT EXISTS extensions;

-- Move the extension (this usually moves its member objects too)
ALTER EXTENSION wrappers SET SCHEMA extensions;

-- Grant usage on the new schema to appropriate roles if needed (usually postgres/service_role have access, 
-- but authenticated might need it if they use wrappers directly, though unlikely for this extension type)
GRANT USAGE ON SCHEMA extensions TO authenticated;
GRANT USAGE ON SCHEMA extensions TO service_role;

-- 3. Fix 'rls_disabled_in_public' for wrappers_fdw_stats
-- The linter complains about RLS disabled in 'public'. By moving the extension to 'extensions' schema (step 2),
-- we unknowingly fix this because the table is no longer in 'public'.
-- We cannot enable RLS on it because it belongs to the extension owner (usually superuser).
-- So we skip explicit RLS enablement.


-- 4. Fix 'multiple_permissive_policies' for client_updates
-- Consolidate multiple SELECT policies into one to avoid performance warning

-- Drop existing policies
DROP POLICY IF EXISTS client_updates_coach_select ON public.client_updates;
DROP POLICY IF EXISTS client_updates_client_select ON public.client_updates;

-- Create unified SELECT policy
CREATE POLICY client_updates_select_policy ON public.client_updates
    FOR SELECT
    USING (
        -- Coach access
        coach_id = auth.uid() 
        OR 
        -- Client access (direct ownership)
        client_id = auth.uid()
        OR 
        -- Client access (via profile lookup - legacy/redundant check preserved for safety)
        EXISTS (
            SELECT 1 FROM public.client_profiles cp
            WHERE cp.client_id = client_updates.client_id
            AND cp.client_id = auth.uid()
        )
    );
