import React, { useCallback, useMemo, useState } from 'react';
import { StyleSheet, Text, View, ActivityIndicator, Linking } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { ChevronRight, Dumbbell, UserPlus, Trash2, Play } from 'lucide-react-native';
import { PressableScale } from 'pressto';
import SquircleView from 'react-native-fast-squircle';

import { Image } from 'expo-image';
import { FlashList } from '@shopify/flash-list';

import {
  useVideoThumbnail,
  isSupabaseUrl,
  getYouTubeThumbnail,
  isYouTubeUrl,
  isVimeoUrl,
} from '@/hooks/use-video-thumbnail';

import { typography } from '@/constants/typography';
import { haptics } from '@/utils/haptics';
import { useThemePreference, useCoachProfileStore } from '@/stores';
import { useTranslations } from '@/stores';
import { getExercises, deleteExercises, duplicateExercises, starExercises, archiveExercises } from '@/services/coach/coach-exercise-service';
import { PlatformIcon } from '@/components/ui/platform-icon';
import { SwipeableRow } from '@/components/ui/swipeable-row';
import { ContextMenuWrapper, type DropdownMenuOption } from '@/components/ui/dropdown-menu';
import { useLibraryTab } from '@/stores';
import { useLibraryTabList } from '@/hooks/use-library-tab-list';
import { EmptyState } from '@/components/ui/empty-state';
import { Dialog } from '@/components/ui/dialog';
import { EXERCISE_CATEGORY_OPTIONS, EQUIPMENT_OPTIONS } from '@athli/shared-types';

type ExerciseThumbnailProps = {
  videoLink: string | null | undefined;
  themeColors: { surfacePrimary: string; text: string; primary: string };
  onPress: () => void;
};

const ExerciseThumbnail = ({ videoLink, themeColors, onPress }: ExerciseThumbnailProps) => {
  const hasVideo = !!videoLink && videoLink.trim().length > 0;

  // Check video platform
  const isYouTube = isYouTubeUrl(videoLink);
  const isVimeo = isVimeoUrl(videoLink);
  const hasSupabaseVideo = isSupabaseUrl(videoLink);

  // Get YouTube thumbnail directly
  const youtubeThumbnail = getYouTubeThumbnail(videoLink);

  // Generate thumbnail for Supabase videos
  const { thumbnailUrl: supabaseThumbnail, isLoading } = useVideoThumbnail(videoLink, {
    enabled: hasSupabaseVideo,
  });

  // Determine which thumbnail to use
  const thumbnailUrl = youtubeThumbnail || supabaseThumbnail;
  const isLoadingThumbnail = hasSupabaseVideo && isLoading;

  return (
    <PressableScale onPress={onPress} style={styles.thumbnailWrapper}>
      {isLoadingThumbnail ? (
        <SquircleView
          cornerSmoothing={1}
          style={[styles.iconContainer, { backgroundColor: themeColors.surfacePrimary }]}
        >
          <ActivityIndicator size="small" color={themeColors.text} />
        </SquircleView>
      ) : thumbnailUrl ? (
        <View style={styles.videoThumbnailContainer}>
          <Image
            source={{ uri: thumbnailUrl }}
            style={styles.thumbnailImage}
            contentFit="cover"
            transition={200}
          />
          {/* Play icon overlay */}
          <View style={styles.playIconOverlay}>
            <View style={styles.playIconCircle}>
              <Play size={10} color="#fff" fill="#fff" />
            </View>
          </View>
        </View>
      ) : isYouTube ? (
        // YouTube video but no thumbnail - show YouTube icon
        <SquircleView
          cornerSmoothing={1}
          style={[styles.iconContainer, { backgroundColor: themeColors.surfacePrimary }]}
        >
          <Image
            source={require('@/assets/icons/youtube.png')}
            style={styles.platformIcon}
            contentFit="contain"
          />
        </SquircleView>
      ) : isVimeo ? (
        // Vimeo video but no thumbnail - show Vimeo icon
        <SquircleView
          cornerSmoothing={1}
          style={[styles.iconContainer, { backgroundColor: themeColors.surfacePrimary }]}
        >
          <Image
            source={require('@/assets/icons/vimeo.png')}
            style={styles.platformIcon}
            contentFit="contain"
          />
        </SquircleView>
      ) : hasVideo ? (
        // Other video (e.g., Supabase without thumbnail) - show play button
        <SquircleView
          cornerSmoothing={1}
          style={[styles.iconContainer, { backgroundColor: themeColors.surfacePrimary }]}
        >
          <View style={[styles.videoIndicator, { backgroundColor: themeColors.primary }]}>
            <Play size={16} color="#fff" fill="#fff" />
          </View>
        </SquircleView>
      ) : (
        // No video link - show dumbbell
        <SquircleView
          cornerSmoothing={1}
          style={[styles.iconContainer, { backgroundColor: themeColors.surfacePrimary }]}
        >
          <PlatformIcon
            sf="figure.strengthtraining.traditional"
            IconComponent={Dumbbell}
            size={24}
            color={themeColors.text}
          />
        </SquircleView>
      )}
    </PressableScale>
  );
};

export const ExercisesTab = () => {
  const router = useRouter();
  const { colors: themeColors } = useThemePreference();
  const { t } = useTranslations();
  const { registerOpenRow } = useLibraryTab();
  const queryClient = useQueryClient();
  const coachProfile = useCoachProfileStore((state) => state.profile);
  const isAuthenticated = !!coachProfile;

  // Dialog state
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Fetch exercises directly with TanStack Query
  const { data: exercises = [], refetch } = useQuery({
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

  const { ListHeaderComponent, refreshControl, searchQuery, isRowOpen, closeOpenRow } = useLibraryTabList({
    searchPlaceholderKey: 'library.searchPlaceholders.exercises',
    refetch,
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
    totalExercises: exercises.length,
    filteredExercises: filteredExercises.length,
    searchQuery
  });

  // Delete mutation with optimistic updates
  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteExercises(id),
    onMutate: async (id) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['exercises'] });

      // Snapshot previous value
      const previousExercises = queryClient.getQueryData<typeof exercises>(['exercises']);

      // Optimistically remove from cache
      queryClient.setQueryData<typeof exercises>(['exercises'], (old) =>
        old?.filter((e) => e.id !== id) ?? []
      );

      // Return context with snapshot for rollback
      return { previousExercises };
    },
    onError: (error: Error, _id, context) => {
      // Rollback on error
      if (context?.previousExercises) {
        queryClient.setQueryData(['exercises'], context.previousExercises);
      }
      haptics.error();
      setErrorMessage(error.message || t('general.errorDeleting'));
      setShowErrorDialog(true);
    },
    onSettled: () => {
      // Refetch to ensure server state
      queryClient.invalidateQueries({ queryKey: ['exercises'] });
    },
    onSuccess: () => {
      haptics.success();
    },
  });

  // Duplicate mutation
  const duplicateMutation = useMutation({
    mutationFn: (id: string) => duplicateExercises(id),
    onSuccess: async () => {
      await queryClient.refetchQueries({ queryKey: ['exercises'] });
      haptics.success();
    },
    onError: (error: Error) => {
      haptics.error();
      setErrorMessage(error.message || t('general.errorDuplicating'));
      setShowErrorDialog(true);
    },
  });

  // Star mutation
  const starMutation = useMutation({
    mutationFn: ({ id, starred }: { id: string; starred: boolean }) => starExercises(id, starred),
    onSuccess: async () => {
      await queryClient.refetchQueries({ queryKey: ['exercises'] });
      haptics.success();
    },
    onError: (error: Error) => {
      haptics.error();
      setErrorMessage(error.message || t('general.errorUpdating'));
      setShowErrorDialog(true);
    },
  });

  // Archive mutation
  const archiveMutation = useMutation({
    mutationFn: ({ id, archived }: { id: string; archived: boolean }) => archiveExercises(id, archived),
    onSuccess: async () => {
      await queryClient.refetchQueries({ queryKey: ['exercises'] });
      haptics.success();
    },
    onError: (error: Error) => {
      haptics.error();
      setErrorMessage(error.message || t('general.errorUpdating'));
      setShowErrorDialog(true);
    },
  });

  const handleExercisePress = useCallback((exercise: typeof filteredExercises[0]) => {
    // If a row is open, just close it and prevent navigation
    if (isRowOpen) {
      closeOpenRow();
      return;
    }

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
  }, [isRowOpen, closeOpenRow, router]);

  const handleThumbnailPress = useCallback((exercise: typeof filteredExercises[0]) => {
    // If a row is open, just close it and prevent navigation
    if (isRowOpen) {
      closeOpenRow();
      return;
    }

    closeOpenRow();
    if (exercise.video_link) {
      // Open YouTube and Vimeo links externally
      if (isYouTubeUrl(exercise.video_link) || isVimeoUrl(exercise.video_link)) {
        Linking.openURL(exercise.video_link);
        return;
      }
      // Use internal player for Supabase/custom videos
      router.push({
        pathname: '/modals/files/file-viewer-modal',
        params: {
          uri: exercise.video_link,
          filename: exercise.name,
          mimeType: 'video/mp4',
        },
      });
    }
  }, [isRowOpen, closeOpenRow, router]);

  const handleAssign = useCallback((exercise: typeof filteredExercises[0]) => {
    // If a row is open, just close it and prevent navigation
    if (isRowOpen) {
      closeOpenRow();
      return;
    }

    router.push(`/modals/shared/assign-to-clients-modal?type=exercise&itemIds=${exercise.id}`);
  }, [isRowOpen, closeOpenRow, router]);

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


  const renderItem = useCallback(({ item: exercise, index }: { item: typeof filteredExercises[0]; index: number }) => {
    const isLastItem = index === filteredExercises.length - 1;
    const categoryLabel = getCategoryLabel(exercise.category);
    const equipmentLabel = getEquipmentLabel(exercise.equipment);
    const hasCategory = Boolean(categoryLabel);
    const hasEquipment = Boolean(equipmentLabel);

    const dropdownOptions: DropdownMenuOption[] = [
      {
        label: t('general.assign'),
        icon: { sf: 'person.badge.plus', IconComponent: UserPlus },
        onPress: () => handleAssign(exercise),
      },
      {
        label: `${t('general.delete')} Exercise`,
        icon: { sf: 'trash', IconComponent: Trash2 },
        destructive: true,
        onPress: () => deleteMutation.mutateAsync(exercise.id),
      }
    ];

    return (
      <View>
        <SwipeableRow
          onDelete={() => deleteMutation.mutateAsync(exercise.id)}
          onOpen={registerOpenRow}
          deleteConfirmTitle={`${t('general.delete')} ${exercise.name}?`}
        >
          <ContextMenuWrapper options={dropdownOptions} onLongPress={handleLongPress}>
            <View style={styles.rowWrapper}>
              <View style={[styles.rowContent, { backgroundColor: 'transparent' }]}>
                {/* Thumbnail - Using ExerciseThumbnail component */}
                <ExerciseThumbnail
                  videoLink={exercise.video_link}
                  themeColors={themeColors}
                  onPress={() => handleThumbnailPress(exercise)}
                />

                {/* Rest of row - Pressable for Edit */}
                <PressableScale
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
                </PressableScale>
              </View>
            </View>
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
  }, [filteredExercises.length, themeColors, t, deleteMutation, registerOpenRow, handleThumbnailPress, handleExercisePress, handleAssign, handleLongPress]);

  return (
    <>
      <FlashList
        data={filteredExercises}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 40 }}
        ListHeaderComponent={ListHeaderComponent}
        refreshControl={refreshControl}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <EmptyState
            message={t('library.empty.exercises')}
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
  thumbnailWrapper: {
    marginRight: 12,
  },
  videoThumbnailContainer: {
    width: 58,
    height: 58,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#E0E0E0',
    position: 'relative',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  playIconOverlay: {
    position: 'absolute',
    bottom: 4,
    right: 4,
  },
  playIconCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoIndicator: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  platformIcon: {
    width: 32,
    height: 32,
  },
  iconContainer: {
    width: 58,
    height: 58,
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
    paddingLeft: 86,
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
