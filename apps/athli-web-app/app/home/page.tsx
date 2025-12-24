'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSupabaseAuth } from '@/lib/providers/supabase-auth-provider';
import { useTranslations } from 'next-intl';
import { Separator } from '@/components/ui/separator';
import { CompletedWorkoutsCard } from './components/completed-workouts-card';

const HomePage = () => {
  const { user, refreshUser } = useSupabaseAuth();
  const t = useTranslations();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Check if user needs to be refreshed after email change
  useEffect(() => {
    const checkRefresh = async () => {
      if (searchParams.get('refresh')) {
        // Refresh user data
        await refreshUser();
        // Redirect to /home without query parameter
        router.replace('/home');
      }
    };

    checkRefresh();
  }, [searchParams, refreshUser, router]);

  const hour = new Date().getHours();
  const firstName = user?.name?.split(' ')[0] || 'there';

  let greetingKey = 'greetings.goodMorning';
  if (hour >= 12 && hour < 18) {
    greetingKey = 'greetings.goodAfternoon';
  } else if (hour >= 18) {
    greetingKey = 'greetings.goodEvening';
  }

  const getOrdinalSuffix = (day: number): string => {
    if (day > 3 && day < 21) return 'th';
    switch (day % 10) {
      case 1:
        return 'st';
      case 2:
        return 'nd';
      case 3:
        return 'rd';
      default:
        return 'th';
    }
  };

  const formatDate = (): { day: string; month: string; year: number } => {
    const now = new Date();
    const day = now.getDate();
    const monthNames = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];
    const month = monthNames[now.getMonth()];
    const year = now.getFullYear();
    const dayWithOrdinal = `${day}${getOrdinalSuffix(day)}`;

    return { day: dayWithOrdinal, month, year };
  };

  const { day, month, year } = formatDate();
  const dateString = t('home.todayIs', { day, month, year });
  const greeting = `${t(greetingKey)}, ${firstName}.`;


  return (
    <div className="h-full w-full flex flex-col bg-background overflow-auto">
      <div className="w-full relative flex-shrink-0">
        <div className="pl-4 pr-4 flex items-baseline gap-2">
          <h1 className="text-[22px] font-semibold mb-2 mt-2">{greeting}</h1>
          <p className="text-sm text-foreground mb-2 mt-2">{dateString}</p>
        </div>
        <Separator className="absolute bottom-[-1px] left-0 right-0" />
      </div>
      <div className="w-full flex-1 px-4 py-4">
        <div className="w-full flex justify-center">
          <div className="flex flex-col" style={{ width: '50%', height: '1200px' }}>
            <CompletedWorkoutsCard />
            <div className="flex-1 overflow-y-auto mt-4">
              {/* Scrollable content below the card */}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
