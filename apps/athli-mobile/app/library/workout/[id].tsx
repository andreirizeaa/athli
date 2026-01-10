import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, Platform, Keyboard, TouchableWithoutFeedback } from 'react-native';
import { ChevronLeft, Check, Repeat, Plus, Dumbbell, Layers, Link as LinkIcon } from 'lucide-react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';

import { typography } from '@/constants/typography';
import { useThemePreference } from '@/contexts/useColorScheme';
import { useTranslations } from '@/contexts/useTranslations';
import { IconButton } from '@/components/icon-button';
import { ScreenWrapper } from '@/components/screen-wrapper';
import { DropdownMenuWrapper, type DropdownMenuOption } from '@/components/dropdown-menu';
import { PressableOpacity, PressableScale } from 'pressto';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useModalCallbacks } from '@/contexts/modal-callbacks';
import { ExerciseBuilderCard } from '@/components/workout/exercise-builder-card';
import { SectionBuilderCard } from '@/components/workout/section-builder-card';
import { getDefaultColumns, type WorkoutExercise, type WorkoutItem, type WorkoutSection } from '@/components/workout/types';
import { Exercise } from '@/app/modals/workout/add-exercise-to-builder-modal';
import { hexToRgba } from '@/utils/colorUtils';

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
};

export default function WorkoutDetailScreen() {
    const router = useRouter();
    const { id } = useLocalSearchParams<{ id: string }>();
    const { colors: themeColors } = useThemePreference();
    const { t } = useTranslations();
    const insets = useSafeAreaInsets();

    const handleDismissKeyboard = () => {
        Keyboard.dismiss();
    };

    const [workout, setWorkout] = useState<typeof MOCK_WORKOUTS[string] | null>(null);
    const [items, setItems] = useState<WorkoutItem[]>([]);

    const { setExerciseSelectCallback, setExercisesSelectCallback, setSectionSelectCallback } = useModalCallbacks();

    useEffect(() => {
        if (id) {
            setWorkout(MOCK_WORKOUTS[id] || null);
        }
    }, [id]);

    useEffect(() => {
        setExercisesSelectCallback((exercises: Exercise[]) => {
            const newExercises: WorkoutExercise[] = exercises.map((exercise, idx) => ({
                id: `${exercise.exerciseId}-${Date.now()}-${idx}`,
                exerciseId: exercise.exerciseId,
                name: exercise.name,
                imageUrl: exercise.imageUrl,
                exerciseType: exercise.exerciseType,
                sets: [{ id: Math.random().toString(), column1: '', column2: '', type: 'R' }],
                alternatives: [],
                tempo: '',
                eachSide: false,
                ...getDefaultColumns(exercise.exerciseType)
            }));
            setItems(prev => [...prev, ...newExercises]);
        });

        setSectionSelectCallback((section: WorkoutSection) => {
            setItems(prev => {
                const existingIndex = prev.findIndex(item => item.id === section.id);
                if (existingIndex !== -1) {
                    const newItems = [...prev];
                    newItems[existingIndex] = section;
                    return newItems;
                }
                return [...prev, section];
            });
        });
    }, [setExercisesSelectCallback, setSectionSelectCallback]);

    const handleBackPress = () => {
        if (router.canGoBack()) {
            router.back();
        }
    };

    const handleSave = () => {
        if (!workout) return;
        // TODO: Implement save functionality
        console.log('Saving workout:', workout?.id);
        handleBackPress();
    };

    const canComplete = !!workout;

    const handleReorder = () => {
        // TODO: Implement reorder functionality
        console.log('Reorder clicked');
    };

    const handleAddExercise = () => {
        router.push({
            pathname: '/modals/workout/add-exercise-to-builder-modal',
            params: { multiple: 'true' }
        });
    };

    const handleAddSection = () => {
        router.push('/modals/workout/add-section-to-builder-modal');
    };

    const handleCreateSection = () => {
        router.push('/modals/workout/create-section-in-builder-modal');
    };

    const handleUpdateExercise = (index: number, updates: Partial<WorkoutExercise>) => {
        const newItems = [...items];
        const currentExercise = newItems[index] as WorkoutExercise;

        // Apply updates to the target exercise
        newItems[index] = { ...currentExercise, ...updates } as WorkoutExercise;

        // If seths are updated, check for superset syncing
        if (updates.sets && updates.sets.length !== currentExercise.sets.length) {
            const targetSetCount = updates.sets.length;

            // Find start of chain
            let start = index;
            while (start > 0) {
                const prev = newItems[start - 1];
                if ('type' in prev && prev.type === 'section') break;
                if (!(prev as WorkoutExercise).isSupersetNext) break;
                start--;
            }

            // Find end of chain
            let end = index;
            while (end < newItems.length - 1) {
                const curr = newItems[end];
                if ('type' in curr && curr.type === 'section') break;
                if (!(curr as WorkoutExercise).isSupersetNext) break;

                const next = newItems[end + 1];
                if ('type' in next && next.type === 'section') break;

                end++;
            }

            // Apply set count to all in chain (except index which is already updated)
            for (let i = start; i <= end; i++) {
                if (i === index) continue;

                const ex = newItems[i] as WorkoutExercise;
                let newSets = [...ex.sets];

                if (newSets.length > targetSetCount) {
                    // Truncate
                    newSets = newSets.slice(0, targetSetCount);
                } else {
                    // Add sets
                    while (newSets.length < targetSetCount) {
                        newSets.push({
                            id: Math.random().toString(),
                            column1: '',
                            column2: '',
                            type: 'R'
                        });
                    }
                }
                newItems[i] = { ...ex, sets: newSets } as WorkoutExercise;
            }
        }

        setItems(newItems);
    };

    const handleDeleteItem = (index: number) => {
        setItems(prev => prev.filter((_, i) => i !== index));
    };

    const handleEditSection = (index: number) => {
        const section = items[index] as WorkoutSection;
        router.push({
            pathname: '/library/workout/section-builder',
            params: {
                name: section.name,
                sectionType: section.sectionType,
                duration: section.duration,
                rounds: section.rounds,
                notes: section.notes,
                editingId: section.id,
            }
        });
    };

    const toggleSuperset = (index: number) => {
        const newItems = [...items];
        const ex = newItems[index] as WorkoutExercise;

        const isLinking = !ex.isSupersetNext;

        newItems[index] = {
            ...ex,
            isSupersetNext: isLinking
        };

        if (isLinking) {
            // Check next item and sync sets
            const nextIndex = index + 1;
            if (nextIndex < newItems.length) {
                const nextItem = newItems[nextIndex];
                if (!('type' in nextItem)) { // It is an exercise
                    const nextEx = nextItem as WorkoutExercise;
                    const targetSetCount = ex.sets.length;

                    // Sync B to A if set counts differ
                    if (nextEx.sets.length !== targetSetCount) {
                        let newSets = [...nextEx.sets];
                        if (newSets.length > targetSetCount) {
                            newSets = newSets.slice(0, targetSetCount);
                        } else {
                            while (newSets.length < targetSetCount) {
                                newSets.push({
                                    id: Math.random().toString(),
                                    column1: '',
                                    column2: '',
                                    type: 'R'
                                });
                            }
                        }
                        newItems[nextIndex] = { ...nextEx, sets: newSets } as WorkoutExercise;
                    }
                }
            }
        }

        setItems(newItems);
    };

    const handleMoveUp = (index: number) => {
        if (index === 0) return;
        const newItems = [...items];
        [newItems[index - 1], newItems[index]] = [newItems[index], newItems[index - 1]];
        setItems(newItems);
    };

    const handleMoveDown = (index: number) => {
        if (index === items.length - 1) return;
        const newItems = [...items];
        [newItems[index], newItems[index + 1]] = [newItems[index + 1], newItems[index]];
        setItems(newItems);
    };

    const addOptions: DropdownMenuOption[] = [
        {
            label: 'Create Section',
            icon: { sf: 'square.stack.3d.down.right.fill', IconComponent: Layers },
            onPress: handleCreateSection,
        },
        {
            label: 'Add Section',
            icon: { sf: 'plus', IconComponent: Plus },
            onPress: handleAddSection,
        },
        {
            label: 'Add Exercise',
            icon: { sf: 'dumbbell.fill', IconComponent: Dumbbell },
            onPress: handleAddExercise,
        },
    ];

    const BottomBar = (
        <View style={[
            styles.bottomBarContainer,
            {
                backgroundColor: themeColors.pageBackground,
                paddingBottom: insets.bottom,
                height: 80 + insets.bottom,
                borderTopColor: themeColors.border,
            }
        ]}>
            <View style={styles.bottomBarContent}>
                <View style={styles.buttonWrapper}>
                    <PressableScale
                        style={[styles.actionButton, { backgroundColor: themeColors.iconButton }]}
                        onPress={handleReorder}
                    >
                        <Repeat {...({ size: 18, color: themeColors.text, style: styles.buttonIcon } as any)} />
                        <Text style={[styles.actionButtonText, { color: themeColors.text }]}>Reorder</Text>
                    </PressableScale>
                </View>

                <View style={styles.buttonWrapper}>
                    <DropdownMenuWrapper options={addOptions}>
                        <View style={[styles.actionButton, { backgroundColor: themeColors.iconButton }]}>
                            <Plus {...({ size: 18, color: themeColors.text, style: styles.buttonIcon } as any)} />
                            <Text style={[styles.actionButtonText, { color: themeColors.text }]}>Add</Text>
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
                        {workout?.name || t('library.workout.loading')}
                    </Text>
                    <IconButton
                        icon={{ sf: 'checkmark', IconComponent: Check }}
                        onPress={handleSave}
                        size="md"
                        variant={canComplete ? 'primary' : 'default'}
                        disabled={!canComplete}
                    />
                </View>

                {/* Page Content */}
                {/* The original "Page Content" View is removed, and its children are directly in KeyboardAwareScrollView */}
                {!workout && (
                    <Text style={[styles.emptyText, { color: themeColors.mutedText }]}>
                        {t('library.workout.notFound')}
                    </Text>
                )}

                {items.map((item, index) => {
                    const isLast = index === items.length - 1;

                    if ('type' in item && item.type === 'section') {
                        return (
                            <React.Fragment key={item.id}>
                                <SectionBuilderCard
                                    section={item}
                                    onDelete={() => handleDeleteItem(index)}
                                    onEdit={() => handleEditSection(index)}
                                    canMoveUp={index > 0}
                                    canMoveDown={index < items.length - 1}
                                    onMoveUp={() => handleMoveUp(index)}
                                    onMoveDown={() => handleMoveDown(index)}
                                />
                                {!isLast && <View style={{ height: 16 }} />}
                            </React.Fragment>
                        );
                    }

                    const ex = item as WorkoutExercise;
                    const nextItem = index < items.length - 1 ? items[index + 1] : null;
                    const isLinkedToPrev = index > 0 && !('type' in items[index - 1]) && (items[index - 1] as WorkoutExercise).isSupersetNext;
                    const isLinkedToNext = ex.isSupersetNext;

                    // Can only superset if next item exists and is an exercise
                    const canSupersetNext = nextItem && !('type' in nextItem);

                    return (
                        <React.Fragment key={ex.id}>
                            <ExerciseBuilderCard
                                exercise={ex}
                                onUpdateExercise={(updates) => handleUpdateExercise(index, updates)}
                                onDelete={() => handleDeleteItem(index)}
                                isLinkedToPrev={isLinkedToPrev}
                                isLinkedToNext={isLinkedToNext}
                                canMoveUp={index > 0}
                                canMoveDown={index < items.length - 1}
                                onMoveUp={() => handleMoveUp(index)}
                                onMoveDown={() => handleMoveDown(index)}
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
                                                    {isLinkedToNext ? 'Unlink' : 'Superset'}
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
        flex: 1,
        flexDirection: 'row',
        alignItems: 'flex-start',
        paddingTop: 12,
        paddingHorizontal: 16,
        gap: 12,
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
