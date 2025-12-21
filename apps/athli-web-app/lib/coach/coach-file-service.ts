export interface AddFileData {
  fileName: string;
  file: File;
  tags: string[];
}

export interface UpdateFileData {
  fileId: string;
  fileName: string;
  tags: string[];
}

export interface DeleteFileData {
  fileId: string;
}

export interface CoachFile {
  id: string;
  fileName: string;
  tags: string[];
  type: 'pdf' | 'image' | 'video' | 'document' | 'spreadsheet' | 'other';
}

/**
 * Service method to add a file to coach's library
 * This will be connected to the backend in the future
 */
export const addFile = async (data: AddFileData): Promise<string> => {
  // TODO: Connect to backend API
  console.log('Adding file:', {
    fileName: data.fileName,
    fileSize: data.file.size,
    fileType: data.file.type,
    tags: data.tags,
  });

  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 100));

  const fileId = `file-${Date.now()}`;
  return fileId;
};

/**
 * Service method to update a file in coach's library
 * This will be connected to the backend in the future
 */
export const updateFile = async (data: UpdateFileData): Promise<void> => {
  // TODO: Connect to backend API
  console.log('Updating file:', {
    fileId: data.fileId,
    fileName: data.fileName,
    tags: data.tags,
  });

  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 100));
};

/**
 * Service method to delete a file from coach's library
 * This will be connected to the backend in the future
 */
export const deleteFile = async (data: DeleteFileData): Promise<void> => {
  // TODO: Connect to backend API
  console.log('Deleting file:', {
    fileId: data.fileId,
  });

  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 100));
};

/**
 * Service method to get all coach's files (library)
 * This will be connected to the backend in the future
 */
export const getAllFiles = async (): Promise<CoachFile[]> => {
  // TODO: Connect to backend API
  console.log('Getting all coach files');

  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 100));

  // Mock data - in production this would come from the backend
  const mockFiles: CoachFile[] = [
    {
      id: 'coach-file-1',
      fileName: 'Training Program Template.pdf',
      tags: ['Training', 'Program', 'Template'],
      type: 'pdf',
    },
    {
      id: 'coach-file-2',
      fileName: 'Nutrition Guide.docx',
      tags: ['Nutrition', 'Education'],
      type: 'document',
    },
    {
      id: 'coach-file-3',
      fileName: 'Recovery Protocol.pdf',
      tags: ['Recovery', 'Rehab'],
      type: 'pdf',
    },
    {
      id: 'coach-file-4',
      fileName: 'Warm-up Routine.pdf',
      tags: ['Training', 'Warmup'],
      type: 'pdf',
    },
    {
      id: 'coach-file-5',
      fileName: 'Stretching Guide.pdf',
      tags: ['Mobility', 'Flexibility'],
      type: 'pdf',
    },
  ];

  return mockFiles;
};
