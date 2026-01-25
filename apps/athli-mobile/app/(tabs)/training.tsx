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
    ...typography.h5,
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

  // Timestamp of last programmatic navigation
  const lastProgrammaticNavTimestamp = useRef<number>(0);
  const PROGRAMMATIC_NAV_IGNORE_DURATION = 500;

  // Training data state
  const [trainingCalendar, setTrainingCalendar] = useState<TrainingCalendarSchema>({});
  const [isLoadingTraining, setIsLoadingTraining] = useState(false);
  const [loadedTrainingRange, setLoadedTrainingRange] = useState<{
    startDate: string;
    endDate: string;
  } | null>(null);

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
    // If not found (shouldn't happen), default to first day of month
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
    async (year: number, month: number) => {
      if (!clientId || !coachId) return;

      // Calculate the date range for this month (with buffer for partial weeks)
      const firstOfMonth = new Date(year, month, 1);
      const lastOfMonth = new Date(year, month + 1, 0);
      const startDate = getMondayOfWeek(firstOfMonth);
      const endDate = getSundayOfWeek(lastOfMonth);

      const startDateStr = formatDateYYYYMMDD(startDate);
      const endDateStr = formatDateYYYYMMDD(endDate);

      // Check if already loaded
      if (loadedTrainingRange) {
        if (startDateStr >= loadedTrainingRange.startDate && endDateStr <= loadedTrainingRange.endDate) {
          return; // Already loaded
        }
      }

      setIsLoadingTraining(true);
      try {
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
    [clientId, coachId, loadedTrainingRange]
  );

  // Initial data load for current month
  useEffect(() => {
    if (clientId && coachId) {
      fetchTrainingDataForMonth(currentYear, currentMonth);
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

    // Update selected date (this won't change the month since we're within the same month's range)
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

  // Dummy handler for workout press
  const handleWorkoutPress = useCallback((workout: any) => {
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

            // Only show loading indicator on the currently selected date
            const isCurrentPageLoading =
              isLoadingTraining && selectedDate.getTime() === date.getTime();

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
