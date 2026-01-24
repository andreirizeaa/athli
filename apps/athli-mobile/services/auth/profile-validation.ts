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
 * 
 * Note: name, email, profile_picture_url, signin_method are ONLY stored in user_profiles (single source of truth)
 * We use the _full views to get merged data
 */
export async function validateUserProfile(
  userId: string
): Promise<ProfileValidationResult> {
  try {
    console.log('[validateUserProfile] Checking profiles for userId:', userId);

    // Check coach_profiles_full first (view that merges with user_profiles)
    const { data: coachProfile, error: coachError } = await supabase
      .from('coach_profiles_full')
      .select('*')
      .eq('id', userId)
      .single();

    console.log('[validateUserProfile] Coach profile query result:', { 
      hasData: !!coachProfile, 
      error: coachError?.message || null 
    });

    if (!coachError && coachProfile) {
      return {
        profileType: 'coach',
        profile: {
          id: coachProfile.id,
          email: coachProfile.email || '',
          name: coachProfile.name || '',
          profile_picture_url: coachProfile.profile_picture_url || null,
          signin_method: coachProfile.signin_method || 'email',
          is_active: coachProfile.is_active,
          is_archived: coachProfile.is_archived,
          status: coachProfile.status,
          unique_code: coachProfile.unique_code,
          created_at: coachProfile.created_at,
          updated_at: coachProfile.updated_at,
        } as CoachProfile,
      };
    }

    // Check client_profiles_full (view that merges with user_profiles)
    const { data: clientProfile, error: clientError } = await supabase
      .from('client_profiles_full')
      .select('*')
      .eq('client_id', userId)
      .single();

    console.log('[validateUserProfile] Client profile query result:', { 
      hasData: !!clientProfile, 
      error: clientError?.message || null,
      errorCode: clientError?.code || null
    });

    if (!clientError && clientProfile) {
      // Get coach_id from coach_client_assignments
      const { data: assignment } = await supabase
        .from('coach_client_assignments')
        .select('coach_id')
        .eq('client_id', userId)
        .limit(1)
        .single();

      const mergedProfile: ClientProfile = {
        client_id: clientProfile.client_id,
        coach_id: assignment?.coach_id || '',
        email: clientProfile.email || '',
        name: clientProfile.name || '',
        profile_picture_url: clientProfile.profile_picture_url || null,
        signin_method: clientProfile.signin_method || 'email',
        date_of_birth: clientProfile.date_of_birth || null,
        gender: clientProfile.gender || null,
        height_cm: clientProfile.height_cm || null,
        phone: clientProfile.phone || null,
        country: clientProfile.country || null,
        unit_system: clientProfile.unit_system || null,
        created_at: clientProfile.created_at,
        updated_at: clientProfile.updated_at,
      };

      return {
        profileType: 'client',
        profile: mergedProfile,
      };
    }

    // No profile found - log details
    console.log('[validateUserProfile] No profile found for userId:', userId);
    return {
      profileType: null,
      profile: null,
    };
  } catch (error) {
    console.error('[validateUserProfile] Error:', error);
    throw error;
  }
}
