import { supabase } from '@/lib/supabase';
import type { CoachProfile, ClientProfile, ProfileType } from '@/types/profile';

export interface ProfileValidationResult {
  profileType: ProfileType;
  profile: CoachProfile | ClientProfile | null;
}

/**
 * Validates if a user has a profile in either coach_profiles or client_profiles
 * Priority: coach_profiles > client_profiles
 * Returns null if profile doesn't exist
 */
export async function validateUserProfile(
  userId: string
): Promise<ProfileValidationResult> {
  try {
    // Check coach_profiles first (higher priority)
    const { data: coachProfile, error: coachError } = await supabase
      .from('coach_profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (!coachError && coachProfile) {
      return {
        profileType: 'coach',
        profile: coachProfile as CoachProfile,
      };
    }

    // Check client_profiles
    const { data: clientProfile, error: clientError } = await supabase
      .from('client_profiles')
      .select('*')
      .eq('client_id', userId)
      .single();

    if (!clientError && clientProfile) {
      return {
        profileType: 'client',
        profile: clientProfile as ClientProfile,
      };
    }

    // No profile found
    return {
      profileType: null,
      profile: null,
    };
  } catch (error) {
    console.error('Error validating user profile:', error);
    throw error;
  }
}
