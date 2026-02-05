-- Remove status field from client_injuries
ALTER TABLE public.client_injuries DROP COLUMN IF EXISTS status;
