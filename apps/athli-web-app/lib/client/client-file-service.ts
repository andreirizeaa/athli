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
  // TODO: Connect to backend API
  console.log('Adding files to client:', {
    fileIds: data.fileIds,
    clientId: data.clientId,
  });

  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 100));
};

/**
 * Service method to delete files from a client
 * This will be connected to the backend in the future
 */
export const deleteClientFiles = async (data: DeleteClientFilesData): Promise<void> => {
  console.log('Deleting client files:', {
    fileIds: data.fileIds,
    clientId: data.clientId,
  });

  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 100));
};
