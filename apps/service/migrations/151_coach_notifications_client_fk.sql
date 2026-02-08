-- Add FK constraint on coach_notifications.client_id → auth.users(id)
ALTER TABLE public.coach_notifications
  ADD CONSTRAINT coach_notifications_client_id_fkey
  FOREIGN KEY (client_id) REFERENCES auth.users(id) ON DELETE CASCADE;
