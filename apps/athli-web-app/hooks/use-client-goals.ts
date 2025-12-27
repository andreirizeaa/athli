import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAthleteGoals, saveAthleteGoals } from '@/api/client/client-service';

export function useClientGoals(clientId: string | undefined) {
    const {
        data: goals,
        isLoading,
        isFetching,
        error
    } = useQuery({
        queryKey: ['client-goals', clientId],
        queryFn: () => getAthleteGoals(clientId!),
        enabled: !!clientId,
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

    return useMutation({
        mutationFn: ({ clientId, goals }: { clientId: string; goals: string[] }) =>
            saveAthleteGoals(clientId, goals),
        onSuccess: (_, { clientId }) => {
            queryClient.invalidateQueries({ queryKey: ['client-goals', clientId] });
        },
    });
}
