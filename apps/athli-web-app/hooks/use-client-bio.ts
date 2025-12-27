import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAthleteBio, saveAthleteBio } from '@/api/client/client-service';

export function useClientBio(clientId: string | undefined) {
    const {
        data: bio,
        isLoading,
        isFetching,
        error
    } = useQuery({
        queryKey: ['client-bio', clientId],
        queryFn: () => getAthleteBio(clientId!),
        enabled: !!clientId,
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

    return useMutation({
        mutationFn: ({ clientId, bio }: { clientId: string; bio: string }) =>
            saveAthleteBio(clientId, bio),
        onSuccess: (_, { clientId }) => {
            queryClient.invalidateQueries({ queryKey: ['client-bio', clientId] });
        },
    });
}
