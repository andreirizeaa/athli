import { Request, Response } from 'express';
import { success, unauthorized, created, forbidden, internalError, notFound } from '../../../utils/http-response';
import { getSupabaseClient } from '../../../services/supabase.service';

export const coachSectionsController = {
    /**
     * Get all sections for a coach
     */
    getSections: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        if (!userId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        const supabase = getSupabaseClient();
        const { data: sections, error } = await supabase
            .from('coach_sections')
            .select('*')
            .eq('coach_id', userId)
            .order('created_at', { ascending: false });

        if (error) {
            return internalError(res, { message: error.message });
        }

        success(res, {
            message: 'Coach sections retrieved successfully',
            data: { sections },
        });
    },

    /**
     * Create a new coach section
     */
    createSection: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        const { title, description, section_type, section_data, total_exercises } = req.body;

        if (!userId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        if (!title) {
            return res.status(400).json({ success: false, message: 'Section title is required' });
        }

        if (!section_type) {
            return res.status(400).json({ success: false, message: 'Section type is required' });
        }

        // Clean section_data - keep only items array
        const cleanSectionData = section_data ? {
            items: section_data.items || [],
        } : { items: [] };

        const supabase = getSupabaseClient();
        const { data: section, error } = await supabase
            .from('coach_sections')
            .insert({
                coach_id: userId,
                name: title,
                description,
                section_type,
                section_data: cleanSectionData,
                number_of_exercises: total_exercises || 0,
            })
            .select()
            .single();

        if (error) {
            return internalError(res, { message: error.message });
        }

        created(res, {
            message: 'Coach section created successfully',
            data: { section },
        });
    },

    /**
     * Update an existing coach section
     */
    updateSection: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        const { id, ...updates } = req.body;

        if (!userId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        if (!id) {
            return res.status(400).json({ success: false, message: 'Section ID is required' });
        }

        const supabase = getSupabaseClient();

        // Ensure ownership
        const { data: existing, error: fetchError } = await supabase
            .from('coach_sections')
            .select('coach_id')
            .eq('id', id)
            .single();

        if (fetchError || !existing) {
            return notFound(res, { message: 'Section not found' });
        }

        if (existing.coach_id !== userId) {
            return forbidden(res, { message: 'Forbidden' });
        }

        // Map frontend fields to backend fields
        const { title, section_data, total_exercises, ...rest } = updates;

        // Clean section_data if provided
        const cleanSectionData = section_data ? {
            items: section_data.items || [],
        } : undefined;

        const mappedUpdates = {
            ...rest,
            ...(title ? { name: title } : {}),
            ...(cleanSectionData ? { section_data: cleanSectionData } : {}),
            ...(total_exercises !== undefined ? { number_of_exercises: total_exercises } : {}),
            updated_at: new Date().toISOString(),
        };

        const { data: section, error } = await supabase
            .from('coach_sections')
            .update(mappedUpdates)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            return internalError(res, { message: error.message });
        }

        success(res, {
            message: 'Coach section updated successfully',
            data: { section },
        });
    },

    /**
     * Get section by ID
     */
    getSectionById: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        const { id } = req.body;

        if (!userId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        if (!id) {
            return res.status(400).json({ success: false, message: 'Section ID is required' });
        }

        const supabase = getSupabaseClient();
        const { data: section, error } = await supabase
            .from('coach_sections')
            .select('*')
            .eq('id', id)
            .eq('coach_id', userId)
            .single();

        if (error || !section) {
            return notFound(res, { message: 'Section not found' });
        }

        success(res, {
            message: 'Coach section retrieved successfully',
            data: { section },
        });
    },

    /**
     * Get sections by IDs
     */
    getSectionsByIds: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        const { ids } = req.body;

        if (!userId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ success: false, message: 'Section IDs are required' });
        }

        const supabase = getSupabaseClient();
        const { data: sections, error } = await supabase
            .from('coach_sections')
            .select('*')
            .in('id', ids)
            .eq('coach_id', userId);

        if (error) {
            return internalError(res, { message: error.message });
        }

        success(res, {
            message: 'Coach sections retrieved successfully',
            data: { sections },
        });
    },

    /**
     * Delete a coach section
     */
    deleteSection: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        const { id } = req.body;

        if (!userId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        if (!id) {
            return res.status(400).json({ success: false, message: 'Section ID is required' });
        }

        const supabase = getSupabaseClient();

        // Ensure ownership
        const { data: existing, error: fetchError } = await supabase
            .from('coach_sections')
            .select('coach_id')
            .eq('id', id)
            .single();

        if (fetchError || !existing) {
            return notFound(res, { message: 'Section not found' });
        }

        if (existing.coach_id !== userId) {
            return forbidden(res, { message: 'Forbidden' });
        }

        const { error } = await supabase
            .from('coach_sections')
            .delete()
            .eq('id', id);

        if (error) {
            return internalError(res, { message: error.message });
        }

        success(res, {
            message: 'Coach section deleted successfully',
            data: {},
        });
    },

    /**
     * Duplicate a coach section
     */
    duplicateSection: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        const { id } = req.body;

        if (!userId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        if (!id) {
            return res.status(400).json({ success: false, message: 'Section ID is required' });
        }

        const supabase = getSupabaseClient();

        // Get existing section
        const { data: existing, error: fetchError } = await supabase
            .from('coach_sections')
            .select('*')
            .eq('id', id)
            .eq('coach_id', userId)
            .single();

        if (fetchError || !existing) {
            return notFound(res, { message: 'Section not found' });
        }

        // Create duplicate with "Copy" suffix
        const { data: section, error } = await supabase
            .from('coach_sections')
            .insert({
                coach_id: userId,
                name: `${existing.name} (Copy)`,
                description: existing.description,
                section_type: existing.section_type,
                section_data: existing.section_data,
                number_of_exercises: existing.number_of_exercises,
            })
            .select()
            .single();

        if (error) {
            return internalError(res, { message: error.message });
        }

        created(res, {
            message: 'Coach section duplicated successfully',
            data: { section },
        });
    },

    /**
     * Toggle favorite status for a section
     */
    toggleFavorite: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        const { id } = req.body;

        if (!userId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        if (!id) {
            return res.status(400).json({ success: false, message: 'Section ID is required' });
        }

        const supabase = getSupabaseClient();

        // Get current favorite status
        const { data: existing, error: fetchError } = await supabase
            .from('coach_sections')
            .select('is_favourite')
            .eq('id', id)
            .eq('coach_id', userId)
            .single();

        if (fetchError || !existing) {
            return notFound(res, { message: 'Section not found' });
        }

        // Toggle favorite
        const { data: section, error } = await supabase
            .from('coach_sections')
            .update({
                is_favourite: !existing.is_favourite,
                updated_at: new Date().toISOString(),
            })
            .eq('id', id)
            .select()
            .single();

        if (error) {
            return internalError(res, { message: error.message });
        }

        success(res, {
            message: 'Section favorite status updated',
            data: { section },
        });
    },
};
