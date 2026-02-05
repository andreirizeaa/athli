import { apiFetch } from '@/lib/api-client';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import type {
  AddFilesToClientData,
  AddFilesToClientsData,
  DeleteClientFilesData,
  UpdateClientFileData,
  UploadClientFileDataMobile,
  ClientFile,
  FileReference,
} from '@athli/shared-types';

/**
 * Client file service for file management
 * Mirrors apps/athli-web-app/api/client/client-file-service.ts
 */

// Re-export types from shared-types for backwards compatibility
export type {
  AddFilesToClientData,
  AddFilesToClientsData,
  DeleteClientFilesData,
  UpdateClientFileData,
  ClientFile,
};

// Mobile-specific upload type - uses URI instead of File
export type UploadClientFileData = UploadClientFileDataMobile;

/**
 * Get the display name for a client file
 */
export const getClientFileName = (file: ClientFile): string => {
  return file.display_name || file.filename || file.name || 'Untitled';
};

/**
 * Check if a file is an image or video (for thumbnail display)
 */
export const isMediaFile = (mimeType: string | null | undefined): boolean => {
  if (!mimeType) return false;
  return mimeType.startsWith('image/') || mimeType.startsWith('video/');
};

// FileWithUrl is just FileReference from shared-types
export type FileWithUrl = FileReference;

/**
 * Add files to a client (from library)
 */
export const addFilesToClient = async (data: AddFilesToClientData): Promise<void> => {
  console.log('[addFilesToClient] Request:', {
    fileIds: data.fileIds,
    clientId: data.clientId,
    coachId: data.coachId,
  });
  const response = await apiFetch('/client/files', {
    method: 'POST',
    headers: { 'x-client-id': data.clientId, 'x-coach-id': data.coachId },
    body: JSON.stringify({ fileIds: data.fileIds }),
  });
  console.log('[addFilesToClient] Response:', response);
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
 * Update file metadata (filename)
 */
export const updateClientFile = async (data: UpdateClientFileData): Promise<ClientFile> => {
  const response = await apiFetch<{ success: boolean; data: { file: ClientFile } }>(
    `/client/files/${data.fileId}`,
    {
      method: 'PATCH',
      headers: { 'x-client-id': data.clientId, 'x-coach-id': data.coachId },
      body: JSON.stringify({ filename: data.filename }),
    }
  );
  return response.data.file;
};

/**
 * Upload a file directly for a client
 */
export const uploadClientFile = async (data: UploadClientFileData): Promise<ClientFile> => {
  console.log('[uploadClientFile] Request:', {
    fileName: data.fileName,
    mimeType: data.mimeType,
    clientId: data.clientId,
    coachId: data.coachId,
  });

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

  console.log('[uploadClientFile] Response:', response);
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
 * Get files for the authenticated athlete (self-access)
 */
export const getMyFiles = async (clientId: string, coachId: string): Promise<ClientFile[]> => {
  const response = await apiFetch<{ success: boolean; data: { assignments: any[]; files?: any[] } }>(
    '/client/files',
    {
      headers: { 'x-client-id': clientId, 'x-coach-id': coachId },
    }
  );
  const assignments = response.data.assignments || response.data.files || [];
  return assignments.map((f: any) => ({
    ...f,
    name: f.display_name || f.fileName || f.filename || f.name,
    filename: f.fileName || f.filename,
    display_name: f.display_name || f.fileName || f.filename,
  }));
};

/**
 * Get all files assigned to a client
 */
export const getClientFiles = async (clientId: string, coachId: string): Promise<ClientFile[]> => {
  console.log('[getClientFiles] Request:', { clientId, coachId });
  const response = await apiFetch<{ success: boolean; data: { assignments: any[]; files?: any[] } }>(
    '/client/files',
    {
      headers: { 'x-client-id': clientId, 'x-coach-id': coachId },
    }
  );
  console.log('[getClientFiles] Response:', response);
  // API returns 'assignments' not 'files', and uses camelCase 'fileName'
  const assignments = response.data.assignments || response.data.files || [];
  return assignments.map((f: any) => ({
    ...f,
    // Normalize field names - API uses camelCase fileName
    name: f.display_name || f.fileName || f.filename || f.name,
    filename: f.fileName || f.filename,
    display_name: f.display_name || f.fileName || f.filename,
  }));
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
