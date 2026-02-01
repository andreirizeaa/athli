import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { StyleSheet, Text, View, ActivityIndicator } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useRouter, Stack, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, Play } from 'lucide-react-native';
import { Image } from 'expo-image';
import { PressableOpacity, PressableScale } from 'pressto';

import { typography } from '@/constants/typography';
import { useThemePreference, useTranslations, useClientDetailStore } from '@/stores';
import { IconButton } from '@/components/ui/icon-button';
import { SearchBar } from '@/components/ui/search-bar';
import { Separator } from '@/components/ui/separator';
import { StatusBarBlur } from '@/components/ui/status-bar-blur';
import { getClientUniqueExercises, type UniqueExercise } from '@/services/client/client-training-service';
import { useExerciseThumbnails } from '@/hooks/useExerciseThumbnails';


export default function ClientProgressScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors: themeColors } = useThemePreference();
  const { t } = useTranslations();
  const insets = useSafeAreaInsets();
  const iconColor = themeColors.text;

  const coachId = useClientDetailStore((state) => state.coachId);
  const storeExercises = useClientDetailStore((state) => state.uniqueExercises);
  const isLoadingFromStore = useClientDetailStore((state) => state.isLoadingUniqueExercises);
  const setStoreUniqueExercises = useClientDetailStore((state) => state.setUniqueExercises);

  const [exercises, setExercises] = useState<UniqueExercise[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Use store data if available, otherwise fetch
  useEffect(() => {
    // If store has data, use it
    if (storeExercises.length > 0) {
      setExercises(storeExercises);
      setIsLoading(false);
      return;
    }

    // If store is still loading, wait
    if (isLoadingFromStore) {
      return;
    }

    // Otherwise fetch the data
    const loadExercises = async () => {
      if (!id || !coachId) return;
      setIsLoading(true);
      try {
        const data = await getClientUniqueExercises({ clientId: id, coachId });
        setExercises(data);
        setStoreUniqueExercises(data);
      } catch (error) {
        console.error('Failed to load unique exercises:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadExercises();
  }, [id, coachId, storeExercises, isLoadingFromStore, setStoreUniqueExercises]);

  // Transform exercises for thumbnail hook
  const exercisesForThumbnails = useMemo(() => {
    return exercises.map((ex) => ({
      exerciseId: ex.id,
      name: ex.name,
      rawThumbnailUrl: ex.rawThumbnailUrl,
    }));
  }, [exercises]);

  const { getThumbnailUrl } = useExerciseThumbnails(exercisesForThumbnails as any);

  // Filter exercises by search
  const filteredExercises = useMemo(() => {
    if (!searchQuery.trim()) {
      return exercises;
    }
    const query = searchQuery.toLowerCase();
    return exercises.filter((exercise) =>
      exercise.name.toLowerCase().includes(query)
    );
  }, [searchQuery, exercises]);

  const handleBackPress = () => {
    router.back();
  };

  const handleExercisePress = useCallback((exercise: UniqueExercise) => {
    router.push({
      pathname: '/client/[id]/exercise-detail',
      params: {
        id,
        exerciseId: exercise.id,
        exerciseName: exercise.name,
      },
    });
  }, [router, id]);

  const handleThumbnailPress = useCallback((exercise: UniqueExercise) => {
    router.push({
      pathname: '/modals/workout/exercise-details-modal',
      params: {
        name: exercise.name,
        exerciseId: exercise.id,
      },
    });
  }, [router]);

  const renderExerciseItem = useCallback(({ item }: { item: UniqueExercise }) => {
    const thumbnailUrl = getThumbnailUrl(item.rawThumbnailUrl);

    return (
      <PressableOpacity
        onPress={() => handleExercisePress(item)}
        style={styles.exerciseItem}
      >
        <PressableScale onPress={() => handleThumbnailPress(item)}>
          <View style={styles.thumbnailContainer}>
            {thumbnailUrl ? (
              <Image
                source={{ uri: thumbnailUrl }}
                style={styles.thumbnail}
                contentFit="cover"
                transition={200}
              />
            ) : (
              <View style={[styles.thumbnail, styles.placeholderThumbnail, { backgroundColor: themeColors.surfaceSecondary }]}>
                <Play {...({ size: 16, color: themeColors.mutedText } as any)} />
              </View>
            )}
          </View>
        </PressableScale>
        <View style={styles.infoContainer}>
          <Text style={[styles.exerciseName, { color: themeColors.text }]} numberOfLines={2}>
            {item.name}
          </Text>
        </View>
      </PressableOpacity>
    );
  }, [getThumbnailUrl, handleExercisePress, handleThumbnailPress, themeColors]);

  const ListHeader = useMemo(() => (
    <>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 4 }]}>
        <IconButton
          icon={{ sf: 'arrow.left', IconComponent: ChevronLeft }}
          onPress={handleBackPress}
          size="md"
          color={iconColor}
        />
        <Text style={[styles.headerTitle, { color: themeColors.text }]}>
          {t('clientDetail.sections.progress')}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder={t('general.searchPlaceholder')}
        />
        <Text style={[styles.countText, { color: themeColors.mutedText }]}>
          {filteredExercises.length} {filteredExercises.length === 1 ? t('library.exercise') : t('library.exercises')}
        </Text>
      </View>
    </>
  ), [insets.top, themeColors, iconColor, searchQuery, filteredExercises.length, t, handleBackPress]);

  const ListEmpty = useMemo(() => (
    isLoading || isLoadingFromStore ? (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={themeColors.primary} />
      </View>
    ) : exercises.length === 0 ? (
      <View style={styles.emptyContainer}>
        <Text style={[styles.emptyText, { color: themeColors.mutedText }]}>
          {t('progress.noExerciseHistory')}
        </Text>
      </View>
    ) : (
      <View style={styles.noResultsContainer}>
        <Text style={[styles.emptyText, { color: themeColors.mutedText }]}>
          {t('general.noResultsFound')}
        </Text>
      </View>
    )
  ), [isLoading, isLoadingFromStore, exercises.length, themeColors, t]);

  const ListFooter = useMemo(() => (
    <View style={{ height: insets.bottom + 32 }} />
  ), [insets.bottom]);

  return (
    <View style={[styles.screen, { backgroundColor: themeColors.backgroundPrimary }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <FlashList
        data={filteredExercises}
        keyExtractor={(item) => item.id}
        renderItem={renderExerciseItem}
        ItemSeparatorComponent={() => <Separator style={styles.separator} />}
        estimatedItemSize={64}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={ListEmpty}
        ListFooterComponent={ListFooter}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
      <StatusBarBlur />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 8,
    paddingHorizontal: 16,
  },
  headerTitle: {
    ...typography.h5,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 44,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 8,
  },
  countText: {
    ...typography.p2,
    fontSize: 13,
  },
  listContent: {
    paddingBottom: 40,
  },
  exerciseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  thumbnailContainer: {
    position: 'relative',
  },
  thumbnail: {
    width: 64,
    height: 64,
    borderRadius: 10,
  },
  placeholderThumbnail: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoContainer: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  exerciseName: {
    ...typography.p1,
    fontWeight: '600',
  },
  separator: {
    marginLeft: 92,
    marginRight: 16,
  },
  loadingContainer: {
    paddingVertical: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    paddingVertical: 60,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  noResultsContainer: {
    paddingVertical: 60,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyText: {
    ...typography.p1,
    textAlign: 'center',
  },
});
