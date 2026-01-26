import React, { useState, useMemo, useCallback } from 'react';
import { Platform, StyleSheet, Text, View, Keyboard, TouchableWithoutFeedback } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { X, Check } from 'lucide-react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';

import { typography } from '@/constants/typography';
import { haptics } from '@/utils/haptics';
import {
    WORKOUT_TYPES,
    DIFFICULTY_LEVELS,
    type WorkoutType,
    type DifficultyLevel,
} from '@athli/shared-types';
import { useThemePreference, useColorScheme } from '@/stores';
import { useTranslations } from '@/stores';
import { useClientDetailStore, useModalCallbacks } from '@/stores';
import { IconButton } from '@/components/ui/icon-button';
import { Dialog } from '@/components/ui/dialog';
import { InputBox, TextAreaInput, SelectInput } from '@/components/ui/form-inputs';
import { hexToRgba } from '@/utils/colorUtils';
import { createWorkout, updateWorkoutDetails } from '@/services/coach/coach-workout-service';
import { assignWorkout } from '@/services/client/client-training-service';

export default function AddWorkoutModal() {
    const router = useRouter();
    const { colors: themeColors } = useThemePreference();
    const colorScheme = useColorScheme();
    const { t } = useTranslations();
    const insets = useSafeAreaInsets();

    const params = useLocalSearchParams<{
        editingId?: string;
        name?: string;
        description?: string;
        type?: string;
        difficulty?: string;
        // Client workout context - when editing a client training workout
        clientId?: string;
        clientWorkoutDate?: string;
        coachId?: string;
        // Full workout payload (serialized JSON) for preserving items when editing client workouts
        workoutPayloadJson?: string;
    }>();
    const isEditing = !!params.editingId;
    const isClientWorkout = !!params.clientId && !!params.clientWorkoutDate;
    
    // Parse the workout payload if provided (for client workouts)
    const existingWorkoutPayload = useMemo(() => {
        if (params.workoutPayloadJson) {
            try {
                return JSON.parse(params.workoutPayloadJson);
            } catch (e) {
                console.error('[AddWorkoutModal] Failed to parse workoutPayloadJson:', e);
                return null;
            }
        }
        return null;
    }, [params.workoutPayloadJson]);
    
    // Get refreshSection to update training data after client workout edit
    const refreshSection = useClientDetailStore((state) => state.refreshSection);
    
    // Get triggerMetadataUpdate to notify the workout builder of metadata changes
    const { triggerMetadataUpdate } = useModalCallbacks();

    // Form state - initialize with params if editing
    const [name, setName] = useState(params.name || '');
    const [description, setDescription] = useState(params.description || '');
    const [workoutType, setWorkoutType] = useState<WorkoutType | null>((params.type as WorkoutType) || null);
    const [difficulty, setDifficulty] = useState<DifficultyLevel | null>((params.difficulty as DifficultyLevel) || null);

    // Dialog state
    const [showErrorDialog, setShowErrorDialog] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [showDiscardDialog, setShowDiscardDialog] = useState(false);

    // TanStack Query
    const queryClient = useQueryClient();

    const saveMutation = useMutation({
        mutationFn: async (workoutData: any) => {
            if (isEditing && params.editingId) {
                if (isClientWorkout && params.clientId && params.clientWorkoutDate && params.coachId) {
                    // For client workouts, use assignWorkout to update
                    // This updates the workout in the client's training table
                    // Merge new metadata with existing workout data to preserve items
                    const fullPayload = existingWorkoutPayload ? {
                        ...existingWorkoutPayload,
                        id: params.editingId,
                        name: workoutData.name,
                        description: workoutData.description || '',
                        type: workoutData.type || '',
                        difficulty: workoutData.difficulty || '',
                    } : {
                        id: params.editingId,
                        name: workoutData.name,
                        description: workoutData.description || '',
                        type: workoutData.type || '',
                        difficulty: workoutData.difficulty || '',
                    };
                    
                    console.log('[AddWorkoutModal] Updating client workout with full payload:', {
                        clientId: params.clientId,
                        coachId: params.coachId,
                        date: params.clientWorkoutDate,
                        workoutId: params.editingId,
                        hasExistingPayload: !!existingWorkoutPayload,
                        itemsCount: fullPayload.items?.length || 0,
                    });
                    
                    return assignWorkout({
                        clientId: params.clientId,
                        coachId: params.coachId,
                        date: params.clientWorkoutDate,
                        workoutId: params.editingId,
                        workoutPayload: fullPayload,
                        isNew: false,
                    });
                }
                // For library workouts, update metadata only
                return updateWorkoutDetails(params.editingId, {
                    name: workoutData.name,
                    description: workoutData.description || '',
                    type: workoutData.type || '',
                    difficulty: workoutData.difficulty || '',
                });
            }
            return createWorkout(workoutData);
        },
        onSuccess: async (_, variables) => {
            // Trigger callback to update workout builder's local state with new metadata
            if (isEditing) {
                triggerMetadataUpdate({
                    name: variables.name,
                    description: variables.description || '',
                    type: variables.type || '',
                    difficulty: variables.difficulty || '',
                });
            }
            
            if (isClientWorkout) {
                // Refresh client training data
                await refreshSection('training');
            } else {
                // Refetch library workouts to update the cache
                await queryClient.refetchQueries({ queryKey: ['workouts'] });
            }
            haptics.success();
            handleClose();
        },
        onError: (error: Error) => {
            haptics.error();
            setErrorMessage(error.message || t('general.errorSaving'));
            setShowErrorDialog(true);
        },
    });

    const handleDismissKeyboard = () => {
        Keyboard.dismiss();
    };

    // Workout type options from constants
    const workoutTypeOptions = useMemo(() =>
        WORKOUT_TYPES.map((type) => ({
            value: type.value,
            label: type.label,
        }))
        , []);

    // Difficulty options from constants
    const difficultyOptions = useMemo(() =>
        DIFFICULTY_LEVELS.map((level) => ({
            value: level.value,
            label: level.label,
        }))
        , []);

    // Form validation and change detection
    const { isFormValid, hasChanges, canComplete } = useMemo(() => {
        const trimmedName = name.trim();

        // Only name is mandatory
        const formValid = trimmedName.length > 0;

        // Check if any field has been modified
        let changes = false;
        if (isEditing) {
            // When editing, compare against original params values
            changes = name !== (params.name || '') ||
                description !== (params.description || '') ||
                workoutType !== ((params.type as WorkoutType) || null) ||
                difficulty !== ((params.difficulty as DifficultyLevel) || null);
        } else {
            // When creating new, any non-empty field counts as a change
            changes = trimmedName.length > 0 ||
                description.trim().length > 0 ||
                workoutType !== null ||
                difficulty !== null;
        }

        return {
            isFormValid: formValid,
            hasChanges: changes,
            canComplete: formValid && changes && !saveMutation.isPending,
        };
    }, [name, description, workoutType, difficulty, saveMutation.isPending, isEditing, params]);

    const handleClose = useCallback(() => {
        if (router.canGoBack()) {
            router.back();
        }
    }, [router]);

    const handleCloseWithConfirmation = useCallback(() => {
        // Only show discard alert if there are changes and form is valid for save
        if (hasChanges) {
            setShowDiscardDialog(true);
        } else {
            handleClose();
        }
    }, [hasChanges, handleClose]);

    const handleSave = useCallback(() => {
        if (!canComplete) return;

        const workoutData: any = {
            name: name.trim(),
            description: description.trim() || undefined,
            type: workoutType || undefined,
            difficulty: difficulty || undefined,
        };

        saveMutation.mutate(workoutData);
    }, [canComplete, name, description, workoutType, difficulty, isEditing, params.editingId, saveMutation]);

    const headerHeight = Platform.OS === 'android' ? 56 + insets.top : 56;
    const gradientHeight = headerHeight + 12;

    return (
        <View style={[styles.container, { backgroundColor: themeColors.backgroundSecondary }]}>
            <TouchableWithoutFeedback onPress={handleDismissKeyboard} accessible={false}>
                <View style={styles.container}>
                    {/* Header with gradient */}
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
                                onPress={handleCloseWithConfirmation}
                                size="md"
                                color={themeColors.text}
                            />
                            <Text style={[styles.title, { color: themeColors.text }]}>
                                {t('library.addWorkout.title')}
                            </Text>
                            <IconButton
                                icon={{ sf: 'checkmark', IconComponent: Check }}
                                onPress={handleSave}
                                size="md"
                                variant={canComplete ? 'primary' : 'default'}
                                disabled={!canComplete}
                                loading={saveMutation.isPending}
                            />
                        </View>
                    </View>

                    {/* Content */}
                    <KeyboardAwareScrollView
                        style={styles.scrollView}
                        contentContainerStyle={[styles.scrollContent, { paddingTop: headerHeight + 16 }]}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                        bottomOffset={40}
                    >
                        <InputBox
                            label={t('library.addWorkout.name')}
                            value={name}
                            onChangeText={setName}
                            placeholder={t('library.addWorkout.namePlaceholder')}
                            required
                        />

                        <TextAreaInput
                            label={t('library.addWorkout.description')}
                            value={description}
                            onChangeText={setDescription}
                            placeholder={t('library.addWorkout.descriptionPlaceholder')}
                            numberOfLines={4}
                            minHeight={80}
                        />

                        <SelectInput
                            label={t('library.addWorkout.type')}
                            value={workoutType}
                            onChange={setWorkoutType}
                            options={workoutTypeOptions}
                            placeholder={t('library.addWorkout.typePlaceholder')}
                        />

                        <SelectInput
                            label={t('library.addWorkout.difficulty')}
                            value={difficulty}
                            onChange={setDifficulty}
                            options={difficultyOptions}
                            placeholder={t('library.addWorkout.difficultyPlaceholder')}
                        />
                    </KeyboardAwareScrollView>
                </View>
            </TouchableWithoutFeedback>

            <Dialog
                visible={showErrorDialog}
                onClose={() => setShowErrorDialog(false)}
                title={t('general.error')}
                message={errorMessage}
                showCloseIcon={false}
                buttons={[{ label: t('general.ok'), onPress: () => setShowErrorDialog(false), variant: 'primary' }]}
            />

            <Dialog
                visible={showDiscardDialog}
                onClose={() => setShowDiscardDialog(false)}
                title={t('library.addWorkout.discardChangesTitle')}
                message={t('library.addWorkout.discardChangesMessage')}
                buttons={[
                    { label: t('general.cancel'), onPress: () => setShowDiscardDialog(false), variant: 'secondary' },
                    { label: t('library.addWorkout.discardChanges'), onPress: handleClose, variant: 'destructive' },
                ]}
            />
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
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 16,
        paddingBottom: 16,
        gap: 12,
    },
});
