export interface Note {
  id: string;
  title: string;
  body: string;
  createdAt: number; // timestamp in milliseconds
  updatedAt: number | null; // timestamp in milliseconds
}

export interface CreateNoteData {
  contactId: string;
  title: string;
  body: string;
}

export interface EditNoteData {
  noteId: string;
  contactId: string;
  title: string;
  body: string;
}

export interface DeleteNoteData {
  noteId: string;
  contactId: string;
}

/**
 * Mock notes data for John Smith (clientId: '1')
 */
const mockNotesForJohnSmith: Note[] = [
  {
    id: '1',
    title: 'Training Progress Update',
    body: "Client has shown significant improvement in their squat form. We've increased the weight by 10kg and they're maintaining proper technique. Next session we'll focus on deadlift variations.",
    createdAt: new Date('2025-08-21T17:50:00').getTime(),
    updatedAt: new Date('2025-08-21T18:30:00').getTime(),
  },
  {
    id: '2',
    title: 'Nutrition Consultation',
    body: 'Discussed meal timing and protein intake. Client is tracking macros well. Recommended increasing water intake before workouts.',
    createdAt: new Date('2025-08-20T14:15:00').getTime(),
    updatedAt: null,
  },
  {
    id: '3',
    title: 'Injury Prevention Notes',
    body: "Client mentioned slight discomfort in left shoulder during overhead movements. We've adjusted the program to focus on mobility work and reduced overhead load. Will monitor closely in next session.",
    createdAt: new Date('2025-08-19T10:00:00').getTime(),
    updatedAt: new Date('2025-08-19T16:45:00').getTime(),
  },
  {
    id: '4',
    title: 'Weekly Check-in',
    body: 'Client is maintaining consistency with their training schedule. Discussed upcoming competition goals and adjusted training intensity accordingly.',
    createdAt: new Date('2025-08-18T09:30:00').getTime(),
    updatedAt: null,
  },
  {
    id: '5',
    title: 'Goal Setting Session',
    body: "Client wants to focus on building muscle mass over the next 3 months. We've set specific targets and created a progressive overload plan. They're motivated and committed to the program.",
    createdAt: new Date('2025-08-17T15:20:00').getTime(),
    updatedAt: null,
  },
];

/**
 * Dummy notes service method to get all notes for a contact
 * This will be connected to the backend in the future
 */
export const getNotes = async (contactId: string): Promise<Note[]> => {
  // TODO: Connect to backend API
  // This is a placeholder that logs the data for now

  console.log('Getting notes for contact:', contactId);

  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 100));

  // Return mock data for John Smith (clientId: '1')
  if (contactId === '1') {
    return mockNotesForJohnSmith;
  }

  // Dummy response - in the future, this will come from the backend
  // For now, return empty array for other clients
  // In the future, this will make an actual API call:
  // const response = await fetch(`/api/notes?contactId=${contactId}`, {
  //   method: 'GET',
  //   headers: { 'Content-Type': 'application/json' },
  // })
  // if (!response.ok) throw new Error('Failed to get notes')
  // return await response.json()

  return [];
};

/**
 * Dummy notes service method to create a new note
 * This will be connected to the backend in the future
 */
export const createNote = async (data: CreateNoteData): Promise<Note> => {
  // TODO: Connect to backend API
  // This is a placeholder that logs the data for now

  console.log('Creating note:', {
    contactId: data.contactId,
    title: data.title,
    body: data.body || '(empty body)',
  });

  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 100));

  // Dummy response - in the future, this will come from the backend
  const newNote: Note = {
    id: `note-${Date.now()}-${Math.random().toString(36).substring(7)}`,
    title: data.title,
    body: data.body,
    createdAt: Date.now(),
    updatedAt: null,
  };

  // In the future, this will make an actual API call:
  // const response = await fetch('/api/notes', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify(data),
  // })
  // if (!response.ok) throw new Error('Failed to create note')
  // return await response.json()

  return newNote;
};

/**
 * Dummy notes service method to edit an existing note
 * This will be connected to the backend in the future
 */
export const editNote = async (data: EditNoteData): Promise<Note> => {
  // TODO: Connect to backend API
  // This is a placeholder that logs the data for now

  console.log('Editing note:', {
    noteId: data.noteId,
    contactId: data.contactId,
    title: data.title,
    body: data.body || '(empty body)',
  });

  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 100));

  // Dummy response - in the future, this will come from the backend
  const updatedNote: Note = {
    id: data.noteId,
    title: data.title,
    body: data.body,
    createdAt: Date.now(), // In real implementation, this would come from backend
    updatedAt: Date.now(),
  };

  // In the future, this will make an actual API call:
  // const response = await fetch(`/api/notes/${data.noteId}`, {
  //   method: 'PATCH',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({
  //     contactId: data.contactId,
  //     title: data.title,
  //     body: data.body,
  //   }),
  // })
  // if (!response.ok) throw new Error('Failed to edit note')
  // return await response.json()

  return updatedNote;
};

/**
 * Dummy notes service method to delete a note
 * This will be connected to the backend in the future
 */
export const deleteNote = async (data: DeleteNoteData): Promise<void> => {
  // TODO: Connect to backend API
  // This is a placeholder that logs the data for now

  console.log('Deleting note:', {
    noteId: data.noteId,
    contactId: data.contactId,
  });

  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 100));

  // In the future, this will make an actual API call:
  // const response = await fetch(`/api/notes/${data.noteId}`, {
  //   method: 'DELETE',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({ contactId: data.contactId }),
  // })
  // if (!response.ok) throw new Error('Failed to delete note')
};

/**
 * Dummy notes service method to search notes
 * This will be connected to the backend in the future
 */
export const searchNotes = async (
  contactId: string,
  query: string
): Promise<Note[]> => {
  // TODO: Connect to backend API
  // This is a placeholder that logs the data for now

  console.log('Searching notes:', {
    contactId,
    query,
  });

  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 100));

  // Dummy response - in the future, this will come from the backend
  // For now, return empty array as the filtering will be done client-side
  // In the future, this will make an actual API call:
  // const response = await fetch(`/api/notes/search?contactId=${contactId}&query=${encodeURIComponent(query)}`, {
  //   method: 'GET',
  //   headers: { 'Content-Type': 'application/json' },
  // })
  // if (!response.ok) throw new Error('Failed to search notes')
  // return await response.json()

  return [];
};

