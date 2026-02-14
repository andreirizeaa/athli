'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSupabaseAuth } from '@/lib/providers/supabase-auth-provider';
import { useTranslations } from 'next-intl';
import { Separator } from '@/components/ui/separator';
import { CompletedWorkoutsCard } from './components/completed-workouts-card';
import { AtRiskClientsCard } from './components/at-risk-clients-card';
import { SummaryCards } from './components/summary-cards';
import { useIsMobile } from '@/hooks/use-mobile';

const HomePage = () => {
  const { user, refreshUser } = useSupabaseAuth();
  const t = useTranslations();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isMobile = useIsMobile();

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
      {/* Header */}
      <div className="w-full relative flex-shrink-0">
        <div className="pl-4 pr-4 flex flex-col md:flex-row md:items-baseline gap-0 md:gap-2">
          <h1 className="text-[22px] font-semibold mt-2 md:mb-2">{greeting}</h1>
          <p className="text-sm text-muted-foreground md:text-foreground mb-2 md:mt-2">{dateString}</p>
        </div>
        <Separator className="absolute bottom-[-1px] left-0 right-0" />
      </div>

      {/* Content */}
      <div className="w-full flex-1 px-4 py-4 overflow-hidden">
        {isMobile ? (
          /* Mobile Layout - Stacked */
          <div className="flex flex-col gap-4 h-full">
            {/* Summary Cards at top */}
            <SummaryCards />
            {/* Workouts Card takes remaining space */}
            <div className="flex-1 min-h-0">
              <CompletedWorkoutsCard />
            </div>
          </div>
        ) : (
          /* Desktop Layout - Two columns */
          <div className="w-full h-full flex gap-6">
            <div className="flex flex-col h-full" style={{ width: '65%' }}>
              <CompletedWorkoutsCard />
            </div>
            <div className="flex flex-col gap-4" style={{ width: '35%' }}>
              <SummaryCards />
              <AtRiskClientsCard />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default HomePage;
