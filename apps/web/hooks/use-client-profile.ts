import { useQuery } from '@tanstack/react-query';
import { getClient, type Athlete } from '@/api/coach/coach-client-service';

export function useClientProfile(clientId: string | undefined) {
    const {
        data: client,
        isLoading,
        isFetching,
        error
    } = useQuery({
        queryKey: ['client-profile', clientId],
        queryFn: () => getClient(clientId!),
        staleTime: 5 * 60 * 1000, // 5 minutes
        gcTime: 10 * 60 * 1000, // 10 minutes
    });

    return {
        client: client || null,
        isLoading,
        isFetching,
        error,
    };
}
