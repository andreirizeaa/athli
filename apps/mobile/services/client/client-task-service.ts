import { apiFetch } from '@/lib/api-client';
import type { ClientTask } from '@athli/shared-types';

export type { ClientTask };

/**
 * Get tasks for the authenticated athlete (self-access)
 */
export const getMyTasks = async (clientId: string, coachId: string): Promise<ClientTask[]> => {
  const response = await apiFetch<{ success: boolean; data: { tasks: ClientTask[] } }>(
    '/client/tasks',
    {
      headers: { 'x-client-id': clientId, 'x-coach-id': coachId },
    }
  );

  return response.data.tasks || [];
};
