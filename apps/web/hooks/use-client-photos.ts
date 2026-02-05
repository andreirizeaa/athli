import { useQuery } from '@tanstack/react-query';
import { getClientPhotos, type ClientPhoto } from '@/api/client/client-photo-service';
import { useUserProfile } from '@/hooks/use-user-profile';

export function useClientPhotos(clientId: string | undefined) {
    const { user } = useUserProfile();
    const coachId = user?.id;

    const {
        data: photos,
        isLoading,
        isFetching,
        error,
        refetch
    } = useQuery({
        queryKey: ['client-photos', clientId, coachId],
        queryFn: () => getClientPhotos(clientId!, coachId!),
        enabled: !!clientId && !!coachId,
        staleTime: 5 * 60 * 1000, // 5 minutes
        gcTime: 10 * 60 * 1000, // 10 minutes
    });

    return {
        photos: photos || [],
        isLoading,
        isFetching,
        error,
        refetch
    };
}

