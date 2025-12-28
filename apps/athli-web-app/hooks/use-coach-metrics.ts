import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Metric,
    CreateMetricInput,
    getAllMetrics,
    createMetric,
    updateMetric,
    deleteMetric,
    duplicateMetric
} from '@/api/coach/coach-metric-service';
import { toast } from 'sonner';

export function useCoachMetrics(options?: { enabled?: boolean }) {
    const queryClient = useQueryClient();

    const {
        data: metrics,
        isLoading,
        error
    } = useQuery({
        queryKey: ['coach-metrics'],
        queryFn: () => getAllMetrics(),
        staleTime: 5 * 60 * 1000, // 5 minutes
        enabled: options?.enabled !== false,
    });

    const createMutation = useMutation({
        mutationFn: (newMetric: CreateMetricInput) => createMetric(newMetric),
        onSuccess: (data) => {
            queryClient.setQueryData(['coach-metrics'], (old: Metric[] | undefined) => {
                return old ? [data, ...old] : [data];
            });
            toast.success('Metric created successfully');
        },
        onError: (error: any) => {
            toast.error(error.message || 'Failed to create metric');
        }
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, updates }: { id: string; updates: Partial<CreateMetricInput> }) =>
            updateMetric(id, updates),
        onSuccess: (data) => {
            queryClient.setQueryData(['coach-metrics'], (old: Metric[] | undefined) => {
                return old?.map(m => m.id === data.id ? data : m);
            });
            toast.success('Metric updated successfully');
        },
        onError: (error: any) => {
            toast.error(error.message || 'Failed to update metric');
        }
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => deleteMetric(id),
        onSuccess: (_, id) => {
            queryClient.setQueryData(['coach-metrics'], (old: Metric[] | undefined) => {
                return old?.filter(m => m.id !== id);
            });
            toast.success('Metric deleted successfully');
        },
        onError: (error: any) => {
            toast.error(error.message || 'Failed to delete metric');
        }
    });

    const duplicateMutation = useMutation({
        mutationFn: (id: string) => duplicateMetric(id),
        onSuccess: (data) => {
            queryClient.setQueryData(['coach-metrics'], (old: Metric[] | undefined) => {
                return old ? [data, ...old] : [data];
            });
            toast.success('Metric duplicated successfully');
        },
        onError: (error: any) => {
            toast.error(error.message || 'Failed to duplicate metric');
        }
    });

    return {
        metrics: metrics || [],
        isLoading,
        error,
        createMetric: createMutation.mutateAsync,
        updateMetric: updateMutation.mutateAsync,
        deleteMetric: deleteMutation.mutateAsync,
        duplicateMetric: duplicateMutation.mutateAsync,
        isCreating: createMutation.isPending,
        isUpdating: updateMutation.isPending,
        isDeleting: deleteMutation.isPending,
        isDuplicating: duplicateMutation.isPending,
    };
}
