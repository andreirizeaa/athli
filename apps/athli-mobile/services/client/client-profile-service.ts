import { supabase } from '@/lib/supabase';
import type { ClientProfile } from '@/types/profile';

/**
 * Fetch client profile by client ID
 */
export async function fetchClientProfile(
  clientId: string
): Promise<ClientProfile> {
  try {
    const { data, error } = await supabase
      .from('client_profiles')
      .select('*')
      .eq('client_id', clientId)
      .single();

    if (error) {
      throw error;
    }

    if (!data) {
      throw new Error('Client profile not found');
    }

    return data as ClientProfile;
  } catch (error) {
    console.error('Error fetching client profile:', error);
    throw error;
  }
}

/**
 * Update client profile
 */
export async function updateClientProfile(
  clientId: string,
  updates: Partial<
    Omit<ClientProfile, 'client_id' | 'coach_id' | 'created_at' | 'updated_at'>
  >
): Promise<ClientProfile> {
  try {
    const { data, error } = await supabase
      .from('client_profiles')
      .update(updates)
      .eq('client_id', clientId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    if (!data) {
      throw new Error('Failed to update client profile');
    }

    return data as ClientProfile;
  } catch (error) {
    console.error('Error updating client profile:', error);
    throw error;
  }
}
