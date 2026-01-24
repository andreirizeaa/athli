import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { PressableOpacity, PressableScale } from 'pressto';
import { useRouter, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
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
import type { TrainingCalendarItem } from '@/services/client/client-service';

const SELECTED_DATE_KEY = '@select_date_modal_selected_date_client';

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

  // Get refreshSection to force reload training data
  const refreshSection = useClientDetailStore((state) => state.refreshSection);
  const fetchTrainingDataForDate = useClientDetailStore((state) => state.fetchTrainingDataForDate);
  const extendTrainingRange = useClientDetailStore((state) => state.extendTrainingRange);
  const isDateInLoadedRange = useClientDetailStore((state) => state.isDateInLoadedRange);

  // Load client data if not already loaded
  useEffect(() => {
    if (id && !clientId) {
      loadClientData(id);
    } else if (id && clientId && Object.keys(trainingCalendar).length === 0) {
      // If client is loaded but training data is empty, refresh training section
      refreshSection('training');
    }
  }, [id, clientId, loadClientData, trainingCalendar, refreshSection]);

  const [selectedDate, setSelectedDate] = useState<Date | null>(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  });
  const [hasSelectedDate, setHasSelectedDate] = useState(false);
  const [currentMonth, setCurrentMonth] = useState<number>(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState<number>(new Date().getFullYear());
  const [calendarKey, setCalendarKey] = useState(0);

  const [displayedDate, setDisplayedDate] = useState<Date | null>(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  });

  const animateCalendarForDateChange = useCallback(
    (nextDate: Date) => {
      const prevDate = displayedDate;
      if (!prevDate) {
        setDisplayedDate(nextDate);
        return;
      }

      const prevTime = prevDate.getTime();
      const nextTime = nextDate.getTime();
      if (prevTime === nextTime) {
        const committed = new Date(nextDate);
        committed.setHours(0, 0, 0, 0);
        setDisplayedDate(committed);
        return;
      }

      setDisplayedDate(nextDate);
    },
    [displayedDate]
  );

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
              animateCalendarForDateChange(date);
              setSelectedDate(date);
              setHasSelectedDate(true);
              setCurrentMonth(date.getMonth());
              setCurrentYear(date.getFullYear());
              
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
    }, [animateCalendarForDateChange, fetchTrainingDataForDate])
  );

  const handleDateSelect = async (date: Date) => {
    const newDate = new Date(date);
    newDate.setHours(0, 0, 0, 0);
    
    // Always update the selected date immediately for UI responsiveness
    animateCalendarForDateChange(newDate);
    setSelectedDate(newDate);
    setHasSelectedDate(true);
    setCurrentMonth(newDate.getMonth());
    setCurrentYear(newDate.getFullYear());

    // ALWAYS fetch training data for the clicked date - fetch just that one date
    // This ensures we can click ANY date and get its data
    await fetchTrainingDataForDate(newDate);
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

  // Get workouts for selected date
  // Note: API returns dates in DD-MM-YYYY format
  // Each date contains an object with workout keys (workout_1, workout_2, etc.), not an array
  const workoutsForSelectedDate = useMemo(() => {
    if (!selectedDate || !trainingCalendar) return [];
    const dateKey = formatDateDDMMYYYY(selectedDate);
    const workoutsObj = trainingCalendar[dateKey];

    if (!workoutsObj) return [];

    // Convert object entries to array, preserving the key as the instance ID
    // API returns { workout_1: {...}, workout_2: {...} }
    // The key (workout_1, workout_2) is the unique instance ID for this client's workout
    // The workout.id inside is the template ID from the coach's library
    const workoutsArray = Object.entries(workoutsObj).map(([key, workout]: [string, any]) => ({
      ...workout,
      id: key, // Instance ID (unique to this client's training)
      templateId: workout.id, // Original template ID from coach's library
    }));
    return workoutsArray;
  }, [selectedDate, trainingCalendar]);

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

  const handleBackPress = () => {
    router.back();
  };

  const handleWorkoutPress = (workout: any) => {
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
  };

  // Check if selected date is today or in the future
  const isDateTodayOrFuture = useMemo(() => {
    if (!selectedDate) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return selectedDate >= today;
  }, [selectedDate]);

  const handleAddWorkout = () => {
    if (!selectedDate) return;
    router.push({
      pathname: '/modals/client/add-workout-to-day-modal',
      params: {
        clientId: id,
        date: formatDateYYYYMMDD(selectedDate),
      },
    });
  };

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

  const handleDeleteWorkout = (workout: TrainingCalendarItem) => {
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
  };

  const getStatusColor = (status: string | undefined) => {
    switch (status) {
      case 'completed':
        return themeColors.success;
      case 'in_progress':
        return themeColors.warning || '#F5A623';
      default:
        return themeColors.mutedText;
    }
  };

  const getStatusLabel = (status: string | undefined) => {
    switch (status) {
      case 'completed':
        return t('clientDetail.training.completed');
      case 'in_progress':
        return t('clientDetail.training.inProgress');
      default:
        return t('clientDetail.training.notStarted');
    }
  };

  // Render status icon based on workout status
  const renderStatusIcon = (status: string | undefined) => {
    const completedSummaryStatus = status;
    switch (completedSummaryStatus) {
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
  };

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

      {/* Workout List */}
      {isLoadingTraining ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={themeColors.primary} />
        </View>
      ) : !workoutsForSelectedDate || workoutsForSelectedDate.length === 0 ? (
        <View style={styles.emptyContainer}>
          <PlatformIcon sf="dumbbell" IconComponent={Dumbbell} size={48} color={themeColors.mutedText} />
          <Text style={[styles.emptyTitle, { color: themeColors.text }]}>
            {t('clientDetail.training.noWorkouts')}
          </Text>
          <Text style={[styles.emptyDescription, { color: themeColors.mutedText }]}>
            {t('clientDetail.training.noWorkoutsDescription')}
          </Text>
          {isDateTodayOrFuture && (
            <FilledButton
              label={t('clientDetail.training.addWorkout')}
              onPress={handleAddWorkout}
              style={styles.addWorkoutButton}
            />
          )}
        </View>
      ) : (
        <ScrollView
          style={styles.workoutList}
          contentContainerStyle={styles.workoutListContent}
          showsVerticalScrollIndicator={false}
          keyboardDismissMode="on-drag"
        >
          {(workoutsForSelectedDate || []).map((workout, index) => {
            return (
              <PressableScale
                key={workout.id || index}
                onPress={() => handleWorkoutPress(workout)}
              >
                <View
                  style={[styles.workoutCard, { backgroundColor: themeColors.surfacePrimary }]}
                >
                  {/* Workout Header */}
                  <View style={styles.workoutHeader}>
                    <View style={styles.workoutHeaderLeft}>
                      {/* Status Icon */}
                      <View style={styles.statusIconContainer}>
                        {renderStatusIcon(workout.completedSummary?.status)}
                      </View>
                      <View style={styles.workoutInfo}>
                        <Text
                          style={[styles.workoutName, { color: themeColors.text }]}
                          numberOfLines={1}
                        >
                          {workout.workout}
                        </Text>
                        <Text style={[styles.exerciseCount, { color: themeColors.mutedText }]}>
                          {workout.totalExercises || 0}{' '}
                          {(workout.totalExercises || 0) === 1
                            ? t('library.exercise')
                            : t('library.exercises')}
                        </Text>
                      </View>
                    </View>
                    <IconButton
                      icon={{ sf: 'trash', IconComponent: Trash2 }}
                      onPress={() => handleDeleteWorkout(workout)}
                      size="sm"
                      color={themeColors.mutedText}
                      backgroundColor={themeColors.surfaceSecondary}
                    />
                  </View>
                </View>
              </PressableScale>
            );
          })}
          {isDateTodayOrFuture && (
            <FilledButton
              label={t('clientDetail.training.addWorkout')}
              onPress={handleAddWorkout}
              style={styles.addWorkoutButtonInList}
            />
          )}
        </ScrollView>
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
    height: 1,
    alignSelf: 'stretch',
    marginTop: 0,
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
    borderRadius: 16,
    overflow: 'hidden',
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
  headerSpacer: {
    width: 44,
  },
  addWorkoutButton: {
    marginTop: 24,
  },
  addWorkoutButtonInList: {
    marginTop: 8,
  },
});
