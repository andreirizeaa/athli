-- Migration: Fix Client Invite Flow and Add Status Types
-- Purpose:
--   1. Add 'accepted' and 'bounced' status types to coach_client_assignments
--   2. Update conversation trigger to handle 'accepted' status
--   3. Ensure clients are visible to coaches immediately after signup
--
-- Status Flow:
--   Manual Invite: invited → [bounced] → accepted → [connected] → [archived]
--   General Code: [signup] → accepted → [connected] → [archived]

-- Step 1: Drop existing constraint on status
ALTER TABLE public.coach_client_assignments
DROP CONSTRAINT IF EXISTS coach_client_assignments_status_check;

-- Step 2: Add new constraint with expanded status types
ALTER TABLE public.coach_client_assignments
ADD CONSTRAINT coach_client_assignments_status_check
CHECK (status IN ('invited', 'accepted', 'bounced', 'connected', 'archived'));

-- Step 3: Add optional column for bounce tracking (for future email service integration)
ALTER TABLE public.coach_client_assignments
ADD COLUMN IF NOT EXISTS email_bounced_at TIMESTAMPTZ;

-- Step 4: Add index on invitation_token for performance
CREATE INDEX IF NOT EXISTS idx_coach_client_assignments_invitation_token
ON public.coach_client_assignments(invitation_token)
WHERE invitation_token IS NOT NULL;

-- Step 5: Update the conversation creation trigger to handle 'accepted' status
-- This ensures conversations are created as soon as client signs up (accepted),
-- not waiting for a future 'connected' state
CREATE OR REPLACE FUNCTION public.create_conversation_on_client_assignment()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Create conversation when status becomes 'accepted' OR 'connected'
  -- Skip for 'invited', 'bounced', and 'archived' statuses
  IF (NEW.status = 'accepted' OR NEW.status = 'connected')
     AND (OLD IS NULL OR (OLD.status <> 'accepted' AND OLD.status <> 'connected')) THEN

    -- Create conversation (trigger will create participant records automatically)
    INSERT INTO public.conversations (coach_id, client_id)
    VALUES (NEW.coach_id, NEW.client_id)
    ON CONFLICT (coach_id, client_id) DO NOTHING;

  END IF;

  RETURN NEW;
END;
$$;

-- Step 6: Add comment to status column for clarity
COMMENT ON COLUMN public.coach_client_assignments.status IS
'Client relationship status:
- invited: Coach sent invite, stub created, awaiting signup
- bounced: Email delivery failed (future use)
- accepted: Client signed up, conversation created, visible to coach
- connected: Active engagement (future use)
- archived: Relationship soft-deleted';

-- Step 7: Add comment to email_bounced_at column
COMMENT ON COLUMN public.coach_client_assignments.email_bounced_at IS
'Timestamp when email delivery failed (for future email service integration)';

-- Step 8: Update athletes_grid_view to include 'accepted' status in connected check
-- This ensures clients with 'accepted' status show as connected in the athletes grid
DROP VIEW IF EXISTS public.athletes_grid_view CASCADE;

CREATE OR REPLACE VIEW public.athletes_grid_view
WITH (security_invoker = true)
AS
SELECT
  cp.client_id AS id,
  up.name,
  up.profile_picture_url AS avatar,
  up.email,

  -- Training Summary Data
  cts.last_activity,
  COALESCE(cts.last_7_days_training_completed, 0)  AS "last7DaysTraining",
  COALESCE(cts.last_30_days_training_completed, 0) AS "last30DaysTraining",

  -- Profile Data
  cp.phone,
  cp.country,
  cp.gender,
  cp.height_cm,

  -- Moved to Assignments (cca)
  cca.category,
  cca.is_active,
  cca.is_archived,
  (cca.status = 'accepted' OR cca.status = 'connected') AS connected,
  cca.status AS "connectionStatus",

  -- Computed/Derived from Assignments
  CASE WHEN cca.connected_at IS NOT NULL THEN (CURRENT_DATE - cca.connected_at::DATE) ELSE 0 END AS "clientFor",
  CASE WHEN cp.date_of_birth IS NOT NULL THEN EXTRACT(YEAR FROM AGE(cp.date_of_birth))::INTEGER ELSE NULL END AS age,

  -- Coach ID derived from Assignments
  cca.coach_id,

  cp.created_at,
  cp.updated_at
FROM public.client_profiles cp
LEFT JOIN public.user_profiles up ON cp.client_id = up.id
LEFT JOIN public.client_training_summary cts ON cp.client_id = cts.client_id
LEFT JOIN public.coach_client_assignments cca ON cp.client_id = cca.client_id;
