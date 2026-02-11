import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  MetricFolder,
  Metric,
  CreateMetricFolderInput,
  UpdateMetricFolderInput,
  getAllMetricFolders,
  createMetricFolder,
  updateMetricFolder,
  deleteMetricFolder,
  moveMetric,
  getMetricsInFolder,
} from '@/api/coach/coach-metric-service';
import { toast } from 'sonner';

export function useCoachMetricFolders(options?: { enabled?: boolean }) {
  const queryClient = useQueryClient();

  const {
    data: folders,
    isLoading,
    error
  } = useQuery({
    queryKey: ['coach-metric-folders'],
    queryFn: () => getAllMetricFolders(),
    staleTime: 5 * 60 * 1000,
    enabled: options?.enabled !== false,
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateMetricFolderInput) => createMetricFolder(data),
    onSuccess: (data) => {
      queryClient.setQueryData(['coach-metric-folders'], (old: MetricFolder[] | undefined) => {
        return old ? [data, ...old] : [data];
      });
      toast.success('Folder created successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create folder');
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateMetricFolderInput }) =>
      updateMetricFolder(id, data),
    onSuccess: (data) => {
      queryClient.setQueryData(['coach-metric-folders'], (old: MetricFolder[] | undefined) => {
        return old?.map(f => f.id === data.id ? data : f);
      });
      toast.success('Folder updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update folder');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteMetricFolder(id),
    onSuccess: (_, id) => {
      queryClient.setQueryData(['coach-metric-folders'], (old: MetricFolder[] | undefined) => {
        return old?.filter(f => f.id !== id);
      });
      // Also invalidate metrics query since items in the folder are now unfiled
      queryClient.invalidateQueries({ queryKey: ['coach-metrics'] });
      toast.success('Folder deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete folder');
    }
  });

  const moveMutation = useMutation({
    mutationFn: ({ metricId, folderId, silent }: { metricId: string; folderId: string | null; silent?: boolean }) =>
      moveMetric(metricId, folderId),
    onSuccess: (data, variables) => {
      // Update the metric in the cache
      queryClient.setQueryData(['coach-metrics'], (old: Metric[] | undefined) => {
        return old?.map(m => m.id === data.id ? data : m);
      });
      // Invalidate folder-specific queries
      queryClient.invalidateQueries({ queryKey: ['coach-metrics-folder'] });
      if (!variables.silent) {
        toast.success('Metric moved successfully');
      }
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to move metric');
    }
  });

  return {
    folders: folders || [],
    isLoading,
    error,
    createFolder: createMutation.mutateAsync,
    updateFolder: updateMutation.mutateAsync,
    deleteFolder: deleteMutation.mutateAsync,
    moveMetric: moveMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isMoving: moveMutation.isPending,
  };
}

export function useMetricsInFolder(folderId: string | null, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['coach-metrics-folder', folderId],
    queryFn: () => folderId ? getMetricsInFolder(folderId) : Promise.resolve([]),
    staleTime: 5 * 60 * 1000,
    enabled: options?.enabled !== false && !!folderId,
  });
}
