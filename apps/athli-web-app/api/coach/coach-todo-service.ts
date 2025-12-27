import { apiFetch } from '../api-client';

export interface YourListTask {
    id: string;
    title: string;
    information?: string;
    type: 'client' | 'general';
    clientId?: string;
    clientName?: string;
    clientAvatar?: string;
    dueDate: string; // ISO string
    completed: boolean;
}

export interface AthliAssistantTask {
    id: string;
    title: string;
    type: 'client' | 'general';
    clientName?: string; // Potential context
    clientAvatar?: string;
    completed: boolean;
}

export interface CreateTaskData {
    title: string;
    information?: string;
    type: 'client' | 'general';
    client_id?: string;
    due_date: string;
}

export interface UpdateTaskData extends Partial<CreateTaskData> {
    completed?: boolean;
}

/**
 * Service for "Your List" (coach_own_todolist)
 */
export const getOwnTodos = async (): Promise<YourListTask[]> => {
    const response = await apiFetch<{ data: { todos: any[] } }>('/coach/todo/own');
    return response.data.todos.map(todo => ({
        ...todo,
        dueDate: todo.due_date,
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
