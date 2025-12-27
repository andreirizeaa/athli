-- ================================================
-- 020: Restructure Client-Coach Relationships
-- ================================================

-- 1. Create coach_client_assignments table
CREATE TABLE IF NOT EXISTS public.coach_client_assignments (
  coach_id UUID NOT NULL,
  client_id UUID NOT NULL,

  category TEXT NOT NULL CHECK (category IN ('online', 'in-person', 'hybrid')) DEFAULT 'online',
  status   TEXT NOT NULL CHECK (status   IN ('invited', 'connected', 'archived')) DEFAULT 'invited',
  
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  is_archived BOOLEAN NOT NULL DEFAULT FALSE,
  
  invitation_sent_at TIMESTAMPTZ,
  connected_at       TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Relationships
  PRIMARY KEY (coach_id, client_id),
  CONSTRAINT fk_cca_coach FOREIGN KEY (coach_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT fk_cca_client FOREIGN KEY (client_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT fk_cca_client_profile FOREIGN KEY (client_id) REFERENCES public.client_profiles(client_id) ON DELETE CASCADE,
  CONSTRAINT check_no_self_assignment CHECK (coach_id <> client_id)
);

-- 2. Migrate existing data from client_profiles to coach_client_assignments
INSERT INTO public.coach_client_assignments (
  coach_id, client_id, category, status, is_active, is_archived, invitation_sent_at, connected_at, created_at, updated_at
)
SELECT 
  coach_id, client_id, category, status, is_active, is_archived, invitation_sent_at, connected_at, created_at, updated_at
FROM public.client_profiles
ON CONFLICT (coach_id, client_id) DO NOTHING;

-- 3. Cleanup client_profiles table
ALTER TABLE public.client_profiles 
  DROP COLUMN IF EXISTS coach_id CASCADE,
  DROP COLUMN IF EXISTS category CASCADE,
  DROP COLUMN IF EXISTS status CASCADE,
  DROP COLUMN IF EXISTS is_active CASCADE,
  DROP COLUMN IF EXISTS is_archived CASCADE,
  DROP COLUMN IF EXISTS invitation_sent_at CASCADE,
  DROP COLUMN IF EXISTS connected_at CASCADE;

-- 4. Enable RLS on coach_client_assignments
ALTER TABLE public.coach_client_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coach_client_assignments FORCE ROW LEVEL SECURITY;

-- 5. Policies for coach_client_assignments
DROP POLICY IF EXISTS "coach_manage_assignments" ON public.coach_client_assignments;
CREATE POLICY "coach_manage_assignments" ON public.coach_client_assignments
  FOR ALL TO authenticated
  USING (auth.uid() = coach_id)
  WITH CHECK (auth.uid() = coach_id);

DROP POLICY IF EXISTS "client_read_assignments" ON public.coach_client_assignments;
CREATE POLICY "client_read_assignments" ON public.coach_client_assignments
  FOR SELECT TO authenticated
  USING (auth.uid() = client_id);

-- 6. Trigger for updated_at
CREATE TRIGGER trg_cca_updated_at BEFORE UPDATE ON public.coach_client_assignments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 7. Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.coach_client_assignments TO authenticated;

-- 8. Create a view for the Athletes Grid
DROP VIEW IF EXISTS public.coach_clients_view;
CREATE VIEW public.coach_clients_view AS
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

GRANT SELECT ON public.coach_clients_view TO authenticated;
