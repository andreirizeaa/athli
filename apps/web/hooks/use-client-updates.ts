import { useQuery } from '@tanstack/react-query';
import { getClientUpdates, type ClientUpdate } from '@/api/client/client-updates-service';
import { useUserProfile } from '@/hooks/use-user-profile';

export function useClientUpdates(clientId: string | undefined) {
    const { user } = useUserProfile();
    const coachId = user?.id;

    const {
        data: updates,
        isLoading,
        isFetching,
        error,
        refetch
    } = useQuery({
        queryKey: ['client-updates', clientId, coachId],
        queryFn: () => getClientUpdates(clientId!, coachId!),
        enabled: !!clientId && !!coachId,
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

