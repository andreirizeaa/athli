'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Eye, EyeOff } from 'lucide-react';

interface EmailChangeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentEmail: string;
  onComplete: (currentPassword: string, newEmail: string) => Promise<void>;
  isProcessing?: boolean;
}

type Step = 'password' | 'newEmail';

export function EmailChangeDialog({
  open,
  onOpenChange,
  currentEmail,
  onComplete,
  isProcessing = false,
}: EmailChangeDialogProps) {
  const t = useTranslations();
  const [step, setStep] = useState<Step>('password');
  const [currentPassword, setCurrentPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [isVerifyingPassword, setIsVerifyingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      // Reset all state when closing
      setStep('password');
      setCurrentPassword('');
      setShowPassword(false);
      setNewEmail('');
      setPasswordError(null);
    }
    onOpenChange(newOpen);
  };

  const handleVerifyPassword = async () => {
    if (!currentPassword.trim()) {
      setPasswordError(t('settings.security.currentPasswordRequired'));
      return;
    }

    setIsVerifyingPassword(true);
    setPasswordError(null);

    try {
      // Verify password by attempting to sign in
      const supabase = (await import('@/supabase/client')).createClient();
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      if (!currentSession) {
        throw new Error('No active session');
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: currentEmail,
        password: currentPassword,
      });

      if (error) {
        setPasswordError(t('settings.security.currentPasswordIncorrect'));
        return;
      }

      // Restore original session
      await supabase.auth.setSession({
        access_token: currentSession.access_token,
        refresh_token: currentSession.refresh_token || '',
      });

      // Password verified, move to next step
      setStep('newEmail');
    } catch (error: any) {
      setPasswordError(error.message || t('settings.security.currentPasswordIncorrect'));
    } finally {
      setIsVerifyingPassword(false);
    }
  };

  const handleSubmit = async () => {
    if (!newEmail.trim()) {
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      return;
    }

    try {
      await onComplete(currentPassword, newEmail);
      handleOpenChange(false);
    } catch (error) {
      // Error handling is done in parent
    }
  };

  const getStepTitle = () => {
    switch (step) {
      case 'password':
        return t('settings.security.emailChange.verifyPassword');
      case 'newEmail':
        return t('settings.security.emailChange.enterNewEmail');
      default:
        return '';
    }
  };

  const getStepDescription = () => {
    switch (step) {
      case 'password':
        return t('settings.security.emailChange.verifyPasswordDescription');
      case 'newEmail':
        return t('settings.security.emailChange.enterNewEmailDescription');
      default:
        return '';
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{getStepTitle()}</DialogTitle>
          <DialogDescription>{getStepDescription()}</DialogDescription>
        </DialogHeader>
        <div className="space-y-6 py-4">
          {/* Step 1: Verify Current Password */}
          {step === 'password' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">{t('settings.security.currentPassword')}</Label>
                <div className="relative">
                  <Input
                    id="currentPassword"
                    type={showPassword ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => {
                      setCurrentPassword(e.target.value);
                      setPasswordError(null);
                    }}
                    disabled={isVerifyingPassword}
                    className={passwordError ? 'border-destructive' : ''}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && currentPassword.trim()) {
                        handleVerifyPassword();
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    tabIndex={0}
                    role="button"
                    aria-label={showPassword ? t('settings.security.hidePasswordAria') : t('settings.security.showPasswordAria')}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {passwordError && (
                  <p className="text-sm text-destructive">{passwordError}</p>
                )}
              </div>
              <Button
                onClick={handleVerifyPassword}
                disabled={!currentPassword.trim() || isVerifyingPassword}
                className="w-full"
              >
                {isVerifyingPassword ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t('settings.security.emailChange.verifying')}
                  </>
                ) : (
                  t('general.continue')
                )}
              </Button>
            </div>
          )}

          {/* Step 2: Enter New Email */}
          {step === 'newEmail' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="newEmail">{t('settings.security.emailChange.newEmail')}</Label>
                <Input
                  id="newEmail"
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  disabled={isProcessing}
                  placeholder={t('settings.security.emailChange.newEmailPlaceholder')}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newEmail.trim()) {
                      handleSubmit();
                    }
                  }}
                />
              </div>
              <Button
                onClick={handleSubmit}
                disabled={!newEmail.trim() || isProcessing}
                className="w-full"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t('settings.profile.saving')}
                  </>
                ) : (
                  t('settings.security.emailChange.submit')
                )}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
