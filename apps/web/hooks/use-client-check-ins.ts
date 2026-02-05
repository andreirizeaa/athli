import { useQuery } from '@tanstack/react-query';
import { getClientCheckIns, type ClientCheckIn } from '@/api/client/client-form-service';
import { useUserProfile } from '@/hooks/use-user-profile';

export function useClientCheckIns(clientId: string | undefined) {
    const { user } = useUserProfile();

    const {
        data: checkIns,
        isLoading,
        isFetching,
        error,
        refetch
    } = useQuery({
        queryKey: ['client-check-ins', clientId, user?.id],
        queryFn: () => getClientCheckIns(clientId!, user?.id || ''),
        enabled: !!clientId && !!user?.id,
        staleTime: 5 * 60 * 1000, // 5 minutes
        gcTime: 10 * 60 * 1000, // 10 minutes
    });

    return {
        checkIns: checkIns || [],
        isLoading,
        isFetching,
        error,
        refetch
    };
}
