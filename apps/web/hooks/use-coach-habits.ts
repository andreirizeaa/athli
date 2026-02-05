import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Habit,
    AddHabitData,
    EditHabitData,
    getAllHabits,
    addHabit,
    editHabit,
    deleteHabit,
    duplicateHabit
} from '@/api/coach/coach-habit-service';
import { toast } from 'sonner';

export function useCoachHabits(options?: { enabled?: boolean }) {
    const queryClient = useQueryClient();

    const {
        data: habits,
        isLoading,
        error
    } = useQuery({
        queryKey: ['coach-habits'],
        queryFn: () => getAllHabits(),
        staleTime: 5 * 60 * 1000, // 5 minutes
        enabled: options?.enabled !== false,
    });

    const createMutation = useMutation({
        mutationFn: (newHabit: AddHabitData) => addHabit(newHabit),
        onSuccess: (data) => {
            queryClient.setQueryData(['coach-habits'], (old: Habit[] | undefined) => {
                return old ? [data, ...old] : [data];
            });
            toast.success('Habit created successfully');
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Failed to create habit');
        }
    });

    const updateMutation = useMutation({
        mutationFn: (data: EditHabitData) => editHabit(data),
        onSuccess: (_, variables) => {
            // Since editHabit returns void, we manually update the cache with the variables
            queryClient.setQueryData(['coach-habits'], (old: Habit[] | undefined) => {
                return old?.map(h => h.id === variables.id ? { ...h, ...variables } : h);
            });
            toast.success('Habit updated successfully');
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Failed to update habit');
        }
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => deleteHabit({ id }),
        onSuccess: (_, id) => {
            queryClient.setQueryData(['coach-habits'], (old: Habit[] | undefined) => {
                return old?.filter(h => h.id !== id);
            });
            toast.success('Habit deleted successfully');
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Failed to delete habit');
        }
    });

    const duplicateMutation = useMutation({
        mutationFn: (id: string) => duplicateHabit(id),
        onSuccess: (data) => {
            queryClient.setQueryData(['coach-habits'], (old: Habit[] | undefined) => {
                return old ? [data, ...old] : [data];
            });
            toast.success('Habit duplicated successfully');
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Failed to duplicate habit');
        }
    });

    return {
        habits: habits || [],
        isLoading,
        error,
        createHabit: createMutation.mutateAsync,
        updateHabit: updateMutation.mutateAsync,
        deleteHabit: deleteMutation.mutateAsync,
        duplicateHabit: duplicateMutation.mutateAsync,
        isCreating: createMutation.isPending,
        isUpdating: updateMutation.isPending,
        isDeleting: deleteMutation.isPending,
        isDuplicating: duplicateMutation.isPending,
    };
}
