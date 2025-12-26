export interface DeleteClientNotesData {
  noteIds: string[];
  clientId: string;
}

/**
 * Service method to delete notes from a client
 * This will be connected to the backend in the future
 */
export const deleteClientNotes = async (data: DeleteClientNotesData): Promise<void> => {
  console.log('Deleting client notes:', {
    noteIds: data.noteIds,
    clientId: data.clientId,
  });

  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 100));
};
