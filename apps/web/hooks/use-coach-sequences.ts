import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSequences, deleteSequence, type Sequence } from '@/api/coach/coach-sequence-service';
import { toast } from 'sonner';

export function useCoachSequences(options?: { enabled?: boolean }) {
    const queryClient = useQueryClient();

    const {
        data: sequences,
        isLoading,
        error,
        refetch
    } = useQuery({
        queryKey: ['coach-sequences'],
        queryFn: () => getSequences(),
        staleTime: 5 * 60 * 1000, // 5 minutes
        gcTime: 10 * 60 * 1000, // 10 minutes
        enabled: options?.enabled !== false,
    });

    const deleteMutation = useMutation({
        mutationFn: (sequenceId: string) => deleteSequence(sequenceId),
        onSuccess: (_, sequenceId) => {
            queryClient.setQueryData(['coach-sequences'], (old: Sequence[] | undefined) => {
                return old?.filter(s => s.id !== sequenceId);
            });
            queryClient.invalidateQueries({ queryKey: ['coach-sequences-dropdown'] });
            toast.success('Sequence deleted successfully');
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Failed to delete sequence');
        }
    });

    return {
        sequences: sequences || [],
        isLoading,
        error: error as Error | null,
        refetch,
        deleteSequence: deleteMutation.mutateAsync,
        isDeleting: deleteMutation.isPending,
    };
}
