import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, ScrollView, ActivityIndicator, InteractionManager } from 'react-native';

import { Dialog } from '@/components/ui/dialog';
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
import { ExerciseListPreview } from '@/components/features/training/exercise-list-preview';
import type { TrainingCalendarItem } from '@/services/client/client-service';


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

// Format date for display (e.g., "Mon, Jan 25")
const formatDateForPage = (date: Date): string => {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const dayName = days[date.getDay()];
  const monthName = months[date.getMonth()];
  const dayNum = date.getDate();
  return `${dayName}, ${monthName} ${dayNum}`;
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
    // Check if this date is today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const isToday = date.getTime() === today.getTime();
    const dateLabel = isToday ? 'Today' : formatDateForPage(date);

    if (isLoading) {
      return (
        <View style={pageStyles.loadingContainer}>
          <Text style={[pageStyles.dateHeader, { color: themeColors.text }]}>{dateLabel}</Text>
          <ActivityIndicator size="large" color={themeColors.primary} />
        </View>
      );
    }

    if (!workouts || workouts.length === 0) {
      return (
        <View style={pageStyles.emptyContainer}>
          <Text style={[pageStyles.dateHeader, { color: themeColors.text }]}>{dateLabel}</Text>
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
        <Text style={[pageStyles.dateHeader, { color: themeColors.text }]}>{dateLabel}</Text>
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
  dateHeader: {
    ...typography.h5,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 16,
  },
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
  divider: {
    height: 1,
    marginHorizontal: 16,
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

const SELECTED_DATE_KEY = '@select_date_modal_selected_date_client';

// Weeks configuration: 2 past + 1 current + 4 future = 7 weeks total
const WEEKS_BACK = 2;
const WEEKS_FORWARD = 4;

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

  // Pager ref
  const pagerRef = useRef<PagerView>(null);

  // Timestamp of last programmatic navigation - used to ignore onPageSelected events
  // that fire as a result of programmatic setPage calls
  const lastProgrammaticNavTimestamp = useRef<number>(0);

  // Refs for stable callback access (prevents callback recreation during swipes)
  const isDateInLoadedRangeRef = useRef<(date: Date) => boolean>(() => false);
  const extendTrainingRangeRef = useRef<(date: Date) => Promise<void>>(async () => {});
  const fetchTrainingDataForDateRef = useRef<(date: Date) => Promise<void>>(async () => {});

  // Keep refs in sync with latest values
  useEffect(() => {
    isDateInLoadedRangeRef.current = isDateInLoadedRange;
    extendTrainingRangeRef.current = extendTrainingRange;
    fetchTrainingDataForDateRef.current = fetchTrainingDataForDate;
  }, [isDateInLoadedRange, extendTrainingRange, fetchTrainingDataForDate]);

  // Load client data if not already loaded (training data is fetched as part of loadClientData)
  useEffect(() => {
    if (id && !clientId) {
      loadClientData(id);
    }
  }, [id, clientId, loadClientData]);

  // Loading state - defer heavy components until after navigation
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    console.log('[DEBUG] isReady useEffect - starting InteractionManager');
    const handle = InteractionManager.runAfterInteractions(() => {
      // Extra 50ms delay for smoother transition
      setTimeout(() => {
        requestAnimationFrame(() => {
          console.log('[DEBUG] isReady useEffect - setting isReady to TRUE');
          setIsReady(true);
        });
      }, 50);
    });
    return () => {
      console.log('[DEBUG] isReady useEffect - CLEANUP (component unmounting or effect re-running)');
      handle.cancel();
    };
  }, []);

  const [selectedDate, setSelectedDate] = useState<Date | null>(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  });
  const [currentMonth, setCurrentMonth] = useState<number>(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState<number>(new Date().getFullYear());
  const [calendarKey, setCalendarKey] = useState(0);
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [workoutToDelete, setWorkoutToDelete] = useState<TrainingCalendarItem | null>(null);

  // Debug: Log state changes
  useEffect(() => {
    console.log('[DEBUG] STATE CHANGED - isReady:', isReady, 'selectedDate:', selectedDate?.toDateString());
  }, [isReady, selectedDate]);

  // Helper: Get Monday of the week containing a date
  const getMondayOfWeek = useCallback((date: Date): Date => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday
    return new Date(d.setDate(diff));
  }, []);

  // Generate days array based on complete weeks (Mon-Sun)
  // 2 past weeks + current week + 4 future weeks = 7 weeks = 49 days
  const { daysArray, todayIndex } = useMemo(() => {
    const days: Date[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get Monday of current week
    const currentMonday = getMondayOfWeek(today);

    // Start from Monday of (WEEKS_BACK) weeks ago
    const startMonday = new Date(currentMonday);
    startMonday.setDate(currentMonday.getDate() - WEEKS_BACK * 7);

    // Total weeks = WEEKS_BACK + 1 (current) + WEEKS_FORWARD
    const totalWeeks = WEEKS_BACK + 1 + WEEKS_FORWARD;
    const totalDays = totalWeeks * 7;

    // Generate all days
    for (let i = 0; i < totalDays; i++) {
      const date = new Date(startMonday);
      date.setDate(startMonday.getDate() + i);
      date.setHours(0, 0, 0, 0);
      days.push(date);
    }

    // Find today's index in the array
    const todayTime = today.getTime();
    let foundTodayIndex = 0;
    for (let i = 0; i < days.length; i++) {
      if (days[i].getTime() === todayTime) {
        foundTodayIndex = i;
        break;
      }
    }

    return { daysArray: days, todayIndex: foundTodayIndex };
  }, [getMondayOfWeek]);

  // Calendar scroll boundaries (first and last day of the range)
  const { calendarMinDate, calendarMaxDate } = useMemo(() => {
    if (daysArray.length === 0) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return { calendarMinDate: today, calendarMaxDate: today };
    }
    return {
      calendarMinDate: daysArray[0],
      calendarMaxDate: daysArray[daysArray.length - 1],
    };
  }, [daysArray]);

  const initialDayIndex = todayIndex; // Today's index in the days array

  // Debug: Log on every render
  console.log('[DEBUG] RENDER - selectedDate:', selectedDate?.toDateString(),
    'initialDayIndex:', initialDayIndex,
    'todayIndex:', todayIndex,
    'timestamp:', lastProgrammaticNavTimestamp.current);

  // Helper: Find day index for a date in the daysArray
  const getDayIndexForDate = useCallback((date: Date): number => {
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);
    const targetTime = targetDate.getTime();

    // Find the index in daysArray
    for (let i = 0; i < daysArray.length; i++) {
      if (daysArray[i].getTime() === targetTime) {
        return i;
      }
    }

    // If not found, return the closest valid index
    if (daysArray.length === 0) return 0;
    
    const firstTime = daysArray[0].getTime();
    const lastTime = daysArray[daysArray.length - 1].getTime();
    
    if (targetTime < firstTime) return 0;
    if (targetTime > lastTime) return daysArray.length - 1;
    
    return todayIndex;
  }, [daysArray, todayIndex]);

  const handleOpenDatePicker = () => {
    const dateParam = selectedDate ? selectedDate.toISOString() : new Date().toISOString();
    router.push({
      pathname: '/modals/calendar/select-date-modal',
      params: { selectedDate: dateParam, storageKey: SELECTED_DATE_KEY },
    });
  };

  useFocusEffect(
    useCallback(() => {
      console.log('[DEBUG] useFocusEffect triggered');
      const checkSelectedDate = () => {
        try {
          const storedDate = Storage.getItem(SELECTED_DATE_KEY);
          console.log('[DEBUG] useFocusEffect - storedDate:', storedDate);
          if (storedDate) {
            const date = new Date(storedDate);
            if (!isNaN(date.getTime())) {
              date.setHours(0, 0, 0, 0);

              const dayIndex = getDayIndexForDate(date);
              console.log('[DEBUG] useFocusEffect - date:', date.toDateString(), 'dayIndex:', dayIndex);

              setSelectedDate(date);
              setCurrentMonth(date.getMonth());
              setCurrentYear(date.getFullYear());

              // WORKAROUND: PagerView resets to initialPage on re-render
              // Use requestAnimationFrame to set the page AFTER the re-render completes
              if (dayIndex >= 0 && dayIndex < daysArray.length) {
                requestAnimationFrame(() => {
                  console.log('[DEBUG] useFocusEffect - requestAnimationFrame, setting page to:', dayIndex);
                  lastProgrammaticNavTimestamp.current = Date.now();
                  pagerRef.current?.setPage(dayIndex);
                });
              }

              // Only fetch if date is outside the prefetched range
              if (!isDateInLoadedRangeRef.current(date)) {
                fetchTrainingDataForDateRef.current(date);
              }

              Storage.removeItem(SELECTED_DATE_KEY);
            }
          }
        } catch (error) {
          console.error('Failed to read selected date:', error);
        }
      };
      checkSelectedDate();
    }, [getDayIndexForDate, daysArray.length])
  );

  const handleDateSelect = useCallback((date: Date) => {
    const newDate = new Date(date);
    newDate.setHours(0, 0, 0, 0);

    const dayIndex = getDayIndexForDate(newDate);
    console.log('[DEBUG] handleDateSelect - date:', newDate.toDateString(), 'dayIndex:', dayIndex);

    // Update state first
    setSelectedDate(newDate);
    setCurrentMonth(newDate.getMonth());
    setCurrentYear(newDate.getFullYear());

    // WORKAROUND: PagerView resets to initialPage on re-render
    // Use requestAnimationFrame to set the page AFTER the re-render completes
    if (dayIndex >= 0 && dayIndex < daysArray.length) {
      requestAnimationFrame(() => {
        console.log('[DEBUG] handleDateSelect - requestAnimationFrame, setting page to:', dayIndex);
        lastProgrammaticNavTimestamp.current = Date.now();
        pagerRef.current?.setPage(dayIndex);
      });
    }

    // Only fetch if date is outside the prefetched range (daysArray covers 2 weeks back to 4 weeks forward)
    // daysArray already covers this range, so only fetch for dates outside it
    if (!isDateInLoadedRangeRef.current(newDate)) {
      fetchTrainingDataForDateRef.current(newDate);
    }
  }, [getDayIndexForDate, daysArray.length]);

  // How long to ignore onPageSelected events after programmatic navigation (ms)
  const PROGRAMMATIC_NAV_IGNORE_DURATION = 500;

  // Handle pager page selected (pager → calendar sync)
  const handlePageSelected = useCallback((event: PagerViewOnPageSelectedEvent) => {
    const pageIndex = event.nativeEvent.position;
    const pageDate = daysArray[pageIndex];
    const now = Date.now();
    const timeSinceLastProgrammaticNav = now - lastProgrammaticNavTimestamp.current;

    console.log('[DEBUG] handlePageSelected - pageIndex:', pageIndex,
      'pageDate:', pageDate?.toDateString(),
      'now:', now,
      'lastTimestamp:', lastProgrammaticNavTimestamp.current,
      'timeSince:', timeSinceLastProgrammaticNav,
      'willIgnore:', timeSinceLastProgrammaticNav < PROGRAMMATIC_NAV_IGNORE_DURATION);

    if (!pageDate) {
      console.log('[DEBUG] handlePageSelected - no pageDate, returning');
      return;
    }

    // Ignore events that fire within 500ms of a programmatic navigation
    // This handles calendar taps and modal date selection
    if (timeSinceLastProgrammaticNav < PROGRAMMATIC_NAV_IGNORE_DURATION) {
      console.log('[DEBUG] handlePageSelected - IGNORED (within 500ms window)');
      return;
    }

    // User swiped - provide haptic feedback and update state
    console.log('[DEBUG] handlePageSelected - PROCESSING as user swipe, updating to:', pageDate.toDateString());
    haptics.selection();

    setSelectedDate(pageDate);
    setCurrentMonth(pageDate.getMonth());
    setCurrentYear(pageDate.getFullYear());

    // WORKAROUND: PagerView resets to initialPage on re-render without firing onPageSelected
    // After state update causes re-render, force the pager back to the correct page
    // Use setPageWithoutAnimation to avoid triggering another onPageSelected event
    requestAnimationFrame(() => {
      console.log('[DEBUG] handlePageSelected - requestAnimationFrame, setting page back to:', pageIndex);
      pagerRef.current?.setPageWithoutAnimation(pageIndex);
    });

    // Check if near edge of loaded range for preloading (fire-and-forget)
    if (!isDateInLoadedRangeRef.current(pageDate)) {
      extendTrainingRangeRef.current(pageDate);
    }
  }, [daysArray]);

  const handleCalendarSwipe = useCallback((month: number, year: number) => {
    console.log('[DEBUG] handleCalendarSwipe - month:', month, 'year:', year);
    setCurrentMonth(month);
    setCurrentYear(year);

    // When swiping to a new month, check if middle of month is in range (fire-and-forget)
    const midMonthDate = new Date(year, month, 15);
    if (!isDateInLoadedRangeRef.current(midMonthDate)) {
      extendTrainingRangeRef.current(midMonthDate);
    }
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
    <ScreenWrapper scrollable={false} useImageBackground={false}>
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
              minDate={calendarMinDate}
              maxDate={calendarMaxDate}
            />
          </View>

          {/* Day Content Pager */}
          <PagerView
            ref={pagerRef}
            style={styles.pagerContainer}
            initialPage={initialDayIndex}
            onPageSelected={handlePageSelected}
            offscreenPageLimit={2}
          >
            {daysArray.map((date, index) => {
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
              const isCurrentPageLoading = isLoadingTraining && selectedDate?.getTime() === date.getTime();

              return (
                <View key={`day-${dateKey}`} style={styles.pageContainer} collapsable={false}>
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
                </View>
              );
            })}
          </PagerView>
        </>
      ) : (
        <View style={[styles.loadingContainer, { backgroundColor: themeColors.backgroundPrimary }]}>
          <ActivityIndicator size="large" color={primaryColor} />
        </View>
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
