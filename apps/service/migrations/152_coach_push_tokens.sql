-- ================================================
-- Coach Push Tokens
-- ================================================
-- Stores Expo push tokens for sending push notifications to coaches.
-- A coach can have multiple devices (tokens).

CREATE TABLE public.coach_push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  expo_push_token TEXT NOT NULL,
  device_id TEXT,  -- Optional device identifier for managing multiple devices
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(coach_id, expo_push_token)
);

-- Index for fast lookups by coach
CREATE INDEX idx_cpt_coach ON public.coach_push_tokens (coach_id);

-- Index for token lookups (used by edge function)
CREATE INDEX idx_cpt_token ON public.coach_push_tokens (expo_push_token);

-- RLS
ALTER TABLE public.coach_push_tokens ENABLE ROW LEVEL SECURITY;

-- Coaches can view their own push tokens
CREATE POLICY "Coaches can view own push tokens"
  ON public.coach_push_tokens FOR SELECT
  TO authenticated
  USING (coach_id = auth.uid());

-- Coaches can insert their own push tokens
CREATE POLICY "Coaches can insert own push tokens"
  ON public.coach_push_tokens FOR INSERT
  TO authenticated
  WITH CHECK (coach_id = auth.uid());

-- Coaches can update their own push tokens
CREATE POLICY "Coaches can update own push tokens"
  ON public.coach_push_tokens FOR UPDATE
  TO authenticated
  USING (coach_id = auth.uid())
  WITH CHECK (coach_id = auth.uid());

-- Coaches can delete their own push tokens
CREATE POLICY "Coaches can delete own push tokens"
  ON public.coach_push_tokens FOR DELETE
  TO authenticated
  USING (coach_id = auth.uid());
