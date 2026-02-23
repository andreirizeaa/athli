import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, ScrollView, ActivityIndicator } from 'react-native';
import { PressableScale } from 'pressto';
import { useRouter, useFocusEffect } from 'expo-router';
import { Storage } from '@/lib/storage';
import { ChevronDown, X, Ellipsis, Check, Dumbbell } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import PagerView, { type PagerViewOnPageSelectedEvent } from 'react-native-pager-view';

import { haptics } from '@/utils/haptics';
import { typography, iconSizes } from '@/constants/typography';
import { useThemePreference } from '@/stores';
import { useTranslations } from '@/stores';
import { useClientProfileStore } from '@/stores';
import { PlatformIcon } from '@/components/ui/platform-icon';
import { SwipeableCalendar } from '@/components/features/calendar/swipeable-calendar';
import { formatDateDDMMYYYY, formatDateYYYYMMDD } from '@/lib/utils/date-formatters';
import { ScreenWrapper } from '@/components/ui/screen-wrapper';
import { Card } from '@/components/ui/card';
import { ExerciseListPreview, ExercisePreviewItem } from '@/components/features/training/exercise-list-preview';
import { getTrainingCalendarRange, TrainingCalendarSchema } from '@/services/client/client-service';
import { FilledButton } from '@/components/ui/buttons/filled-button';
import { useWorkoutTimer } from '@/hooks/useWorkoutTimer';
import { WorkoutMeta, WorkoutItem } from '@athli/shared-types';

const SELECTED_DATE_KEY = '@select_date_modal_selected_date';

// Timer display component for in-progress workouts
type WorkoutTimerProps = {
  completedSummary: WorkoutMeta;
  color: string;
};

const WorkoutTimer = ({ completedSummary, color }: WorkoutTimerProps) => {
  const { formattedTime } = useWorkoutTimer(completedSummary);
  return (
    <View style={[timerStyles.container, { borderColor: color }]}>
      <Text style={[timerStyles.timer, { color }]}>{formattedTime}</Text>
    </View>
  );
};

const timerStyles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  timer: {
    ...typography.p3,
    fontVariant: ['tabular-nums'],
  },
});

// WorkoutDayPage component types
type WorkoutDayPageProps = {
  workouts: any[];
  isLoading: boolean;
  onWorkoutButtonPress: (workout: any) => void;
  themeColors: any;
  t: (key: string) => string;
  renderStatusIcon: (status: string | undefined, isPast: boolean) => React.ReactNode;
  paddingBottom: number;
  isToday: boolean;
  isPast: boolean;
};

// Get Monday of the week containing the given date
const getMondayOfWeek = (date: Date): Date => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
};

// Get Sunday of the week containing the given date
const getSundayOfWeek = (date: Date): Date => {
  const monday = getMondayOfWeek(date);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return sunday;
};

// Generate days array for a specific month (including partial weeks at edges)
const generateMonthDays = (year: number, month: number): Date[] => {
  const days: Date[] = [];

  const firstOfMonth = new Date(year, month, 1);
  firstOfMonth.setHours(0, 0, 0, 0);

  const lastOfMonth = new Date(year, month + 1, 0);
  lastOfMonth.setHours(0, 0, 0, 0);

  const startMonday = getMondayOfWeek(firstOfMonth);
  const endSunday = getSundayOfWeek(lastOfMonth);

  let current = new Date(startMonday);
  while (current.getTime() <= endSunday.getTime()) {
    days.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }

  return days;
};

// Helper to get button label based on workout status and date
const getWorkoutButtonLabel = (status: string | undefined, isPast: boolean, t: (key: string) => string): string => {
  switch (status) {
    case 'completed':
      return t('training.athlete.reviewWorkout');
    case 'in_progress':
      return t('training.athlete.resumeWorkout');
    default:
      // For past missed workouts, show "View Workout" instead of "Start Workout"
      return isPast ? t('training.athlete.viewWorkout') : t('training.athlete.startWorkout');
  }
};

// Helper to extract exercise preview items from workout data
const extractExercisePreviewItems = (workoutData: { items?: WorkoutItem[] } | undefined): ExercisePreviewItem[] => {
  if (!workoutData?.items) return [];

  const result: ExercisePreviewItem[] = [];

  // Helper to add exercises with superset linking
  const addExercises = (exercises: { exerciseId: string; supersetId: string | null }[]) => {
    exercises.forEach((ex, index) => {
      const nextEx = index < exercises.length - 1 ? exercises[index + 1] : null;
      const isLinkedToNext = ex.supersetId !== null && nextEx !== null && ex.supersetId === nextEx.supersetId;
      result.push({
        type: 'exercise',
        exerciseId: ex.exerciseId,
        isLinkedToNext,
      });
    });
  };

  workoutData.items.forEach((item) => {
    if (item.itemType === 'exercise') {
      // Top-level exercise (no section)
      result.push({
        type: 'exercise',
        exerciseId: item.data.prescribedExerciseId,
        isLinkedToNext: false, // Will be recalculated if in superset
      });
    } else if (item.itemType === 'section') {
      const section = item.data;

      // Add section header
      result.push({
        type: 'section-header',
        sectionName: section.name || '',
        sectionType: section.type,
      });

      // Collect section exercises
      const sectionExercises: { exerciseId: string; supersetId: string | null }[] = [];

      if (section.type === 'regular' || section.type === 'auxiliary') {
        section.exercises.forEach((group) => {
          group.exercises.forEach((ex) => {
            sectionExercises.push({
              exerciseId: ex.prescribedExerciseId,
              supersetId: group.isSuperset && group.exercises.length > 1 ? (ex.supersetId || `group-${group.exercises[0].prescribedExerciseId}`) : null,
            });
          });
        });
      } else if (section.type === 'tabata' || section.type === 'hiit' || section.type === 'emom') {
        section.exercises.forEach((group) => {
          group.exercises.forEach((ex) => {
            sectionExercises.push({
              exerciseId: ex.prescribedExerciseId,
              supersetId: group.isSuperset && group.exercises.length > 1 ? (ex.supersetId || `group-${group.exercises[0].prescribedExerciseId}`) : null,
            });
          });
        });
      } else if (section.type === 'amrap') {
        section.exercises.forEach((ex) => {
          sectionExercises.push({
            exerciseId: ex.prescribedExerciseId,
            supersetId: null,
          });
        });
      } else if (section.type === 'circuits') {
        section.exercises.forEach((group) => {
          group.exercises.forEach((ex) => {
            sectionExercises.push({
              exerciseId: ex.prescribedExerciseId,
              supersetId: group.isSuperset && group.exercises.length > 1 ? (ex.supersetId || `group-${group.exercises[0].prescribedExerciseId}`) : null,
            });
          });
        });
      }

      // Add section exercises with proper superset linking
      addExercises(sectionExercises);
    }
  });

  return result;
};

// Memoized component for each day's workout content
const WorkoutDayPage = React.memo(
  ({ workouts, isLoading, onWorkoutButtonPress, themeColors, t, renderStatusIcon, paddingBottom, isToday, isPast }: WorkoutDayPageProps) => {
    if (isLoading) {
      return (
        <View style={pageStyles.loadingContainer}>
          <ActivityIndicator size="large" color={themeColors.primary} />
        </View>
      );
    }

    if (!workouts || workouts.length === 0) {
      return (
        <View style={pageStyles.emptyContainer}>
          <PlatformIcon sf="dumbbell" IconComponent={Dumbbell} size={48} color={themeColors.mutedText} />
          <Text style={[pageStyles.emptyTitle, { color: themeColors.text }]}>
            {t('training.athlete.noWorkouts')}
          </Text>
          <Text style={[pageStyles.emptyDescription, { color: themeColors.mutedText }]}>
            {t('training.athlete.noWorkoutsDescription')}
          </Text>
        </View>
      );
    }

    return (
      <ScrollView
        style={pageStyles.workoutList}
        contentContainerStyle={[pageStyles.workoutListContent, { paddingBottom }]}
        showsVerticalScrollIndicator={false}
      >
        {workouts.map((workout, index) => (
          <Card key={workout.id || index} style={pageStyles.workoutCard}>
              <View style={pageStyles.workoutHeader}>
                <View style={pageStyles.workoutHeaderLeft}>
                  {renderStatusIcon(workout.completedSummary?.status, isPast)}
                  <View style={pageStyles.workoutInfo}>
                    <Text style={[pageStyles.workoutName, { color: themeColors.text }]}>
                      {workout.workout}
                    </Text>
                  </View>
                </View>
                {workout.completedSummary?.status === 'in_progress' && workout.completedSummary && (
                  <WorkoutTimer
                    completedSummary={workout.completedSummary}
                    color={themeColors.mutedText}
                  />
                )}
              </View>
              {(isToday || isPast) && (
                <View style={pageStyles.buttonContainer}>
                  <FilledButton
                    label={getWorkoutButtonLabel(workout.completedSummary?.status, isPast, t)}
                    onPress={() => onWorkoutButtonPress(workout)}
                    style={pageStyles.workoutButton}
                    textStyle={pageStyles.workoutButtonText}
                  />
                </View>
              )}
              {workout.totalExercises > 0 && (
                <>
                  <View style={[pageStyles.divider, { backgroundColor: themeColors.border }]} />
                  <View style={pageStyles.exerciseListContainer}>
                    <ExerciseListPreview
                      exercises={extractExercisePreviewItems(workout.workout_data?.items ? workout.workout_data : workout)}
                      themeColors={themeColors}
                    />
                  </View>
                </>
              )}
            </Card>
        ))}
      </ScrollView>
    );
  }
);

// Styles for WorkoutDayPage
const pageStyles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingHorizontal: 32,
    paddingTop: 16,
    gap: 12,
  },
  emptyTitle: {
    ...typography.h6,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 8,
  },
  emptyDescription: {
    ...typography.p2,
    textAlign: 'center',
  },
  workoutList: {
    flex: 1,
  },
  workoutListContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 12,
  },
  workoutCard: {
    paddingHorizontal: 0,
    paddingVertical: 0,
    marginBottom: 0,
  },
  workoutHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  workoutHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  statusIconButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  workoutInfo: {
    flex: 1,
    gap: 2,
  },
  workoutName: {
    ...typography.h5,
    fontWeight: '600',
  },
  divider: {
    height: 1,
  },
  exerciseListContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 14,
  },
  buttonContainer: {
    paddingHorizontal: 16,
    paddingTop: 0,
    paddingBottom: 16,
  },
  workoutButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  workoutButtonText: {
    fontWeight: '700',
  },
});

export default function TrainingScreen() {
  const router = useRouter();
  const { colors: themeColors } = useThemePreference();
  const { t } = useTranslations();
  const insets = useSafeAreaInsets();

  // Get profile data from store
  const profile = useClientProfileStore((state) => state.profile);
  const clientId = profile?.client_id;
  const coachId = profile?.coach_id;

  // Training data state
  const [trainingCalendar, setTrainingCalendar] = useState<TrainingCalendarSchema>({});
  const [isLoadingTraining, setIsLoadingTraining] = useState(false);
  const [loadedTrainingRange, setLoadedTrainingRange] = useState<{
    startDate: string;
    endDate: string;
  } | null>(null);

  // Pager ref
  const pagerRef = useRef<PagerView>(null);

  // Track if initial mount to avoid refetching on first focus
  const hasInitiallyLoaded = useRef(false);

  // Timestamp of last programmatic navigation
  const lastProgrammaticNavTimestamp = useRef<number>(0);
  const PROGRAMMATIC_NAV_IGNORE_DURATION = 500;

  // Selected date - source of truth for which month to display
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  });

  // Current month/year derived from selected date
  const currentMonth = selectedDate.getMonth();
  const currentYear = selectedDate.getFullYear();

  // Generate days array for the current month (including partial weeks at edges)
  const daysArray = useMemo(() => {
    return generateMonthDays(currentYear, currentMonth);
  }, [currentYear, currentMonth]);

  // Find the index of the selected date in the days array
  const selectedDayIndex = useMemo(() => {
    const selectedTime = selectedDate.getTime();
    for (let i = 0; i < daysArray.length; i++) {
      if (daysArray[i].getTime() === selectedTime) {
        return i;
      }
    }
    // If not found, default to first day of month
    const firstOfMonth = new Date(currentYear, currentMonth, 1);
    firstOfMonth.setHours(0, 0, 0, 0);
    const firstOfMonthTime = firstOfMonth.getTime();
    for (let i = 0; i < daysArray.length; i++) {
      if (daysArray[i].getTime() === firstOfMonthTime) {
        return i;
      }
    }
    return 0;
  }, [selectedDate, daysArray, currentYear, currentMonth]);

  // Fetch training data for current month
  const fetchTrainingDataForMonth = useCallback(
    async (year: number, month: number, forceRefresh = false) => {
      if (!clientId || !coachId) return;

      // Calculate the date range for this month (with buffer for partial weeks)
      const firstOfMonth = new Date(year, month, 1);
      const lastOfMonth = new Date(year, month + 1, 0);
      const startDate = getMondayOfWeek(firstOfMonth);
      const endDate = getSundayOfWeek(lastOfMonth);

      const startDateStr = formatDateYYYYMMDD(startDate);
      const endDateStr = formatDateYYYYMMDD(endDate);

      // Check if already loaded (skip if force refresh)
      if (!forceRefresh && loadedTrainingRange) {
        if (startDateStr >= loadedTrainingRange.startDate && endDateStr <= loadedTrainingRange.endDate) {
          return; // Already loaded
        }
      }

      setIsLoadingTraining(true);
      try {
        const calendar = await getTrainingCalendarRange(clientId, coachId, startDateStr, endDateStr);

        setTrainingCalendar((prev) => (forceRefresh ? calendar : { ...prev, ...calendar }));
        setLoadedTrainingRange((prev) => {
          if (!prev || forceRefresh) {
            return { startDate: startDateStr, endDate: endDateStr };
          }
          return {
            startDate: startDateStr < prev.startDate ? startDateStr : prev.startDate,
            endDate: endDateStr > prev.endDate ? endDateStr : prev.endDate,
          };
        });
      } catch (error) {
        console.error('Failed to fetch training data:', error);
      } finally {
        setIsLoadingTraining(false);
      }
    },
    [clientId, coachId, loadedTrainingRange]
  );

  // Initial data load for current month
  useEffect(() => {
    if (clientId && coachId) {
      fetchTrainingDataForMonth(currentYear, currentMonth);
      hasInitiallyLoaded.current = true;
    }
  }, [clientId, coachId, currentYear, currentMonth, fetchTrainingDataForMonth]);

  const handleOpenDatePicker = useCallback(() => {
    const dateParam = selectedDate.toISOString();
    router.push({
      pathname: '/modals/calendar/select-date-modal',
      params: { selectedDate: dateParam, storageKey: SELECTED_DATE_KEY },
    });
  }, [selectedDate, router]);

  // Listen for when we return from the modal and check if date was updated
  useFocusEffect(
    useCallback(() => {
      const checkSelectedDate = () => {
        try {
          const storedDate = Storage.getItem(SELECTED_DATE_KEY);
          if (storedDate) {
            const date = new Date(storedDate);
            if (!isNaN(date.getTime())) {
              date.setHours(0, 0, 0, 0);
              setSelectedDate(date);
              Storage.removeItem(SELECTED_DATE_KEY);
            }
          }
        } catch (error) {
          console.error('Failed to read selected date:', error);
        }
      };
      checkSelectedDate();

      // Refetch training data on subsequent focuses (not initial mount)
      if (hasInitiallyLoaded.current && clientId && coachId) {
        const refetchData = async () => {
          const firstOfMonth = new Date(currentYear, currentMonth, 1);
          const lastOfMonth = new Date(currentYear, currentMonth + 1, 0);
          const startDate = getMondayOfWeek(firstOfMonth);
          const endDate = getSundayOfWeek(lastOfMonth);
          const startDateStr = formatDateYYYYMMDD(startDate);
          const endDateStr = formatDateYYYYMMDD(endDate);

          try {
            const calendar = await getTrainingCalendarRange(clientId, coachId, startDateStr, endDateStr);
            setTrainingCalendar(calendar);
            setLoadedTrainingRange({ startDate: startDateStr, endDate: endDateStr });
          } catch (error) {
            console.error('Failed to refetch training data:', error);
          }
        };
        refetchData();
      }
    }, [clientId, coachId, currentYear, currentMonth])
  );

  // Handle date selection from calendar
  const handleDateSelect = useCallback((date: Date) => {
    const newDate = new Date(date);
    newDate.setHours(0, 0, 0, 0);
    setSelectedDate(newDate);
  }, []);

  // Handle pager page selected
  const handlePageSelected = useCallback((event: PagerViewOnPageSelectedEvent) => {
    const pageIndex = event.nativeEvent.position;
    const pageDate = daysArray[pageIndex];

    if (!pageDate) return;

    // Ignore events from programmatic navigation
    const timeSinceLastProgrammaticNav = Date.now() - lastProgrammaticNavTimestamp.current;
    if (timeSinceLastProgrammaticNav < PROGRAMMATIC_NAV_IGNORE_DURATION) {
      return;
    }

    // User swiped - provide haptic feedback
    haptics.selection();

    // Update selected date
    setSelectedDate(pageDate);
  }, [daysArray]);

  // Sync pager when selected date changes
  useEffect(() => {
    if (pagerRef.current && daysArray.length > 0) {
      requestAnimationFrame(() => {
        lastProgrammaticNavTimestamp.current = Date.now();
        pagerRef.current?.setPageWithoutAnimation(selectedDayIndex);
      });
    }
  }, [selectedDayIndex, daysArray.length]);

  const handleCalendarSwipe = useCallback((month: number, year: number) => {
    // Calendar swipe is just for visual feedback, no action needed
    // User must tap a day or use the modal to change dates
  }, []);

  const displayText = useMemo(() => {
    const monthKeys = [
      'january',
      'february',
      'march',
      'april',
      'may',
      'june',
      'july',
      'august',
      'september',
      'october',
      'november',
      'december',
    ] as const;

    const monthName = t(`calendar.months.${monthKeys[currentMonth]}`);
    const yearShort = currentYear.toString().slice(-2);
    return `${monthName} ${yearShort}`;
  }, [currentMonth, currentYear, t]);

  // Compute workout status by date for calendar coloring
  const workoutStatusByDate = useMemo(() => {
    const statusMap: Record<string, 'all_not_started' | 'has_in_progress' | 'all_completed'> = {};

    Object.entries(trainingCalendar).forEach(([dateKey, workoutsObj]) => {
      if (!workoutsObj) return;
      const workouts = Object.values(workoutsObj);
      if (workouts.length === 0) return;

      const statuses = workouts.map((w: any) => w.completedSummary?.status);

      if (statuses.some((s) => s === 'in_progress')) {
        statusMap[dateKey] = 'has_in_progress';
      } else if (statuses.every((s) => s === 'completed')) {
        statusMap[dateKey] = 'all_completed';
      } else {
        statusMap[dateKey] = 'all_not_started';
      }
    });

    return statusMap;
  }, [trainingCalendar]);

  // Handler for workout button press (Start/Resume/Review/View)
  const handleWorkoutButtonPress = useCallback((workout: any, dateStr: string, isPast: boolean) => {
    if (!clientId || !coachId) return;

    const status = workout.completedSummary?.status;
    const workoutPayload = JSON.stringify(workout.workout_data || workout);

    if (status === 'completed') {
      router.push({
        pathname: '/modals/training/workout-review-modal',
        params: {
          workoutId: workout.instanceKey,
          date: dateStr,
          clientId,
          coachId,
          workoutPayload,
        },
      });
    } else if (isPast) {
      // Past missed workouts go to preview modal (same as coach view)
      router.push({
        pathname: '/modals/training/workout-preview-modal',
        params: {
          workoutId: workout.instanceKey,
          date: dateStr,
          clientId,
          coachId,
          workoutName: workout.workout,
          workoutPayload,
        },
      });
    } else {
      // Today's workouts go to session modal
      router.push({
        pathname: '/modals/training/workout-session-modal',
        params: {
          workoutId: workout.instanceKey,
          date: dateStr,
          clientId,
          coachId,
          workoutPayload,
        },
      });
    }
  }, [clientId, coachId, router]);

  // Render status icon based on workout status (styled like IconButton md with border)
  const renderStatusIcon = useCallback((status: string | undefined, isPast: boolean) => {
    const iconSize = 18;
    const getIconAndColor = () => {
      switch (status) {
        case 'completed':
          return { icon: <Check {...({ size: iconSize, strokeWidth: 2, color: '#22C55E' } as any)} />, borderColor: '#22C55E' };
        case 'in_progress':
          return { icon: <Ellipsis {...({ size: iconSize, strokeWidth: 2, color: '#F59E0B' } as any)} />, borderColor: '#F59E0B' };
        default: {
          // Use red for not_started on past dates, muted otherwise
          const notStartedColor = isPast ? '#E85C4A' : themeColors.mutedText;
          return { icon: <X {...({ size: iconSize, strokeWidth: 2, color: notStartedColor } as any)} />, borderColor: notStartedColor };
        }
      }
    };
    const { icon, borderColor } = getIconAndColor();
    return (
      <View style={[pageStyles.statusIconButton, { backgroundColor: themeColors.surfacePrimary, borderColor, borderWidth: 1.5 }]}>
        {icon}
      </View>
    );
  }, [themeColors.surfacePrimary, themeColors.mutedText]);

  // Key for pager - changes when month changes to rebuild
  const pagerKey = `${currentYear}-${currentMonth}`;

  return (
    <ScreenWrapper scrollable={false}>
      <View style={styles.container}>
        {/* Top row: Title on left, Date picker on right */}
        <View style={styles.headerTopRow}>
          <Text style={[styles.title, { color: themeColors.text }]}>{t('training.title')}</Text>
          <PressableScale style={styles.dateButton} onPress={handleOpenDatePicker}>
            <Text style={[styles.dateButtonText, { color: themeColors.text }]}>{displayText}</Text>
            <PlatformIcon
              sf="chevron.down"
              IconComponent={ChevronDown}
              size={iconSizes.navigationChevrons}
              color={themeColors.text}
            />
          </PressableScale>
        </View>
        {/* Bottom row: Swipeable Calendar */}
        <View style={styles.headerBottomRow}>
          <SwipeableCalendar
            selectedDate={selectedDate}
            onDateSelect={handleDateSelect}
            onSwipe={handleCalendarSwipe}
            workoutStatusByDate={workoutStatusByDate}
          />
        </View>

        {/* Day Content Pager */}
        <PagerView
          key={pagerKey}
          ref={pagerRef}
          style={styles.pagerContainer}
          initialPage={selectedDayIndex}
          onPageSelected={handlePageSelected}
          offscreenPageLimit={2}
        >
          {daysArray.map((date) => {
            const dateKey = formatDateDDMMYYYY(date);
            const workoutsObj = trainingCalendar[dateKey];
            const dayWorkouts = workoutsObj
              ? Object.entries(workoutsObj).map(([key, w]: [string, any]) => ({
                  ...w,
                  instanceKey: key,
                }))
              : [];
            const isCurrentPageLoading = isLoadingTraining && selectedDate.getTime() === date.getTime();

            // Check if this date is today or past
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const isToday = date.getTime() === today.getTime();
            const isPast = date.getTime() < today.getTime();

            return (
              <View key={`day-${dateKey}`} style={styles.pageContainer} collapsable={false}>
                <WorkoutDayPage
                  workouts={dayWorkouts}
                  isLoading={isCurrentPageLoading}
                  onWorkoutButtonPress={(workout) => handleWorkoutButtonPress(workout, formatDateYYYYMMDD(date), isPast)}
                  themeColors={themeColors}
                  t={t}
                  renderStatusIcon={renderStatusIcon}
                  paddingBottom={insets.bottom + 120}
                  isToday={isToday}
                  isPast={isPast}
                />
              </View>
            );
          })}
        </PagerView>
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 0,
    width: '100%',
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  headerBottomRow: {
    width: '100%',
    alignSelf: 'stretch',
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateButtonText: {
    ...typography.h4,
    textAlign: 'left',
  },
  title: {
    ...typography.h1,
    textAlign: 'left',
  },
  pagerContainer: {
    flex: 1,
  },
  pageContainer: {
    flex: 1,
  },
});
