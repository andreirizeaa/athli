import React, { useEffect, useState, useRef, useCallback } from 'react';
import { StyleSheet, Text, View, Platform, TextInput, Alert } from 'react-native';
import { ChevronLeft, Check, Plus, Repeat, ChevronDown, Link as LinkIcon } from 'lucide-react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';

import { typography } from '@/constants/typography';
import { useThemePreference } from '@/contexts/useColorScheme';
import { useTranslations } from '@/contexts/useTranslations';
import { IconButton } from '@/components/icon-button';
import { InputBox, TextAreaInput } from '@/components/form-inputs';
import { DropdownMenuWrapper } from '@/components/dropdown-menu';
import { PressableScale } from 'pressto';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useModalCallbacks } from '@/contexts/modal-callbacks';
import { ExerciseBuilderCard } from '@/components/workout/exercise-builder-card';
import { hexToRgba } from '@/utils/colorUtils';
import { type SectionType, SECTION_TYPES } from '@/constants/training';
import { Exercise } from '@/app/modals/workout/add-exercise-to-builder-modal';
import {
    type BuilderExercise,
    type BuilderSection,
    type BuilderItem,
    getDefaultColumns,
} from '@/components/workout/workout-schema';
import {
    type ExerciseValidationError,
    validateExercises,
} from '@/components/workout/validation';

type SectionBuilderState = {
    name: string;
    sectionType: SectionType;
    duration: string;
    rounds: string;
    notes: string;
    exercises: BuilderExercise[];
};

const createInitialState = (params: {
    name?: string;
    sectionType?: string;
    duration?: string;
    rounds?: string;
    notes?: string;
    exercises?: string;
}): SectionBuilderState => {
    let exercises: BuilderExercise[] = [];
    if (params.exercises) {
        try {
            exercises = JSON.parse(params.exercises);
        } catch (e) {
            console.error('Failed to parse exercises:', e);
        }
    }

    return {
        name: params.name || '',
        sectionType: (params.sectionType as SectionType) || 'regular',
        duration: params.duration || '',
        rounds: params.rounds || '',
        notes: params.notes || '',
        exercises,
    };
};

const areStatesEqual = (a: SectionBuilderState, b: SectionBuilderState): boolean => {
    return JSON.stringify(a) === JSON.stringify(b);
};

export default function SectionBuilderScreen() {
    const router = useRouter();
    const params = useLocalSearchParams<{
        name: string;
        sectionType: SectionType;
        duration?: string;
        rounds?: string;
        notes?: string;
        editingId?: string;
        exercises?: string;
    }>();

    const { colors: themeColors } = useThemePreference();
    const { t } = useTranslations();
    const insets = useSafeAreaInsets();
    const { triggerSectionSelect, setExercisesSelectCallback, setExerciseSelectCallback, setReorderCallback, setReorderItems } = useModalCallbacks();

    // State management
    const [state, setState] = useState<SectionBuilderState>(() => createInitialState(params));
    const initialStateRef = useRef<SectionBuilderState | null>(null);
    const [isDirty, setIsDirty] = useState(false);
    const [validationErrors, setValidationErrors] = useState<ExerciseValidationError[]>([]);

    // Initialize ref on mount
    useEffect(() => {
        const initial = createInitialState(params);
        initialStateRef.current = JSON.parse(JSON.stringify(initial));
    }, []);

    // Track dirty state
    useEffect(() => {
        if (initialStateRef.current) {
            const dirty = !areStatesEqual(state, initialStateRef.current);
            setIsDirty(dirty);
        }
    }, [state]);



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
                        router.back();
                    },
                },
            ]
        );
    }, [router, t]);

    const handleSave = useCallback(() => {
        if (!state.name.trim()) {
            Alert.alert(t('library.section.error'), t('library.section.nameRequired'));
            return;
        }

        // Validate exercises if there are any
        if (state.exercises.length > 0) {
            const validation = validateExercises(state.exercises);
            if (!validation.isValid) {
                setValidationErrors(validation.errors);
                Alert.alert(t('library.section.error'), validation.errorMessage || t('library.workout.validationError'));
                return;
            }
        }

        // Clear any previous errors
        setValidationErrors([]);

        const section: BuilderSection = {
            id: params.editingId || `section-${Date.now()}`,
            type: 'section',
            name: state.name,
            sectionType: state.sectionType,
            duration: state.duration,
            rounds: state.rounds,
            notes: state.notes,
            exercises: state.exercises,
        };

        triggerSectionSelect(section);
        router.back();
    }, [state, params.editingId, triggerSectionSelect, router, t]);

    const handleBack = useCallback(() => {
        if (isDirty) {
            showDiscardAlert();
        } else {
            router.back();
        }
    }, [isDirty, router, showDiscardAlert]);

    const handleAddExercise = () => {
        setExercisesSelectCallback((newExercises: Exercise[]) => {
            const items: BuilderExercise[] = newExercises.map((exercise, idx) => ({
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

            setState(prev => ({
                ...prev,
                exercises: [...prev.exercises, ...items],
            }));
        });

        router.push({
            pathname: '/modals/workout/add-exercise-to-builder-modal',
            params: { multiple: 'true' }
        });
    };

    const handleUpdateExercise = (index: number, updates: Partial<BuilderExercise>) => {
        setState(prev => {
            const newExercises = [...prev.exercises];
            newExercises[index] = { ...newExercises[index], ...updates };
            return { ...prev, exercises: newExercises };
        });
    };

    const handleDeleteExercise = (index: number) => {
        setState(prev => ({
            ...prev,
            exercises: prev.exercises.filter((_, i) => i !== index),
        }));
    };

    const handleSwapExercise = (index: number) => {
        setExerciseSelectCallback((newExercise: Exercise) => {
            setState(prev => {
                const newExercises = [...prev.exercises];
                const currentExercise = newExercises[index];

                newExercises[index] = {
                    ...currentExercise,
                    exerciseId: newExercise.exerciseId,
                    name: newExercise.name,
                    imageUrl: newExercise.imageUrl,
                    exerciseType: newExercise.exerciseType,
                    ...getDefaultColumns(newExercise.exerciseType),
                };

                return { ...prev, exercises: newExercises };
            });
        });

        router.push({
            pathname: '/modals/workout/add-exercise-to-builder-modal',
            params: { multiple: 'false', title: 'Swap Exercise' }
        });
    };

    const toggleSuperset = (index: number) => {
        setState(prev => {
            const newExercises = [...prev.exercises];
            newExercises[index] = {
                ...newExercises[index],
                isSupersetNext: !newExercises[index].isSupersetNext
            };
            return { ...prev, exercises: newExercises };
        });
    };

    const handleMoveUp = (index: number) => {
        if (index === 0) return;
        setState(prev => {
            const newExercises = [...prev.exercises];
            [newExercises[index - 1], newExercises[index]] = [newExercises[index], newExercises[index - 1]];
            return { ...prev, exercises: newExercises };
        });
    };

    const handleMoveDown = (index: number) => {
        if (index === state.exercises.length - 1) return;
        setState(prev => {
            const newExercises = [...prev.exercises];
            [newExercises[index], newExercises[index + 1]] = [newExercises[index + 1], newExercises[index]];
            return { ...prev, exercises: newExercises };
        });
    };

    const handleReorder = () => {
        // Set up callback to receive reordered exercises
        setReorderCallback((reorderedItems) => {
            // Convert BuilderItem[] back to BuilderExercise[]
            const reorderedExercises = reorderedItems as unknown as BuilderExercise[];
            setState(prev => ({
                ...prev,
                exercises: reorderedExercises,
            }));
        });

        // Store exercises as items for the reorder screen to access
        setReorderItems(state.exercises as unknown as BuilderItem[]);

        router.push('/library/workout/reorder');
    };

    const canSave = isDirty && state.name.trim().length > 0;

    const headerHeight = Platform.OS === 'android' ? 56 + insets.top : 56;
    const gradientHeight = headerHeight + 12;

    const totalExercises = state.exercises.length;

    return (
        <View style={[styles.container, { backgroundColor: themeColors.background }]}>
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
                <View style={styles.header}>
                    <IconButton
                        icon={{ sf: 'chevron.left', IconComponent: ChevronLeft }}
                        onPress={handleBack}
                        size="md"
                        color={themeColors.text}
                    />
                    <Text style={[styles.title, { color: themeColors.text }]} numberOfLines={1}>
                        {params.editingId ? t('library.section.editSection') : t('library.section.newSection')}
                    </Text>
                    <IconButton
                        icon={{ sf: 'checkmark', IconComponent: Check }}
                        onPress={handleSave}
                        size="md"
                        variant={canSave ? 'primary' : 'default'}
                        disabled={!canSave}
                    />
                </View>

                {/* Section Details */}
                <View style={styles.sectionConfig}>
                    <InputBox
                        label={t('library.section.name')}
                        value={state.name}
                        onChangeText={(text) => setState(prev => ({ ...prev, name: text }))}
                        placeholder={t('library.section.namePlaceholder')}
                        required
                    />

                    <View style={[styles.configCard, { backgroundColor: themeColors.surfaceSecondary }]}>
                        <DropdownMenuWrapper options={SECTION_TYPES.map((type) => ({
                            label: type.label,
                            subtitle: type.description,
                            onPress: () => setState(prev => ({ ...prev, sectionType: type.value as SectionType }))
                        }))}>
                            <View style={styles.fieldRow}>
                                <View style={styles.labelContainer}>
                                    <Text style={[styles.fieldLabel, { color: themeColors.mutedText }]}>{t('library.section.type')}</Text>
                                    <Text style={styles.requiredAsterisk}>*</Text>
                                </View>
                                <View style={styles.dropdownValueRow}>
                                    <Text style={[styles.dropdownValue, { color: themeColors.text }]}>
                                        {SECTION_TYPES.find(opt => opt.value === state.sectionType)?.label}
                                    </Text>
                                    <ChevronDown {...({ size: 14, color: themeColors.mutedText } as any)} />
                                </View>
                            </View>
                        </DropdownMenuWrapper>

                        {state.sectionType === 'amrap' && (
                            <>
                                <View style={[styles.configDivider, { backgroundColor: themeColors.border }]} />
                                <View style={styles.fieldRow}>
                                    <View style={styles.labelContainer}>
                                        <Text style={[styles.fieldLabel, { color: themeColors.mutedText }]}>{t('library.section.duration')}</Text>
                                        <Text style={styles.requiredAsterisk}>*</Text>
                                    </View>
                                    <View style={[styles.dropdownValueRow, { flex: 1, justifyContent: 'flex-end' }]}>
                                        <TextInput
                                            value={state.duration}
                                            onChangeText={(text) => setState(prev => ({ ...prev, duration: text }))}
                                            placeholder="0"
                                            placeholderTextColor={themeColors.mutedText}
                                            keyboardType="number-pad"
                                            style={[styles.dropdownValue, { color: themeColors.text, textAlign: 'right', minWidth: 120, height: '100%' }]}
                                        />
                                        <Text style={[styles.dropdownValue, { color: themeColors.mutedText }]}>m</Text>
                                    </View>
                                </View>
                            </>
                        )}

                        {state.sectionType === 'timed' && (
                            <>
                                <View style={[styles.configDivider, { backgroundColor: themeColors.border }]} />
                                <View style={styles.fieldRow}>
                                    <View style={styles.labelContainer}>
                                        <Text style={[styles.fieldLabel, { color: themeColors.mutedText }]}>{t('library.section.rounds')}</Text>
                                        <Text style={styles.requiredAsterisk}>*</Text>
                                    </View>
                                    <View style={[styles.dropdownValueRow, { flex: 1, justifyContent: 'flex-end' }]}>
                                        <TextInput
                                            value={state.rounds}
                                            onChangeText={(text) => setState(prev => ({ ...prev, rounds: text }))}
                                            placeholder="0"
                                            placeholderTextColor={themeColors.mutedText}
                                            keyboardType="number-pad"
                                            style={[styles.dropdownValue, { color: themeColors.text, textAlign: 'right', minWidth: 120, height: '100%' }]}
                                        />
                                    </View>
                                </View>
                            </>
                        )}

                        {state.sectionType === 'circuits' && (
                            <>
                                <View style={[styles.configDivider, { backgroundColor: themeColors.border }]} />
                                <View style={styles.fieldRow}>
                                    <View style={styles.labelContainer}>
                                        <Text style={[styles.fieldLabel, { color: themeColors.mutedText }]}>{t('library.section.rounds')}</Text>
                                        <Text style={styles.requiredAsterisk}>*</Text>
                                    </View>
                                    <View style={[styles.dropdownValueRow, { flex: 1, justifyContent: 'flex-end' }]}>
                                        <TextInput
                                            value={state.rounds}
                                            onChangeText={(text) => setState(prev => ({ ...prev, rounds: text }))}
                                            placeholder="0"
                                            placeholderTextColor={themeColors.mutedText}
                                            keyboardType="number-pad"
                                            style={[styles.dropdownValue, { color: themeColors.text, textAlign: 'right', minWidth: 120, height: '100%' }]}
                                        />
                                    </View>
                                </View>
                            </>
                        )}
                    </View>

                    <TextAreaInput
                        label={t('library.section.notes')}
                        value={state.notes}
                        onChangeText={(text) => setState(prev => ({ ...prev, notes: text }))}
                        placeholder={t('library.section.notesPlaceholder')}
                        numberOfLines={4}
                        minHeight={80}
                    />
                </View>

                <View style={[styles.fullWidthDivider, { backgroundColor: themeColors.border }]} />

                {state.exercises.length === 0 && (
                    <Text style={[styles.emptyText, { color: themeColors.mutedText }]}>
                        {t('library.section.addExercisesHint')}
                    </Text>
                )}

                {state.exercises.map((ex, index) => {
                    const isLinkedToPrev = index > 0 && state.exercises[index - 1].isSupersetNext;
                    const isLinkedToNext = ex.isSupersetNext;
                    const isLast = index === state.exercises.length - 1;
                    const canSupersetNext = !isLast;

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
                                onDelete={() => handleDeleteExercise(index)}
                                isLinkedToPrev={isLinkedToPrev}
                                isLinkedToNext={isLinkedToNext}
                                canMoveUp={index > 0}
                                canMoveDown={index < state.exercises.length - 1}
                                onMoveUp={() => handleMoveUp(index)}
                                onMoveDown={() => handleMoveDown(index)}
                                hideSetControls={state.sectionType === 'amrap' || state.sectionType === 'timed'}
                                validationErrors={validationErrors}
                                onSwap={() => handleSwapExercise(index)}
                            />

                            {!isLast && canSupersetNext && (
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
                                            <LinkIcon {...({ size: 12, color: isLinkedToNext ? themeColors.primary : themeColors.text } as any)} />
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
                            )}

                            {!isLast && !canSupersetNext && (
                                <View style={{ height: 16 }} />
                            )}
                        </React.Fragment>
                    );
                })}

                <View style={{ height: 160 }} />
            </KeyboardAwareScrollView>

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
                        <PressableScale
                            style={[styles.actionButton, { backgroundColor: themeColors.iconButton }]}
                            onPress={handleAddExercise}
                        >
                            <Plus {...({ size: 18, color: themeColors.text, style: styles.buttonIcon } as any)} />
                            <Text style={[styles.actionButtonText, { color: themeColors.text }]}>{t('library.workout.add')}</Text>
                        </PressableScale>
                    </View>
                </View>
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
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 16,
        paddingBottom: 32,
    },
    sectionConfig: {
        gap: 16,
        marginBottom: 24,
    },
    configCard: {
        borderRadius: 16,
        overflow: 'hidden',
    },
    configDivider: {
        height: 1,
        marginHorizontal: 16,
    },
    fullWidthDivider: {
        height: 1,
        marginHorizontal: -16,
        marginBottom: 24,
    },
    fieldRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 14,
    },
    fieldLabel: {
        ...typography.p4,
    },
    labelContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    requiredAsterisk: {
        ...typography.p4,
        color: '#EF4444',
        marginLeft: 2,
    },
    dropdownValueRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    dropdownValue: {
        ...typography.p2,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: 12,
        marginBottom: 16,
        height: 56,
    },
    title: {
        ...typography.h6,
        flex: 1,
        textAlign: 'center',
        marginHorizontal: 8,
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
        height: 48,
        borderRadius: 24,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
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
        borderLeftWidth: 1,
        borderRightWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1,
    },
    linkedConnector: {
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
