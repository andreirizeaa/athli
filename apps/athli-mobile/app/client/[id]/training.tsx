import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, ActivityIndicator } from 'react-native';
import { PressableOpacity, PressableScale } from 'pressto';
import { useRouter, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Storage } from '@/lib/storage';
import {
  ChevronDown,
  ChevronLeft,
  Plus,
  Dumbbell,
  ClipboardList,
  ChevronRight,
} from 'lucide-react-native';

import { typography, iconSizes } from '@/constants/typography';
import { useThemePreference, useTranslations, useClientDetailStore } from '@/stores';
import { IconButton } from '@/components/ui/icon-button';
import { PlatformIcon } from '@/components/ui/platform-icon';
import { SwipeableCalendar } from '@/components/features/calendar/swipeable-calendar';
import { formatDateDDMMYYYY, formatDateYYYYMMDD } from '@/lib/utils/date-formatters';
import { ScreenWrapper } from '@/components/ui/screen-wrapper';
import { DropdownMenuWrapper } from '@/components/ui/dropdown-menu';
import type { TrainingCalendarItem } from '@/services/client/client-service';

const SELECTED_DATE_KEY = '@select_date_modal_selected_date_client';

// Type for workout exercise display
interface WorkoutExercise {
  id: string;
  name: string;
  sets: number;
}

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

  // Load client data if not already loaded
  useEffect(() => {
    if (id && !clientId) {
      loadClientData(id);
    }
  }, [id, clientId, loadClientData]);

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
              Storage.removeItem(SELECTED_DATE_KEY);
            }
          }
        } catch (error) {
          console.error('Failed to read selected date:', error);
        }
      };
      checkSelectedDate();
    }, [animateCalendarForDateChange])
  );

  const handleDateSelect = (date: Date) => {
    const newDate = new Date(date);
    newDate.setHours(0, 0, 0, 0);
    animateCalendarForDateChange(newDate);
    setSelectedDate(newDate);
    setHasSelectedDate(true);
    setCurrentMonth(newDate.getMonth());
    setCurrentYear(newDate.getFullYear());
  };

  const handleCalendarSwipe = (month: number, year: number) => {
    setCurrentMonth(month);
    setCurrentYear(year);
  };

  // Get workouts for selected date
  const workoutsForSelectedDate = useMemo(() => {
    if (!selectedDate || !trainingCalendar) return [];
    const dateKey = formatDateYYYYMMDD(selectedDate);
    return trainingCalendar[dateKey] || [];
  }, [selectedDate, trainingCalendar]);

  // Extract exercises from workout data
  const getExercisesFromWorkout = (workout: TrainingCalendarItem): WorkoutExercise[] => {
    if (!workout.workout_data?.items) return [];

    const exercises: WorkoutExercise[] = [];

    workout.workout_data.items.forEach((item: any) => {
      if (item.itemType === 'exercise') {
        exercises.push({
          id: item.data?.id || `ex-${exercises.length}`,
          name: item.data?.name || 'Exercise',
          sets: item.data?.sets?.length || 0,
        });
      } else if (item.itemType === 'section') {
        // Extract exercises from section
        const sectionExercises = item.data?.exercises || [];
        sectionExercises.forEach((group: any) => {
          const groupExercises = group.exercises || [group];
          groupExercises.forEach((ex: any) => {
            exercises.push({
              id: ex.id || `ex-${exercises.length}`,
              name: ex.name || 'Exercise',
              sets: ex.sets?.length || 1,
            });
          });
        });
      }
    });

    return exercises;
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

  const handleBackPress = () => {
    router.back();
  };

  const handleWorkoutPress = (workout: TrainingCalendarItem) => {
    // Navigate to workout builder with client workout data
    router.push({
      pathname: '/library/workout/[id]',
      params: {
        id: workout.id,
        name: workout.workout,
        description: workout.description || '',
        type: workout.type || '',
        difficulty: workout.difficulty || 'all_levels',
        // Pass client context for client-specific workout editing
        clientId: id,
        clientWorkoutDate: selectedDate ? formatDateYYYYMMDD(selectedDate) : '',
      },
    });
  };

  const dropdownOptions = useMemo(
    () => [
      {
        label: t('clientDetail.actions.assignWorkout'),
        icon: { sf: 'figure.run', IconComponent: Dumbbell },
        onPress: () => {
          router.push(`/modals/shared/assign-to-clients-modal?type=workout&clientId=${id}`);
        },
      },
      {
        label: t('clientDetail.actions.addWorkout'),
        icon: { sf: 'plus.circle', IconComponent: Plus },
        onPress: () => {
          router.push(`/modals/library/add-workout-modal?clientId=${id}`);
        },
      },
    ],
    [t, router, id]
  );

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
        <DropdownMenuWrapper options={dropdownOptions}>
          <IconButton
            icon={{ sf: 'plus', IconComponent: Plus }}
            onPress={() => {}}
            size="md"
            color={iconColor}
          />
        </DropdownMenuWrapper>
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
      ) : workoutsForSelectedDate.length === 0 ? (
        <View style={styles.emptyContainer}>
          <PlatformIcon sf="dumbbell" IconComponent={Dumbbell} size={48} color={themeColors.mutedText} />
          <Text style={[styles.emptyTitle, { color: themeColors.text }]}>
            {t('clientDetail.training.noWorkouts')}
          </Text>
          <Text style={[styles.emptyDescription, { color: themeColors.mutedText }]}>
            {t('clientDetail.training.noWorkoutsDescription')}
          </Text>
        </View>
      ) : (
        <ScrollView
          style={styles.workoutList}
          contentContainerStyle={styles.workoutListContent}
          showsVerticalScrollIndicator={false}
          keyboardDismissMode="on-drag"
        >
          {workoutsForSelectedDate.map((workout, index) => {
            const exercises = getExercisesFromWorkout(workout);
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
                      <View
                        style={[
                          styles.workoutIcon,
                          { backgroundColor: `${themeColors.primary}15` },
                        ]}
                      >
                        <PlatformIcon
                          sf="dumbbell.fill"
                          IconComponent={Dumbbell}
                          size={20}
                          color={themeColors.primary}
                        />
                      </View>
                      <View style={styles.workoutInfo}>
                        <Text
                          style={[styles.workoutName, { color: themeColors.text }]}
                          numberOfLines={1}
                        >
                          {workout.workout}
                        </Text>
                        <View style={styles.workoutMeta}>
                          <Text style={[styles.workoutMetaText, { color: themeColors.mutedText }]}>
                            {workout.totalExercises || exercises.length}{' '}
                            {workout.totalExercises === 1
                              ? t('library.exercise')
                              : t('library.exercises')}
                          </Text>
                          <View
                            style={[
                              styles.statusBadge,
                              { backgroundColor: `${getStatusColor(workout.day_status)}20` },
                            ]}
                          >
                            <Text
                              style={[
                                styles.statusText,
                                { color: getStatusColor(workout.day_status) },
                              ]}
                            >
                              {getStatusLabel(workout.day_status)}
                            </Text>
                          </View>
                        </View>
                      </View>
                    </View>
                    <ChevronRight {...({ size: 16, color: themeColors.mutedText } as any)} />
                  </View>

                  {/* Exercises List */}
                  {exercises.length > 0 && (
                    <View
                      style={[
                        styles.exercisesContainer,
                        { borderTopColor: themeColors.border },
                      ]}
                    >
                      {exercises.slice(0, 5).map((exercise, exIndex) => (
                        <View key={exercise.id} style={styles.exerciseRow}>
                          <View
                            style={[
                              styles.exerciseNumber,
                              { backgroundColor: themeColors.backgroundSecondary },
                            ]}
                          >
                            <Text
                              style={[styles.exerciseNumberText, { color: themeColors.mutedText }]}
                            >
                              {exIndex + 1}
                            </Text>
                          </View>
                          <Text
                            style={[styles.exerciseName, { color: themeColors.text }]}
                            numberOfLines={1}
                          >
                            {exercise.name}
                          </Text>
                          {exercise.sets > 0 && (
                            <Text
                              style={[styles.exerciseSets, { color: themeColors.mutedText }]}
                            >
                              {exercise.sets} {exercise.sets === 1 ? 'set' : 'sets'}
                            </Text>
                          )}
                        </View>
                      ))}
                      {exercises.length > 5 && (
                        <Text style={[styles.moreExercises, { color: themeColors.mutedText }]}>
                          +{exercises.length - 5} more
                        </Text>
                      )}
                    </View>
                  )}
                </View>
              </PressableScale>
            );
          })}
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
    justifyContent: 'center',
    paddingHorizontal: 32,
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
  workoutIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  workoutInfo: {
    flex: 1,
    gap: 4,
  },
  workoutName: {
    ...typography.p1,
    fontWeight: '600',
  },
  workoutMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  workoutMetaText: {
    ...typography.p3,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  statusText: {
    ...typography.p4,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  exercisesContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    gap: 8,
  },
  exerciseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  exerciseNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exerciseNumberText: {
    ...typography.p4,
    fontWeight: '600',
  },
  exerciseName: {
    ...typography.p2,
    flex: 1,
  },
  exerciseSets: {
    ...typography.p3,
  },
  moreExercises: {
    ...typography.p3,
    fontStyle: 'italic',
    marginTop: 4,
    textAlign: 'center',
  },
});
