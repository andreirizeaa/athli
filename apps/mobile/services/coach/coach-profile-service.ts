import { supabase } from '@/lib/supabase';
import type { CoachProfile } from '@/types/profile';

/**
 * Fetch coach profile by coach ID
 * Uses the coach_profiles_full view which merges with user_profiles
 */
export async function fetchCoachProfile(
  coachId: string
): Promise<CoachProfile> {
  try {
    // Use the full view to get merged data from user_profiles
    const { data, error } = await supabase
      .from('coach_profiles_full')
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
 * Note: name, email, profile_picture_url, signin_method are stored in user_profiles only
 */
export async function updateCoachProfile(
  coachId: string,
  updates: Partial<Omit<CoachProfile, 'id' | 'created_at' | 'updated_at'>>
): Promise<CoachProfile> {
  try {
    // Separate user_profiles fields from coach_profiles fields
    const userProfileUpdates: Record<string, unknown> = {};
    const coachProfileUpdates: Record<string, unknown> = {};

    // user_profiles fields
    if (updates.name !== undefined) userProfileUpdates.name = updates.name;
    if (updates.email !== undefined) userProfileUpdates.email = updates.email;
    if (updates.profile_picture_url !== undefined) userProfileUpdates.profile_picture_url = updates.profile_picture_url;
    if (updates.signin_method !== undefined) userProfileUpdates.signin_method = updates.signin_method;
    if (updates.timezone !== undefined) userProfileUpdates.timezone = updates.timezone;

    // coach_profiles fields (only coach-specific data)
    if (updates.is_active !== undefined) coachProfileUpdates.is_active = updates.is_active;
    if (updates.is_archived !== undefined) coachProfileUpdates.is_archived = updates.is_archived;
    if (updates.status !== undefined) coachProfileUpdates.status = updates.status;
    if (updates.unique_code !== undefined) coachProfileUpdates.unique_code = updates.unique_code;

    // Update user_profiles if there are user profile fields
    if (Object.keys(userProfileUpdates).length > 0) {
      const { error: userError } = await supabase
        .from('user_profiles')
        .update(userProfileUpdates)
        .eq('id', coachId);

      if (userError) throw userError;
    }

    // Update coach_profiles if there are coach-specific fields
    if (Object.keys(coachProfileUpdates).length > 0) {
      const { error: coachError } = await supabase
        .from('coach_profiles')
        .update(coachProfileUpdates)
        .eq('id', coachId);

      if (coachError) throw coachError;
    }

    // Fetch the updated profile from the full view
    const { data, error } = await supabase
      .from('coach_profiles_full')
      .select('*')
      .eq('id', coachId)
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
