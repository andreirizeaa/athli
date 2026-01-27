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
import { useModalCallbacks } from '@/stores';
import {
    searchExercises,
    getExerciseVideos,
    getAllFilterOptions,
    type Exercise,
    type ExerciseFilters,
} from '@/services/musclewiki-service';

export default function AddExerciseToBuilderModal() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { colors: themeColors } = useThemePreference();
    const { t } = useTranslations();
    const { multiple, title } = useLocalSearchParams<{ multiple?: string, title?: string }>();
    const isMultiple = multiple === 'true';

    const { triggerExerciseSelect, triggerExercisesSelect } = useModalCallbacks();

    const [searchQuery, setSearchQuery] = useState('');
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [exercises, setExercises] = useState<Exercise[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filters, setFilters] = useState<ExerciseFilters>({});
    const [showFilters, setShowFilters] = useState(false);
    const [filterOptions, setFilterOptions] = useState<{
        categories: { value: string; label: string }[];
        muscles: { value: string; label: string }[];
        difficulties: { value: string; label: string }[];
    }>({
        categories: [],
        muscles: [],
        difficulties: [],
    });

    // Load exercises from MuscleWiki cache
    const loadExercises = useCallback(async () => {
        setIsLoading(true);
        try {
            const searchFilters: ExerciseFilters = {
                ...filters,
                searchTerm: searchQuery || undefined,
                limit: 100,
            };
            const results = await searchExercises(searchFilters);
            setExercises(results);
        } catch (error) {
            console.error('Failed to load exercises:', error);
        } finally {
            setIsLoading(false);
        }
    }, [searchQuery, filters]);

    // Load filter options on mount
    useEffect(() => {
        const loadFilterOptions = async () => {
            try {
                const options = await getAllFilterOptions();
                setFilterOptions({
                    categories: options.categories,
                    muscles: options.muscles,
                    difficulties: options.difficulties,
                });
            } catch (error) {
                console.error('Failed to load filter options:', error);
            }
        };
        loadFilterOptions();
    }, []);

    // Reload exercises when search or filters change
    useEffect(() => {
        const debounceTimer = setTimeout(() => {
            loadExercises();
        }, 300); // Debounce search

        return () => clearTimeout(debounceTimer);
    }, [loadExercises]);

    const handleClose = () => {
        router.back();
    };

    const handleSelectExercise = (exercise: Exercise) => {
        if (isMultiple) {
            setSelectedIds(prev =>
                prev.includes(exercise.exerciseId)
                    ? prev.filter(id => id !== exercise.exerciseId)
                    : [...prev, exercise.exerciseId]
            );
        } else {
            // Transform to expected format
            triggerExerciseSelect({
                exerciseId: exercise.exerciseId,
                name: exercise.name,
                imageUrl: exercise.imageUrl,
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
            });
            router.back();
        }
    };

    const handleConfirmSelection = () => {
        const selectedExercises = exercises
            .filter(ex => selectedIds.includes(ex.exerciseId))
            .map(ex => ({
                exerciseId: ex.exerciseId,
                name: ex.name,
                imageUrl: ex.imageUrl,
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
            }));
        triggerExercisesSelect(selectedExercises);
        router.back();
    };

    const headerHeight = Platform.OS === 'android' ? 56 + insets.top : 56;
    const gradientHeight = headerHeight + 12;

    const renderExerciseItem = ({ item }: { item: Exercise }) => {
        const selectedIndex = selectedIds.indexOf(item.exerciseId);
        const isSelected = selectedIndex !== -1;

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
                        {item.imageUrl ? (
                            <Image
                                source={{ uri: item.imageUrl }}
                                style={styles.thumbnail}
                                contentFit="cover"
                                transition={200}
                            />
                        ) : (
                            <View style={[styles.thumbnail, styles.placeholderThumbnail, { backgroundColor: themeColors.muted }]}>
                                <Play size={16} color={themeColors.mutedForeground} />
                            </View>
                        )}
                        {/* Play button overlay */}
                        <View style={styles.playOverlay}>
                            <Play size={12} color="#fff" fill="#fff" />
                        </View>
                    </View>
                </PressableScale>
                <View style={styles.infoContainer}>
                    <Text style={[styles.exerciseName, { color: themeColors.text }]} numberOfLines={1}>
                        {item.name}
                    </Text>
                    {item.targetMuscles.length > 0 && (
                        <Text style={[styles.exerciseMeta, { color: themeColors.mutedForeground }]} numberOfLines={1}>
                            {item.targetMuscles.slice(0, 2).join(', ')}
                            {item.category && ` • ${item.category}`}
                        </Text>
                    )}
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
    };

    const renderFilterChip = (label: string, value: string | undefined, onClear: () => void) => {
        if (!value) return null;
        return (
            <PressableOpacity
                onPress={onClear}
                style={[styles.filterChip, { backgroundColor: themeColors.primary }]}
            >
                <Text style={[styles.filterChipText, { color: themeColors.primaryForeground }]}>
                    {label}: {value}
                </Text>
                <X size={12} color={themeColors.primaryForeground} />
            </PressableOpacity>
        );
    };

    const hasActiveFilters = filters.category || filters.muscle || filters.difficulty;

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
                                <IconButton
                                    icon={{ sf: 'line.horizontal.3.decrease', IconComponent: Filter }}
                                    onPress={() => setShowFilters(!showFilters)}
                                    size="md"
                                    color={hasActiveFilters ? themeColors.primary : themeColors.text}
                                />
                            </View>
                            {/* Active Filters Display */}
                            {hasActiveFilters && (
                                <View style={styles.activeFilters}>
                                    {renderFilterChip('Category', filters.category, () =>
                                        setFilters(prev => ({ ...prev, category: undefined }))
                                    )}
                                    {renderFilterChip('Muscle', filters.muscle, () =>
                                        setFilters(prev => ({ ...prev, muscle: undefined }))
                                    )}
                                    {renderFilterChip('Difficulty', filters.difficulty, () =>
                                        setFilters(prev => ({ ...prev, difficulty: undefined }))
                                    )}
                                </View>
                            )}
                            {/* Filter Panel */}
                            {showFilters && (
                                <View style={[styles.filterPanel, { backgroundColor: themeColors.card }]}>
                                    <Text style={[styles.filterSectionTitle, { color: themeColors.text }]}>
                                        Equipment
                                    </Text>
                                    <View style={styles.filterOptions}>
                                        {filterOptions.categories.map(cat => (
                                            <PressableOpacity
                                                key={cat.value}
                                                onPress={() => setFilters(prev => ({
                                                    ...prev,
                                                    category: prev.category === cat.value ? undefined : cat.value
                                                }))}
                                                style={[
                                                    styles.filterOption,
                                                    {
                                                        backgroundColor: filters.category === cat.value
                                                            ? themeColors.primary
                                                            : themeColors.muted
                                                    }
                                                ]}
                                            >
                                                <Text style={[
                                                    styles.filterOptionText,
                                                    {
                                                        color: filters.category === cat.value
                                                            ? themeColors.primaryForeground
                                                            : themeColors.text
                                                    }
                                                ]}>
                                                    {cat.label}
                                                </Text>
                                            </PressableOpacity>
                                        ))}
                                    </View>

                                    <Text style={[styles.filterSectionTitle, { color: themeColors.text }]}>
                                        Muscle Group
                                    </Text>
                                    <View style={styles.filterOptions}>
                                        {filterOptions.muscles.slice(0, 10).map(muscle => (
                                            <PressableOpacity
                                                key={muscle.value}
                                                onPress={() => setFilters(prev => ({
                                                    ...prev,
                                                    muscle: prev.muscle === muscle.value ? undefined : muscle.value
                                                }))}
                                                style={[
                                                    styles.filterOption,
                                                    {
                                                        backgroundColor: filters.muscle === muscle.value
                                                            ? themeColors.primary
                                                            : themeColors.muted
                                                    }
                                                ]}
                                            >
                                                <Text style={[
                                                    styles.filterOptionText,
                                                    {
                                                        color: filters.muscle === muscle.value
                                                            ? themeColors.primaryForeground
                                                            : themeColors.text
                                                    }
                                                ]}>
                                                    {muscle.label}
                                                </Text>
                                            </PressableOpacity>
                                        ))}
                                    </View>

                                    <Text style={[styles.filterSectionTitle, { color: themeColors.text }]}>
                                        Difficulty
                                    </Text>
                                    <View style={styles.filterOptions}>
                                        {filterOptions.difficulties.map(diff => (
                                            <PressableOpacity
                                                key={diff.value}
                                                onPress={() => setFilters(prev => ({
                                                    ...prev,
                                                    difficulty: prev.difficulty === diff.value ? undefined : diff.value
                                                }))}
                                                style={[
                                                    styles.filterOption,
                                                    {
                                                        backgroundColor: filters.difficulty === diff.value
                                                            ? themeColors.primary
                                                            : themeColors.muted
                                                    }
                                                ]}
                                            >
                                                <Text style={[
                                                    styles.filterOptionText,
                                                    {
                                                        color: filters.difficulty === diff.value
                                                            ? themeColors.primaryForeground
                                                            : themeColors.text
                                                    }
                                                ]}>
                                                    {diff.label}
                                                </Text>
                                            </PressableOpacity>
                                        ))}
                                    </View>
                                </View>
                            )}
                        </View>
                    }
                    ListEmptyComponent={
                        isLoading ? (
                            <View style={styles.loadingContainer}>
                                <ActivityIndicator size="large" color={themeColors.primary} />
                            </View>
                        ) : (
                            <View style={styles.emptyContainer}>
                                <Text style={[styles.emptyText, { color: themeColors.mutedForeground }]}>
                                    {searchQuery || hasActiveFilters
                                        ? 'No exercises found'
                                        : 'No exercises available'}
                                </Text>
                            </View>
                        )
                    }
                    showsVerticalScrollIndicator={false}
                    estimatedItemSize={64}
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
    activeFilters: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginTop: 12,
    },
    filterChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        gap: 4,
    },
    filterChipText: {
        ...typography.p2,
        fontSize: 12,
    },
    filterPanel: {
        marginTop: 12,
        padding: 16,
        borderRadius: 12,
    },
    filterSectionTitle: {
        ...typography.p2,
        fontWeight: '600',
        marginBottom: 8,
        marginTop: 12,
    },
    filterOptions: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    filterOption: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
    },
    filterOptionText: {
        ...typography.p2,
        fontSize: 12,
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
        backgroundColor: 'rgba(0,0,0,0.6)',
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
    exerciseMeta: {
        ...typography.p2,
        fontSize: 12,
        marginTop: 2,
    },
    checkbox: {
        width: 26,
        height: 26,
        borderRadius: 13,
        borderWidth: 2,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 12,
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
});
