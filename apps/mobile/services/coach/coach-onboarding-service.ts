import { apiFetch } from '@/lib/api-client';

export type Onboarding = {
  id: string;
  name?: string;
  description?: string;
  is_active?: boolean;
  created_at: string;
  updated_at: string;
};

/**
 * Get all onboardings for the coach
 */
export const getOnboardings = async (): Promise<Onboarding[]> => {
  const response = await apiFetch<{ data: { onboardings: Onboarding[] } }>('/coach/onboardings');
  return response.data.onboardings;
};
