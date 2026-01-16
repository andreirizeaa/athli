'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { useSupabaseAuth } from '@/lib/providers/supabase-auth-provider';
import { AuthLayout } from '@/components/auth/auth-layout';
import { OTPInput } from '@/components/auth/otp-input';
import { authService } from '@/api/auth/auth-service';

const emailSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

type EmailFormValues = z.infer<typeof emailSchema>;

type Step = 'email' | 'social-provider' | 'otp' | 'password';

export default function ForgotPasswordPage() {
  const { resetPasswordForEmail, verifyRecoveryOTP, resendRecoveryOTP, updatePassword } = useSupabaseAuth();
  const router = useRouter();
  const [step, setStep] = useState<Step>('email');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [email, setEmail] = useState('');
  const [provider, setProvider] = useState<'google' | 'apple' | null>(null);
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const form = useForm<EmailFormValues>({
    resolver: zodResolver(emailSchema),
    defaultValues: {
      email: '',
    },
  });

  const validatePassword = (password: string): string | null => {
    if (password.length < 8) {
      return 'Password must be at least 8 characters long';
    }
    if (!/[a-z]/.test(password)) {
      return 'Password must contain at least one lowercase letter';
    }
    if (!/[A-Z]/.test(password)) {
      return 'Password must contain at least one uppercase letter';
    }
    if (!/[0-9]/.test(password)) {
      return 'Password must contain at least one digit';
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      return 'Password must contain at least one special character';
    }
    return null;
  };

  const onSubmitEmail = async (data: EmailFormValues) => {
    setIsSubmitting(true);
    try {
      // First check the auth provider
      const providerResult = await authService.checkAuthProvider(data.email);

      if (!providerResult.exists) {
        // User doesn't exist, but we don't want to reveal this for security
        // Just show a generic message and let them try
        toast.error('No account found with this email address');
        setIsSubmitting(false);
        return;
      }

      if (providerResult.provider === 'google' || providerResult.provider === 'apple') {
        // User signed up with social provider
        setEmail(data.email);
        setProvider(providerResult.provider);
        setStep('social-provider');
        setIsSubmitting(false);
        return;
      }

      // User has email provider, proceed with password reset
      await resetPasswordForEmail(data.email);
      setEmail(data.email);
      setStep('otp');
      toast.success('Verification code sent!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to send verification code');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (otp.length !== 6) {
      toast.error('Please enter the complete 6-digit code');
      return;
    }

    setIsSubmitting(true);
    try {
      await verifyRecoveryOTP(email, otp);
      setStep('password');
      toast.success('Code verified!');
    } catch (err: any) {
      toast.error(err.message || 'Invalid verification code');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendOTP = async () => {
    setIsResending(true);
    try {
      await resendRecoveryOTP(email);
      toast.success('Verification code resent');
      setOtp('');
    } catch (err: any) {
      toast.error(err.message || 'Failed to resend code');
    } finally {
      setIsResending(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newPassword) {
      toast.error('Please enter a new password');
      return;
    }

    const passwordError = validatePassword(newPassword);
    if (passwordError) {
      toast.error(passwordError);
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setIsSubmitting(true);
    try {
      await updatePassword(newPassword);
      toast.success('Password reset successfully');
      router.push('/auth/login');
    } catch (err: any) {
      toast.error(err.message || 'Failed to reset password');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenProviderSettings = () => {
    if (provider === 'google') {
      window.open('https://myaccount.google.com/security', '_blank');
    } else if (provider === 'apple') {
      window.open('https://appleid.apple.com/account/manage', '_blank');
    }
  };

  const getTitle = () => {
    switch (step) {
      case 'email':
        return 'Forgot Password';
      case 'social-provider':
        return `Password Managed by ${provider === 'google' ? 'Google' : 'Apple'}`;
      case 'otp':
        return 'Enter Verification Code';
      case 'password':
        return 'Reset Your Password';
    }
  };

  const getSubtitle = () => {
    switch (step) {
      case 'email':
        return "Enter your email address and we'll send you a verification code.";
      case 'social-provider':
        return null; // Handled separately
      case 'otp':
        return (
          <>
            We sent a 6-digit verification code to <strong className="text-white">{email}</strong>. Please enter it below.
          </>
        );
      case 'password':
        return 'Enter your new password below.';
    }
  };

  return (
    <AuthLayout>
      <div className="space-y-6">
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="w-14 h-14 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center">
              <Image src="/icons/athli.png" alt="Athli" width={64} height={64} />
            </div>
          </div>
          <h2 className="text-3xl font-bold text-white">{getTitle()}</h2>
          {step === 'email' && (
            <p className="text-white/60 text-sm">{getSubtitle()}</p>
          )}
          {step === 'otp' && (
            <p className="text-white/60 text-sm">{getSubtitle()}</p>
          )}
          {step === 'password' && (
            <p className="text-white/60 text-sm">{getSubtitle()}</p>
          )}
        </div>

        {/* Step 1: Email */}
        {step === 'email' && (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmitEmail)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <Label htmlFor="email" className="text-white/70 text-sm">
                      Email
                    </Label>
                    <FormControl>
                      <Input
                        {...field}
                        id="email"
                        type="email"
                        autoComplete="email"
                        className="w-full h-12 rounded-xl bg-white/10 border-white/20 text-white placeholder:text-white/50 focus-visible:border-white/40 focus-visible:ring-white/20 selection:bg-white/30 selection:text-white"
                        placeholder="you@example.com"
                        disabled={isSubmitting}
                      />
                    </FormControl>
                    <FormMessage className="text-red-300" />
                  </FormItem>
                )}
              />
              <div className="pt-2">
                <Button
                  type="submit"
                  className="w-full h-12 rounded-xl !bg-white !text-black hover:!bg-white/90"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="animate-spin mr-2" />
                      Checking...
                    </>
                  ) : (
                    'Continue'
                  )}
                </Button>
              </div>
            </form>
          </Form>
        )}

        {/* Social Provider Step */}
        {step === 'social-provider' && (
          <div className="space-y-6">
            <p className="text-center text-white/60 text-sm">
              Your account was created using{' '}
              <strong className="text-white">
                {provider === 'google' ? 'Google' : 'Apple'}
              </strong>
              , so to change your password please visit your {provider === 'google' ? 'Google' : 'Apple'} account settings.
            </p>

            <Button
              onClick={handleOpenProviderSettings}
              className="w-full h-12 rounded-xl !bg-white !text-black hover:!bg-white/90"
            >
              {provider === 'google' ? (
                <>
                  <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  Manage Google Account
                </>
              ) : (
                <>
                  <svg className="mr-2 h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
                  </svg>
                  Manage Apple ID
                </>
              )}
            </Button>

            <Button
              variant="outline"
              onClick={() => {
                setStep('email');
                setProvider(null);
                form.reset();
              }}
              className="w-full h-12 rounded-xl !bg-white/10 !border-white/20 !text-white hover:!bg-white hover:!text-black hover:!border-white transition-all"
            >
              Use Different Email
            </Button>
          </div>
        )}

        {/* Step 2: OTP Verification */}
        {step === 'otp' && (
          <div className="space-y-6">
            <div className="space-y-4">
              <OTPInput
                length={6}
                value={otp}
                onChange={setOtp}
                disabled={isSubmitting}
              />
            </div>

            <Button
              onClick={handleVerifyOTP}
              className="w-full h-12 rounded-xl !bg-white !text-black hover:!bg-white/90"
              disabled={isSubmitting || otp.length !== 6}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="size-4 animate-spin mr-2" />
                  Verifying...
                </>
              ) : (
                'Verify Code'
              )}
            </Button>

            <div className="text-center">
              <p className="text-sm text-white/60 mb-2">
                Didn&apos;t receive the code?
              </p>
              <Button
                variant="link"
                onClick={handleResendOTP}
                disabled={isResending}
                className="text-sm !text-white hover:!text-white/90 underline"
              >
                {isResending ? 'Resending...' : 'Resend Code'}
              </Button>
            </div>

            <Button
              variant="outline"
              onClick={() => {
                setStep('email');
                setOtp('');
                form.reset();
              }}
              className="w-full h-12 rounded-xl !bg-white/10 !border-white/20 !text-white hover:!bg-white hover:!text-black hover:!border-white transition-all"
            >
              Use Different Email
            </Button>
          </div>
        )}

        {/* Step 3: New Password */}
        {step === 'password' && (
          <form className="space-y-4" onSubmit={handleResetPassword}>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new_password" className="text-white/70 text-sm">
                  New Password
                </Label>
                <div className="relative">
                  <Input
                    id="new_password"
                    name="new_password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    required
                    className="w-full h-12 pr-10 rounded-xl bg-white/10 border-white/20 text-white placeholder:text-white/50 focus-visible:border-white/40 focus-visible:ring-white/20 selection:bg-white/30 selection:text-white"
                    placeholder="Create a new password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    disabled={isSubmitting}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white"
                    tabIndex={0}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                <p className="text-xs text-white/50">
                  Min 8 chars, with uppercase, lowercase, digit, and special character
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm_password" className="text-white/70 text-sm">
                  Confirm Password
                </Label>
                <div className="relative">
                  <Input
                    id="confirm_password"
                    name="confirm_password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    required
                    className="w-full h-12 pr-10 rounded-xl bg-white/10 border-white/20 text-white placeholder:text-white/50 focus-visible:border-white/40 focus-visible:ring-white/20 selection:bg-white/30 selection:text-white"
                    placeholder="Confirm your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={isSubmitting}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white"
                    tabIndex={0}
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    {showConfirmPassword ? (
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
                disabled={isSubmitting || !newPassword || !confirmPassword}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="size-4 animate-spin mr-2" />
                    Resetting...
                  </>
                ) : (
                  'Reset Password'
                )}
              </Button>
            </div>
          </form>
        )}

        <div className="text-center text-sm text-white/60">
          Remember your password?{' '}
          <Link href="/auth/login" className="text-white underline hover:text-white/90">
            Log in
          </Link>
        </div>
      </div>
    </AuthLayout>
  );
}
