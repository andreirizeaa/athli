import { Request, Response } from 'express';
import { success, unauthorized, created, noContent, notFound } from '../../../utils/http-response';
import { getSupabaseClient } from '../../../services/supabase.service';

export const coachOnboardingController = {
    /**
     * Get all onboardings for a coach
     */
    getOnboardings: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        if (!userId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        const supabase = getSupabaseClient();
        const { data: onboardings, error } = await supabase
            .from('coach_onboardings')
            .select('*')
            .eq('coach_id', userId)
            .order('created_at', { ascending: false });

        if (error) {
            return res.status(500).json({ success: false, message: error.message });
        }

        success(res, {
            message: 'Coach onboardings retrieved successfully',
            data: { onboardings },
        });
    },

    /**
     * Get a single onboarding by ID
     */
    getOnboardingById: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        const { id } = req.params;

        if (!userId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        const supabase = getSupabaseClient();
        const { data: onboarding, error } = await supabase
            .from('coach_onboardings')
            .select('*')
            .eq('id', id)
            .eq('coach_id', userId)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                return notFound(res, { message: 'Onboarding not found' });
            }
            return res.status(500).json({ success: false, message: error.message });
        }

        success(res, {
            message: 'Coach onboarding retrieved successfully',
            data: { onboarding },
        });
    },

    /**
     * Create a new onboarding
     */
    createOnboarding: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        const { name, description, flow_data, is_active } = req.body;

        if (!userId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        const supabase = getSupabaseClient();
        const { data, error } = await supabase
            .from('coach_onboardings')
            .insert([
                {
                    coach_id: userId,
                    name,
                    description,
                    flow_data,
                    is_active: is_active ?? false,
                },
            ])
            .select()
            .single();

        if (error) {
            return res.status(500).json({ success: false, message: error.message });
        }

        created(res, {
            message: 'Coach onboarding created successfully',
            data: { onboarding: data },
        });
    },

    /**
     * Update an onboarding
     */
    updateOnboarding: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        const { id } = req.params;
        const updates = req.body;

        if (!userId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        const supabase = getSupabaseClient();
        const { data, error } = await supabase
            .from('coach_onboardings')
            .update(updates)
            .eq('id', id)
            .eq('coach_id', userId)
            .select()
            .single();

        if (error) {
            return res.status(500).json({ success: false, message: error.message });
        }

        if (!data) {
            return notFound(res, { message: 'Onboarding not found' });
        }

        success(res, {
            message: 'Coach onboarding updated successfully',
            data: { onboarding: data },
        });
    },

    /**
     * Delete an onboarding
     */
    deleteOnboarding: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        const { id } = req.params;

        if (!userId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        const supabase = getSupabaseClient();
        const { error } = await supabase
            .from('coach_onboardings')
            .delete()
            .eq('id', id)
            .eq('coach_id', userId);

        if (error) {
            return res.status(500).json({ success: false, message: error.message });
        }

        noContent(res);
    },
};
