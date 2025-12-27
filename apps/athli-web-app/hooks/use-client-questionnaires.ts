import { useQuery } from '@tanstack/react-query';
import { getClientQuestionnaires, type ClientQuestionnaire } from '@/api/client/client-form-service';

export function useClientQuestionnaires(clientId: string | undefined) {
    const {
        data: questionnaires,
        isLoading,
        error,
        refetch
    } = useQuery({
        queryKey: ['client-questionnaires', clientId],
        queryFn: () => getClientQuestionnaires(clientId!),
        staleTime: 5 * 60 * 1000, // 5 minutes
        gcTime: 10 * 60 * 1000, // 10 minutes
    });

    return {
        questionnaires: questionnaires || [],
        isLoading,
        error,
        refetch
    };
}
