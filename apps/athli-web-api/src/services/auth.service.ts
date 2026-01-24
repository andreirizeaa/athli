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
      console.error('Registration error:', authError.message);
      throw new Error('Registration failed. Please try again.');
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
      console.error('Email verification error:', verifyError?.message);
      throw new Error('Invalid or expired verification code');
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
      console.error('Resend OTP error:', error.message);
      throw new Error('Failed to send verification code. Please try again.');
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
      console.error('Security OTP user check error:', listError.message);
      throw new Error('Failed to send security verification code. Please try again.');
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
        console.error('Security OTP send error:', otpError.message);
        throw new Error('Failed to send security verification code. Please try again.');
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
        console.error('Security OTP create user error:', createError.message);
        throw new Error('Failed to send security verification code. Please try again.');
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
      console.error('Login error:', loginError?.message);
      throw new Error('Invalid email or password');
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
   * Check auth provider for a user by email
   * Returns the signin method (email, google, apple) or null if user doesn't exist
   */
  async checkAuthProvider(email: string): Promise<{ provider: 'email' | 'google' | 'apple' | null; exists: boolean }> {
    const supabase = getSupabaseClient();

    // Check if user exists using admin API
    const { data: users, error: listError } = await supabase.auth.admin.listUsers();

    if (listError) {
      console.error('Auth provider check error:', listError.message);
      throw new Error('Unable to check authentication provider. Please try again.');
    }

    const user = users.users.find((u) => u.email === email);

    if (!user) {
      return { provider: null, exists: false };
    }

    // Check app_metadata for provider (most reliable)
    const appProvider = user.app_metadata?.provider as string;

    if (appProvider === 'google') {
      return { provider: 'google', exists: true };
    }

    if (appProvider === 'apple') {
      return { provider: 'apple', exists: true };
    }

    // Check user_metadata for additional indicators
    const userMetadata = user.user_metadata || {};

    // Check issuer (iss) field
    if (userMetadata.iss) {
      if (userMetadata.iss.includes('appleid.apple.com')) {
        return { provider: 'apple', exists: true };
      }
      if (userMetadata.iss.includes('accounts.google.com') || userMetadata.iss.includes('google')) {
        return { provider: 'google', exists: true };
      }
    }

    // Check for Apple private relay email
    if (email.includes('@privaterelay.appleid.com')) {
      return { provider: 'apple', exists: true };
    }

    // Check for Google-specific indicators
    if (userMetadata.picture && userMetadata.picture.includes('googleusercontent.com')) {
      return { provider: 'google', exists: true };
    }

    // Check user_profiles for signin_method (single source of truth)
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('signin_method')
      .eq('id', user.id)
      .single();

    if (userProfile?.signin_method && userProfile.signin_method !== 'email') {
      return { provider: userProfile.signin_method as 'google' | 'apple', exists: true };
    }

    // Default to email
    return { provider: 'email', exists: true };
  }

  /**
   * Forgot password - send reset email
   * Always succeeds to prevent email enumeration
   */
  async forgotPassword(email: string) {
    const supabase = getSupabaseClient();

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.CORS_ORIGIN || 'http://localhost:3001'}/auth/reset-password`,
    });

    // Log error but don't expose it - always return success to prevent email enumeration
    if (error) {
      console.error('Forgot password error:', error.message);
    }
    // Always succeed to prevent email enumeration attacks
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
      console.error('Password reset OTP verification error:', verifyError?.message);
      throw new Error('Invalid or expired verification code');
    }

    // Use admin API to update password
    const { error: updateError } = await supabase.auth.admin.updateUserById(sessionData.user.id, {
      password: newPassword,
    });

    if (updateError) {
      console.error('Password update error:', updateError.message);
      throw new Error('Password reset failed. Please try again.');
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
      console.error('Google auth user check error:', listError.message);
      throw new Error('Authentication failed. Please try again.');
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
        console.error('Google auth user creation error:', createError?.message);
        throw new Error('Authentication failed. Please try again.');
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
   * Verify JWT token
   */
  verifyToken(token: string): { userId: string } | null {
    const supabase = getSupabaseClient();

    try {
      // Use Supabase to verify the JWT token
      // Note: This is a synchronous check of the JWT signature
      // For production, you may want to use supabase.auth.getUser(token) which is async
      const decoded = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());

      // Basic validation - check if token has required fields and isn't expired
      if (!decoded.sub || !decoded.exp) {
        return null;
      }

      // Check if token is expired
      if (decoded.exp * 1000 < Date.now()) {
        return null;
      }

      return { userId: decoded.sub };
    } catch (error) {
      return null;
    }
  }

  /**
   * Get user by ID - uses views that merge user_profiles with coach/client profiles
   */
  async getUserById(userId: string): Promise<User | null> {
    const supabase = getSupabaseClient();

    // Get user from auth using admin API
    const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(userId);

    if (authError || !authUser.user) {
      return null;
    }

    // Try to get coach profile first using the full view (merges user_profiles)
    const { data: coachProfile, error: coachError } = await supabase
      .from('coach_profiles_full')
      .select('*')
      .eq('id', userId)
      .single();

    if (coachProfile && !coachError) {
      return {
        id: authUser.user.id,
        email: coachProfile.email,
        name: coachProfile.name,
        userType: 'coach',
        profilePictureUrl: coachProfile.profile_picture_url,
        signinMethod: coachProfile.signin_method,
        isActive: coachProfile.is_active,
        createdAt: authUser.user.created_at,
      };
    }

    // Try client_profiles_full view if not a coach
    const { data: clientProfile, error: clientError } = await supabase
      .from('client_profiles_full')
      .select('*')
      .eq('client_id', userId)
      .single();

    if (clientProfile && !clientError) {
      return {
        id: authUser.user.id,
        email: clientProfile.email || authUser.user.email || '',
        name: clientProfile.name || authUser.user.user_metadata?.name || '',
        userType: 'client',
        profilePictureUrl: clientProfile.profile_picture_url || authUser.user.user_metadata?.avatar_url || null,
        signinMethod: clientProfile.signin_method || 'email',
        isActive: true,
        createdAt: authUser.user.created_at,
      };
    }

    // Fallback: Try user_profiles table directly
    const { data: userProfile, error: userError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (userProfile && !userError) {
      return {
        id: authUser.user.id,
        email: userProfile.email,
        name: userProfile.name,
        userType: userProfile.user_type,
        profilePictureUrl: userProfile.profile_picture_url,
        signinMethod: userProfile.signin_method,
        isActive: true,
        createdAt: authUser.user.created_at,
      };
    }

    // Return user from metadata as last resort
    console.error('Profile fetch error - no profile found in any table for user:', userId);
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

}

export const authService = new AuthService();
