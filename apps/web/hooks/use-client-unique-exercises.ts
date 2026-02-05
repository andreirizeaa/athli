import { useQuery } from '@tanstack/react-query';
import { getClientUniqueExercises, type UniqueExercise } from '@/api/client/client-training-service';
import { useUserProfile } from '@/hooks/use-user-profile';

export function useClientUniqueExercises(clientId: string | undefined) {
    const { user } = useUserProfile();

    const {
        data: uniqueExercises,
        isLoading,
        isFetching,
        error,
        refetch
    } = useQuery({
        queryKey: ['client-unique-exercises', clientId, user?.id],
        queryFn: () => getClientUniqueExercises({ clientId: clientId!, coachId: user?.id || '' }),
        enabled: !!clientId && !!user?.id,
        staleTime: 5 * 60 * 1000, // 5 minutes
        gcTime: 10 * 60 * 1000, // 10 minutes
    });

    return {
        uniqueExercises: uniqueExercises || [],
        isLoading,
        isFetching,
        error,
        refetch
    };
}
