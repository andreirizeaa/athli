/**
 * File Types
 *
 * Shared types for files used across web and mobile apps.
 * Note: Platform-specific upload types (File vs URI) stay in respective apps.
 */

// =============================================================================
// Core File Types
// =============================================================================

export type FileType = 'photo' | 'video' | 'pdf' | 'image' | 'audio' | 'link';

// =============================================================================
// Link Types
// =============================================================================

export interface AddLinkData {
  filename: string;
  url: string;
}

/**
 * Check if a file_path represents an external link
 */
export const isExternalLink = (filePath: string | null | undefined): boolean => {
  if (!filePath) return false;
  return filePath.startsWith('http://') || filePath.startsWith('https://');
};

export interface CoachFile {
  id: string;
  coach_id: string;
  bucket_id: string;
  file_path: string;
  filename: string;
  mime_type: string | null;
  size: number | null;
  created_at: string;
  updated_at: string;
}

export interface FileWithUrl extends CoachFile {
  url: string;
}

export interface ClientFile {
  id: string;
  name?: string;
  filename?: string;
  display_name?: string;
  mime_type: string;
  size: number;
  url?: string;
  created_at: string;
  tags?: string[];
  file_path?: string;
  bucket_id?: string;
  client_id?: string;
  coach_id?: string;
}

export interface ClientFileAssignment extends CoachFile {
  assignment_id: string;
  display_name?: string;
  sort_order: number;
}

// =============================================================================
// Operation Types - Web (uses File object)
// =============================================================================

export interface AddFileData {
  fileName: string;
  file?: File;
  tags?: string[];
  clientId?: string;
  coachId?: string;
}

export interface UpdateFileData {
  fileId: string;
  fileName: string;
}

export interface DeleteFileData {
  fileId: string;
}

// =============================================================================
// Operation Types - Client File Assignments
// =============================================================================

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

export interface UpdateClientFileData {
  fileId: string;
  filename: string;
  clientId: string;
  coachId: string;
}

// =============================================================================
// Upload Data Types
// Note: These have platform-specific variants
// Web uses File object, Mobile uses URI string
// =============================================================================

export interface UploadClientFileDataBase {
  fileName?: string;
  tags?: string[];
  clientId: string;
}

// Web-specific upload data (uses File object)
export interface UploadClientFileDataWeb extends UploadClientFileDataBase {
  file: File;
}

// Mobile-specific upload data (uses URI string)
export interface UploadClientFileDataMobile extends UploadClientFileDataBase {
  fileUri: string;
  mimeType?: string;
  coachId: string;
}

// =============================================================================
// Simple File Reference
// =============================================================================

export interface FileReference {
  id: string;
  url: string;
}
