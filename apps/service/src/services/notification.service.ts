import { getSupabaseClient } from './supabase.service';

/**
 * Creates a coach notification. Fire-and-forget: logs errors but never throws.
 * Uses service-role client to bypass RLS (no INSERT policy on coach_notifications).
 */
export async function createCoachNotification(params: {
  coachId: string;
  clientId: string;
  notificationType: string;
  title: string;
  description?: string;
  metadata?: Record<string, any>;
}): Promise<void> {
  try {
    const supabase = getSupabaseClient();
    const { error } = await supabase.from('coach_notifications').insert({
      coach_id: params.coachId,
      client_id: params.clientId,
      notification_type: params.notificationType,
      title: params.title,
      description: params.description || null,
      metadata: params.metadata || {},
    });

    if (error) {
      console.error('[NotificationService] INSERT FAILED:', error.code, error.message);
    }
  } catch (err) {
    console.error('[NotificationService] Unexpected error:', err);
  }
}

/**
 * Resolves the coach ID for a given client from coach_client_assignments.
 * Returns null if no assignment found.
 */
export async function resolveCoachId(clientId: string): Promise<string | null> {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('coach_client_assignments')
      .select('coach_id')
      .eq('client_id', clientId)
      .single();

    if (error || !data) return null;
    return data.coach_id;
  } catch {
    return null;
  }
}

/**
 * Resolves the client's display name from user_profiles.
 * Returns null if not found.
 */
export async function resolveClientName(clientId: string): Promise<string | null> {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('user_profiles')
      .select('name')
      .eq('id', clientId)
      .eq('user_type', 'client')
      .single();

    if (error || !data) return null;
    return data.name;
  } catch {
    return null;
  }
}
