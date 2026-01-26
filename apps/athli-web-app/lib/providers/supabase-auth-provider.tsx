'use client';

import { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { createClient } from '@/supabase/client';
import type { User } from '@supabase/supabase-js';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { UserProfile, getUserProfileSafe } from '@/api/user/user-service';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { authEvents } from '@/lib/auth-events';
import { Loader2 } from 'lucide-react';

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
  verifyRecoveryOTP: (email: string, token: string) => Promise<any>;
  resendRecoveryOTP: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function SupabaseAuthProvider({ children }: { children: ReactNode }) {
  const [supabaseUser, setSupabaseUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [showSessionExpiredDialog, setShowSessionExpiredDialog] = useState(false);
  const [isRedirectingToLogin, setIsRedirectingToLogin] = useState(false);
  const isSigningOutRef = useRef(false);
  const wasAuthenticatedRef = useRef(false);
  const pathnameRef = useRef<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();
  const queryClient = useQueryClient();

  // Keep pathname ref updated
  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  // Track if user was authenticated (for detecting unexpected sign-outs)
  useEffect(() => {
    wasAuthenticatedRef.current = !!supabaseUser;
  }, [supabaseUser]);

  // Listen for session expired events from axios interceptor
  useEffect(() => {
    const unsubscribe = authEvents.onSessionExpired(() => {
      // Don't show dialog on auth pages - user is already trying to log in
      const currentPath = pathnameRef.current;
      if (currentPath?.startsWith('/auth') || currentPath?.startsWith('/client/')) {
        return;
      }
      // Only show dialog if user was authenticated
      if (wasAuthenticatedRef.current) {
        setShowSessionExpiredDialog(true);
      }
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error?.message?.includes('Refresh Token') || error?.message?.includes('refresh_token')) {
        // Only show dialog if not on auth pages
        const currentPath = pathnameRef.current;
        if (!currentPath?.startsWith('/auth') && !currentPath?.startsWith('/client/')) {
          setShowSessionExpiredDialog(true);
        }
        setSupabaseUser(null);
        setIsAuthLoading(false);
        return;
      }
      setSupabaseUser(session?.user ?? null);
      setIsAuthLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      // Skip state updates when signing out to keep the loading overlay visible
      if (isSigningOutRef.current) return;

      // Handle token refresh errors
      if (event === 'TOKEN_REFRESHED' && !session) {
        const currentPath = pathnameRef.current;
        if (!currentPath?.startsWith('/auth') && !currentPath?.startsWith('/client/')) {
          setShowSessionExpiredDialog(true);
        }
        setSupabaseUser(null);
        setIsAuthLoading(false);
        return;
      }

      // Handle sign out due to invalid session
      if (event === 'SIGNED_OUT' && wasAuthenticatedRef.current && !isSigningOutRef.current) {
        // User was signed out unexpectedly (likely due to invalid refresh token)
        const currentPath = pathnameRef.current;
        if (!currentPath?.startsWith('/auth') && !currentPath?.startsWith('/client/')) {
          setShowSessionExpiredDialog(true);
        }
      }

      setSupabaseUser(session?.user ?? null);
      setIsAuthLoading(false);

      // Invalidate profile query on auth state change
      if (session?.user) {
        queryClient.invalidateQueries({ queryKey: ['user-profile', session.user.id] });
      } else {
        queryClient.removeQueries({ queryKey: ['user-profile'] });
      }
    });

    return () => subscription.unsubscribe();
  }, [queryClient]);

  // Use React Query for profile fetching with the shared safe fetcher
  const { data: userProfile, isLoading: isProfileLoading } = useQuery({
    queryKey: ['user-profile', supabaseUser?.id],
    queryFn: () => getUserProfileSafe(supabaseUser!),
    enabled: !!supabaseUser,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: false,
  });

  const isLoading = isAuthLoading || (!!supabaseUser && isProfileLoading);
  const user = userProfile || null;

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
    // Redirect to verify email page (email stored in sessionStorage by caller)
    router.push('/auth/verify-email');
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
    // Set flag to prevent auth state change listener from updating state
    // This keeps the loading overlay visible until navigation completes
    isSigningOutRef.current = true;

    const { error } = await supabase.auth.signOut();
    if (error) {
      isSigningOutRef.current = false;
      throw error;
    }

    // Use window.location for full page navigation - keeps overlay visible until redirect completes
    // Don't update React state here since we're navigating away
    const landingPage = process.env.NEXT_PUBLIC_LANDING_PAGE || '/';
    window.location.href = landingPage;
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

  const verifyRecoveryOTP = async (email: string, token: string) => {
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'recovery',
    });

    if (error) throw error;

    return data;
  };

  const resendRecoveryOTP = async (email: string) => {
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

  const signInWithApple = async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'apple',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        scopes: 'email name',
      },
    });

    if (error) throw error;
  };

  const refreshUser = async () => {
    // Force refresh the session to get updated user data
    const { data: { session }, error } = await supabase.auth.refreshSession();

    if (error) {
      console.error('Error refreshing session:', error);
      // Check if it's a refresh token error
      if (error.message?.includes('Refresh Token') || error.message?.includes('refresh_token')) {
        const currentPath = pathnameRef.current;
        if (!currentPath?.startsWith('/auth') && !currentPath?.startsWith('/client/')) {
          setShowSessionExpiredDialog(true);
        }
        setSupabaseUser(null);
      }
      return;
    }

    if (session?.user) {
      setSupabaseUser(session.user);
      // Invalidate query to trigger refetch
      await queryClient.invalidateQueries({ queryKey: ['user-profile', session.user.id] });
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
    verifyRecoveryOTP,
    resendRecoveryOTP,
    updatePassword,
    signInWithGoogle,
    signInWithApple,
    refreshUser,
  };

  const handleSessionExpiredLogin = () => {
    setIsRedirectingToLogin(true);
    window.location.href = '/auth/login';
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
      <Dialog open={showSessionExpiredDialog} onOpenChange={() => {}}>
        <DialogContent showCloseButton={false} className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Session Expired</DialogTitle>
            <DialogDescription>
              Your session has expired. Please log in again to continue.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              onClick={handleSessionExpiredLogin} 
              className="w-full"
              disabled={isRedirectingToLogin}
            >
              {isRedirectingToLogin ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Log In'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AuthContext.Provider>
  );
}

export function useSupabaseAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useSupabaseAuth must be used within a SupabaseAuthProvider');
  }
  return context;
}
