-- Migration: Fix RLS policy on user_profiles to allow viewing conversation participants
-- Issue: Mobile app can't fetch user profiles for conversations due to RLS restrictions
-- Solution: Allow users to view profiles of people they have conversations with

-- First, check if there's an existing restrictive policy and drop it if needed
-- (This is safe because we're immediately creating a more permissive one)
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;

-- Create comprehensive RLS policy that allows:
-- 1. Users to view their own profile
-- 2. Users to view profiles of people they have conversations with (as coach or client)
CREATE POLICY "Users can view own profile and conversation participants"
ON user_profiles
FOR SELECT
USING (
  -- Allow users to see their own profile
  id = auth.uid()
  OR
  -- Allow users to see profiles of people they have conversations with
  -- This includes both coaches viewing their clients and clients viewing their coaches
  id IN (
    SELECT DISTINCT
      CASE
        WHEN coach_id = auth.uid() THEN client_id
        WHEN client_id = auth.uid() THEN coach_id
      END
    FROM conversations
    WHERE (coach_id = auth.uid() OR client_id = auth.uid())
      AND CASE
        WHEN coach_id = auth.uid() THEN client_id
        WHEN client_id = auth.uid() THEN coach_id
      END IS NOT NULL
  )
);

-- Add comment explaining the policy
COMMENT ON POLICY "Users can view own profile and conversation participants" ON user_profiles IS
'Allows users to view their own profile and profiles of any users they have active conversations with. This is required for the messaging/chat feature to display names and avatars correctly.';

