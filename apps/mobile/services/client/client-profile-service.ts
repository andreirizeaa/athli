import { apiFetch } from '@/lib/api-client';
import type { ClientProfile } from '@/types/profile';

/**
 * API response types
 */
interface ClientApiProfile {
  id?: string;
  client_id?: string;
  coach_id?: string;
  email?: string;
  name?: string;
  profile_picture_url?: string;
  avatar_url?: string;
  signin_method?: 'email' | 'google' | 'apple';
  date_of_birth?: string | null;
  gender?: string | null;
  height_cm?: number | null;
  phone?: string | null;
  country?: string | null;
  unit_system?: 'metric' | 'imperial' | null;
  created_at?: string;
  updated_at?: string;
  category?: string;
}

/**
 * Fetch client profile by client ID using the API endpoint
 * This ensures we get the merged profile with correct avatar URL
 */
export async function fetchClientProfile(
  clientId: string,
  coachId?: string
): Promise<ClientProfile> {
  try {
    const headers: Record<string, string> = { 'x-client-id': clientId };
    if (coachId) {
      headers['x-coach-id'] = coachId;
    }

    const response = await apiFetch<{
      success: boolean;
      data: { profile: ClientApiProfile };
    }>('/client', {
      headers,
    });

    const apiProfile = response.data.profile;

    if (!apiProfile) {
      throw new Error('Client profile not found');
    }

    // Prefer avatar_url (from user_profiles/OAuth) over profile_picture_url (from client_profiles/Supabase storage)
    // If user signed in via Google/Apple, avatar_url will be their social profile picture
    const profilePictureUrl = apiProfile.profile_picture_url || apiProfile.avatar_url || null;

    console.log('[fetchClientProfile] API profile:', {
      client_id: apiProfile.client_id || apiProfile.id,
      name: apiProfile.name,
      profile_picture_url: profilePictureUrl,
      signin_method: apiProfile.signin_method,
    });

    // Map API response to ClientProfile type
    const clientProfile: ClientProfile = {
      client_id: apiProfile.client_id || apiProfile.id || clientId,
      coach_id: apiProfile.coach_id || '',
      email: apiProfile.email || '',
      name: apiProfile.name || '',
      profile_picture_url: profilePictureUrl,
      signin_method: apiProfile.signin_method || 'email',
      date_of_birth: apiProfile.date_of_birth || null,
      gender: apiProfile.gender || null,
      height_cm: apiProfile.height_cm || null,
      phone: apiProfile.phone || null,
      country: apiProfile.country || null,
      unit_system: apiProfile.unit_system || null,
      created_at: apiProfile.created_at || new Date().toISOString(),
      updated_at: apiProfile.updated_at || new Date().toISOString(),
    };

    return clientProfile;
  } catch (error) {
    console.error('Error fetching client profile:', error);
    throw error;
  }
}

/**
 * Update client profile using the API endpoint
 */
export async function updateClientProfile(
  clientId: string,
  coachId: string,
  updates: Partial<
    Omit<ClientProfile, 'client_id' | 'coach_id' | 'created_at' | 'updated_at'>
  >
): Promise<ClientProfile> {
  try {
    // Map ClientProfile fields to API expected format
    const apiUpdates: Record<string, unknown> = {};
    
    if (updates.name !== undefined) apiUpdates.name = updates.name;
    if (updates.profile_picture_url !== undefined) apiUpdates.profile_picture_url = updates.profile_picture_url;
    if (updates.phone !== undefined) apiUpdates.phone = updates.phone;
    if (updates.gender !== undefined) apiUpdates.gender = updates.gender;
    if (updates.country !== undefined) apiUpdates.country = updates.country;
    if (updates.date_of_birth !== undefined) apiUpdates.birth_date = updates.date_of_birth;
    if (updates.height_cm !== undefined) apiUpdates.height_cm = updates.height_cm;
    if (updates.unit_system !== undefined) apiUpdates.unit_system = updates.unit_system;

    const response = await apiFetch<{
      success: boolean;
      data: { profile: ClientApiProfile };
    }>('/client', {
      method: 'PATCH',
      headers: { 'x-client-id': clientId, 'x-coach-id': coachId },
      body: JSON.stringify(apiUpdates),
    });

    const apiProfile = response.data.profile;

    if (!apiProfile) {
      throw new Error('Failed to update client profile');
    }

    // Prefer avatar_url (from user_profiles/OAuth) over profile_picture_url
    const profilePictureUrl = apiProfile.profile_picture_url || apiProfile.avatar_url || null;

    // Map API response to ClientProfile type
    const clientProfile: ClientProfile = {
      client_id: apiProfile.client_id || apiProfile.id || clientId,
      coach_id: apiProfile.coach_id || '',
      email: apiProfile.email || '',
      name: apiProfile.name || '',
      profile_picture_url: profilePictureUrl,
      signin_method: apiProfile.signin_method || 'email',
      date_of_birth: apiProfile.date_of_birth || null,
      gender: apiProfile.gender || null,
      height_cm: apiProfile.height_cm || null,
      phone: apiProfile.phone || null,
      country: apiProfile.country || null,
      unit_system: apiProfile.unit_system || null,
      created_at: apiProfile.created_at || new Date().toISOString(),
      updated_at: apiProfile.updated_at || new Date().toISOString(),
    };

    return clientProfile;
  } catch (error) {
    console.error('Error updating client profile:', error);
    throw error;
  }
}
