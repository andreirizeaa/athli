import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getClientMetrics, type ClientMetric } from '@/api/coach/coach-client-service';
import { useUserProfile } from '@/hooks/use-user-profile';

export function useClientMetrics(clientId: string | undefined) {
    const queryClient = useQueryClient();
    const { user } = useUserProfile();

    const {
        data: metrics,
        isLoading,
        isFetching,
        error,
        refetch
    } = useQuery({
        queryKey: ['client-metrics', clientId, user?.id],
        queryFn: () => getClientMetrics(clientId!, user?.id || ''), // user.id (Coach ID)
        enabled: !!clientId && !!user?.id,
        staleTime: 5 * 60 * 1000, // 5 minutes
        gcTime: 10 * 60 * 1000, // 10 minutes
    });

    return {
        metrics: metrics || [],
        isLoading,
        isFetching,
        error,
        refetch
    };
}
