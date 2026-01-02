'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, ChevronDownIcon, Loader2 } from 'lucide-react';
import { cn } from '@/lib/general/utils';
import { WorkoutCard } from './workout-card';
import { useCoachHomeData, EnrichedWorkout } from '@/hooks/use-coach-home-data';
import { ClientTrainingDaySummary } from '@/app/athletes/[clientId]/training/client-training-day-summary';
import { WorkoutPreviewDialog } from '@/app/athletes/[clientId]/training/workout-preview-dialog';
import { toast } from 'sonner';

export const CompletedWorkoutsCard = () => {
  const t = useTranslations();
  const router = useRouter();
  const [workoutType, setWorkoutType] = useState<'completed' | 'in_progress' | 'missed'>('completed');
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    // Default to yesterday for all tabs
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday;
  });

  // State for dialogs
  const [selectedWorkout, setSelectedWorkout] = useState<EnrichedWorkout | null>(null);
  const [isSummaryDialogOpen, setIsSummaryDialogOpen] = useState(false);
  const [isPreviewDialogOpen, setIsPreviewDialogOpen] = useState(false);

  // Fetch Data using our new hook
  const { data: workouts, isLoading, error } = useCoachHomeData(selectedDate, workoutType);

  if (error) {
    console.error('Error loading home data:', error);
    toast.error('Failed to load workouts');
  }

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return;
    const normalized = new Date(date);
    normalized.setHours(0, 0, 0, 0);
    setSelectedDate(normalized);
    setIsCalendarOpen(false);
  };

  const handleTodayOrYesterdayClick = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (workoutType === 'missed') {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      setSelectedDate(yesterday);
    } else {
      setSelectedDate(today);
    }
  };

  const dateText = useMemo(() => {
    if (!selectedDate) return null;
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[selectedDate.getMonth()];
    const day = selectedDate.getDate();
    const year = selectedDate.getFullYear().toString().slice(-2);
    return `${day} ${month}, 20${year}`;
  }, [selectedDate]);

  const isTodayOrYesterdaySelected = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (workoutType === 'missed') {
      return selectedDate.getTime() === yesterday.getTime();
    } else {
      return selectedDate.getTime() === today.getTime();
    }
  }, [selectedDate, workoutType]);

  const handleCardClick = (workout: EnrichedWorkout) => {
    setSelectedWorkout(workout);
    if (workoutType === 'missed') {
      setIsPreviewDialogOpen(true);
    } else {
      setIsSummaryDialogOpen(true);
    }
  };

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Top Nav Card with border */}
      <Card className="flex-shrink-0">
        <CardContent className="px-4">
          <div className="flex items-center justify-between">
            {/* Tab Toggle - styled like add-metric-side-panel */}
            <Tabs
              value={workoutType}
              onValueChange={(value) => setWorkoutType(value as any)}
              className="w-auto"
            >
              <TabsList className="w-auto">
                <TabsTrigger
                  value="completed"
                  className="flex-1 data-[state=active]:border-primary data-[state=active]:bg-primary/5 data-[state=active]:text-primary dark:data-[state=active]:border-primary dark:data-[state=active]:bg-primary/5 dark:data-[state=active]:text-primary"
                >
                  {t('home.completedWorkouts')}
                </TabsTrigger>
                <TabsTrigger
                  value="in_progress"
                  className="flex-1 data-[state=active]:border-primary data-[state=active]:bg-primary/5 data-[state=active]:text-primary dark:data-[state=active]:border-primary dark:data-[state=active]:bg-primary/5 dark:data-[state=active]:text-primary"
                >
                  In Progress
                </TabsTrigger>
                <TabsTrigger
                  value="missed"
                  className="flex-1 data-[state=active]:border-primary data-[state=active]:bg-primary/5 data-[state=active]:text-primary dark:data-[state=active]:border-primary dark:data-[state=active]:bg-primary/5 dark:data-[state=active]:text-primary"
                >
                  {t('home.missedWorkouts')}
                </TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="flex items-center gap-2">
              {/* Yesterday button - primary outlined style */}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  const yesterday = new Date(today);
                  yesterday.setDate(yesterday.getDate() - 1);
                  setSelectedDate(yesterday);
                }}
                className="h-8 text-xs font-medium px-3 border-primary text-primary hover:bg-primary/5"
              >
                {t('home.yesterday')}
              </Button>
              {/* Date selector - styled like training page (text, not button) */}
              <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                <PopoverTrigger asChild>
                  <div className="flex items-center justify-center gap-2 cursor-pointer hover:bg-accent rounded-md px-2 py-1 transition-colors">
                    <Calendar className="size-4 text-muted-foreground" />
                    <span className="font-medium text-sm">{dateText}</span>
                  </div>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <CalendarComponent
                    mode="single"
                    selected={selectedDate}
                    onSelect={handleDateSelect}
                    captionLayout="dropdown"
                    fromYear={2020}
                    toYear={2030}
                    disabled={(date) => {
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      const d = new Date(date);
                      d.setHours(0, 0, 0, 0);
                      return d > today; // Disable future dates for history
                    }}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex-1 overflow-y-auto pr-1 -mr-1">
        {isLoading ? (
          <div className="h-40 flex items-center justify-center">
            {/* Loader styled like full-screen-loader */}
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
          </div>
        ) : workouts.length === 0 ? (
          <div className="h-60 flex flex-col items-center justify-center text-center text-muted-foreground">
            <p className="text-lg font-medium">No {workoutType.replace('_', ' ')} workouts found for {dateText}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {workouts.map((workout) => (
              <WorkoutCard
                key={`${workout.client_id}-${workout.workout_id}`}
                workout={workout}
                workoutType={workoutType}
                onClick={() => handleCardClick(workout)}
                className="cursor-pointer hover:border-primary/50 transition-all font-sans"
              />
            ))}
          </div>
        )}
      </div>

      {/* Dialogs */}
      {selectedWorkout && (
        <>
          <ClientTrainingDaySummary
            open={isSummaryDialogOpen}
            onOpenChange={setIsSummaryDialogOpen}
            workoutName={selectedWorkout.workoutName}
            athlete={{
              name: selectedWorkout.clientName,
              avatarUrl: selectedWorkout.clientAvatar
            }}
            workoutData={selectedWorkout.workoutData}
            stats={{
              exercisesCompleted: selectedWorkout.exercisesCompleted,
              exercisesTotal: selectedWorkout.exercisesTotal,
              duration: selectedWorkout.minutes,
              intensity: selectedWorkout.intensity,
              volume: selectedWorkout.volume,
              readiness: selectedWorkout.readiness,
              rating: selectedWorkout.rating
            }}
            completedSummary={
              selectedWorkout.status === 'completed' || selectedWorkout.status === 'in_progress' ?
                {
                  status: selectedWorkout.status,
                  totalDurationMin: selectedWorkout.minutes,
                  totalWeightLifted: selectedWorkout.volume,
                  // Add start/end times if available in data
                  startedAt: selectedWorkout.workoutData?.startedAt,
                  completedAt: selectedWorkout.workoutData?.completedAt
                } : undefined
            }
          />

          <WorkoutPreviewDialog
            open={isPreviewDialogOpen}
            onOpenChange={setIsPreviewDialogOpen}
            workoutData={selectedWorkout.workoutData}
          />
        </>
      )}
    </div>
  );
};
