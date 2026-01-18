import { apiFetch } from '@/lib/api-client';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

/**
 * Client file service for file management
 * Mirrors apps/athli-web-app/api/client/client-file-service.ts
 */

export interface AddFilesToClientData {
  fileIds: string[];
  clientId: string;
  coachId: string;
}

export interface AddFilesToClientsData {
  fileIds: string[];
  clientIds: string[];
  coachId: string;
}

export interface DeleteClientFilesData {
  fileIds: string[];
  clientId: string;
  coachId: string;
}

export interface UploadClientFileData {
  fileUri: string;
  fileName?: string;
  mimeType?: string;
  tags?: string[];
  clientId: string;
  coachId: string;
}

export interface ClientFile {
  id: string;
  name: string;
  mime_type: string;
  size: number;
  url?: string;
  created_at: string;
  tags?: string[];
}

export interface FileWithUrl {
  id: string;
  url: string;
}

/**
 * Add files to a client (from library)
 */
export const addFilesToClient = async (data: AddFilesToClientData): Promise<void> => {
  await apiFetch('/client/files', {
    method: 'POST',
    headers: { 'x-client-id': data.clientId, 'x-coach-id': data.coachId },
    body: JSON.stringify({ fileIds: data.fileIds }),
  });
};

/**
 * Add files to multiple clients
 */
export const addFilesToClients = async (data: AddFilesToClientsData): Promise<void> => {
  await apiFetch('/client/files', {
    method: 'POST',
    headers: { 'x-coach-id': data.coachId },
    body: JSON.stringify({ fileIds: data.fileIds, clientIds: data.clientIds }),
  });
};

/**
 * Delete files from a client
 */
export const deleteClientFiles = async (data: DeleteClientFilesData): Promise<void> => {
  await apiFetch('/client/files', {
    method: 'DELETE',
    headers: { 'x-client-id': data.clientId, 'x-coach-id': data.coachId },
    body: JSON.stringify({ fileIds: data.fileIds }),
  });
};

/**
 * Upload a file directly for a client
 */
export const uploadClientFile = async (data: UploadClientFileData): Promise<ClientFile> => {
  const formData = new FormData();

  const file = {
    uri: data.fileUri,
    type: data.mimeType || 'application/octet-stream',
    name: data.fileName || 'file',
  };

  formData.append('file', file as any);

  if (data.fileName) {
    formData.append('filename', data.fileName);
  }
  if (data.tags) {
    formData.append('tags', JSON.stringify(data.tags));
  }

  const response = await apiFetch<{ success: boolean; data: { file: ClientFile } }>(
    '/client/files/upload',
    {
      method: 'POST',
      headers: { 'x-client-id': data.clientId, 'x-coach-id': data.coachId },
      body: formData as any,
    }
  );

  return response.data.file;
};

/**
 * Get a signed URL for a client file
 */
export const getClientFileUrl = async (
  fileId: string,
  clientId: string,
  coachId: string
): Promise<FileWithUrl> => {
  const response = await apiFetch<{ success: boolean; data: { url: string } }>(
    `/client/files/${fileId}/url`,
    {
      method: 'GET',
      headers: { 'x-client-id': clientId, 'x-coach-id': coachId },
    }
  );

  return {
    id: fileId,
    url: response.data.url,
  };
};

/**
 * Download a client file (mobile version using expo-file-system)
 */
export const downloadClientFile = async (
  fileId: string,
  filename: string,
  clientId: string,
  coachId: string
): Promise<string> => {
  const { url } = await getClientFileUrl(fileId, clientId, coachId);

  // Download to cache directory
  const localUri = `${FileSystem.cacheDirectory}${filename}`;

  const downloadResult = await FileSystem.downloadAsync(url, localUri);

  if (downloadResult.status !== 200) {
    throw new Error('Failed to download file');
  }

  return downloadResult.uri;
};

/**
 * Download and share a client file
 */
export const shareClientFile = async (
  fileId: string,
  filename: string,
  clientId: string,
  coachId: string
): Promise<void> => {
  const localUri = await downloadClientFile(fileId, filename, clientId, coachId);

  const isAvailable = await Sharing.isAvailableAsync();
  if (isAvailable) {
    await Sharing.shareAsync(localUri);
  } else {
    throw new Error('Sharing is not available on this device');
  }
};

/**
 * Get all files assigned to a client
 */
export const getClientFiles = async (clientId: string, coachId: string): Promise<ClientFile[]> => {
  const response = await apiFetch<{ success: boolean; data: { files: ClientFile[] } }>(
    '/client/files',
    {
      headers: { 'x-client-id': clientId, 'x-coach-id': coachId },
    }
  );
  return response.data.files || [];
};

/**
 * Check if a file type is previewable (images, videos, PDFs)
 */
export const isPreviewable = (mimeType: string | null): boolean => {
  if (!mimeType) return false;
  return (
    mimeType.startsWith('image/') ||
    mimeType.startsWith('video/') ||
    mimeType === 'application/pdf'
  );
};
