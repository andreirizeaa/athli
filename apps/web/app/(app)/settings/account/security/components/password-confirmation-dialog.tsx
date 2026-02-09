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

interface PasswordConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  email: string;
  onVerify: (currentPassword: string) => Promise<void>;
  isVerifying?: boolean;
}

export function PasswordConfirmationDialog({
  open,
  onOpenChange,
  email,
  onVerify,
  isVerifying = false,
}: PasswordConfirmationDialogProps) {
  const t = useTranslations();
  const [currentPassword, setCurrentPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const handleVerify = async () => {
    if (!currentPassword.trim()) {
      setPasswordError(t('settings.security.currentPasswordRequired'));
      return;
    }

    setPasswordError(null);
    try {
      await onVerify(currentPassword);
    } catch (error: any) {
      setPasswordError(error.message || t('settings.security.currentPasswordIncorrect'));
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setCurrentPassword('');
      setPasswordError(null);
      setShowPassword(false);
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('settings.security.passwordConfirmation.title')}</DialogTitle>
          <DialogDescription>
            {t('settings.security.passwordConfirmation.description')}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6 py-4">
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
                  disabled={isVerifying}
                  className={passwordError ? 'border-destructive' : ''}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && currentPassword.trim()) {
                      handleVerify();
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
          </div>

          <div className="flex flex-col gap-3">
            <Button
              onClick={handleVerify}
              disabled={!currentPassword.trim() || isVerifying}
              className="w-full"
            >
              {isVerifying ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t('settings.security.passwordConfirmation.verifying')}
                </>
              ) : (
                t('settings.security.passwordConfirmation.verify')
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
