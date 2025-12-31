
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    getTrainingCalendarRange,
    getTrainingCalendarCompletionLogs,
    updateTrainingCalendar,
    type TrainingCalendarSchema,
    type TrainingCalendarCompletionLogs
} from '@/api/client/client-service';
import {
    assignWorkout,
    deleteClientWorkout,
    type AssignWorkoutData
} from '@/api/client/client-training-service';
import { toast } from 'sonner';

export function useClientTraining(clientId: string) {
    const queryClient = useQueryClient();

    // Hook for fetching training calendar range
    const useCalendarRange = (startDate: string, endDate: string, options?: { enabled?: boolean }) => {
        return useQuery({
            queryKey: ['client-training-calendar', clientId, startDate, endDate],
            queryFn: () => getTrainingCalendarRange(clientId, startDate, endDate),
            enabled: !!clientId && !!startDate && !!endDate && options?.enabled !== false,
            staleTime: 5 * 60 * 1000, // 5 minutes
        });
    };

    // Hook for fetching completion logs
    const useCompletionLogs = (options?: { enabled?: boolean }) => {
        return useQuery({
            queryKey: ['client-training-completion', clientId],
            queryFn: () => getTrainingCalendarCompletionLogs(clientId),
            enabled: !!clientId && options?.enabled !== false,
            staleTime: 5 * 60 * 1000, // 5 minutes
        });
    };

    // Mutation for assigning/updating workout
    const assignWorkoutMutation = useMutation({
        mutationFn: (data: AssignWorkoutData) => assignWorkout(data),
        onSuccess: (_, variables) => {
            // Invalidate calendar queries to refetch updated data
            // We invalidate specific range queries or all calendar queries for this client
            if (!variables.skipInvalidation) {
                queryClient.invalidateQueries({ queryKey: ['client-training-calendar', clientId] });
            }
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Failed to save workout');
        }
    });

    // Mutation for deleting workout
    const deleteWorkoutMutation = useMutation({
        mutationFn: ({ workoutId, date }: { workoutId: string; date: string }) =>
            deleteClientWorkout(clientId, workoutId, date),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['client-training-calendar', clientId] });
            toast.success('Workout deleted successfully');
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Failed to delete workout');
        }
    });

    // Mutation for updating entire calendar (legacy/bulk?) 
    // The page uses `updateTrainingCalendar` but that seems to be a full schema update. 
    // Ideally we move away from full schema updates if we have granular ops, but I'll include it.
    const updateCalendarMutation = useMutation({
        mutationFn: (schema: TrainingCalendarSchema) => updateTrainingCalendar(clientId, schema),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['client-training-calendar', clientId] });
        },
        onError: (error: Error) => {
            console.error('Failed to update calendar', error);
        }
    });

    return {
        useCalendarRange,
        useCompletionLogs,
        assignWorkout: assignWorkoutMutation.mutateAsync,
        deleteWorkout: deleteWorkoutMutation.mutateAsync,
        updateCalendar: updateCalendarMutation.mutateAsync,
        isAssigning: assignWorkoutMutation.isPending,
        isDeleting: deleteWorkoutMutation.isPending,
        isUpdatingCalendar: updateCalendarMutation.isPending,
    };
}
