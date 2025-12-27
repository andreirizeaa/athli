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

    /**
     * Resend invitation email to client
     */
    resendInvite: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        const { clientId } = req.body;

        if (!userId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        if (!clientId) {
            return res.status(400).json({ success: false, message: 'clientId is required' });
        }

        const supabase = getSupabaseClient();

        // Fetch client details to get email and invitation token
        const { data: client, error } = await supabase
            .from('coach_clients_view')
            .select('email, invitation_token, full_name')
            .eq('coach_id', userId)
            .eq('client_id', clientId)
            .single();

        if (error || !client) {
            console.error('Error fetching client for resend invite:', error, { userId, clientId });
            return notFound(res, { message: 'Client not found' });
        }

        // TODO: Send invitation email to client.email with client.invitation_token
        // Email should include:
        // - Client name (client.full_name)
        // - Invitation link with token
        // - Coach information
        console.log(`TODO: Send invitation email to ${client.email} with token ${client.invitation_token}`);

        success(res, {
            message: 'Invitation resent successfully',
            data: { email: client.email }
        });
    },
};
