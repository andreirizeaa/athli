import { Request, Response } from 'express';
import { success, unauthorized, notFound } from '../../../utils/http-response';
import { getSupabaseClient } from '../../../services/supabase.service';

export const clientProfileController = {
    /**
     * Get authenticated client's profile
     */
    getProfile: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        const targetClientId = req.header('x-client-id') ? String(req.header('x-client-id')) : userId;

        if (!userId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        const supabase = getSupabaseClient();
        const { data: profile, error } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', targetClientId)
            .single();

        if (error || !profile) {
            return notFound(res, { message: 'Profile not found' });
        }

        success(res, {
            message: 'Client profile retrieved successfully',
            data: { profile },
        });
    },

    /**
     * Update client's own profile
     */
    updateProfile: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        const updates = req.body;

        if (!userId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        const supabase = getSupabaseClient();
        const { data: profile, error } = await supabase
            .from('user_profiles')
            .update(updates)
            .eq('id', userId)
            .select()
            .single();

        if (error) {
            return res.status(500).json({ success: false, message: error.message });
        }

        success(res, {
            message: 'Client profile updated successfully',
            data: { profile },
        });
    },

};
