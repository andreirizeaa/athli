-- Migration: Fix invitation_token default value
-- Problem: invitation_token is VARCHAR(8) but has DEFAULT gen_random_uuid() which generates 36 chars
-- Solution: Remove the incorrect default value

-- Step 1: Remove the problematic default value
ALTER TABLE public.coach_client_assignments
ALTER COLUMN invitation_token DROP DEFAULT;

-- Step 2: Add comment to clarify usage
COMMENT ON COLUMN public.coach_client_assignments.invitation_token IS
'8-character invitation code for client invites. Set explicitly by application code when creating invitations. NULL for non-invited relationships.';
