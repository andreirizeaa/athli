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
import { OTPInput } from '@/components/auth/otp-input';
import { Loader2 } from 'lucide-react';

interface OTPVerificationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  email: string;
  onVerify: (otp: string) => Promise<void>;
  onResend: () => Promise<void>;
  isVerifying?: boolean;
}

export function OTPVerificationDialog({
  open,
  onOpenChange,
  email,
  onVerify,
  onResend,
  isVerifying = false,
}: OTPVerificationDialogProps) {
  const t = useTranslations();
  const [otp, setOtp] = useState('');
  const [isResending, setIsResending] = useState(false);

  const handleVerify = async () => {
    if (otp.length !== 6) {
      return;
    }
    await onVerify(otp);
  };

  const handleResend = async () => {
    setIsResending(true);
    try {
      await onResend();
      setOtp('');
    } catch (error) {
      // Error handling is done in parent
    } finally {
      setIsResending(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setOtp('');
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('settings.security.otpVerification.title')}</DialogTitle>
          <DialogDescription>
            {t('settings.security.otpVerification.description', { email })}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6 py-4">
          <div className="space-y-4">
            <OTPInput
              length={6}
              value={otp}
              onChange={setOtp}
              disabled={isVerifying || isResending}
            />
          </div>

          <div className="flex flex-col gap-3">
            <Button
              onClick={handleVerify}
              disabled={isVerifying || isResending || otp.length !== 6}
              className="w-full"
            >
              {isVerifying ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('settings.security.otpVerification.verifying')}
                </>
              ) : (
                t('settings.security.otpVerification.verify')
              )}
            </Button>

            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-2">
                {t('settings.security.otpVerification.didntReceive')}
              </p>
              <Button
                variant="link"
                onClick={handleResend}
                disabled={isResending || isVerifying}
                className="text-sm"
              >
                {isResending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t('settings.security.otpVerification.resending')}
                  </>
                ) : (
                  t('settings.security.otpVerification.resend')
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
