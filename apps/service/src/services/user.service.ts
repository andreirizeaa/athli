import { getSupabaseClient } from './supabase.service';
import { getStripeClient } from './stripe.service';
import { avatarService } from './avatar.service';
import { onboardingExecutor } from './onboarding-executor.service';
import { demoDataService } from './demo-data.service';

interface UpdateProfileInput {
  name?: string;
  profilePictureUrl?: string | null;
  timezone?: string;
}

interface UserProfile {
  id: string;
  email: string;
  name: string;
  userType: 'coach' | 'client';
  profilePictureUrl?: string | null;
  signinMethod: 'email' | 'google';
  timezone?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  // Coach-specific fields
  freeTrialCompleted?: boolean;
  coachCreatedAt?: string; // When coach profile was created (for trial calculation)
}

class UserService {
  /**
   * Get user profile
   */
  async getUserProfile(userId: string): Promise<UserProfile> {
    const supabase = getSupabaseClient();

    // Get user from auth
    const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(userId);

    if (authError || !authUser.user) {
      throw new Error('User not found');
    }

    const { data: profiles, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId);

    if (profileError) {
      throw new Error(`Failed to fetch profile: ${profileError.message}`);
    }

    if (!profiles || profiles.length === 0) {
      // Fallback to auth metadata if profile not found in DB (e.g. slight delay in trigger or trigger failure)
      return {
        id: authUser.user.id,
        email: authUser.user.email || '',
        name: authUser.user.user_metadata?.name || '',
        userType: (authUser.user.user_metadata?.user_type as 'coach' | 'client') || 'coach',
        profilePictureUrl: authUser.user.user_metadata?.avatar_url || authUser.user.user_metadata?.picture || null,
        signinMethod: (authUser.user.app_metadata?.provider as 'email' | 'google') || 'email',
        timezone: authUser.user.user_metadata?.timezone || null,
        isActive: true,
        createdAt: authUser.user.created_at,
        updatedAt: authUser.user.updated_at || authUser.user.created_at,
      };
    }

    // Prioritize coach profile if multiple exist
    const profile = profiles.find(p => p.user_type === 'coach') || profiles[0];

    // Fetch coach-specific data if user is a coach
    let freeTrialCompleted: boolean | undefined;
    let coachCreatedAt: string | undefined;

    if (profile.user_type === 'coach') {
      const { data: coachProfile } = await supabase
        .from('coach_profiles')
        .select('free_trial_completed, created_at')
        .eq('id', userId)
        .single();

      if (coachProfile) {
        freeTrialCompleted = coachProfile.free_trial_completed;
        coachCreatedAt = coachProfile.created_at;
      }
    }

    return {
      id: authUser.user.id,
      email: profile.email,
      name: profile.name,
      userType: profile.user_type,
      profilePictureUrl: profile.profile_picture_url,
      signinMethod: profile.signin_method,
      timezone: profile.timezone || null,
      isActive: profile.is_active,
      createdAt: authUser.user.created_at,
      updatedAt: profile.updated_at,
      freeTrialCompleted,
      coachCreatedAt,
    };
  }

  /**
   * Update user profile
   */
  async updateUserProfile(userId: string, updates: UpdateProfileInput, file?: Express.Multer.File): Promise<UserProfile> {
    const supabase = getSupabaseClient();

    // Handle file upload if present
    if (file) {
      const avatarUrl = await avatarService.uploadAvatar(userId, file as any);
      updates.profilePictureUrl = avatarUrl;
    }

    // Build updates for user_profiles (single source of truth for name/email/avatar)
    const userProfileUpdates: Record<string, unknown> = {};
    const authMetadataUpdates: Record<string, unknown> = {};

    if (updates.name !== undefined) {
      userProfileUpdates.name = updates.name;
      authMetadataUpdates.name = updates.name;
    }

    if (updates.profilePictureUrl !== undefined) {
      userProfileUpdates.profile_picture_url = updates.profilePictureUrl;
      authMetadataUpdates.profile_picture_url = updates.profilePictureUrl;
      authMetadataUpdates.avatar_url = updates.profilePictureUrl;
    }

    if (updates.timezone !== undefined) {
      userProfileUpdates.timezone = updates.timezone;
      authMetadataUpdates.timezone = updates.timezone;
    }

    // Directly update user_profiles (don't rely solely on trigger)
    if (Object.keys(userProfileUpdates).length > 0) {
      userProfileUpdates.updated_at = new Date().toISOString();
      
      const { error: profileError } = await supabase
        .from('user_profiles')
        .update(userProfileUpdates)
        .eq('id', userId);

      if (profileError) {
        console.error('Failed to update user_profiles:', profileError);
        throw new Error(`Failed to update profile: ${profileError.message}`);
      }
    }

    // Also update auth.users metadata for consistency (used by OAuth flows)
    if (Object.keys(authMetadataUpdates).length > 0) {
      const { error: authError } = await supabase.auth.admin.updateUserById(userId, {
        user_metadata: authMetadataUpdates,
      });

      if (authError) {
        console.error('Failed to update auth metadata:', authError);
        // Don't throw - profile update succeeded, auth metadata sync is secondary
      }
    }

    // Return updated profile
    return this.getUserProfile(userId);
  }

  /**
   * Get user profile by ID (public, no authentication required)
   * Used for fetching coach information on invite pages
   */
  async getUserById(userId: string): Promise<UserProfile> {
    const supabase = getSupabaseClient();

    // Get user from auth using admin API
    const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(userId);

    if (authError || !authUser.user) {
      throw new Error('User not found');
    }

    // Get user profile from database - try to get coach profile first, then any profile
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .eq('user_type', 'coach')
      .maybeSingle();

    // If no coach profile, get any profile
    let finalProfile = profile;
    if (!profile && profileError?.code === 'PGRST116') {
      const { data: anyProfile } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .limit(1)
        .single();
      finalProfile = anyProfile;
    }

    if (!finalProfile) {
      // Fallback to auth metadata
      return {
        id: authUser.user.id,
        email: authUser.user.email || '',
        name: authUser.user.user_metadata?.name || '',
        userType: (authUser.user.user_metadata?.user_type as 'coach' | 'client') || 'coach',
        profilePictureUrl: authUser.user.user_metadata?.avatar_url || authUser.user.user_metadata?.picture || null,
        signinMethod: (authUser.user.app_metadata?.provider as 'email' | 'google') || 'email',
        isActive: true,
        createdAt: authUser.user.created_at,
        updatedAt: authUser.user.updated_at || authUser.user.created_at,
      };
    }

    return {
      id: authUser.user.id,
      email: finalProfile.email,
      name: finalProfile.name,
      userType: finalProfile.user_type,
      profilePictureUrl: finalProfile.profile_picture_url,
      signinMethod: finalProfile.signin_method,
      isActive: finalProfile.is_active,
      createdAt: authUser.user.created_at,
      updatedAt: finalProfile.updated_at,
    };
  }

  /**
   * Ensure coach profile exists for a user
   * Creates a coach profile if it doesn't exist, otherwise returns existing profile
   * Used for Google OAuth signups where the trigger doesn't create a profile
   */
  async ensureCoachProfile(userId: string): Promise<UserProfile> {
    const supabase = getSupabaseClient();

    // Get user from auth
    const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(userId);

    if (authError || !authUser.user) {
      throw new Error('User not found');
    }

    // Check if coach profile already exists in user_profiles
    const { data: existingProfile, error: fetchError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .eq('user_type', 'coach')
      .maybeSingle();

    if (fetchError && fetchError.code !== 'PGRST116') {
      throw new Error(`Failed to check profile: ${fetchError.message}`);
    }

    // If profile exists, return it
    if (existingProfile) {
      return {
        id: authUser.user.id,
        email: existingProfile.email,
        name: existingProfile.name,
        userType: existingProfile.user_type,
        profilePictureUrl: existingProfile.profile_picture_url,
        signinMethod: existingProfile.signin_method,
        isActive: existingProfile.is_active,
        createdAt: authUser.user.created_at,
        updatedAt: existingProfile.updated_at,
      };
    }

    // Create coach profile
    const userEmail = authUser.user.email || '';
    const userName = authUser.user.user_metadata?.name ||
      authUser.user.user_metadata?.full_name ||
      userEmail.split('@')[0];
    const signinMethod = authUser.user.app_metadata?.provider === 'google' ? 'google' : 'email';
    const profilePictureUrl = authUser.user.user_metadata?.avatar_url ||
      authUser.user.user_metadata?.picture || null;

    // Generate default avatar if not present (for email, apple, and other OAuth without pictures)
    let finalProfilePictureUrl = profilePictureUrl;
    if (!finalProfilePictureUrl) {
      try {
        finalProfilePictureUrl = await avatarService.generateDefaultAvatar(userId, userName);
      } catch (avatarErr) {
        console.error('Failed to generate default avatar during profile creation:', avatarErr);
      }
    }

    // Generate unique code for coach
    const uniqueCode = await this.generateUniqueCode();

    // Insert into user_profiles
    const { data: newUserProfile, error: userProfileInsertError } = await supabase
      .from('user_profiles')
      .insert({
        id: userId,
        user_type: 'coach',
        email: userEmail,
        name: userName,
        profile_picture_url: finalProfilePictureUrl,
        signin_method: signinMethod,
        is_active: true,
      })
      .select()
      .single();

    if (userProfileInsertError) {
      // If profile already exists (race condition), fetch it
      if (userProfileInsertError.code === '23505') {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', userId)
          .eq('user_type', 'coach')
          .single();

        if (profile) {
          return {
            id: authUser.user.id,
            email: profile.email,
            name: profile.name,
            userType: profile.user_type,
            profilePictureUrl: profile.profile_picture_url,
            signinMethod: profile.signin_method,
            isActive: profile.is_active,
            createdAt: authUser.user.created_at,
            updatedAt: profile.updated_at,
          };
        }
      }
      throw new Error(`Failed to create user profile: ${userProfileInsertError.message}`);
    }

    // Also insert into coach_profiles for coach-specific data
    // Note: email/name/profile_picture_url/signin_method are stored in user_profiles only
    const { error: coachProfileInsertError } = await supabase
      .from('coach_profiles')
      .insert({
        id: userId,
        is_active: true,
        unique_code: uniqueCode,
      });

    if (coachProfileInsertError && coachProfileInsertError.code !== '23505') {
      console.error('Failed to create coach_profiles entry:', coachProfileInsertError);
      // Don't fail - user_profiles is the primary table
    }

    // Update user metadata to ensure user_type is set
    await supabase.auth.admin.updateUserById(userId, {
      user_metadata: {
        ...authUser.user.user_metadata,
        user_type: 'coach',
      },
    });

    return {
      id: authUser.user.id,
      email: newUserProfile.email,
      name: newUserProfile.name,
      userType: newUserProfile.user_type,
      profilePictureUrl: newUserProfile.profile_picture_url,
      signinMethod: newUserProfile.signin_method,
      isActive: newUserProfile.is_active,
      createdAt: authUser.user.created_at,
      updatedAt: newUserProfile.updated_at,
    };
  }

  /**
   * Generate a unique code for coaches
   */
  private async generateUniqueCode(): Promise<string> {
    const supabase = getSupabaseClient();
    let uniqueCode: string;
    let isUnique = false;

    do {
      // Generate a 14-character alphanumeric code
      uniqueCode = Math.random().toString(36).substring(2, 16).toUpperCase();

      // Check if it already exists
      const { data } = await supabase
        .from('coach_profiles')
        .select('unique_code')
        .eq('unique_code', uniqueCode)
        .maybeSingle();

      isUnique = !data;
    } while (!isUnique);

    return uniqueCode;
  }

  /**
   * Ensure client profile exists for a user
   * Creates a client profile if it doesn't exist, otherwise returns existing profile
   */
  async ensureClientProfile(userId: string, coachId: string, invitationToken?: string, onboardingId?: string): Promise<UserProfile> {
    const supabase = getSupabaseClient();

    console.log('[Service] ensureClientProfile START', { userId, coachId, invitationToken });

    // Get user from auth
    const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(userId);

    if (authError || !authUser.user) {
      console.error('[Service] User not found', { userId, error: authError });
      throw new Error('User not found');
    }

    console.log('[Service] User fetched from auth', { userId, email: authUser.user.email });

    // Check if client profile already exists
    const { data: existingProfile, error: fetchError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .eq('user_type', 'client')
      .maybeSingle();

    if (fetchError && fetchError.code !== 'PGRST116') {
      throw new Error(`Failed to check profile: ${fetchError.message}`);
    }

    // Get user info for later use
    const userEmail = authUser.user.email || '';
    const userName = authUser.user.user_metadata?.name || existingProfile?.name || userEmail.split('@')[0];
    const signinMethod = authUser.user.app_metadata?.provider === 'google' ? 'google' : 'email';
    const profilePictureUrl = authUser.user.user_metadata?.avatar_url ||
      authUser.user.user_metadata?.picture || null;

    // Generate default avatar if not present (for email, apple, and other OAuth without pictures)
    let finalProfilePictureUrl = profilePictureUrl;
    if (!finalProfilePictureUrl) {
      try {
        finalProfilePictureUrl = await avatarService.generateDefaultAvatar(userId, userName);
      } catch (avatarErr) {
        console.error('Failed to generate default avatar during profile creation:', avatarErr);
      }
    }

    // If user_profiles exists, we still need to ensure client_profiles and coach_client_assignments exist
    // This handles the case where the trigger created user_profiles but not the other tables
    if (existingProfile) {
      // Check if client_profiles exists, create if not
      const { data: existingClientProfile } = await supabase
        .from('client_profiles')
        .select('client_id')
        .eq('client_id', userId)
        .maybeSingle();

      if (!existingClientProfile) {
        console.log('[Service] Creating client_profiles entry', { userId });

        // Note: email/name/profile_picture_url/signin_method are stored in user_profiles only
        const { error: clientProfileError } = await supabase
          .from('client_profiles')
          .insert({
            client_id: userId,
          });

        if (clientProfileError) {
          if (clientProfileError.code === '23505') {
            console.log('[Service] client_profiles already exists (race condition)');
          } else {
            console.error('[Service] FAILED to create client_profiles', { error: clientProfileError });
            throw new Error(`Failed to create client_profiles entry: ${clientProfileError.message}`);
          }
        } else {
          console.log('[Service] ✅ client_profiles created successfully');
        }
      } else {
        console.log('[Service] client_profiles already exists, skipping insert');
      }

      // Update user metadata with coach_id
      await supabase.auth.admin.updateUserById(userId, {
        user_metadata: {
          ...authUser.user.user_metadata,
          coach_id: coachId,
        },
      });

      // Handle invitation token and coach_client_assignments
      let invitationProcessed = false;
      let effectiveOnboardingId = onboardingId;

      if (invitationToken) {
        const { data: assignment } = await supabase
          .from('coach_client_assignments')
          .select('*')
          .eq('invitation_token', invitationToken)
          .maybeSingle();

        if (assignment) {
          invitationProcessed = true;
          // Read onboarding_id from the assignment if not provided via invite code
          if (!effectiveOnboardingId && assignment.onboarding_id) {
            effectiveOnboardingId = assignment.onboarding_id;
          }

          if (assignment.client_id !== userId) {
            const stubClientId = assignment.client_id;

            // 1. Update assignment to new user
            await supabase
              .from('coach_client_assignments')
              .update({
                client_id: userId,
                status: 'accepted',
                category: null, // Will be set when coach categorizes the client
                invitation_token: null // Clear token after use
              })
              .eq('invitation_token', invitationToken);

            // 2. Transfer other assignments
            const assignmentTables = [
              'client_metrics',
              'client_habits',
              'client_files',
              'client_checkins',
              'client_questionnaires'
            ];

            for (const table of assignmentTables) {
              await supabase
                .from(table)
                .update({ client_id: userId })
                .eq('client_id', stubClientId);
            }

            // 3. Cleanup stub user
            await supabase.auth.admin.deleteUser(stubClientId);
          }
        }
      }

      if (!invitationProcessed) {
        // If no token or token not found (could be a general coach code),
        // just ensure the assignment exists
        console.log('[Service] Creating/updating coach_client_assignments', { coachId, userId, status: 'accepted' });

        const { data: assignmentData, error: assignmentError } = await supabase
          .from('coach_client_assignments')
          .upsert({
            coach_id: coachId,
            client_id: userId,
            status: 'accepted',
            category: null, // Will be set when coach categorizes the client
            onboarding_id: effectiveOnboardingId || null,
          }, { onConflict: 'coach_id, client_id' })
          .select();

        if (assignmentError) {
          console.error('[Service] FAILED to create coach_client_assignments', {
            error: assignmentError,
            code: assignmentError.code,
            message: assignmentError.message,
            details: assignmentError.details,
            hint: assignmentError.hint
          });
          throw new Error(`Failed to create coach-client assignment: ${assignmentError.message}`);
        } else {
          console.log('[Service] ✅ coach_client_assignments created successfully', { data: assignmentData });
        }
      }

      // Fire-and-forget onboarding execution (executor handles idempotency)
      if (effectiveOnboardingId) {
        onboardingExecutor.execute({ coachId, clientId: userId, onboardingId: effectiveOnboardingId })
          .catch(err => console.error('[Onboarding] Execution failed:', err));
      }

      return {
        id: authUser.user.id,
        email: existingProfile.email,
        name: existingProfile.name,
        userType: existingProfile.user_type,
        profilePictureUrl: existingProfile.profile_picture_url,
        signinMethod: existingProfile.signin_method,
        isActive: existingProfile.is_active,
        createdAt: authUser.user.created_at,
        updatedAt: existingProfile.updated_at,
      };
    }

    const { data: newProfile, error: insertError } = await supabase
      .from('user_profiles')
      .insert({
        id: userId,
        user_type: 'client',
        email: userEmail,
        name: userName,
        profile_picture_url: finalProfilePictureUrl,
        signin_method: signinMethod,
        is_active: true,
      })
      .select()
      .single();

    if (insertError) {
      // If profile already exists (race condition), fetch it
      if (insertError.code === '23505') {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', userId)
          .eq('user_type', 'client')
          .single();

        if (profile) {
          return {
            id: authUser.user.id,
            email: profile.email,
            name: profile.name,
            userType: profile.user_type,
            profilePictureUrl: profile.profile_picture_url,
            signinMethod: profile.signin_method,
            isActive: profile.is_active,
            createdAt: authUser.user.created_at,
            updatedAt: profile.updated_at,
          };
        }
      }
      throw new Error(`Failed to create client profile: ${insertError.message}`);
    }

    // Create client_profiles entry (other details filled later via app)
    // Note: email/name/profile_picture_url/signin_method are stored in user_profiles only
    const { error: clientProfileError } = await supabase
      .from('client_profiles')
      .insert({
        client_id: userId,
      });

    // Ignore if already exists (race condition), but throw for other errors
    if (clientProfileError) {
      if (clientProfileError.code === '23505') {
        console.log('client_profiles entry already exists for user:', userId);
      } else {
        throw new Error(`Failed to create client_profiles entry: ${clientProfileError.message}`);
      }
    }

    // Update user metadata with coach_id
    await supabase.auth.admin.updateUserById(userId, {
      user_metadata: {
        ...authUser.user.user_metadata,
        coach_id: coachId,
      },
    });

    // Handle invitation token if provided
    let invitationProcessed = false;
    let effectiveOnboardingId = onboardingId;

    if (invitationToken) {
      const { data: assignment } = await supabase
        .from('coach_client_assignments')
        .select('*')
        .eq('invitation_token', invitationToken)
        .maybeSingle();

      if (assignment) {
        invitationProcessed = true;
        // Read onboarding_id from the assignment if not provided via invite code
        if (!effectiveOnboardingId && assignment.onboarding_id) {
          effectiveOnboardingId = assignment.onboarding_id;
        }

        if (assignment.client_id !== userId) {
          const stubClientId = assignment.client_id;

          // 1. Update assignment to new user
          await supabase
            .from('coach_client_assignments')
            .update({
              client_id: userId,
              status: 'accepted',
              connected_at: new Date().toISOString(),
              invitation_token: null // Clear token after use
            })
            .eq('invitation_token', invitationToken);

          // 2. Transfer other assignments
          const assignmentTables = [
            'client_metric_assignments',
            'client_habit_assignments',
            'client_file_assignments',
            'client_checkin_assignments',
            'client_questionnaire_assignments'
          ];

          for (const table of assignmentTables) {
            await supabase
              .from(table)
              .update({ client_id: userId })
              .eq('client_id', stubClientId);
          }

          // 3. Cleanup stub user
          await supabase.auth.admin.deleteUser(stubClientId);
        }
      }
    }

    if (!invitationProcessed) {
      // If no token or token not found (could be a general coach code),
      // just ensure the assignment exists
      await supabase
        .from('coach_client_assignments')
        .upsert({
          coach_id: coachId,
          client_id: userId,
          status: 'accepted',
          connected_at: new Date().toISOString(),
          onboarding_id: effectiveOnboardingId || null,
        }, { onConflict: 'coach_id, client_id' });
    }

    // Fire-and-forget onboarding execution (executor handles idempotency)
    if (effectiveOnboardingId) {
      onboardingExecutor.execute({ coachId, clientId: userId, onboardingId: effectiveOnboardingId })
        .catch(err => console.error('[Onboarding] Execution failed:', err));
    }

    return {
      id: authUser.user.id,
      email: newProfile.email,
      name: newProfile.name,
      userType: newProfile.user_type,
      profilePictureUrl: newProfile.profile_picture_url,
      signinMethod: newProfile.signin_method,
      isActive: newProfile.is_active,
      createdAt: authUser.user.created_at,
      updatedAt: newProfile.updated_at,
    };
  }

  /**
   * Mark a client as connected (called when client signs in via mobile app)
   */
  async markClientConnected(clientId: string): Promise<void> {
    const supabase = getSupabaseClient();

    const { error } = await supabase
      .from('coach_client_assignments')
      .update({
        status: 'connected',
        connected_at: new Date().toISOString(),
      })
      .eq('client_id', clientId)
      .in('status', ['accepted', 'invited']);

    if (error) {
      console.error('[Service] Failed to mark client as connected:', error);
    }
  }

  /**
   * Delete user account
   * For coaches: Cancels Stripe subscription, then deletes coach_profiles which triggers storage cleanup and cascade deletion
   * For clients: Deletes user_profiles (this shouldn't happen from web - only coaches use web)
   */
  async deleteAccount(userId: string): Promise<void> {
    const supabase = getSupabaseClient();

    // Check if user is a coach
    const { data: coachProfile } = await supabase
      .from('coach_profiles')
      .select('id')
      .eq('id', userId)
      .maybeSingle();

    if (coachProfile) {
      const stripe = getStripeClient();

      // IMPORTANT: Cancel coach's platform subscription FIRST
      // This ensures no future charges occur even if subscription was set to cancel at period end
      try {
        const { data: subscription } = await supabase
          .from('platform_subscriptions')
          .select('stripe_subscription_id, stripe_customer_id')
          .eq('coach_id', userId)
          .maybeSingle();

        if (subscription?.stripe_subscription_id) {
          await stripe.subscriptions.cancel(subscription.stripe_subscription_id, {
            prorate: false,
          });
          console.log(`[AccountDeletion] Cancelled platform subscription ${subscription.stripe_subscription_id} for coach ${userId}`);
        }
      } catch (stripeError: any) {
        console.error(`[AccountDeletion] Error cancelling platform subscription for coach ${userId}:`, stripeError.message);
      }

      // IMPORTANT: Cancel ALL client subscriptions (payments from clients to this coach)
      // This ensures clients are not charged for a coach that no longer exists
      try {
        const { data: stripeAccount } = await supabase
          .from('coach_stripe_accounts')
          .select('stripe_account_id')
          .eq('coach_id', userId)
          .maybeSingle();

        if (stripeAccount?.stripe_account_id) {
          const { data: clientSubscriptions } = await supabase
            .from('client_subscriptions')
            .select('stripe_subscription_id')
            .eq('coach_id', userId)
            .in('status', ['active', 'trialing', 'past_due']);

          if (clientSubscriptions && clientSubscriptions.length > 0) {
            for (const sub of clientSubscriptions) {
              try {
                await stripe.subscriptions.cancel(sub.stripe_subscription_id, {
                  prorate: false,
                }, { stripeAccount: stripeAccount.stripe_account_id });
                console.log(`[AccountDeletion] Cancelled client subscription ${sub.stripe_subscription_id} for coach ${userId}`);
              } catch (subErr: any) {
                console.error(`[AccountDeletion] Error cancelling client subscription ${sub.stripe_subscription_id}:`, subErr.message);
              }
            }
          }
        }
      } catch (clientSubError: any) {
        console.error(`[AccountDeletion] Error cancelling client subscriptions for coach ${userId}:`, clientSubError.message);
      }

      // Update referral status to 'trial_cancelled' if this coach was referred
      // and is still in trial (hasn't converted to paid)
      // Also create an event in coach_referral_events for the activity timeline
      try {
        // First, get the referral record with the coach's stored info
        const { data: referral } = await supabase
          .from('coach_referrals')
          .select('id, referrer_coach_id, referred_coach_name, referred_coach_profile_picture_url')
          .eq('referred_coach_id', userId)
          .eq('status', 'trial_started')
          .maybeSingle();

        if (referral) {
          const now = new Date().toISOString();

          // Update the referral status
          const { error: referralError } = await supabase
            .from('coach_referrals')
            .update({
              status: 'trial_cancelled',
              trial_cancelled_at: now,
            })
            .eq('id', referral.id);

          if (!referralError) {
            console.log(`[AccountDeletion] Updated referral status to trial_cancelled for coach ${userId}`);

            // Create the trial_cancelled event for the activity timeline
            const { error: eventError } = await supabase
              .from('coach_referral_events')
              .insert({
                referral_id: referral.id,
                referrer_coach_id: referral.referrer_coach_id,
                event_type: 'trial_cancelled',
                referred_coach_name: referral.referred_coach_name || 'Unknown',
                referred_coach_profile_picture_url: referral.referred_coach_profile_picture_url,
                created_at: now,
              });

            if (eventError) {
              console.error(`[AccountDeletion] Error creating trial_cancelled event:`, eventError.message);
            } else {
              console.log(`[AccountDeletion] Created trial_cancelled event for referral ${referral.id}`);
            }
          }
        }
      } catch (referralError: any) {
        // Non-critical - log but don't fail
        console.error(`[AccountDeletion] Error updating referral status for coach ${userId}:`, referralError.message);
      }

      // Delete coach_profiles - triggers handle storage and cascade cleanup
      // See migration 132_coach_account_deletion_cleanup.sql for trigger details
      const { error } = await supabase
        .from('coach_profiles')
        .delete()
        .eq('id', userId);

      if (error) {
        throw new Error(`Failed to delete coach profile: ${error.message}`);
      }
    } else {
      // Client deletion - use existing client deletion logic
      // Note: This shouldn't typically happen from web settings - only coaches use web
      const { error } = await supabase
        .from('user_profiles')
        .delete()
        .eq('id', userId);

      if (error) {
        throw new Error(`Failed to delete user profile: ${error.message}`);
      }
    }
  }

  /**
   * Alias for ensureClientProfile to keep controller logic clean
   */
  async handleNewClient(userId: string, coachId: string, invitationToken?: string, onboardingId?: string) {
    const profile = await this.ensureClientProfile(userId, coachId, invitationToken, onboardingId);
    return {
      profile,
      isNew: true, // simplified for now
    };
  }

  /**
   * Seed demo client data for a coach
   * Idempotent - only seeds if no demo client exists for this coach
   */
  async seedDemoData(coachId: string): Promise<{ seeded: boolean }> {
    const supabase = getSupabaseClient();

    // Get coach info
    const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(coachId);
    if (authError || !authUser.user) {
      throw new Error('Coach not found');
    }

    // Check if coach profile exists
    const { data: coachProfile } = await supabase
      .from('coach_profiles')
      .select('id')
      .eq('id', coachId)
      .maybeSingle();

    if (!coachProfile) {
      throw new Error('Coach profile not found');
    }

    // Check if demo client is fully set up (user_profiles + assignment both exist)
    const [{ data: existingDemo }, { data: existingAssignment }] = await Promise.all([
      supabase
        .from('user_profiles')
        .select('id')
        .eq('id', coachId)
        .eq('user_type', 'client')
        .maybeSingle(),
      supabase
        .from('coach_client_assignments')
        .select('client_id')
        .eq('coach_id', coachId)
        .eq('client_id', coachId)
        .maybeSingle(),
    ]);

    if (existingDemo && existingAssignment) {
      console.log('[DemoData] Demo client already exists for coach:', coachId);
      return { seeded: false };
    }

    // Check for orphaned client_profiles data (in case previous cleanup failed)
    // This can happen if the coach deleted their account but cleanup didn't complete
    const { data: orphanedClientProfile } = await supabase
      .from('client_profiles')
      .select('client_id')
      .eq('client_id', coachId)
      .maybeSingle();

    if (orphanedClientProfile) {
      console.log('[DemoData] Found orphaned client_profiles data, cleaning up for coach:', coachId);
      // Clean up orphaned data before re-seeding
      // Delete in order to respect FK constraints
      await supabase.from('coach_client_assignments').delete().eq('client_id', coachId);
      await supabase.from('client_profiles').delete().eq('client_id', coachId);
    }

    // Get coach profile data for demo client (same email, name, signin_method, profile_picture)
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('name, email, signin_method, profile_picture_url, timezone')
      .eq('id', coachId)
      .eq('user_type', 'coach')
      .maybeSingle();

    const coachName = userProfile?.name || authUser.user.user_metadata?.name || 'Coach';
    const coachEmail = userProfile?.email || authUser.user.email || '';
    const signinMethod = (userProfile?.signin_method || 'email') as 'email' | 'google';
    const profilePictureUrl = userProfile?.profile_picture_url || null;
    const timezone = userProfile?.timezone || null;

    // Seed demo client
    await demoDataService.seedDemoClient({
      coachId,
      coachName,
      coachEmail,
      signinMethod,
      profilePictureUrl,
      timezone,
    });

    return { seeded: true };
  }
}

export const userService = new UserService();
