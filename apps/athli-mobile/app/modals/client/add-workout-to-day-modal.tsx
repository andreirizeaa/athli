import React, { useCallback, useState, useMemo } from 'react';
import { Platform, StyleSheet, Text, View, Alert, ActivityIndicator } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { PressableOpacity } from 'pressto';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { X, Check, Dumbbell, ChevronRight } from 'lucide-react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { typography } from '@/constants/typography';
import { useThemePreference, useCoachProfileStore, useClientDetailStore } from '@/stores';
import { useTranslations } from '@/stores';
import { IconButton } from '@/components/ui/icon-button';
import { SearchBar } from '@/components/ui/search-bar';
import { Separator } from '@/components/ui/separator';
import { PlatformIcon } from '@/components/ui/platform-icon';
import { hexToRgba } from '@/utils/colorUtils';
import { fuzzyMatch } from '@/utils/searchUtils';
import { haptics } from '@/utils/haptics';
import { getWorkouts } from '@/services/coach/coach-workout-service';
import { assignWorkout } from '@/services/client/client-training-service';
import { EmptyState } from '@/components/ui/empty-state';
import type { Workout } from '@/stores/useLibraryStore';

export default function AddWorkoutToDayModal() {
  const router = useRouter();
  const { colors: themeColors } = useThemePreference();
  const { t } = useTranslations();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const coachProfile = useCoachProfileStore((state) => state.profile);
  const refreshSection = useClientDetailStore((state) => state.refreshSection);

  const params = useLocalSearchParams<{
    clientId: string;
    date: string;
  }>();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedWorkoutIds, setSelectedWorkoutIds] = useState<Set<string>>(new Set());

  // Fetch workouts
  const { data: workouts = [], isLoading } = useQuery({
    queryKey: ['workouts'],
    queryFn: async () => {
      const data = await getWorkouts();
      return data;
    },
    staleTime: 5 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  // Filter workouts based on search query
  const filteredWorkouts = useMemo(() => {
    if (!searchQuery.trim()) {
      return workouts;
    }

    return workouts.filter((workout) => {
      const name = workout.name.toLowerCase();
      const type = workout.type?.toLowerCase() || '';
      const query = searchQuery.toLowerCase();

      return fuzzyMatch(name, query) || fuzzyMatch(type, query);
    });
  }, [workouts, searchQuery]);

  // Assign workout mutation
  const assignMutation = useMutation({
    mutationFn: async (workoutIds: string[]) => {
      const promises = workoutIds.map((workoutId) =>
        assignWorkout({
          workoutId,
          clientId: params.clientId,
          date: params.date,
          coachId: coachProfile?.id,
        })
      );
      await Promise.all(promises);
    },
    onSuccess: () => {
      haptics.success();
      // Refresh the training calendar in the store
      refreshSection('training');
      // Invalidate workouts query to refresh the list
      queryClient.invalidateQueries({ queryKey: ['client-training', params.clientId] });
      handleClose();
    },
    onError: (error: Error) => {
      haptics.error();
      Alert.alert(t('general.error'), error.message || t('general.errorSaving'), [
        { text: t('general.ok') },
      ]);
    },
  });

  const handleClose = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    }
  }, [router]);

  const handleSave = useCallback(() => {
    if (selectedWorkoutIds.size === 0) return;
    assignMutation.mutate(Array.from(selectedWorkoutIds));
  }, [assignMutation, selectedWorkoutIds]);

  const canSave = selectedWorkoutIds.size > 0 && !assignMutation.isPending;

  const handleWorkoutToggle = useCallback((workoutId: string) => {
    setSelectedWorkoutIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(workoutId)) {
        newSet.delete(workoutId);
      } else {
        newSet.add(workoutId);
      }
      return newSet;
    });
  }, []);

  const headerHeight = Platform.OS === 'android' ? 56 + insets.top : 56;
  const gradientHeight = headerHeight + 12;

  return (
    <View style={[styles.container, { backgroundColor: themeColors.backgroundSecondary }]}>
      {/* Fixed Header with gradient */}
      <View style={[styles.fixedHeader, { height: headerHeight }]}>
        <LinearGradient
          colors={[
            hexToRgba(themeColors.backgroundSecondary, 1),
            hexToRgba(themeColors.backgroundSecondary, 0.85),
            hexToRgba(themeColors.backgroundSecondary, 0.5),
            hexToRgba(themeColors.backgroundSecondary, 0),
          ]}
          locations={[0, 0.5, 0.8, 1]}
          style={[styles.headerGradient, { height: gradientHeight }]}
          pointerEvents="none"
        />
        <View
          style={[
            styles.header,
            {
              paddingTop: Platform.OS === 'android' ? 12 + insets.top : 12,
            },
          ]}
        >
          <IconButton
            icon={{ sf: 'xmark', IconComponent: X }}
            onPress={handleClose}
            size="md"
            color={themeColors.text}
          />
          <Text style={[styles.title, { color: themeColors.text }]}>
            {t('clientDetail.training.addWorkoutModal.title')}
          </Text>
          {assignMutation.isPending ? (
            <View style={styles.loadingButton}>
              <ActivityIndicator size="small" color={themeColors.primary} />
            </View>
          ) : (
            <IconButton
              icon={{ sf: 'checkmark', IconComponent: Check }}
              onPress={handleSave}
              size="md"
              variant={canSave ? 'primary' : 'default'}
              disabled={!canSave}
            />
          )}
        </View>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={themeColors.primary} />
          </View>
        ) : (
          <FlashList
            data={filteredWorkouts}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => {
              const isSelected = selectedWorkoutIds.has(item.id);

              return (
                <PressableOpacity
                  onPress={() => handleWorkoutToggle(item.id)}
                  style={styles.workoutRow}
                >
                  <View
                    style={[styles.iconContainer, { backgroundColor: themeColors.surfacePrimary }]}
                  >
                    <PlatformIcon
                      sf="dumbbell.fill"
                      IconComponent={Dumbbell}
                      size={24}
                      color={themeColors.text}
                    />
                  </View>
                  <View style={styles.workoutInfo}>
                    <Text
                      style={[styles.workoutName, { color: themeColors.text }]}
                      numberOfLines={1}
                    >
                      {item.name}
                    </Text>
                    <Text style={[styles.workoutMeta, { color: themeColors.mutedText }]}>
                      {item.totalExercises === 0
                        ? 'Empty'
                        : `${item.totalExercises} ${item.totalExercises === 1 ? t('library.exercise') : t('library.exercises')}`}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.checkbox,
                      {
                        backgroundColor: isSelected ? themeColors.primary : 'transparent',
                        borderColor: isSelected ? themeColors.primary : themeColors.border,
                      },
                    ]}
                  >
                    {isSelected && (
                      <Check {...({ size: 16, color: themeColors.primaryForeground } as any)} />
                    )}
                  </View>
                </PressableOpacity>
              );
            }}
            ItemSeparatorComponent={() => <Separator style={styles.separator} />}
            contentContainerStyle={[styles.listContent, { paddingTop: headerHeight + 16 }]}
            ListHeaderComponent={
              <View style={styles.searchContainer}>
                <SearchBar
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder={t('clientDetail.training.addWorkoutModal.searchPlaceholder')}
                />
              </View>
            }
            ListEmptyComponent={
              <EmptyState
                message={t('clientDetail.training.addWorkoutModal.noWorkouts')}
              />
            }
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  fixedHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  headerGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  title: {
    ...typography.h6,
    flex: 1,
    textAlign: 'center',
  },
  loadingButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  listContent: {
    paddingBottom: 40,
  },
  workoutRow: {
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
  workoutInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  workoutName: {
    ...typography.p1,
    fontWeight: '600',
    marginBottom: 4,
  },
  workoutMeta: {
    ...typography.p3,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  separator: {
    marginLeft: 86,
    marginRight: 16,
  },
});
