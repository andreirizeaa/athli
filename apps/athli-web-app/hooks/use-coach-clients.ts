import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getClients, archiveUser, type Athlete } from '@/api/coach/coach-client-service';
import { toast } from 'sonner';

export function useCoachClients() {
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
    });

    const archiveMutation = useMutation({
        mutationFn: (clientId: string) => archiveUser(clientId),
        onSuccess: (_, clientId) => {
            queryClient.setQueryData(['coach-clients'], (old: Athlete[] | undefined) => {
                return old?.filter(c => c.id !== clientId);
            });
            toast.success('Client archived successfully');
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Failed to archive client');
        }
    });

    return {
        clients: clients || [],
        isLoading,
        error,
        archiveClient: archiveMutation.mutateAsync,
        isArchiving: archiveMutation.isPending,
    };
}
