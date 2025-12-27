import { useQuery } from '@tanstack/react-query';
import { getClientQuestionnaires, type ClientQuestionnaire } from '@/api/client/client-form-service';
import { useUserProfile } from '@/hooks/use-user-profile';

export function useClientQuestionnaires(clientId: string | undefined) {
    const { user } = useUserProfile();

    const {
        data: questionnaires,
        isLoading,
        isFetching,
        error,
        refetch
    } = useQuery({
        queryKey: ['client-questionnaires', clientId, user?.id],
        queryFn: () => getClientQuestionnaires(clientId!, user?.id || ''),
        enabled: !!clientId && !!user?.id,
        staleTime: 5 * 60 * 1000, // 5 minutes
        gcTime: 10 * 60 * 1000, // 10 minutes
    });

    return {
        questionnaires: questionnaires || [],
        isLoading,
        isFetching,
        error,
        refetch
    };
}
