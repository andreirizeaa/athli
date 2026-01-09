import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, ScrollView, Platform } from 'react-native';
import { ChevronLeft, Check, Repeat, Plus, Dumbbell, Layers, Link as LinkIcon } from 'lucide-react-native';
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
import { getDefaultColumns, type WorkoutExercise } from '@/components/workout/types';
import { Exercise } from '@/app/modals/workout/add-exercise-to-builder-modal';

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

    const [workout, setWorkout] = useState<typeof MOCK_WORKOUTS[string] | null>(null);
    const [selectedExercises, setSelectedExercises] = useState<WorkoutExercise[]>([]);

    const { setExerciseSelectCallback, setExercisesSelectCallback } = useModalCallbacks();

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
            setSelectedExercises(prev => [...prev, ...newExercises]);
        });
    }, [setExercisesSelectCallback]);

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

    const handleUpdateExercise = (index: number, updates: Partial<WorkoutExercise>) => {
        const newExercises = [...selectedExercises];
        newExercises[index] = { ...newExercises[index], ...updates };
        setSelectedExercises(newExercises);
    };

    const handleDeleteExercise = (index: number) => {
        setSelectedExercises(prev => prev.filter((_, i) => i !== index));
    };

    const toggleSuperset = (index: number) => {
        const newExercises = [...selectedExercises];
        newExercises[index] = {
            ...newExercises[index],
            isSupersetNext: !newExercises[index].isSupersetNext
        };
        setSelectedExercises(newExercises);
    };

    const addOptions: DropdownMenuOption[] = [
        {
            label: 'Add Exercise',
            icon: { sf: 'dumbbell.fill', IconComponent: Dumbbell },
            onPress: handleAddExercise,
        },
        {
            label: 'Add Section',
            icon: { sf: 'square.stack.3d.down.right.fill', IconComponent: Layers },
            onPress: handleAddSection,
        },
    ];

    const insets = useSafeAreaInsets();

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

    return (
        <ScreenWrapper
            scrollable={true}
            contentContainerStyle={styles.scrollContent}
            overlay={BottomBar}
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
            <View style={styles.content}>
                {!workout && (
                    <Text style={[styles.emptyText, { color: themeColors.mutedText }]}>
                        {t('library.workout.notFound')}
                    </Text>
                )}

                {selectedExercises.map((ex, index) => {
                    const isLinkedToPrev = index > 0 && selectedExercises[index - 1].isSupersetNext;
                    const isLinkedToNext = ex.isSupersetNext;
                    const isLast = index === selectedExercises.length - 1;

                    return (
                        <React.Fragment key={ex.id}>
                            <ExerciseBuilderCard
                                exercise={ex}
                                onUpdateExercise={(updates) => handleUpdateExercise(index, updates)}
                                onDelete={() => handleDeleteExercise(index)}
                                isLinkedToPrev={isLinkedToPrev}
                                isLinkedToNext={isLinkedToNext}
                            />

                            {!isLast && (
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
                            )}
                        </React.Fragment>
                    );
                })}
            </View>
        </ScreenWrapper>
    );
}

const styles = StyleSheet.create({
    scrollContent: {
        paddingBottom: 32,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
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
