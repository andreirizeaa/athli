import { apiFetch } from '@/lib/api-client';

/**
 * Client updates service for coach notes
 * Mirrors apps/web/api/client/client-updates-service.ts
 */

export interface ClientUpdate {
  id: string;
  client_id: string;
  coach_id: string;
  update: string;
  update_timestamp: string;
  created_at: string;
  updated_at: string;
}

/**
 * Get all updates/notes for a client
 */
export const getClientUpdates = async (
  clientId: string,
  coachId: string
): Promise<ClientUpdate[]> => {
  const response = await apiFetch<{ success: boolean; data: { updates: ClientUpdate[] } }>(
    '/client/updates',
    {
      headers: {
        'x-client-id': clientId,
        'x-coach-id': coachId,
      },
    }
  );
  return response.data.updates || [];
};

/**
 * Create a new update/note for a client
 */
export const createClientUpdate = async (
  clientId: string,
  coachId: string,
  update: string,
  updateTimestamp?: string
): Promise<ClientUpdate> => {
  const response = await apiFetch<{ success: boolean; data: { update: ClientUpdate } }>(
    '/client/updates',
    {
      method: 'POST',
      headers: {
        'x-client-id': clientId,
        'x-coach-id': coachId,
      },
      body: JSON.stringify({
        update,
        update_timestamp: updateTimestamp || new Date().toISOString(),
      }),
    }
  );
  return response.data.update;
};

/**
 * Update an existing update/note
 */
export const updateClientUpdate = async (
  clientId: string,
  coachId: string,
  updateId: string,
  update: string,
  updateTimestamp?: string
): Promise<ClientUpdate> => {
  const response = await apiFetch<{ success: boolean; data: { update: ClientUpdate } }>(
    `/client/updates/${updateId}`,
    {
      method: 'PATCH',
      headers: {
        'x-client-id': clientId,
        'x-coach-id': coachId,
      },
      body: JSON.stringify({
        update,
        update_timestamp: updateTimestamp,
      }),
    }
  );
  return response.data.update;
};

/**
 * Delete an update/note
 */
export const deleteClientUpdate = async (
  clientId: string,
  coachId: string,
  updateId: string
): Promise<void> => {
  await apiFetch(`/client/updates/${updateId}`, {
    method: 'DELETE',
    headers: {
      'x-client-id': clientId,
      'x-coach-id': coachId,
    },
  });
};

/**
 * Bulk delete updates/notes
 */
export const bulkDeleteClientUpdates = async (
  clientId: string,
  coachId: string,
  updateIds: string[]
): Promise<void> => {
  await apiFetch('/client/updates', {
    method: 'DELETE',
    headers: {
      'x-client-id': clientId,
      'x-coach-id': coachId,
    },
    body: JSON.stringify({ updateIds }),
  });
};
