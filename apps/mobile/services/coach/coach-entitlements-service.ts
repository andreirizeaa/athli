import axiosInstance from '@/lib/axios';
import type { CoachEntitlements } from '@/types/entitlements';

/**
 * Fetches coach entitlements from the billing API
 */
export async function fetchCoachEntitlements(): Promise<CoachEntitlements> {
  const response = await axiosInstance.get<CoachEntitlements>('/billing/entitlements');
  return response.data;
}
