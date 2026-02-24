'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

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
          <h2 className="text-3xl font-bold text-foreground">Log in to Athli</h2>
          <p className="text-sm text-muted-foreground">
            Don&apos;t have an account?{' '}
            <Link href="/auth/register" className="text-foreground hover:text-foreground/90 underline">
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
              <span className="absolute -top-2 -right-1 z-20 px-2 py-0.5 text-xs font-medium bg-muted text-foreground rounded-md border shadow-md">
                Last used
              </span>
            )}
            <Button
              variant="outline"
              className="w-full h-12 rounded-xl transition-all !bg-background hover:!bg-sidebar border-primary/50"
              onClick={handleGoogleSignIn}
              disabled={isSigningIn || isGoogleLoading || isAppleLoading}
            >
              {isGoogleLoading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <>
                  <img src="/icons/google.png" alt="" className="mr-1.5 h-5 w-5" />
                  Login with Google
                </>
              )}
            </Button>
          </div>

          <div className="relative">
            {hasMounted && lastUsedProvider === 'apple' && (
              <span className="absolute -top-2 -right-1 z-20 px-2 py-0.5 text-xs font-medium bg-muted text-foreground rounded-md border shadow-md">
                Last used
              </span>
            )}
            <Button
              variant="outline"
              className="w-full h-12 rounded-xl transition-all !bg-background hover:!bg-sidebar border-primary/50"
              onClick={handleAppleSignIn}
              disabled={isSigningIn || isGoogleLoading || isAppleLoading}
            >
              {isAppleLoading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <>
                  <img src="/icons/apple.png" alt="" className="mr-1.5 h-5 w-5 dark:invert" />
                  Login with Apple
                </>
              )}
            </Button>
          </div>
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
                disabled={isSigningIn || isGoogleLoading || isAppleLoading}
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-muted-foreground text-sm">
                  Password
                </Label>
                <Link
                  href="/auth/forgot-password"
                  className="text-sm text-foreground hover:text-foreground/90"
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
                  className="w-full h-12 pr-10 rounded-xl"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isSigningIn || isGoogleLoading || isAppleLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
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
              className="w-full h-12 rounded-xl"
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
        <div className="text-center text-sm text-muted-foreground">
          By signing in, you agree to our{' '}
          <a href={`${process.env.NEXT_PUBLIC_LANDING_PAGE || '/'}/terms-of-use`} target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground/70">
            Terms
          </a>{' '}
          and{' '}
          <a href={`${process.env.NEXT_PUBLIC_LANDING_PAGE || '/'}/privacy-policy`} target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground/70">
            Privacy Policy
          </a>
          .
        </div>
      </div>
    </AuthLayout>
  );
}
