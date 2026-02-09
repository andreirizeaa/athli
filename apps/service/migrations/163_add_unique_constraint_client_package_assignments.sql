-- ============================================================
-- 163: Add unique constraint on client_package_assignments
-- ============================================================
-- Prevents duplicate assignment of the same package to the same client.
-- Required for the upsert in the assign endpoint.
-- ============================================================

ALTER TABLE public.client_package_assignments
ADD CONSTRAINT uq_client_package_assignments_coach_client_package
UNIQUE (coach_id, client_id, package_id);
