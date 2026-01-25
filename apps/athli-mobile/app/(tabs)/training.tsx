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
import { getTrainingCalendarRange, TrainingCalendarSchema } from '@/services/client/client-service';

const SELECTED_DATE_KEY = '@select_date_modal_selected_date';

// Days pager configuration
const DAYS_BACK = 365;
const DAYS_FORWARD = 365;

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

// Memoized component for each day's workout content
const WorkoutDayPage = React.memo(
  ({ date, workouts, isLoading, onWorkoutPress, themeColors, t, renderStatusIcon }: WorkoutDayPageProps) => {
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
              </View>
            </Card>
          </PressableScale>
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
});

export default function TrainingScreen() {
  const router = useRouter();
  const { primaryColor, colors: themeColors } = useThemePreference();
  const { t } = useTranslations();

  // Get profile data from store
  const profile = useClientProfileStore((state) => state.profile);
  const clientId = profile?.client_id;
  const coachId = profile?.coach_id;

  // Pager refs
  const pagerRef = useRef<PagerView>(null);
  const isProgrammaticChange = useRef(false);

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
  const [calendarKey, setCalendarKey] = useState(0);

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

  const handleOpenDatePicker = () => {
    const dateParam = selectedDate ? selectedDate.toISOString() : new Date().toISOString();
    router.push({
      pathname: '/modals/calendar/select-date-modal',
      params: { selectedDate: dateParam, storageKey: SELECTED_DATE_KEY },
    });
  };

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

              isProgrammaticChange.current = true;
              setSelectedDate(date);
              setCurrentMonth(date.getMonth());
              setCurrentYear(date.getFullYear());

              // Navigate pager to the selected day
              const dayIndex = getDayIndexForDate(date);
              if (dayIndex >= 0 && dayIndex < daysArray.length) {
                pagerRef.current?.setPage(dayIndex);
              }

              // Fetch data for the selected date if needed
              if (!isDateInLoadedRange(date)) {
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
    }, [getDayIndexForDate, daysArray.length, isDateInLoadedRange, fetchTrainingDataForDate])
  );

  const handleDateSelect = async (date: Date) => {
    const newDate = new Date(date);
    newDate.setHours(0, 0, 0, 0);

    isProgrammaticChange.current = true;
    setSelectedDate(newDate);
    setCurrentMonth(newDate.getMonth());
    setCurrentYear(newDate.getFullYear());

    // Navigate pager to the selected day
    const dayIndex = getDayIndexForDate(newDate);
    if (dayIndex >= 0 && dayIndex < daysArray.length) {
      pagerRef.current?.setPage(dayIndex);
    }

    // Fetch training data if not in loaded range
    if (!isDateInLoadedRange(newDate)) {
      await fetchTrainingDataForDate(newDate);
    }
  };

  // Preload threshold for dynamic loading
  const PRELOAD_THRESHOLD = 7;

  // Handle pager page selected (pager → calendar sync)
  const handlePageSelected = async (event: PagerViewOnPageSelectedEvent) => {
    const pageIndex = event.nativeEvent.position;

    // Skip if programmatic (calendar tap already handled it)
    if (isProgrammaticChange.current) {
      isProgrammaticChange.current = false;
      return;
    }

    // User swiped - provide haptic feedback
    haptics.selection();

    // Update selected date
    const newDate = daysArray[pageIndex];
    if (newDate) {
      setSelectedDate(newDate);
      setCurrentMonth(newDate.getMonth());
      setCurrentYear(newDate.getFullYear());

      // Check if near edge of loaded range for preloading
      if (loadedTrainingRange) {
        const startBoundary = new Date(loadedTrainingRange.startDate);
        const endBoundary = new Date(loadedTrainingRange.endDate);

        const daysToStart = Math.round(
          (newDate.getTime() - startBoundary.getTime()) / (1000 * 60 * 60 * 24)
        );
        const daysToEnd = Math.round(
          (endBoundary.getTime() - newDate.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (daysToStart < PRELOAD_THRESHOLD || daysToEnd < PRELOAD_THRESHOLD) {
          await extendTrainingRange(newDate);
        }
      } else if (!isDateInLoadedRange(newDate)) {
        await extendTrainingRange(newDate);
      }
    }
  };

  const handleCalendarSwipe = async (month: number, year: number) => {
    setCurrentMonth(month);
    setCurrentYear(year);

    // When swiping to a new month, check if middle of month is in range
    const midMonthDate = new Date(year, month, 15);
    if (!isDateInLoadedRange(midMonthDate)) {
      await extendTrainingRange(midMonthDate);
    }
  };

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
  const handleWorkoutPress = (workout: any) => {
    // TODO: Navigate to workout execution screen
    console.log('Workout pressed:', workout.id);
  };

  // Render status icon based on workout status
  const renderStatusIcon = (status: string | undefined) => {
    const completedSummaryStatus = status;
    switch (completedSummaryStatus) {
      case 'completed':
        return <CircleCheck size={20} color="#22C55E" />;
      case 'in_progress':
        return <CircleDashed size={20} color="#F59E0B" />;
      default:
        return <CircleX size={20} color={themeColors.mutedText} />;
    }
  };

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
          />
        </View>

        <View style={styles.staticHeader}>
          <View style={[styles.divider, { backgroundColor: themeColors.mutedText, opacity: 0.3 }]} />
        </View>

        {/* Day Content Pager */}
        <PagerView
          ref={pagerRef}
          style={styles.pagerContainer}
          initialPage={initialDayIndex}
          onPageSelected={handlePageSelected}
          offscreenPageLimit={1}
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
              <View key={`day-${index}`} style={styles.pageContainer}>
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
