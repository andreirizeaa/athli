
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    getExercises,
    createExercise,
    editExercise,
    deleteExercises,
    starExercises,
    archiveExercises,
    type Exercise,
    type ExercisePayload
} from '@/api/coach/coach-exercise-service';
import { toast } from 'sonner';

export function useCoachExercises(options?: { enabled?: boolean }) {
    const queryClient = useQueryClient();

    const {
        data: exercises,
        isLoading,
        error
    } = useQuery({
        queryKey: ['coach-exercises'],
        queryFn: () => getExercises(),
        staleTime: 5 * 60 * 1000,
        enabled: options?.enabled !== false,
    });

    const createMutation = useMutation({
        mutationFn: (data: ExercisePayload) => createExercise(data),
        onSuccess: (newExercise) => {
            queryClient.setQueryData(['coach-exercises'], (old: Exercise[] | undefined) => {
                return old ? [newExercise, ...old] : [newExercise];
            });
            toast.success('Exercise created successfully');
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Failed to create exercise');
        }
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: Partial<ExercisePayload> }) => editExercise(id, data),
        onSuccess: (updatedExercise) => {
            queryClient.setQueryData(['coach-exercises'], (old: Exercise[] | undefined) => {
                return old?.map(e => e.id === updatedExercise.id ? updatedExercise : e);
            });
            toast.success('Exercise updated successfully');
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Failed to update exercise');
        }
    });

    const deleteMutation = useMutation({
        mutationFn: (ids: string | string[]) => deleteExercises(ids),
        onSuccess: (_, ids) => {
            const idsArray = Array.isArray(ids) ? ids : [ids];
            queryClient.setQueryData(['coach-exercises'], (old: Exercise[] | undefined) => {
                return old?.filter(e => !idsArray.includes(e.id));
            });
            toast.success('Exercise(s) deleted successfully');
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Failed to delete exercise(s)');
        }
    });

    const starMutation = useMutation({
        mutationFn: ({ ids, starred }: { ids: string | string[]; starred: boolean }) => starExercises(ids, starred),
        onSuccess: (_, { ids, starred }) => {
            const idsArray = Array.isArray(ids) ? ids : [ids];
            queryClient.setQueryData(['coach-exercises'], (old: Exercise[] | undefined) => {
                return old?.map(e => idsArray.includes(e.id) ? { ...e, starred } : e);
            });
            toast.success(starred ? 'Exercise(s) starred' : 'Exercise(s) unstarred');
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Failed to update star status');
        }
    });

    return {
        exercises: exercises || [],
        isLoading,
        error,
        createExercise: createMutation.mutateAsync,
        updateExercise: updateMutation.mutateAsync,
        deleteExercises: deleteMutation.mutateAsync,
        starExercises: starMutation.mutateAsync,
        isCreating: createMutation.isPending,
        isUpdating: updateMutation.isPending,
        isDeleting: deleteMutation.isPending,
    };
}
