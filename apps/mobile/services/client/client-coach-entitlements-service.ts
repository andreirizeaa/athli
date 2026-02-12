import axiosInstance from '@/lib/axios';
import type { CoachEntitlements } from '@athli/shared-types/entitlements-schema';

/**
 * Fetches the coach's entitlements for a client
 * This allows the client app to know what features are available based on their coach's plan
 */
export async function fetchCoachEntitlementsForClient(coachId: string): Promise<CoachEntitlements> {
  const response = await axiosInstance.get<CoachEntitlements>(`/billing/coach-entitlements/${coachId}`);
  return response.data;
}
