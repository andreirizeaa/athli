-- Migration: Create client_updates table
-- This table stores updates/notes about clients, similar to other client tables

CREATE TABLE IF NOT EXISTS public.client_updates (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL,
  coach_id UUID NOT NULL,

  update TEXT NOT NULL,
  update_timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT fk_cu_client FOREIGN KEY (client_id) REFERENCES public.client_profiles(client_id) ON DELETE CASCADE,
  CONSTRAINT fk_cu_coach FOREIGN KEY (coach_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Primary index: Get all updates for a client ordered by timestamp (main use case)
CREATE INDEX idx_cu_client_timestamp ON public.client_updates(client_id, update_timestamp DESC);

-- Secondary index: For RLS performance (coach access)
CREATE INDEX idx_cu_coach ON public.client_updates(coach_id);

-- Add updated_at trigger
CREATE TRIGGER trg_cu_updated_at 
  BEFORE UPDATE ON public.client_updates 
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RLS Policies
ALTER TABLE public.client_updates ENABLE ROW LEVEL SECURITY;

-- Coach can view their clients' updates
CREATE POLICY client_updates_coach_select ON public.client_updates
  FOR SELECT
  USING (coach_id = auth.uid());

-- Coach can insert updates for their clients
CREATE POLICY client_updates_coach_insert ON public.client_updates
  FOR INSERT
  WITH CHECK (coach_id = auth.uid());

-- Coach can update their clients' updates
CREATE POLICY client_updates_coach_update ON public.client_updates
  FOR UPDATE
  USING (coach_id = auth.uid())
  WITH CHECK (coach_id = auth.uid());

-- Coach can delete their clients' updates
CREATE POLICY client_updates_coach_delete ON public.client_updates
  FOR DELETE
  USING (coach_id = auth.uid());

-- Client can view their own updates
CREATE POLICY client_updates_client_select ON public.client_updates
  FOR SELECT
  USING (
    client_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.client_profiles cp
      WHERE cp.client_id = client_updates.client_id
        AND cp.client_id = auth.uid()
    )
  );
