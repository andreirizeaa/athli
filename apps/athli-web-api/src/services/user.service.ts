import { getSupabaseClient } from './supabase.service';
import { avatarService } from './avatar.service';

interface UpdateProfileInput {
  name?: string;
  profilePictureUrl?: string | null;
}

interface UserProfile {
  id: string;
  email: string;
  name: string;
  userType: 'coach' | 'client';
  profilePictureUrl?: string | null;
  signinMethod: 'email' | 'google';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
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

    // Get user profile from database
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (profileError) {
      throw new Error(`Failed to fetch profile: ${profileError.message}`);
    }

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

  /**
   * Update user profile
   */
  async updateUserProfile(userId: string, updates: UpdateProfileInput): Promise<UserProfile> {
    const supabase = getSupabaseClient();

    // Update auth.users metadata if name is being updated
    if (updates.name !== undefined || updates.profilePictureUrl !== undefined) {
      const metadataUpdates: any = {};

      if (updates.name !== undefined) {
        metadataUpdates.name = updates.name;
      }

      if (updates.profilePictureUrl !== undefined) {
        metadataUpdates.profile_picture_url = updates.profilePictureUrl;
        // Also update avatar_url for consistency
        metadataUpdates.avatar_url = updates.profilePictureUrl;
      }

      const { error: authError } = await supabase.auth.admin.updateUserById(userId, {
        user_metadata: metadataUpdates,
      });

      if (authError) {
        throw new Error(`Failed to update auth metadata: ${authError.message}`);
      }

      // The trigger will automatically sync these changes to user_profiles
      // Wait a bit for the trigger to complete
      await new Promise((resolve) => setTimeout(resolve, 200));
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
   * Ensure client profile exists for a user
   * Creates a client profile if it doesn't exist, otherwise returns existing profile
   */
  async ensureClientProfile(userId: string, coachId: string, invitationToken?: string): Promise<UserProfile> {
    const supabase = getSupabaseClient();

    // Get user from auth
    const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(userId);

    if (authError || !authUser.user) {
      throw new Error('User not found');
    }

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

    // Create client profile
    const userEmail = authUser.user.email || '';
    const userName = authUser.user.user_metadata?.name || userEmail.split('@')[0];
    const signinMethod = authUser.user.app_metadata?.provider === 'google' ? 'google' : 'email';
    const profilePictureUrl = authUser.user.user_metadata?.avatar_url ||
      authUser.user.user_metadata?.picture || null;

    // Generate default avatar if not present and using email
    let finalProfilePictureUrl = profilePictureUrl;
    if (!finalProfilePictureUrl && signinMethod === 'email') {
      try {
        finalProfilePictureUrl = await avatarService.generateDefaultAvatar(userId, userName);
      } catch (avatarErr) {
        console.error('Failed to generate default avatar during profile creation:', avatarErr);
      }
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

    // Update user metadata with coach_id
    await supabase.auth.admin.updateUserById(userId, {
      user_metadata: {
        ...authUser.user.user_metadata,
        coach_id: coachId,
      },
    });

    // Handle invitation token if provided
    let invitationProcessed = false;
    if (invitationToken) {
      const { data: assignment } = await supabase
        .from('coach_client_assignments')
        .select('*')
        .eq('invitation_token', invitationToken)
        .maybeSingle();

      if (assignment) {
        invitationProcessed = true;
        if (assignment.client_id !== userId) {
          const stubClientId = assignment.client_id;

          // 1. Update assignment to new user
          await supabase
            .from('coach_client_assignments')
            .update({
              client_id: userId,
              status: 'connected',
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
          status: 'connected',
          connected_at: new Date().toISOString()
        }, { onConflict: 'coach_id, client_id' });
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
   * Delete user account
   */
  async deleteAccount(userId: string): Promise<void> {
    const supabase = getSupabaseClient();

    // Delete user profile from user_profiles table
    const { error: profileError } = await supabase
      .from('user_profiles')
      .delete()
      .eq('id', userId);

    if (profileError) {
      throw new Error(`Failed to delete user profile: ${profileError.message}`);
    }
  }

  /**
   * Alias for ensureClientProfile to keep controller logic clean
   */
  async handleNewClient(userId: string, coachId: string, invitationToken?: string) {
    const profile = await this.ensureClientProfile(userId, coachId, invitationToken);
    return {
      profile,
      isNew: true, // simplified for now
    };
  }
}

export const userService = new UserService();
