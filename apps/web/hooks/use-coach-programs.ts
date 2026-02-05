
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    getPrograms,
    createProgram,
    editProgram,
    deletePrograms,
    duplicateProgram,
    starPrograms,
    archivePrograms,
    ProgramData
} from '@/api/coach/coach-program-service';
import type { Program } from '@/components/app/app-shell';
import { toast } from 'sonner';

const EMPTY_ARRAY: any[] = [];

export function useCoachPrograms(options?: { enabled?: boolean }) {
    const queryClient = useQueryClient();

    const {
        data: programs,
        isLoading,
        error
    } = useQuery({
        queryKey: ['coach-programs'],
        queryFn: () => getPrograms(),
        staleTime: 5 * 60 * 1000,
        enabled: options?.enabled !== false,
    });

    const createMutation = useMutation({
        mutationFn: (data: ProgramData) => createProgram(data),
        onSuccess: (newProgram) => {
            queryClient.setQueryData(['coach-programs'], (old: Program[] | undefined) => {
                return old ? [newProgram, ...old] : [newProgram];
            });
            toast.success('Program created successfully');
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Failed to create program');
        }
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: ProgramData }) => editProgram(id, data),
        onSuccess: (updatedProgram) => {
            queryClient.setQueryData(['coach-programs'], (old: Program[] | undefined) => {
                return old?.map(p => p.id === updatedProgram.id ? updatedProgram : p);
            });
            toast.success('Program updated successfully');
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Failed to update program');
        }
    });

    const deleteMutation = useMutation({
        mutationFn: (ids: string | string[]) => deletePrograms(ids),
        onSuccess: (_, ids) => {
            const idsArray = Array.isArray(ids) ? ids : [ids];
            queryClient.setQueryData(['coach-programs'], (old: Program[] | undefined) => {
                return old?.filter(p => !idsArray.includes(p.id));
            });
            toast.success('Program(s) deleted successfully');
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Failed to delete program(s)');
        }
    });

    const duplicateMutation = useMutation({
        mutationFn: (id: string) => duplicateProgram(id),
        onSuccess: (newProgram) => {
            queryClient.setQueryData(['coach-programs'], (old: Program[] | undefined) => {
                return old ? [newProgram, ...old] : [newProgram];
            });
            toast.success('Program duplicated successfully');
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Failed to duplicate program');
        }
    });

    const starMutation = useMutation({
        mutationFn: ({ ids, starred }: { ids: string | string[]; starred: boolean }) => starPrograms(ids, starred),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['coach-programs'] });
            toast.success('Program updated');
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Failed to update program');
        }
    });

    return {
        programs: programs || EMPTY_ARRAY,
        isLoading,
        error,
        createProgram: createMutation.mutateAsync,
        updateProgram: updateMutation.mutateAsync,
        deletePrograms: deleteMutation.mutateAsync,
        duplicateProgram: duplicateMutation.mutateAsync,
        starPrograms: starMutation.mutateAsync,
        isCreating: createMutation.isPending,
        isUpdating: updateMutation.isPending,
        isDeleting: deleteMutation.isPending,
    };
}
