import { supabase } from '@/lib/supabase';

export interface EmailAuthResult {
  userId: string;
  error?: string;
}

/**
 * Sign in with email and password
 */
export async function signInWithEmail(
  email: string,
  password: string
): Promise<EmailAuthResult> {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw error;
    }

    if (!data.user) {
      throw new Error('No user returned from sign-in');
    }

    return {
      userId: data.user.id,
    };
  } catch (error: any) {
    console.error('Email sign-in error:', error);
    return {
      userId: '',
      error: error.message || 'Failed to sign in with email',
    };
  }
}

/**
 * Sign up with email and password
 */
export async function signUpWithEmail(
  email: string,
  password: string,
  name: string
): Promise<EmailAuthResult> {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
      },
    });

    if (error) {
      throw error;
    }

    if (!data.user) {
      throw new Error('No user returned from sign-up');
    }

    return {
      userId: data.user.id,
    };
  } catch (error: any) {
    console.error('Email sign-up error:', error);
    return {
      userId: '',
      error: error.message || 'Failed to sign up with email',
    };
  }
}
