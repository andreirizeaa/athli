'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { useAuth } from '@clerk/nextjs';
import { ConnectCalendarButton } from './connect-calendar-button';
import { CalendarView } from './calendar-view';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { calendarApi } from '@/lib/api/calendar-api';

export const CalendarStatus = () => {
  const t = useTranslations();
  const { getToken } = useAuth();
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
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
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : t('calendar.failedToCheckStatus');
        toast.error(errorMessage);
        setIsConnected(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkCalendarConnection();
  }, [router, getToken]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 w-full h-full min-h-[calc(100vh-200px)]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-sm text-muted-foreground">{t('calendar.checkingConnection')}</p>
      </div>
    );
  }

  if (isConnected) {
    return (
      <div className="w-full flex flex-col">
        <CalendarView />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center gap-4 w-full h-full min-h-[calc(100vh-200px)]">
      <h2 className="text-2xl font-semibold">{t('calendar.connectYourCalendar')}</h2>
      <p className="text-sm text-muted-foreground text-center max-w-md">
        {t('calendar.connectDescription')}
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

