import React, { useMemo, useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronRight, Dumbbell, UserPlus, Trash2 } from 'lucide-react-native';
import { PressableScale } from 'pressto';
import SquircleView from 'react-native-fast-squircle';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { FlashList } from '@shopify/flash-list';

import { typography } from '@/constants/typography';
import { haptics } from '@/utils/haptics';
import { useThemePreference, useCoachProfileStore } from '@/stores';
import { useTranslations } from '@/stores';
import { useTerminology } from '@/hooks/useTerminology';
import { PlatformIcon } from '@/components/ui/platform-icon';
import { useLibraryTab } from '@/stores';
import { useLibraryTabList } from '@/hooks/use-library-tab-list';
import { SwipeableRow } from '@/components/ui/swipeable-row';
import { ContextMenuWrapper, type DropdownMenuOption } from '@/components/ui/dropdown-menu';
import { getWorkouts, deleteWorkouts } from '@/services/coach/coach-workout-service';
import { EmptyState } from '@/components/ui/empty-state';
import { Dialog } from '@/components/ui/dialog';

export const WorkoutsTab = () => {
  const router = useRouter();
  const { colors: themeColors } = useThemePreference();
  const { t } = useTranslations();
  const terminology = useTerminology();
  const { registerOpenRow } = useLibraryTab();
  const queryClient = useQueryClient();
  const coachProfile = useCoachProfileStore((state) => state.profile);
  const isAuthenticated = !!coachProfile;

  // Error dialog state
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Fetch workouts directly with TanStack Query
  const { data: workouts = [], refetch } = useQuery({
    queryKey: ['workouts'],
    queryFn: async () => {
      const data = await getWorkouts();
      return data;
    },
    enabled: isAuthenticated,
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: false,
  });

  const { ListHeaderComponent, refreshControl, searchQuery, isRowOpen, closeOpenRow } = useLibraryTabList({
    searchPlaceholderKey: 'library.searchPlaceholders.workouts',
    refetch,
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

  // Delete mutation with optimistic updates
  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteWorkouts(id),
    onMutate: async (id) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['workouts'] });

      // Snapshot previous value
      const previousWorkouts = queryClient.getQueryData<typeof workouts>(['workouts']);

      // Optimistically remove from cache
      queryClient.setQueryData<typeof workouts>(['workouts'], (old) =>
        old?.filter((w) => w.id !== id) ?? []
      );

      // Return context with snapshot for rollback
      return { previousWorkouts };
    },
    onError: (error: Error, _id, context) => {
      // Rollback on error
      if (context?.previousWorkouts) {
        queryClient.setQueryData(['workouts'], context.previousWorkouts);
      }
      haptics.error();
      setErrorMessage(error.message || t('general.errorDeleting'));
      setShowErrorDialog(true);
    },
    onSettled: () => {
      // Refetch to ensure server state
      queryClient.invalidateQueries({ queryKey: ['workouts'] });
    },
    onSuccess: () => {
      haptics.success();
    },
  });


  // Already filtered above

  const handleWorkoutPress = (workout: typeof filteredWorkouts[0]) => {
    // If a row is open, just close it and prevent navigation
    if (isRowOpen) {
      closeOpenRow();
      return;
    }

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

  const handleAssign = (workout: typeof filteredWorkouts[0]) => {
    // If a row is open, just close it and prevent navigation
    if (isRowOpen) {
      closeOpenRow();
      return;
    }

    router.push(`/modals/shared/assign-to-clients-modal?type=workout&itemIds=${workout.id}`);
  };

  // Prefetch clients when long press happens to make modal open instantly
  const handleLongPress = useCallback(() => {
    queryClient.prefetchQuery({
      queryKey: ['clients'],
      queryFn: async () => {
        const { getClients } = await import('@/services/coach/coach-client-service');
        return getClients();
      },
    });
  }, [queryClient]);

  return (
    <>
      <FlashList
        data={filteredWorkouts}
        ListHeaderComponent={ListHeaderComponent}
        refreshControl={refreshControl}
        showsVerticalScrollIndicator={false}
        renderItem={({ item: workout, index }) => {
          const isLastItem = index === filteredWorkouts.length - 1;

          const dropdownOptions: DropdownMenuOption[] = [
            {
              label: terminology.assignToPlural,
              icon: { sf: 'person.badge.plus', IconComponent: UserPlus },
              onPress: () => handleAssign(workout),
            },
            {
              label: `${t('general.delete')} Workout`,
              icon: { sf: 'trash', IconComponent: Trash2 },
              destructive: true,
              onPress: () => deleteMutation.mutateAsync(workout.id),
            }
          ];

          return (
            <View>
              <SwipeableRow
                onDelete={() => deleteMutation.mutateAsync(workout.id)}
                onOpen={registerOpenRow}
                deleteConfirmTitle={t('general.deleteWorkout')}
              >
                <ContextMenuWrapper options={dropdownOptions} onLongPress={handleLongPress}>
                  <PressableScale
                    onPress={() => handleWorkoutPress(workout)}
                    style={styles.rowWrapper}
                  >
                    <View style={[styles.rowContent, { backgroundColor: 'transparent' }]}>
                      <SquircleView cornerSmoothing={1} style={[styles.iconContainer, { backgroundColor: themeColors.surfacePrimary }]}>
                        <PlatformIcon
                          sf="dumbbell.fill"
                          IconComponent={Dumbbell}
                          size={24}
                          color={themeColors.text}
                        />
                      </SquircleView>
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
                </ContextMenuWrapper>
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
        contentContainerStyle={{ paddingBottom: 40 }}
        ListEmptyComponent={
          <EmptyState
            message={t('library.empty.workouts')}
          />
        }
      />

      <Dialog
        visible={showErrorDialog}
        onClose={() => setShowErrorDialog(false)}
        title={t('general.error')}
        message={errorMessage}
        showCloseIcon={false}
        buttons={[{ label: t('general.ok'), onPress: () => setShowErrorDialog(false), variant: 'primary' }]}
      />
    </>
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
