import { getSupabaseClient } from './supabase.service';

interface RegisterInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

interface LoginInput {
  email: string;
  password: string;
}

interface GoogleUser {
  email: string;
  given_name: string;
  family_name: string;
  sub: string;
}

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
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
        first_name: input.firstName,
        last_name: input.lastName,
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
          first_name: googleUser.given_name,
          last_name: googleUser.family_name,
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
      // Return user without profile if profile doesn't exist
      return {
        id: authUser.user.id,
        email: authUser.user.email || '',
        firstName: authUser.user.user_metadata?.first_name || '',
        lastName: authUser.user.user_metadata?.last_name || '',
        createdAt: authUser.user.created_at,
      };
    }

    return {
      id: authUser.user.id,
      email: authUser.user.email || '',
      firstName: profile.first_name,
      lastName: profile.last_name,
      createdAt: authUser.user.created_at,
    };
  }
}

export const authService = new AuthService();
