'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { useAuth } from '@clerk/nextjs';
import { Separator } from '@/components/ui/separator';
import { CalendarStatus } from './components/calendar-status';
import { calendarApi } from '@/lib/api/calendar-api';

const CalendarPage = () => {
  const t = useTranslations();
  const { getToken } = useAuth();
  const [provider, setProvider] = useState<'google' | 'outlook' | null>(null);

  useEffect(() => {
    const fetchProvider = async () => {
      try {
        const token = await getToken();
        const response = await calendarApi.status(token);
        if (response.ok) {
          const data = await response.json();
          if (data.connected && data.provider) {
            setProvider(data.provider);
          }
        }
      } catch (error) {
        // Silently fail - provider icon is optional
      }
    };

    fetchProvider();
  }, [getToken]);

  return (
    <div className="w-full flex flex-col h-full">
      <div className="w-full relative flex-shrink-0">
        <div className="pl-4 pr-4 flex items-center justify-between">
          <h1 className="text-[22px] font-semibold mb-2 mt-2">{t('calendar.title')}</h1>
          {provider && (
            <div className="flex items-center">
              <Image
                src={provider === 'google' ? '/icons/gmail.png' : '/icons/outlook.png'}
                alt={provider === 'google' ? t('calendar.gmail') : t('calendar.outlook')}
                width={24}
                height={24}
                className="object-contain"
              />
            </div>
          )}
        </div>
        <Separator className="absolute bottom-[-1px] left-0 right-0" />
      </div>
      <div className="w-full flex-1 min-h-0">
        <CalendarStatus />
      </div>
    </div>
  );
};

export default CalendarPage;
