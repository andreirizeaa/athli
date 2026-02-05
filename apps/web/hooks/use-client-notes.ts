import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getNotes, createNote, editNote, deleteNote, type Note, deleteNotes as deleteNotesApi } from '@/api/coach/coach-client-service';
import { useUserProfile } from '@/hooks/use-user-profile';
import { toast } from 'sonner';

export function useClientNotes(clientId: string | undefined) {
    const queryClient = useQueryClient();
    const { user } = useUserProfile();
    const coachId = user?.id;

    const {
        data: notes,
        isLoading,
        isFetching,
        error,
        refetch
    } = useQuery({
        queryKey: ['client-notes', clientId, coachId],
        queryFn: () => getNotes(clientId!, coachId!),
        enabled: !!clientId && !!coachId,
        staleTime: 5 * 60 * 1000, // 5 minutes
        gcTime: 10 * 60 * 1000, // 10 minutes
    });

    const createMutation = useMutation({
        mutationFn: (data: { contactId: string; title: string; body: string }) => createNote({ ...data, coachId: coachId! }),
        onSuccess: (newNote) => {
            queryClient.setQueryData(['client-notes', clientId, coachId], (old: Note[] | undefined) => {
                return old ? [newNote, ...old] : [newNote];
            });
            toast.success('Note created successfully');
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Failed to create note');
        }
    });

    const updateMutation = useMutation({
        mutationFn: (data: { noteId: string; contactId: string; title: string; body: string }) => editNote({ ...data, coachId: coachId! }),
        onSuccess: (updatedNote) => {
            queryClient.setQueryData(['client-notes', clientId, coachId], (old: Note[] | undefined) => {
                return old?.map(note => note.id === updatedNote.id ? updatedNote : note);
            });
            toast.success('Note updated successfully');
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Failed to update note');
        }
    });

    const deleteMutation = useMutation({
        mutationFn: (data: { noteId: string; contactId: string }) => deleteNote({ ...data, coachId: coachId! }),
        onSuccess: (_, { noteId }) => {
            queryClient.setQueryData(['client-notes', clientId, coachId], (old: Note[] | undefined) => {
                return old?.filter(note => note.id !== noteId);
            });
            toast.success('Note deleted successfully');
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Failed to delete note');
        }
    });

    const bulkDeleteMutation = useMutation({
        mutationFn: (data: { noteIds: string[]; contactId: string }) => deleteNotesApi({ ...data, coachId: coachId! }),
        onSuccess: (_, { noteIds }) => {
            queryClient.setQueryData(['client-notes', clientId, coachId], (old: Note[] | undefined) => {
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
        isFetching,
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
