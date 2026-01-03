import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAthleteBio, saveAthleteBio } from '@/api/client/client-service';
import { useUserProfile } from '@/hooks/use-user-profile';

export function useClientBio(clientId: string | undefined) {
    const { user } = useUserProfile();
    const coachId = user?.id;

    const {
        data: bio,
        isLoading,
        isFetching,
        error
    } = useQuery({
        queryKey: ['client-bio', clientId, coachId],
        queryFn: () => getAthleteBio(clientId!, coachId!),
        enabled: !!clientId && !!coachId,
        staleTime: 5 * 60 * 1000,
    });

    return {
        bio: bio || '',
        isLoading,
        isFetching,
        error,
    };
}

export function useUpdateClientBio() {
    const queryClient = useQueryClient();
    const { user } = useUserProfile();
    const coachId = user?.id;

    return useMutation({
        mutationFn: ({ clientId, bio }: { clientId: string; bio: string }) =>
            saveAthleteBio(clientId, coachId!, bio),
        onSuccess: (_, { clientId }) => {
            queryClient.invalidateQueries({ queryKey: ['client-bio', clientId] });
        },
    });
}

