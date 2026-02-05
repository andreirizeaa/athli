import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { StyleSheet, Text, View, Platform, ActivityIndicator } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { X, Check, Filter, Play } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { PressableOpacity, PressableScale } from 'pressto';

import { typography } from '@/constants/typography';
import { useThemePreference } from '@/stores';
import { useTranslations } from '@/stores';
import { IconButton } from '@/components/ui/icon-button';
import { SearchBar } from '@/components/ui/search-bar';
import { Separator } from '@/components/ui/separator';
import { hexToRgba } from '@/utils/colorUtils';
import { useModalCallbacksStore } from '@/stores/useModalCallbacksStore';
import { useAllExercises, type Exercise, type ExerciseFilters } from '@/hooks/useAllExercises';
import { useExerciseThumbnails } from '@/hooks/useExerciseThumbnails';
import { getYouTubeThumbnail, isYouTubeUrl } from '@/hooks/use-video-thumbnail';
import { useQuery } from '@tanstack/react-query';
import { getExercises as getCoachExercises } from '@/services/coach/coach-exercise-service';

// Re-export Exercise type for use by other components
export type { Exercise } from '@/hooks/useAllExercises';

export default function AddExerciseToBuilderModal() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { colors: themeColors } = useThemePreference();
    const { t } = useTranslations();
    const { multiple, title } = useLocalSearchParams<{ multiple?: string, title?: string }>();
    const isMultiple = multiple === 'true';

    const {
        triggerExerciseSelect,
        triggerExercisesSelect,
        setFilterSelectCallback,
    } = useModalCallbacksStore();

    const [searchQuery, setSearchQuery] = useState('');
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [filters, setFilters] = useState<ExerciseFilters>({});

    // Load coach (custom) exercises
    const { data: coachExercisesData = [], isLoading: isLoadingCoach } = useQuery({
        queryKey: ['exercises'],
        queryFn: getCoachExercises,
        staleTime: 5 * 60 * 1000,
    });

    // Transform coach exercises to match Exercise type
    const transformedCoachExercises: Exercise[] = useMemo(() => {
        return coachExercisesData.map((ex) => ({
            exerciseId: ex.id,
            name: ex.name,
            imageUrl: '',
            equipments: ex.category ? [ex.category] : [],
            bodyParts: ex.muscle_group?.slice(0, 1) || [],
            exerciseType: 'weight_reps',
            targetMuscles: ex.muscle_group || [],
            secondaryMuscles: [],
            videoUrl: ex.video_link || '',
            keywords: [ex.name, ex.category, ex.difficulty, ...(ex.muscle_group || [])].filter(Boolean) as string[],
            overview: ex.description || '',
            instructions: [],
            exerciseTips: [],
            variations: [],
            relatedExerciseIds: [],
            difficulty: ex.difficulty,
            category: ex.category,
            source: 'custom' as const,
            rawThumbnailUrl: undefined,
        }));
    }, [coachExercisesData]);

    // Use the new hook for loading all exercises with in-memory search/filter
    const {
        exercises: musclewikiExercises,
        total,
        totalCached,
        isLoading: isLoadingMusclewiki,
        isFetching,
        isSearching,
        hasMore,
        loadMore,
        error,
    } = useAllExercises(searchQuery, filters);

    // Filter coach exercises based on search and filters
    const filteredCoachExercises = useMemo(() => {
        let result = transformedCoachExercises;

        // Apply search
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            result = result.filter((ex) =>
                ex.name.toLowerCase().includes(query) ||
                ex.category?.toLowerCase().includes(query) ||
                ex.targetMuscles.some((m) => m.toLowerCase().includes(query))
            );
        }

        // Apply filters
        if (filters.categories?.length) {
            result = result.filter(
                (ex) => ex.category && filters.categories?.includes(ex.category)
            );
        }

        if (filters.muscles?.length) {
            result = result.filter((ex) =>
                ex.targetMuscles.some((m) => filters.muscles?.includes(m))
            );
        }

        if (filters.difficulties?.length) {
            result = result.filter(
                (ex) => ex.difficulty && filters.difficulties?.includes(ex.difficulty)
            );
        }

        return result;
    }, [transformedCoachExercises, searchQuery, filters]);

    // Merge coach exercises at top, then MuscleWiki exercises
    const exercises = useMemo(() => {
        return [...filteredCoachExercises, ...musclewikiExercises];
    }, [filteredCoachExercises, musclewikiExercises]);

    const isLoading = isLoadingCoach || isLoadingMusclewiki;

    // Use the thumbnails hook for progressive loading
    const { getThumbnailUrl, isLoading: isThumbnailsLoading } = useExerciseThumbnails(exercises);

    // Set up filter callback to receive selections from filter modal
    useEffect(() => {
        setFilterSelectCallback((newFilters) => {
            setFilters({
                muscles: newFilters.muscles,
                categories: newFilters.categories,
                difficulties: newFilters.difficulties,
            });
        });

        return () => {
            setFilterSelectCallback(() => {});
        };
    }, [setFilterSelectCallback]);

    // Count active filters
    const activeFilterCount = useMemo(() => {
        return (filters.muscles?.length || 0) +
            (filters.categories?.length || 0) +
            (filters.difficulties?.length || 0);
    }, [filters]);

    const handleClose = () => {
        router.back();
    };

    const handleSelectExercise = useCallback((exercise: Exercise) => {
        if (isMultiple) {
            setSelectedIds(prev =>
                prev.includes(exercise.exerciseId)
                    ? prev.filter(id => id !== exercise.exerciseId)
                    : [...prev, exercise.exerciseId]
            );
        } else {
            // Get thumbnail URL for the exercise
            // For custom exercises with YouTube videos, use YouTube thumbnail
            let thumbnailUrl: string | undefined;
            if (exercise.source === 'custom' && exercise.videoUrl && isYouTubeUrl(exercise.videoUrl)) {
                thumbnailUrl = getYouTubeThumbnail(exercise.videoUrl) || undefined;
            } else {
                thumbnailUrl = getThumbnailUrl(exercise.rawThumbnailUrl);
            }

            // Transform to expected format
            triggerExerciseSelect({
                exerciseId: exercise.exerciseId,
                name: exercise.name,
                imageUrl: thumbnailUrl || exercise.imageUrl,
                equipments: exercise.equipments,
                bodyParts: exercise.bodyParts,
                exerciseType: exercise.exerciseType,
                targetMuscles: exercise.targetMuscles,
                secondaryMuscles: exercise.secondaryMuscles,
                videoUrl: exercise.videoUrl,
                keywords: exercise.keywords,
                overview: exercise.overview,
                instructions: exercise.instructions,
                exerciseTips: exercise.exerciseTips,
                variations: exercise.variations,
                relatedExerciseIds: exercise.relatedExerciseIds,
                category: exercise.category,
            });
            router.back();
        }
    }, [isMultiple, triggerExerciseSelect, getThumbnailUrl, router]);

    const handleConfirmSelection = useCallback(() => {
        const selectedExercises = exercises
            .filter(ex => selectedIds.includes(ex.exerciseId))
            .map(ex => {
                // For custom exercises with YouTube videos, use YouTube thumbnail
                let thumbnailUrl: string | undefined;
                if (ex.source === 'custom' && ex.videoUrl && isYouTubeUrl(ex.videoUrl)) {
                    thumbnailUrl = getYouTubeThumbnail(ex.videoUrl) || undefined;
                } else {
                    thumbnailUrl = getThumbnailUrl(ex.rawThumbnailUrl);
                }
                return {
                    exerciseId: ex.exerciseId,
                    name: ex.name,
                    imageUrl: thumbnailUrl || ex.imageUrl,
                    equipments: ex.equipments,
                    bodyParts: ex.bodyParts,
                    exerciseType: ex.exerciseType,
                    targetMuscles: ex.targetMuscles,
                    secondaryMuscles: ex.secondaryMuscles,
                    videoUrl: ex.videoUrl,
                    keywords: ex.keywords,
                    overview: ex.overview,
                    instructions: ex.instructions,
                    exerciseTips: ex.exerciseTips,
                    variations: ex.variations,
                    relatedExerciseIds: ex.relatedExerciseIds,
                    category: ex.category,
                };
            });
        triggerExercisesSelect(selectedExercises);
        router.back();
    }, [exercises, selectedIds, getThumbnailUrl, triggerExercisesSelect, router]);

    const handleOpenFilterModal = useCallback(() => {
        router.push({
            pathname: '/modals/workout/exercise-filter-modal',
            params: {
                initialMuscles: filters.muscles?.join(',') || '',
                initialCategories: filters.categories?.join(',') || '',
                initialDifficulties: filters.difficulties?.join(',') || '',
            },
        });
    }, [router, filters]);


    const headerHeight = Platform.OS === 'android' ? 56 + insets.top : 56;
    const gradientHeight = headerHeight + 12;

    const renderExerciseItem = useCallback(({ item }: { item: Exercise }) => {
        const selectedIndex = selectedIds.indexOf(item.exerciseId);
        const isSelected = selectedIndex !== -1;

        // For custom exercises, use YouTube thumbnail if available
        // For MuscleWiki exercises, use the cached thumbnail system
        let thumbnailUrl: string | undefined;
        if (item.source === 'custom' && item.videoUrl) {
            if (isYouTubeUrl(item.videoUrl)) {
                thumbnailUrl = getYouTubeThumbnail(item.videoUrl) || undefined;
            }
            // For Supabase/other videos, thumbnailUrl stays undefined (shows placeholder)
        } else {
            thumbnailUrl = getThumbnailUrl(item.rawThumbnailUrl) || undefined;
        }

        const handleThumbnailPress = () => {
            router.push({
                pathname: '/modals/workout/exercise-details-modal',
                params: {
                    name: item.name,
                    exerciseId: item.exerciseId,
                    musclewikiId: item.musclewikiId,
                }
            });
        };

        return (
            <PressableOpacity
                onPress={() => handleSelectExercise(item)}
                style={styles.exerciseItem}
            >
                <PressableScale onPress={handleThumbnailPress}>
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
                        {/* Play button overlay */}
                        <View style={styles.playOverlay}>
                            <Play size={10} />
                        </View>
                    </View>
                </PressableScale>
                <View style={styles.infoContainer}>
                    <Text style={[styles.exerciseName, { color: themeColors.text }]}>
                        {item.name}
                    </Text>
                </View>
                {isMultiple && (
                    <View style={[
                        styles.checkbox,
                        { borderColor: isSelected ? themeColors.primary : themeColors.border },
                        isSelected && { backgroundColor: themeColors.primary },
                    ]}>
                        {isSelected && (
                            <Text style={[styles.selectionNumber, { color: themeColors.primaryForeground }]}>
                                {selectedIndex + 1}
                            </Text>
                        )}
                    </View>
                )}
            </PressableOpacity>
        );
    }, [selectedIds, getThumbnailUrl, handleSelectExercise, isMultiple, themeColors, router]);

    const hasActiveFilters = activeFilterCount > 0;

    return (
        <View style={[styles.container, { backgroundColor: themeColors.backgroundSecondary }]}>
            {/* Header */}
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
                        {title || (isMultiple ? 'Add Exercises' : 'Add Exercise')}
                    </Text>
                    {isMultiple ? (
                        <IconButton
                            icon={{ sf: 'checkmark', IconComponent: Check }}
                            onPress={handleConfirmSelection}
                            size="md"
                            variant={selectedIds.length > 0 ? 'primary' : 'default'}
                            disabled={selectedIds.length === 0}
                        />
                    ) : (
                        <View style={{ width: 44 }} />
                    )}
                </View>
            </View>

            <View style={styles.content}>
                <FlashList
                    data={exercises}
                    keyExtractor={(item) => item.exerciseId}
                    renderItem={renderExerciseItem}
                    ItemSeparatorComponent={() => <Separator style={styles.separator} />}
                    contentContainerStyle={[styles.listContent, { paddingTop: headerHeight + 16 }]}
                    ListHeaderComponent={
                        <View style={styles.searchContainer}>
                            <View style={styles.searchRow}>
                                <View style={styles.searchBarWrapper}>
                                    <SearchBar
                                        value={searchQuery}
                                        onChangeText={setSearchQuery}
                                        placeholder={t('general.searchPlaceholder')}
                                    />
                                </View>
                                <View style={styles.filterButtonContainer}>
                                    <IconButton
                                        icon={{ sf: 'line.horizontal.3.decrease', IconComponent: Filter }}
                                        onPress={handleOpenFilterModal}
                                        size="md"
                                        color={hasActiveFilters ? themeColors.primary : themeColors.text}
                                    />
                                    {activeFilterCount > 0 && (
                                        <View style={[styles.filterBadge, { backgroundColor: themeColors.primary }]}>
                                            <Text style={[styles.filterBadgeText, { color: themeColors.primaryForeground }]}>
                                                {activeFilterCount}
                                            </Text>
                                        </View>
                                    )}
                                </View>
                            </View>
                            {/* Exercise count */}
                            <View style={styles.countRow}>
                                <Text style={[styles.countText, { color: themeColors.mutedText }]}>
                                    {isLoading
                                        ? t('general.loading')
                                        : isSearching
                                            ? 'Searching...'
                                            : total > 0
                                                ? `${exercises.length} of ${total} ${t('library.exercises')}`
                                                : `${exercises.length} ${exercises.length === 1 ? t('library.exercise') : t('library.exercises')}`}
                                </Text>
                            </View>
                        </View>
                    }
                    ListEmptyComponent={
                        isLoading ? (
                            <View style={styles.loadingContainer}>
                                <ActivityIndicator size="large" color={themeColors.primary} />
                            </View>
                        ) : (
                            <View style={styles.emptyContainer}>
                                <Text style={[styles.emptyText, { color: themeColors.mutedText }]}>
                                    {searchQuery || hasActiveFilters
                                        ? 'No exercises found'
                                        : 'No exercises available'}
                                </Text>
                            </View>
                        )
                    }
                    ListFooterComponent={
                        <>
                            {(isSearching || isFetching) && exercises.length > 0 && (
                                <View style={styles.loadingMoreContainer}>
                                    <ActivityIndicator size="small" color={themeColors.primary} />
                                    <Text style={[styles.loadingMoreText, { color: themeColors.mutedText }]}>
                                        {t('general.loadingMore')}
                                    </Text>
                                </View>
                            )}
                            {exercises.length > 0 && (
                                <View style={styles.attributionContainer}>
                                    <Text style={[styles.attributionText, { color: themeColors.mutedText }]}>
                                        {total > 0 ? `${exercises.length} of ${total} exercises • ` : ''}Powered by MuscleWiki
                                    </Text>
                                </View>
                            )}
                        </>
                    }
                    showsVerticalScrollIndicator={true}
                    onEndReached={loadMore}
                    onEndReachedThreshold={0.3}
                />
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
    content: {
        flex: 1,
    },
    searchContainer: {
        paddingHorizontal: 16,
        paddingBottom: 16,
    },
    searchRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    searchBarWrapper: {
        flex: 1,
    },
    countRow: {
        marginTop: 8,
    },
    countText: {
        ...typography.p2,
        fontSize: 13,
    },
    filterButtonContainer: {
        position: 'relative',
    },
    filterBadge: {
        position: 'absolute',
        top: -4,
        right: -4,
        minWidth: 18,
        height: 18,
        borderRadius: 9,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 4,
    },
    filterBadgeText: {
        ...typography.p2,
        fontSize: 10,
        fontWeight: '700',
    },
    listContent: {
        paddingBottom: 40,
    },
    exerciseItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
    },
    thumbnailContainer: {
        position: 'relative',
        marginLeft: 16,
    },
    thumbnail: {
        width: 48,
        height: 48,
        borderRadius: 8,
    },
    placeholderThumbnail: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    playOverlay: {
        position: 'absolute',
        bottom: 2,
        right: 2,
        width: 18,
        height: 18,
        borderRadius: 9,
        backgroundColor: 'rgba(255,255,255,0.85)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    infoContainer: {
        flex: 1,
        marginLeft: 12,
        marginRight: 12,
        justifyContent: 'center',
    },
    exerciseName: {
        ...typography.p1,
        fontWeight: '600',
    },
    checkbox: {
        width: 26,
        height: 26,
        borderRadius: 13,
        borderWidth: 2,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    selectionNumber: {
        ...typography.p1,
        fontSize: 12,
        fontWeight: '700',
    },
    separator: {
        marginLeft: 76,
        marginRight: 16,
    },
    loadingContainer: {
        paddingVertical: 40,
        alignItems: 'center',
    },
    emptyContainer: {
        paddingVertical: 40,
        alignItems: 'center',
    },
    emptyText: {
        ...typography.p1,
    },
    attributionContainer: {
        paddingVertical: 16,
        alignItems: 'center',
    },
    attributionText: {
        ...typography.p2,
        fontSize: 11,
    },
    loadingMoreContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        gap: 8,
    },
    loadingMoreText: {
        ...typography.p2,
        fontSize: 12,
    },
});
