import { Request, Response } from 'express';
import { asyncHandler } from '../../../utils/async-handler';
import { success, created, notFound } from '../../../utils/http-response';
import { getSupabaseClient } from '../../../services/supabase.service';

export class ClientAuthController {
    /**
     * Accept client invitation and create profile
     * Used when a client clicks the invite link from their coach
     */
    acceptInvite = asyncHandler(async (req: Request, res: Response) => {
        const { inviteCode, email, password, name } = req.body;
        const supabase = getSupabaseClient();

        // Find coach by invite code
        const { data: coach, error: coachError } = await supabase
            .from('coach_profiles')
            .select('id, name')
            .eq('unique_code', inviteCode.toUpperCase())
            .single();

        if (coachError || !coach) {
            return notFound(res, { message: 'Invalid invite code' });
        }

        // Create user in Supabase Auth as client
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
            email,
            password,
            email_confirm: false,
            user_metadata: {
                name,
                user_type: 'client',
                coach_id: coach.id,
            },
        });

        if (authError) {
            throw new Error(`Registration failed: ${authError.message}`);
        }

        if (!authData.user) {
            throw new Error('Failed to create user');
        }

        // Create client profile
        const { error: profileError } = await supabase
            .from('client_profiles')
            .insert({
                client_id: authData.user.id,
                coach_id: coach.id,
                email,
                name,
                category: 'online',
                status: 'invited',
                invitation_sent_at: new Date().toISOString(),
            });

        if (profileError) {
            // Cleanup: delete auth user if profile creation fails
            await supabase.auth.admin.deleteUser(authData.user.id);
            throw new Error(`Failed to create client profile: ${profileError.message}`);
        }

        // Also add to user_profiles for backward compatibility
        await supabase
            .from('user_profiles')
            .insert({
                id: authData.user.id,
                user_type: 'client',
                email,
                name,
                signin_method: 'email',
                is_active: true,
            });

        created(res, {
            message: 'Client account created successfully. Please verify your email.',
            data: {
                userId: authData.user.id,
                coachName: coach.name,
                requiresVerification: true,
            },
        });
    });

    /**
     * Get coach info by invite code (for displaying on invite page)
     */
    getCoachByInviteCode = asyncHandler(async (req: Request, res: Response) => {
        const { code } = req.params;
        const supabase = getSupabaseClient();

        const { data: coach, error } = await supabase
            .from('coach_profiles')
            .select('id, name, profile_picture_url')
            .eq('unique_code', code.toUpperCase())
            .single();

        if (error || !coach) {
            return notFound(res, { message: 'Invalid invite code' });
        }

        success(res, {
            message: 'Coach found',
            data: {
                coachId: coach.id,
                coachName: coach.name,
                coachAvatar: coach.profile_picture_url,
            },
        });
    });

    /**
     * Client login verification
     * Ensures the user logging in is actually a client
     */
    verifyClientLogin = asyncHandler(async (req: Request, res: Response) => {
        const { email } = req.body;
        const supabase = getSupabaseClient();

        // Check if user exists in client_profiles
        const { data: clientProfile, error } = await supabase
            .from('client_profiles')
            .select('client_id, coach_id, status')
            .eq('email', email)
            .single();

        if (error || !clientProfile) {
            return notFound(res, {
                message: 'No client account found for this email. Please use your invite link to sign up.'
            });
        }

        success(res, {
            message: 'Client found',
            data: {
                clientId: clientProfile.client_id,
                coachId: clientProfile.coach_id,
                status: clientProfile.status,
            },
        });
    });
}

export const clientAuthController = new ClientAuthController();
