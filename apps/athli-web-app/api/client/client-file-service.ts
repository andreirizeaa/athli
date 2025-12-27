import { apiFetch } from '../api-client';

export interface AddFilesToClientData {
  fileIds: string[];
  clientId: string;
}

export interface DeleteClientFilesData {
  fileIds: string[];
  clientId: string;
}

/**
 * Service method to add files to a client
 * This will be connected to the backend in the future
 */
export const addFilesToClient = async (data: AddFilesToClientData): Promise<void> => {
  await apiFetch(`/client/files`, {
    method: 'POST',
    headers: { 'x-client-id': data.clientId },
    body: JSON.stringify({ fileIds: data.fileIds }),
  });
};

/**
 * Service method to delete files from a client
 * This will be connected to the backend in the future
 */
export const deleteClientFiles = async (data: DeleteClientFilesData): Promise<void> => {
  await apiFetch(`/client/files`, {
    method: 'DELETE',
    headers: { 'x-client-id': data.clientId },
    body: JSON.stringify({ fileIds: data.fileIds }),
  });
};
