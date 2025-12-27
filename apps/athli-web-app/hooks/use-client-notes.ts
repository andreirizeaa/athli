import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getNotes, createNote, editNote, deleteNote, type Note, deleteNotes as deleteNotesApi } from '@/api/coach/coach-client-service';
import { toast } from 'sonner';

export function useClientNotes(clientId: string | undefined) {
    const queryClient = useQueryClient();

    const {
        data: notes,
        isLoading,
        error,
        refetch
    } = useQuery({
        queryKey: ['client-notes', clientId],
        queryFn: () => getNotes(clientId!),
        staleTime: 5 * 60 * 1000, // 5 minutes
        gcTime: 10 * 60 * 1000, // 10 minutes
    });

    const createMutation = useMutation({
        mutationFn: (data: { contactId: string; title: string; body: string }) => createNote(data),
        onSuccess: (newNote) => {
            queryClient.setQueryData(['client-notes', clientId], (old: Note[] | undefined) => {
                return old ? [newNote, ...old] : [newNote];
            });
            toast.success('Note created successfully');
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Failed to create note');
        }
    });

    const updateMutation = useMutation({
        mutationFn: (data: { noteId: string; contactId: string; title: string; body: string }) => editNote(data),
        onSuccess: (updatedNote) => {
            queryClient.setQueryData(['client-notes', clientId], (old: Note[] | undefined) => {
                return old?.map(note => note.id === updatedNote.id ? updatedNote : note);
            });
            toast.success('Note updated successfully');
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Failed to update note');
        }
    });

    const deleteMutation = useMutation({
        mutationFn: (data: { noteId: string; contactId: string }) => deleteNote(data),
        onSuccess: (_, { noteId }) => {
            queryClient.setQueryData(['client-notes', clientId], (old: Note[] | undefined) => {
                return old?.filter(note => note.id !== noteId);
            });
            toast.success('Note deleted successfully');
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Failed to delete note');
        }
    });

    const bulkDeleteMutation = useMutation({
        mutationFn: (data: { noteIds: string[]; contactId: string }) => deleteNotesApi(data),
        onSuccess: (_, { noteIds }) => {
            queryClient.setQueryData(['client-notes', clientId], (old: Note[] | undefined) => {
                return old?.filter(note => !noteIds.includes(note.id));
            });
            toast.success(`${noteIds.length} ${noteIds.length === 1 ? 'note' : 'notes'} deleted successfully`);
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Failed to delete notes');
        }
    });

    return {
        notes: notes || [],
        isLoading,
        error,
        refetch,
        createNote: createMutation.mutateAsync,
        updateNote: updateMutation.mutateAsync,
        deleteNote: deleteMutation.mutateAsync,
        deleteNotes: bulkDeleteMutation.mutateAsync,
        isCreating: createMutation.isPending,
        isUpdating: updateMutation.isPending,
        isDeleting: deleteMutation.isPending || bulkDeleteMutation.isPending,
    };
}
