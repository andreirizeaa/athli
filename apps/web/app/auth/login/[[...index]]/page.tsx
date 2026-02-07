'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, usePathname } from 'next/navigation';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useSupabaseAuth } from '@/lib/providers/supabase-auth-provider';
import { AuthErrorAlert } from '@/components/auth/auth-error-alert';
import { AuthLayout } from '@/components/auth/auth-layout';
import { toast } from 'sonner';
import { seedDemoData } from '@/api/user/user-service';

export default function SignInPage() {
  const { signIn, signInWithGoogle, signInWithApple } = useSupabaseAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isAppleLoading, setIsAppleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [lastUsedProvider, setLastUsedProvider] = useState<string | null>(null);
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setLastUsedProvider(localStorage.getItem('athli_last_login_method'));
    setHasMounted(true);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      toast.error('Please fill in all fields');
      return;
    }

    setIsSigningIn(true);
    localStorage.setItem('athli_last_login_method', 'email');
    try {
      const result = await signIn(email, password);
      if (result?.session) {
        toast.success('Signed in successfully');
        // Wait for session to be fully established and cookies to be set
        await new Promise((resolve) => setTimeout(resolve, 500));

        // Fetch user profile to check if user is client-only
        try {
          const response = await fetch('/api/user/me', {
            credentials: 'include',
          });
          const data = await response.json();

          if (data?.data?.user) {
            const userType = data.data.user.userType;

            // If user is a client (not a coach), redirect to download page
            if (userType === 'client') {
              window.location.href = '/download/client';
              return;
            }

            // For coaches, seed demo data before redirecting
            // This is idempotent - only creates data if it doesn't exist
            try {
              await seedDemoData();
            } catch (seedError) {
              console.error('Failed to seed demo data:', seedError);
              // Don't block login if seeding fails
            }
          }
        } catch (profileError) {
          console.error('Failed to fetch user profile:', profileError);
          // Continue to /home on error to avoid blocking access
        }

        // User is a coach or profile fetch failed - continue to main app
        window.location.href = '/home';
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to sign in');
      setIsSigningIn(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    localStorage.setItem('athli_last_login_method', 'google');
    try {
      await signInWithGoogle();
      // The redirect will happen automatically via OAuth
    } catch (err: any) {
      toast.error(err.message || 'Failed to sign in with Google');
      setIsGoogleLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    setIsAppleLoading(true);
    localStorage.setItem('athli_last_login_method', 'apple');
    try {
      await signInWithApple();
      // The redirect will happen automatically via OAuth
    } catch (err: any) {
      toast.error(err.message || 'Failed to sign in with Apple');
      setIsAppleLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="w-14 h-14 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center">
              <Image src="/icons/athli.png" alt="Athli" width={64} height={64} />
            </div>
          </div>
          <h2 className="text-3xl font-bold text-white">Log in to Athli</h2>
          <p className="text-sm text-white/60">
            Don&apos;t have an account?{' '}
            <Link href="/auth/register" className="text-white hover:text-white/90 underline">
              Sign up
            </Link>
          </p>
        </div>

        {/* Error Alert - shown under header */}
        <AuthErrorAlert pathname={pathname} />

        {/* Provider Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <div className="relative">
            {hasMounted && lastUsedProvider === 'google' && (
              <span className="absolute -top-2 -right-1 z-20 px-2 py-0.5 text-xs font-medium bg-zinc-800 text-white rounded-md border border-white/20 shadow-md">
                Last used
              </span>
            )}
            <Button
              variant="outline"
              className="w-full h-12 rounded-xl !bg-white/10 !border-white/20 !text-white hover:!bg-white hover:!text-black hover:!border-white transition-all"
              onClick={handleGoogleSignIn}
              disabled={isSigningIn || isGoogleLoading || isAppleLoading}
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
                  Login with Google
                </>
              )}
            </Button>
          </div>

          <div className="relative">
            {hasMounted && lastUsedProvider === 'apple' && (
              <span className="absolute -top-2 -right-1 z-20 px-2 py-0.5 text-xs font-medium bg-zinc-800 text-white rounded-md border border-white/20 shadow-md">
                Last used
              </span>
            )}
            <Button
              variant="outline"
              className="w-full h-12 rounded-xl !bg-white/10 !border-white/20 !text-white hover:!bg-white hover:!text-black hover:!border-white transition-all"
              onClick={handleAppleSignIn}
              disabled={isSigningIn || isGoogleLoading || isAppleLoading}
            >
              {isAppleLoading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <>
                  <svg className="mr-1.5 h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
                  </svg>
                  Login with Apple
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="w-full border-t border-white/20" />
          <span className="text-white/50 shrink-0 text-sm">or</span>
          <div className="w-full border-t border-white/20" />
        </div>

        {/* Form */}
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-white/70 text-sm">
                Email
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="w-full h-12 rounded-xl bg-white/10 border-white/20 text-white placeholder:text-white/50 focus-visible:border-white/40 focus-visible:ring-white/20 selection:bg-white/30 selection:text-white"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isSigningIn || isGoogleLoading || isAppleLoading}
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-white/70 text-sm">
                  Password
                </Label>
                <Link
                  href="/auth/forgot-password"
                  className="text-sm text-white hover:text-white/90"
                >
                  Forgot your password?
                </Link>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  className="w-full h-12 pr-10 rounded-xl bg-white/10 border-white/20 text-white placeholder:text-white/50 focus-visible:border-white/40 focus-visible:ring-white/20 selection:bg-white/30 selection:text-white"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isSigningIn || isGoogleLoading || isAppleLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white"
                  tabIndex={0}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  disabled={isSigningIn || isGoogleLoading}
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
              className="w-full h-12 rounded-xl !bg-white !text-black hover:!bg-white/90"
              disabled={isSigningIn || isGoogleLoading}
            >
              {isSigningIn ? (
                <>
                  <Loader2 className="size-4 animate-spin mr-2" />
                  Signing in...
                </>
              ) : (
                'Log In'
              )}
            </Button>
          </div>
        </form>

        {/* Terms */}
        <div className="text-center text-sm text-white/50">
          By signing in, you agree to our{' '}
          <Link href="/terms" className="underline hover:text-white/70">
            Terms
          </Link>{' '}
          and{' '}
          <Link href="/privacy" className="underline hover:text-white/70">
            Privacy Policy
          </Link>
          .
        </div>
      </div>
    </AuthLayout>
  );
}
