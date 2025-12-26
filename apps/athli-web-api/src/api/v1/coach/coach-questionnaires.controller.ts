import { Request, Response } from 'express';
import { success, unauthorized, created } from '../../../utils/http-response';
import { getSupabaseClient } from '../../../services/supabase.service';

export const coachQuestionnairesController = {
    /**
     * Get all questionnaires for a coach
     */
    getQuestionnaires: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        if (!userId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        const supabase = getSupabaseClient();
        const { data: questionnaires, error } = await supabase
            .from('coach_questionnaires')
            .select('*')
            .eq('coach_id', userId)
            .order('created_at', { ascending: false });

        if (error) {
            return res.status(500).json({ success: false, message: error.message });
        }

        success(res, {
            message: 'Coach questionnaires retrieved successfully',
            data: { questionnaires },
        });
    },

    /**
     * Get a single questionnaire by ID
     */
    getQuestionnaireById: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        const { id } = req.params;

        if (!userId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        const supabase = getSupabaseClient();
        const { data: questionnaire, error } = await supabase
            .from('coach_questionnaires')
            .select('*')
            .eq('id', id)
            .eq('coach_id', userId)
            .single();

        if (error || !questionnaire) {
            return res.status(404).json({ success: false, message: 'Questionnaire not found' });
        }

        success(res, {
            message: 'Coach questionnaire retrieved successfully',
            data: { questionnaire },
        });
    },

    /**
     * Create a new coach questionnaire
     */
    createQuestionnaire: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        const { name, description } = req.body;

        if (!userId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        if (!name) {
            return res.status(400).json({ success: false, message: 'Questionnaire name is required' });
        }

        const supabase = getSupabaseClient();
        const { data: questionnaire, error } = await supabase
            .from('coach_questionnaires')
            .insert({
                coach_id: userId,
                name,
                description,
                questions: [],
            })
            .select()
            .single();

        if (error) {
            return res.status(500).json({ success: false, message: error.message });
        }

        created(res, {
            message: 'Coach questionnaire created successfully',
            data: { questionnaire },
        });
    },

    /**
     * Update an existing coach questionnaire
     */
    updateQuestionnaire: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        const { id } = req.params;
        const updates = req.body;

        if (!userId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        const supabase = getSupabaseClient();

        // Ensure ownership before updating
        const { data: existing } = await supabase
            .from('coach_questionnaires')
            .select('coach_id')
            .eq('id', id)
            .single();

        if (!existing || existing.coach_id !== userId) {
            return res.status(403).json({ success: false, message: 'Forbidden' });
        }

        const { data: questionnaire, error } = await supabase
            .from('coach_questionnaires')
            .update({
                ...updates,
                updated_at: new Date().toISOString(),
            })
            .eq('id', id)
            .select()
            .single();

        if (error) {
            return res.status(500).json({ success: false, message: error.message });
        }

        success(res, {
            message: 'Coach questionnaire updated successfully',
            data: { questionnaire },
        });
    },

    /**
     * Delete a coach questionnaire
     */
    deleteQuestionnaire: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        const { id } = req.params;

        if (!userId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        const supabase = getSupabaseClient();

        const { error } = await supabase
            .from('coach_questionnaires')
            .delete()
            .eq('id', id)
            .eq('coach_id', userId);

        if (error) {
            return res.status(500).json({ success: false, message: error.message });
        }

        success(res, {
            message: 'Coach questionnaire deleted successfully',
        });
    },
};
