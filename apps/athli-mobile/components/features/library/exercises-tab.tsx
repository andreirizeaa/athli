import React, { useCallback, useMemo } from 'react';
import { StyleSheet, Text, View, Alert } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { ChevronRight, Dumbbell, Play } from 'lucide-react-native';
import { PressableOpacity } from 'pressto';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';

import { typography } from '@/constants/typography';
import { useThemePreference, useCoachProfileStore } from '@/stores';
import { useTranslations } from '@/stores';
import { getExercises, deleteExercises, duplicateExercises, starExercises, archiveExercises } from '@/services/coach/coach-exercise-service';
import { PlatformIcon } from '@/components/ui/platform-icon';
import { SwipeableRow } from '@/components/ui/swipeable-row';
import { useLibraryTab } from '@/stores';
import { EmptyState } from '@/components/ui/empty-state';
import { EXERCISE_CATEGORY_OPTIONS, EQUIPMENT_OPTIONS } from '@/constants/training';

export const ExercisesTab = () => {
  const router = useRouter();
  const { colors: themeColors } = useThemePreference();
  const { t } = useTranslations();
  const { searchQuery, registerOpenRow, closeOpenRow } = useLibraryTab();
  const queryClient = useQueryClient();
  const coachProfile = useCoachProfileStore((state) => state.profile);
  const isAuthenticated = !!coachProfile;

  // Fetch exercises directly with TanStack Query
  const { data: exercises = [], isLoading, isError } = useQuery({
    queryKey: ['exercises'],
    queryFn: async () => {
      console.log('[ExercisesTab] Fetching exercises...');
      const data = await getExercises();
      console.log('[ExercisesTab] Received exercises:', data.length, 'items');
      return data;
    },
    enabled: isAuthenticated,
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: false,
  });

  // Filter exercises based on search query
  const filteredExercises = useMemo(() => {
    if (!searchQuery.trim()) return exercises;
    const lowerQuery = searchQuery.toLowerCase();
    return exercises.filter(exercise =>
      exercise.name.toLowerCase().includes(lowerQuery) ||
      exercise.category?.toLowerCase().includes(lowerQuery) ||
      exercise.equipment?.toLowerCase().includes(lowerQuery)
    );
  }, [exercises, searchQuery]);

  console.log('[ExercisesTab] Render:', {
    isAuthenticated,
    isLoading,
    isError,
    totalExercises: exercises.length,
    filteredExercises: filteredExercises.length,
    searchQuery
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteExercises(id),
    onSuccess: async () => {
      await queryClient.refetchQueries({ queryKey: ['exercises'] });
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
    mutationFn: (id: string) => duplicateExercises(id),
    onSuccess: async () => {
      await queryClient.refetchQueries({ queryKey: ['exercises'] });
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
    mutationFn: ({ id, starred }: { id: string; starred: boolean }) => starExercises(id, starred),
    onSuccess: async () => {
      await queryClient.refetchQueries({ queryKey: ['exercises'] });
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
    mutationFn: ({ id, archived }: { id: string; archived: boolean }) => archiveExercises(id, archived),
    onSuccess: async () => {
      await queryClient.refetchQueries({ queryKey: ['exercises'] });
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

  const handleExercisePress = useCallback((exercise: typeof filteredExercises[0]) => {
    closeOpenRow();
    router.push({
      pathname: '/modals/library/add-exercise-modal',
      params: {
        editingId: exercise.id,
        name: exercise.name,
        category: exercise.category || '',
        videoLink: exercise.video_link || '',
        instructions: exercise.description || '',
        muscleGroup: exercise.muscle_group?.[0] || '',
        equipment: exercise.equipment || '',
        modality: exercise.modality || '',
      },
    });
  }, [closeOpenRow, router]);

  const handleThumbnailPress = useCallback((exercise: typeof filteredExercises[0]) => {
    closeOpenRow();
    if (exercise.video_link) {
      router.push({
        pathname: '/library/file-preview',
        params: {
          uri: exercise.video_link,
          name: exercise.name,
          type: 'video',
          mimeType: 'video/youtube',
        },
      });
    }
  }, [closeOpenRow, router]);

  // Helper to get formatted label for category
  const getCategoryLabel = (value: string | null | undefined): string => {
    if (!value) return '';
    const option = EXERCISE_CATEGORY_OPTIONS.find(opt => opt.value === value);
    return option?.label || value;
  };

  // Helper to get formatted label for equipment
  const getEquipmentLabel = (value: string | null | undefined): string => {
    if (!value) return '';
    const option = EQUIPMENT_OPTIONS.find(opt => opt.value === value);
    return option?.label || value;
  };

  // Helper to extract video thumbnail URL
  const getVideoThumbnail = (videoLink: string | null | undefined): string | null => {
    if (!videoLink) return null;

    try {
      const url = new URL(videoLink);
      const hostname = url.hostname.toLowerCase();

      // YouTube
      if (hostname.includes('youtube.com')) {
        const videoId = url.searchParams.get('v');
        if (videoId) return `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
      } else if (hostname.includes('youtu.be')) {
        const videoId = url.pathname.slice(1);
        if (videoId) return `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
      }

      // Vimeo - Note: Vimeo thumbnails require API call, using placeholder
      if (hostname.includes('vimeo.com')) {
        return null; // Can't easily get Vimeo thumbnail without API
      }
    } catch {
      return null;
    }

    return null;
  };

  return (
    <View style={styles.container}>
      {/* Empty State */}
      {filteredExercises.length === 0 && (
        <EmptyState
          message={t('library.empty.exercises')}
        />
      )}

      {/* Exercise List */}
      {filteredExercises.map((exercise, index) => {
        const isLastItem = index === filteredExercises.length - 1;
        const thumbnailUrl = getVideoThumbnail(exercise.video_link);
        const categoryLabel = getCategoryLabel(exercise.category);
        const equipmentLabel = getEquipmentLabel(exercise.equipment);
        const hasCategory = Boolean(categoryLabel);
        const hasEquipment = Boolean(equipmentLabel);

        return (
          <View key={exercise.id}>
            <SwipeableRow
              onDelete={() => deleteMutation.mutateAsync(exercise.id)}
              onOpen={registerOpenRow}
              deleteConfirmTitle={`${t('general.delete')} ${exercise.name}?`}
            >
              <View style={styles.rowWrapper}>
                <View style={[styles.rowContent, { backgroundColor: themeColors.pageBackground }]}>
                  {/* Thumbnail - Separate Pressable */}
                  <PressableOpacity
                    onPress={() => handleThumbnailPress(exercise)}
                    style={styles.thumbnailWrapper}
                  >
                    {thumbnailUrl ? (
                      <View style={styles.videoThumbnailContainer}>
                        <Image
                          source={{ uri: thumbnailUrl }}
                          style={styles.thumbnailImage}
                          contentFit="cover"
                          transition={200}
                        />
                        <View style={styles.playOverlay}>
                          <Play {...({ color: "#FFFFFF", size: 16 } as any)} />
                        </View>
                      </View>
                    ) : (
                      <View style={[styles.iconContainer, { backgroundColor: themeColors.surfaceSecondary }]}>
                        <PlatformIcon
                          sf="figure.strengthtraining.traditional"
                          IconComponent={Dumbbell}
                          size={24}
                          color={themeColors.text}
                        />
                      </View>
                    )}
                  </PressableOpacity>

                  {/* Rest of row - Pressable for Edit */}
                  <PressableOpacity
                    onPress={() => handleExercisePress(exercise)}
                    style={styles.mainContentPressable}
                  >
                    <View style={styles.textContent}>
                      <Text
                        style={[styles.exerciseName, { color: themeColors.text }]}
                        numberOfLines={1}
                        ellipsizeMode="tail"
                      >
                        {exercise.name}
                      </Text>
                      {(hasCategory || hasEquipment) && (
                        <View style={styles.metaRow}>
                          {hasCategory && (
                            <Text style={[styles.metaText, { color: themeColors.mutedText }]}>
                              {categoryLabel}
                            </Text>
                          )}
                          {hasCategory && hasEquipment && (
                            <Text style={[styles.metaDot, { color: themeColors.mutedText }]}>•</Text>
                          )}
                          {hasEquipment && (
                            <Text style={[styles.metaText, { color: themeColors.mutedText }]}>
                              {equipmentLabel}
                            </Text>
                          )}
                        </View>
                      )}
                    </View>
                    <ChevronRight {...({ size: 16, color: themeColors.mutedText } as any)} />
                  </PressableOpacity>
                </View>
              </View>
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
  thumbnailWrapper: {
    marginRight: 12,
  },
  videoThumbnailContainer: {
    width: 44,
    height: 44,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#E0E0E0',
    position: 'relative',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  playOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainContentPressable: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  textContent: {
    flex: 1,
    marginRight: 8,
  },
  exerciseName: {
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    ...typography.p2,
    textAlign: 'center',
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
