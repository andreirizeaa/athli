import { apiFetch } from '@/lib/api-client';
import type {
  CoachFile,
  FileFolder,
  CreateFileFolderInput,
  UpdateFileFolderInput,
} from '@athli/shared-types';

export type { FileFolder, CreateFileFolderInput, UpdateFileFolderInput };

export const getAllFileFolders = async (): Promise<FileFolder[]> => {
  const response = await apiFetch('/coach/files/folders');
  return response.data.folders;
};

export const createFileFolder = async (data: CreateFileFolderInput): Promise<FileFolder> => {
  const response = await apiFetch('/coach/files/folders', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return response.data.folder;
};

export const updateFileFolder = async (id: string, data: UpdateFileFolderInput): Promise<FileFolder> => {
  const response = await apiFetch(`/coach/files/folders/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
  return response.data.folder;
};

export const deleteFileFolder = async (id: string): Promise<void> => {
  await apiFetch(`/coach/files/folders/${id}`, {
    method: 'DELETE',
  });
};

export const moveFile = async (fileId: string, folderId: string | null): Promise<CoachFile> => {
  const response = await apiFetch<{ data: { file: CoachFile } }>(`/coach/files/${fileId}/move`, {
    method: 'PATCH',
    body: JSON.stringify({ folder_id: folderId }),
  });
  return response.data.file;
};

export const getFilesInFolder = async (folderId: string): Promise<CoachFile[]> => {
  const response = await apiFetch<{ data: { files: CoachFile[] } }>(`/coach/files/folders/${folderId}/files`);
  return response.data.files;
};
