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
            className="h-12 rounded-xl transition-all !bg-background hover:!bg-sidebar border-primary/50"
            onClick={handleGoogleSignIn}
            disabled={isSigningUp || isGoogleLoading || isAppleLoading}
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

          <Button
            variant="outline"
            className="h-12 rounded-xl transition-all !bg-background hover:!bg-sidebar border-primary/50"
            onClick={handleAppleSignIn}
            disabled={isSigningUp || isGoogleLoading || isAppleLoading}
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
