import React, { useState, useMemo, useCallback } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, View } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { PressableScale } from 'pressto';
import { ChevronRight, ChevronDown, User, Dumbbell } from 'lucide-react-native';
import { SymbolView } from 'expo-symbols';
import { Image } from 'expo-image';

import { typography } from '@/constants/typography';
import { useThemePreference, useColorScheme } from '@/stores';
import { useTranslations } from '@/stores';
import { Card } from '@/components/ui/card';
import { DropdownMenuWrapper, type DropdownMenuOption } from '@/components/ui/dropdown-menu';
import { useCoachDailyWorkouts, type EnrichedWorkoutItem } from '@/hooks/useCoachDailyWorkouts';
import { Storage } from '@/lib/storage';
import { formatDateYYYYMMDD } from '@/lib/utils/date-formatters';

type WorkoutStatus = 'completed' | 'in_progress' | 'missed';

const STATUS_FILTERS: WorkoutStatus[] = ['completed', 'in_progress', 'missed'];

const DAILY_WORKOUTS_DATE_KEY = '@daily_workouts_selected_date';

export const DailyWorkoutsCard = () => {
  const { colors: themeColors } = useThemePreference();
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';
  const { t } = useTranslations();
  const router = useRouter();
  const [selectedStatus, setSelectedStatus] = useState<WorkoutStatus>('completed');

  // Button background color based on theme
  const buttonBackgroundColor = isDarkMode ? themeColors.surfaceSecondary : themeColors.surfacePrimary;

  // Selected date state
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  });

  // Format date for API call (YYYY-MM-DD)
  const dateString = useMemo(() => formatDateYYYYMMDD(selectedDate), [selectedDate]);

  const { data: workouts, isFetching } = useCoachDailyWorkouts(dateString, selectedStatus);

  // Check if selected date is today
  const isToday = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return selectedDate.getTime() === today.getTime();
  }, [selectedDate]);

  // Format date for display
  const displayDate = useMemo(() => {
    if (isToday) {
      return t('home.dailyWorkouts.today' as any) || 'Today';
    }

    const monthKeys = [
      'january', 'february', 'march', 'april', 'may', 'june',
      'july', 'august', 'september', 'october', 'november', 'december',
    ] as const;

    const day = selectedDate.getDate();
    const monthName = t(`calendar.months.${monthKeys[selectedDate.getMonth()]}`);
    return `${day} ${monthName}`;
  }, [selectedDate, isToday, t]);

  // Listen for when we return from the modal and check if date was updated
  useFocusEffect(
    useCallback(() => {
      const checkSelectedDate = () => {
        try {
          const storedDate = Storage.getItem(DAILY_WORKOUTS_DATE_KEY);
          if (storedDate) {
            const date = new Date(storedDate);
            if (!isNaN(date.getTime())) {
              date.setHours(0, 0, 0, 0);
              setSelectedDate(date);
              Storage.removeItem(DAILY_WORKOUTS_DATE_KEY);
            }
          }
        } catch (error) {
          console.error('Failed to read selected date:', error);
        }
      };
      checkSelectedDate();
    }, [])
  );

  const handleOpenDatePicker = useCallback(() => {
    const dateParam = selectedDate.toISOString();
    router.push({
      pathname: '/modals/calendar/select-date-modal',
      params: { selectedDate: dateParam, storageKey: DAILY_WORKOUTS_DATE_KEY, allowFuture: 'false' },
    });
  }, [selectedDate, router]);

  const getStatusLabel = (status: WorkoutStatus): string => {
    const labels: Record<WorkoutStatus, string> = {
      completed: t('home.dailyWorkouts.filters.completed' as any) || 'Completed',
      in_progress: t('home.dailyWorkouts.filters.inProgress' as any) || 'In Progress',
      missed: t('home.dailyWorkouts.filters.missed' as any) || 'Missed',
    };
    return labels[status];
  };

  const getEmptyMessage = (status: WorkoutStatus): string => {
    const messages: Record<WorkoutStatus, string> = {
      completed: t('home.dailyWorkouts.empty.completed' as any) || 'No clients have completed a workout yet',
      in_progress: t('home.dailyWorkouts.empty.inProgress' as any) || 'No clients are currently working out',
      missed: t('home.dailyWorkouts.empty.missed' as any) || 'All clients are on track',
    };
    return messages[status];
  };

  const filterOptions: DropdownMenuOption[] = STATUS_FILTERS.map((status) => ({
    label: getStatusLabel(status),
    onPress: () => setSelectedStatus(status),
  }));

  const handleWorkoutPress = (item: EnrichedWorkoutItem) => {
    const workoutPayload = JSON.stringify(item.workout_data || {});

    if (item.status === 'completed') {
      router.push({
        pathname: '/modals/training/workout-review-modal',
        params: {
          workoutId: item.workout_id,
          date: item.date,
          clientId: item.client_id,
          coachId: item.coach_id,
          workoutPayload,
        },
      });
    } else {
      router.push({
        pathname: '/modals/training/workout-preview-modal',
        params: {
          workoutId: item.workout_id,
          date: item.date,
          clientId: item.client_id,
          coachId: item.coach_id,
          workoutName: item.workoutName,
          workoutPayload,
        },
      });
    }
  };

  return (
    <Card style={styles.card}>
      {/* Title */}
      <View style={styles.titleContainer}>
        <View style={styles.titleRow}>
          {Platform.OS === 'ios' ? (
            <SymbolView name="dumbbell.fill" tintColor={themeColors.text} size={22} type="monochrome" />
          ) : (
            <Dumbbell {...({ size: 22, color: themeColors.text } as any)} />
          )}
          <Text style={[styles.title, { color: themeColors.text }]}>
            {t('home.dailyWorkouts.title' as any) || 'Workouts'}
          </Text>
        </View>
      </View>

      {/* Filter Row: Status dropdown on left, Date picker on right */}
      <View style={styles.filterRow}>
        <View style={styles.buttonColumn}>
          <DropdownMenuWrapper options={filterOptions}>
            <PressableScale style={[styles.filterButton, { backgroundColor: buttonBackgroundColor }]}>
              <Text style={[styles.filterText, { color: themeColors.primary }]}>
                {getStatusLabel(selectedStatus)}
              </Text>
              <ChevronDown {...({ size: 14, color: themeColors.primary } as any)} />
            </PressableScale>
          </DropdownMenuWrapper>
        </View>

        <View style={styles.buttonColumn}>
          <PressableScale style={[styles.dateButton, { backgroundColor: buttonBackgroundColor }]} onPress={handleOpenDatePicker}>
            <Text style={[styles.dateText, { color: themeColors.text }]}>
              {displayDate}
            </Text>
            <ChevronDown {...({ size: 14, color: themeColors.text } as any)} />
          </PressableScale>
        </View>
      </View>

      {/* Divider */}
      <View style={[styles.divider, { backgroundColor: themeColors.border }]} />

      {/* Content */}
      {isFetching ? (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="small" color={themeColors.mutedText} />
        </View>
      ) : workouts && workouts.length > 0 ? (
        <View style={styles.workoutsList}>
          {workouts.map((item, index) => (
            <PressableScale
              key={`${item.workout_id}-${item.client_id}`}
              style={[
                styles.workoutRow,
                index < workouts.length - 1 && styles.workoutRowBorder,
                index < workouts.length - 1 && { borderBottomColor: themeColors.border },
              ]}
              onPress={() => handleWorkoutPress(item)}
            >
              {/* Avatar */}
              <View style={[styles.avatarContainer, { backgroundColor: themeColors.surfaceSecondary }]}>
                {item.clientAvatarUrl ? (
                  <Image
                    source={{ uri: item.clientAvatarUrl }}
                    style={styles.avatar}
                    contentFit="cover"
                    transition={200}
                  />
                ) : (
                  <User {...({ size: 16, color: themeColors.mutedText } as any)} />
                )}
              </View>

              {/* Info */}
              <View style={styles.workoutInfo}>
                <Text style={[styles.clientName, { color: themeColors.text }]} numberOfLines={1}>
                  {item.clientName}
                </Text>
                <Text style={[styles.workoutName, { color: themeColors.mutedText }]} numberOfLines={1}>
                  {item.workoutName}
                </Text>
              </View>

              {/* Chevron */}
              <ChevronRight {...({ size: 20, color: themeColors.mutedText } as any)} />
            </PressableScale>
          ))}
        </View>
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: themeColors.mutedText }]}>
            {getEmptyMessage(selectedStatus)}
          </Text>
        </View>
      )}
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    paddingHorizontal: 0,
    paddingVertical: 0,
    overflow: 'hidden',
    marginBottom: 24,
  },
  titleContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    ...typography.h5,
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 12,
  },
  buttonColumn: {
    flex: 1,
    flexBasis: 0,
  },
  filterButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 20,
  },
  filterText: {
    ...typography.p2,
    fontWeight: '600',
  },
  dateButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 20,
  },
  dateText: {
    ...typography.p2,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    width: '100%',
  },
  workoutsList: {
    paddingVertical: 4,
  },
  workoutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  workoutRowBorder: {
    borderBottomWidth: 1,
  },
  avatarContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  workoutInfo: {
    flex: 1,
    gap: 2,
  },
  clientName: {
    ...typography.p2,
    fontWeight: '600',
  },
  workoutName: {
    ...typography.p3,
  },
  emptyContainer: {
    height: 80,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    ...typography.p2,
  },
});
