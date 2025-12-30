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

        // Extract metadata from program_data to store in table columns
        const type = program_data?.type || '';
        const difficulty = program_data?.difficulty || '';
        const weeks = program_data?.weeks ? parseInt(program_data.weeks, 10) : null;

        // Clean program_data to only contain the program structure (schema/days array)
        const cleanProgramData = program_data ? {
            ...(program_data.schema && { schema: program_data.schema }),
            ...(program_data.days && { days: program_data.days }),
        } : {};

        const supabase = getSupabaseClient();
        const { data: program, error } = await supabase
            .from('coach_programs')
            .insert({
                coach_id: userId,
                name,
                description,
                type,
                difficulty,
                weeks,
                program_data: cleanProgramData,
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

        // Extract program_data if provided and clean it
        const { program_data, ...rest } = updates;

        let cleanProgramData = undefined;
        let extractedMetadata: any = {};

        if (program_data) {
            // Extract metadata from program_data
            if (program_data.type) extractedMetadata.type = program_data.type;
            if (program_data.difficulty) extractedMetadata.difficulty = program_data.difficulty;
            if (program_data.weeks) extractedMetadata.weeks = parseInt(program_data.weeks, 10);

            // Clean program_data to only contain structure
            cleanProgramData = {
                ...(program_data.schema && { schema: program_data.schema }),
                ...(program_data.days && { days: program_data.days }),
            };
        }

        const { data: program, error } = await supabase
            .from('coach_programs')
            .update({
                ...rest,
                ...extractedMetadata,
                ...(cleanProgramData !== undefined && { program_data: cleanProgramData }),
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

        // Create copy with metadata columns
        const { data: program, error: createError } = await supabase
            .from('coach_programs')
            .insert({
                coach_id: userId,
                name: `${original.name} (Copy)`,
                description: original.description,
                type: original.type,
                difficulty: original.difficulty,
                weeks: original.weeks,
                program_data: original.program_data,
                is_favourite: false, // Reset favourite on duplicate
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

    /**
     * Toggle favorite status
     */
    toggleFavorite: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        const { id } = req.params;
        const { isFavourite } = req.body;

        if (!userId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        if (typeof isFavourite !== 'boolean') {
            return res.status(400).json({ success: false, message: 'isFavourite boolean is required' });
        }

        const supabase = getSupabaseClient();

        const { data: program, error } = await supabase
            .from('coach_programs')
            .update({
                is_favourite: isFavourite,
                updated_at: new Date().toISOString(),
            })
            .eq('id', id)
            .eq('coach_id', userId)
            .select()
            .single();

        if (error) {
            return internalError(res, { message: error.message });
        }

        if (!program) {
            return notFound(res, { message: 'Program not found' });
        }

        success(res, {
            message: `Program ${isFavourite ? 'starred' : 'unstarred'} successfully`,
            data: { program },
        });
    },
};
