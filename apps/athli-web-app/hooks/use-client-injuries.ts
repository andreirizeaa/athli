import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAthleteInjuries, saveAthleteInjuries, type AthleteInjury } from '@/api/client/client-service';

export function useClientInjuries(clientId: string | undefined) {
    const {
        data: injuries,
        isLoading,
        isFetching,
        error
    } = useQuery({
        queryKey: ['client-injuries', clientId],
        queryFn: () => getAthleteInjuries(clientId!),
        enabled: !!clientId,
        staleTime: 5 * 60 * 1000,
    });

    return {
        injuries: injuries || [],
        isLoading,
        isFetching,
        error,
    };
}

export function useUpdateClientInjuries() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ clientId, injuries }: { clientId: string; injuries: Partial<AthleteInjury>[] }) =>
            saveAthleteInjuries(clientId, injuries),
        onSuccess: (_, { clientId }) => {
            queryClient.invalidateQueries({ queryKey: ['client-injuries', clientId] });
        },
    });
}
