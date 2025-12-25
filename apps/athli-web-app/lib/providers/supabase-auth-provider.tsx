'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/supabase/client';
import type { User } from '@supabase/supabase-js';

interface UserProfile {
  id: string;
  userType: 'coach' | 'client';
  email: string;
  name: string;
  profilePictureUrl?: string | null;
  signinMethod: 'email' | 'google';
  isActive: boolean;
}

interface AuthContextType {
  user: UserProfile | null;
  supabaseUser: User | null;
  isLoading: boolean;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<any>;
  signOut: () => Promise<void>;
  verifyOTP: (email: string, token: string) => Promise<any>;
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
    // Rely solely on auth metadata to avoid direct DB access
    const currentUser = authUser || supabaseUser;
    if (currentUser) {
      setUser({
        id: userId,
        userType: (currentUser.user_metadata?.user_type as 'coach' | 'client') || 'coach',
        email: currentUser.email || '',
        name: (currentUser.user_metadata?.name as string) || '',
        profilePictureUrl: (currentUser.user_metadata?.avatar_url as string) ||
          (currentUser.user_metadata?.picture as string) || null,
        signinMethod: currentUser.app_metadata?.provider === 'google' ? 'google' : 'email',
        isActive: true, // Default to true since they are logged in
      });
    }
    setIsLoading(false);
  };

  const signUp = async (email: string, password: string, name: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: name,
          user_type: 'coach', // Default to coach for /auth registration
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
        // Set user_type for new Google signups
        scopes: 'email profile',
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
