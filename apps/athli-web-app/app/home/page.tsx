'use client';

import { useUser } from '@clerk/nextjs';
import { useTranslations } from 'next-intl';
import { Separator } from '@/components/ui/separator';
import { ProgrammingRequiredCard } from './components/programming-required-card';
import { MessagesCard } from './components/messages-card';
import { CompletedWorkoutsCard } from './components/completed-workouts-card';

const HomePage = () => {
  const { user } = useUser();
  const t = useTranslations();

  const hour = new Date().getHours();
  const firstName = user?.firstName || 'there';

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
        <div className="w-full flex gap-4">
          <div className="flex flex-col" style={{ width: '50%', height: '1200px' }}>
            <CompletedWorkoutsCard />
            <div className="flex-1 overflow-y-auto mt-4">
              {/* Scrollable content below the card */}
            </div>
          </div>
          <div className="flex-1 flex flex-col gap-4">
            <div className="flex gap-4">
              <div className="flex-1">
                <ProgrammingRequiredCard />
              </div>
              <div className="flex-1">
                <MessagesCard />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
