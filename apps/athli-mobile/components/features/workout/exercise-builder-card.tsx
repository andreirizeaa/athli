import React, { useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, Switch, Platform } from 'react-native';
import { Trash2, Plus, Ellipsis, Repeat, Info, ArrowUp, ArrowDown, Timer } from 'lucide-react-native';
import { Image } from 'expo-image';
import { PressableScale } from 'pressto';

import { useRouter } from 'expo-router';
import { typography } from '@/constants/typography';
import { useThemePreference } from '@/stores';
import { Card } from '@/components/ui/card';
import { IconButton } from '@/components/ui/icon-button';
import { DropdownMenuWrapper, type DropdownMenuOption } from '@/components/ui/dropdown-menu';
import { InputBox } from '@/components/ui/form-inputs';
import { useModalCallbacks } from '@/stores';
import { COLUMN_OPTIONS, HEART_RATE_ZONE_OPTIONS, type WorkoutExercise, type ExerciseSet } from './types';
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
    onSwap: () => void;
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
                    backgroundColor: themeColors.surfacePrimary
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
    onSwap,
}: ExerciseBuilderCardProps) => {
    const { colors: themeColors, preset } = useThemePreference();
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

    const getHRZoneOptions = (setIndex: number, column: 'column1' | 'column2'): DropdownMenuOption[] => {
        return HEART_RATE_ZONE_OPTIONS.map(opt => ({
            label: opt.label,
            subtitle: opt.subtitle,
            onPress: () => handleUpdateSet(setIndex, { [column]: opt.value }),
        }));
    };

    const getColumnOptions = (isFirstColumn: boolean): DropdownMenuOption[] => {
        const otherValue = isFirstColumn ? exercise.column2Type : exercise.column1Type;
        return COLUMN_OPTIONS
            .filter(opt => opt.value !== otherValue)
            .map(opt => ({
                label: opt.label,
                onPress: () => {
                    const currentValue = isFirstColumn ? exercise.column1Type : exercise.column2Type;
                    if (currentValue === opt.value) return;

                    const newSets = exercise.sets.map(s => ({
                        ...s,
                        [isFirstColumn ? 'column1' : 'column2']: ''
                    }));

                    if (isFirstColumn) {
                        onUpdateExercise({ column1Type: opt.value, sets: newSets });
                    } else {
                        onUpdateExercise({ column2Type: opt.value, sets: newSets });
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
            label: 'Swap Exercise',
            icon: { sf: 'arrow.triangle.2.circlepath', IconComponent: Repeat },
            onPress: onSwap,
        },
        {
            label: 'Add Alternatives',
            icon: { sf: 'plus', IconComponent: Plus },
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


    const formatRestTime = (seconds?: number) => {
        if (seconds === undefined || seconds === null || seconds === 0) return 'Rest Timer: Off';

        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;

        if (mins > 0) {
            return `Rest Timer: ${mins}min ${secs > 0 ? secs + 's' : ''}`;
        }
        return `Rest Timer: ${secs}s`;
    };

    const getRestTimerOptions = (): DropdownMenuOption[] => {
        const options: DropdownMenuOption[] = [
            {
                label: 'Off',
                onPress: () => onUpdateExercise({ setRestSec: 0 }),
            }
        ];

        // 5s increments up to 10min (600s)
        for (let s = 5; s <= 600; s += 5) {
            const m = Math.floor(s / 60);
            const sec = s % 60;
            let label = '';

            if (m > 0) {
                label = sec > 0 ? `${m}min ${sec}s` : `${m}min`;
            } else {
                label = `${s}s`;
            }

            options.push({
                label: label,
                onPress: () => onUpdateExercise({ setRestSec: s }),
            });
        }

        return options;
    };

    return (
        <Card style={[
            styles.card,
            {
                backgroundColor: themeColors.surfacePrimary,
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
                        trackColor={{ false: themeColors.border, true: preset === 'default' ? '#636366' : themeColors.primary }}
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
                                <View style={[styles.headerButton, { backgroundColor: themeColors.backgroundTertiary }]}>
                                    <Text style={[styles.headerButtonText, { color: themeColors.primary }]}>
                                        {COLUMN_OPTIONS.find(opt => opt.value === exercise.column1Type)?.label || exercise.column1Type}
                                    </Text>
                                </View>
                            </DropdownMenuWrapper>
                        </View>

                        <View style={styles.columnHeader}>
                            <DropdownMenuWrapper options={getColumnOptions(false)}>
                                <View style={[styles.headerButton, { backgroundColor: themeColors.backgroundTertiary }]}>
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
                                {exercise.column1Type === 'Heart Rate Zone' ? (
                                    <View style={{ flex: 1 }}>
                                        <DropdownMenuWrapper options={getHRZoneOptions(index, 'column1')}>
                                            <View style={[
                                                styles.setInput,
                                                {
                                                    borderColor: setError.column1 ? RED_ERROR : themeColors.border,
                                                    borderWidth: setError.column1 ? 2 : 1,
                                                    backgroundColor: themeColors.surfacePrimary,
                                                    justifyContent: 'center',
                                                    width: '100%'
                                                }
                                            ]}>
                                                <Text style={[styles.setInputText, { color: set.column1 ? themeColors.text : themeColors.mutedText }]}>
                                                    {set.column1 || 'Select'}
                                                </Text>
                                            </View>
                                        </DropdownMenuWrapper>
                                    </View>
                                ) : (
                                    <TextInput
                                        style={[
                                            styles.setInput,
                                            {
                                                color: themeColors.text,
                                                borderColor: setError.column1 ? RED_ERROR : themeColors.border,
                                                borderWidth: setError.column1 ? 2 : 1,
                                                backgroundColor: themeColors.surfacePrimary
                                            }
                                        ]}
                                        value={set.column1}
                                        onChangeText={(text) => handleUpdateSet(index, { column1: text })}
                                        placeholder="0"
                                        placeholderTextColor={themeColors.mutedText}
                                        keyboardType="numeric"
                                    />
                                )}

                                {exercise.column2Type === 'Heart Rate Zone' ? (
                                    <View style={{ flex: 1 }}>
                                        <DropdownMenuWrapper options={getHRZoneOptions(index, 'column2')}>
                                            <View style={[
                                                styles.setInput,
                                                {
                                                    borderColor: setError.column2 ? RED_ERROR : themeColors.border,
                                                    borderWidth: setError.column2 ? 2 : 1,
                                                    backgroundColor: themeColors.surfacePrimary,
                                                    justifyContent: 'center',
                                                    width: '100%'
                                                }
                                            ]}>
                                                <Text style={[styles.setInputText, { color: set.column2 ? themeColors.text : themeColors.mutedText }]}>
                                                    {set.column2 || 'Select'}
                                                </Text>
                                            </View>
                                        </DropdownMenuWrapper>
                                    </View>
                                ) : (
                                    <TextInput
                                        style={[
                                            styles.setInput,
                                            {
                                                color: themeColors.text,
                                                borderColor: setError.column2 ? RED_ERROR : themeColors.border,
                                                borderWidth: setError.column2 ? 2 : 1,
                                                backgroundColor: themeColors.surfacePrimary
                                            }
                                        ]}
                                        value={set.column2}
                                        onChangeText={(text) => handleUpdateSet(index, { column2: text })}
                                        placeholder="0"
                                        placeholderTextColor={themeColors.mutedText}
                                        keyboardType="numeric"
                                        editable={exercise.column2Type !== 'None'}
                                    />
                                )}
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

                {/* Add Set Row + Rest Timer */}
                {!hideSetControls && (
                    <View style={styles.addSetRow}>
                        <View style={styles.setNumberContainer}>
                            <PressableScale
                                onPress={handleAddSet}
                                style={[styles.addSetCircle, { borderColor: themeColors.primary }]}
                            >
                                <Plus {...({ size: 16, color: themeColors.primary } as any)} />
                            </PressableScale>
                        </View>
                        <View style={styles.inputsRow}>
                            {/* Empty space to match the layout */}
                        </View>
                        <View style={styles.restTimerContainer}>
                            <DropdownMenuWrapper options={getRestTimerOptions()}>
                                <View style={[styles.restTimerButton, { backgroundColor: themeColors.backgroundTertiary }]}>
                                    <Timer {...({ size: 16, color: themeColors.primary } as any)} />
                                    <Text style={[styles.restTimerText, { color: themeColors.primary }]}>
                                        {formatRestTime(exercise.setRestSec)}
                                    </Text>
                                </View>
                            </DropdownMenuWrapper>
                        </View>
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
                            height: 40,
                            paddingTop: 0,
                            paddingBottom: 0,
                            justifyContent: 'center',
                        }}
                        inputRowStyle={{
                            height: 40,
                        }}
                        inputStyle={{
                            textAlign: 'left',
                            fontWeight: '400',
                            fontSize: 13,
                            height: 40,
                        }}
                    />
                </View>

                {/* Alternatives Section */}
                {(() => {
                    const validAlternatives = exercise.alternatives.filter(alt => alt !== null);
                    return validAlternatives.length > 0 && (
                        <View style={[
                            styles.alternativesSection,
                            isLinkedToNext && { paddingBottom: 16 }
                        ]}>
                            <Text style={[styles.alternativesLabel, { color: themeColors.mutedText }]}>
                                Alternative Exercises
                            </Text>
                            {validAlternatives.map((alt, index) => (
                                <View key={alt.id || `alt-${index}`}>
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
                                    {index < validAlternatives.length - 1 && (
                                        <View style={[styles.itemDivider, { backgroundColor: themeColors.border }]} />
                                    )}
                                </View>
                            ))}
                        </View>
                    );
                })()}
            </View>
            {/* Add padding at bottom when linked to next exercise to prevent clipping */}
            {isLinkedToNext && <View style={{ height: 16 }} />}
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
        borderRadius: 6,
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
        paddingHorizontal: 8,
        ...typography.p1,
    },
    setInputText: {
        ...typography.p1,
        textAlign: 'center',
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
    addSetRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    addSetCircle: {
        width: 30,
        height: 30,
        borderRadius: 15,
        borderWidth: 2,
        alignItems: 'center',
        justifyContent: 'center',
    },
    restTimerContainer: {
        alignItems: 'flex-end',
        marginRight: 4,
        marginLeft: 8,
        flexShrink: 1,
    },
    restTimerButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
    },
    restTimerText: {
        ...typography.p3,
        fontWeight: '600',
        flexShrink: 0,
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
    // disabledControl and controlLabel removed
    alternativesSection: {
        marginTop: 16,
        paddingHorizontal: 4,
    },
    alternativesLabel: {
        ...typography.p3,
        fontWeight: '600',
        marginBottom: 8,
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
