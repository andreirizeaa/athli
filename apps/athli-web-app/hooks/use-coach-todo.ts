import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
    getOwnTodos,
    createOwnTodo,
    updateOwnTodo,
    deleteOwnTodo,
    getAutoTodos,
    deleteAutoTodo,
    CreateTaskData,
    UpdateTaskData,
    YourListTask
} from '../api/coach/coach-todo-service';

export const useCoachTodo = (options?: { enabled?: boolean }) => {
    const queryClient = useQueryClient();

    // Own Todos (Your List)
    const { data: ownTodos = [], isLoading: isLoadingOwn } = useQuery({
        queryKey: ['coach-own-todos'],
        queryFn: getOwnTodos,
        enabled: options?.enabled !== false,
    });

    const createOwnMutation = useMutation({
        mutationFn: (data: CreateTaskData) => createOwnTodo(data),
        onSuccess: (newTodo) => {
            queryClient.setQueryData(['coach-own-todos'], (old: YourListTask[] | undefined) => {
                return old ? [newTodo, ...old] : [newTodo];
            });
            toast.success('Task added to your list');
        },
        onError: () => {
            toast.error('Failed to add task');
        }
    });

    const updateOwnMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: UpdateTaskData }) => updateOwnTodo(id, data),
        onSuccess: (updatedTodo) => {
            queryClient.setQueryData(['coach-own-todos'], (old: YourListTask[] | undefined) => {
                return old?.map(t => t.id === updatedTodo.id ? updatedTodo : t);
            });
            // We don't always want to show a toast for completion toggle
        },
        onError: () => {
            toast.error('Failed to update task');
        }
    });

    const deleteOwnMutation = useMutation({
        mutationFn: (id: string) => deleteOwnTodo(id),
        onSuccess: (_, id) => {
            queryClient.setQueryData(['coach-own-todos'], (old: YourListTask[] | undefined) => {
                return old?.filter(t => t.id !== id);
            });
            toast.success('Task completed');
        },
        onError: () => {
            toast.error('Failed to delete task');
        }
    });

    // Auto Todos (Athli Assistant)
    const { data: autoTodos = [], isLoading: isLoadingAuto } = useQuery({
        queryKey: ['coach-auto-todos'],
        queryFn: getAutoTodos,
        enabled: options?.enabled !== false,
    });

    const completeAutoMutation = useMutation({
        mutationFn: (id: string) => deleteAutoTodo(id),
        onSuccess: (_, id) => {
            queryClient.setQueryData(['coach-auto-todos'], (old: any[] | undefined) => {
                return old?.filter(t => t.id !== id);
            });
            toast.success('Task completed');
        },
        onError: () => {
            toast.error('Failed to complete task');
        }
    });

    return {
        ownTodos,
        isLoadingOwn,
        createOwnTodo: createOwnMutation.mutateAsync,
        updateOwnTodo: updateOwnMutation.mutateAsync,
        deleteOwnTodo: deleteOwnMutation.mutateAsync,

        autoTodos,
        isLoadingAuto,
        completeAutoTodo: completeAutoMutation.mutateAsync,
    };
};
