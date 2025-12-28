import { useQuery } from '@tanstack/react-query';
import { getClientHabits, type ClientHabit } from '@/api/coach/coach-client-service';
import { useUserProfile } from '@/hooks/use-user-profile';

export function useClientHabits(clientId: string | undefined) {
    const { user } = useUserProfile();

    const {
        data: habits,
        isLoading,
        isFetching,
        error,
        refetch
    } = useQuery({
        queryKey: ['client-habits', clientId, user?.id],
        queryFn: () => getClientHabits(clientId!, user?.id || ''),
        enabled: !!clientId && !!user?.id,
        staleTime: 5 * 60 * 1000, // 5 minutes
        gcTime: 10 * 60 * 1000, // 10 minutes
    });

    return {
        habits: habits || [],
        isLoading,
        isFetching,
        error,
        refetch
    };
}
