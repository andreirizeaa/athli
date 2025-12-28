import { useQuery } from '@tanstack/react-query';
import { getClientFiles, type ClientFileAssignment } from '@/api/coach/coach-file-service';
import { useUserProfile } from '@/hooks/use-user-profile';

export function useClientFiles(clientId: string | undefined) {
    const { user } = useUserProfile();

    const {
        data: files,
        isLoading,
        isFetching,
        error,
        refetch
    } = useQuery({
        queryKey: ['client-files', clientId, user?.id],
        queryFn: () => getClientFiles(clientId!, user?.id || ''),
        enabled: !!clientId && !!user?.id,
        staleTime: 5 * 60 * 1000, // 5 minutes
        gcTime: 10 * 60 * 1000, // 10 minutes
    });

    return {
        files: files || [],
        isLoading,
        isFetching,
        error,
        refetch
    };
}
