import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, Platform, Keyboard, TextInput } from 'react-native';
import { ChevronLeft, Check, Plus, Dumbbell, Repeat, ChevronDown } from 'lucide-react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';

import { typography } from '@/constants/typography';
import { useThemePreference } from '@/contexts/useColorScheme';
import { useTranslations } from '@/contexts/useTranslations';
import { IconButton } from '@/components/icon-button';
import { InputBox, TextAreaInput } from '@/components/form-inputs';
import { DropdownMenuWrapper } from '@/components/dropdown-menu';
import { ScreenWrapper } from '@/components/screen-wrapper';
import { PressableScale } from 'pressto';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useModalCallbacks } from '@/contexts/modal-callbacks';
import { ExerciseBuilderCard } from '@/components/workout/exercise-builder-card';
import { getDefaultColumns, type WorkoutExercise, type WorkoutSection } from '@/components/workout/types';
import { Exercise } from '@/app/modals/workout/add-exercise-to-builder-modal';
import { hexToRgba } from '@/utils/colorUtils';
import { type SectionType, SECTION_TYPES } from '@/constants/training';

export default function SectionBuilderScreen() {
    const router = useRouter();
    const params = useLocalSearchParams<{
        name: string;
        sectionType: SectionType;
        duration?: string;
        rounds?: string;
        notes?: string;
        editingId?: string;
    }>();

    const { colors: themeColors } = useThemePreference();
    const { t } = useTranslations();
    const insets = useSafeAreaInsets();
    const { triggerSectionSelect, setExercisesSelectCallback } = useModalCallbacks();

    const [sectionName, setSectionName] = useState(params.name || '');
    const [sectionType, setSectionType] = useState<SectionType>((params.sectionType as SectionType) || 'regular');
    const [duration, setDuration] = useState(params.duration || '');
    const [rounds, setRounds] = useState(params.rounds || '');
    const [notes, setNotes] = useState(params.notes || '');
    const [exercises, setExercises] = useState<WorkoutExercise[]>([]);

    useEffect(() => {
        setExercisesSelectCallback((newExercises: Exercise[]) => {
            const items: WorkoutExercise[] = newExercises.map((exercise, idx) => ({
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
            setExercises(prev => [...prev, ...items]);
        });
    }, [setExercisesSelectCallback]);

    const handleSave = () => {
        const section: WorkoutSection = {
            id: params.editingId || `section-${Date.now()}`,
            type: 'section',
            name: sectionName,
            sectionType: sectionType,
            duration: duration,
            rounds: rounds,
            notes: notes,
            exercises: exercises,
        };
        triggerSectionSelect(section);
        router.back();
    };

    const handleBack = () => {
        router.back();
    };

    const handleAddExercise = () => {
        router.push({
            pathname: '/modals/workout/add-exercise-to-builder-modal',
            params: { multiple: 'true' }
        });
    };

    const handleUpdateExercise = (index: number, updates: Partial<WorkoutExercise>) => {
        const newExercises = [...exercises];
        newExercises[index] = { ...newExercises[index], ...updates };
        setExercises(newExercises);
    };

    const handleDeleteExercise = (index: number) => {
        setExercises(prev => prev.filter((_, i) => i !== index));
    };

    const toggleSuperset = (index: number) => {
        const newExercises = [...exercises];
        newExercises[index] = {
            ...newExercises[index],
            isSupersetNext: !newExercises[index].isSupersetNext
        };
        setExercises(newExercises);
    };

    const handleMoveUp = (index: number) => {
        if (index === 0) return;
        const newExercises = [...exercises];
        [newExercises[index - 1], newExercises[index]] = [newExercises[index], newExercises[index - 1]];
        setExercises(newExercises);
    };

    const handleMoveDown = (index: number) => {
        if (index === exercises.length - 1) return;
        const newExercises = [...exercises];
        [newExercises[index], newExercises[index + 1]] = [newExercises[index + 1], newExercises[index]];
        setExercises(newExercises);
    };

    const handleReorder = () => {
        console.log('Reorder mode');
    };

    const headerHeight = Platform.OS === 'android' ? 56 + insets.top : 56;
    const gradientHeight = headerHeight + 12;

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
                        Edit Section
                    </Text>
                    <IconButton
                        icon={{ sf: 'checkmark', IconComponent: Check }}
                        onPress={handleSave}
                        size="md"
                        variant="primary"
                    />
                </View>

                {/* Section Details */}
                <View style={styles.sectionConfig}>
                    <InputBox
                        label="Name"
                        value={sectionName}
                        onChangeText={setSectionName}
                        placeholder="Warm Up"
                        required
                    />

                    <View style={[styles.configCard, { backgroundColor: themeColors.surfaceSecondary }]}>
                        <DropdownMenuWrapper options={SECTION_TYPES.map((type) => ({
                            label: type.label,
                            subtitle: type.description,
                            onPress: () => setSectionType(type.value as SectionType)
                        }))}>
                            <View style={styles.fieldRow}>
                                <View style={styles.labelContainer}>
                                    <Text style={[styles.fieldLabel, { color: themeColors.mutedText }]}>Type</Text>
                                    <Text style={styles.requiredAsterisk}>*</Text>
                                </View>
                                <View style={styles.dropdownValueRow}>
                                    <Text style={[styles.dropdownValue, { color: themeColors.text }]}>
                                        {SECTION_TYPES.find(opt => opt.value === sectionType)?.label}
                                    </Text>
                                    <ChevronDown {...({ size: 14, color: themeColors.mutedText } as any)} />
                                </View>
                            </View>
                        </DropdownMenuWrapper>

                        {sectionType === 'amrap' && (
                            <>
                                <View style={[styles.configDivider, { backgroundColor: themeColors.border }]} />
                                <View style={styles.fieldRow}>
                                    <View style={styles.labelContainer}>
                                        <Text style={[styles.fieldLabel, { color: themeColors.mutedText }]}>Duration</Text>
                                        <Text style={styles.requiredAsterisk}>*</Text>
                                    </View>
                                    <View style={[styles.dropdownValueRow, { flex: 1, justifyContent: 'flex-end' }]}>
                                        <TextInput
                                            value={duration}
                                            onChangeText={setDuration}
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

                        {sectionType === 'timed' && (
                            <>
                                <View style={[styles.configDivider, { backgroundColor: themeColors.border }]} />
                                <View style={styles.fieldRow}>
                                    <View style={styles.labelContainer}>
                                        <Text style={[styles.fieldLabel, { color: themeColors.mutedText }]}>Rounds</Text>
                                        <Text style={styles.requiredAsterisk}>*</Text>
                                    </View>
                                    <View style={[styles.dropdownValueRow, { flex: 1, justifyContent: 'flex-end' }]}>
                                        <TextInput
                                            value={rounds}
                                            onChangeText={setRounds}
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
                        label="Notes"
                        value={notes}
                        onChangeText={setNotes}
                        placeholder="Add any additional notes..."
                        numberOfLines={4}
                        minHeight={80}
                    />
                </View>

                <View style={[styles.fullWidthDivider, { backgroundColor: themeColors.border }]} />

                {exercises.length === 0 && (
                    <Text style={[styles.emptyText, { color: themeColors.mutedText }]}>
                        Add exercises to this section
                    </Text>
                )}

                {exercises.map((ex, index) => {
                    const isLinkedToPrev = index > 0 && exercises[index - 1].isSupersetNext;
                    const isLinkedToNext = ex.isSupersetNext;
                    const isLast = index === exercises.length - 1;

                    return (
                        <React.Fragment key={ex.id}>
                            <ExerciseBuilderCard
                                exercise={ex}
                                onUpdateExercise={(updates) => handleUpdateExercise(index, updates)}
                                onDelete={() => handleDeleteExercise(index)}
                                isLinkedToPrev={isLinkedToPrev}
                                isLinkedToNext={isLinkedToNext}
                                canMoveUp={index > 0}
                                canMoveDown={index < exercises.length - 1}
                                onMoveUp={() => handleMoveUp(index)}
                                onMoveDown={() => handleMoveDown(index)}
                                hideSetControls={sectionType === 'amrap' || sectionType === 'timed'}
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
                                            <Repeat {...({ size: 12, color: isLinkedToNext ? themeColors.primary : themeColors.text } as any)} />
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

                <View style={{ height: 160 }} />
            </KeyboardAwareScrollView>

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
                        <PressableScale
                            style={[styles.actionButton, { backgroundColor: themeColors.iconButton }]}
                            onPress={handleAddExercise}
                        >
                            <Plus {...({ size: 18, color: themeColors.text, style: styles.buttonIcon } as any)} />
                            <Text style={[styles.actionButtonText, { color: themeColors.text }]}>Add</Text>
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
