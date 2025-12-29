import { apiFetch } from '../api-client';

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
 * Service method to get all updates for a client
 */
export const getClientUpdates = async (clientId: string): Promise<ClientUpdate[]> => {
    const response = await apiFetch('/client/updates', {
        headers: { 'x-client-id': clientId },
    });
    return response.data.updates || [];
};

/**
 * Service method to create a new update for a client
 */
export const createClientUpdate = async (
    clientId: string,
    update: string,
    updateTimestamp?: string
): Promise<ClientUpdate> => {
    const response = await apiFetch('/client/updates', {
        method: 'POST',
        headers: { 'x-client-id': clientId },
        body: JSON.stringify({
            update,
            update_timestamp: updateTimestamp || new Date().toISOString(),
        }),
    });
    return response.data.update;
};

/**
 * Service method to update an existing update
 */
export const updateClientUpdate = async (
    clientId: string,
    updateId: string,
    update: string,
    updateTimestamp?: string
): Promise<ClientUpdate> => {
    const response = await apiFetch(`/client/updates/${updateId}`, {
        method: 'PATCH',
        headers: { 'x-client-id': clientId },
        body: JSON.stringify({
            update,
            update_timestamp: updateTimestamp,
        }),
    });
    return response.data.update;
};

/**
 * Service method to delete an update
 */
export const deleteClientUpdate = async (clientId: string, updateId: string): Promise<void> => {
    await apiFetch(`/client/updates/${updateId}`, {
        method: 'DELETE',
        headers: { 'x-client-id': clientId },
    });
};

/**
 * Service method to bulk delete updates
 */
export const bulkDeleteClientUpdates = async (
    clientId: string,
    updateIds: string[]
): Promise<void> => {
    await apiFetch('/client/updates', {
        method: 'DELETE',
        headers: { 'x-client-id': clientId },
        body: JSON.stringify({ updateIds }),
    });
};
