import { Request, Response } from 'express';
import { success, unauthorized, created, forbidden, internalError, notFound } from '../../../utils/http-response';
import { getSupabaseClient } from '../../../services/supabase.service';

export const coachProgramsController = {
    /**
     * Get all programs for a coach
     */
    getPrograms: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        if (!userId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        const supabase = getSupabaseClient();
        const { data: programs, error } = await supabase
            .from('coach_programs')
            .select('*')
            .eq('coach_id', userId)
            .order('created_at', { ascending: false });

        if (error) {
            return internalError(res, { message: error.message });
        }

        success(res, {
            message: 'Coach programs retrieved successfully',
            data: { programs },
        });
    },

    /**
     * Get a single program by ID
     */
    getProgramById: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        const { id } = req.params;

        if (!userId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        const supabase = getSupabaseClient();
        const { data: program, error } = await supabase
            .from('coach_programs')
            .select('*')
            .eq('id', id)
            .eq('coach_id', userId)
            .single();

        if (error || !program) {
            return notFound(res, { message: 'Program not found' });
        }

        success(res, {
            message: 'Coach program retrieved successfully',
            data: { program },
        });
    },

    /**
     * Create a new coach program
     */
    createProgram: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        const { name, description, category, program_data } = req.body;

        if (!userId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        if (!name) {
            return res.status(400).json({ success: false, message: 'Program name is required' });
        }

        const supabase = getSupabaseClient();
        const { data: program, error } = await supabase
            .from('coach_programs')
            .insert({
                coach_id: userId,
                name,
                description,
                program_data: program_data || {},
            })
            .select()
            .single();

        if (error) {
            return internalError(res, { message: error.message });
        }

        created(res, {
            message: 'Coach program created successfully',
            data: { program },
        });
    },

    /**
     * Update an existing coach program
     */
    updateProgram: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        const { id } = req.params;
        const updates = req.body;

        if (!userId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        const supabase = getSupabaseClient();

        // Ensure ownership
        const { data: existing, error: fetchError } = await supabase
            .from('coach_programs')
            .select('coach_id')
            .eq('id', id)
            .single();

        if (fetchError || !existing) {
            return notFound(res, { message: 'Program not found' });
        }

        if (existing.coach_id !== userId) {
            return forbidden(res, { message: 'Forbidden' });
        }

        const { data: program, error } = await supabase
            .from('coach_programs')
            .update({
                ...updates,
                updated_at: new Date().toISOString(),
            })
            .eq('id', id)
            .select()
            .single();

        if (error) {
            return internalError(res, { message: error.message });
        }

        success(res, {
            message: 'Coach program updated successfully',
            data: { program },
        });
    },

    /**
     * Delete a coach program
     */
    deleteProgram: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        const { id } = req.params;

        if (!userId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        const supabase = getSupabaseClient();

        const { error } = await supabase
            .from('coach_programs')
            .delete()
            .eq('id', id)
            .eq('coach_id', userId);

        if (error) {
            return internalError(res, { message: error.message });
        }

        success(res, {
            message: 'Coach program deleted successfully',
        });
    },

    /**
     * Duplicate a program
     */
    duplicateProgram: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        const { id } = req.params;

        if (!userId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        const supabase = getSupabaseClient();

        // Fetch original
        const { data: original, error: fetchError } = await supabase
            .from('coach_programs')
            .select('*')
            .eq('id', id)
            .eq('coach_id', userId)
            .single();

        if (fetchError || !original) {
            return notFound(res, { message: 'Program not found' });
        }

        // Create copy
        const { data: program, error: createError } = await supabase
            .from('coach_programs')
            .insert({
                coach_id: userId,
                name: `${original.name} (Copy)`,
                description: original.description,
                program_data: original.program_data,
            })
            .select()
            .single();

        if (createError) {
            return internalError(res, { message: createError.message });
        }

        created(res, {
            message: 'Coach program duplicated successfully',
            data: { program },
        });
    },
};
