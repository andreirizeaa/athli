import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  HabitFolder,
  Habit,
  CreateHabitFolderInput,
  UpdateHabitFolderInput,
  getAllHabitFolders,
  createHabitFolder,
  updateHabitFolder,
  deleteHabitFolder,
  moveHabit,
  getHabitsInFolder,
} from '@/api/coach/coach-habit-service';
import { toast } from 'sonner';

export function useCoachHabitFolders(options?: { enabled?: boolean }) {
  const queryClient = useQueryClient();

  const {
    data: folders,
    isLoading,
    error
  } = useQuery({
    queryKey: ['coach-habit-folders'],
    queryFn: () => getAllHabitFolders(),
    staleTime: 5 * 60 * 1000,
    enabled: options?.enabled !== false,
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateHabitFolderInput) => createHabitFolder(data),
    onSuccess: (data) => {
      queryClient.setQueryData(['coach-habit-folders'], (old: HabitFolder[] | undefined) => {
        return old ? [data, ...old] : [data];
      });
      toast.success('Folder created successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create folder');
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateHabitFolderInput }) =>
      updateHabitFolder(id, data),
    onSuccess: (data) => {
      queryClient.setQueryData(['coach-habit-folders'], (old: HabitFolder[] | undefined) => {
        return old?.map(f => f.id === data.id ? data : f);
      });
      toast.success('Folder updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update folder');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteHabitFolder(id),
    onSuccess: (_, id) => {
      queryClient.setQueryData(['coach-habit-folders'], (old: HabitFolder[] | undefined) => {
        return old?.filter(f => f.id !== id);
      });
      // Also invalidate habits query since items in the folder are now unfiled
      queryClient.invalidateQueries({ queryKey: ['coach-habits'] });
      toast.success('Folder deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete folder');
    }
  });

  const moveMutation = useMutation({
    mutationFn: ({ habitId, folderId }: { habitId: string; folderId: string | null }) =>
      moveHabit(habitId, folderId),
    onSuccess: (data) => {
      // Update the habit in the cache
      queryClient.setQueryData(['coach-habits'], (old: Habit[] | undefined) => {
        return old?.map(h => h.id === data.id ? data : h);
      });
      // Invalidate folder-specific queries
      queryClient.invalidateQueries({ queryKey: ['coach-habits-folder'] });
      toast.success('Habit moved successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to move habit');
    }
  });

  return {
    folders: folders || [],
    isLoading,
    error,
    createFolder: createMutation.mutateAsync,
    updateFolder: updateMutation.mutateAsync,
    deleteFolder: deleteMutation.mutateAsync,
    moveHabit: moveMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isMoving: moveMutation.isPending,
  };
}

export function useHabitsInFolder(folderId: string | null, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['coach-habits-folder', folderId],
    queryFn: () => folderId ? getHabitsInFolder(folderId) : Promise.resolve([]),
    staleTime: 5 * 60 * 1000,
    enabled: options?.enabled !== false && !!folderId,
  });
}
