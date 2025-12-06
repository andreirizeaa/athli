'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { useAuth } from '@clerk/nextjs';
import { ConnectCalendarButton } from '@/app/calendar/components/connect-calendar-button';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { CheckCircle2 } from 'lucide-react';
import { calendarApi } from '@/lib/api/calendar-api';

export const CalendarStatus = () => {
  const t = useTranslations();
  const { getToken } = useAuth();
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [provider, setProvider] = useState<'google' | 'outlook' | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkCalendarConnection = async () => {
      try {
        const token = await getToken();
        const response = await calendarApi.status(token);
        if (!response.ok) {
          if (response.status === 401) {
            router.push('/sign-in');
            return;
          }
          setIsConnected(false);
          setIsLoading(false);
          return;
        }

        const data = await response.json();
        setIsConnected(data.connected);
        setProvider(data.provider || null);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : t('settings.integrations.calendar.failedToCheckStatus');
        toast.error(errorMessage);
        setIsConnected(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkCalendarConnection();
  }, [router, t, getToken]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-8">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-sm text-muted-foreground">{t('settings.integrations.calendar.checkingConnection')}</p>
      </div>
    );
  }

  if (isConnected) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-8">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="h-6 w-6 text-green-500" />
          <h3 className="text-lg font-semibold">{t('settings.integrations.calendar.connected')}</h3>
        </div>
        {provider && (
          <div className="flex items-center gap-2">
            <Image
              src={provider === 'google' ? '/icons/gmail.png' : '/icons/outlook.png'}
              alt={provider === 'google' ? t('calendar.gmail') : t('calendar.outlook')}
              width={24}
              height={24}
              className="object-contain"
            />
            <p className="text-sm text-muted-foreground">
              {provider === 'google' ? t('calendar.gmail') : t('calendar.outlook')}
            </p>
          </div>
        )}
        <p className="text-sm text-muted-foreground text-center max-w-md">
          {t('settings.integrations.calendar.connectedDescription')}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center gap-4 py-8">
      <h3 className="text-lg font-semibold">{t('settings.integrations.calendar.connectYourCalendar')}</h3>
      <p className="text-sm text-muted-foreground text-center max-w-md">
        {t('settings.integrations.calendar.connectDescription')}
      </p>
      <div className="flex items-center gap-6">
        <Image
          src="/icons/gmail.png"
          alt={t('calendar.gmail')}
          width={30}
          height={30}
          className="object-contain"
        />
        <Image
          src="/icons/outlook.png"
          alt={t('calendar.outlook')}
          width={30}
          height={30}
          className="object-contain"
        />
      </div>
      <ConnectCalendarButton />
    </div>
  );
};

