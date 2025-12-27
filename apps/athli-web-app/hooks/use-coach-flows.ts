import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getFlows, duplicateFlow, deleteFlow, type Flow } from '@/api/coach/coach-flow-service';
import { toast } from 'sonner';

export function useCoachFlows() {
    const queryClient = useQueryClient();

    const {
        data: flows,
        isLoading,
        error
    } = useQuery({
        queryKey: ['coach-flows'],
        queryFn: () => getFlows(),
        staleTime: 5 * 60 * 1000, // 5 minutes
        gcTime: 10 * 60 * 1000, // 10 minutes
    });

    const duplicateMutation = useMutation({
        mutationFn: (flowId: string) => duplicateFlow(flowId),
        onSuccess: (newFlow) => {
            queryClient.setQueryData(['coach-flows'], (old: Flow[] | undefined) => {
                return old ? [...old, newFlow] : [newFlow];
            });
            toast.success('Flow duplicated successfully');
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Failed to duplicate flow');
        }
    });

    const deleteMutation = useMutation({
        mutationFn: (flowId: string) => deleteFlow(flowId),
        onSuccess: (_, flowId) => {
            queryClient.setQueryData(['coach-flows'], (old: Flow[] | undefined) => {
                return old?.filter(f => f.id !== flowId);
            });
            toast.success('Flow deleted successfully');
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Failed to delete flow');
        }
    });

    return {
        flows: flows || [],
        isLoading,
        error,
        duplicateFlow: duplicateMutation.mutateAsync,
        isDuplicating: duplicateMutation.isPending,
        deleteFlow: deleteMutation.mutateAsync,
        isDeleting: deleteMutation.isPending,
    };
}
