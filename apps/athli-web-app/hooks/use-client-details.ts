import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAthleteDetails, saveAthleteDetails, type AthleteDetails } from '@/api/client/client-service';

export function useClientDetails(clientId: string | undefined) {
    const {
        data: details,
        isLoading,
        isFetching,
        error
    } = useQuery({
        queryKey: ['client-details', clientId],
        queryFn: () => getAthleteDetails(clientId!),
        enabled: !!clientId,
        staleTime: 5 * 60 * 1000,
    });

    return {
        details: details || null,
        isLoading,
        isFetching,
        error,
    };
}

export function useUpdateClientDetails() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ clientId, details }: { clientId: string; details: AthleteDetails }) =>
            saveAthleteDetails(clientId, details),
        onSuccess: (_, { clientId }) => {
            queryClient.invalidateQueries({ queryKey: ['client-details', clientId] });
        },
    });
}
