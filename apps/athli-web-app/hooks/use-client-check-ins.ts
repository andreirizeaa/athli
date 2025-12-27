import { useQuery } from '@tanstack/react-query';
import { getClientCheckIns, type ClientCheckIn } from '@/api/client/client-form-service';

export function useClientCheckIns(clientId: string | undefined) {
    const {
        data: checkIns,
        isLoading,
        error,
        refetch
    } = useQuery({
        queryKey: ['client-check-ins', clientId],
        queryFn: () => getClientCheckIns(clientId!),
        staleTime: 5 * 60 * 1000, // 5 minutes
        gcTime: 10 * 60 * 1000, // 10 minutes
    });

    return {
        checkIns: checkIns || [],
        isLoading,
        error,
        refetch
    };
}
