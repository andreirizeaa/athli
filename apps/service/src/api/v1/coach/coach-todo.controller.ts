import { Request, Response } from 'express';
import { success, unauthorized, created, noContent } from '../../../utils/http-response';
import { getSupabaseClient } from '../../../services/supabase.service';

export const coachTodoController = {
    /**
     * Get all "Your List" todos for a coach
     */
    getOwnTodos: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        if (!userId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        const supabase = getSupabaseClient();
        const { data: todos, error } = await supabase
            .from('coach_own_todolist')
            .select('*, client:user_profiles!fk_own_todo_client_user(name, profile_picture_url)')
            .eq('coach_id', userId)
            .order('due_date', { ascending: true });

        if (error) {
            return res.status(500).json({ success: false, message: error.message });
        }

        // Transform data to match frontend expectations if needed
        const transformedTodos = todos.map(todo => ({
            ...todo,
            clientName: (todo.client as any)?.name,
            clientAvatar: (todo.client as any)?.profile_picture_url,
        }));

        success(res, {
            message: 'Coach own todos retrieved successfully',
            data: { todos: transformedTodos },
        });
    },

    /**
     * Create a new "Your List" todo
     */
    createOwnTodo: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        const { title, information, type, client_id, due_date } = req.body;

        if (!userId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        const supabase = getSupabaseClient();
        const { data: todo, error } = await supabase
            .from('coach_own_todolist')
            .insert({
                coach_id: userId,
                title,
                information,
                type,
                client_id: type === 'client' ? client_id : null,
                due_date,
                completed: false,
            })
            .select('*, client:user_profiles!fk_own_todo_client_user(name, profile_picture_url)')
            .single();

        if (error) {
            return res.status(500).json({ success: false, message: error.message });
        }

        const transformedTodo = {
            ...todo,
            clientName: (todo.client as any)?.name,
            clientAvatar: (todo.client as any)?.profile_picture_url,
        };

        created(res, {
            message: 'Coach todo created successfully',
            data: { todo: transformedTodo },
        });
    },

    /**
     * Update an existing "Your List" todo
     */
    updateOwnTodo: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        const { id } = req.params;
        const updates = req.body;

        if (!userId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        const supabase = getSupabaseClient();
        const { data: todo, error } = await supabase
            .from('coach_own_todolist')
            .update({
                ...updates,
                updated_at: new Date().toISOString(),
            })
            .eq('id', id)
            .eq('coach_id', userId)
            .select('*, client:user_profiles!fk_own_todo_client_user(name, profile_picture_url)')
            .single();

        if (error) {
            return res.status(500).json({ success: false, message: error.message });
        }

        const transformedTodo = {
            ...todo,
            clientName: (todo.client as any)?.name,
            clientAvatar: (todo.client as any)?.profile_picture_url,
        };

        success(res, {
            message: 'Coach todo updated successfully',
            data: { todo: transformedTodo },
        });
    },

    /**
     * Delete a "Your List" todo
     */
    deleteOwnTodo: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        const { id } = req.params;

        if (!userId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        const supabase = getSupabaseClient();
        const { error } = await supabase
            .from('coach_own_todolist')
            .delete()
            .eq('id', id)
            .eq('coach_id', userId);

        if (error) {
            return res.status(500).json({ success: false, message: error.message });
        }

        noContent(res);
    },

    /**
     * Get all "Athli Assistant" todos for a coach
     */
    getAutoTodos: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        if (!userId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        const supabase = getSupabaseClient();
        const { data: todos, error } = await supabase
            .from('coach_auto_todolist')
            .select('*, client:user_profiles!fk_auto_todo_client_user(name, profile_picture_url)')
            .eq('coach_id', userId)
            .order('created_at', { ascending: false });

        if (error) {
            return res.status(500).json({ success: false, message: error.message });
        }

        const transformedTodos = todos.map(todo => ({
            ...todo,
            clientName: (todo.client as any)?.name,
            clientAvatar: (todo.client as any)?.profile_picture_url,
        }));

        success(res, {
            message: 'Coach auto todos retrieved successfully',
            data: { todos: transformedTodos },
        });
    },

    /**
     * Complete an "Athli Assistant" todo (deletes it)
     */
    deleteAutoTodo: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        const { id } = req.params;

        if (!userId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        const supabase = getSupabaseClient();
        const { error } = await supabase
            .from('coach_auto_todolist')
            .delete()
            .eq('id', id)
            .eq('coach_id', userId);

        if (error) {
            return res.status(500).json({ success: false, message: error.message });
        }

        noContent(res);
    },
};
