import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getOnboardings, deleteOnboarding, type Onboarding } from '@/api/coach/coach-onboarding-service';
import { toast } from 'sonner';

export function useCoachOnboardings(options?: { enabled?: boolean }) {
    const queryClient = useQueryClient();

    const {
        data: onboardings,
        isLoading,
        error,
        refetch
    } = useQuery({
        queryKey: ['coach-onboardings'],
        queryFn: () => getOnboardings(),
        staleTime: 5 * 60 * 1000, // 5 minutes
        gcTime: 10 * 60 * 1000, // 10 minutes
        enabled: options?.enabled !== false,
    });

    const deleteMutation = useMutation({
        mutationFn: (onboardingId: string) => deleteOnboarding(onboardingId),
        onSuccess: (_, onboardingId) => {
            queryClient.setQueryData(['coach-onboardings'], (old: Onboarding[] | undefined) => {
                return old?.filter(o => o.id !== onboardingId);
            });
            toast.success('Onboarding deleted successfully');
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Failed to delete onboarding');
        }
    });

    // Filter to only active onboardings for use in client selection
    const activeOnboardings = useMemo(() => {
        return (onboardings || []).filter(o => o.is_active === true);
    }, [onboardings]);

    return {
        onboardings: onboardings || [],
        activeOnboardings,
        isLoading,
        error: error as Error | null,
        refetch,
        deleteOnboarding: deleteMutation.mutateAsync,
        isDeleting: deleteMutation.isPending,
    };
}
