import { Request, Response } from 'express';
import { success, unauthorized, notFound, internalError } from '../../../utils/http-response';
import { getSupabaseClient } from '../../../services/supabase.service';
import { avatarService } from '../../../services/avatar.service';

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

        // Fetch from both tables to ensure we have all data
        // client_profiles has the physical stats, user_profiles has the auth info/name/email
        const { data: userProfile, error: userError } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', targetClientId)
            .single();

        if (userError || !userProfile) {
            return notFound(res, { message: 'Profile not found' });
        }

        const { data: clientProfile, error: clientError } = await supabase
            .from('client_profiles')
            .select('*')
            .eq('client_id', targetClientId)
            .single();

        // Merge the profiles if clientProfile exists
        const fullProfile = {
            ...userProfile,
            ...(clientProfile || {}),
            // Ensure ID is consistent
            id: userProfile.id,
        };

        // Also try to get category from assignment if possible
        const { data: assignment } = await supabase
            .from('coach_client_assignments')
            .select('category')
            .eq('client_id', targetClientId)
            .limit(1)
            .single();

        if (assignment) {
            (fullProfile as any).category = assignment.category;
        }

        success(res, {
            message: 'Client profile retrieved successfully',
            data: { profile: fullProfile },
        });
    },

    /**
     * Update client's own profile
     */
    updateProfile: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        const clientIdHeader = req.header('x-client-id');
        const targetClientId = clientIdHeader ? String(clientIdHeader) : userId;

        const updates = req.body;
        const file = req.file;

        if (!userId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        try {
            const supabase = getSupabaseClient();

            // Separate user_profiles fields vs client_profiles fields
            // user_profiles: name, profile_picture_url
            // client_profiles: phone, gender, country, date_of_birth, height_cm, weight_kg, unit_system

            const userUpdates: any = {};
            const clientUpdates: any = {};

            // Map frontend common fields to DB fields
            if (updates.name) userUpdates.name = updates.name;

            if (file) {
                const avatarUrl = await avatarService.uploadAvatar(targetClientId, file as any);
                userUpdates.profile_picture_url = avatarUrl;
            } else if (updates.profile_picture_url) {
                userUpdates.profile_picture_url = updates.profile_picture_url;
            }

            if (updates.phone) clientUpdates.phone = updates.phone;
            if (updates.gender) clientUpdates.gender = updates.gender;
            if (updates.country) clientUpdates.country = updates.country;
            // db has date_of_birth. frontend might send birth_date?
            if (updates.birth_date) clientUpdates.date_of_birth = updates.birth_date;
            if (updates.unit_system) clientUpdates.unit_system = updates.unit_system;


            // Update user_profiles
            if (Object.keys(userUpdates).length > 0) {
                const { error } = await supabase
                    .from('user_profiles')
                    .update(userUpdates)
                    .eq('id', targetClientId);
                if (error) return res.status(500).json({ success: false, message: error.message });
            }

            // Update client_profiles
            if (Object.keys(clientUpdates).length > 0) {
                const { error } = await supabase
                    .from('client_profiles')
                    .update(clientUpdates)
                    .eq('client_id', targetClientId);
                if (error) return res.status(500).json({ success: false, message: error.message });
            }


            // Re-fetch full profile to return
            const { data: userProfile } = await supabase
                .from('user_profiles')
                .select('*')
                .eq('id', targetClientId)
                .single();

            const { data: clientProfile } = await supabase
                .from('client_profiles')
                .select('*')
                .eq('client_id', targetClientId)
                .single();

            const fullProfile = {
                ...userProfile,
                ...(clientProfile || {}),
                id: targetClientId,
            };

            if (updates.category) {
                // If they try to update category, we should probably ignore it or update assignment?
                // Clients usually can't change their category (coach decides).
                // We'll just read it back.
                const { data: assignment } = await supabase
                    .from('coach_client_assignments')
                    .select('category')
                    .eq('client_id', targetClientId)
                    .limit(1)
                    .single();
                if (assignment) (fullProfile as any).category = assignment.category;
            }


            success(res, {
                message: 'Client profile updated successfully',
                data: { profile: fullProfile },
            });
        } catch (error: any) {
            console.error('Error updating client profile:', error);
            return internalError(res, { message: error.message || 'Failed to update client profile' });
        }
    },

};
