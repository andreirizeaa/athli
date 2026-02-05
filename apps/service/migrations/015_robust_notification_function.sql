-- ================================================
-- Robust Notification Merging Function
-- ================================================

-- This function provides a robust way to fetch merged notification settings
-- that works correctly even when called from a service-role context (like our API)
-- by explicitly passing the coach_id.

CREATE OR REPLACE FUNCTION public.get_coach_notification_settings(coach_uuid UUID)
RETURNS TABLE (
    event_id UUID,
    event_key TEXT,
    name TEXT,
    description TEXT,
    category TEXT,
    enabled BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
      ane.id AS event_id,
      ane.event_key,
      ane.name,
      ane.description,
      ane.category,
      COALESCE(cnp.enabled, ane.default_enabled) AS enabled
    FROM public.available_notification_events ane
    LEFT JOIN public.coach_notification_preferences cnp 
      ON ane.id = cnp.event_id 
      AND cnp.coach_id = coach_uuid
    ORDER BY ane.category, ane.event_key;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Optionally, update the view to use this function for code reuse
CREATE OR REPLACE VIEW public.v_my_notification_settings 
WITH (security_invoker = true)
AS
SELECT * FROM public.get_coach_notification_settings(auth.uid());
