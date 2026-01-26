import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, ScrollView, InteractionManager } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';

import { Dialog } from '@/components/ui/dialog';
import { PressableScale } from 'pressto';
import { useRouter, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import PagerView, { type PagerViewOnPageSelectedEvent } from 'react-native-pager-view';
import { Storage } from '@/lib/storage';
import {
  ChevronDown,
  ChevronLeft,
  Trash2,
  CircleX,
  CircleDashed,
  CircleCheck,
  Dumbbell,
} from 'lucide-react-native';
import { haptics } from '@/utils/haptics';
import { deleteWorkoutByKey } from '@/services/client/client-training-service';

import { typography, iconSizes } from '@/constants/typography';
import { useThemePreference, useTranslations, useClientDetailStore } from '@/stores';
import { IconButton } from '@/components/ui/icon-button';
import { PlatformIcon } from '@/components/ui/platform-icon';
import { SwipeableCalendar } from '@/components/features/calendar/swipeable-calendar';
import { formatDateDDMMYYYY, formatDateYYYYMMDD } from '@/lib/utils/date-formatters';
import { ScreenWrapper } from '@/components/ui/screen-wrapper';
import { FilledButton } from '@/components/ui/buttons';
import { Card } from '@/components/ui/card';
import { ExerciseListPreview } from '@/components/features/training/exercise-list-preview';
import type { TrainingCalendarItem } from '@/services/client/client-service';


// WorkoutDayPage component types
type WorkoutDayPageProps = {
  date: Date;
  workouts: TrainingCalendarItem[];
  isLoading: boolean;
  isFutureOrToday: boolean;
  isPast: boolean;
  onWorkoutPress: (workout: TrainingCalendarItem) => void;
  onDeleteWorkout: (workout: TrainingCalendarItem) => void;
  onAddWorkout: () => void;
  themeColors: any;
  t: (key: string) => string;
  renderStatusIcon: (status: string | undefined, isPast: boolean) => React.ReactNode;
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

  // First day of the month
  const firstOfMonth = new Date(year, month, 1);
  firstOfMonth.setHours(0, 0, 0, 0);

  // Last day of the month
  const lastOfMonth = new Date(year, month + 1, 0);
  lastOfMonth.setHours(0, 0, 0, 0);

  // Get Monday of the week containing the first day
  const startMonday = getMondayOfWeek(firstOfMonth);

  // Get Sunday of the week containing the last day
  const endSunday = getSundayOfWeek(lastOfMonth);

  // Generate all days from startMonday to endSunday
  let current = new Date(startMonday);
  while (current.getTime() <= endSunday.getTime()) {
    days.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }

  return days;
};

// Memoized component for each day's workout content - prevents re-renders when swiping
const WorkoutDayPage = React.memo(
  ({
    date,
    workouts,
    isLoading,
    isFutureOrToday,
    isPast,
    onWorkoutPress,
    onDeleteWorkout,
    onAddWorkout,
    themeColors,
    t,
    renderStatusIcon,
  }: WorkoutDayPageProps) => {
    if (isLoading) {
      return <WorkoutCardSkeleton themeColors={themeColors} />;
    }

    if (!workouts || workouts.length === 0) {
      return (
        <View style={pageStyles.emptyContainer}>
          <PlatformIcon sf="dumbbell" IconComponent={Dumbbell} size={48} color={themeColors.mutedText} />
          <Text style={[pageStyles.emptyTitle, { color: themeColors.text }]}>
            {t('clientDetail.training.noWorkouts')}
          </Text>
          <Text style={[pageStyles.emptyDescription, { color: themeColors.mutedText }]}>
            {t('clientDetail.training.noWorkoutsDescription')}
          </Text>
          {isFutureOrToday && (
            <FilledButton
              label={t('clientDetail.training.addWorkout')}
              onPress={onAddWorkout}
              style={pageStyles.addWorkoutButton}
            />
          )}
        </View>
      );
    }

    return (
      <ScrollView
        style={pageStyles.workoutList}
        contentContainerStyle={pageStyles.workoutListContent}
        showsVerticalScrollIndicator={false}
        keyboardDismissMode="on-drag"
      >
        {workouts.map((workout, index) => (
          <PressableScale key={workout.id || index} onPress={() => onWorkoutPress(workout)}>
            <Card style={pageStyles.workoutCard}>
              <View style={pageStyles.workoutHeader}>
                <View style={pageStyles.workoutHeaderLeft}>
                  <View style={pageStyles.statusIconContainer}>
                    {renderStatusIcon(workout.completedSummary?.status, isPast)}
                  </View>
                  <View style={pageStyles.workoutInfo}>
                    <Text style={[pageStyles.workoutName, { color: themeColors.text }]} numberOfLines={1}>
                      {workout.workout}
                    </Text>
                  </View>
                </View>
                <IconButton
                  icon={{ sf: 'trash', IconComponent: Trash2 }}
                  onPress={() => onDeleteWorkout(workout)}
                  size="sm"
                  color={themeColors.mutedText}
                  backgroundColor={themeColors.surfaceSecondary}
                />
              </View>
              {workout.totalExercises > 0 && (
                <>
                  <View style={[pageStyles.divider, { backgroundColor: themeColors.border }]} />
                  <View style={pageStyles.exerciseListContainer}>
                    <ExerciseListPreview
                      totalExercises={workout.totalExercises}
                      supersetFlags={workout.supersetFlags}
                      themeColors={themeColors}
                    />
                  </View>
                </>
              )}
            </Card>
          </PressableScale>
        ))}
        {isFutureOrToday && (
          <FilledButton
            label={t('clientDetail.training.addWorkout')}
            onPress={onAddWorkout}
            style={pageStyles.addWorkoutButtonInList}
          />
        )}
      </ScrollView>
    );
  }
);

// Styles for WorkoutDayPage
const pageStyles = StyleSheet.create({
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
    paddingBottom: 40,
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
  statusIconContainer: {
    width: 32,
    height: 32,
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
  addWorkoutButton: {
    marginTop: 24,
  },
  addWorkoutButtonInList: {
    marginTop: 8,
  },
});

// Skeleton for workout card content (used when loading day content)
type WorkoutCardSkeletonProps = {
  themeColors: any;
};

const WorkoutCardSkeleton = React.memo(({ themeColors }: WorkoutCardSkeletonProps) => {
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <View style={skeletonStyles.workoutCardContainer}>
      <Card style={skeletonStyles.workoutCard}>
        {/* Header: status icon + title */}
        <View style={skeletonStyles.cardHeader}>
          <Animated.View
            style={[
              skeletonStyles.statusIcon,
              { backgroundColor: themeColors.border },
              animatedStyle,
            ]}
          />
          <Animated.View
            style={[
              skeletonStyles.workoutTitle,
              { backgroundColor: themeColors.border },
              animatedStyle,
            ]}
          />
        </View>

        {/* Divider */}
        <View style={[skeletonStyles.divider, { backgroundColor: themeColors.border }]} />

        {/* Exercise rows */}
        <View style={skeletonStyles.exerciseList}>
          {Array.from({ length: 5 }).map((_, index) => (
            <View key={index} style={skeletonStyles.exerciseRow}>
              <Animated.View
                style={[
                  skeletonStyles.exerciseNumber,
                  { backgroundColor: themeColors.border },
                  animatedStyle,
                ]}
              />
              <Animated.View
                style={[
                  skeletonStyles.exerciseName,
                  { backgroundColor: themeColors.border, width: `${50 + (index % 3) * 15}%` },
                  animatedStyle,
                ]}
              />
            </View>
          ))}
        </View>
      </Card>
    </View>
  );
});

// Full training skeleton (calendar + workout card)
type TrainingSkeletonProps = {
  themeColors: any;
};

const TrainingSkeleton = React.memo(({ themeColors }: TrainingSkeletonProps) => {
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <View style={skeletonStyles.container}>
      {/* Calendar skeleton - single card bar */}
      <View style={skeletonStyles.calendarRow}>
        <Card style={skeletonStyles.calendarCard} />
      </View>

      {/* Workout card skeleton */}
      <View style={skeletonStyles.workoutCardContainer}>
        <Card style={skeletonStyles.workoutCard}>
          {/* Header: status icon + title */}
          <View style={skeletonStyles.cardHeader}>
            <Animated.View
              style={[
                skeletonStyles.statusIcon,
                { backgroundColor: themeColors.border },
                animatedStyle,
              ]}
            />
            <Animated.View
              style={[
                skeletonStyles.workoutTitle,
                { backgroundColor: themeColors.border },
                animatedStyle,
              ]}
            />
          </View>

          {/* Divider */}
          <View style={[skeletonStyles.divider, { backgroundColor: themeColors.border }]} />

          {/* Exercise rows */}
          <View style={skeletonStyles.exerciseList}>
            {Array.from({ length: 5 }).map((_, index) => (
              <View key={index} style={skeletonStyles.exerciseRow}>
                <Animated.View
                  style={[
                    skeletonStyles.exerciseNumber,
                    { backgroundColor: themeColors.border },
                    animatedStyle,
                  ]}
                />
                <Animated.View
                  style={[
                    skeletonStyles.exerciseName,
                    { backgroundColor: themeColors.border, width: `${50 + (index % 3) * 15}%` },
                    animatedStyle,
                  ]}
                />
              </View>
            ))}
          </View>
        </Card>
      </View>
    </View>
  );
});

const skeletonStyles = StyleSheet.create({
  container: {
    flex: 1,
  },
  calendarRow: {
    paddingHorizontal: 16,
    marginTop: 4,
    height: 90,
    justifyContent: 'center',
  },
  calendarCard: {
    width: '100%',
    height: 76,
    marginBottom: 0,
  },
  workoutCardContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  workoutCard: {
    paddingHorizontal: 0,
    paddingVertical: 0,
    marginBottom: 0,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  statusIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  workoutTitle: {
    flex: 1,
    height: 20,
    borderRadius: 4,
    maxWidth: '50%',
  },
  divider: {
    height: 1,
    opacity: 0.3,
  },
  exerciseList: {
    padding: 16,
    gap: 12,
  },
  exerciseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  exerciseNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  exerciseName: {
    height: 16,
    borderRadius: 4,
  },
});

const SELECTED_DATE_KEY = '@select_date_modal_selected_date_client';

export default function ClientTrainingScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors: themeColors } = useThemePreference();
  const { t } = useTranslations();
  const iconColor = themeColors.text;

  // Get training calendar from store
  const trainingCalendar = useClientDetailStore((state) => state.trainingCalendar);
  const isLoadingTraining = useClientDetailStore((state) => state.isLoadingTraining);
  const clientId = useClientDetailStore((state) => state.clientId);
  const coachId = useClientDetailStore((state) => state.coachId);
  const loadClientData = useClientDetailStore((state) => state.loadClientData);

  // Get refreshSection for use after mutations (e.g., after deleting a workout)
  const refreshSection = useClientDetailStore((state) => state.refreshSection);
  const fetchTrainingDataForMonth = useClientDetailStore((state) => state.fetchTrainingDataForDate);

  // Pager ref
  const pagerRef = useRef<PagerView>(null);

  // Timestamp of last programmatic navigation
  const lastProgrammaticNavTimestamp = useRef<number>(0);
  const PROGRAMMATIC_NAV_IGNORE_DURATION = 500;

  // Load client data if not already loaded
  useEffect(() => {
    if (id && !clientId) {
      loadClientData(id);
    }
  }, [id, clientId, loadClientData]);

  // Loading state - defer heavy components until after navigation
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const handle = InteractionManager.runAfterInteractions(() => {
      setTimeout(() => {
        requestAnimationFrame(() => {
          setIsReady(true);
        });
      }, 50);
    });
    return () => {
      handle.cancel();
    };
  }, []);

  // Selected date - source of truth for which month to display
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  });

  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [workoutToDelete, setWorkoutToDelete] = useState<TrainingCalendarItem | null>(null);

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

  // Fetch training data for current month when it changes
  useEffect(() => {
    if (clientId && coachId) {
      // Calculate the date range for this month (with buffer for partial weeks)
      const firstOfMonth = new Date(currentYear, currentMonth, 1);
      const midMonth = new Date(currentYear, currentMonth, 15);
      fetchTrainingDataForMonth(midMonth);
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
    }, [])
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

  const handleBackPress = useCallback(() => {
    router.back();
  }, [router]);

  const handleWorkoutPress = useCallback((workout: any) => {
    if (!selectedDate || !id || !coachId) return;

    router.push({
      pathname: '/library/workout/[id]',
      params: {
        id: workout.id,
        name: workout.workout,
        description: workout.description || '',
        type: workout.type || '',
        difficulty: workout.difficulty || 'all_levels',
        clientId: id,
        clientWorkoutDate: formatDateYYYYMMDD(selectedDate),
        coachId: coachId,
      },
    });
  }, [selectedDate, id, coachId, router]);

  const handleAddWorkout = useCallback(() => {
    if (!selectedDate) return;
    router.push({
      pathname: '/modals/client/add-workout-to-day-modal',
      params: {
        clientId: id,
        date: formatDateYYYYMMDD(selectedDate),
      },
    });
  }, [selectedDate, id, router]);

  // Delete workout mutation
  const deleteMutation = useMutation({
    mutationFn: (workout: TrainingCalendarItem) => {
      if (!selectedDate || !coachId || !id) {
        throw new Error('Missing required data for delete');
      }
      return deleteWorkoutByKey({
        clientId: id,
        coachId,
        sourceDate: formatDateYYYYMMDD(selectedDate),
        workoutId: workout.id,
      });
    },
    onSuccess: () => {
      haptics.success();
      refreshSection('training');
    },
    onError: () => {
      haptics.error();
      setShowErrorDialog(true);
    },
  });

  const handleDeleteWorkout = useCallback((workout: TrainingCalendarItem) => {
    setWorkoutToDelete(workout);
    setShowDeleteDialog(true);
  }, []);

  const confirmDeleteWorkout = useCallback(() => {
    if (workoutToDelete) {
      setShowDeleteDialog(false);
      deleteMutation.mutate(workoutToDelete);
      setWorkoutToDelete(null);
    }
  }, [workoutToDelete, deleteMutation]);

  // Render status icon based on workout status
  const renderStatusIcon = useCallback((status: string | undefined, isPast: boolean) => {
    switch (status) {
      case 'completed':
        return <CircleCheck {...({ size: 20, color: '#22C55E' } as any)} />;
      case 'in_progress':
        return <CircleDashed {...({ size: 20, color: '#F59E0B' } as any)} />;
      default: {
        // Use red for not_started on past dates, muted otherwise
        const notStartedColor = isPast ? '#E85C4A' : themeColors.mutedText;
        return <CircleX {...({ size: 20, color: notStartedColor } as any)} />;
      }
    }
  }, [themeColors.mutedText]);

  // Pre-calculate today's timestamp
  const todayTimestamp = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today.getTime();
  }, []);

  // Key for pager - changes when month changes to rebuild
  const pagerKey = `${currentYear}-${currentMonth}`;

  return (
    <ScreenWrapper scrollable={false} useImageBackground={false}>
      <View style={[styles.header, { backgroundColor: themeColors.backgroundPrimary }]}>
        <IconButton
          icon={{ sf: 'arrow.left', IconComponent: ChevronLeft }}
          onPress={handleBackPress}
          size="md"
          color={iconColor}
        />
        <PressableScale style={styles.dateButton} onPress={handleOpenDatePicker}>
          <Text style={[styles.dateButtonText, { color: themeColors.text }]}>{displayText}</Text>
          <PlatformIcon
            sf="chevron.down"
            IconComponent={ChevronDown}
            size={iconSizes.navigationChevrons}
            color={themeColors.text}
          />
        </PressableScale>
        <View style={styles.headerSpacer} />
      </View>

      {/* Content - rendered after navigation completes */}
      {isReady ? (
        <>
          {/* Calendar */}
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
                    id: key,
                    templateId: w.id,
                  }))
                : [];
              const isFutureOrToday = date.getTime() >= todayTimestamp;
              const isPast = date.getTime() < todayTimestamp;
              const isCurrentPageLoading = isLoadingTraining && selectedDate.getTime() === date.getTime();

              return (
                <View key={`day-${dateKey}`} style={styles.pageContainer} collapsable={false}>
                  <WorkoutDayPage
                    date={date}
                    workouts={dayWorkouts}
                    isLoading={isCurrentPageLoading}
                    isFutureOrToday={isFutureOrToday}
                    isPast={isPast}
                    onWorkoutPress={handleWorkoutPress}
                    onDeleteWorkout={handleDeleteWorkout}
                    onAddWorkout={handleAddWorkout}
                    themeColors={themeColors}
                    t={t}
                    renderStatusIcon={renderStatusIcon}
                  />
                </View>
              );
            })}
          </PagerView>
        </>
      ) : (
        <TrainingSkeleton themeColors={themeColors} />
      )}

      <Dialog
        visible={showErrorDialog}
        onClose={() => setShowErrorDialog(false)}
        title={t('general.error')}
        message={t('general.errorDeleting')}
        showCloseIcon={false}
        buttons={[
          {
            label: t('general.ok'),
            onPress: () => setShowErrorDialog(false),
            variant: 'primary',
          },
        ]}
      />

      <Dialog
        visible={showDeleteDialog}
        onClose={() => {
          setShowDeleteDialog(false);
          setWorkoutToDelete(null);
        }}
        title={t('general.delete')}
        message={`${t('general.deleteConfirmation')} "${workoutToDelete?.workout || ''}"?`}
        buttons={[
          {
            label: t('general.cancel'),
            onPress: () => {
              setShowDeleteDialog(false);
              setWorkoutToDelete(null);
            },
            variant: 'secondary',
          },
          {
            label: t('general.delete'),
            onPress: confirmDeleteWorkout,
            variant: 'destructive',
          },
        ]}
      />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 4,
    paddingBottom: 8,
    paddingHorizontal: 16,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  dateButtonText: {
    ...typography.h5,
    textAlign: 'center',
  },
  headerBottomRow: {
    width: '100%',
    alignSelf: 'stretch',
  },
  pagerContainer: {
    flex: 1,
  },
  pageContainer: {
    flex: 1,
  },
  headerSpacer: {
    width: 44,
  },
});
