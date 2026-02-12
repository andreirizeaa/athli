import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
    getAllFiles,
    uploadFile,
    updateFile,
    deleteFile,
    type CoachFile,
    type AddFileData,
    type UpdateFileData,
    type DeleteFileData,
} from '@/api/coach/coach-file-service';

export const useCoachFiles = (options?: { enabled?: boolean }) => {
    const queryClient = useQueryClient();

    const { data: files = [], isLoading } = useQuery({
        queryKey: ['coach-files'],
        queryFn: getAllFiles,
        staleTime: 5 * 60 * 1000, // 5 minutes
        enabled: options?.enabled !== false,
    });

    const uploadMutation = useMutation({
        mutationFn: (data: AddFileData & { file: File }) => uploadFile(data),
        onSuccess: (newFile) => {
            queryClient.setQueryData(['coach-files'], (old: CoachFile[] | undefined) => {
                return old ? [newFile, ...old] : [newFile];
            });
            toast.success('File uploaded successfully');
        },
        onError: (error: Error) => {
            if (error.message?.includes('duplicate key value violates unique constraint')) {
                toast.error('This file already exists');
            } else {
                toast.error(error.message || 'Failed to upload file');
            }
        }
    });

    const updateMutation = useMutation({
        mutationFn: (data: UpdateFileData) => updateFile(data),
        onSuccess: (updatedFile) => {
            queryClient.setQueryData(['coach-files'], (old: CoachFile[] | undefined) => {
                return old?.map(f => f.id === updatedFile.id ? updatedFile : f);
            });
            toast.success('File updated successfully');
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Failed to update file');
        }
    });

    const deleteMutation = useMutation({
        mutationFn: (data: DeleteFileData) => deleteFile(data),
        onSuccess: (_, variables) => {
            queryClient.setQueryData(['coach-files'], (old: CoachFile[] | undefined) => {
                return old?.filter(f => f.id !== variables.fileId);
            });
            toast.success('File deleted successfully');
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Failed to delete file');
        }
    });

    return {
        files,
        isLoading,
        uploadFile: uploadMutation.mutate,
        uploadFileAsync: uploadMutation.mutateAsync,
        updateFile: updateMutation.mutate,
        deleteFile: deleteMutation.mutate,
        isUploading: uploadMutation.isPending,
        isUpdating: updateMutation.isPending,
        isDeleting: deleteMutation.isPending,
    };
};
