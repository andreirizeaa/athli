'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, usePathname, useSearchParams, useRouter } from 'next/navigation';
import { Loader2, Eye, EyeOff, ArrowLeft, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AthliLogo } from '@/components/athli-logo';
import { useSupabaseAuth } from '@/lib/providers/supabase-auth-provider';
import { AuthErrorAlert } from '@/components/auth/auth-error-alert';
import { PackageCard } from '@/components/public/package-card';
import { toast } from 'sonner';
import { getPublicPackages, createCheckoutSession } from '@/api/payments/payment-service';
import type { CoachPackage } from '@athli/shared-types';

// Step 1: Package preview page
function PackagePreviewStep({
  pkg,
  coachName,
  coachCode,
  onContinue,
}: {
  pkg: CoachPackage;
  coachName: string;
  coachCode: string;
  onContinue: () => void;
}) {
  return (
    <div className="relative min-h-screen bg-background">
      {/* Logo */}
      <div className="absolute left-6 top-6 z-20">
        <AthliLogo />
      </div>

      {/* Grid Background - Light mode */}
      <div
        className="absolute inset-0 opacity-40 dark:hidden"
        style={{
          backgroundImage:
            'linear-gradient(to right, rgba(0,0,0,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,0.06) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />
      {/* Grid Background - Dark mode */}
      <div
        className="absolute inset-0 hidden opacity-40 dark:block"
        style={{
          backgroundImage:
            'linear-gradient(to right, rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.1) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />

      {/* Content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center px-4 py-20">
        <div className="flex flex-col items-center max-w-md w-full">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Complete your purchase
            </h1>
            <p className="text-muted-foreground">
              Sign in to get started with {coachName}
            </p>
          </div>

          {/* Package Card */}
          <PackageCard pkg={pkg} className="!max-w-[320px]" />

          {/* Actions */}
          <div className="w-full max-w-[320px] mt-6 space-y-3">
            <Button
              className="w-full h-12 rounded-xl"
              onClick={onContinue}
            >
              Continue to checkout
              <ArrowRight className="size-4" />
            </Button>
            <div className="text-center">
              <Link
                href={`/${coachCode}/packages`}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Choose another package
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Step 2: Login form
function LoginFormStep({
  pkg,
  coachCode,
  packageId,
  pathname,
  onBack,
  onAuthSuccess,
}: {
  pkg: CoachPackage;
  coachCode: string;
  packageId: string;
  pathname: string;
  onBack: () => void;
  onAuthSuccess: () => void;
}) {
  const { signIn, signInWithGoogle, signInWithApple } = useSupabaseAuth();
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isAppleLoading, setIsAppleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      toast.error('Please fill in all fields');
      return;
    }

    setIsSigningIn(true);
    try {
      sessionStorage.setItem('auth_flow_data', JSON.stringify({
        flow: 'checkout',
        coachCode,
        packageId,
      }));

      const result = await signIn(email, password);
      if (result?.session) {
        toast.success('Signed in successfully');
        onAuthSuccess();
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to sign in');
      setIsSigningIn(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    try {
      const redirectUrl = new URL('/auth/callback', window.location.origin);
      redirectUrl.searchParams.set('flow', 'checkout');
      redirectUrl.searchParams.set('redirect', `/auth/checkout/${coachCode}/${packageId}?checkout=true`);
      await signInWithGoogle({ redirectTo: redirectUrl.toString() });
    } catch (err: any) {
      toast.error(err.message || 'Failed to sign in with Google');
      setIsGoogleLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    setIsAppleLoading(true);
    try {
      const redirectUrl = new URL('/auth/callback', window.location.origin);
      redirectUrl.searchParams.set('flow', 'checkout');
      redirectUrl.searchParams.set('redirect', `/auth/checkout/${coachCode}/${packageId}?checkout=true`);
      await signInWithApple({ redirectTo: redirectUrl.toString() });
    } catch (err: any) {
      toast.error(err.message || 'Failed to sign in with Apple');
      setIsAppleLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-background">
      {/* Logo */}
      <div className="absolute left-6 top-6 z-20">
        <AthliLogo />
      </div>

      {/* Grid Background - Light mode */}
      <div
        className="absolute inset-0 opacity-40 dark:hidden"
        style={{
          backgroundImage:
            'linear-gradient(to right, rgba(0,0,0,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,0.06) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />
      {/* Grid Background - Dark mode */}
      <div
        className="absolute inset-0 hidden opacity-40 dark:block"
        style={{
          backgroundImage:
            'linear-gradient(to right, rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.1) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />

      {/* Content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center px-4 py-20">
        <div className="w-full max-w-lg space-y-6">
          {/* Back button */}
          <button
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="size-3.5" />
            Back to package
          </button>

          {/* Header */}
          <div className="text-center space-y-4">
            <h2 className="text-3xl font-bold text-foreground">Log in</h2>
            <p className="text-sm text-muted-foreground">
              Don&apos;t have an account?{' '}
              <Link href={`/auth/checkout/${coachCode}/${packageId}`} className="text-foreground hover:text-foreground/90 underline">
                Sign up
              </Link>
            </p>
          </div>

          {/* Error Alert */}
          <AuthErrorAlert pathname={pathname} />

          {/* Provider Buttons */}
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              className="h-12 rounded-xl transition-all"
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
                  Google
                </>
              )}
            </Button>

            <Button
              variant="outline"
              className="h-12 rounded-xl transition-all"
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
                    Forgot password?
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
                    disabled={isSigningIn || isGoogleLoading || isAppleLoading}
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
                disabled={isSigningIn || isGoogleLoading || isAppleLoading}
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
      </div>
    </div>
  );
}

// Step 3: Redirecting to Stripe
function RedirectingStep() {
  return (
    <div className="relative min-h-screen bg-background">
      {/* Logo */}
      <div className="absolute left-6 top-6 z-20">
        <AthliLogo />
      </div>

      {/* Grid Background - Light mode */}
      <div
        className="absolute inset-0 opacity-40 dark:hidden"
        style={{
          backgroundImage:
            'linear-gradient(to right, rgba(0,0,0,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,0.06) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />
      {/* Grid Background - Dark mode */}
      <div
        className="absolute inset-0 hidden opacity-40 dark:block"
        style={{
          backgroundImage:
            'linear-gradient(to right, rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.1) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />

      {/* Content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <Loader2 className="size-8 animate-spin text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Redirecting to checkout...</h2>
          <p className="text-muted-foreground">Please wait while we prepare your payment.</p>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutLoginPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const coachCode = params.coachCode as string;
  const packageId = params.packageId as string;
  const pathname = usePathname();

  const { user, isLoading: isAuthLoading } = useSupabaseAuth();

  const [step, setStep] = useState<'preview' | 'auth' | 'redirecting'>('preview');
  const [pkg, setPkg] = useState<CoachPackage | null>(null);
  const [coachName, setCoachName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  // Fetch package data
  useEffect(() => {
    if (!coachCode) return;

    const fetchData = async () => {
      try {
        const data = await getPublicPackages(coachCode);
        const foundPkg = data.packages.find((p) => p.id === packageId);
        if (foundPkg) {
          setPkg(foundPkg);
          setCoachName(data.company?.company_name || data.coach?.name?.split(' ')[0] || 'your coach');
        } else {
          setError(true);
        }
      } catch {
        setError(true);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [coachCode, packageId]);

  // Check if user is authenticated and should proceed to Stripe
  useEffect(() => {
    if (isAuthLoading || isLoading) return;

    // Check if user just completed auth (came from OAuth)
    const checkout = searchParams.get('checkout');

    if (user && checkout === 'true') {
      // User is authenticated and ready to checkout
      handleStripeRedirect();
    }
  }, [user, isAuthLoading, isLoading, searchParams]);

  const handleStripeRedirect = async () => {
    if (!user?.id) {
      // No valid session, go to auth step
      setStep('auth');
      return;
    }

    setStep('redirecting');

    try {
      const checkoutUrl = await createCheckoutSession(packageId, coachCode, user.id, user.email ?? undefined);

      // Clear the auth flow data
      sessionStorage.removeItem('auth_flow_data');

      // Redirect to Stripe
      window.location.href = checkoutUrl;
    } catch (err: any) {
      const errorMessage = err.message || '';

      // If user already has this package, redirect to packages page with message
      if (errorMessage.includes('already have access')) {
        sessionStorage.removeItem('auth_flow_data');
        toast.success('You already have access to this package');
        router.push(`/${coachCode}/packages`);
        return;
      }

      // For other errors, redirect to auth step
      console.warn('Checkout session creation failed, redirecting to auth:', errorMessage);
      setStep('auth');
    }
  };

  const handleAuthSuccess = () => {
    // This will be called after successful login
    handleStripeRedirect();
  };

  const handleContinue = () => {
    if (user) {
      // User is already logged in, go straight to Stripe
      handleStripeRedirect();
    } else {
      // User needs to log in
      setStep('auth');
    }
  };

  if (isLoading || isAuthLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !pkg) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="text-2xl font-semibold mb-2">Package not found</h1>
          <p className="text-muted-foreground mb-4">This package doesn&apos;t exist or is no longer available.</p>
          <Button asChild>
            <Link href={`/${coachCode}/packages`}>View all packages</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (step === 'redirecting') {
    return <RedirectingStep />;
  }

  if (step === 'preview') {
    return (
      <PackagePreviewStep
        pkg={pkg}
        coachName={coachName}
        coachCode={coachCode}
        onContinue={handleContinue}
      />
    );
  }

  return (
    <LoginFormStep
      pkg={pkg}
      coachCode={coachCode}
      packageId={packageId}
      pathname={pathname}
      onBack={() => setStep('preview')}
      onAuthSuccess={handleAuthSuccess}
    />
  );
}
