import { apiFetch } from '../api-client';

// Import shared types and re-export for backwards compatibility
export type {
  YourListTask,
  AthliAssistantTask,
  CreateTaskData,
  UpdateTaskData,
  TaskType,
} from '@athli/shared-types';

import type {
  YourListTask,
  AthliAssistantTask,
  CreateTaskData,
  UpdateTaskData,
} from '@athli/shared-types';

/**
 * Service for "Your List" (coach_own_todolist)
 */
export const getOwnTodos = async (): Promise<YourListTask[]> => {
    const response = await apiFetch<{ data: { todos: any[] } }>('/coach/todo/own');
    return response.data.todos.map(todo => ({
        ...todo,
        dueDate: todo.due_date,
        clientId: todo.client_id,
    }));
};

export const createOwnTodo = async (data: CreateTaskData): Promise<YourListTask> => {
    const response = await apiFetch<{ data: { todo: any } }>('/coach/todo/own', {
        method: 'POST',
        body: JSON.stringify(data) as any,
    });
    return {
        ...response.data.todo,
        dueDate: response.data.todo.due_date,
        clientId: response.data.todo.client_id,
    };
};

export const updateOwnTodo = async (id: string, data: UpdateTaskData): Promise<YourListTask> => {
    const response = await apiFetch<{ data: { todo: any } }>(`/coach/todo/own/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data) as any,
    });
    return {
        ...response.data.todo,
        dueDate: response.data.todo.due_date,
        clientId: response.data.todo.client_id,
    };
};

export const deleteOwnTodo = async (id: string): Promise<void> => {
    await apiFetch(`/coach/todo/own/${id}`, {
        method: 'DELETE',
    });
};

/**
 * Service for "Athli Assistant" (coach_auto_todolist)
 */
export const getAutoTodos = async (): Promise<AthliAssistantTask[]> => {
    const response = await apiFetch<{ data: { todos: any[] } }>('/coach/todo/auto');
    return response.data.todos;
};

export const deleteAutoTodo = async (id: string): Promise<void> => {
    await apiFetch(`/coach/todo/auto/${id}`, {
        method: 'DELETE',
    });
};
