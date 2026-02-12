'use client';

import { ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { Clock, Sparkles, Loader2 } from 'lucide-react';
import { useAccess } from './access-provider';
import { Button } from '@/components/ui/button';

interface AppAccessGateProps {
  children: ReactNode;
}

function AccessBlockedOverlay() {
  const t = useTranslations();

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background">
      <div className="mx-4 max-w-md text-center">
        <div className="mb-6 flex justify-center">
          <div className="rounded-full bg-primary/10 p-4">
            <Clock className="h-12 w-12 text-primary" />
          </div>
        </div>
        <h1 className="mb-3 text-3xl font-bold">
          {t('access.blocked.title', { defaultValue: 'Your Free Trial Has Ended' })}
        </h1>
        <p className="mb-8 text-lg text-muted-foreground">
          {t('access.blocked.description', {
            defaultValue: 'Your 14-day free trial has ended. Subscribe to continue using Athli and growing your coaching business.'
          })}
        </p>
        <div className="flex flex-col gap-4">
          <Button size="lg" className="w-full gap-2 text-base">
            <Sparkles className="h-5 w-5" />
            {t('access.blocked.subscribe', { defaultValue: 'Subscribe Now' })}
          </Button>
          <p className="text-sm text-muted-foreground">
            {t('access.blocked.questions', {
              defaultValue: 'Questions? Contact us at support@athli.io'
            })}
          </p>
        </div>
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}

/**
 * App-level access gate that blocks the entire app if the user doesn't have access.
 *
 * Access is granted if:
 * - User has an active subscription (Stripe - TODO)
 * - User is on an active free trial
 * - User is a client (clients don't need subscriptions)
 *
 * Use this to wrap the main app layout.
 */
export function AppAccessGate({ children }: AppAccessGateProps) {
  const { hasAccess, isLoading } = useAccess();

  if (isLoading) {
    return <LoadingState />;
  }

  if (!hasAccess) {
    return <AccessBlockedOverlay />;
  }

  return <>{children}</>;
}
