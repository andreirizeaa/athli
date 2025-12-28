import { useQuery } from '@tanstack/react-query';
import { getWorkoutStatistics, type WorkoutStatistics } from '@/api/client/client-service';

export function useClientWorkoutStats(clientId: string | undefined) {
    const {
        data: stats,
        isLoading,
        isFetching,
        error
    } = useQuery({
        queryKey: ['client-workout-stats', clientId],
        queryFn: async () => {
            const [last7Days, last30Days, nextWeek] = await Promise.all([
                getWorkoutStatistics(clientId!, 'last7Days'),
                getWorkoutStatistics(clientId!, 'last30Days'),
                getWorkoutStatistics(clientId!, 'nextWeek'),
            ]);
            return { last7Days, last30Days, nextWeek };
        },
        enabled: !!clientId,
        staleTime: 5 * 60 * 1000,
    });

    return {
        stats: stats || null,
        isLoading,
        isFetching,
        error,
    };
}
