'use client';

import { useState } from 'react';
import Link from 'next/link';

import { usePathname } from 'next/navigation';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useSupabaseAuth } from '@/lib/providers/supabase-auth-provider';
import { AuthErrorAlert } from '@/components/auth/auth-error-alert';
import { AuthLayout } from '@/components/auth/auth-layout';
import { toast } from 'sonner';
import { isWeakPasswordError, getPasswordErrorMessage } from '@/lib/utils/auth-errors';

export default function SignUpPage() {
  const { signUp, signInWithGoogle, signInWithApple } = useSupabaseAuth();
  const pathname = usePathname();
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isAppleLoading, setIsAppleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name || !email || !password) {
      toast.error('Please fill in all fields');
      return;
    }

    setIsSigningUp(true);
    try {
      // Store email in sessionStorage for verify-email page
      sessionStorage.setItem('auth_flow_data', JSON.stringify({
        email: email,
        flow: 'register',
      }));

      await signUp(email, password, name);
      toast.success('Account created! Please check your email for verification code.');
      // signUp already redirects to verify-email page
    } catch (err: any) {
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
      await signInWithGoogle();
      // The redirect will happen automatically via OAuth
    } catch (err: any) {
      toast.error(err.message || 'Failed to sign up with Google');
      setIsGoogleLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    setIsAppleLoading(true);
    try {
      await signInWithApple();
      // The redirect will happen automatically via OAuth
    } catch (err: any) {
      toast.error(err.message || 'Failed to sign up with Apple');
      setIsAppleLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="text-center space-y-4">
          <h2 className="text-3xl font-bold text-foreground">Create an Account</h2>
          <p className="text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link href="/auth/login" className="text-foreground hover:text-foreground/90 underline">
              Log in
            </Link>
          </p>
        </div>

        {/* Error Alert - shown under header */}
        <AuthErrorAlert pathname={pathname} />

        {/* Provider Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <Button
            variant="outline"
            className="h-12 rounded-xl transition-all bg-background"
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
                Login with Google
              </>
            )}
          </Button>

          <Button
            variant="outline"
            className="h-12 rounded-xl transition-all bg-background"
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
                Login with Apple
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
