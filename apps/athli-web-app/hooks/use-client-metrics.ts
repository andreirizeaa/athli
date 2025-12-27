import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getClientMetrics, type ClientMetric } from '@/api/coach/coach-client-service';

export function useClientMetrics(clientId: string | undefined) {
    const queryClient = useQueryClient();

    const {
        data: metrics,
        isLoading,
        error
    } = useQuery({
        queryKey: ['client-metrics', clientId],
        queryFn: () => getClientMetrics(clientId!),
        staleTime: 5 * 60 * 1000, // 5 minutes
        gcTime: 10 * 60 * 1000, // 10 minutes
    });

    return {
        metrics: metrics || [],
        isLoading,
        error,
    };
}
