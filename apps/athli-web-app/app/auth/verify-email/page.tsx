'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { OTPInput } from '@/components/auth/otp-input';
import { useSupabaseAuth } from '@/lib/providers/supabase-auth-provider';
import { toast } from 'sonner';

export default function VerifyEmailPage() {
  const { verifyOTP, resendOTP } = useSupabaseAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [otp, setOtp] = useState('');
  const email = searchParams.get('email') || '';

  useEffect(() => {
    if (!email) {
      toast.error('Email is required');
      router.push('/auth/register');
    }
  }, [email, router]);

  const handleVerify = async () => {
    if (otp.length !== 6) {
      toast.error('Please enter the complete 6-digit code');
      return;
    }

    setIsVerifying(true);
    try {
      const result = await verifyOTP(email, otp);
      if (result?.session) {
        toast.success('Email verified successfully');
        // Wait for session to be fully established and cookies to be set
        await new Promise((resolve) => setTimeout(resolve, 500));
        window.location.href = '/home';
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

  return (
    <div className="flex pb-8 lg:h-screen lg:pb-0">
      <div className="hidden w-1/2 bg-gray-100 lg:block">
        <Image
          width={1000}
          height={1000}
          src="/images/auth-image.jpg"
          alt="Verify email"
          className="h-full w-full object-cover"
          unoptimized
        />
      </div>

      <div className="flex w-full items-center justify-center lg:w-1/2">
        <div className="w-full max-w-md space-y-8 px-4">
          <div className="text-center">
            <h2 className="mt-6 text-3xl font-bold">Verify Your Email</h2>
            <p className="text-muted-foreground mt-2 text-sm">
              We sent a 6-digit verification code to <strong>{email}</strong>. Please enter it
              below.
            </p>
          </div>

          <div className="mt-8 space-y-6">
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
              className="w-full"
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
                className="text-sm"
              >
                {isResending ? 'Resending...' : 'Resend Code'}
              </Button>
            </div>
          </div>

          <div className="mt-6 text-center text-sm">
            <Link href="/auth/login" className="underline">
              Back to login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
