import axiosInstance from '@/lib/axios';

export type ClientTerminology = 'athlete' | 'client' | 'member';

export interface CoachPreferences {
  theme: 'light' | 'dark' | 'system';
  language: string;
  color_preset: string;
  client_terminology: ClientTerminology;
}

/**
 * Fetch coach preferences
 */
export async function fetchCoachPreferences(): Promise<CoachPreferences | null> {
  try {
    const response = await axiosInstance.get('/settings/coach/preferences');
    const result = response.data;
    return result?.data?.preferences || result?.data || result;
  } catch (error: any) {
    if (error.response?.status === 404) {
      return null;
    }
    console.error('Error fetching coach preferences:', error);
    throw error;
  }
}

/**
 * Update coach preferences
 */
export async function updateCoachPreferences(
  updates: Partial<CoachPreferences>
): Promise<CoachPreferences> {
  try {
    const response = await axiosInstance.patch('/settings/coach/preferences', updates);
    const result = response.data;
    return result?.data?.preferences || result?.data || result;
  } catch (error) {
    console.error('Error updating coach preferences:', error);
    throw error;
  }
}

/**
 * Terminology display options
 */
export const TERMINOLOGY_OPTIONS = [
  { label: 'Athlete', value: 'athlete' as ClientTerminology },
  { label: 'Client', value: 'client' as ClientTerminology },
  { label: 'Member', value: 'member' as ClientTerminology },
] as const;
