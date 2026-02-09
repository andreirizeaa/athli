'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createClient } from '@/supabase/client';
import { getCoachByCode } from '@/api/coach/coach-public-service';
import { AuthErrorAlert } from '@/components/auth/auth-error-alert';
import { AuthLayout } from '@/components/auth/auth-layout';
import { toast } from 'sonner';
import { Spinner } from '@/components/ui/spinner';

export default function CoachReferralPage() {
  const params = useParams<{ code: string }>();
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();

  const code = Array.isArray(params.code) ? params.code[0] : params.code;
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isAppleLoading, setIsAppleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [referringCoachId, setReferringCoachId] = useState<string | null>(null);
  const [referringUserName, setReferringUserName] = useState<string | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);

  // Fetch referring user information on mount
  useEffect(() => {
    const fetchUser = async () => {
      if (!code) {
        setIsLoadingUser(false);
        return;
      }

      try {
        const response = await getCoachByCode(code);
        if (response.data && response.data.coach) {
          setReferringCoachId(response.data.coach.id);
          setReferringUserName(response.data.coach.name);
        }
      } catch (error: any) {
        console.error('Error fetching referring user:', error);
        // Don't show error toast - just use fallback text
        setReferringUserName(null);
      } finally {
        setIsLoadingUser(false);
      }
    };

    fetchUser();
  }, [code]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name || !email || !password) {
      toast.error('Please fill in all fields');
      return;
    }

    setIsSigningUp(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: name,
            user_type: 'coach',
            referred_by: referringCoachId, // Track the referring user
          },
          emailRedirectTo: `${window.location.origin}/auth/verify-email`,
        },
      });

      if (error) {
        // If user already exists, try to sign them in instead
        if (error.message.includes('already registered') || error.message.includes('already exists')) {
          try {
            const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
              email,
              password,
            });

            if (signInError) {
              throw new Error('An account with this email already exists. Please use the correct password or reset your password.');
            }

            if (signInData?.session?.user) {
              toast.success('Signed in successfully!');
              router.push('/home');
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
      router.push(`/auth/verify-email?email=${encodeURIComponent(email)}`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to create account');
      setIsSigningUp(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback?referred_by=${referringCoachId}&redirect=/auth/verify-email`,
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
      toast.error(err.message || 'Failed to sign up with Google');
      setIsGoogleLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    setIsAppleLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'apple',
        options: {
          redirectTo: `${window.location.origin}/auth/callback?referred_by=${referringCoachId}&redirect=/auth/verify-email`,
          scopes: 'email name',
        },
      });

      if (error) throw error;
    } catch (err: any) {
      toast.error(err.message || 'Failed to sign up with Apple');
      setIsAppleLoading(false);
    }
  };

  return (
    <AuthLayout showHomeButton={false}>
      <AuthErrorAlert pathname={pathname} />
      {isLoadingUser ? (
        <div className="flex flex-col items-center justify-center gap-4 py-8">
          <Spinner className="size-8" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-3xl font-bold text-foreground">Create New Account</h2>
            {referringUserName && (
              <p className="text-sm text-muted-foreground">
                You&apos;ve been referred by {referringUserName}
              </p>
            )}
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
          <form className="space-y-4" onSubmit={handleSubmit}>
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
                  placeholder="Full name"
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
                    Registering...
                  </>
                ) : (
                  'Register'
                )}
              </Button>
            </div>
          </form>

          {/* Sign in link */}
          <div className="text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link href="/auth/login" className="text-foreground hover:text-foreground/90 underline">
              Sign in
            </Link>
          </div>
        </div>
      )}
    </AuthLayout>
  );
}
