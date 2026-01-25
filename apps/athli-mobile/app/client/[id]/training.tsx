import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, ScrollView, ActivityIndicator, Alert, InteractionManager } from 'react-native';
import { PressableOpacity, PressableScale } from 'pressto';
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
import type { TrainingCalendarItem } from '@/services/client/client-service';

// PagerPage component types - wrapper for each day in the PagerView
type PagerPageProps = {
  date: Date;
  dateKey: string;
  trainingCalendar: Record<string, any>;
  isLoadingTraining: boolean;
  selectedDate: Date | null;
  todayTimestamp: number;
  handleWorkoutPress: (workout: any) => void;
  handleDeleteWorkout: (workout: TrainingCalendarItem) => void;
  handleAddWorkout: () => void;
  themeColors: any;
  t: (key: string) => string;
  renderStatusIcon: (status: string | undefined) => React.ReactNode;
};

// Memoized wrapper for each page in the PagerView - prevents unnecessary recalculations
const PagerPage = React.memo(
  ({
    date,
    dateKey,
    trainingCalendar,
    isLoadingTraining,
    selectedDate,
    todayTimestamp,
    handleWorkoutPress,
    handleDeleteWorkout,
    handleAddWorkout,
    themeColors,
    t,
    renderStatusIcon,
  }: PagerPageProps) => {
    // Memoize workout data transformation
    const dayWorkouts = useMemo(() => {
      const workoutsObj = trainingCalendar[dateKey];
      if (!workoutsObj) return [];
      return Object.entries(workoutsObj).map(([key, w]: [string, any]) => ({
        ...w,
        id: key,
        templateId: w.id,
      }));
    }, [trainingCalendar, dateKey]);

    // Check if this page's date is today or in the future
    const isFutureOrToday = useMemo(() => {
      return date.getTime() >= todayTimestamp;
    }, [date, todayTimestamp]);

    // Only show loading indicator on the currently selected date
    const isCurrentPageLoading = useMemo(() => {
      return isLoadingTraining && selectedDate?.getTime() === date.getTime();
    }, [isLoadingTraining, selectedDate, date]);

    return (
      <WorkoutDayPage
        date={date}
        workouts={dayWorkouts}
        isLoading={isCurrentPageLoading}
        isFutureOrToday={isFutureOrToday}
        onWorkoutPress={handleWorkoutPress}
        onDeleteWorkout={handleDeleteWorkout}
        onAddWorkout={handleAddWorkout}
        themeColors={themeColors}
        t={t}
        renderStatusIcon={renderStatusIcon}
      />
    );
  },
  // Custom comparison function for React.memo
  (prevProps, nextProps) => {
    // Only re-render if these specific props change
    return (
      prevProps.dateKey === nextProps.dateKey &&
      prevProps.trainingCalendar === nextProps.trainingCalendar &&
      prevProps.isLoadingTraining === nextProps.isLoadingTraining &&
      prevProps.selectedDate === nextProps.selectedDate &&
      prevProps.themeColors === nextProps.themeColors
    );
  }
);

// Virtual wrapper that only renders content for pages within ±3 of current index
type VirtualPagerPageProps = PagerPageProps & {
  index: number;
  currentPageIndex: number;
};

const VirtualPagerPage = React.memo(
  ({ index, currentPageIndex, ...pagerPageProps }: VirtualPagerPageProps) => {
    // Only render content if within visible window (±3 pages)
    const isVisible = Math.abs(index - currentPageIndex) <= 3;

    if (!isVisible) {
      return <View style={styles.pageContainer} />;
    }

    return <PagerPage {...pagerPageProps} />;
  },
  (prevProps, nextProps) => {
    // Check visibility change first
    const prevVisible = Math.abs(prevProps.index - prevProps.currentPageIndex) <= 3;
    const nextVisible = Math.abs(nextProps.index - nextProps.currentPageIndex) <= 3;

    // If both not visible, no need to re-render
    if (!prevVisible && !nextVisible) {
      return true;
    }

    // If visibility changed, need to re-render
    if (prevVisible !== nextVisible) {
      return false;
    }

    // If visible, use standard comparison
    return (
      prevProps.dateKey === nextProps.dateKey &&
      prevProps.trainingCalendar === nextProps.trainingCalendar &&
      prevProps.isLoadingTraining === nextProps.isLoadingTraining &&
      prevProps.selectedDate === nextProps.selectedDate &&
      prevProps.themeColors === nextProps.themeColors &&
      prevProps.currentPageIndex === nextProps.currentPageIndex
    );
  }
);

// WorkoutDayPage component types
type WorkoutDayPageProps = {
  date: Date;
  workouts: TrainingCalendarItem[];
  isLoading: boolean;
  isFutureOrToday: boolean;
  onWorkoutPress: (workout: TrainingCalendarItem) => void;
  onDeleteWorkout: (workout: TrainingCalendarItem) => void;
  onAddWorkout: () => void;
  themeColors: any;
  t: (key: string) => string;
  renderStatusIcon: (status: string | undefined) => React.ReactNode;
};

// Memoized component for each day's workout content - prevents re-renders when swiping
const WorkoutDayPage = React.memo(
  ({
    date,
    workouts,
    isLoading,
    isFutureOrToday,
    onWorkoutPress,
    onDeleteWorkout,
    onAddWorkout,
    themeColors,
    t,
    renderStatusIcon,
  }: WorkoutDayPageProps) => {
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
                    {renderStatusIcon(workout.completedSummary?.status)}
                  </View>
                  <View style={pageStyles.workoutInfo}>
                    <Text style={[pageStyles.workoutName, { color: themeColors.text }]} numberOfLines={1}>
                      {workout.workout}
                    </Text>
                    <Text style={[pageStyles.exerciseCount, { color: themeColors.mutedText }]}>
                      {workout.totalExercises || 0}{' '}
                      {(workout.totalExercises || 0) === 1 ? t('library.exercise') : t('library.exercises')}
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
    paddingTop: 48,
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
    ...typography.p1,
    fontWeight: '600',
  },
  exerciseCount: {
    ...typography.p3,
  },
  addWorkoutButton: {
    marginTop: 24,
  },
  addWorkoutButtonInList: {
    marginTop: 8,
  },
});

const SELECTED_DATE_KEY = '@select_date_modal_selected_date_client';

// Days pager configuration
const DAYS_BACK = 365;
const DAYS_FORWARD = 365;

export default function ClientTrainingScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { primaryColor, colors: themeColors } = useThemePreference();
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
  const fetchTrainingDataForDate = useClientDetailStore((state) => state.fetchTrainingDataForDate);
  const extendTrainingRange = useClientDetailStore((state) => state.extendTrainingRange);
  const isDateInLoadedRange = useClientDetailStore((state) => state.isDateInLoadedRange);

  // Pager refs
  const pagerRef = useRef<PagerView>(null);
  const isProgrammaticChange = useRef(false);

  // Load client data if not already loaded (training data is fetched as part of loadClientData)
  useEffect(() => {
    if (id && !clientId) {
      loadClientData(id);
    }
  }, [id, clientId, loadClientData]);

  // Loading state - defer heavy components until after navigation
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const handle = InteractionManager.runAfterInteractions(() => {
      // Extra 50ms delay for smoother transition
      setTimeout(() => {
        requestAnimationFrame(() => {
          setIsReady(true);
        });
      }, 50);
    });
    return () => handle.cancel();
  }, []);

  const [selectedDate, setSelectedDate] = useState<Date | null>(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  });
  const [currentMonth, setCurrentMonth] = useState<number>(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState<number>(new Date().getFullYear());
  const [calendarKey, setCalendarKey] = useState(0);
  const [currentPageIndex, setCurrentPageIndex] = useState(DAYS_BACK); // Track for visibility-based rendering

  // Generate days array (centered on today)
  const daysArray = useMemo(() => {
    const days: Date[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = -DAYS_BACK; i <= DAYS_FORWARD; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      days.push(date);
    }
    return days;
  }, []);

  const initialDayIndex = DAYS_BACK; // Today's index

  // Helper: Find day index for a date
  const getDayIndexForDate = useCallback((date: Date): number => {
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);
    const targetTime = targetDate.getTime();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTime = today.getTime();
    const diffDays = Math.round((targetTime - todayTime) / (1000 * 60 * 60 * 24));
    return DAYS_BACK + diffDays;
  }, []);

  const handleOpenDatePicker = () => {
    const dateParam = selectedDate ? selectedDate.toISOString() : new Date().toISOString();
    router.push({
      pathname: '/modals/calendar/select-date-modal',
      params: { selectedDate: dateParam, storageKey: SELECTED_DATE_KEY },
    });
  };

  useFocusEffect(
    useCallback(() => {
      const checkSelectedDate = () => {
        try {
          const storedDate = Storage.getItem(SELECTED_DATE_KEY);
          if (storedDate) {
            const date = new Date(storedDate);
            if (!isNaN(date.getTime())) {
              date.setHours(0, 0, 0, 0);

              isProgrammaticChange.current = true;
              setSelectedDate(date);
              setCurrentMonth(date.getMonth());
              setCurrentYear(date.getFullYear());

              // Navigate pager to the selected day
              const dayIndex = getDayIndexForDate(date);
              if (dayIndex >= 0 && dayIndex < daysArray.length) {
                setCurrentPageIndex(dayIndex); // Track for visibility-based rendering
                pagerRef.current?.setPage(dayIndex);
              }

              // Always fetch data for the selected date
              fetchTrainingDataForDate(date);

              Storage.removeItem(SELECTED_DATE_KEY);
            }
          }
        } catch (error) {
          console.error('Failed to read selected date:', error);
        }
      };
      checkSelectedDate();
    }, [getDayIndexForDate, daysArray.length, fetchTrainingDataForDate])
  );

  const handleDateSelect = useCallback((date: Date) => {
    const newDate = new Date(date);
    newDate.setHours(0, 0, 0, 0);

    isProgrammaticChange.current = true;
    setSelectedDate(newDate);
    setCurrentMonth(newDate.getMonth());
    setCurrentYear(newDate.getFullYear());

    // Navigate pager to the selected day
    const dayIndex = getDayIndexForDate(newDate);
    if (dayIndex >= 0 && dayIndex < daysArray.length) {
      setCurrentPageIndex(dayIndex); // Track for visibility-based rendering
      pagerRef.current?.setPage(dayIndex);
    }

    // Fetch training data for the clicked date (fire-and-forget, don't block UI)
    fetchTrainingDataForDate(newDate);
  }, [getDayIndexForDate, daysArray.length, fetchTrainingDataForDate]);

  // Handle pager page selected (pager → calendar sync)
  const handlePageSelected = useCallback((event: PagerViewOnPageSelectedEvent) => {
    const pageIndex = event.nativeEvent.position;

    // Always update currentPageIndex for visibility-based rendering
    setCurrentPageIndex(pageIndex);

    // Skip rest if programmatic (calendar tap already handled it)
    if (isProgrammaticChange.current) {
      isProgrammaticChange.current = false;
      return;
    }

    // User swiped - provide haptic feedback
    haptics.selection();

    // Update selected date immediately (no await to avoid blocking UI)
    const newDate = daysArray[pageIndex];
    if (newDate) {
      setSelectedDate(newDate);
      setCurrentMonth(newDate.getMonth());
      setCurrentYear(newDate.getFullYear());

      // Check if near edge of loaded range for preloading (fire-and-forget)
      if (isDateInLoadedRange && !isDateInLoadedRange(newDate)) {
        extendTrainingRange(newDate);
      }
    }
  }, [daysArray, isDateInLoadedRange, extendTrainingRange]);

  const handleCalendarSwipe = useCallback((month: number, year: number) => {
    setCurrentMonth(month);
    setCurrentYear(year);

    // When swiping to a new month, check if middle of month is in range (fire-and-forget)
    const midMonthDate = new Date(year, month, 15);
    if (!isDateInLoadedRange(midMonthDate)) {
      extendTrainingRange(midMonthDate);
    }
  }, [isDateInLoadedRange, extendTrainingRange]);

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

    if (selectedDate) {
      const monthName = t(`calendar.months.${monthKeys[selectedDate.getMonth()]}`);
      const yearShort = selectedDate.getFullYear().toString().slice(-2);
      return `${monthName} ${yearShort}`;
    }

    const monthName = t(`calendar.months.${monthKeys[currentMonth]}`);
    const yearShort = currentYear.toString().slice(-2);
    return `${monthName} ${yearShort}`;
  }, [selectedDate, currentMonth, currentYear, t]);

  const handleBackPress = useCallback(() => {
    router.back();
  }, [router]);

  const handleWorkoutPress = useCallback((workout: any) => {
    if (!selectedDate || !id || !coachId) return;

    // Navigate to workout builder with client context
    // The workout builder will fetch the client workout instance directly
    // workout.id is the instance ID (e.g., "workout_1") unique to this client's training
    // workout.templateId is the original template ID from the coach's library
    router.push({
      pathname: '/library/workout/[id]',
      params: {
        id: workout.id, // Pass the instance ID, not the template ID
        name: workout.workout,
        description: workout.description || '',
        type: workout.type || '',
        difficulty: workout.difficulty || 'all_levels',
        // Pass client context for client-specific workout editing
        clientId: id,
        clientWorkoutDate: formatDateYYYYMMDD(selectedDate),
        coachId: coachId, // Pass coachId to ensure the workout screen can fetch data
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
    onError: (error: Error) => {
      haptics.error();
      Alert.alert(
        t('general.error'),
        error.message || t('general.errorDeleting'),
        [{ text: t('general.ok') }]
      );
    },
  });

  const handleDeleteWorkout = useCallback((workout: TrainingCalendarItem) => {
    Alert.alert(
      t('general.delete'),
      `${t('general.deleteConfirmation')} "${workout.workout}"?`,
      [
        { text: t('general.cancel'), style: 'cancel' },
        {
          text: t('general.delete'),
          style: 'destructive',
          onPress: () => deleteMutation.mutate(workout),
        },
      ]
    );
  }, [t, deleteMutation]);

  // Render status icon based on workout status - memoized to prevent re-renders
  const renderStatusIcon = useCallback((status: string | undefined) => {
    switch (status) {
      case 'completed':
        return (
          <CircleCheck
            size={20}
            color="#22C55E"
          />
        );
      case 'in_progress':
        return (
          <CircleDashed
            size={20}
            color="#F59E0B"
          />
        );
      default:
        return (
          <CircleX
            size={20}
            color={themeColors.mutedText}
          />
        );
    }
  }, [themeColors.mutedText]);

  // Pre-calculate today's timestamp once (stable across renders)
  const todayTimestamp = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today.getTime();
  }, []);

  return (
    <ScreenWrapper scrollable={false}>
      <View style={[styles.header, { backgroundColor: themeColors.backgroundPrimary }]}>
        <IconButton
          icon={{ sf: 'arrow.left', IconComponent: ChevronLeft }}
          onPress={handleBackPress}
          size="md"
          color={iconColor}
        />
        <PressableOpacity style={styles.dateButton} onPress={handleOpenDatePicker}>
          <Text style={[styles.dateButtonText, { color: themeColors.text }]}>{displayText}</Text>
          <PlatformIcon
            sf="chevron.down"
            IconComponent={ChevronDown}
            size={iconSizes.navigationChevrons}
            color={themeColors.text}
          />
        </PressableOpacity>
        <View style={styles.headerSpacer} />
      </View>

      {/* Content - rendered after navigation completes */}
      {isReady ? (
        <>
          {/* Calendar */}
          <View style={styles.headerBottomRow}>
            <SwipeableCalendar
              key={calendarKey}
              initialSelectedDate={selectedDate || undefined}
              onDateSelect={handleDateSelect}
              onSwipe={handleCalendarSwipe}
            />
          </View>

          <View style={styles.staticHeader}>
            <View
              style={[styles.divider, { backgroundColor: themeColors.mutedText, opacity: 0.3 }]}
            />
          </View>

          {/* Day Content Pager */}
          <PagerView
            ref={pagerRef}
            style={styles.pagerContainer}
            initialPage={initialDayIndex}
            onPageSelected={handlePageSelected}
            offscreenPageLimit={1}
          >
            {daysArray.map((date, index) => (
              <View key={`day-${index}`} style={styles.pageContainer}>
                <VirtualPagerPage
                  index={index}
                  currentPageIndex={currentPageIndex}
                  date={date}
                  dateKey={formatDateDDMMYYYY(date)}
                  trainingCalendar={trainingCalendar}
                  isLoadingTraining={isLoadingTraining}
                  selectedDate={selectedDate}
                  todayTimestamp={todayTimestamp}
                  handleWorkoutPress={handleWorkoutPress}
                  handleDeleteWorkout={handleDeleteWorkout}
                  handleAddWorkout={handleAddWorkout}
                  themeColors={themeColors}
                  t={t}
                  renderStatusIcon={renderStatusIcon}
                />
              </View>
            ))}
          </PagerView>
        </>
      ) : (
        <View style={[styles.loadingContainer, { backgroundColor: themeColors.backgroundPrimary }]}>
          <ActivityIndicator size="large" color={primaryColor} />
        </View>
      )}
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
  staticHeader: {
    width: '100%',
  },
  divider: {
    width: '100%',
    height: 0.5,
    alignSelf: 'stretch',
    marginTop: 0,
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
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
