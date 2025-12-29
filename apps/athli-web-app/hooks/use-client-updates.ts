import { useQuery } from '@tanstack/react-query';
import { getClientUpdates, type ClientUpdate } from '@/api/client/client-updates-service';

export function useClientUpdates(clientId: string | undefined) {
    const {
        data: updates,
        isLoading,
        isFetching,
        error,
        refetch
    } = useQuery({
        queryKey: ['client-updates', clientId],
        queryFn: () => getClientUpdates(clientId!),
        enabled: !!clientId,
        staleTime: 5 * 60 * 1000, // 5 minutes
        gcTime: 10 * 60 * 1000, // 10 minutes
    });

    return {
        updates: updates || [],
        isLoading,
        isFetching,
        error,
        refetch,
    };
}
