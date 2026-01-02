import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAthleteInjuries, saveAthleteInjuries, type AthleteInjury } from '@/api/client/client-service';
import { useUserProfile } from '@/hooks/use-user-profile';

export function useClientInjuries(clientId: string | undefined) {
    const { user } = useUserProfile();
    const coachId = user?.id;

    const {
        data: injuries,
        isLoading,
        isFetching,
        error
    } = useQuery({
        queryKey: ['client-injuries', clientId, coachId],
        queryFn: () => getAthleteInjuries(clientId!, coachId!),
        enabled: !!clientId && !!coachId,
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
    const { user } = useUserProfile();
    const coachId = user?.id;

    return useMutation({
        mutationFn: ({ clientId, injuries }: { clientId: string; injuries: Partial<AthleteInjury>[] }) =>
            saveAthleteInjuries(clientId, coachId!, injuries),
        onSuccess: (_, { clientId }) => {
            queryClient.invalidateQueries({ queryKey: ['client-injuries', clientId] });
        },
    });
}

