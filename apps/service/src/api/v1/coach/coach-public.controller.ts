import { Request, Response } from 'express';
import { success, notFound } from '../../../utils/http-response';
import { getSupabaseClient } from '../../../services/supabase.service';
import { canAddClient } from '../../../services/entitlements.service';

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

        let coachId: string | null = null;
        let coachName: string | null = null;
        let profilePictureUrl: string | null = null;
        let onboardingId: string | null = null;

        // 1. Try coach_unique_codes table (handles both main codes and onboarding-specific codes)
        const { data: codeData } = await supabase
            .from('coach_unique_codes')
            .select('coach_id, onboarding_id')
            .eq('code', code)
            .maybeSingle();

        if (codeData) {
            coachId = codeData.coach_id;
            onboardingId = codeData.onboarding_id;
        }

        // 2. Fallback: try invitation token
        if (!coachId) {
            const { data: assignmentData } = await supabase
                .from('coach_client_assignments')
                .select('coach_id')
                .eq('invitation_token', code)
                .maybeSingle();

            if (assignmentData) {
                coachId = assignmentData.coach_id;
            }
        }

        // 3. Resolve coach profile via coach_profiles_full view
        if (coachId) {
            const { data: profile } = await supabase
                .from('coach_profiles_full')
                .select('id, name, profile_picture_url')
                .eq('id', coachId)
                .maybeSingle();

            if (profile) {
                coachName = profile.name;
                profilePictureUrl = profile.profile_picture_url;
            }
        } else {
            // Last resort: look up directly by unique_code on the view
            const { data: profile } = await supabase
                .from('coach_profiles_full')
                .select('id, name, profile_picture_url')
                .eq('unique_code', code.toUpperCase())
                .maybeSingle();

            if (profile) {
                coachId = profile.id;
                coachName = profile.name;
                profilePictureUrl = profile.profile_picture_url;
            }
        }

        if (!coachId || !coachName) {
            return notFound(res, { message: 'Coach not found' });
        }

        // Get company info
        const { data: companyData } = await supabase
            .from('coach_company_information')
            .select('company_name, logo_url')
            .eq('coach_id', coachId)
            .maybeSingle();

        // Check if coach has reached client limit
        const { allowed: canAcceptClients } = await canAddClient(coachId);

        success(res, {
            message: 'Coach profile retrieved successfully',
            data: {
                coach: {
                    id: coachId,
                    name: coachName,
                    profilePictureUrl,
                    companyName: companyData?.company_name || null,
                    companyLogoUrl: companyData?.logo_url || null,
                },
                onboardingId,
                hasReachedLimit: !canAcceptClients,
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
            .is('onboarding_id', null)
            .single();

        if (error || !data) {
            return notFound(res, { message: 'Coach code not found for this ID' });
        }

        success(res, {
            data: { code: data.code },
        });
    },
};
