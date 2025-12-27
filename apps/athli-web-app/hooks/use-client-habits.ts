import { useQuery } from '@tanstack/react-query';
import { getClientHabits, type ClientHabit } from '@/api/coach/coach-client-service';

export function useClientHabits(clientId: string | undefined) {
    const {
        data: habits,
        isLoading,
        error,
        refetch
    } = useQuery({
        queryKey: ['client-habits', clientId],
        queryFn: () => getClientHabits(clientId!),
        staleTime: 5 * 60 * 1000, // 5 minutes
        gcTime: 10 * 60 * 1000, // 10 minutes
    });

    return {
        habits: habits || [],
        isLoading,
        error,
        refetch
    };
}
