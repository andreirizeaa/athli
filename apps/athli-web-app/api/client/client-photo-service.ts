export interface AddClientPhotoData {
  clientId: string;
  type: 'front' | 'back' | 'side';
  file: File;
  takenAt: Date;
}

/**
 * Service method to add a client photo
 * This will be connected to the backend in the future
 */
export const addClientPhoto = async (data: AddClientPhotoData): Promise<void> => {
  console.log('Adding client photo:', {
    clientId: data.clientId,
    type: data.type,
    fileName: data.file.name,
    fileSize: data.file.size,
    takenAt: data.takenAt,
  });

  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 100));
};
