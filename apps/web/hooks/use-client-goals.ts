import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAthleteGoals, saveAthleteGoals, type AthleteGoal } from '@/api/client/client-service';
import { useUserProfile } from '@/hooks/use-user-profile';

export function useClientGoals(clientId: string | undefined) {
    const { user } = useUserProfile();
    const coachId = user?.id;

    const {
        data: goals,
        isLoading,
        isFetching,
        error
    } = useQuery({
        queryKey: ['client-goals', clientId, coachId],
        queryFn: () => getAthleteGoals(clientId!, coachId!),
        enabled: !!clientId && !!coachId,
        staleTime: 5 * 60 * 1000,
    });

    return {
        goals: goals || [],
        isLoading,
        isFetching,
        error,
    };
}

export function useUpdateClientGoals() {
    const queryClient = useQueryClient();
    const { user } = useUserProfile();
    const coachId = user?.id;

    return useMutation({
        mutationFn: ({ clientId, goals }: { clientId: string; goals: Partial<AthleteGoal>[] }) =>
            saveAthleteGoals(clientId, coachId!, goals),
        onSuccess: (_, { clientId }) => {
            queryClient.invalidateQueries({ queryKey: ['client-goals', clientId] });
        },
    });
}

