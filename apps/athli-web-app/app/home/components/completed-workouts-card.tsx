'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Calendar, Dumbbell, MessageCircle, User, FileEdit, CircleCheck, Clock, Gauge, Weight, Image, Video } from 'lucide-react';
import { cn } from '@/lib/general/utils';
import { mockAthletes, mockWorkouts } from '@/components/app/app-shell';

type MissedWorkout = {
  id: string;
  clientId: string;
  clientName: string;
  clientAvatar?: string;
  workoutName: string;
  workoutId: string;
  workoutDate: Date;
};

type PreviewExercise = {
  id: string;
  name: string;
  sets: string;
};

type PreviewSection = {
  id: string;
  type: 'regular' | 'amrap' | 'timed';
  exercises: PreviewExercise[];
};

type SessionComment = {
  id: string;
  type: 'text' | 'image' | 'video';
  content: string;
  timestamp: Date;
};

type CompletedWorkout = {
  id: string;
  clientId: string;
  clientName: string;
  clientAvatar?: string;
  workoutName: string;
  workoutId: string;
  workoutDate: Date;
  exercisesCompleted: number;
  exercisesTotal: number;
  minutes: number;
  percentage: number;
  weight: number; // in kg
  workoutDescription?: string;
  workoutType?: string;
  workoutEquipment?: string;
  workoutCreated?: string;
  sections?: PreviewSection[];
  comments?: SessionComment[];
};

const formatWorkoutDate = (dateStr: string): string => {
  const [day, month, year] = dateStr.split('-');
  const date = new Date(2000 + parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10));
  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];
  return `${date.getDate()} ${months[date.getMonth()]}, 20${year}`;
};

const buildMockPreviewSections = (workoutName: string): PreviewSection[] => {
  return [
    {
      id: 'sec-1',
      type: 'regular',
      exercises: [
        {
          id: 'ex-1',
          name: `${workoutName} - Main lift`,
          sets: '3 x 8–10',
        },
        {
          id: 'ex-2',
          name: 'Accessory 1',
          sets: '3 x 10–12',
        },
        {
          id: 'ex-3',
          name: 'Accessory 2',
          sets: '3 x 12–15',
        },
      ],
    },
    {
      id: 'sec-2',
      type: 'timed',
      exercises: [
        {
          id: 'ex-4',
          name: 'Finisher circuit',
          sets: '10 min',
        },
      ],
    },
  ];
};

const getMissedWorkouts = (): MissedWorkout[] => {
  // Always use yesterday's date for missed workouts
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0);

  return [
    {
      id: '1',
      clientId: '1',
      clientName: 'John Smith',
      clientAvatar: mockAthletes.find((a) => a.id === '1')?.avatar,
      workoutName: 'Strength Builder',
      workoutId: '1',
      workoutDate: new Date(yesterday),
    },
    {
      id: '2',
      clientId: '2',
      clientName: 'Sarah Johnson',
      clientAvatar: mockAthletes.find((a) => a.id === '2')?.avatar,
      workoutName: 'Cardio Blast',
      workoutId: '2',
      workoutDate: new Date(yesterday),
    },
    {
      id: '3',
      clientId: '3',
      clientName: 'Mike Wilson',
      clientAvatar: mockAthletes.find((a) => a.id === '3')?.avatar,
      workoutName: 'HIIT Power',
      workoutId: '3',
      workoutDate: new Date(yesterday),
    },
    {
      id: '4',
      clientId: '4',
      clientName: 'Emily Davis',
      clientAvatar: mockAthletes.find((a) => a.id === '4')?.avatar,
      workoutName: 'Flexibility Flow',
      workoutId: '4',
      workoutDate: new Date(yesterday),
    },
    {
      id: '5',
      clientId: '5',
      clientName: 'David Brown',
      clientAvatar: mockAthletes.find((a) => a.id === '5')?.avatar,
      workoutName: 'Endurance Runner',
      workoutId: '5',
      workoutDate: new Date(yesterday),
    },
  ];
};

const getCompletedWorkouts = (): CompletedWorkout[] => {
  // Always use today's date for completed workouts
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const mockWorkout = mockWorkouts[0] || {
    program: 'Strength Builder',
    description: 'A comprehensive strength training workout',
    type: 'Push',
    equipment: 'Barbell, Dumbbells',
    created: '01-12-24',
  };

  return [
    {
      id: '1',
      clientId: '1',
      clientName: 'John Smith',
      clientAvatar: mockAthletes.find((a) => a.id === '1')?.avatar,
      workoutName: 'Strength Builder',
      workoutId: '1',
      workoutDate: new Date(today),
      exercisesCompleted: 6,
      exercisesTotal: 7,
      minutes: 75,
      percentage: 85,
      weight: 500,
      workoutDescription: mockWorkout.description,
      workoutType: mockWorkout.type,
      workoutEquipment: mockWorkout.equipment,
      workoutCreated: mockWorkout.created,
      sections: buildMockPreviewSections('Strength Builder'),
      comments: [
        {
          id: 'c1',
          type: 'text',
          content: 'Great session today! Felt really strong on the main lifts.',
          timestamp: new Date(today.getTime() - 2 * 60 * 60 * 1000),
        },
        {
          id: 'c2',
          type: 'image',
          content: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400',
          timestamp: new Date(today.getTime() - 1 * 60 * 60 * 1000),
        },
      ],
    },
    {
      id: '2',
      clientId: '2',
      clientName: 'Sarah Johnson',
      clientAvatar: mockAthletes.find((a) => a.id === '2')?.avatar,
      workoutName: 'Cardio Blast',
      workoutId: '2',
      workoutDate: new Date(today),
      exercisesCompleted: 5,
      exercisesTotal: 5,
      minutes: 60,
      percentage: 100,
      weight: 320,
      workoutDescription: 'High-intensity cardio workout',
      workoutType: 'Cardio',
      workoutEquipment: 'Treadmill, Bike',
      workoutCreated: '02-12-24',
      sections: buildMockPreviewSections('Cardio Blast'),
      comments: [
        {
          id: 'c3',
          type: 'text',
          content: 'Completed all sets! The intervals were challenging but manageable.',
          timestamp: new Date(today.getTime() - 3 * 60 * 60 * 1000),
        },
        {
          id: 'c4',
          type: 'video',
          content: 'https://example.com/video.mp4',
          timestamp: new Date(today.getTime() - 2 * 60 * 60 * 1000),
        },
      ],
    },
    {
      id: '3',
      clientId: '3',
      clientName: 'Mike Wilson',
      clientAvatar: mockAthletes.find((a) => a.id === '3')?.avatar,
      workoutName: 'HIIT Power',
      workoutId: '3',
      workoutDate: new Date(today),
      exercisesCompleted: 8,
      exercisesTotal: 10,
      minutes: 90,
      percentage: 72,
      weight: 750,
      workoutDescription: 'High-intensity interval training',
      workoutType: 'HIIT',
      workoutEquipment: 'Kettlebells, Battle Rope',
      workoutCreated: '03-12-24',
      sections: buildMockPreviewSections('HIIT Power'),
      comments: [
        {
          id: 'c5',
          type: 'text',
          content: 'Missed the last two exercises due to time, but overall good session.',
          timestamp: new Date(today.getTime() - 1 * 60 * 60 * 1000),
        },
      ],
    },
    {
      id: '4',
      clientId: '4',
      clientName: 'Emily Davis',
      clientAvatar: mockAthletes.find((a) => a.id === '4')?.avatar,
      workoutName: 'Flexibility Flow',
      workoutId: '4',
      workoutDate: new Date(today),
      exercisesCompleted: 4,
      exercisesTotal: 4,
      minutes: 45,
      percentage: 100,
      weight: 180,
      workoutDescription: 'Yoga and stretching routine',
      workoutType: 'Flexibility',
      workoutEquipment: 'Yoga Mat',
      workoutCreated: '04-12-24',
      sections: buildMockPreviewSections('Flexibility Flow'),
      comments: [
        {
          id: 'c6',
          type: 'text',
          content: 'Perfect recovery session. Feeling much more flexible now.',
          timestamp: new Date(today.getTime() - 30 * 60 * 1000),
        },
        {
          id: 'c7',
          type: 'image',
          content: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=400',
          timestamp: new Date(today.getTime() - 15 * 60 * 1000),
        },
      ],
    },
    {
      id: '5',
      clientId: '5',
      clientName: 'David Brown',
      clientAvatar: mockAthletes.find((a) => a.id === '5')?.avatar,
      workoutName: 'Endurance Runner',
      workoutId: '5',
      workoutDate: new Date(today),
      exercisesCompleted: 7,
      exercisesTotal: 8,
      minutes: 80,
      percentage: 88,
      weight: 620,
      workoutDescription: 'Long-distance running program',
      workoutType: 'Endurance',
      workoutEquipment: 'Running Shoes',
      workoutCreated: '05-12-24',
      sections: buildMockPreviewSections('Endurance Runner'),
      comments: [
        {
          id: 'c8',
          type: 'text',
          content: 'Great run today! Managed to maintain pace throughout.',
          timestamp: new Date(today.getTime() - 4 * 60 * 60 * 1000),
        },
      ],
    },
  ];
};

const formatDate = (date: Date): string => {
  const year = date.getFullYear().toString().slice(-2);
  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];
  return `${date.getDate()} ${months[date.getMonth()]}, 20${year}`;
};


export const CompletedWorkoutsCard = () => {
  const t = useTranslations();
  const router = useRouter();
  const [workoutType, setWorkoutType] = useState<'completed' | 'missed'>('completed');
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(() => {
    // Default to today for completed, yesterday for missed
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  });

  // Update selected date when workout type changes
  useEffect(() => {
    if (workoutType === 'missed') {
      // Set to yesterday for missed workouts
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);
      setSelectedDate(yesterday);
    } else {
      // Set to today for completed workouts
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      setSelectedDate(today);
    }
  }, [workoutType]);

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return;
    const normalized = new Date(date);
    normalized.setHours(0, 0, 0, 0);
    setSelectedDate(normalized);
    setIsCalendarOpen(false);
  };

  const handleTodayOrYesterdayClick = () => {
    if (workoutType === 'missed') {
      // Set to yesterday for missed workouts
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);
      setSelectedDate(yesterday);
    } else {
      // Set to today for completed workouts
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      setSelectedDate(today);
    }
  };

  const dateText = useMemo(() => {
    if (!selectedDate) return null;
    return formatDate(selectedDate);
  }, [selectedDate]);

  const isTodayOrYesterdaySelected = useMemo(() => {
    if (!selectedDate) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
    const selected = new Date(selectedDate);
    selected.setHours(0, 0, 0, 0);

    if (workoutType === 'missed') {
      return selected.getTime() === yesterday.getTime();
    } else {
      return selected.getTime() === today.getTime();
    }
  }, [selectedDate, workoutType]);

  const filteredMissedWorkouts = useMemo(() => {
    if (!selectedDate || workoutType !== 'missed') return [];
    const selected = new Date(selectedDate);
    selected.setHours(0, 0, 0, 0);

    const missedWorkouts = getMissedWorkouts();
    return missedWorkouts.filter((workout) => {
      const workoutDate = new Date(workout.workoutDate);
      workoutDate.setHours(0, 0, 0, 0);
      return workoutDate.getTime() === selected.getTime();
    });
  }, [selectedDate, workoutType]);

  const filteredCompletedWorkouts = useMemo(() => {
    if (!selectedDate || workoutType !== 'completed') return [];
    const selected = new Date(selectedDate);
    selected.setHours(0, 0, 0, 0);

    const completedWorkouts = getCompletedWorkouts();
    return completedWorkouts.filter((workout) => {
      const workoutDate = new Date(workout.workoutDate);
      workoutDate.setHours(0, 0, 0, 0);
      return workoutDate.getTime() === selected.getTime();
    });
  }, [selectedDate, workoutType]);

  const handleNavigateToTrainingCalendar = (clientId: string) => {
    router.push(`/athletes/${clientId}/training-calendar`);
  };

  const handleNavigateToMessages = (clientId: string) => {
    router.push(`/messaging/${clientId}`);
  };

  const handleNavigateToProfile = (clientId: string) => {
    router.push(`/athletes/${clientId}/overview`);
  };

  const handleNavigateToWorkout = (workoutId: string) => {
    router.push(`/training/workouts/${workoutId}/edit`);
  };

  const handleWorkoutKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, workoutId: string) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleNavigateToWorkout(workoutId);
    }
  };

  const handleTrainingCalendarKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, clientId: string) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleNavigateToTrainingCalendar(clientId);
    }
  };

  const handleMessagesKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, clientId: string) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleNavigateToMessages(clientId);
    }
  };

  const handleProfileKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, clientId: string) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleNavigateToProfile(clientId);
    }
  };

  return (
    <div className="flex flex-col">
      <Card className="bg-background flex-shrink-0">
        <CardHeader className="px-4 pt-2">
          <div className="flex items-center justify-between">
            <Tabs
              value={workoutType}
              onValueChange={(value) => {
                if (value === 'completed' || value === 'missed') {
                  setWorkoutType(value);
                }
              }}
              className="w-auto"
            >
              <TabsList className="w-auto">
                <TabsTrigger
                  value="completed"
                  className="data-[state=active]:border-primary data-[state=active]:bg-primary/5 data-[state=active]:text-primary dark:data-[state=active]:border-primary dark:data-[state=active]:bg-primary/5 dark:data-[state=active]:text-primary"
                >
                  {t('home.completedWorkouts')}
                </TabsTrigger>
                <TabsTrigger
                  value="missed"
                  className="data-[state=active]:border-primary data-[state=active]:bg-primary/5 data-[state=active]:text-primary dark:data-[state=active]:border-primary dark:data-[state=active]:bg-primary/5 dark:data-[state=active]:text-primary"
                >
                  {t('home.missedWorkouts')}
                </TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant={isTodayOrYesterdaySelected ? 'default' : 'outline'}
                size="sm"
                onClick={handleTodayOrYesterdayClick}
                className={cn(
                  'h-7 text-xs',
                  isTodayOrYesterdaySelected &&
                  '!bg-[#3f3c39] dark:!bg-foreground !text-background [&_svg]:!text-background hover:!bg-[#4a4642] dark:hover:!bg-foreground/90'
                )}
                aria-label={workoutType === 'missed' ? t('home.yesterday') : t('home.today')}
              >
                {workoutType === 'missed' ? t('home.yesterday') : t('home.today')}
              </Button>
              <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="flex items-center gap-2 cursor-pointer hover:bg-accent rounded-md px-2 py-1 transition-colors focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 border-0 bg-transparent"
                    aria-label={t('home.selectDate')}
                  >
                    <Calendar className="size-4 text-muted-foreground" />
                    {dateText ? (
                      <span className="text-sm font-medium">{dateText}</span>
                    ) : (
                      <span className="text-sm text-muted-foreground">{t('home.selectDate')}</span>
                    )}
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <CalendarComponent
                    mode="single"
                    selected={selectedDate}
                    onSelect={handleDateSelect}
                    defaultMonth={selectedDate}
                    initialFocus
                    captionLayout="dropdown"
                    fromYear={2020}
                    toYear={2030}
                    disabled={(date) => {
                      if (workoutType === 'missed') {
                        // For missed workouts, disable today and future dates
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        const compareDate = new Date(date);
                        compareDate.setHours(0, 0, 0, 0);
                        return compareDate >= today;
                      }
                      // For completed workouts, disable tomorrow and future dates
                      const tomorrow = new Date();
                      tomorrow.setDate(tomorrow.getDate() + 1);
                      tomorrow.setHours(0, 0, 0, 0);
                      const compareDate = new Date(date);
                      compareDate.setHours(0, 0, 0, 0);
                      return compareDate >= tomorrow;
                    }}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </CardHeader>
      </Card>
      {workoutType === 'completed' && (
        <div className="flex flex-col">
          {filteredCompletedWorkouts.length === 0 ? (
            <div className="py-4">
              <p className="text-sm text-muted-foreground">{t('home.noCompletedWorkouts')}</p>
            </div>
          ) : (
            <>
              <div className="pt-4 pb-2 flex-shrink-0">
              </div>
              <div className="pb-4 space-y-3">
                {filteredCompletedWorkouts.map((workout) => (
                  <Card key={workout.id} className="bg-background border">
                    <CardContent className="p-4">
                      <div className="flex flex-col gap-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <Avatar className="h-10 w-10 flex-shrink-0">
                              <AvatarImage src={workout.clientAvatar} alt={workout.clientName} />
                              <AvatarFallback>{workout.clientName.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col gap-1">
                              <span className="text-sm font-medium">{workout.clientName}</span>
                              <p className="text-xs text-muted-foreground">{workout.workoutName}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => handleNavigateToMessages(workout.clientId)}
                              onKeyDown={(e) => handleMessagesKeyDown(e, workout.clientId)}
                              className="h-7 text-xs whitespace-nowrap gap-2"
                              aria-label={t('home.messageClient')}
                            >
                              <MessageCircle className="size-3" />
                              {t('home.messageClient')}
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => handleNavigateToTrainingCalendar(workout.clientId)}
                              onKeyDown={(e) => handleTrainingCalendarKeyDown(e, workout.clientId)}
                              className="h-7 text-xs whitespace-nowrap gap-2"
                              aria-label={t('home.viewTrainingCalendar')}
                            >
                              <Dumbbell className="size-3" />
                              {t('home.viewTrainingCalendar')}
                            </Button>
                          </div>
                        </div>
                        <div className="grid grid-cols-4 gap-4">
                          <div className="flex flex-col items-center gap-3">
                            <CircleCheck className="size-12 text-green-600 dark:text-green-500" />
                            <div className="flex flex-col items-center gap-0.5">
                              <span className="text-lg font-bold">{workout.exercisesCompleted}/{workout.exercisesTotal}</span>
                              <span className="text-xs text-muted-foreground">{t('home.exercises')}</span>
                            </div>
                          </div>
                          <div className="flex flex-col items-center gap-3">
                            <Clock className="size-12 text-foreground" />
                            <div className="flex flex-col items-center gap-0.5">
                              <span className="text-lg font-bold">{workout.minutes}</span>
                              <span className="text-xs text-muted-foreground">{t('home.minutes')}</span>
                            </div>
                          </div>
                          <div className="flex flex-col items-center gap-3">
                            <Gauge
                              className={cn(
                                'size-12',
                                workout.percentage <= 25
                                  ? 'text-green-600 dark:text-green-500'
                                  : workout.percentage <= 60
                                    ? 'text-amber-600 dark:text-amber-500'
                                    : 'text-red-600 dark:text-red-500'
                              )}
                            />
                            <div className="flex flex-col items-center gap-0.5">
                              <span className="text-lg font-bold">{workout.percentage}%</span>
                              <span className="text-xs text-muted-foreground">{t('home.intensity')}</span>
                            </div>
                          </div>
                          <div className="flex flex-col items-center gap-3">
                            <Weight className="size-12 text-foreground" />
                            <div className="flex flex-col items-center gap-0.5">
                              <span className="text-lg font-bold">{workout.weight}kg</span>
                              <span className="text-xs text-muted-foreground">{t('home.weight')}</span>
                            </div>
                          </div>
                        </div>
                        <Accordion type="single" collapsible className="w-full border rounded-lg">
                          <AccordionItem value="workout" className="border-b">
                            <AccordionTrigger className="text-sm font-medium py-3 px-2 hover:no-underline">
                              {t('home.viewWorkout')}
                            </AccordionTrigger>
                            <AccordionContent className="px-2">
                              <div className="flex flex-col gap-3">
                                <Card className="p-4 border rounded-lg bg-background">
                                  <div className="flex flex-col gap-2">
                                    <div className="flex items-center justify-between gap-2">
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-2">
                                          <span className="text-sm font-medium">{workout.workoutName}</span>
                                          {workout.workoutCreated && (
                                            <span className="text-xs text-muted-foreground">
                                              {formatWorkoutDate(workout.workoutCreated)}
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleNavigateToWorkout(workout.workoutId)}
                                        className="h-7 text-xs whitespace-nowrap gap-2 flex-shrink-0"
                                        aria-label={t('home.editWorkout')}
                                      >
                                        <FileEdit className="size-3" />
                                        {t('home.editWorkout')}
                                      </Button>
                                    </div>
                                    {workout.workoutDescription && (
                                      <span className="text-xs text-muted-foreground line-clamp-3">
                                        {workout.workoutDescription}
                                      </span>
                                    )}
                                    <div className="flex flex-wrap gap-1">
                                      {workout.workoutType && (
                                        <Badge variant="outline" className="text-xs">
                                          {t('general.type')}: {workout.workoutType}
                                        </Badge>
                                      )}
                                      {workout.workoutEquipment && (
                                        <Badge variant="outline" className="text-xs">
                                          {t('general.equipment')}: {workout.workoutEquipment}
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                </Card>
                                {workout.sections?.map((section) => (
                                  <Card key={section.id} className="bg-background flex flex-col">
                                    <CardHeader className="px-3 py-2 border-b">
                                      <CardTitle className="uppercase tracking-wide text-[11px] font-medium flex items-center gap-2">
                                        {section.type}{' '}
                                        <span className="font-normal text-[10px]">
                                          ({section.exercises.length})
                                        </span>
                                      </CardTitle>
                                    </CardHeader>
                                    <CardContent className="px-3 py-2">
                                      <div className="flex flex-col gap-1">
                                        {section.exercises.map((exercise) => (
                                          <div
                                            key={exercise.id}
                                            className="flex items-center justify-between gap-2 rounded-md border bg-muted/60 px-2 py-1.5"
                                          >
                                            <div className="flex flex-col min-w-0">
                                              <span
                                                className="text-[11px] font-medium truncate"
                                                title={exercise.name}
                                              >
                                                {exercise.name}
                                              </span>
                                              <span className="text-[10px] text-muted-foreground">
                                                {exercise.sets}
                                              </span>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </CardContent>
                                  </Card>
                                ))}
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                          <AccordionItem value="comments" className="border-none">
                            <AccordionTrigger className="text-sm font-medium py-3 px-2 hover:no-underline">
                              {t('home.viewSessionComments')}
                            </AccordionTrigger>
                            <AccordionContent className="px-2">
                              <div className="flex flex-col gap-3">
                                {workout.comments && workout.comments.length > 0 ? (
                                  workout.comments.map((comment) => (
                                    <div
                                      key={comment.id}
                                      className="flex items-start gap-3 p-3 rounded-lg border bg-muted/30"
                                    >
                                      <Avatar className="h-8 w-8 flex-shrink-0">
                                        <AvatarImage src={workout.clientAvatar} alt={workout.clientName} />
                                        <AvatarFallback>{workout.clientName.charAt(0)}</AvatarFallback>
                                      </Avatar>
                                      <div className="flex-1 min-w-0 flex flex-col gap-2">
                                        <div className="flex items-center gap-2">
                                          <span className="text-xs font-medium">{workout.clientName}</span>
                                          <span className="text-xs text-muted-foreground">
                                            {new Date(comment.timestamp).toLocaleTimeString([], {
                                              hour: '2-digit',
                                              minute: '2-digit',
                                            })}
                                          </span>
                                        </div>
                                        {comment.type === 'text' && (
                                          <p className="text-sm text-foreground">{comment.content}</p>
                                        )}
                                        {comment.type === 'image' && (
                                          <div className="flex flex-col gap-1">
                                            <Image className="size-4 text-muted-foreground" />
                                            <img
                                              src={comment.content}
                                              alt="Session image"
                                              className="rounded-md max-w-full h-auto max-h-64 object-cover"
                                            />
                                          </div>
                                        )}
                                        {comment.type === 'video' && (
                                          <div className="flex flex-col gap-1">
                                            <Video className="size-4 text-muted-foreground" />
                                            <div className="rounded-md bg-muted p-4 flex items-center justify-center">
                                              <span className="text-xs text-muted-foreground">
                                                Video: {comment.content}
                                              </span>
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  ))
                                ) : (
                                  <p className="text-sm text-muted-foreground text-center py-4">
                                    {t('home.noSessionComments')}
                                  </p>
                                )}
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        </Accordion>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
        </div>
      )}
      {workoutType === 'missed' && (
        <div className="flex flex-col">
          {filteredMissedWorkouts.length === 0 ? (
            <div className="py-4">
              <p className="text-sm text-muted-foreground">{t('home.noMissedWorkouts')}</p>
            </div>
          ) : (
            <>
              <div className="pt-4 pb-2 flex-shrink-0">
              </div>
              <div className="pb-4 space-y-3">
                {filteredMissedWorkouts.map((workout) => (
                  <Card key={workout.id} className="bg-background border">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <Avatar className="h-10 w-10 flex-shrink-0">
                            <AvatarImage src={workout.clientAvatar} alt={workout.clientName} />
                            <AvatarFallback>{workout.clientName.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0 flex flex-col gap-1">
                            <span className="text-sm font-medium">{workout.clientName}</span>
                            <p className="text-xs text-muted-foreground">{workout.workoutName}</p>
                          </div>
                        </div>
                        <div className="flex-shrink-0 grid grid-cols-2 gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleNavigateToWorkout(workout.workoutId)}
                            onKeyDown={(e) => handleWorkoutKeyDown(e, workout.workoutId)}
                            className="h-7 text-xs whitespace-nowrap gap-2"
                            aria-label={t('home.viewWorkout')}
                          >
                            <FileEdit className="size-3" />
                            {t('home.viewWorkout')}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleNavigateToTrainingCalendar(workout.clientId)}
                            onKeyDown={(e) => handleTrainingCalendarKeyDown(e, workout.clientId)}
                            className="h-7 text-xs whitespace-nowrap gap-2"
                            aria-label={t('home.viewTrainingCalendar')}
                          >
                            <Dumbbell className="size-3" />
                            {t('home.viewTrainingCalendar')}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleNavigateToMessages(workout.clientId)}
                            onKeyDown={(e) => handleMessagesKeyDown(e, workout.clientId)}
                            className="h-7 text-xs whitespace-nowrap gap-2"
                            aria-label={t('home.messageClient')}
                          >
                            <MessageCircle className="size-3" />
                            {t('home.messageClient')}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleNavigateToProfile(workout.clientId)}
                            onKeyDown={(e) => handleProfileKeyDown(e, workout.clientId)}
                            className="h-7 text-xs whitespace-nowrap gap-2"
                            aria-label={t('home.seeProfile')}
                          >
                            <User className="size-3" />
                            {t('home.seeProfile')}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
        </div>
      )}
      <Separator />
    </div>
  );
};

