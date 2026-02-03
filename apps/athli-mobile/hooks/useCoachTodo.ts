import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getOwnTodos,
  createOwnTodo,
  updateOwnTodo,
  deleteOwnTodo,
  getAutoTodos,
  deleteAutoTodo,
  type CreateTaskData,
  type UpdateTaskData,
  type YourListTask,
} from '@/services/coach/coach-todo-service';

export const useCoachOwnTodos = (options?: { enabled?: boolean }) => {
  const queryClient = useQueryClient();

  const {
    data: ownTodos = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['coach-own-todos'],
    queryFn: getOwnTodos,
    enabled: options?.enabled !== false,
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateTaskData) => createOwnTodo(data),
    onSuccess: (newTodo) => {
      queryClient.setQueryData(['coach-own-todos'], (old: YourListTask[] | undefined) => {
        // Append to end to avoid scroll jump when adding items
        return old ? [...old, newTodo] : [newTodo];
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateTaskData }) => updateOwnTodo(id, data),
    onSuccess: (updatedTodo) => {
      queryClient.setQueryData(['coach-own-todos'], (old: YourListTask[] | undefined) => {
        return old?.map((t) => (t.id === updatedTodo.id ? updatedTodo : t));
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteOwnTodo(id),
    onSuccess: (_, id) => {
      queryClient.setQueryData(['coach-own-todos'], (old: YourListTask[] | undefined) => {
        return old?.filter((t) => t.id !== id);
      });
    },
  });

  return {
    ownTodos,
    isLoading,
    refetch,
    createOwnTodo: createMutation.mutateAsync,
    updateOwnTodo: updateMutation.mutateAsync,
    deleteOwnTodo: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
};

export const useCoachAutoTodos = (options?: { enabled?: boolean }) => {
  const queryClient = useQueryClient();

  const {
    data: autoTodos = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['coach-auto-todos'],
    queryFn: getAutoTodos,
    enabled: options?.enabled !== false,
  });

  const completeMutation = useMutation({
    mutationFn: (id: string) => deleteAutoTodo(id),
    onSuccess: (_, id) => {
      queryClient.setQueryData(['coach-auto-todos'], (old: any[] | undefined) => {
        return old?.filter((t) => t.id !== id);
      });
    },
  });

  return {
    autoTodos,
    isLoading,
    refetch,
    completeAutoTodo: completeMutation.mutateAsync,
    isCompleting: completeMutation.isPending,
  };
};
