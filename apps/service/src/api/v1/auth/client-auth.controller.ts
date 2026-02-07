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
        const { inviteCode, email, password, name, timezone } = req.body;
        const supabase = getSupabaseClient();

        // Find coach by invite code using the full view (merges user_profiles)
        const { data: coach, error: coachError } = await supabase
            .from('coach_profiles_full')
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
                timezone,
            },
        });

        if (authError) {
            throw new Error(`Registration failed: ${authError.message}`);
        }

        if (!authData.user) {
            throw new Error('Failed to create user');
        }

        // Create user_profiles entry first (single source of truth for name/email)
        const { error: userProfileError } = await supabase
            .from('user_profiles')
            .insert({
                id: authData.user.id,
                user_type: 'client',
                email,
                name,
                signin_method: 'email',
                timezone,
            });

        if (userProfileError) {
            // Cleanup: delete auth user if profile creation fails
            await supabase.auth.admin.deleteUser(authData.user.id);
            throw new Error(`Failed to create user profile: ${userProfileError.message}`);
        }

        // Create client profile for client-specific data (no email/name - stored in user_profiles)
        const { error: profileError } = await supabase
            .from('client_profiles')
            .insert({
                client_id: authData.user.id,
            });

        if (profileError) {
            // Cleanup: delete auth user and user_profile if profile creation fails
            await supabase.from('user_profiles').delete().eq('id', authData.user.id);
            await supabase.auth.admin.deleteUser(authData.user.id);
            throw new Error(`Failed to create client profile: ${profileError.message}`);
        }

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
        const code = String(req.params.code);
        const supabase = getSupabaseClient();

        // Use the full view to get name and profile picture from user_profiles
        const { data: coach, error } = await supabase
            .from('coach_profiles_full')
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

        // Check if user exists in user_profiles as a client
        const { data: userProfile, error: userError } = await supabase
            .from('user_profiles')
            .select('id')
            .eq('email', email)
            .eq('user_type', 'client')
            .single();

        if (userError || !userProfile) {
            return notFound(res, {
                message: 'No client account found for this email. Please use your invite link to sign up.'
            });
        }

        // Get the client_profiles and coach_client_assignments data
        const { data: clientProfile } = await supabase
            .from('client_profiles')
            .select('client_id')
            .eq('client_id', userProfile.id)
            .single();

        // Get coach assignment if exists
        const { data: assignment } = await supabase
            .from('coach_client_assignments')
            .select('coach_id, status')
            .eq('client_id', userProfile.id)
            .limit(1)
            .single();

        success(res, {
            message: 'Client found',
            data: {
                clientId: userProfile.id,
                coachId: assignment?.coach_id || null,
                status: assignment?.status || 'invited',
            },
        });
    });
}

export const clientAuthController = new ClientAuthController();
