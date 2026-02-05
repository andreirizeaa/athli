import type { File, AddFileData } from '@/types';

// Re-export types for backward compatibility
export type { File, AddFileData };

/**
 * Service method to add a new file
 * This will be connected to the backend in the future
 */
export const addFile = async (data: AddFileData): Promise<File> => {
  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 500));

  // Create new file object
  const newFile: File = {
    id: `file-${Date.now()}-${Math.random()}`,
    name: data.name,
    uri: data.uri,
    type: data.type,
    size: data.size,
    createdAt: new Date(),
  };

  // In the future, this will make an actual API call:
  // const response = await fetch('/api/files', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify(data),
  // });
  // if (!response.ok) throw new Error('Failed to add file');
  // return await response.json();

  return newFile;
};

/**
 * Service method to get all files
 * This will be connected to the backend in the future
 */
export const getFiles = async (): Promise<File[]> => {
  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 100));

  // Return mock data - in the future, this will come from the backend
  return [];

  // In the future, this will make an actual API call:
  // const response = await fetch('/api/files', {
  //   method: 'GET',
  //   headers: { 'Content-Type': 'application/json' },
  // });
  // if (!response.ok) throw new Error('Failed to get files');
  // return await response.json();
};
