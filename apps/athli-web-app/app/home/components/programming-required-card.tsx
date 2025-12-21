'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Dumbbell, MessageCircle } from 'lucide-react';
import { cn } from '@/lib/general/utils';
import { mockAthletes, type Athlete } from '@/components/app/app-shell';

type ProgrammingClient = {
  id: string;
  name: string;
  avatar?: string;
  lastScheduledWorkout: Date;
};

// Dummy data for clients that need programming - using real athlete data
const getProgrammingClients = (): ProgrammingClient[] => {
  const athletes = mockAthletes.slice(0, 10); // Get first 10 athletes
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Mix of past (required) and future (upcoming) dates
  const dates = [
    new Date(today.getTime() - 5 * 24 * 60 * 60 * 1000), // 5 days ago - Required
    new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000), // 2 days ago - Required
    new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000), // 3 days from now - Upcoming
    new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000), // 7 days from now - Upcoming
    new Date(today.getTime() - 10 * 24 * 60 * 60 * 1000), // 10 days ago - Required
    new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000), // 14 days from now - Upcoming
    new Date(today.getTime() + 21 * 24 * 60 * 60 * 1000), // 21 days from now - Upcoming
    new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000), // 7 days ago - Required
    new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000), // 30 days from now - Upcoming
    new Date(today.getTime() - 14 * 24 * 60 * 60 * 1000), // 14 days ago - Required
  ];
  
  return athletes.map((athlete, index) => ({
    id: athlete.id,
    name: athlete.name,
    avatar: athlete.avatar,
    lastScheduledWorkout: dates[index] || new Date(today.getTime() - index * 24 * 60 * 60 * 1000),
  }));
};

const DUMMY_PROGRAMMING_CLIENTS: ProgrammingClient[] = getProgrammingClients();

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

const formatLastWorkoutDate = (date: Date): string => {
  const day = date.getDate();
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = monthNames[date.getMonth()];
  const dayWithOrdinal = `${day}${getOrdinalSuffix(day)}`;
  return `${dayWithOrdinal} ${month}`;
};

export const ProgrammingRequiredCard = () => {
  const t = useTranslations();
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<'required' | 'upcoming'>('required');

  const filteredClients = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return DUMMY_PROGRAMMING_CLIENTS.filter((client) => {
      const lastWorkout = new Date(client.lastScheduledWorkout);
      lastWorkout.setHours(0, 0, 0, 0);
      
      if (statusFilter === 'required') {
        // Required = last scheduled workout is in the past (needs programming now)
        return lastWorkout < today;
      } else {
        // Upcoming = last scheduled workout is in the future
        return lastWorkout >= today;
      }
    });
  }, [statusFilter]);

  const handleNavigateToTrainingCalendar = (clientId: string) => {
    router.push(`/athletes/${clientId}/training-calendar`);
  };

  const handleNavigateToMessages = (clientId: string) => {
    router.push(`/messaging/${clientId}`);
  };

  const handleTrainingCalendarKeyDown = (event: React.KeyboardEvent<HTMLDivElement>, clientId: string) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleNavigateToTrainingCalendar(clientId);
    }
  };

  const handleMessagesKeyDown = (event: React.KeyboardEvent<HTMLDivElement>, clientId: string) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleNavigateToMessages(clientId);
    }
  };

  return (
    <Card className="bg-background flex flex-col w-full" style={{ height: '500px', minHeight: '500px', maxHeight: '500px' }}>
      <CardHeader className="px-4 flex-shrink-0">
        <CardTitle>{t('home.programmingRequired')}</CardTitle>
      </CardHeader>
      <Separator className="w-full mt-[-8px] flex-shrink-0" />
      <CardContent className="px-0 flex flex-col flex-1 min-h-0">
        <div className="px-4 pb-2">
          <div className="flex flex-col gap-[12px]">
            <div className="flex items-center justify-end">
              <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as 'required' | 'upcoming')}>
                <SelectTrigger size="sm" className="h-7 text-xs w-[140px] !py-0 px-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="required">{t('home.filterRequired')}</SelectItem>
                  <SelectItem value="upcoming">{t('home.filterUpcoming')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <div className="text-xs font-semibold uppercase text-muted-foreground">
                {t('home.client')} ({filteredClients.length})
              </div>
              <div className="text-xs font-semibold uppercase text-muted-foreground">
                {t('home.action')}
              </div>
            </div>
          </div>
        </div>
        <Separator className="w-full" />
        <div className="w-full flex-1 overflow-y-auto" style={{ maxHeight: '400px' }}>
          {filteredClients.length === 0 ? (
            <div className="px-4 py-4">
              <p className="text-sm text-muted-foreground">{t('home.noProgrammingRequired')}</p>
            </div>
          ) : (
            <div className="space-y-0">
              {filteredClients.map((client) => (
                <div
                  key={client.id}
                  className={cn(
                    'border-b transition-colors hover:bg-accent',
                    'px-4 py-3 flex items-center justify-between gap-3'
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <Avatar className="h-10 w-10 flex-shrink-0">
                      <AvatarImage src={client.avatar} alt={client.name} />
                      <AvatarFallback>{client.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0 flex flex-col gap-1">
                      <span className="text-sm font-medium truncate">{client.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {t('home.lastScheduledWorkout', { date: formatLastWorkoutDate(client.lastScheduledWorkout) })}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div
                            role="button"
                            tabIndex={0}
                            onClick={() => handleNavigateToTrainingCalendar(client.id)}
                            onKeyDown={(e) => handleTrainingCalendarKeyDown(e, client.id)}
                            className="flex items-center justify-center rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer"
                            aria-label={t('home.trainingCalendar')}
                          >
                            <Dumbbell className="size-4" />
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{t('home.trainingCalendar')}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div
                            role="button"
                            tabIndex={0}
                            onClick={() => handleNavigateToMessages(client.id)}
                            onKeyDown={(e) => handleMessagesKeyDown(e, client.id)}
                            className="flex items-center justify-center rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer"
                            aria-label={t('home.messages')}
                          >
                            <MessageCircle className="size-4" />
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{t('home.messages')}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
      <Separator className="w-full" />
    </Card>
  );
};

