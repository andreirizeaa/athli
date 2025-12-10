'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useAuth } from '@clerk/nextjs';
import { ClientCalendarStatus } from './components/client-calendar-status';
import { useParams } from 'next/navigation';
import { mockAthletes } from '@/components/app/app-shell';
import { calendarApi } from '@/lib/api/calendar-api';

const AppointmentSessionsPage = () => {
  const t = useTranslations();
  const { getToken } = useAuth();
  const params = useParams<{ clientId: string }>();
  const clientId = Array.isArray(params.clientId) ? params.clientId[0] : params.clientId;
  const athlete = mockAthletes.find((item) => item.id === clientId);
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

  if (!athlete) {
    return (
      <div className="h-full w-full flex flex-col overflow-hidden">
        <div className="w-full flex-1 min-h-0 overflow-hidden flex items-center justify-center">
          <p className="text-sm text-muted-foreground">{t('athletes.profile.clientNotFound')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col overflow-hidden">
      <ClientCalendarStatus clientEmail={athlete.email} provider={provider} />
    </div>
  );
};

export default AppointmentSessionsPage;

