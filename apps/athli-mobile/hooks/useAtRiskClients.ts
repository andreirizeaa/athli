import { useQuery } from '@tanstack/react-query';
import { getAtRiskClients, type AtRiskClient } from '@/services/coach/coach-client-service';

export type { AtRiskClient };

export function useAtRiskClients(options?: { enabled?: boolean; thresholdDays?: number }) {
  const { enabled = true, thresholdDays = 5 } = options || {};

  const {
    data: atRiskClients = [],
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['at-risk-clients', thresholdDays],
    queryFn: () => getAtRiskClients(thresholdDays),
    staleTime: 10 * 60 * 1000, // 10 minutes
    enabled,
  });

  return {
    atRiskClients,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
    clientCount: atRiskClients.length,
  };
}
