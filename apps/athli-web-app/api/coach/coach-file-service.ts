import { apiFetch } from '../api-client';

// Import shared types and re-export for backwards compatibility
export type {
  AddFileData,
  UpdateFileData,
  DeleteFileData,
  CoachFile,
  FileWithUrl,
  ClientFileAssignment,
} from '@athli/shared-types';

import type {
  AddFileData,
  UpdateFileData,
  DeleteFileData,
  CoachFile,
  FileWithUrl,
  ClientFileAssignment,
} from '@athli/shared-types';

/**
 * Service method to upload a file to coach's library.
 * If clientId is provided, also assigns the file to the client using a secondary API call.
 */
export const uploadFile = async (data: AddFileData & { file: File }): Promise<CoachFile> => {
  // 1. Upload to Coach Library
  const formData = new FormData();
  formData.append('file', data.file);
  formData.append('filename', data.fileName);
  if (data.tags && data.tags.length > 0) {
    formData.append('tags', JSON.stringify(data.tags));
  }

  const response = await apiFetch<{ data: { file: CoachFile } }>('/coach/files', {
    method: 'POST',
    body: formData as any,
  });

  const file = response.data.file;

  // 2. Assign to Client if requested
  if (data.clientId && data.coachId) {
    await apiFetch(`/client/files`, {
      method: 'POST',
      headers: { 'x-client-id': data.clientId, 'x-coach-id': data.coachId },
      body: JSON.stringify({ fileIds: [file.id] }),
    });
  }

  return file;
};

/**
 * Service method to update file metadata
 */
export const updateFile = async (data: UpdateFileData): Promise<CoachFile> => {
  const response = await apiFetch<{ data: { file: CoachFile } }>(`/coach/files/${data.fileId}`, {
    method: 'PATCH',
    body: JSON.stringify({ filename: data.fileName }) as any,
  });

  return response.data.file;
};

/**
 * Service method to delete a file from coach's library
 */
export const deleteFile = async (data: DeleteFileData): Promise<void> => {
  await apiFetch(`/coach/files/${data.fileId}`, {
    method: 'DELETE',
  });
};

/**
 * Service method to get all coach's files
 */
export const getAllFiles = async (): Promise<CoachFile[]> => {
  const response = await apiFetch<{ data: { files: CoachFile[] } }>('/coach/files');
  return response.data.files;
};

/**
 * Service method to get signed URL for file access
 */
export const getFileUrl = async (fileId: string): Promise<FileWithUrl> => {
  const response = await apiFetch<{ data: { url: string; file: CoachFile } }>(`/coach/files/${fileId}/url`);
  return {
    ...response.data.file,
    url: response.data.url,
  };
};

/**
 * Helper function to download a file
 */
export const downloadFile = async (fileId: string, filename: string): Promise<void> => {
  const { url } = await getFileUrl(fileId);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.target = '_blank';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Helper function to determine file type from mime type
 */
export const getFileTypeFromMime = (mimeType: string | null): 'pdf' | 'image' | 'video' | 'other' => {
  if (!mimeType) return 'other';

  if (mimeType === 'application/pdf') return 'pdf';
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';

  return 'other';
};

/**
 * Helper function to check if file is previewable
 */
export const isPreviewable = (mimeType: string | null): boolean => {
  if (!mimeType) return false;
  const type = getFileTypeFromMime(mimeType);
  return type === 'pdf' || type === 'image' || type === 'video';
};

export const getClientFiles = async (clientId: string, coachId: string): Promise<ClientFileAssignment[]> => {
  const response = await apiFetch<{ data: { assignments: any[] } }>(`/client/files`, {
    headers: { 'x-client-id': clientId, 'x-coach-id': coachId }
  });
  return response.data.assignments.map((f: any) => ({
    ...f,
    display_name: f.fileName || f.filename,
  }));
};
