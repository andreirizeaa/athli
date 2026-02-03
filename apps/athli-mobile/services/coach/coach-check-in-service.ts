import { apiFetch } from '@/lib/api-client';
import type { CheckInReview, CheckIn } from '@athli/shared-types';

export type { CheckInReview, CheckIn };

/**
 * Service method to get all check-ins awaiting review
 */
export const getCheckInReviews = async (): Promise<CheckInReview[]> => {
  const response = await apiFetch<{ data: { reviews: CheckInReview[] } }>('/coach/forms/check-ins/reviews');
  return response.data.reviews;
};

/**
 * Service method to get all check-ins from coach's library
 */
export const getCheckIns = async (): Promise<CheckIn[]> => {
  const response = await apiFetch<{ data: { checkIns: CheckIn[] } }>('/coach/forms/check-ins');
  return response.data.checkIns;
};

/**
 * Service method to delete a check-in from coach's library
 */
export const deleteCheckIn = async (id: string): Promise<void> => {
  await apiFetch(`/coach/forms/check-ins/${id}`, {
    method: 'DELETE',
  });
};

/**
 * Duplicate a check-in in coach's library
 */
export const duplicateCheckIn = async (checkInId: string, originalCheckIn: CheckIn): Promise<CheckIn> => {
  const { id, created_at, updated_at, ...dataToCopy } = originalCheckIn;

  const response = await apiFetch<{ data: { checkIn: CheckIn } }>('/coach/forms/check-ins', {
    method: 'POST',
    body: {
      ...dataToCopy,
      name: `${originalCheckIn.name} (Copy)`,
    } as any,
  });

  return response.data.checkIn;
};
