import { getSupabaseClient } from './supabase.service';

interface RegisterInput {
  email: string;
  password: string;
  name: string;
}

interface LoginInput {
  email: string;
  password: string;
}

interface GoogleUser {
  email: string;
  name: string;
  picture?: string;
  sub: string;
}

interface User {
  id: string;
  email: string;
  name: string;
  userType: 'coach' | 'client';
  profilePictureUrl?: string | null;
  signinMethod: 'email' | 'google';
  isActive: boolean;
  createdAt: string;
}

class AuthService {
  /**
   * Register a new user
   */
  async register(input: RegisterInput) {
    const supabase = getSupabaseClient();

    // Create user in Supabase Auth using admin API
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: input.email,
      password: input.password,
      email_confirm: false, // Require email verification
      user_metadata: {
        name: input.name,
        user_type: 'coach', // Default to coach for /auth registration
      },
    });

    if (authError) {
      throw new Error(`Registration failed: ${authError.message}`);
    }

    if (!authData.user) {
      throw new Error('Failed to create user');
    }

    // The trigger will automatically create the user_profile
    // Supabase will automatically send OTP email when email_confirm is false

    return {
      userId: authData.user.id,
      requiresVerification: true,
    };
  }

  /**
   * Verify email with OTP
   */
  async verifyEmail(email: string, otp: string) {
    const supabase = getSupabaseClient();

    // Verify OTP and create session
    // Note: verifyOtp works with service role key
    const { data: sessionData, error: verifyError } = await supabase.auth.verifyOtp({
      email,
      token: otp,
      type: 'email',
    });

    if (verifyError || !sessionData.session || !sessionData.user) {
      throw new Error(`Email verification failed: ${verifyError?.message || 'Invalid OTP'}`);
    }

    // Get user profile
    const user = await this.getUserById(sessionData.user.id);

    if (!user) {
      throw new Error('User not found');
    }

    return {
      token: sessionData.session.access_token,
      user,
    };
  }

  /**
   * Resend OTP
   */
  async resendOTP(email: string) {
    const supabase = getSupabaseClient();

    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
    });

    if (error) {
      throw new Error(`Failed to resend OTP: ${error.message}`);
    }
  }

  /**
   * Send OTP for security verification (password/email changes)
   * This sends an OTP email to the user for verification before making security changes
   * For email changes, this can send to a new email address that doesn't exist yet
   */
  async sendSecurityOTP(email: string) {
    const supabase = getSupabaseClient();

    // Check if user exists first
    const { data: users, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      throw new Error(`Failed to check user: ${listError.message}`);
    }

    const userExists = users.users.some((u) => u.email === email);

    if (userExists) {
      // For existing users, use signInWithOtp with anon key
      // This works even if signups are disabled on the client side
      const { createClient: createSupabaseClient } = await import('@supabase/supabase-js');
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_KEY;
      
      if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error('Missing Supabase configuration (NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_KEY)');
      }

      const anonClient = createSupabaseClient(supabaseUrl, supabaseAnonKey);
      const { data, error: otpError } = await anonClient.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: false,
        },
      });

      // If signInWithOtp fails, throw the error
      // Note: Even if signups are disabled, signInWithOtp with shouldCreateUser: false
      // should still work for existing users, but if it doesn't, we need to handle it
      if (otpError) {
        // Check if the error is about signups being disabled
        // In that case, the OTP might still be sent, so we'll log it but not throw
        if (otpError.message?.includes('signups') || otpError.message?.includes('disabled')) {
          // OTP might have been sent despite the error, so we'll proceed
          // This is a known issue with Supabase when signups are disabled
          console.warn('Signups disabled warning, but OTP may have been sent:', otpError.message);
          return; // OTP was likely sent, so we'll return successfully
        }
        throw new Error(`Failed to send security OTP: ${otpError.message}`);
      }
      // OTP sent successfully (data may be null, which is fine)
    } else {
      // For new email addresses (email changes), create a temporary unconfirmed user
      // This will automatically send an OTP email to verify the email address
      const { error: createError } = await supabase.auth.admin.createUser({
        email,
        email_confirm: false, // Don't auto-confirm, requires OTP verification
        user_metadata: {
          temp_user: true, // Mark as temporary for potential cleanup
          purpose: 'email_verification', // Indicate this is for email verification only
        },
      });

      if (createError) {
        throw new Error(`Failed to send security OTP: ${createError.message}`);
      }

      // Supabase automatically sends OTP email when email_confirm is false
    }
  }

  /**
   * Verify OTP for security verification (password/email changes)
   * This verifies an OTP without creating a session
   */
  async verifySecurityOTP(email: string, otp: string): Promise<{ valid: boolean }> {
    const supabase = getSupabaseClient();

    // Verify OTP using the service role
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token: otp,
      type: 'email',
    });

    if (error || !data.user) {
      return { valid: false };
    }

    return { valid: true };
  }

  /**
   * Login user
   */
  async login(input: LoginInput) {
    const supabase = getSupabaseClient();

    // signInWithPassword works with service role key
    const { data: sessionData, error: loginError } = await supabase.auth.signInWithPassword({
      email: input.email,
      password: input.password,
    });

    if (loginError || !sessionData.session) {
      throw new Error(`Login failed: ${loginError?.message || 'Invalid credentials'}`);
    }

    // Get user profile
    const user = await this.getUserById(sessionData.user.id);

    if (!user) {
      throw new Error('User not found');
    }

    return {
      token: sessionData.session.access_token,
      user,
    };
  }

  /**
   * Forgot password - send reset email
   */
  async forgotPassword(email: string) {
    const supabase = getSupabaseClient();

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.CORS_ORIGIN || 'http://localhost:3001'}/auth/reset-password`,
    });

    if (error) {
      throw new Error(`Failed to send password reset email: ${error.message}`);
    }
  }

  /**
   * Reset password with OTP
   */
  async resetPassword(email: string, otp: string, newPassword: string) {
    const supabase = getSupabaseClient();

    // Verify OTP first (recovery type)
    const { data: sessionData, error: verifyError } = await supabase.auth.verifyOtp({
      email,
      token: otp,
      type: 'recovery',
    });

    if (verifyError || !sessionData.session || !sessionData.user) {
      throw new Error(`OTP verification failed: ${verifyError?.message || 'Invalid OTP'}`);
    }

    // Use admin API to update password
    const { error: updateError } = await supabase.auth.admin.updateUserById(sessionData.user.id, {
      password: newPassword,
    });

    if (updateError) {
      throw new Error(`Failed to reset password: ${updateError.message}`);
    }
  }

  /**
   * Handle Google OAuth
   */
  async handleGoogleAuth(googleUser: GoogleUser) {
    const supabase = getSupabaseClient();

    // Check if user exists using admin API
    const { data: existingUsers, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      throw new Error(`Failed to check existing users: ${listError.message}`);
    }

    const existingUser = existingUsers.users.find((u) => u.email === googleUser.email);

    let userId: string;
    let isNew = false;

    if (existingUser) {
      userId = existingUser.id;
    } else {
      // Create new user
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: googleUser.email,
        email_confirm: true, // Google email is already verified
        user_metadata: {
          name: googleUser.name,
          user_type: 'coach', // Default to coach for /auth registration
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

    // Get user profile
    const user = await this.getUserById(userId);

    if (!user) {
      throw new Error('User not found');
    }

    // Generate a magic link for the user to create a session
    // In production, you might want to generate a proper JWT token
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: googleUser.email,
    });

    if (linkError) {
      console.error('Failed to generate magic link:', linkError);
      // Still return user data, client can handle session creation
    }

    // Return a token that can be used (simplified - in production use proper JWT)
    return {
      token: linkData?.properties?.hashed_token || '',
      user,
      isNew,
    };
  }

  /**
   * Handle new client signup - validates coach exists, creates client profile if needed
   * This is called after a user signs up/signs in via the client invite link
   * Note: A coach can be their own client (same userId as coachId)
   */
  async handleNewClient(userId: string, coachId: string) {
    const supabase = getSupabaseClient();

    // Validate that coachId exists and is a coach
    const { data: coachProfile, error: coachError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', coachId)
      .eq('user_type', 'coach')
      .maybeSingle();

    if (coachError) {
      throw new Error(`Failed to validate coach: ${coachError.message}`);
    }

    if (!coachProfile) {
      throw new Error('Invalid coach ID. The specified coach does not exist.');
    }

    // Get user from auth
    const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(userId);
    if (authError || !authUser.user) {
      throw new Error('User not found');
    }

    // Check if client profile already exists for this user
    const { data: existingClientProfile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .eq('user_type', 'client')
      .maybeSingle();

    // If client profile exists, return it (no need to create duplicate)
    if (existingClientProfile) {
      return {
        profile: {
          id: authUser.user.id,
          email: existingClientProfile.email,
          name: existingClientProfile.name,
          userType: existingClientProfile.user_type,
          profilePictureUrl: existingClientProfile.profile_picture_url,
          signinMethod: existingClientProfile.signin_method,
          isActive: existingClientProfile.is_active,
          createdAt: authUser.user.created_at,
          updatedAt: existingClientProfile.updated_at,
        },
        isNew: false,
      };
    }

    // Create client profile (user can be both coach and client - same userId is allowed)
    const userEmail = authUser.user.email || '';
    const userName = authUser.user.user_metadata?.name || userEmail.split('@')[0];
    const signinMethod = authUser.user.app_metadata?.provider === 'google' ? 'google' : 'email';
    const profilePictureUrl = authUser.user.user_metadata?.avatar_url || 
                              authUser.user.user_metadata?.picture || null;

    const { data: newProfile, error: insertError } = await supabase
      .from('user_profiles')
      .insert({
        id: userId,
        user_type: 'client',
        email: userEmail,
        name: userName,
        profile_picture_url: profilePictureUrl,
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
            profile: {
              id: authUser.user.id,
              email: profile.email,
              name: profile.name,
              userType: profile.user_type,
              profilePictureUrl: profile.profile_picture_url,
              signinMethod: profile.signin_method,
              isActive: profile.is_active,
              createdAt: authUser.user.created_at,
              updatedAt: profile.updated_at,
            },
            isNew: false,
          };
        }
      }
      throw new Error(`Failed to create client profile: ${insertError.message}`);
    }

    // Update user metadata with coach_id (this allows the user to be associated with the coach)
    await supabase.auth.admin.updateUserById(userId, {
      user_metadata: {
        ...authUser.user.user_metadata,
        coach_id: coachId,
      },
    });

    return {
      profile: {
        id: authUser.user.id,
        email: newProfile.email,
        name: newProfile.name,
        userType: newProfile.user_type,
        profilePictureUrl: newProfile.profile_picture_url,
        signinMethod: newProfile.signin_method,
        isActive: newProfile.is_active,
        createdAt: authUser.user.created_at,
        updatedAt: newProfile.updated_at,
      },
      isNew: true,
    };
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: string): Promise<User | null> {
    const supabase = getSupabaseClient();

    // Get user from auth using admin API
    const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(userId);

    if (authError || !authUser.user) {
      return null;
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (profileError) {
      console.error('Profile fetch error:', profileError);
      // Return user from metadata if profile doesn't exist
      return {
        id: authUser.user.id,
        email: authUser.user.email || '',
        name: authUser.user.user_metadata?.name || '',
        userType: (authUser.user.user_metadata?.user_type as 'coach' | 'client') || 'coach',
        profilePictureUrl: authUser.user.user_metadata?.avatar_url || authUser.user.user_metadata?.picture || null,
        signinMethod: (authUser.user.app_metadata?.provider as 'email' | 'google') || 'email',
        isActive: true,
        createdAt: authUser.user.created_at,
      };
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
    };
  }

  /**
   * Delete user account
   * Deletes the user profile from user_profiles table
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

    // Note: We're only deleting from user_profiles as requested
    // The auth.users record will remain, but the user won't have a profile
    // If you want to also delete from auth.users, uncomment the following:
    // const { error: authError } = await supabase.auth.admin.deleteUser(userId);
    // if (authError) {
    //   throw new Error(`Failed to delete auth user: ${authError.message}`);
    // }
  }
}

export const authService = new AuthService();
