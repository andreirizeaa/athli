'use client';

import { useEffect, useState } from 'react';
import { ClientCalendarStatus } from './components/client-calendar-status';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { mockAthletes } from '@/components/app/app-shell';

const AppointmentSessionsPage = () => {
  const t = useTranslations();
  const params = useParams<{ clientId: string }>();
  const clientId = Array.isArray(params.clientId) ? params.clientId[0] : params.clientId;
  const athlete = mockAthletes.find((item) => item.id === clientId);
  const [provider, setProvider] = useState<'google' | 'outlook' | null>(null);

  useEffect(() => {
    const fetchProvider = async () => {
      try {
        const response = await fetch('/api/calendar/status');
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
  }, []);

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
    <div className="h-full w-full flex flex-col overflow-hidden">
      <div className="w-full flex-1 min-h-0 overflow-hidden">
        <ClientCalendarStatus clientEmail={athlete.email} provider={provider} />
      </div>
    </div>
  );
};

export default AppointmentSessionsPage;

