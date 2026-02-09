'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, Loader2 } from 'lucide-react';
import { cn } from '@/lib/general/utils';
import { WorkoutCard } from './workout-card';
import { useCoachHomeData, EnrichedWorkout } from '@/hooks/use-coach-home-data';
import { getClientWorkoutInstance } from '@/api/client/client-training-service';
import { ClientTrainingDaySummary } from '@/app/(app)/athletes/[clientId]/training/client-training-day-summary';
import { WorkoutPreviewDialog } from '@/app/(app)/athletes/[clientId]/training/workout-preview-dialog';
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
  const [workoutData, setWorkoutData] = useState<any>(null);
  const [isLoadingWorkout, setIsLoadingWorkout] = useState(false);
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

  const handleYesterdayClick = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    setSelectedDate(yesterday);
  };

  const dateText = useMemo(() => {
    if (!selectedDate) return null;
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[selectedDate.getMonth()];
    const day = selectedDate.getDate();
    const year = selectedDate.getFullYear().toString().slice(-2);
    return `${day} ${month}, 20${year}`;
  }, [selectedDate]);

  const handleCardClick = async (workout: EnrichedWorkout) => {
    setSelectedWorkout(workout);

    // Check if workout_data is already embedded in the history item
    if (workout.workout_data) {
      setWorkoutData(workout.workout_data);
      if (workoutType === 'missed') {
        setIsPreviewDialogOpen(true);
      } else {
        setIsSummaryDialogOpen(true);
      }
      return;
    }

    // Fallback: fetch workout instance if not embedded
    setIsLoadingWorkout(true);
    try {
      const dateStr = selectedDate.toISOString().split('T')[0];
      const instance = await getClientWorkoutInstance(
        workout.client_id,
        workout.coach_id,
        dateStr,
        workout.workout_id
      );
      setWorkoutData(instance);

      if (workoutType === 'missed') {
        setIsPreviewDialogOpen(true);
      } else {
        setIsSummaryDialogOpen(true);
      }
    } catch (err) {
      console.error('Failed to fetch workout instance:', err);
      toast.error('Failed to load workout details');
    } finally {
      setIsLoadingWorkout(false);
    }
  };

  // Calculate stats from workout data
  // Structure: data.workout_data.{pre, post, items, completedSummary}
  const calculateStats = (data: any) => {
    const wd = data?.workout_data || {};
    const items = wd.items || [];
    const pre = wd.pre || {};
    const post = wd.post || {};
    const completedSummary = wd.completedSummary || {};

    let totalExercises = 0;
    let completedExercises = 0;

    const processItems = (itemsList: any[]) => {
      for (const i of itemsList) {
        if (i.itemType === 'exercise') {
          totalExercises++;
          const sets = i.data?.sets || [];
          if (sets.length > 0 && sets.every((s: any) => s.completed)) {
            completedExercises++;
          }
        } else if (i.itemType === 'section') {
          const sectionExercises = i.data?.exercises || [];
          sectionExercises.forEach((group: any) => {
            if (group.exercises) {
              // Superset with nested exercises
              group.exercises.forEach((ex: any) => {
                totalExercises++;
                const sets = ex.sets || [];
                if (sets.length > 0 && sets.every((s: any) => s.completed)) {
                  completedExercises++;
                }
              });
            } else if (group.prescribedExerciseId || group.performedExerciseId) {
              // AMRAP-style section with direct exercise objects
              totalExercises++;
              if (group.completed) {
                completedExercises++;
              }
            }
          });
        }
      }
    };
    processItems(items);

    return {
      exercisesCompleted: completedExercises,
      exercisesTotal: totalExercises || data?.total_exercises || 0,
      duration: completedSummary.totalDurationMin || 0,
      intensity: post.intensity || 0,
      volume: completedSummary.totalWeightLifted || 0,
      readiness: (() => {
        const values = [pre.sleep, pre.mood, pre.energy, pre.stress, pre.soreness].filter((v): v is number => v !== null && v !== undefined);
        return values.length > 0 ? Math.round(values.reduce((a, b) => a + b, 0) / values.length * 2) : 0; // Scale 1-5 to 1-10
      })(),
      rating: post.rating || 0,
    };
  };

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Top Nav Card with border */}
      <Card className="flex-shrink-0 bg-muted/40 backdrop-blur-sm border-border/50 shadow-sm">
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
                onClick={handleYesterdayClick}
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
                isLoading={isLoadingWorkout && selectedWorkout?.workout_id === workout.workout_id}
                className="cursor-pointer hover:border-primary/50 transition-all font-sans"
              />
            ))}
          </div>
        )}
      </div>

      {/* Dialogs */}
      {selectedWorkout && workoutData && isSummaryDialogOpen && (
        <ClientTrainingDaySummary
          open={isSummaryDialogOpen}
          onOpenChange={setIsSummaryDialogOpen}
          workoutName={workoutData?.name || 'Untitled Workout'}
          clientId={selectedWorkout.client_id}
          athlete={{
            name: selectedWorkout.clientName,
            avatarUrl: selectedWorkout.clientAvatar
          }}
          workoutData={workoutData}
          stats={calculateStats(workoutData)}
          completedSummary={
            selectedWorkout.status === 'completed' || selectedWorkout.status === 'in_progress' ?
              {
                status: selectedWorkout.status,
                totalDurationMin: workoutData?.workout_data?.completedSummary?.totalDurationMin || calculateStats(workoutData).duration,
                totalWeightLifted: workoutData?.workout_data?.completedSummary?.totalWeightLifted || calculateStats(workoutData).volume,
                startedAt: workoutData?.workout_data?.completedSummary?.startedAt,
                completedAt: workoutData?.workout_data?.completedSummary?.completedAt
              } : undefined
          }
        />
      )}

      {selectedWorkout && workoutData && isPreviewDialogOpen && (
        <WorkoutPreviewDialog
          open={isPreviewDialogOpen}
          onOpenChange={setIsPreviewDialogOpen}
          workoutData={workoutData}
        />
      )}
    </div>
  );
};
