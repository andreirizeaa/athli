import { supabase } from '@/lib/supabase';
import type { CoachProfile } from '@/types/profile';

/**
 * Fetch coach profile by coach ID
 */
export async function fetchCoachProfile(
  coachId: string
): Promise<CoachProfile> {
  try {
    const { data, error } = await supabase
      .from('coach_profiles')
      .select('*')
      .eq('id', coachId)
      .single();

    if (error) {
      throw error;
    }

    if (!data) {
      throw new Error('Coach profile not found');
    }

    return data as CoachProfile;
  } catch (error) {
    console.error('Error fetching coach profile:', error);
    throw error;
  }
}

/**
 * Update coach profile
 */
export async function updateCoachProfile(
  coachId: string,
  updates: Partial<Omit<CoachProfile, 'id' | 'created_at' | 'updated_at'>>
): Promise<CoachProfile> {
  try {
    const { data, error } = await supabase
      .from('coach_profiles')
      .update(updates)
      .eq('id', coachId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    if (!data) {
      throw new Error('Failed to update coach profile');
    }

    return data as CoachProfile;
  } catch (error) {
    console.error('Error updating coach profile:', error);
    throw error;
  }
}
