
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    getCheckIns,
    addCheckIn,
    deleteCheckIn,
    duplicateCheckIn,
    CheckIn,
    AddCheckInData
} from '@/api/coach/coach-check-in-service';
import { toast } from 'sonner';

export function useCoachCheckIns(options?: { enabled?: boolean }) {
    const queryClient = useQueryClient();

    const {
        data: checkIns,
        isLoading,
        error
    } = useQuery({
        queryKey: ['coach-check-ins'],
        queryFn: () => getCheckIns(),
        staleTime: 5 * 60 * 1000, // 5 minutes
        enabled: options?.enabled !== false,
    });

    const createMutation = useMutation({
        mutationFn: (data: AddCheckInData) => addCheckIn(data),
        onSuccess: (newCheckIn) => {
            queryClient.setQueryData(['coach-check-ins'], (old: CheckIn[] | undefined) => {
                return old ? [newCheckIn, ...old] : [newCheckIn];
            });
            toast.success('Check-in created successfully');
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Failed to create check-in');
        }
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => deleteCheckIn(id),
        onSuccess: (_, id) => {
            queryClient.setQueryData(['coach-check-ins'], (old: CheckIn[] | undefined) => {
                return old?.filter(c => c.id !== id);
            });
            toast.success('Check-in deleted successfully');
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Failed to delete check-in');
        }
    });

    const duplicateMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: CheckIn }) => duplicateCheckIn(id, data),
        onSuccess: (newCheckIn) => {
            queryClient.setQueryData(['coach-check-ins'], (old: CheckIn[] | undefined) => {
                return old ? [newCheckIn, ...old] : [newCheckIn];
            });
            toast.success('Check-in duplicated successfully');
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Failed to duplicate check-in');
        }
    });

    return {
        checkIns: checkIns || [],
        isLoading,
        error,
        createCheckIn: createMutation.mutateAsync,
        deleteCheckIn: deleteMutation.mutateAsync,
        duplicateCheckIn: duplicateMutation.mutateAsync,
        isCreating: createMutation.isPending,
        isDeleting: deleteMutation.isPending,
        isDuplicating: duplicateMutation.isPending,
    };
}
