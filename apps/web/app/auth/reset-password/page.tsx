'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useSupabaseAuth } from '@/lib/providers/supabase-auth-provider';
import { AuthLayout } from '@/components/auth/auth-layout';
import { toast } from 'sonner';
import { isWeakPasswordError, getPasswordErrorMessage } from '@/lib/utils/auth-errors';

export default function ResetPasswordPage() {
  const { updatePassword, supabaseUser, isLoading: isAuthLoading } = useSupabaseAuth();
  const router = useRouter();
  const [isResetting, setIsResetting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  // Wait for auth to initialize and check for a valid session
  useEffect(() => {
    if (!isAuthLoading) {
      // Give Supabase a moment to process the hash tokens from the recovery link
      const timer = setTimeout(() => {
        if (!supabaseUser) {
          // No session found, redirect to forgot password
          toast.error('Invalid or expired reset link. Please request a new one.');
          router.push('/auth/forgot-password');
        } else {
          setIsCheckingSession(false);
        }
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [isAuthLoading, supabaseUser, router]);

  // Show loading while checking session
  if (isAuthLoading || isCheckingSession) {
    return (
      <AuthLayout>
        <div className="flex flex-col items-center justify-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-white" />
          <p className="text-white/60">Verifying reset link...</p>
        </div>
      </AuthLayout>
    );
  }

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

  const handleReset = async (e: React.FormEvent) => {
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

    setIsResetting(true);
    try {
      await updatePassword(newPassword);
      toast.success('Password reset successfully');
      router.push('/auth/login');
    } catch (err: any) {
      const message = isWeakPasswordError(err)
        ? getPasswordErrorMessage(err)
        : (err.message || 'Failed to reset password');
      toast.error(message);
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <AuthLayout>
      <div className="space-y-6">
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="w-14 h-14 rounded-xl bg-zinc-900 border border-white/20 flex items-center justify-center">
              <Image src="/icons/athli.png" alt="Athli" width={64} height={64} />
            </div>
          </div>
          <h2 className="text-3xl font-bold text-white">Reset Your Password</h2>
          <p className="text-white/60 text-sm">
            Enter your new password below.
          </p>
        </div>

        <form className="space-y-4" onSubmit={handleReset}>
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
                  className="w-full h-12 pr-10 rounded-xl bg-zinc-900 border-white/20 text-white placeholder:text-white/50 focus-visible:border-white/40 focus-visible:ring-white/20 selection:bg-white/30 selection:text-white"
                  placeholder="Create a new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={isResetting}
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
                  className="w-full h-12 pr-10 rounded-xl bg-zinc-900 border-white/20 text-white placeholder:text-white/50 focus-visible:border-white/40 focus-visible:ring-white/20 selection:bg-white/30 selection:text-white"
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={isResetting}
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
              disabled={isResetting || !newPassword || !confirmPassword}
            >
              {isResetting ? (
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

        <div className="text-center text-sm text-white/60">
          <Link href="/auth/login" className="text-white underline hover:text-white/90">
            Back to login
          </Link>
        </div>
      </div>
    </AuthLayout>
  );
}
