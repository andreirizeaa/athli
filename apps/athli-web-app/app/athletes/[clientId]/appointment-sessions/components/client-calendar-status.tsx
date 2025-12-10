'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useAuth } from '@clerk/nextjs';
import { ConnectCalendarButton } from '@/app/calendar/components/connect-calendar-button';
import { ClientCalendarView } from './client-calendar-view';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { calendarApi } from '@/lib/api/calendar-api';

type ClientCalendarStatusProps = {
  clientEmail: string;
  provider: 'google' | 'outlook' | null;
};

export const ClientCalendarStatus = ({ clientEmail, provider }: ClientCalendarStatusProps) => {
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
          error instanceof Error ? error.message : 'Failed to check calendar status';
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
      <div className="flex flex-col items-center justify-center gap-4 w-full h-full min-h-screen">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-sm text-muted-foreground">Checking calendar connection...</p>
      </div>
    );
  }

  if (isConnected) {
    return (
      <div className="w-full h-full flex flex-col overflow-hidden">
        <ClientCalendarView clientEmail={clientEmail} provider={provider} />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center gap-4 w-full h-full min-h-screen">
      <h2 className="text-2xl font-semibold">Connect your Calendar</h2>
      <p className="text-sm text-muted-foreground text-center max-w-md">
        You will be able to book sessions directly here and it will sync with your connected
        calendar.
      </p>
      <div className="flex items-center gap-6">
        <Image
          src="/icons/gmail.png"
          alt="Gmail"
          width={30}
          height={30}
          className="object-contain"
        />
        <Image
          src="/icons/outlook.png"
          alt="Outlook"
          width={30}
          height={30}
          className="object-contain"
        />
      </div>
      <ConnectCalendarButton />
    </div>
  );
};

