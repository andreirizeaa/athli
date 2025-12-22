'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';

interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  profileImageUrl?: string | null;
}

interface AuthContextType {
  user: UserProfile | null;
  supabaseUser: User | null;
  isLoading: boolean;
  signUp: (email: string, password: string, firstName: string, lastName: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  verifyOTP: (email: string, token: string) => Promise<void>;
  resendOTP: (email: string) => Promise<void>;
  resetPasswordForEmail: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function SupabaseAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [supabaseUser, setSupabaseUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSupabaseUser(session?.user ?? null);
      if (session?.user) {
        fetchUserProfile(session.user.id, session.user);
      } else {
        setIsLoading(false);
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSupabaseUser(session?.user ?? null);
      if (session?.user) {
        fetchUserProfile(session.user.id, session.user);
      } else {
        setUser(null);
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserProfile = async (userId: string, authUser?: User) => {
    try {
      // Wait a bit for session to be fully established
      await new Promise((resolve) => setTimeout(resolve, 100));
      
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        // Handle different error codes
        if (error.code === 'PGRST116' || error.status === 406) {
          // No rows returned or RLS blocking - use metadata from auth user
          const currentUser = authUser || supabaseUser;
          if (currentUser) {
            setUser({
              id: userId,
              email: currentUser.email || '',
              firstName: (currentUser.user_metadata?.first_name as string) || '',
              lastName: (currentUser.user_metadata?.last_name as string) || '',
              profileImageUrl: (currentUser.user_metadata?.avatar_url as string) || 
                               (currentUser.user_metadata?.picture as string) || null,
            });
            setIsLoading(false);
            return;
          }
        }
        // For other errors, log but don't throw - use fallback
        console.warn('Profile fetch error (using fallback):', error.message);
      } else if (data) {
        const currentUser = authUser || supabaseUser;
        setUser({
          id: userId,
          email: currentUser?.email || '',
          firstName: data.first_name,
          lastName: data.last_name,
          profileImageUrl: data.profile_image_url,
        });
        setIsLoading(false);
        return;
      }
    } catch (error: any) {
      // Log but don't fail - use fallback
      console.warn('Error fetching user profile (using fallback):', error?.message);
    }
    
    // Fallback to user metadata if profile fetch fails
    const currentUser = authUser || supabaseUser;
    if (currentUser) {
      setUser({
        id: userId,
        email: currentUser.email || '',
        firstName: (currentUser.user_metadata?.first_name as string) || '',
        lastName: (currentUser.user_metadata?.last_name as string) || '',
        profileImageUrl: (currentUser.user_metadata?.avatar_url as string) || 
                         (currentUser.user_metadata?.picture as string) || null,
      });
    }
    setIsLoading(false);
  };

  const signUp = async (email: string, password: string, firstName: string, lastName: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName,
        },
        emailRedirectTo: `${window.location.origin}/auth/verify-email`,
      },
    });

    if (error) throw error;

    // Supabase will automatically send the OTP email
    // Redirect to verify email page
    router.push(`/auth/verify-email?email=${encodeURIComponent(email)}`);
  };

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;

    // Check if email is verified
    if (data.user && !data.user.email_confirmed_at) {
      throw new Error('Please verify your email before signing in');
    }

    // Let the calling component handle navigation
    return data;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setUser(null);
    setSupabaseUser(null);
    router.push('/auth/login');
  };

  const verifyOTP = async (email: string, token: string) => {
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'email',
    });

    if (error) throw error;

    // Successfully verified, let the calling component handle navigation
    return data;
  };

  const resendOTP = async (email: string) => {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
    });

    if (error) throw error;
  };

  const resetPasswordForEmail = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });

    if (error) throw error;
  };

  const updatePassword = async (password: string) => {
    const { error } = await supabase.auth.updateUser({
      password,
    });

    if (error) throw error;

    router.push('/auth/login');
  };

  const signInWithGoogle = async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });

    if (error) throw error;
  };

  const refreshUser = async () => {
    // Force refresh the session to get updated user data
    const { data: { session }, error } = await supabase.auth.refreshSession();

    if (error) {
      console.error('Error refreshing session:', error);
      return;
    }

    if (session?.user) {
      setSupabaseUser(session.user);
      await fetchUserProfile(session.user.id, session.user);
    }
  };

  const value = {
    user,
    supabaseUser,
    isLoading,
    signUp,
    signIn,
    signOut,
    verifyOTP,
    resendOTP,
    resetPasswordForEmail,
    updatePassword,
    signInWithGoogle,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useSupabaseAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useSupabaseAuth must be used within a SupabaseAuthProvider');
  }
  return context;
}
