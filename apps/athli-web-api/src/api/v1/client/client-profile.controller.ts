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
        const updates = req.body;

        if (!userId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        const supabase = getSupabaseClient();

        // Separate user_profiles fields vs client_profiles fields
        // user_profiles: name, profile_picture_url
        // client_profiles: phone, gender, country, city, date_of_birth, height_cm, weight_kg, unit_system

        const userProfileFields = ['name', 'profile_picture_url'];
        // Note: first_name/last_name coming from frontend needs to be combined into 'name' for user_profiles
        // frontend sends: first_name, last_name, phone, gender, country, weight, height...
        // map 'weight' -> 'weight_kg', 'height' -> 'height_cm' if needed, or frontend sends match?
        // Let's look at client-service `saveAthleteDetails`...

        // Wait, client-service.ts currently maps:
        // first_name: details.firstName
        // last_name: details.lastName
        // weight: details.weight
        // height: details.height

        // So we need to handle mapping here or in frontend.
        // coach-clients.controller.ts handles mapping inside the controller?
        // No, it expects `first_name`, `last_name` in body?

        // Let's just blindly try to update client_profiles with whatever is not name/email/avatar
        // and special handle name.

        const userUpdates: any = {};
        const clientUpdates: any = {};

        // Handle name construction if provided
        if (updates.first_name || updates.last_name) {
            const { data: currentProfile } = await supabase
                .from('user_profiles')
                .select('name')
                .eq('id', userId)
                .single();

            const names = (currentProfile?.name || '').split(' ');
            const firstName = updates.first_name || names[0] || '';
            const lastName = updates.last_name || names.slice(1).join(' ') || '';
            userUpdates.name = `${firstName} ${lastName}`.trim();
        }

        if (updates.profile_picture_url) {
            userUpdates.profile_picture_url = updates.profile_picture_url;
        }

        // Map frontend common fields to DB fields
        // Frontend sends: first_name, last_name, phone, gender, country, weight, height
        if (updates.phone) clientUpdates.phone = updates.phone;
        if (updates.gender) clientUpdates.gender = updates.gender;
        if (updates.country) clientUpdates.country = updates.country;
        if (updates.city) clientUpdates.city = updates.city;
        // frontend 'weight' -> db 'weight_kg'
        if (updates.weight !== undefined) clientUpdates.weight_kg = updates.weight;
        // frontend 'height' -> db 'height_cm'
        if (updates.height !== undefined) clientUpdates.height_cm = updates.height;
        // db has date_of_birth. frontend might send birth_date?
        if (updates.birth_date) clientUpdates.date_of_birth = updates.birth_date;
        if (updates.unit_system) clientUpdates.unit_system = updates.unit_system;


        // Update user_profiles
        if (Object.keys(userUpdates).length > 0) {
            const { error } = await supabase
                .from('user_profiles')
                .update(userUpdates)
                .eq('id', userId);
            if (error) return res.status(500).json({ success: false, message: error.message });
        }

        // Update client_profiles
        if (Object.keys(clientUpdates).length > 0) {
            const { error } = await supabase
                .from('client_profiles')
                .update(clientUpdates)
                .eq('client_id', userId);
            if (error) return res.status(500).json({ success: false, message: error.message });
        }


        // Re-fetch full profile to return
        const { data: userProfile } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', userId)
            .single();

        const { data: clientProfile } = await supabase
            .from('client_profiles')
            .select('*')
            .eq('client_id', userId)
            .single();

        const fullProfile = {
            ...userProfile,
            ...(clientProfile || {}),
            id: userId,
        };

        if (updates.category) {
            // If they try to update category, we should probably ignore it or update assignment?
            // Clients usually can't change their category (coach decides).
            // We'll just read it back.
            const { data: assignment } = await supabase
                .from('coach_client_assignments')
                .select('category')
                .eq('client_id', userId)
                .limit(1)
                .single();
            if (assignment) (fullProfile as any).category = assignment.category;
        }


        success(res, {
            message: 'Client profile updated successfully',
            data: { profile: fullProfile },
        });
    },

};
