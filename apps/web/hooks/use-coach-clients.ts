import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getClients, getAllClients, archiveUser, deleteClient, unarchiveClient, type Athlete } from '@/api/coach/coach-client-service';
import { showErrorToast } from '@/lib/toast-utils';

export function useCoachClients(options?: { enabled?: boolean; includeArchived?: boolean }) {
    const queryClient = useQueryClient();
    const includeArchived = options?.includeArchived ?? false;

    const {
        data: clients,
        isLoading,
        error
    } = useQuery({
        queryKey: ['coach-clients', { includeArchived }],
        queryFn: () => includeArchived ? getAllClients() : getClients(),
        staleTime: 5 * 60 * 1000, // 5 minutes
        gcTime: 10 * 60 * 1000, // 10 minutes
        enabled: options?.enabled !== false,
    });

    const archiveMutation = useMutation({
        mutationFn: (clientId: string) => archiveUser(clientId),
        onSuccess: (_, clientId) => {
            // Invalidate all coach-clients queries to refetch fresh data
            queryClient.invalidateQueries({ queryKey: ['coach-clients'] });
            // Invalidate client profile so it shows updated status
            queryClient.invalidateQueries({ queryKey: ['client-profile', clientId] });
            // Invalidate conversations cache so archived client disappears from inbox
            queryClient.invalidateQueries({ queryKey: ['conversations'] });
        },
        onError: (error: Error) => {
            showErrorToast(error, 'Failed to archive client');
        }
    });

    const unarchiveMutation = useMutation({
        mutationFn: (clientId: string) => unarchiveClient(clientId),
        onSuccess: (_, clientId) => {
            // Invalidate all coach-clients queries to refetch fresh data
            queryClient.invalidateQueries({ queryKey: ['coach-clients'] });
            // Invalidate client profile so it shows updated status
            queryClient.invalidateQueries({ queryKey: ['client-profile', clientId] });
            // Invalidate conversations cache so unarchived client appears in inbox
            queryClient.invalidateQueries({ queryKey: ['conversations'] });
        },
        onError: (error: Error) => {
            showErrorToast(error, 'Failed to unarchive client');
        }
    });

    const deleteMutation = useMutation({
        mutationFn: (clientId: string) => deleteClient(clientId),
        onSuccess: (_, clientId) => {
            // Invalidate all coach-clients queries to refetch fresh data
            queryClient.invalidateQueries({ queryKey: ['coach-clients'] });
            // Invalidate client profile
            queryClient.invalidateQueries({ queryKey: ['client-profile', clientId] });
            // Invalidate conversations cache so deleted client disappears from inbox
            queryClient.invalidateQueries({ queryKey: ['conversations'] });
        },
        onError: (error: Error) => {
            showErrorToast(error, 'Failed to delete client');
        }
    });

    // Get count of active (non-archived) clients
    const activeClientCount = (clients || []).filter(c => c.status !== 'archived').length;

    return {
        clients: clients || [],
        activeClientCount,
        isLoading,
        error,
        archiveClient: archiveMutation.mutateAsync,
        isArchiving: archiveMutation.isPending,
        unarchiveClient: unarchiveMutation.mutateAsync,
        isUnarchiving: unarchiveMutation.isPending,
        deleteClient: deleteMutation.mutateAsync,
        isDeleting: deleteMutation.isPending,
    };
}
