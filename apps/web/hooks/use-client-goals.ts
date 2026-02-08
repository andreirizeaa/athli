import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAthleteGoals, createAthleteGoal, updateAthleteGoal, deleteAthleteGoal, type AthleteGoal } from '@/api/client/client-service';
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

export function useCreateClientGoal() {
    const queryClient = useQueryClient();
    const { user } = useUserProfile();
    const coachId = user?.id;

    return useMutation({
        mutationFn: ({ clientId, goal }: { clientId: string; goal: Partial<AthleteGoal> }) =>
            createAthleteGoal(clientId, coachId!, goal),
        onSuccess: (_, { clientId }) => {
            queryClient.invalidateQueries({ queryKey: ['client-goals', clientId] });
        },
    });
}

export function useUpdateClientGoal() {
    const queryClient = useQueryClient();
    const { user } = useUserProfile();
    const coachId = user?.id;

    return useMutation({
        mutationFn: ({ clientId, goalId, goal }: { clientId: string; goalId: string; goal: Partial<AthleteGoal> }) =>
            updateAthleteGoal(clientId, coachId!, goalId, goal),
        onSuccess: (_, { clientId }) => {
            queryClient.invalidateQueries({ queryKey: ['client-goals', clientId] });
        },
    });
}

export function useDeleteClientGoal() {
    const queryClient = useQueryClient();
    const { user } = useUserProfile();
    const coachId = user?.id;

    return useMutation({
        mutationFn: ({ clientId, goalId }: { clientId: string; goalId: string }) =>
            deleteAthleteGoal(clientId, coachId!, goalId),
        onSuccess: (_, { clientId }) => {
            queryClient.invalidateQueries({ queryKey: ['client-goals', clientId] });
        },
    });
}
