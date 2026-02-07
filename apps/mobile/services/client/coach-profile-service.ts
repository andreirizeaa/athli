import { supabase } from '@/lib/supabase';

export interface CoachPublicProfile {
  coach_id: string;
  name: string;
  profile_picture_url: string | null;
  company: {
    company_name: string;
    website?: string;
    linkedin?: string;
    location?: string;
    specialities: string[];
    logo_url?: string;
  } | null;
}

/**
 * Fetch a coach's public profile by their ID.
 * Queries user_profiles and coach_company_information in parallel.
 */
export async function fetchCoachPublicProfile(coachId: string): Promise<CoachPublicProfile> {
  const [profileResult, companyResult] = await Promise.all([
    supabase
      .from('user_profiles')
      .select('name, profile_picture_url')
      .eq('id', coachId)
      .eq('user_type', 'coach')
      .single(),
    supabase
      .from('coach_company_information')
      .select('company_name, website, linkedin, location, specialities, logo_url')
      .eq('coach_id', coachId)
      .maybeSingle(),
  ]);

  if (profileResult.error) {
    throw new Error(`Failed to fetch coach profile: ${profileResult.error.message}`);
  }

  return {
    coach_id: coachId,
    name: profileResult.data.name ?? '',
    profile_picture_url: profileResult.data.profile_picture_url ?? null,
    company: companyResult.data
      ? {
          company_name: companyResult.data.company_name,
          website: companyResult.data.website ?? undefined,
          linkedin: companyResult.data.linkedin ?? undefined,
          location: companyResult.data.location ?? undefined,
          specialities: companyResult.data.specialities ?? [],
          logo_url: companyResult.data.logo_url ?? undefined,
        }
      : null,
  };
}
