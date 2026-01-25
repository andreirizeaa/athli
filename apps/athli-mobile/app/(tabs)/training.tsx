import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, ScrollView, ActivityIndicator } from 'react-native';
import { PressableOpacity, PressableScale } from 'pressto';
import { useRouter, useFocusEffect } from 'expo-router';
import PagerView, { type PagerViewOnPageSelectedEvent } from 'react-native-pager-view';
import { Storage } from '@/lib/storage';
import { ChevronDown, CircleX, CircleDashed, CircleCheck, Dumbbell } from 'lucide-react-native';
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
import { ExerciseListPreview } from '@/components/features/training/exercise-list-preview';
import { getTrainingCalendarRange, TrainingCalendarSchema } from '@/services/client/client-service';

const SELECTED_DATE_KEY = '@select_date_modal_selected_date';

// Weeks configuration: 2 past + 1 current + 4 future = 7 weeks total
const WEEKS_BACK = 2;
const WEEKS_FORWARD = 4;

// WorkoutDayPage component types
type WorkoutDayPageProps = {
  date: Date;
  workouts: any[];
  isLoading: boolean;
  onWorkoutPress: (workout: any) => void;
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

// Memoized component for each day's workout content
const WorkoutDayPage = React.memo(
  ({ date, workouts, isLoading, onWorkoutPress, themeColors, t, renderStatusIcon }: WorkoutDayPageProps) => {
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
});

export default function TrainingScreen() {
  const router = useRouter();
  const { colors: themeColors } = useThemePreference();
  const { t } = useTranslations();

  // Get profile data from store
  const profile = useClientProfileStore((state) => state.profile);
  const clientId = profile?.client_id;
  const coachId = profile?.coach_id;

  // Pager ref
  const pagerRef = useRef<PagerView>(null);

  // Timestamp of last programmatic navigation - used to ignore onPageSelected events
  // that fire as a result of programmatic setPage calls
  const lastProgrammaticNavTimestamp = useRef<number>(0);

  // Refs for stable callback access (declared here, initialized after functions are defined)
  const loadedTrainingRangeRef = useRef<{startDate: string; endDate: string} | null>(null);
  const isDateInLoadedRangeRef = useRef<(date: Date) => boolean>(() => false);
  const extendTrainingRangeRef = useRef<(date: Date) => Promise<void>>(async () => {});

  // Training data state
  const [trainingCalendar, setTrainingCalendar] = useState<TrainingCalendarSchema>({});
  const [isLoadingTraining, setIsLoadingTraining] = useState(false);
  const [loadedTrainingRange, setLoadedTrainingRange] = useState<{
    startDate: string;
    endDate: string;
  } | null>(null);

  const [selectedDate, setSelectedDate] = useState<Date | null>(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  });
  const [currentMonth, setCurrentMonth] = useState<number>(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState<number>(new Date().getFullYear());
  const [calendarKey] = useState(0);

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

  // Check if a date is within the loaded range
  const isDateInLoadedRange = useCallback(
    (date: Date): boolean => {
      if (!loadedTrainingRange) return false;
      const dateStr = formatDateYYYYMMDD(date);
      return dateStr >= loadedTrainingRange.startDate && dateStr <= loadedTrainingRange.endDate;
    },
    [loadedTrainingRange]
  );

  // Fetch training data for a specific date
  const fetchTrainingDataForDate = useCallback(
    async (date: Date) => {
      if (!clientId || !coachId) return;

      // If the date is already in range, no need to fetch
      if (isDateInLoadedRange(date)) return;

      setIsLoadingTraining(true);
      try {
        // Fetch a range around the date (1 month before and after)
        const startDate = new Date(date);
        startDate.setMonth(startDate.getMonth() - 1);
        const endDate = new Date(date);
        endDate.setMonth(endDate.getMonth() + 1);

        const startDateStr = formatDateYYYYMMDD(startDate);
        const endDateStr = formatDateYYYYMMDD(endDate);

        const calendar = await getTrainingCalendarRange(clientId, coachId, startDateStr, endDateStr);

        setTrainingCalendar((prev) => ({ ...prev, ...calendar }));
        setLoadedTrainingRange((prev) => {
          if (!prev) {
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
    [clientId, coachId, isDateInLoadedRange]
  );

  // Extend training range when swiping calendar
  const extendTrainingRange = useCallback(
    async (date: Date) => {
      if (!clientId || !coachId) return;

      setIsLoadingTraining(true);
      try {
        const startDate = new Date(date);
        startDate.setMonth(startDate.getMonth() - 1);
        const endDate = new Date(date);
        endDate.setMonth(endDate.getMonth() + 1);

        const startDateStr = formatDateYYYYMMDD(startDate);
        const endDateStr = formatDateYYYYMMDD(endDate);

        const calendar = await getTrainingCalendarRange(clientId, coachId, startDateStr, endDateStr);

        setTrainingCalendar((prev) => ({ ...prev, ...calendar }));
        setLoadedTrainingRange((prev) => {
          if (!prev) {
            return { startDate: startDateStr, endDate: endDateStr };
          }
          return {
            startDate: startDateStr < prev.startDate ? startDateStr : prev.startDate,
            endDate: endDateStr > prev.endDate ? endDateStr : prev.endDate,
          };
        });
      } catch (error) {
        console.error('Failed to extend training range:', error);
      } finally {
        setIsLoadingTraining(false);
      }
    },
    [clientId, coachId]
  );

  // Keep refs in sync with latest values (for stable callbacks)
  useEffect(() => {
    loadedTrainingRangeRef.current = loadedTrainingRange;
    isDateInLoadedRangeRef.current = isDateInLoadedRange;
    extendTrainingRangeRef.current = extendTrainingRange;
  }, [loadedTrainingRange, isDateInLoadedRange, extendTrainingRange]);

  // Initial data load - fetch 60-day window (30 days back, 30 days forward)
  useEffect(() => {
    if (clientId && coachId && !loadedTrainingRange) {
      const today = new Date();
      const startDate = new Date(today);
      startDate.setDate(today.getDate() - 30);
      const endDate = new Date(today);
      endDate.setDate(today.getDate() + 30);

      const startDateStr = formatDateYYYYMMDD(startDate);
      const endDateStr = formatDateYYYYMMDD(endDate);

      setIsLoadingTraining(true);
      getTrainingCalendarRange(clientId, coachId, startDateStr, endDateStr)
        .then((calendar) => {
          setTrainingCalendar(calendar);
          setLoadedTrainingRange({ startDate: startDateStr, endDate: endDateStr });
        })
        .catch((error) => {
          console.error('Failed to fetch initial training data:', error);
        })
        .finally(() => {
          setIsLoadingTraining(false);
        });
    }
  }, [clientId, coachId, loadedTrainingRange]);

  const handleOpenDatePicker = useCallback(() => {
    const dateParam = selectedDate ? selectedDate.toISOString() : new Date().toISOString();
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

              const dayIndex = getDayIndexForDate(date);

              setSelectedDate(date);
              setCurrentMonth(date.getMonth());
              setCurrentYear(date.getFullYear());

              // WORKAROUND: PagerView resets to initialPage on re-render
              // Use requestAnimationFrame to set the page AFTER the re-render completes
              if (dayIndex >= 0 && dayIndex < daysArray.length) {
                requestAnimationFrame(() => {
                  lastProgrammaticNavTimestamp.current = Date.now();
                  pagerRef.current?.setPage(dayIndex);
                });
              }

              // Fetch data for the selected date if needed
              if (!isDateInLoadedRangeRef.current(date)) {
                fetchTrainingDataForDate(date);
              }

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

    const dayIndex = getDayIndexForDate(newDate);

    // Update state first
    setSelectedDate(newDate);
    setCurrentMonth(newDate.getMonth());
    setCurrentYear(newDate.getFullYear());

    // WORKAROUND: PagerView resets to initialPage on re-render
    // Use requestAnimationFrame to set the page AFTER the re-render completes
    if (dayIndex >= 0 && dayIndex < daysArray.length) {
      requestAnimationFrame(() => {
        lastProgrammaticNavTimestamp.current = Date.now();
        pagerRef.current?.setPage(dayIndex);
      });
    }

    // Fetch training data if not in loaded range (fire-and-forget)
    if (!isDateInLoadedRangeRef.current(newDate)) {
      fetchTrainingDataForDate(newDate);
    }
  }, [getDayIndexForDate, daysArray.length, fetchTrainingDataForDate]);

  // Preload threshold for dynamic loading
  const PRELOAD_THRESHOLD = 7;

  // How long to ignore onPageSelected events after programmatic navigation (ms)
  const PROGRAMMATIC_NAV_IGNORE_DURATION = 500;

  // Handle pager page selected (pager → calendar sync)
  const handlePageSelected = useCallback((event: PagerViewOnPageSelectedEvent) => {
    const pageIndex = event.nativeEvent.position;
    const pageDate = daysArray[pageIndex];

    if (!pageDate) return;

    // Ignore events that fire within 500ms of a programmatic navigation
    // This handles calendar taps and modal date selection
    const timeSinceLastProgrammaticNav = Date.now() - lastProgrammaticNavTimestamp.current;
    if (timeSinceLastProgrammaticNav < PROGRAMMATIC_NAV_IGNORE_DURATION) {
      return;
    }

    // User swiped - provide haptic feedback and update state
    haptics.selection();

    setSelectedDate(pageDate);
    setCurrentMonth(pageDate.getMonth());
    setCurrentYear(pageDate.getFullYear());

    // WORKAROUND: PagerView resets to initialPage on re-render without firing onPageSelected
    // After state update causes re-render, force the pager back to the correct page
    // Use setPageWithoutAnimation to avoid triggering another onPageSelected event
    requestAnimationFrame(() => {
      pagerRef.current?.setPageWithoutAnimation(pageIndex);
    });

    // Check if near edge of loaded range for preloading (fire-and-forget)
    const currentLoadedRange = loadedTrainingRangeRef.current;
    if (currentLoadedRange) {
      const startBoundary = new Date(currentLoadedRange.startDate);
      const endBoundary = new Date(currentLoadedRange.endDate);

      const daysToStart = Math.round(
        (pageDate.getTime() - startBoundary.getTime()) / (1000 * 60 * 60 * 24)
      );
      const daysToEnd = Math.round(
        (endBoundary.getTime() - pageDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysToStart < PRELOAD_THRESHOLD || daysToEnd < PRELOAD_THRESHOLD) {
        extendTrainingRangeRef.current(pageDate);
      }
    } else if (!isDateInLoadedRangeRef.current(pageDate)) {
      extendTrainingRangeRef.current(pageDate);
    }
  }, [daysArray]);

  const handleCalendarSwipe = useCallback((month: number, year: number) => {
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

  // Dummy handler for workout press - will navigate to workout execution screen later
  const handleWorkoutPress = useCallback((workout: any) => {
    // Navigate to workout execution screen (placeholder)
    console.log('Workout pressed:', workout.id);
  }, []);

  // Render status icon based on workout status
  const renderStatusIcon = useCallback((status: string | undefined) => {
    switch (status) {
      case 'completed':
        return <CircleCheck {...({ size: 20, color: '#22C55E' } as any)} />;
      case 'in_progress':
        return <CircleDashed {...({ size: 20, color: '#F59E0B' } as any)} />;
      default:
        return <CircleX {...({ size: 20, color: themeColors.mutedText } as any)} />;
    }
  }, [themeColors.mutedText]);

  return (
    <ScreenWrapper scrollable={false}>
      <View style={styles.container}>
        {/* Top row: Title on left, Date picker on right */}
        <View style={styles.headerTopRow}>
          <Text style={[styles.title, { color: themeColors.text }]}>{t('training.title')}</Text>
          <PressableOpacity style={styles.dateButton} onPress={handleOpenDatePicker}>
            <Text style={[styles.dateButtonText, { color: themeColors.text }]}>{displayText}</Text>
            <PlatformIcon
              sf="chevron.down"
              IconComponent={ChevronDown}
              size={iconSizes.navigationChevrons}
              color={themeColors.text}
            />
          </PressableOpacity>
        </View>
        {/* Bottom row: Swipeable Calendar */}
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

            // Only show loading indicator on the currently selected date
            const isCurrentPageLoading =
              isLoadingTraining && selectedDate?.getTime() === date.getTime();

            return (
              <View key={`day-${dateKey}`} style={styles.pageContainer} collapsable={false}>
                <WorkoutDayPage
                  date={date}
                  workouts={dayWorkouts}
                  isLoading={isCurrentPageLoading}
                  onWorkoutPress={handleWorkoutPress}
                  themeColors={themeColors}
                  t={t}
                  renderStatusIcon={renderStatusIcon}
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
    paddingTop: 16,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 0,
    width: '100%',
    paddingHorizontal: 16,
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
