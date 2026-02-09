'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { OTPInput } from '@/components/auth/otp-input';
import { useSupabaseAuth } from '@/lib/providers/supabase-auth-provider';
import { AuthLayout } from '@/components/auth/auth-layout';
import { toast } from 'sonner';
import { Spinner } from '@/components/ui/spinner';
import { seedDemoData } from '@/api/user/user-service';

export default function VerifyEmailPage() {
  const { verifyOTP, resendOTP } = useSupabaseAuth();
  const router = useRouter();
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [otp, setOtp] = useState('');

  // Get email and auth flow data from sessionStorage
  const [email, setEmail] = useState('');
  const [authFlowData, setAuthFlowData] = useState<any>(null);

  useEffect(() => {
    // Retrieve auth flow data from sessionStorage
    const storedData = sessionStorage.getItem('auth_flow_data');
    if (storedData) {
      const parsed = JSON.parse(storedData);
      setAuthFlowData(parsed);
      if (parsed.email) {
        setEmail(parsed.email);
      }
    } else {
      // No sessionStorage data found, redirect to register
      toast.error('Email is required');
      router.push('/auth/register');
    }
  }, [router]);

  const handleVerify = async () => {
    if (otp.length !== 6) {
      toast.error('Please enter the complete 6-digit code');
      return;
    }

    setIsVerifying(true);
    try {
      const result = await verifyOTP(email, otp);
      if (result?.session?.user) {
        // Set loading state IMMEDIATELY before any other operations
        // This prevents the form from appearing blank during async work
        setIsRedirecting(true);
        toast.success('Email verified successfully');

        // Client invite flow
        if (authFlowData?.flow === 'client_invite') {
          console.log('[Verify Email] Client invite flow, redirecting to new-client');
          window.location.href = '/auth/new-client';
          return;
        }

        // Register flow → redirect to /get-started
        // New coach registration - seed demo data before redirect
        if (authFlowData?.flow === 'register') {
          console.log('[Verify Email] Register flow, seeding demo data');
          try {
            await seedDemoData();
          } catch (seedError) {
            console.error('Failed to seed demo data:', seedError);
            // Don't block verification if seeding fails
          }
          console.log('[Verify Email] Redirecting to get-started');
          window.location.href = '/get-started';
          return;
        }

        // Default/other flows → check user type to determine redirect
        let finalRedirect = '/home';

        try {
          const response = await fetch('/api/user/me', {
            credentials: 'include',
          });
          const data = await response.json();

          if (data?.data?.user) {
            const userType = data.data.user.userType;

            // If user is a client (not a coach), redirect to download page
            if (userType === 'client') {
              finalRedirect = '/download/client';
            } else {
              // For coaches, seed demo data before redirecting
              try {
                await seedDemoData();
              } catch (seedError) {
                console.error('Failed to seed demo data:', seedError);
                // Don't block verification if seeding fails
              }
            }
          }
        } catch (profileError) {
          console.error('Failed to fetch user profile:', profileError);
          // Continue with home redirect on error
        }

        window.location.href = finalRedirect;
      }
    } catch (err: any) {
      toast.error(err.message || 'Verification failed');
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    setIsResending(true);
    try {
      await resendOTP(email);
      toast.success('Verification code resent');
      setOtp('');
    } catch (err: any) {
      toast.error(err.message || 'Failed to resend code');
    } finally {
      setIsResending(false);
    }
  };

  // Show loading screen during redirect for smooth transition
  if (isRedirecting) {
    return (
      <AuthLayout>
        <div className="flex flex-col items-center justify-center gap-4 py-12">
          <Spinner className="size-8" />
          <p className="text-muted-foreground text-sm">Verified! Setting up your account...</p>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <div className="space-y-6">
        <div className="text-center space-y-4">
          <h2 className="text-3xl font-bold text-foreground">Verify Your Email</h2>
          <p className="text-muted-foreground text-sm">
            We sent a 6-digit verification code to <strong className="text-foreground">{email}</strong>. Please enter it
            below.
          </p>
        </div>

        <div className="space-y-6">
          <div className="space-y-4">
            <OTPInput
              length={6}
              value={otp}
              onChange={setOtp}
              disabled={isVerifying}
            />
          </div>

          <Button
            onClick={handleVerify}
            className="w-full h-12 rounded-xl"
            disabled={isVerifying || otp.length !== 6}
          >
            {isVerifying ? (
              <>
                <Loader2 className="size-4 animate-spin mr-2" />
                Verifying...
              </>
            ) : (
              'Verify Email'
            )}
          </Button>

          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-2">
              Didn&apos;t receive the code?
            </p>
            <Button
              variant="link"
              onClick={handleResend}
              disabled={isResending}
              className="text-sm underline"
            >
              {isResending ? 'Resending...' : 'Resend Code'}
            </Button>
          </div>
        </div>

        <div className="text-center text-sm text-muted-foreground">
          <Link href="/auth/login" className="text-foreground underline hover:text-foreground/90">
            Back to login
          </Link>
        </div>
      </div>
    </AuthLayout>
  );
}
