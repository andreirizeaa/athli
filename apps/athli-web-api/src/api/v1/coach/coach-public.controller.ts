import { Request, Response } from 'express';
import { success, notFound } from '../../../utils/http-response';
import { getSupabaseClient } from '../../../services/supabase.service';

export const coachPublicController = {
    /**
     * Get coach profile by unique code
     * Public endpoint
     */
    getCoachByCode: async (req: Request, res: Response) => {
        const { code } = req.params;

        if (!code) {
            return res.status(400).json({ success: false, message: 'Code is required' });
        }

        const supabase = getSupabaseClient();

        // 1. Look up coach_id from unique code or invitation token
        let coachId: string | null = null;

        // Try unique code first
        const { data: codeData } = await supabase
            .from('coach_unique_codes')
            .select('coach_id')
            .eq('code', code)
            .maybeSingle();

        if (codeData) {
            coachId = codeData.coach_id;
        } else {
            // Try invitation token
            const { data: assignmentData } = await supabase
                .from('coach_client_assignments')
                .select('coach_id')
                .eq('invitation_token', code)
                .maybeSingle();

            if (assignmentData) {
                coachId = assignmentData.coach_id;
            }
        }

        if (!coachId) {
            return notFound(res, { message: 'Invalid coach code or invitation token' });
        }

        // 2. Fetch coach profile and company info
        // We fetching profile name/picture and company name to display on invite page
        const { data: profileData, error: profileError } = await supabase
            .from('user_profiles')
            .select('name, profile_picture_url')
            .eq('id', coachId)
            .single();

        const { data: companyData } = await supabase
            .from('coach_company_information')
            .select('company_name, logo_url')
            .eq('coach_id', coachId)
            .single();

        if (profileError || !profileData) {
            return notFound(res, { message: 'Coach profile not found' });
        }

        success(res, {
            message: 'Coach profile retrieved successfully',
            data: {
                coach: {
                    id: coachId,
                    name: profileData.name,
                    profilePictureUrl: profileData.profile_picture_url,
                    companyName: companyData?.company_name || null,
                    companyLogoUrl: companyData?.logo_url || null,
                }
            },
        });
    },

    /**
     * Get coach unique code by coach ID
     * Public endpoint
     */
    getCoachCodeById: async (req: Request, res: Response) => {
        const { coachId } = req.params;

        if (!coachId) {
            return res.status(400).json({ success: false, message: 'Coach ID is required' });
        }

        const supabase = getSupabaseClient();

        const { data, error } = await supabase
            .from('coach_unique_codes')
            .select('code')
            .eq('coach_id', coachId)
            .single();

        if (error || !data) {
            return notFound(res, { message: 'Coach code not found for this ID' });
        }

        success(res, {
            data: { code: data.code },
        });
    },
};
