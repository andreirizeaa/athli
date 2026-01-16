import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getClients, archiveUser, deleteClient, type Athlete } from '@/api/coach/coach-client-service';
import { toast } from 'sonner';

export function useCoachClients(options?: { enabled?: boolean }) {
    const queryClient = useQueryClient();

    const {
        data: clients,
        isLoading,
        error
    } = useQuery({
        queryKey: ['coach-clients'],
        queryFn: () => getClients(),
        staleTime: 5 * 60 * 1000, // 5 minutes
        gcTime: 10 * 60 * 1000, // 10 minutes
        enabled: options?.enabled !== false,
    });

    const archiveMutation = useMutation({
        mutationFn: (clientId: string) => archiveUser(clientId),
        onSuccess: (_, clientId) => {
            queryClient.setQueryData(['coach-clients'], (old: Athlete[] | undefined) => {
                return old?.filter(c => c.id !== clientId);
            });
            // Invalidate conversations cache so archived client disappears from inbox
            queryClient.invalidateQueries({ queryKey: ['conversations'] });
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Failed to archive client');
        }
    });

    const deleteMutation = useMutation({
        mutationFn: (clientId: string) => deleteClient(clientId),
        onSuccess: (_, clientId) => {
            queryClient.setQueryData(['coach-clients'], (old: Athlete[] | undefined) => {
                return old?.filter(c => c.id !== clientId);
            });
            // Invalidate conversations cache so deleted client disappears from inbox
            queryClient.invalidateQueries({ queryKey: ['conversations'] });
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Failed to delete client');
        }
    });

    return {
        clients: clients || [],
        isLoading,
        error,
        archiveClient: archiveMutation.mutateAsync,
        isArchiving: archiveMutation.isPending,
        deleteClient: deleteMutation.mutateAsync,
        isDeleting: deleteMutation.isPending,
    };
}
