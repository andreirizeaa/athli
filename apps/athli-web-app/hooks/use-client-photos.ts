import { useQuery } from '@tanstack/react-query';
import { getClientPhotos, type ClientPhoto } from '@/api/client/client-photo-service';

export function useClientPhotos(clientId: string | undefined) {
    const {
        data: photos,
        isLoading,
        error,
        refetch
    } = useQuery({
        queryKey: ['client-photos', clientId],
        queryFn: () => getClientPhotos(clientId!),
        staleTime: 5 * 60 * 1000, // 5 minutes
        gcTime: 10 * 60 * 1000, // 10 minutes
    });

    return {
        photos: photos || [],
        isLoading,
        error,
        refetch
    };
}
