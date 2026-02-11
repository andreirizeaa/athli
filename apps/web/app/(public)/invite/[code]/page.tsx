'use client';

import { useState, useEffect } from 'react';
import { useParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useSupabaseAuth } from '@/lib/providers/supabase-auth-provider';
import { createClient } from '@/supabase/client';
import { getCoachByCode } from '@/api/coach/coach-public-service';
import { AuthErrorAlert } from '@/components/auth/auth-error-alert';
import { AuthLayout } from '@/components/auth/auth-layout';
import { toast } from 'sonner';
import { Spinner } from '@/components/ui/spinner';
import { isWeakPasswordError, getPasswordErrorMessage } from '@/lib/utils/auth-errors';

export default function ClientInvitePage() {
  const params = useParams<{ code: string }>();
  const pathname = usePathname();
  const { signIn, signInWithGoogle, signInWithApple } = useSupabaseAuth();
  const supabase = createClient();

  const code = Array.isArray(params.code) ? params.code[0] : params.code;
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isAppleLoading, setIsAppleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [coachId, setCoachId] = useState<string | null>(null);
  const [coachName, setCoachName] = useState<string | null>(null);
  const [onboardingId, setOnboardingId] = useState<string | null>(null);
  const [isLoadingCoach, setIsLoadingCoach] = useState(true);

  // Fetch coach information on mount
  useEffect(() => {
    const fetchCoach = async () => {
      if (!code) {
        setIsLoadingCoach(false);
        return;
      }

      try {
        const response = await getCoachByCode(code);
        if (response.data && response.data.coach) {
          setCoachId(response.data.coach.id);
          setCoachName(response.data.coach.name);
          if (response.data.onboardingId) {
            setOnboardingId(response.data.onboardingId);
          }
        }
      } catch (error: any) {
        console.error('Error fetching coach:', error);
        // Don't show error toast - just use fallback text
        setCoachName(null);
      } finally {
        setIsLoadingCoach(false);
      }
    };

    fetchCoach();
  }, [code]);

  // Check if user is already signed in (e.g., from OAuth callback)
  useEffect(() => {
    if (isLoadingCoach || !coachId) return;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        // User is already signed in, check if they need to create client profile
        handleExistingUser(session.user.id);
      }
    });

    // Listen for auth state changes (e.g., OAuth callback)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user && _event === 'SIGNED_IN') {
        // User just signed in (e.g., from OAuth), ensure client profile exists
        handleExistingUser(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, [coachId, isLoadingCoach]);

  const handleExistingUser = async (userId: string) => {
    // Redirect to new-client route which will handle the profile creation
    // Always pass code as potential invitation_token; backend will check if it's a coach code or specific token
    const url = `/auth/new-client?coach_id=${coachId}&invitation_token=${code}`;
    window.location.href = url;
  };


  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name || !email || !password) {
      toast.error('Please fill in all fields');
      return;
    }

    console.log('[Client Invite] Starting signup', { email, coachId, code, name });

    setIsSigningUp(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: name,
            user_type: 'client',
            coach_id: coachId,
          },
          emailRedirectTo: `${window.location.origin}/auth/verify-email`,
        },
      });

      console.log('[Client Invite] Signup result', { success: !error, error: error?.message, userId: data?.user?.id });

      if (error) {
        // If user already exists, try to sign them in instead
        if (error.message.includes('already registered') || error.message.includes('already exists')) {
          try {
            const signInResult = await signIn(email, password);
            if (signInResult?.session?.user) {
              // Wait for session to be established
              await new Promise((resolve) => setTimeout(resolve, 500));

              // Ensure client profile exists
              await handleExistingUser(signInResult.session.user.id);
              return;
            }
          } catch (signInError: any) {
            throw new Error('An account with this email already exists. Please use the correct password or reset your password.');
          }
        }
        throw error;
      }

      // New account created successfully
      toast.success('Account created! Please check your email for verification code.');

      // Store auth flow data in sessionStorage to avoid exposing sensitive data in URL
      sessionStorage.setItem('auth_flow_data', JSON.stringify({
        coach_id: coachId,
        invitation_token: code,
        onboarding_id: onboardingId,
        flow: 'client_invite',
        email: email,
      }));

      const verifyUrl = `/auth/verify-email`;

      console.log('[Client Invite] Redirecting to verify-email', { verifyUrl });

      window.location.href = verifyUrl;
    } catch (err: any) {
      console.error('[Client Invite] Signup failed', { error: err.message, stack: err.stack });
      const message = isWeakPasswordError(err)
        ? getPasswordErrorMessage(err)
        : (err.message || 'Failed to create account');
      toast.error(message);
      setIsSigningUp(false);
    }
  };


  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    try {
      // Store auth flow data in sessionStorage for OAuth callback
      sessionStorage.setItem('auth_flow_data', JSON.stringify({
        coach_id: coachId,
        invitation_token: code,
        onboarding_id: onboardingId,
        flow: 'client_invite',
      }));

      // Pass minimal params to callback to indicate client invite flow
      const callbackUrl = `/auth/callback?flow=client_invite&coach_id=${coachId}`;

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}${callbackUrl}`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
          scopes: 'email profile',
        },
      });

      if (error) throw error;
      // The redirect will happen automatically via OAuth
    } catch (err: any) {
      toast.error(err.message || 'Failed to sign in with Google');
      setIsGoogleLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    setIsAppleLoading(true);
    try {
      // Store auth flow data in sessionStorage for OAuth callback
      sessionStorage.setItem('auth_flow_data', JSON.stringify({
        coach_id: coachId,
        invitation_token: code,
        onboarding_id: onboardingId,
        flow: 'client_invite',
      }));

      // Pass minimal params to callback to indicate client invite flow
      const callbackUrl = `/auth/callback?flow=client_invite&coach_id=${coachId}`;

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'apple',
        options: {
          redirectTo: `${window.location.origin}${callbackUrl}`,
          scopes: 'email name',
        },
      });

      if (error) throw error;
      // The redirect will happen automatically via OAuth
    } catch (err: any) {
      toast.error(err.message || 'Failed to sign in with Apple');
      setIsAppleLoading(false);
    }
  };

  return (
    <AuthLayout singleColumn>
      <AuthErrorAlert pathname={pathname} />
      {isLoadingCoach ? (
        <div className="flex flex-col items-center justify-center gap-4 py-8">
          <Spinner className="size-8" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-3xl font-bold text-foreground">
              {coachName ? `Join ${coachName}'s Program` : 'Join Your Coach\'s Program'}
            </h2>
            <p className="text-sm text-muted-foreground">
              Create an account to get started with your personalized training program
            </p>
          </div>

          {/* Provider Buttons */}
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              className="w-full h-12 rounded-xl transition-all"
              onClick={handleGoogleSignIn}
              disabled={isSigningUp || isGoogleLoading || isAppleLoading}
            >
              {isGoogleLoading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <>
                  <svg className="mr-1.5 h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  Google
                </>
              )}
            </Button>

            <Button
              variant="outline"
              className="w-full h-12 rounded-xl transition-all"
              onClick={handleAppleSignIn}
              disabled={isSigningUp || isGoogleLoading || isAppleLoading}
            >
              {isAppleLoading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <>
                  <svg className="mr-1.5 h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
                  </svg>
                  Apple
                </>
              )}
            </Button>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="w-full border-t border-border" />
            <span className="text-muted-foreground shrink-0 text-sm">or</span>
            <div className="w-full border-t border-border" />
          </div>

          {/* Form */}
          <form className="space-y-4" onSubmit={handleSignUp}>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-muted-foreground text-sm">
                  Name
                </Label>
                <Input
                  id="name"
                  name="name"
                  type="text"
                  required
                  className="w-full h-12 rounded-xl"
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={isSigningUp || isGoogleLoading || isAppleLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-muted-foreground text-sm">
                  Email
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="w-full h-12 rounded-xl"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isSigningUp || isGoogleLoading || isAppleLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-muted-foreground text-sm">
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    required
                    className="w-full h-12 pr-10 rounded-xl"
                    placeholder="Create a password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isSigningUp || isGoogleLoading || isAppleLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    tabIndex={0}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    disabled={isSigningUp || isGoogleLoading || isAppleLoading}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <Button
                type="submit"
                className="w-full h-12 rounded-xl"
                disabled={isSigningUp || isGoogleLoading || isAppleLoading}
              >
                {isSigningUp ? (
                  <>
                    <Loader2 className="size-4 animate-spin mr-2" />
                    Creating account...
                  </>
                ) : (
                  'Create Account'
                )}
              </Button>
            </div>
          </form>

          {/* Terms */}
          <div className="text-center text-sm text-muted-foreground">
            By signing up, you agree to our{' '}
            <Link href="/terms" className="underline hover:text-foreground/70">
              Terms
            </Link>{' '}
            and{' '}
            <Link href="/privacy" className="underline hover:text-foreground/70">
              Privacy Policy
            </Link>
            .
          </div>
        </div>
      )}
    </AuthLayout>
  );
}

