import { useQuery } from '@tanstack/react-query';
import { getClientFiles, type ClientFileAssignment } from '@/api/coach/coach-file-service';

export function useClientFiles(clientId: string | undefined) {
    const {
        data: files,
        isLoading,
        error,
        refetch
    } = useQuery({
        queryKey: ['client-files', clientId],
        queryFn: () => getClientFiles(clientId!),
        staleTime: 5 * 60 * 1000, // 5 minutes
        gcTime: 10 * 60 * 1000, // 10 minutes
    });

    return {
        files: files || [],
        isLoading,
        error,
        refetch
    };
}
