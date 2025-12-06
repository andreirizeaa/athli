'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useAuth } from '@clerk/nextjs';
import { createClient } from '@supabase/supabase-js';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { calendarApi } from '@/lib/api/calendar-api';

const CalendarCallbackContent = () => {
  const t = useTranslations();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { getToken } = useAuth();
  const [isProcessing, setIsProcessing] = useState(true);

  useEffect(() => {
    const processCallback = async () => {
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

        // Supabase OAuth returns session in hash fragments
        if (typeof window !== 'undefined') {
          // Check hash fragments first (most common for Supabase OAuth)
          const hashParams = new URLSearchParams(window.location.hash.substring(1));
          
          // PRIMARY: Google provider tokens (provider_token / provider_refresh_token)
          const googleAccessToken = hashParams.get('provider_token');
          const googleRefreshToken = hashParams.get('provider_refresh_token');
          
          // SECONDARY: Outlook/Microsoft tokens (access_token / refresh_token)
          const outlookAccessToken = hashParams.get('access_token');
          const outlookRefreshToken = hashParams.get('refresh_token');
          
          // Also check query params (some OAuth flows use query params)
          const queryGoogleToken = searchParams.get('provider_token');
          const queryGoogleRefreshToken = searchParams.get('provider_refresh_token');
          const queryOutlookToken = searchParams.get('access_token');
          const queryOutlookRefreshToken = searchParams.get('refresh_token');

          // Final selection: Google format first, then Outlook format
          const accessToken = googleAccessToken || queryGoogleToken || outlookAccessToken || queryOutlookToken;
          const refreshToken = googleRefreshToken || queryGoogleRefreshToken || outlookRefreshToken || queryOutlookRefreshToken;

          if (!accessToken) {
            throw new Error(
              t('calendar.callback.calendarConnectionFailed')
            );
          }

          // Determine provider from URL params first, then token format
          const providerParam = searchParams.get('provider') || hashParams.get('provider');
          let provider: 'google' | 'outlook' = 'google';

          // PRIORITY 1: Check provider param from URL (most reliable)
          if (providerParam === 'outlook' || providerParam === 'azure') {
            provider = 'outlook';
          } else if (providerParam === 'google') {
            provider = 'google';
          } else if (googleAccessToken || queryGoogleToken) {
            // PRIORITY 2: Google-format tokens (provider_token)
            provider = 'google';
          } else if (outlookAccessToken || queryOutlookToken) {
            // PRIORITY 3: Outlook-format tokens (access_token)
            provider = 'outlook';
          } else {
            // Default fallback
            provider = 'google';
          }

          // Send provider tokens to API for storage
          const token = await getToken();
          const response = await calendarApi.callback(
            {
              provider_access_token: accessToken,
              provider_refresh_token: refreshToken,
              provider: provider === 'outlook' ? 'azure' : 'google',
            },
            token
          );

          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || t('calendar.callback.failedToSave'));
          }

          toast.success(t('calendar.toast.connectedSuccessfully'));
          // Check if there's a return URL parameter
          const returnUrl = searchParams.get('returnUrl') || hashParams.get('returnUrl');
          router.push(returnUrl || '/calendar');
          return;
        }

        // If we get here, no tokens were found
        throw new Error(t('calendar.callback.noTokensReturned'));
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : t('calendar.callback.connectionFailed');
        toast.error(errorMessage);
        const returnUrl = searchParams.get('returnUrl');
        router.push(returnUrl || '/calendar');
      } finally {
        setIsProcessing(false);
      }
    };

    processCallback();
  }, [router, searchParams, getToken]);

  if (isProcessing) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">{t('calendar.callback.connecting')}</p>
        </div>
      </div>
    );
  }

  return null;
};

export default function CalendarCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Loading...</p>
          </div>
        </div>
      }
    >
      <CalendarCallbackContent />
    </Suspense>
  );
}

