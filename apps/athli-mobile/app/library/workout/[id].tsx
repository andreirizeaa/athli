import React, { useEffect, useState, useRef, useCallback } from 'react';
import { StyleSheet, Text, View, Platform, Keyboard, Alert } from 'react-native';
import { ChevronLeft, Check, Repeat, Plus, Dumbbell, Layers, Link as LinkIcon } from 'lucide-react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';

import { typography } from '@/constants/typography';
import { useThemePreference } from '@/stores';
import { useTranslations } from '@/stores';
import { IconButton } from '@/components/ui/icon-button';
import { DropdownMenuWrapper, type DropdownMenuOption } from '@/components/ui/dropdown-menu';
import { PressableScale } from 'pressto';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useModalCallbacks } from '@/stores';
import { ExerciseBuilderCard } from '@/components/features/workout/exercise-builder-card';
import { SectionBuilderCard } from '@/components/features/workout/section-builder-card';
import { hexToRgba } from '@/utils/colorUtils';
import { Exercise } from '@/app/modals/workout/add-exercise-to-builder-modal';
import {
    type BuilderWorkoutState,
    type BuilderExercise,
    type BuilderSection,
    type BuilderItem,
    createEmptyWorkoutState,
    areWorkoutStatesEqual,
    getDefaultColumns,
    isBuilderSection,
    buildWorkoutPayload,
} from '@/components/features/workout/workout-schema';
import {
    type ExerciseValidationError,
    validateWorkoutItems,
} from '@/components/features/workout/validation';

// Mock workout data - this would come from a service in production
const MOCK_WORKOUTS: Record<string, { id: string; name: string; description: string; type: string; difficulty: string }> = {
    'workout-1': {
        id: 'workout-1',
        name: 'Full Body Strength Training',
        description: 'A comprehensive full body workout focusing on compound movements and progressive overload.',
        type: 'weightlifting',
        difficulty: 'intermediate',
    },
    'workout-2': {
        id: 'workout-2',
        name: 'HIIT Cardio Blast',
        description: 'High intensity interval training for maximum calorie burn.',
        type: 'hiit',
        difficulty: 'advanced',
    },
    'new': {
        id: 'new',
        name: '',
        description: '',
        type: '',
        difficulty: 'all_levels',
    },
};

export default function WorkoutDetailScreen() {
    const router = useRouter();
    const { id } = useLocalSearchParams<{ id: string }>();
    const { colors: themeColors } = useThemePreference();
    const { t } = useTranslations();
    const insets = useSafeAreaInsets();

    const { setExercisesSelectCallback, setSectionSelectCallback, setExerciseSelectCallback, setReorderCallback, setReorderItems } = useModalCallbacks();

    // Workout state management
    const [workoutState, setWorkoutState] = useState<BuilderWorkoutState>(createEmptyWorkoutState);
    const initialStateRef = useRef<BuilderWorkoutState | null>(null);
    const [isDirty, setIsDirty] = useState(false);
    const [validationErrors, setValidationErrors] = useState<ExerciseValidationError[]>([]);
    const [emptySectionIds, setEmptySectionIds] = useState<string[]>([]);

    // Load workout data
    useEffect(() => {
        if (id) {
            const workoutData = MOCK_WORKOUTS[id] || MOCK_WORKOUTS['new'];
            const newState: BuilderWorkoutState = {
                meta: {
                    id: workoutData.id === 'new' ? null : workoutData.id,
                    name: workoutData.name,
                    description: workoutData.description,
                    type: workoutData.type,
                    difficulty: workoutData.difficulty,
                },
                items: [],
            };
            setWorkoutState(newState);
            initialStateRef.current = JSON.parse(JSON.stringify(newState)); // Deep clone
        }
    }, [id]);

    // Track dirty state
    useEffect(() => {
        if (initialStateRef.current) {
            const dirty = !areWorkoutStatesEqual(workoutState, initialStateRef.current);
            setIsDirty(dirty);
        }
    }, [workoutState]);

    // Handle section select callback
    useEffect(() => {
        setSectionSelectCallback((section: BuilderSection) => {
            setWorkoutState(prev => {
                const existingIndex = prev.items.findIndex(item => item.id === section.id);
                if (existingIndex !== -1) {
                    const newItems = [...prev.items];
                    newItems[existingIndex] = section;
                    return { ...prev, items: newItems };
                }
                return { ...prev, items: [...prev.items, section] };
            });
        });
    }, [setSectionSelectCallback]);

    const showDiscardAlert = useCallback(() => {
        Alert.alert(
            t('common.discardChanges'),
            t('common.discardChangesMessage'),
            [
                {
                    text: t('common.cancel'),
                    style: 'cancel',
                },
                {
                    text: t('common.discard'),
                    style: 'destructive',
                    onPress: () => {
                        if (router.canGoBack()) {
                            router.back();
                        }
                    },
                },
            ]
        );
    }, [router, t]);

    const handleBackPress = useCallback(() => {
        if (isDirty) {
            showDiscardAlert();
        } else {
            if (router.canGoBack()) {
                router.back();
            }
        }
    }, [isDirty, router, showDiscardAlert]);

    const handleSave = useCallback(() => {
        if (!workoutState.meta.name) {
            Alert.alert(t('library.workout.error'), t('library.workout.nameRequired'));
            return;
        }

        // Validate all exercises
        const validation = validateWorkoutItems(workoutState.items);
        if (!validation.isValid) {
            setValidationErrors(validation.errors);
            setEmptySectionIds(validation.emptySectionIds);
            Alert.alert(t('library.workout.error'), validation.errorMessage || t('library.workout.validationError'));
            return;
        }

        // Clear any previous errors
        setValidationErrors([]);
        setEmptySectionIds([]);

        // Build the payload for API
        const payload = buildWorkoutPayload(workoutState);
        console.log('Saving workout payload:', JSON.stringify(payload, null, 2));

        // TODO: Call API to save workout
        // For now, update the initial state to mark as saved
        initialStateRef.current = JSON.parse(JSON.stringify(workoutState));
        setIsDirty(false);

        if (router.canGoBack()) {
            router.back();
        }
    }, [workoutState, router, t]);

    const handleReorder = () => {
        // Set up callback to receive reordered items
        setReorderCallback((reorderedItems) => {
            setWorkoutState(prev => ({
                ...prev,
                items: reorderedItems,
            }));
        });

        // Store items for the reorder screen to access
        setReorderItems(workoutState.items);

        router.push('/library/workout/reorder');
    };

    const handleAddExercise = () => {
        setExercisesSelectCallback((exercises: Exercise[]) => {
            const newExercises: BuilderExercise[] = exercises.map((exercise, idx) => ({
                id: `${exercise.exerciseId}-${Date.now()}-${idx}`,
                exerciseId: exercise.exerciseId,
                name: exercise.name,
                imageUrl: exercise.imageUrl,
                exerciseType: exercise.exerciseType,
                sets: [{ id: Math.random().toString(), setNumber: 1, column1: '', column2: '', type: 'R' as const }],
                alternatives: [],
                tempo: '',
                eachSide: false,
                ...getDefaultColumns(exercise.exerciseType),
                equipments: exercise.equipments,
                bodyParts: exercise.bodyParts,
            }));
            setWorkoutState(prev => ({
                ...prev,
                items: [...prev.items, ...newExercises],
            }));
        });

        router.push({
            pathname: '/modals/workout/add-exercise-to-builder-modal',
            params: { multiple: 'true' }
        });
    };

    const handleSwapExercise = (index: number) => {
        setExerciseSelectCallback((newExercise: Exercise) => {
            setWorkoutState(prev => {
                const newItems = [...prev.items];
                const currentExercise = newItems[index] as BuilderExercise;

                newItems[index] = {
                    ...currentExercise,
                    exerciseId: newExercise.exerciseId,
                    name: newExercise.name,
                    imageUrl: newExercise.imageUrl,
                    exerciseType: newExercise.exerciseType,
                    ...getDefaultColumns(newExercise.exerciseType),
                };

                return { ...prev, items: newItems };
            });
        });

        router.push({
            pathname: '/modals/workout/add-exercise-to-builder-modal',
            params: { multiple: 'false', title: 'Swap Exercise' }
        });
    };

    const handleAddSection = () => {
        router.push('/modals/workout/add-section-to-builder-modal');
    };

    const handleUpdateExercise = (index: number, updates: Partial<BuilderExercise>) => {
        setWorkoutState(prev => {
            const newItems = [...prev.items];
            const currentItem = newItems[index];

            if (isBuilderSection(currentItem)) {
                return prev; // Don't update sections here
            }

            const currentExercise = currentItem as BuilderExercise;
            const updatedExercise = { ...currentExercise, ...updates } as BuilderExercise;
            newItems[index] = updatedExercise;

            // If sets are updated, check for superset syncing
            if (updates.sets && updates.sets.length !== currentExercise.sets.length) {
                const targetSetCount = updates.sets.length;

                // Find start of chain
                let start = index;
                while (start > 0) {
                    const prev = newItems[start - 1];
                    if (isBuilderSection(prev)) break;
                    if (!(prev as BuilderExercise).isSupersetNext) break;
                    start--;
                }

                // Find end of chain
                let end = index;
                while (end < newItems.length - 1) {
                    const curr = newItems[end];
                    if (isBuilderSection(curr)) break;
                    if (!(curr as BuilderExercise).isSupersetNext) break;

                    const next = newItems[end + 1];
                    if (isBuilderSection(next)) break;

                    end++;
                }

                // Apply set count to all in chain (except index which is already updated)
                for (let i = start; i <= end; i++) {
                    if (i === index) continue;

                    const ex = newItems[i] as BuilderExercise;
                    let newSets = [...ex.sets];

                    if (newSets.length > targetSetCount) {
                        newSets = newSets.slice(0, targetSetCount);
                    } else {
                        while (newSets.length < targetSetCount) {
                            newSets.push({
                                id: Math.random().toString(),
                                setNumber: newSets.length + 1,
                                column1: '',
                                column2: '',
                                type: 'R' as const
                            });
                        }
                    }
                    newItems[i] = { ...ex, sets: newSets } as BuilderExercise;
                }
            }

            return { ...prev, items: newItems };
        });
    };

    const handleDeleteItem = (index: number) => {
        setWorkoutState(prev => ({
            ...prev,
            items: prev.items.filter((_, i) => i !== index),
        }));
    };

    const handleEditSection = (index: number) => {
        const section = workoutState.items[index] as BuilderSection;
        router.push({
            pathname: '/library/workout/section-builder',
            params: {
                name: section.name,
                sectionType: section.sectionType,
                duration: section.duration || '',
                rounds: section.rounds || '',
                notes: section.notes || '',
                editingId: section.id,
                exercises: JSON.stringify(section.exercises),
            }
        });
    };

    const toggleSuperset = (index: number) => {
        setWorkoutState(prev => {
            const newItems = [...prev.items];
            const ex = newItems[index] as BuilderExercise;

            const isLinking = !ex.isSupersetNext;

            if (isLinking) {
                // Check next item and sync sets + assign supersetGroupId
                const nextIndex = index + 1;
                if (nextIndex < newItems.length) {
                    const nextItem = newItems[nextIndex];
                    if (!isBuilderSection(nextItem)) {
                        const nextEx = nextItem as BuilderExercise;
                        const targetSetCount = ex.sets.length;

                        // Generate a shared superset group ID
                        const supersetGroupId = ex.supersetGroupId || `superset-${Date.now()}`;

                        // Sync B to A if set counts differ
                        let newSets = [...nextEx.sets];
                        if (newSets.length !== targetSetCount) {
                            if (newSets.length > targetSetCount) {
                                newSets = newSets.slice(0, targetSetCount);
                            } else {
                                while (newSets.length < targetSetCount) {
                                    newSets.push({
                                        id: Math.random().toString(),
                                        setNumber: newSets.length + 1,
                                        column1: '',
                                        column2: '',
                                        type: 'R' as const
                                    });
                                }
                            }
                        }

                        // Update current exercise with superset flag and group ID
                        newItems[index] = {
                            ...ex,
                            isSupersetNext: true,
                            supersetGroupId,
                        };

                        // Update next exercise with same group ID and synced sets
                        newItems[nextIndex] = {
                            ...nextEx,
                            sets: newSets,
                            supersetGroupId,
                        } as BuilderExercise;
                    }
                }
            } else {
                // Unlinking - clear supersetGroupId from this exercise
                // Also clear from next exercise if it was part of the chain
                newItems[index] = {
                    ...ex,
                    isSupersetNext: false,
                    supersetGroupId: null,
                };

                const nextIndex = index + 1;
                if (nextIndex < newItems.length) {
                    const nextItem = newItems[nextIndex];
                    if (!isBuilderSection(nextItem)) {
                        const nextEx = nextItem as BuilderExercise;
                        // Only clear if previous exercise was the only link to this superset
                        const prevIndex = index - 1;
                        const hasPrevLink = prevIndex >= 0 &&
                            !isBuilderSection(newItems[prevIndex]) &&
                            (newItems[prevIndex] as BuilderExercise).isSupersetNext;

                        if (!hasPrevLink) {
                            newItems[nextIndex] = {
                                ...nextEx,
                                supersetGroupId: null,
                            } as BuilderExercise;
                        }
                    }
                }
            }

            return { ...prev, items: newItems };
        });
    };

    const handleMoveUp = (index: number) => {
        if (index === 0) return;
        setWorkoutState(prev => {
            const newItems = [...prev.items];
            [newItems[index - 1], newItems[index]] = [newItems[index], newItems[index - 1]];
            return { ...prev, items: newItems };
        });
    };

    const handleMoveDown = (index: number) => {
        if (index === workoutState.items.length - 1) return;
        setWorkoutState(prev => {
            const newItems = [...prev.items];
            [newItems[index], newItems[index + 1]] = [newItems[index + 1], newItems[index]];
            return { ...prev, items: newItems };
        });
    };

    const addOptions: DropdownMenuOption[] = [
        {
            label: t('library.workout.addSection'),
            icon: { sf: 'square.stack.3d.down.right.fill', IconComponent: Layers },
            onPress: handleAddSection,
        },
        {
            label: t('library.workout.addExercise'),
            icon: { sf: 'dumbbell.fill', IconComponent: Dumbbell },
            onPress: handleAddExercise,
        },
    ];

    const canSave = isDirty;
    const items = workoutState.items;

    const totalExercises = workoutState.items.reduce((acc, item) => {
        if (isBuilderSection(item)) {
            return acc + (item.exercises?.length || 0);
        }
        return acc + 1;
    }, 0);

    const BottomBar = (
        <View style={[
            styles.bottomBarContainer,
            {
                backgroundColor: themeColors.pageBackground,
                paddingBottom: insets.bottom + 12,
                borderTopColor: themeColors.border,
            }
        ]}>
            <View style={styles.bottomBarContent}>
                <View style={[styles.countCircle, { backgroundColor: themeColors.iconButton }]}>
                    <Text style={[styles.countText, { color: themeColors.text }]}>{totalExercises}</Text>
                </View>

                <View style={styles.buttonWrapper}>
                    <PressableScale
                        style={[styles.actionButton, { backgroundColor: themeColors.iconButton }]}
                        onPress={handleReorder}
                    >
                        <Repeat {...({ size: 18, color: themeColors.text, style: styles.buttonIcon } as any)} />
                        <Text style={[styles.actionButtonText, { color: themeColors.text }]}>{t('library.workout.reorder')}</Text>
                    </PressableScale>
                </View>

                <View style={styles.buttonWrapper}>
                    <DropdownMenuWrapper options={addOptions}>
                        <View style={[styles.actionButton, { backgroundColor: themeColors.iconButton }]}>
                            <Plus {...({ size: 18, color: themeColors.text, style: styles.buttonIcon } as any)} />
                            <Text style={[styles.actionButtonText, { color: themeColors.text }]}>{t('library.workout.add')}</Text>
                        </View>
                    </DropdownMenuWrapper>
                </View>
            </View>
        </View>
    );

    const headerHeight = Platform.OS === 'android' ? 56 + insets.top : 56;
    const gradientHeight = headerHeight + 12;

    return (
        <View style={[styles.container, { backgroundColor: themeColors.background }]}>
            {/* Fixed Header Gradient */}
            <View style={[styles.fixedHeader, { height: headerHeight }]}>
                <LinearGradient
                    colors={[
                        hexToRgba(themeColors.background, 1),
                        hexToRgba(themeColors.background, 0.85),
                        hexToRgba(themeColors.background, 0.5),
                        hexToRgba(themeColors.background, 0),
                    ]}
                    locations={[0, 0.5, 0.8, 1]}
                    style={[styles.headerGradient, { height: gradientHeight }]}
                    pointerEvents="none"
                />
            </View>

            <KeyboardAwareScrollView
                style={styles.scrollView}
                contentContainerStyle={[
                    styles.scrollContent,
                    { paddingTop: insets.top }
                ]}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                bottomOffset={40}
            >
                {/* Header - Centered title layout that scrolls with content */}
                <View style={styles.header}>
                    <IconButton
                        icon={{ sf: 'chevron.left', IconComponent: ChevronLeft }}
                        onPress={handleBackPress}
                        size="md"
                        color={themeColors.text}
                    />
                    <Text
                        style={[styles.title, { color: themeColors.text }]}
                        numberOfLines={1}
                        ellipsizeMode="tail"
                    >
                        {workoutState.meta.name || t('library.workout.newWorkout')}
                    </Text>
                    <IconButton
                        icon={{ sf: 'checkmark', IconComponent: Check }}
                        onPress={handleSave}
                        size="md"
                        variant={canSave ? 'primary' : 'default'}
                        disabled={!canSave}
                    />
                </View>

                {/* Page Content */}
                {items.length === 0 && (
                    <Text style={[styles.emptyText, { color: themeColors.mutedText }]}>
                        {t('library.workout.emptyBuilder')}
                    </Text>
                )}

                {items.map((item, index) => {
                    const isLast = index === items.length - 1;

                    if (isBuilderSection(item)) {
                        return (
                            <React.Fragment key={item.id}>
                                <SectionBuilderCard
                                    section={{
                                        id: item.id,
                                        type: 'section',
                                        name: item.name,
                                        sectionType: item.sectionType,
                                        duration: item.duration,
                                        rounds: item.rounds,
                                        notes: item.notes,
                                        exercises: item.exercises.map(ex => ({
                                            id: ex.id,
                                            exerciseId: ex.exerciseId,
                                            name: ex.name,
                                            imageUrl: ex.imageUrl,
                                            exerciseType: ex.exerciseType,
                                            sets: ex.sets.map(s => ({
                                                id: s.id,
                                                column1: s.column1,
                                                column2: s.column2,
                                                type: s.type,
                                            })),
                                            column1Type: ex.column1Type,
                                            column2Type: ex.column2Type,
                                            alternatives: ex.alternatives,
                                            tempo: ex.tempo,
                                            eachSide: ex.eachSide,
                                            isSupersetNext: ex.isSupersetNext,
                                        })),
                                    }}
                                    onDelete={() => handleDeleteItem(index)}
                                    onEdit={() => handleEditSection(index)}
                                    canMoveUp={index > 0}
                                    canMoveDown={index < items.length - 1}
                                    onMoveUp={() => handleMoveUp(index)}
                                    onMoveDown={() => handleMoveDown(index)}
                                    hasError={emptySectionIds.includes(item.id)}
                                />
                                {!isLast && <View style={{ height: 16 }} />}
                            </React.Fragment>
                        );
                    }

                    const ex = item as BuilderExercise;
                    const nextItem = index < items.length - 1 ? items[index + 1] : null;
                    const isLinkedToPrev = index > 0 && !isBuilderSection(items[index - 1]) && (items[index - 1] as BuilderExercise).isSupersetNext;
                    const isLinkedToNext = ex.isSupersetNext;

                    // Can only superset if next item exists and is an exercise
                    const canSupersetNext = nextItem && !isBuilderSection(nextItem);

                    return (
                        <React.Fragment key={ex.id}>
                            <ExerciseBuilderCard
                                exercise={{
                                    id: ex.id,
                                    exerciseId: ex.exerciseId,
                                    name: ex.name,
                                    imageUrl: ex.imageUrl,
                                    exerciseType: ex.exerciseType,
                                    sets: ex.sets.map(s => ({
                                        id: s.id,
                                        column1: s.column1,
                                        column2: s.column2,
                                        type: s.type,
                                    })),
                                    column1Type: ex.column1Type,
                                    column2Type: ex.column2Type,
                                    alternatives: ex.alternatives,
                                    tempo: ex.tempo,
                                    eachSide: ex.eachSide,
                                    isSupersetNext: ex.isSupersetNext,
                                    notes: ex.notes,
                                }}
                                onUpdateExercise={(updates) => handleUpdateExercise(index, updates as Partial<BuilderExercise>)}
                                onDelete={() => handleDeleteItem(index)}
                                isLinkedToPrev={isLinkedToPrev}
                                isLinkedToNext={isLinkedToNext}
                                canMoveUp={index > 0}
                                canMoveDown={index < items.length - 1}
                                onMoveUp={() => handleMoveUp(index)}
                                onMoveDown={() => handleMoveDown(index)}
                                validationErrors={validationErrors}
                                onSwap={() => handleSwapExercise(index)}
                            />

                            {!isLast && (
                                canSupersetNext ? (
                                    <View style={[
                                        styles.supersetConnector,
                                        { borderColor: themeColors.border },
                                        isLinkedToNext ? styles.linkedConnector : styles.unlinkedConnector
                                    ]}>
                                        <View style={[
                                            styles.supersetButtonContainer,
                                            !isLinkedToNext && { width: '100%', paddingHorizontal: 0 }
                                        ]}>
                                            {!isLinkedToNext && <View style={[styles.connectorLine, { backgroundColor: themeColors.border }]} />}
                                            <PressableScale
                                                onPress={() => toggleSuperset(index)}
                                                style={[
                                                    styles.supersetButton,
                                                    {
                                                        backgroundColor: isLinkedToNext ? themeColors.background : themeColors.surfaceSecondary,
                                                        borderColor: themeColors.border,
                                                        paddingVertical: 4,
                                                        marginHorizontal: !isLinkedToNext ? 12 : 0,
                                                    }
                                                ]}
                                            >
                                                <LinkIcon {...({ size: 14, color: isLinkedToNext ? themeColors.primary : themeColors.text } as any)} />
                                                <Text style={[
                                                    styles.supersetButtonText,
                                                    { color: isLinkedToNext ? themeColors.primary : themeColors.text }
                                                ]}>
                                                    {isLinkedToNext ? t('library.workout.unlink') : t('library.workout.superset')}
                                                </Text>
                                            </PressableScale>
                                            {!isLinkedToNext && <View style={[styles.connectorLine, { backgroundColor: themeColors.border }]} />}
                                        </View>
                                    </View>
                                ) : (
                                    <View style={{ height: 16 }} />
                                )
                            )}
                        </React.Fragment>
                    );
                })}
            </KeyboardAwareScrollView>
            {BottomBar}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollView: {
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
    scrollContent: {
        paddingHorizontal: 16,
        paddingBottom: 32,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: 12,
        marginBottom: 16,
        height: 56,
    },
    headerActionContainer: {
        width: 36,
        height: 36,
        alignItems: 'center',
        justifyContent: 'center',
    },
    title: {
        ...typography.h6,
        flex: 1,
        textAlign: 'center',
        marginHorizontal: 8,
    },
    content: {
        paddingHorizontal: 16,
        paddingTop: 16,
    },
    emptyText: {
        ...typography.p2,
        textAlign: 'center',
        marginTop: 32,
    },
    bottomBarContainer: {
        borderTopWidth: StyleSheet.hairlineWidth,
        // Top edge shadow
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.06,
        shadowRadius: 10,
        elevation: 10,
    },
    bottomBarContent: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingTop: 12,
        paddingHorizontal: 16,
        gap: 12,
    },
    countCircle: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        // Match action button feel
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
    },
    countText: {
        ...typography.h6,
    },
    buttonWrapper: {
        flex: 1,
    },
    actionButton: {
        width: '100%',
        height: 48,
        borderRadius: 24,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        // Match icon button feel
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
    },
    actionButtonText: {
        ...typography.p1,
        fontWeight: '600',
    },
    buttonIcon: {
        marginRight: 8,
    },
    supersetConnector: {
        height: 32,
        marginHorizontal: 0,
        borderLeftWidth: 1,
        borderRightWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1,
    },
    linkedConnector: {
        marginTop: 0,
        marginBottom: 0,
        backgroundColor: 'transparent',
    },
    unlinkedConnector: {
        borderLeftWidth: 0,
        borderRightWidth: 0,
        marginTop: -8,
        marginBottom: 8,
    },
    supersetButtonContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    connectorLine: {
        flex: 1,
        height: 1,
    },
    supersetButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        borderWidth: 1,
        gap: 6,
    },
    supersetButtonText: {
        fontSize: 12,
        fontWeight: '600',
    },
});
