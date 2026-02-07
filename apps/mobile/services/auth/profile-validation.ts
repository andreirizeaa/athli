import { supabase } from '@/lib/supabase';
import { apiFetch } from '@/lib/api-client';
import type { CoachProfile, ClientProfile, ProfileType, CoachAssignment } from '@/types/profile';

export interface ProfileValidationResult {
  profileType: ProfileType;
  profile: CoachProfile | ClientProfile | null;
  coachAssignments?: CoachAssignment[];
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
      // Get ALL coach assignments with coach profile info
      const { data: assignments } = await supabase
        .from('coach_client_assignments')
        .select(`
          coach_id,
          status,
          coach:user_profiles!coach_client_assignments_coach_id_fkey (
            name,
            profile_picture_url
          )
        `)
        .eq('client_id', userId)
        .in('status', ['connected', 'accepted', 'invited']);

      console.log('[validateUserProfile] Coach assignments:', {
        count: assignments?.length || 0,
        assignments: assignments?.map(a => ({ coach_id: a.coach_id, status: a.status }))
      });

      // Mark client as connected if any assignment is not already connected (fire-and-forget)
      const hasNonConnectedAssignment = assignments?.some(a => a.status !== 'connected');
      if (hasNonConnectedAssignment) {
        apiFetch('/user/mark-connected', { method: 'POST' })
          .catch(err => console.error('[validateUserProfile] Failed to mark connected:', err));
      }

      // Build coach assignments array for selection
      const coachAssignments: CoachAssignment[] = (assignments || []).map(a => ({
        coach_id: a.coach_id,
        name: (a.coach as any)?.name || 'Unknown Coach',
        profile_picture_url: (a.coach as any)?.profile_picture_url || null,
      }));

      // Use first assignment's coach_id as default (will be overwritten if user selects different coach)
      const defaultCoachId = assignments?.[0]?.coach_id || '';

      const mergedProfile: ClientProfile = {
        client_id: clientProfile.client_id,
        coach_id: defaultCoachId,
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
        coachAssignments,
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
