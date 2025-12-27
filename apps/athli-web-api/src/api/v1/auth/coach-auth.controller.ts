import { Request, Response } from 'express';
import { asyncHandler } from '../../../utils/async-handler';
import { success, created, unauthorized } from '../../../utils/http-response';
import { OAuth2Client } from 'google-auth-library';
import { getSupabaseClient } from '../../../services/supabase.service';
import { avatarService } from '../../../services/avatar.service';

const googleClient = new OAuth2Client(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID);

export class CoachAuthController {
    /**
     * Register new coach
     */
    register = asyncHandler(async (req: Request, res: Response) => {
        const { email, password, name } = req.body;
        const supabase = getSupabaseClient();

        // Create user in Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
            email,
            password,
            email_confirm: false,
            user_metadata: {
                name,
                user_type: 'coach',
            },
        });

        if (authError) {
            throw new Error(`Registration failed: ${authError.message}`);
        }

        if (!authData.user) {
            throw new Error('Failed to create user');
        }

        // The trigger will automatically create the coach_profile
        // Generate unique code for the coach
        const uniqueCode = authData.user.id.substring(0, 8).toUpperCase();

        // Generate default avatar for new coach
        try {
            const avatarUrl = await avatarService.generateDefaultAvatar(authData.user.id, name);
            await supabase
                .from('user_profiles')
                .update({ profile_picture_url: avatarUrl })
                .eq('id', authData.user.id);
        } catch (avatarErr) {
            console.error('Failed to generate default avatar during coach registration:', avatarErr);
        }

        created(res, {
            message: 'Coach registered successfully. Please verify your email.',
            data: {
                userId: authData.user.id,
                requiresVerification: true,
            },
        });
    });

    /**
     * Google OAuth registration/login for coaches
     */
    googleAuth = asyncHandler(async (req: Request, res: Response) => {
        const { credential } = req.body;
        const supabase = getSupabaseClient();

        try {
            // Verify the Google token
            const ticket = await googleClient.verifyIdToken({
                idToken: credential,
                audience: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
            });

            const payload = ticket.getPayload();
            if (!payload) {
                return unauthorized(res, { message: 'Invalid Google token' });
            }

            const googleUser = {
                email: payload.email!,
                name: payload.name || '',
                picture: payload.picture,
                sub: payload.sub,
            };

            // Check if user exists
            const { data: existingUsers, error: listError } = await supabase.auth.admin.listUsers();

            if (listError) {
                throw new Error(`Failed to check existing users: ${listError.message}`);
            }

            const existingUser = existingUsers.users.find((u) => u.email === googleUser.email);

            let userId: string;
            let isNew = false;

            if (existingUser) {
                userId = existingUser.id;

                // Verify user is a coach
                const { data: coachProfile } = await supabase
                    .from('coach_profiles')
                    .select('id')
                    .eq('id', existingUser.id)
                    .single();

                if (!coachProfile) {
                    return unauthorized(res, { message: 'This account is not registered as a coach' });
                }
            } else {
                // Create new coach user
                const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
                    email: googleUser.email,
                    email_confirm: true,
                    user_metadata: {
                        name: googleUser.name,
                        user_type: 'coach',
                        avatar_url: googleUser.picture,
                        picture: googleUser.picture,
                        provider: 'google',
                        provider_id: googleUser.sub,
                    },
                });

                if (createError || !newUser.user) {
                    throw new Error(`Failed to create user: ${createError?.message || 'Unknown error'}`);
                }

                userId = newUser.user.id;
                isNew = true;
            }

            // Get coach profile
            const { data: profile, error: profileError } = await supabase
                .from('coach_profiles')
                .select('*')
                .eq('id', userId)
                .single();

            if (profileError) {
                console.error('Profile fetch error:', profileError);
            }

            // Generate magic link for session
            const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
                type: 'magiclink',
                email: googleUser.email,
            });

            if (linkError) {
                console.error('Failed to generate magic link:', linkError);
            }

            success(res, {
                message: isNew ? 'Coach account created successfully' : 'Login successful',
                data: {
                    token: linkData?.properties?.hashed_token || '',
                    user: {
                        id: userId,
                        email: googleUser.email,
                        name: profile?.name || googleUser.name,
                        userType: 'coach',
                        profilePictureUrl: profile?.profile_picture_url || googleUser.picture,
                        signinMethod: 'google',
                        isActive: profile?.is_active ?? true,
                    },
                    isNew,
                },
            });
        } catch (error) {
            console.error('Google auth error:', error);
            unauthorized(res, { message: 'Google authentication failed' });
        }
    });
}

export const coachAuthController = new CoachAuthController();
