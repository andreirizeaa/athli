import React, { useMemo } from 'react';
import { StyleSheet, Text, View, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronRight, Dumbbell } from 'lucide-react-native';
import { PressableScale } from 'pressto';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { FlashList } from '@shopify/flash-list';

import { typography } from '@/constants/typography';
import { useThemePreference, useCoachProfileStore } from '@/stores';
import { useTranslations } from '@/stores';
import { PlatformIcon } from '@/components/ui/platform-icon';
import { useLibraryTab } from '@/stores';
import { SwipeableRow } from '@/components/ui/swipeable-row';
import { getWorkouts, deleteWorkouts } from '@/services/coach/coach-workout-service';
import { EmptyState } from '@/components/ui/empty-state';

export const WorkoutsTab = () => {
  const router = useRouter();
  const { colors: themeColors } = useThemePreference();
  const { t } = useTranslations();
  const { searchQuery, registerOpenRow, closeOpenRow, openRowCloseFn } = useLibraryTab();
  const queryClient = useQueryClient();
  const isRowOpen = openRowCloseFn !== null;
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


  // Already filtered above

  const handleWorkoutPress = (workout: typeof filteredWorkouts[0]) => {
    // If a row is open, just close it and prevent navigation
    if (isRowOpen) {
      closeOpenRow();
      return;
    }

    console.log('[WorkoutsTab] Opening workout:', {
      id: workout.id,
      name: workout.name,
      description: workout.description,
      type: workout.type,
      difficulty: workout.difficulty,
      totalExercises: workout.totalExercises,
      fullWorkoutData: workout,
    });
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
    <FlashList
      data={filteredWorkouts}
      renderItem={({ item: workout, index }) => {
        const isLastItem = index === filteredWorkouts.length - 1;

        return (
          <View>
            <SwipeableRow
              onDelete={() => deleteMutation.mutateAsync(workout.id)}
              onOpen={registerOpenRow}
              deleteConfirmTitle={`${t('general.delete')} ${workout.name}?`}
            >
              <PressableScale
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
                    <Text style={[styles.exerciseCount, { color: themeColors.mutedText }]}>
                      {workout.totalExercises === 0
                        ? 'Empty'
                        : `${workout.totalExercises} ${workout.totalExercises === 1 ? t('library.exercise') : t('library.exercises')}`
                      }
                    </Text>
                  </View>
                  <ChevronRight {...({ size: 16, color: themeColors.mutedText } as any)} />
                </View>
              </PressableScale>
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
      }}
      keyExtractor={(item) => item.id}
      ListEmptyComponent={
        <EmptyState
          message={t('library.empty.workouts')}
        />
      }
    />
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
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  iconContainer: {
    width: 58,
    height: 58,
    borderRadius: 8,
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
    marginBottom: 2,
  },
  exerciseCount: {
    ...typography.p3,
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
    paddingLeft: 86,
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
