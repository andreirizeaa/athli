'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { useTranslations } from 'next-intl';
import { calendarApi } from '@/lib/api/calendar-api';
import Image from 'next/image';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { RequiredAsterisk } from '@/components/ui/required-asterisk';
import { createClient } from '@supabase/supabase-js';
import { toast } from 'sonner';
import { Loader2, Mail } from 'lucide-react';
import { cn } from '@/lib/general/utils';

type CalendarProvider = 'google' | 'outlook' | 'icloud' | null;

interface ConnectCalendarModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  provider?: 'google' | 'outlook' | null;
}


const getProviderName = (provider: CalendarProvider): string => {
  switch (provider) {
    case 'google':
      return 'Google';
    case 'outlook':
      return 'Outlook';
    case 'icloud':
      return 'iCloud';
    default:
      return 'Calendar';
  }
};

export const ConnectCalendarModal = ({ open, onOpenChange, provider }: ConnectCalendarModalProps) => {
  const t = useTranslations();
  const { user } = useUser();
  const [email, setEmail] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [detectedProvider, setDetectedProvider] = useState<CalendarProvider>(null);
  const [isDetecting, setIsDetecting] = useState(false);
  const [hasAttemptedDetection, setHasAttemptedDetection] = useState(false);
  const [providerMismatch, setProviderMismatch] = useState(false);

  const detectProviderFromEmail = async (emailAddress: string): Promise<CalendarProvider> => {
    if (!emailAddress || !emailAddress.includes('@')) {
      return null;
    }

    try {
      const response = await calendarApi.detectProvider(emailAddress);
      
      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      
      // Ensure we have a valid provider value
      if (data.provider && ['google', 'outlook', 'icloud'].includes(data.provider)) {
        return data.provider as CalendarProvider;
      }
      
      return null;
    } catch (error) {
      return null;
    }
  };

  useEffect(() => {
    if (open && user?.primaryEmailAddress?.emailAddress) {
      const userEmail = user.primaryEmailAddress.emailAddress;
      setEmail(userEmail);
    } else if (!open) {
      // Reset state when modal closes
      setEmail('');
      setDetectedProvider(null);
      setIsDetecting(false);
      setHasAttemptedDetection(false);
      setProviderMismatch(false);
    }
  }, [open, user]);

  const handleConnect = async () => {
    if (!email) {
      toast.error(t('calendar.connect.pleaseEnterEmail'));
      return;
    }

    // Check provider when Connect is clicked
    setHasAttemptedDetection(true);
    setIsDetecting(true);
    const detected = await detectProviderFromEmail(email);
    setIsDetecting(false);
    setDetectedProvider(detected);

    if (!detected) {
      toast.error(t('calendar.connect.unableToDetectProvider'));
      return;
    }

    if (detected === 'icloud') {
      toast.error(t('calendar.connect.icloudNotAvailable'));
      return;
    }

    // If a specific provider was selected, validate it matches
    if (provider && detected !== provider) {
      setProviderMismatch(true);
      return;
    }

    setProviderMismatch(false);

    setIsConnecting(true);

    try {
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
        throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL');
      }

      if (!process.env.NEXT_PUBLIC_SUPABASE_KEY) {
        throw new Error('Missing NEXT_PUBLIC_SUPABASE_KEY');
      }

      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_KEY
      );

      const providerToUse = provider || detectedProvider;
      if (!providerToUse) {
        throw new Error('No provider specified');
      }

      let oauthProvider: string;
      let scopes: string;

      switch (providerToUse) {
        case 'google':
          oauthProvider = 'google';
          scopes = 'https://www.googleapis.com/auth/calendar';
          break;
        case 'outlook':
          oauthProvider = 'azure';
          scopes = 'openid profile email offline_access https://graph.microsoft.com/Calendars.ReadWrite';
          break;
        default:
          throw new Error('Unsupported calendar provider');
      }

      // Get the current origin to build the redirect URL
      // This is where Supabase will redirect AFTER processing the OAuth
      // Include provider in query params so callback can detect it
      // Check if we're coming from integrations page
      const returnUrl = window.location.pathname.includes('/calendar')
        ? '/calendar'
        : '/calendar';
      const redirectUrl = `${window.location.origin}/calendar/callback?provider=${providerToUse}&returnUrl=${encodeURIComponent(returnUrl)}`;

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: oauthProvider as 'google' | 'azure',
        options: {
          scopes,
          redirectTo: redirectUrl,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) {
        throw error;
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : t('calendar.connect.connectionFailed');
      toast.error(errorMessage);
      setIsConnecting(false);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && !isConnecting) {
      event.preventDefault();
      handleConnect();
    }
  };

  const handleEmailKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    handleKeyDown(event);
  };

  const providerName = provider ? getProviderName(provider) : getProviderName(detectedProvider);
  const providerLogo = provider === 'google' ? '/icons/gmail.png' : provider === 'outlook' ? '/icons/outlook.png' : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            {providerLogo && (
              <Image
                src={providerLogo}
                alt={providerName || 'Calendar'}
                width={32}
                height={32}
                className="object-contain"
              />
            )}
            <DialogTitle>
              {provider ? t('calendar.connect.connectProvider', { provider: providerName }) : t('calendar.connect.title')}
            </DialogTitle>
          </div>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            {t('calendar.connect.onlyOneCalendar')}
          </p>
          <div className="grid gap-2">
            <Label htmlFor="email">
              <span>{t('calendar.connect.emailAddress')}<RequiredAsterisk /></span>
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none z-10" />
              <Input
                id="email"
                type="email"
                placeholder={t('calendar.connect.emailPlaceholder')}
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setProviderMismatch(false);
                }}
                onKeyDown={handleEmailKeyDown}
                className={cn('pl-9', providerMismatch && 'border-destructive focus-visible:ring-destructive')}
                disabled={isConnecting}
                aria-label={t('calendar.connect.emailAria')}
              />
            </div>
            {isDetecting && (
              <p className="text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  {t('calendar.connect.detectingProvider')}
                </span>
              </p>
            )}
            {!isDetecting && hasAttemptedDetection && email && !detectedProvider && (
              <p className="text-xs text-destructive">
                {t('calendar.connect.unableToDetect')}
              </p>
            )}
            {providerMismatch && (
              <p className="text-xs text-destructive">
                {t('calendar.connect.providerMismatch', { selected: providerName, detected: getProviderName(detectedProvider) })}
              </p>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isConnecting}
              aria-label={t('calendar.connect.cancelAria')}
            >
              {t('calendar.connect.cancel')}
            </Button>
            <Button
              onClick={handleConnect}
              disabled={isConnecting || !email || isDetecting}
              aria-label={t('calendar.connect.connectAria')}
            >
              {isConnecting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('calendar.connect.connecting')}
                </>
              ) : isDetecting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('calendar.connect.checking')}
                </>
              ) : (
                `Connect ${getProviderName(detectedProvider) || 'Calendar'}`
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

