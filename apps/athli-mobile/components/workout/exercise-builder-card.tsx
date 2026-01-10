import React, { useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, Switch, Platform } from 'react-native';
import { Trash2, Plus, Minus, Ellipsis, Repeat, Info, ArrowUp, ArrowDown } from 'lucide-react-native';
import { Image } from 'expo-image';
import { PressableScale } from 'pressto';

import { useRouter } from 'expo-router';
import { typography } from '@/constants/typography';
import { useThemePreference } from '@/contexts/useColorScheme';
import { Card } from '@/components/card';
import { IconButton } from '@/components/icon-button';
import { DropdownMenuWrapper, type DropdownMenuOption } from '@/components/dropdown-menu';
import { InputBox } from '@/components/form-inputs';
import { useModalCallbacks } from '@/contexts/modal-callbacks';
import { COLUMN_OPTIONS, type WorkoutExercise, type ExerciseSet } from './types';
import { type ExerciseValidationError, hasSetError, hasTempoError } from './validation';

type ExerciseBuilderCardProps = {
    exercise: WorkoutExercise;
    onUpdateExercise: (updates: Partial<WorkoutExercise>) => void;
    onDelete: () => void;
    isLinkedToPrev?: boolean;
    isLinkedToNext?: boolean;
    canMoveUp?: boolean;
    canMoveDown?: boolean;
    onMoveUp?: () => void;
    onMoveDown?: () => void;
    hideSetControls?: boolean;
    validationErrors?: ExerciseValidationError[];
};

const RED_ERROR = '#EF4444';
const AMBER = '#F59E0B';
const GREEN = '#22C55E';
const PRIMARY = '#3B82F6'; // Default primary fallback if not from theme

const TempoInput = ({ value, onChange, themeColors, hasError }: { value: string; onChange: (val: string) => void; themeColors: any; hasError?: boolean }) => {
    const handleChangeText = (text: string) => {
        const cleaned = text.replace(/[^0-9]/g, '');
        const parts = cleaned.split('').slice(0, 4);
        const formatted = parts.join('-');
        onChange(formatted);
    };

    return (
        <TextInput
            value={value}
            onChangeText={handleChangeText}
            placeholder="X-X-X-X"
            placeholderTextColor={themeColors.mutedText}
            keyboardType="number-pad"
            maxLength={7}
            style={[
                styles.tempoInput,
                {
                    color: themeColors.text,
                    borderColor: hasError ? RED_ERROR : themeColors.border,
                    borderWidth: hasError ? 2 : 1,
                    backgroundColor: themeColors.pageBackground
                }
            ]}
        />
    );
};

export const ExerciseBuilderCard = ({
    exercise,
    onUpdateExercise,
    onDelete,
    isLinkedToPrev,
    isLinkedToNext,
    canMoveUp,
    canMoveDown,
    onMoveUp,
    onMoveDown,
    hideSetControls,
    validationErrors = [],
}: ExerciseBuilderCardProps) => {
    const { colors: themeColors } = useThemePreference();
    const router = useRouter();
    const { setExercisesSelectCallback } = useModalCallbacks();

    const handleOpenAlternatives = () => {
        setExercisesSelectCallback((exercises) => {
            const newAlternatives = exercises.map(ex => ({
                id: ex.exerciseId,
                name: ex.name,
                imageUrl: ex.imageUrl
            }));

            // Merge with existing avoiding duplicates
            const currentIds = new Set(exercise.alternatives.map(a => a.id));
            const uniqueNew = newAlternatives.filter(a => !currentIds.has(a.id));

            onUpdateExercise({
                alternatives: [...exercise.alternatives, ...uniqueNew]
            });
        });

        router.push({
            pathname: '/modals/workout/add-exercise-to-builder-modal',
            params: { multiple: 'true', title: 'Add Alternatives' }
        });
    };

    const handleDeleteAlternative = (id: string) => {
        onUpdateExercise({
            alternatives: exercise.alternatives.filter(a => a.id !== id)
        });
    };

    const handleUpdateSet = (index: number, updates: Partial<ExerciseSet>) => {
        const newSets = [...exercise.sets];
        newSets[index] = { ...newSets[index], ...updates };
        onUpdateExercise({ sets: newSets });
    };

    const handleAddSet = () => {
        const newSets = [...exercise.sets, {
            id: Math.random().toString(),
            column1: '',
            column2: '',
            type: 'R' as const
        }];
        onUpdateExercise({ sets: newSets });
    };

    const handleRemoveSet = (index: number) => {
        if (exercise.sets.length <= 1) return;
        const newSets = exercise.sets.filter((_, i) => i !== index);
        onUpdateExercise({ sets: newSets });
    };

    const handleRemoveLastSet = () => {
        if (exercise.sets.length <= 1) return;
        const newSets = exercise.sets.slice(0, -1);
        onUpdateExercise({ sets: newSets });
    };

    const getColumnOptions = (isFirstColumn: boolean): DropdownMenuOption[] => {
        const otherValue = isFirstColumn ? exercise.column2Type : exercise.column1Type;
        return COLUMN_OPTIONS
            .filter(opt => opt.value !== otherValue)
            .map(opt => ({
                label: opt.label,
                onPress: () => {
                    if (isFirstColumn) {
                        onUpdateExercise({ column1Type: opt.value });
                    } else {
                        onUpdateExercise({ column2Type: opt.value });
                    }
                },
            }));
    };

    const handleThumbnailPress = (name: string) => {
        router.push({
            pathname: '/modals/workout/exercise-details-modal',
            params: { name }
        });
    };

    const actionOptions: DropdownMenuOption[] = [
        // Move options - only show if not linked to previous (i.e., top of superset or standalone)
        ...(!isLinkedToPrev && (canMoveUp || canMoveDown) ? [
            ...(canMoveUp ? [{
                label: 'Move Up',
                icon: { sf: 'arrow.up', IconComponent: ArrowUp },
                onPress: onMoveUp!,
            }] : []),
            ...(canMoveDown ? [{
                label: 'Move Down',
                icon: { sf: 'arrow.down', IconComponent: ArrowDown },
                onPress: onMoveDown!,
            }] : []),
            { separator: true },
        ] : []),
        {
            label: 'Add Alternatives',
            icon: { sf: 'arrow.triangle.2.circlepath', IconComponent: Repeat },
            onPress: handleOpenAlternatives,
        },
        {
            label: 'Information',
            icon: { sf: 'info.circle', IconComponent: Info },
            onPress: () => handleThumbnailPress(exercise.name),
        },
        {
            label: 'Delete Exercise',
            icon: { sf: 'trash', IconComponent: Trash2 },
            destructive: true,
            onPress: onDelete,
        }
    ];

    const setTypeOptions = (index: number): DropdownMenuOption[] => [
        { label: 'Regular', onPress: () => handleUpdateSet(index, { type: 'R' }) },
        { label: 'Warm up', onPress: () => handleUpdateSet(index, { type: 'W' }) },
        { label: 'Failure', onPress: () => handleUpdateSet(index, { type: 'F' }) },
        { label: 'Dropset', onPress: () => handleUpdateSet(index, { type: 'D' }) },
    ];

    return (
        <Card style={[
            styles.card,
            {
                backgroundColor: 'transparent',
                borderColor: themeColors.border,
                paddingHorizontal: 0,
                paddingVertical: 0,
                borderTopLeftRadius: isLinkedToPrev ? 0 : 24,
                borderTopRightRadius: isLinkedToPrev ? 0 : 24,
                borderBottomLeftRadius: isLinkedToNext ? 0 : 24,
                borderBottomRightRadius: isLinkedToNext ? 0 : 24,
                borderTopWidth: isLinkedToPrev ? 0 : 1,
                borderBottomWidth: isLinkedToNext ? 0 : 1,
                marginBottom: isLinkedToNext ? 0 : 16,
            }
        ]}>
            {/* Top Section: Thumbnail and Name */}
            <View style={styles.topSection}>
                <PressableScale onPress={() => handleThumbnailPress(exercise.name)}>
                    <Image
                        source={{ uri: exercise.imageUrl }}
                        style={[
                            styles.thumbnail,
                            isLinkedToPrev && { borderTopRightRadius: 24 }
                        ]}
                        contentFit="cover"
                    />
                </PressableScale>

                <View style={styles.nameContainer}>
                    <Text style={[styles.exerciseNameText, { color: themeColors.text }]} numberOfLines={1}>
                        {exercise.name}
                    </Text>
                </View>

                <View style={styles.headerAction}>
                    <DropdownMenuWrapper options={actionOptions}>
                        <IconButton
                            icon={{ sf: 'ellipsis', IconComponent: Ellipsis }}
                            onPress={() => { }} // Zeego handles the trigger
                            size="md"
                            color={themeColors.text}
                        />
                    </DropdownMenuWrapper>
                </View>
            </View>

            <View style={[styles.divider, { backgroundColor: themeColors.border }]} />

            {/* Secondary Controls: Tempo & Each Side */}
            <View style={styles.secondaryControls}>
                <View style={styles.secondaryControlItem}>
                    <Text style={[styles.secondaryControlLabel, { color: themeColors.mutedText }]}>Tempo</Text>
                    <TempoInput
                        value={exercise.tempo || ''}
                        onChange={(val) => onUpdateExercise({ tempo: val })}
                        themeColors={themeColors}
                        hasError={hasTempoError(validationErrors, exercise.id)}
                    />
                </View>

                <View style={styles.secondaryControlItem}>
                    <Text style={[styles.secondaryControlLabel, { color: themeColors.mutedText }]}>Each side</Text>
                    <Switch
                        value={exercise.eachSide}
                        onValueChange={(val) => onUpdateExercise({ eachSide: val })}
                        trackColor={{ false: themeColors.border, true: themeColors.primary }}
                        thumbColor={Platform.OS === 'android' ? '#FFFFFF' : undefined}
                        ios_backgroundColor={themeColors.border}
                        style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
                    />
                </View>
            </View>

            {/* Sets Section */}
            <View style={styles.setsSection}>
                {/* Column Headers */}
                <View style={styles.setsHeader}>
                    <Text style={[styles.setsLabel, { color: themeColors.text }]}>Sets</Text>
                    <View style={styles.headerButtons}>
                        <View style={styles.columnHeader}>
                            <DropdownMenuWrapper options={getColumnOptions(true)}>
                                <View style={[styles.headerButton, { backgroundColor: themeColors.surfaceSecondary }]}>
                                    <Text style={[styles.headerButtonText, { color: themeColors.primary }]}>
                                        {COLUMN_OPTIONS.find(opt => opt.value === exercise.column1Type)?.label || exercise.column1Type}
                                    </Text>
                                </View>
                            </DropdownMenuWrapper>
                        </View>

                        <View style={styles.columnHeader}>
                            <DropdownMenuWrapper options={getColumnOptions(false)}>
                                <View style={[styles.headerButton, { backgroundColor: themeColors.surfaceSecondary }]}>
                                    <Text style={[styles.headerButtonText, { color: themeColors.primary }]}>
                                        {COLUMN_OPTIONS.find(opt => opt.value === exercise.column2Type)?.label || exercise.column2Type}
                                    </Text>
                                </View>
                            </DropdownMenuWrapper>
                        </View>
                    </View>
                    <View style={styles.rowActionFiller} />
                </View>

                {/* Set Rows */}
                {exercise.sets.map((set, index) => {
                    const typeColor = set.type === 'W' ? AMBER : set.type === 'F' ? RED_ERROR : set.type === 'D' ? PRIMARY : GREEN;
                    const setError = hasSetError(validationErrors, exercise.id, index);
                    return (
                        <View key={set.id} style={styles.setRow}>
                            <View style={styles.setNumberContainer}>
                                <DropdownMenuWrapper options={setTypeOptions(index)}>
                                    <View style={[styles.setTypeBadge, { borderColor: typeColor }]}>
                                        <Text style={[styles.setTypeText, { color: typeColor }]}>
                                            {set.type}
                                        </Text>
                                    </View>
                                </DropdownMenuWrapper>
                            </View>

                            <View style={styles.inputsRow}>
                                <TextInput
                                    style={[
                                        styles.setInput,
                                        {
                                            color: themeColors.text,
                                            borderColor: setError.column1 ? RED_ERROR : themeColors.border,
                                            borderWidth: setError.column1 ? 2 : 1,
                                            backgroundColor: themeColors.pageBackground
                                        }
                                    ]}
                                    value={set.column1}
                                    onChangeText={(text) => handleUpdateSet(index, { column1: text })}
                                    placeholder="0"
                                    placeholderTextColor={themeColors.mutedText}
                                    keyboardType="numeric"
                                />

                                <TextInput
                                    style={[
                                        styles.setInput,
                                        {
                                            color: themeColors.text,
                                            borderColor: setError.column2 ? RED_ERROR : themeColors.border,
                                            borderWidth: setError.column2 ? 2 : 1,
                                            backgroundColor: themeColors.pageBackground
                                        }
                                    ]}
                                    value={set.column2}
                                    onChangeText={(text) => handleUpdateSet(index, { column2: text })}
                                    placeholder="0"
                                    placeholderTextColor={themeColors.mutedText}
                                    keyboardType="numeric"
                                    editable={exercise.column2Type !== 'None'}
                                />
                            </View>

                            <View style={styles.rowAction}>
                                <PressableScale
                                    onPress={() => {
                                        if (exercise.sets.length > 1) {
                                            handleRemoveSet(index);
                                        }
                                    }}
                                    style={[styles.trashCircle, exercise.sets.length <= 1 && { opacity: 0.3 }]}
                                >
                                    <Trash2 {...({ size: 16, color: RED_ERROR } as any)} />
                                </PressableScale>
                            </View>
                        </View>
                    );
                })}

                {/* Add/Remove Sets Controls */}
                {!hideSetControls && (
                    <View style={styles.setsControls}>
                        <PressableScale
                            onPress={handleRemoveLastSet}
                            style={[
                                styles.controlButton,
                                { borderColor: themeColors.border },
                                exercise.sets.length <= 1 && styles.disabledControl
                            ]}
                        >
                            <Minus {...({ size: 16, color: exercise.sets.length <= 1 ? themeColors.mutedText : themeColors.text } as any)} />
                        </PressableScale>

                        <Text style={[styles.controlLabel, { color: themeColors.text }]}>Set</Text>

                        <PressableScale
                            onPress={handleAddSet}
                            style={[styles.controlButton, { borderColor: themeColors.primary, borderWidth: 2 }]}
                        >
                            <Plus {...({ size: 16, color: themeColors.primary } as any)} />
                        </PressableScale>
                    </View>
                )}

                <View style={styles.notesContainer}>
                    <InputBox
                        label="Notes"
                        hideLabel
                        value={exercise.notes || ''}
                        onChangeText={(text) => onUpdateExercise({ notes: text })}
                        placeholder="Add notes..."
                        containerStyle={{
                            backgroundColor: 'transparent',
                            borderColor: themeColors.border,
                            borderWidth: 1,
                            borderRadius: 12,
                            height: 48,
                            paddingTop: 0,
                            paddingBottom: 0,
                            justifyContent: 'center',
                        }}
                        inputRowStyle={{
                            height: 48,
                        }}
                        inputStyle={{
                            textAlign: 'left',
                            fontWeight: '500',
                            height: 48,
                        }}
                    />
                </View>

                {/* Alternatives Section */}
                {exercise.alternatives.length > 0 && (
                    <View style={styles.alternativesSection}>
                        <Text style={[styles.alternativesLabel, { color: themeColors.mutedText }]}>
                            Alternative Exercises
                        </Text>
                        {exercise.alternatives.map((alt, index) => (
                            <React.Fragment key={alt.id}>
                                <View style={styles.alternativeItem}>
                                    <PressableScale onPress={() => handleThumbnailPress(alt.name)}>
                                        <Image
                                            source={{ uri: alt.imageUrl }}
                                            style={styles.smallThumbnail}
                                            contentFit="cover"
                                        />
                                    </PressableScale>
                                    <Text style={[styles.alternativeName, { color: themeColors.text }]} numberOfLines={1}>
                                        {alt.name}
                                    </Text>
                                    <PressableScale
                                        onPress={() => handleDeleteAlternative(alt.id)}
                                        style={styles.smallTrashCircle}
                                    >
                                        <Trash2 {...({ size: 12, color: RED_ERROR } as any)} />
                                    </PressableScale>
                                </View>
                                {index < exercise.alternatives.length - 1 && (
                                    <View style={[styles.itemDivider, { backgroundColor: themeColors.border }]} />
                                )}
                            </React.Fragment>
                        ))}
                    </View>
                )}
            </View>
        </Card>
    );
};

const styles = StyleSheet.create({
    card: {
        marginBottom: 16,
        borderRadius: 24,
        borderWidth: 1,
        overflow: 'hidden',
    },
    topSection: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingRight: 8,
    },
    thumbnail: {
        width: 64,
        height: 64,
        backgroundColor: '#f0f0f0',
    },
    nameContainer: {
        flex: 1,
        marginLeft: 16,
    },
    exerciseNameText: {
        fontSize: 18,
        fontWeight: '700',
    },
    headerAction: {
        paddingHorizontal: 8,
    },
    divider: {
        height: 1,
        width: '100%',
        marginBottom: 4,
    },
    notesContainer: {
        marginTop: 12,
    },
    setsSection: {
        paddingHorizontal: 8,
        paddingVertical: 12,
    },
    setsHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    setsLabel: {
        ...typography.p1,
        fontWeight: '600',
        width: 44,
        textAlign: 'center',
    },
    headerButtons: {
        flex: 1,
        flexDirection: 'row',
        gap: 12,
    },
    columnHeader: {
        flex: 1,
        alignItems: 'center',
    },
    headerButton: {
        paddingHorizontal: 16,
        height: 32,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerButtonText: {
        ...typography.p1,
        fontWeight: '600',
    },
    setRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    setNumberContainer: {
        width: 32,
        alignItems: 'center',
        marginLeft: 4,
        marginRight: 8,
    },
    setTypeBadge: {
        width: 30,
        height: 30,
        borderRadius: 15,
        borderWidth: 1.5,
        alignItems: 'center',
        justifyContent: 'center',
    },
    setTypeText: {
        ...typography.p3,
        fontWeight: '800',
    },
    inputsRow: {
        flex: 1,
        flexDirection: 'row',
        gap: 12,
    },
    setInput: {
        flex: 1,
        height: 48,
        borderRadius: 12,
        borderWidth: 1,
        textAlign: 'center',
        ...typography.p1,
    },
    rowAction: {
        width: 32,
        alignItems: 'flex-end',
        marginRight: 4,
        marginLeft: 8,
    },
    rowActionFiller: {
        width: 32,
        marginLeft: 12,
    },
    trashCircle: {
        width: 30,
        height: 30,
        borderRadius: 15,
        borderWidth: 1.5,
        borderColor: RED_ERROR,
        alignItems: 'center',
        justifyContent: 'center',
    },
    setsControls: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 8,
        gap: 12,
    },
    controlButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        borderWidth: 1.5,
        alignItems: 'center',
        justifyContent: 'center',
    },
    secondaryControls: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 8,
        marginBottom: 4,
        paddingHorizontal: 8,
    },
    secondaryControlItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    secondaryControlLabel: {
        ...typography.p3,
        fontWeight: '600',
    },
    tempoInput: {
        width: 120,
        height: 40,
        borderRadius: 12,
        borderWidth: 1,
        textAlign: 'center',
        fontSize: 16,
        fontWeight: '700',
        padding: 0,
    },
    disabledControl: {
        opacity: 0.5,
    },
    controlLabel: {
        ...typography.p1,
        fontWeight: '700',
    },
    alternativesSection: {
        marginTop: 16,
        paddingHorizontal: 4,
    },
    alternativesLabel: {
        fontSize: 10,
        fontWeight: '700',
        marginBottom: 8,
        letterSpacing: 0.5,
    },
    alternativeItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 6,
    },
    smallThumbnail: {
        width: 24,
        height: 24,
        borderRadius: 4,
        backgroundColor: '#f0f0f0',
    },
    alternativeName: {
        flex: 1,
        marginLeft: 10,
        ...typography.p3,
        fontWeight: '500',
    },
    itemDivider: {
        height: 1,
        width: '100%',
    },
    smallTrashCircle: {
        width: 22,
        height: 22,
        borderRadius: 11,
        borderWidth: 1,
        borderColor: RED_ERROR,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
