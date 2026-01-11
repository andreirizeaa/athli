import React, { useMemo, useCallback } from 'react';
import { StyleSheet, Text, View, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronRight, Dumbbell } from 'lucide-react-native';
import { PressableOpacity } from 'pressto';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';

import { typography } from '@/constants/typography';
import { useThemePreference } from '@/stores';
import { useTranslations } from '@/stores';
import { PlatformIcon } from '@/components/ui/platform-icon';
import { useLibraryTab, useLibraryStore } from '@/stores';
import { SwipeableRow } from '@/components/ui/swipeable-row';
import { deleteWorkouts, duplicateWorkout, starWorkouts, archiveWorkouts } from '@/services/coach/coach-workout-service';
import { EmptyState } from '@/components/ui/empty-state';

const noTrainingAvatar = require('@/assets/avatars/no-training-avatar.png');

export const WorkoutsTab = () => {
  const router = useRouter();
  const { colors: themeColors } = useThemePreference();
  const { t } = useTranslations();
  const { searchQuery, registerOpenRow, closeOpenRow } = useLibraryTab();
  const queryClient = useQueryClient();

  // Get workouts from Zustand store
  const getFilteredWorkouts = useLibraryStore((state) => state.getFilteredWorkouts);
  const filteredWorkouts = useMemo(
    () => getFilteredWorkouts(searchQuery),
    [getFilteredWorkouts, searchQuery]
  );

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteWorkouts(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workouts'] });
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workouts'] });
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workouts'] });
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workouts'] });
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

  const handleWorkoutPress = (workoutId: string) => {
    closeOpenRow();
    router.push({
      pathname: '/library/workout/[id]',
      params: { id: workoutId },
    });
  };

  const handleDelete = useCallback((id: string) => {
    Alert.alert(
      t('general.confirmDelete'),
      t('general.confirmDeleteMessage'),
      [
        { text: t('general.cancel'), style: 'cancel' },
        {
          text: t('general.delete'),
          style: 'destructive',
          onPress: () => deleteMutation.mutate(id)
        },
      ]
    );
  }, [deleteMutation, t]);

  return (
    <View style={styles.container}>
      {/* Empty State */}
      {filteredWorkouts.length === 0 && (
        <EmptyState
          image={noTrainingAvatar}
          message={t('library.empty.workouts')}
        />
      )}

      {/* Workout List */}
      {filteredWorkouts.map((workout, index) => {
        const isLastItem = index === filteredWorkouts.length - 1;
        return (
          <View key={workout.id}>
            <SwipeableRow
              onDelete={() => handleDelete(workout.id)}
              onOpen={registerOpenRow}
              deleteConfirmTitle={`${t('general.delete')} ${workout.name}?`}
            >
              <PressableOpacity
                onPress={() => handleWorkoutPress(workout.id)}
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
                    <View style={styles.metaRow}>
                      <Text style={[styles.metaText, { color: themeColors.mutedText }]}>
                        {workout.type}
                      </Text>
                      <Text style={[styles.metaDot, { color: themeColors.mutedText }]}>•</Text>
                      <Text style={[styles.metaText, { color: themeColors.mutedText }]}>
                        {workout.difficulty}
                      </Text>
                    </View>
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
