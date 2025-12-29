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
 */
export const addFilesToClient = async (data: AddFilesToClientData & { coachId: string }): Promise<void> => {
  await apiFetch(`/client/files`, {
    method: 'POST',
    headers: { 'x-client-id': data.clientId, 'x-coach-id': data.coachId },
    body: JSON.stringify({ fileIds: data.fileIds }),
  });
};

export interface AddFilesToClientsData {
  fileIds: string[];
  clientIds: string[];
  coachId: string;
}

export const addFilesToClients = async (data: AddFilesToClientsData): Promise<void> => {
  await apiFetch(`/client/files`, {
    method: 'POST',
    headers: { 'x-coach-id': data.coachId },
    body: JSON.stringify({ fileIds: data.fileIds, clientIds: data.clientIds }),
  });
};

/**
 * Service method to delete files from a client
 */
export const deleteClientFiles = async (data: DeleteClientFilesData & { coachId: string }): Promise<void> => {
  await apiFetch(`/client/files`, {
    method: 'DELETE',
    headers: { 'x-client-id': data.clientId, 'x-coach-id': data.coachId },
    body: JSON.stringify({ fileIds: data.fileIds }),
  });
};
export interface UploadClientFileData {
  file: File;
  fileName?: string;
  tags?: string[];
  clientId: string;
}

/**
 * Service method to upload file directly for a client
 */
export const uploadClientFile = async (data: UploadClientFileData & { coachId: string }): Promise<any> => {
  const formData = new FormData();
  formData.append('file', data.file);
  if (data.fileName) formData.append('filename', data.fileName);
  if (data.tags) formData.append('tags', JSON.stringify(data.tags));

  const response = await apiFetch<{ data: { file: any } }>(`/client/files/upload`, {
    method: 'POST',
    headers: { 'x-client-id': data.clientId, 'x-coach-id': data.coachId },
    body: formData as any,
  });

  return response.data.file;
};

export interface FileWithUrl {
  id: string;
  url: string;
}

/**
 * Get a signed URL for a client file
 */
export const getClientFileUrl = async (fileId: string, clientId: string, coachId: string): Promise<FileWithUrl> => {
  const response = await apiFetch<{ data: { url: string } }>(`/client/files/${fileId}/url`, {
    method: 'GET',
    headers: { 'x-client-id': clientId, 'x-coach-id': coachId },
  });

  return {
    id: fileId,
    url: response.data.url,
  };
};

/**
 * Download a client file
 */
export const downloadClientFile = async (fileId: string, filename: string, clientId: string, coachId: string): Promise<void> => {
  const { url } = await getClientFileUrl(fileId, clientId, coachId);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.target = '_blank';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
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
