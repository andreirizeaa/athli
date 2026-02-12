import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  FileFolder,
  CoachFile,
  CreateFileFolderInput,
  UpdateFileFolderInput,
  getAllFileFolders,
  createFileFolder,
  updateFileFolder,
  deleteFileFolder,
  moveFile,
  getFilesInFolder,
} from '@/api/coach/coach-file-service';
import { toast } from 'sonner';

export function useCoachFileFolders(options?: { enabled?: boolean }) {
  const queryClient = useQueryClient();

  const {
    data: folders,
    isLoading,
    error
  } = useQuery({
    queryKey: ['coach-file-folders'],
    queryFn: () => getAllFileFolders(),
    staleTime: 5 * 60 * 1000,
    enabled: options?.enabled !== false,
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateFileFolderInput) => createFileFolder(data),
    onSuccess: (data) => {
      queryClient.setQueryData(['coach-file-folders'], (old: FileFolder[] | undefined) => {
        return old ? [data, ...old] : [data];
      });
      toast.success('Folder created successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create folder');
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateFileFolderInput }) =>
      updateFileFolder(id, data),
    onSuccess: (data) => {
      queryClient.setQueryData(['coach-file-folders'], (old: FileFolder[] | undefined) => {
        return old?.map(f => f.id === data.id ? data : f);
      });
      toast.success('Folder updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update folder');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteFileFolder(id),
    onSuccess: (_, id) => {
      queryClient.setQueryData(['coach-file-folders'], (old: FileFolder[] | undefined) => {
        return old?.filter(f => f.id !== id);
      });
      // Also invalidate files query since items in the folder are now unfiled
      queryClient.invalidateQueries({ queryKey: ['coach-files'] });
      toast.success('Folder deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete folder');
    }
  });

  const moveMutation = useMutation({
    mutationFn: ({ fileId, folderId, silent }: { fileId: string; folderId: string | null; silent?: boolean }) =>
      moveFile(fileId, folderId),
    onSuccess: (data, variables) => {
      // Update the file in the cache
      queryClient.setQueryData(['coach-files'], (old: CoachFile[] | undefined) => {
        return old?.map(f => f.id === data.id ? data : f);
      });
      // Invalidate folder-specific queries
      queryClient.invalidateQueries({ queryKey: ['coach-files-folder'] });
      if (!variables.silent) {
        toast.success('File moved successfully');
      }
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to move file');
    }
  });

  return {
    folders: folders || [],
    isLoading,
    error,
    createFolder: createMutation.mutateAsync,
    updateFolder: updateMutation.mutateAsync,
    deleteFolder: deleteMutation.mutateAsync,
    moveFile: moveMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isMoving: moveMutation.isPending,
  };
}

export function useFilesInFolder(folderId: string | null, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['coach-files-folder', folderId],
    queryFn: () => folderId ? getFilesInFolder(folderId) : Promise.resolve([]),
    staleTime: 5 * 60 * 1000,
    enabled: options?.enabled !== false && !!folderId,
  });
}
