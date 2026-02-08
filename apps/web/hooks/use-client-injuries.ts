import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAthleteInjuries, createAthleteInjury, updateAthleteInjury, deleteAthleteInjury, type AthleteInjury } from '@/api/client/client-service';
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

export function useCreateClientInjury() {
    const queryClient = useQueryClient();
    const { user } = useUserProfile();
    const coachId = user?.id;

    return useMutation({
        mutationFn: ({ clientId, injury }: { clientId: string; injury: Partial<AthleteInjury> }) =>
            createAthleteInjury(clientId, coachId!, injury),
        onSuccess: (_, { clientId }) => {
            queryClient.invalidateQueries({ queryKey: ['client-injuries', clientId] });
        },
    });
}

export function useUpdateClientInjury() {
    const queryClient = useQueryClient();
    const { user } = useUserProfile();
    const coachId = user?.id;

    return useMutation({
        mutationFn: ({ clientId, injuryId, injury }: { clientId: string; injuryId: string; injury: Partial<AthleteInjury> }) =>
            updateAthleteInjury(clientId, coachId!, injuryId, injury),
        onSuccess: (_, { clientId }) => {
            queryClient.invalidateQueries({ queryKey: ['client-injuries', clientId] });
        },
    });
}

export function useDeleteClientInjury() {
    const queryClient = useQueryClient();
    const { user } = useUserProfile();
    const coachId = user?.id;

    return useMutation({
        mutationFn: ({ clientId, injuryId }: { clientId: string; injuryId: string }) =>
            deleteAthleteInjury(clientId, coachId!, injuryId),
        onSuccess: (_, { clientId }) => {
            queryClient.invalidateQueries({ queryKey: ['client-injuries', clientId] });
        },
    });
}
