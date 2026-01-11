import React, { useMemo } from 'react';
import { StyleSheet, Text, View, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronRight, Dumbbell } from 'lucide-react-native';
import { PressableOpacity } from 'pressto';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';

import { typography } from '@/constants/typography';
import { WORKOUT_TYPES, DIFFICULTY_LEVELS } from '@/constants/training';
import { useThemePreference, useCoachProfileStore } from '@/stores';
import { useTranslations } from '@/stores';
import { PlatformIcon } from '@/components/ui/platform-icon';
import { useLibraryTab } from '@/stores';
import { SwipeableRow } from '@/components/ui/swipeable-row';
import { getWorkouts, deleteWorkouts, duplicateWorkout, starWorkouts, archiveWorkouts } from '@/services/coach/coach-workout-service';
import { EmptyState } from '@/components/ui/empty-state';

// Helper function to get formatted label from value
const getWorkoutTypeLabel = (value: string | null | undefined): string | null => {
  if (!value) return null;
  const type = WORKOUT_TYPES.find(t => t.value === value);
  return type?.label || null;
};

const getDifficultyLabel = (value: string | null | undefined): string | null => {
  if (!value) return null;
  const difficulty = DIFFICULTY_LEVELS.find(d => d.value === value);
  return difficulty?.label || null;
};

export const WorkoutsTab = () => {
  const router = useRouter();
  const { colors: themeColors } = useThemePreference();
  const { t } = useTranslations();
  const { searchQuery, registerOpenRow, closeOpenRow } = useLibraryTab();
  const queryClient = useQueryClient();
  const coachProfile = useCoachProfileStore((state) => state.profile);
  const isAuthenticated = !!coachProfile;

  // Fetch workouts directly with TanStack Query
  const { data: workouts = [], isLoading, isError } = useQuery({
    queryKey: ['workouts'],
    queryFn: async () => {
      console.log('[WorkoutsTab] Fetching workouts...');
      const data = await getWorkouts();
      console.log('[WorkoutsTab] Received workouts:', data.length, 'items');
      return data;
    },
    enabled: isAuthenticated,
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: false,
  });

  // Filter workouts based on search query
  const filteredWorkouts = useMemo(() => {
    if (!searchQuery.trim()) return workouts;
    const lowerQuery = searchQuery.toLowerCase();
    return workouts.filter(workout =>
      workout.name.toLowerCase().includes(lowerQuery) ||
      workout.type?.toLowerCase().includes(lowerQuery) ||
      workout.difficulty?.toLowerCase().includes(lowerQuery)
    );
  }, [workouts, searchQuery]);

  console.log('[WorkoutsTab] Render:', {
    isAuthenticated,
    isLoading,
    isError,
    totalWorkouts: workouts.length,
    filteredWorkouts: filteredWorkouts.length,
    searchQuery
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteWorkouts(id),
    onSuccess: async () => {
      await queryClient.refetchQueries({ queryKey: ['workouts'] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    onError: (error: Error) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(
        t('general.error'),
        error.message || t('general.errorDeleting'),
        [{ text: t('general.ok') }]
      );
    },
  });

  // Duplicate mutation
  const duplicateMutation = useMutation({
    mutationFn: (id: string) => duplicateWorkout(id),
    onSuccess: async () => {
      await queryClient.refetchQueries({ queryKey: ['workouts'] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    onError: (error: Error) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(
        t('general.error'),
        error.message || t('general.errorDuplicating'),
        [{ text: t('general.ok') }]
      );
    },
  });

  // Star mutation
  const starMutation = useMutation({
    mutationFn: ({ id, starred }: { id: string; starred: boolean }) => starWorkouts(id, starred),
    onSuccess: async () => {
      await queryClient.refetchQueries({ queryKey: ['workouts'] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    onError: (error: Error) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(
        t('general.error'),
        error.message || t('general.errorUpdating'),
        [{ text: t('general.ok') }]
      );
    },
  });

  // Archive mutation
  const archiveMutation = useMutation({
    mutationFn: ({ id, archived }: { id: string; archived: boolean }) => archiveWorkouts(id, archived),
    onSuccess: async () => {
      await queryClient.refetchQueries({ queryKey: ['workouts'] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    onError: (error: Error) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(
        t('general.error'),
        error.message || t('general.errorUpdating'),
        [{ text: t('general.ok') }]
      );
    },
  });

  // Already filtered above

  const handleWorkoutPress = (workout: typeof filteredWorkouts[0]) => {
    closeOpenRow();
    router.push({
      pathname: '/library/workout/[id]',
      params: {
        id: workout.id,
        name: workout.name,
        description: workout.description || '',
        type: workout.type || '',
        difficulty: workout.difficulty || 'all_levels',
      },
    });
  };

  return (
    <View style={styles.container}>
      {/* Empty State */}
      {filteredWorkouts.length === 0 && (
        <EmptyState
          message={t('library.empty.workouts')}
        />
      )}

      {/* Workout List */}
      {filteredWorkouts.map((workout, index) => {
        const isLastItem = index === filteredWorkouts.length - 1;
        const typeLabel = getWorkoutTypeLabel(workout.type);
        const difficultyLabel = getDifficultyLabel(workout.difficulty);
        const hasType = !!typeLabel;
        const hasDifficulty = !!difficultyLabel;
        const showMetaRow = hasType || hasDifficulty;

        return (
          <View key={workout.id}>
            <SwipeableRow
              onDelete={() => deleteMutation.mutateAsync(workout.id)}
              onOpen={registerOpenRow}
              deleteConfirmTitle={`${t('general.delete')} ${workout.name}?`}
            >
              <PressableOpacity
                onPress={() => handleWorkoutPress(workout)}
                style={styles.rowWrapper}
              >
                <View style={[styles.rowContent, { backgroundColor: themeColors.pageBackground }]}>
                  <View style={styles.iconContainer}>
                    <PlatformIcon
                      sf="dumbbell.fill"
                      IconComponent={Dumbbell}
                      size={24}
                      color={themeColors.text}
                    />
                  </View>
                  <View style={styles.textContent}>
                    <Text
                      style={[styles.workoutName, { color: themeColors.text }]}
                      numberOfLines={1}
                      ellipsizeMode="tail"
                    >
                      {workout.name}
                    </Text>
                    {showMetaRow && (
                      <View style={styles.metaRow}>
                        {hasType && (
                          <Text style={[styles.metaText, { color: themeColors.mutedText }]}>
                            {typeLabel}
                          </Text>
                        )}
                        {hasType && hasDifficulty && (
                          <Text style={[styles.metaDot, { color: themeColors.mutedText }]}>•</Text>
                        )}
                        {hasDifficulty && (
                          <Text style={[styles.metaText, { color: themeColors.mutedText }]}>
                            {difficultyLabel}
                          </Text>
                        )}
                      </View>
                    )}
                  </View>
                  <ChevronRight {...({ size: 16, color: themeColors.mutedText } as any)} />
                </View>
              </PressableOpacity>
            </SwipeableRow>

            {!isLastItem && (
              <View style={styles.separatorContainer}>
                <View
                  style={[
                    styles.separator,
                    { backgroundColor: themeColors.mutedText, opacity: 0.2 },
                  ]}
                />
              </View>
            )}

            {isLastItem && <View style={{ height: 24 }} />}
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  rowWrapper: {
    width: '100%',
  },
  rowContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(128, 128, 128, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  textContent: {
    flex: 1,
    marginRight: 8,
  },
  workoutName: {
    ...typography.p1,
    fontWeight: '600',
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    ...typography.p3,
  },
  metaDot: {
    marginHorizontal: 6,
    ...typography.p3,
  },
  separatorContainer: {
    paddingLeft: 72,
    paddingRight: 16,
  },
  separator: {
    height: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    ...typography.p2,
    marginTop: 12,
  },
  errorText: {
    ...typography.p2,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
});
