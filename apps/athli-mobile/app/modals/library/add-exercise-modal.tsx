import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Platform, StyleSheet, Text, View, Keyboard, TouchableWithoutFeedback, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { X, Check } from 'lucide-react-native';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';

import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';

import { typography } from '@/constants/typography';
import { haptics } from '@/utils/haptics';
import {
    EXERCISE_CATEGORY_OPTIONS,
    MUSCLE_GROUP_OPTIONS,
    EQUIPMENT_OPTIONS,
    MODALITY_OPTIONS,
    type ExerciseCategory,
    type MuscleGroup,
    type Equipment,
    type Modality,
} from '@athli/shared-types';
import { useThemePreference, useColorScheme } from '@/stores';
import { useTranslations } from '@/stores';
import { IconButton } from '@/components/ui/icon-button';
import { InputBox, TextAreaInput, SelectInput } from '@/components/ui/form-inputs';
import { hexToRgba } from '@/utils/colorUtils';
import { createExercise, editExercise, getExerciseById } from '@/services/coach/coach-exercise-service';

// YouTube/Vimeo URL validation helper
const isValidVideoUrl = (url: string): boolean => {
    if (!url.trim()) return false;
    try {
        const urlObj = new URL(url.trim());
        const hostname = urlObj.hostname.toLowerCase();

        // Check for YouTube domains
        const isYouTube = hostname === 'youtube.com' ||
            hostname === 'www.youtube.com' ||
            hostname === 'youtu.be' ||
            hostname === 'm.youtube.com';

        // Check for Vimeo domains
        const isVimeo = hostname === 'vimeo.com' ||
            hostname === 'www.vimeo.com' ||
            hostname === 'player.vimeo.com';

        return isYouTube || isVimeo;
    } catch {
        return false;
    }
};

export default function AddExerciseModal() {
    const router = useRouter();
    const { colors: themeColors } = useThemePreference();
    const colorScheme = useColorScheme();
    const { t } = useTranslations();
    const insets = useSafeAreaInsets();

    const params = useLocalSearchParams<{
        editingId?: string;
        name?: string;
        category?: string;
        videoLink?: string;
        instructions?: string;
        muscleGroup?: string;
        equipment?: string;
        modality?: string;
    }>();
    const isEditing = !!params.editingId;

    // Form state - Initialize with params for immediate display
    const [title, setTitle] = useState(params.name || '');
    const [category, setCategory] = useState<ExerciseCategory | null>(
        (params.category && params.category !== '' ? params.category as ExerciseCategory : null)
    );
    const [videoLink, setVideoLink] = useState(params.videoLink || '');
    const [instructions, setInstructions] = useState(params.instructions || '');
    const [muscleGroup, setMuscleGroup] = useState<MuscleGroup | null>(
        (params.muscleGroup && params.muscleGroup !== '' ? params.muscleGroup as MuscleGroup : null)
    );
    const [equipment, setEquipment] = useState<Equipment | null>(
        (params.equipment && params.equipment !== '' ? params.equipment as Equipment : null)
    );
    const [modality, setModality] = useState<Modality | null>(
        (params.modality && params.modality !== '' ? params.modality as Modality : null)
    );

    // TanStack Query
    const queryClient = useQueryClient();

    // Fetch exercise data when editing
    const { data: existingExercise } = useQuery({
        queryKey: ['exercise', params.editingId],
        queryFn: () => getExerciseById(params.editingId!),
        enabled: isEditing && !!params.editingId,
    });

    // Populate form when exercise data is loaded
    useEffect(() => {
        if (existingExercise) {
            setTitle(existingExercise.name || '');
            setCategory((existingExercise.category as ExerciseCategory) || null);
            setVideoLink(existingExercise.video_link || '');
            setInstructions(existingExercise.description || '');
            setMuscleGroup((existingExercise.muscle_group?.[0] as MuscleGroup) || null);
            setEquipment((existingExercise.equipment as Equipment) || null);
            setModality((existingExercise.modality as Modality) || null);
        }
    }, [existingExercise]);

    const createMutation = useMutation({
        mutationFn: createExercise,
        onSuccess: async () => {
            await queryClient.refetchQueries({ queryKey: ['exercises'] });
            haptics.success();
            handleClose();
        },
        onError: (error: Error) => {
            haptics.error();
            Alert.alert(
                t('general.error'),
                error.message || t('general.errorSaving'),
                [{ text: t('general.ok') }]
            );
        },
    });

    const editMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: any }) => editExercise(id, data),
        onSuccess: async () => {
            await queryClient.refetchQueries({ queryKey: ['exercises'] });
            haptics.success();
            handleClose();
        },
        onError: (error: Error) => {
            haptics.error();
            Alert.alert(
                t('general.error'),
                error.message || t('general.errorSaving'),
                [{ text: t('general.ok') }]
            );
        },
    });

    const handleDismissKeyboard = () => {
        Keyboard.dismiss();
    };

    // Category options from constants
    const categoryOptions = useMemo(() =>
        EXERCISE_CATEGORY_OPTIONS.map((opt) => ({
            value: opt.value,
            label: opt.label,
        }))
        , []);

    // Muscle group options from constants
    const muscleGroupOptions = useMemo(() =>
        MUSCLE_GROUP_OPTIONS.map((opt) => ({
            value: opt.value,
            label: opt.label,
        }))
        , []);

    // Equipment options from constants
    const equipmentOptions = useMemo(() =>
        EQUIPMENT_OPTIONS.map((opt) => ({
            value: opt.value,
            label: opt.label,
        }))
        , []);

    // Modality options from constants
    const modalityOptions = useMemo(() =>
        MODALITY_OPTIONS.map((opt) => ({
            value: opt.value,
            label: opt.label,
        }))
        , []);

    // Form validation and change detection
    const { isFormValid, hasChanges, canComplete, isVideoLinkValid } = useMemo(() => {
        const trimmedTitle = title.trim();
        const trimmedVideoLink = videoLink.trim();

        // Title, category, and valid video link are mandatory
        const titleValid = trimmedTitle.length > 0;
        const categoryValid = category !== null;
        const videoValid = isValidVideoUrl(trimmedVideoLink);

        const formValid = titleValid && categoryValid && videoValid;

        // Check if any field has been modified from original values
        let changes = false;
        if (isEditing) {
            // If we're editing and haven't loaded the data yet, no changes
            if (!existingExercise) {
                changes = false;
            } else {
                // Compare against the actual fetched exercise data
                const originalCategory = existingExercise.category || null;
                const originalMuscleGroup = existingExercise.muscle_group?.[0] || null;
                const originalEquipment = existingExercise.equipment || null;
                const originalModality = existingExercise.modality || null;

                changes = title !== (existingExercise.name || '') ||
                    category !== originalCategory ||
                    videoLink !== (existingExercise.video_link || '') ||
                    instructions !== (existingExercise.description || '') ||
                    muscleGroup !== originalMuscleGroup ||
                    equipment !== originalEquipment ||
                    modality !== originalModality;
            }
        } else {
            changes = trimmedTitle.length > 0 ||
                category !== null ||
                trimmedVideoLink.length > 0 ||
                instructions.trim().length > 0 ||
                muscleGroup !== null ||
                equipment !== null ||
                modality !== null;
        }

        return {
            isFormValid: formValid,
            hasChanges: changes,
            canComplete: formValid && changes && !createMutation.isPending && !editMutation.isPending,
            isVideoLinkValid: trimmedVideoLink.length === 0 || isValidVideoUrl(trimmedVideoLink),
        };
    }, [title, category, videoLink, instructions, muscleGroup, equipment, modality, createMutation.isPending, editMutation.isPending, isEditing, existingExercise]);

    const handleClose = useCallback(() => {
        if (router.canGoBack()) {
            router.back();
        }
    }, [router]);

    const handleCloseWithConfirmation = useCallback(() => {
        // Only show discard alert if there are changes
        if (hasChanges) {
            Alert.alert(
                t('library.addExercise.discardChangesTitle'),
                t('library.addExercise.discardChangesMessage'),
                [
                    {
                        text: t('general.cancel'),
                        style: 'cancel',
                    },
                    {
                        text: t('library.addExercise.discardChanges'),
                        style: 'destructive',
                        onPress: handleClose,
                    },
                ]
            );
        } else {
            handleClose();
        }
    }, [hasChanges, handleClose, t]);

    const handleSave = useCallback(() => {
        if (!canComplete) return;

        const exerciseData: any = {
            name: title.trim(),
            category,
            videoLink: videoLink.trim(),
            instructions: instructions.trim(),
            muscleGroups: muscleGroup ? [muscleGroup] : [],
            equipment,
            modality,
        };

        if (isEditing && params.editingId) {
            editMutation.mutate({ id: params.editingId, data: exerciseData });
        } else {
            createMutation.mutate(exerciseData);
        }
    }, [canComplete, title, category, videoLink, instructions, muscleGroup, equipment, modality, isEditing, params.editingId, createMutation, editMutation]);

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
                                {t('library.addExercise.title')}
                            </Text>
                            <IconButton
                                icon={{ sf: 'checkmark', IconComponent: Check }}
                                onPress={handleSave}
                                size="md"
                                variant={canComplete ? 'primary' : 'default'}
                                disabled={!canComplete}
                                loading={createMutation.isPending || editMutation.isPending}
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
                            label={t('library.addExercise.name')}
                            value={title}
                            onChangeText={setTitle}
                            placeholder={t('library.addExercise.namePlaceholder')}
                            required
                        />

                        <SelectInput
                            label={t('library.addExercise.category')}
                            value={category}
                            onChange={setCategory}
                            options={categoryOptions}
                            placeholder={t('library.addExercise.categoryPlaceholder')}
                            required
                        />

                        <View>
                            <InputBox
                                label={t('library.addExercise.videoLink')}
                                value={videoLink}
                                onChangeText={setVideoLink}
                                placeholder={t('library.addExercise.videoLinkPlaceholder')}
                                keyboardType="url"
                                autoCapitalize="none"
                                autoCorrect={false}
                                required
                            />
                            {!isVideoLinkValid && (
                                <Text style={styles.errorText}>
                                    {t('library.addExercise.videoLinkError')}
                                </Text>
                            )}
                        </View>

                        <TextAreaInput
                            label={t('library.addExercise.instructions')}
                            value={instructions}
                            onChangeText={setInstructions}
                            placeholder={t('library.addExercise.instructionsPlaceholder')}
                            numberOfLines={4}
                            minHeight={80}
                        />

                        <SelectInput
                            label={t('library.addExercise.muscleGroup')}
                            value={muscleGroup}
                            onChange={setMuscleGroup}
                            options={muscleGroupOptions}
                            placeholder={t('library.addExercise.muscleGroupPlaceholder')}
                        />

                        <SelectInput
                            label={t('library.addExercise.equipment')}
                            value={equipment}
                            onChange={setEquipment}
                            options={equipmentOptions}
                            placeholder={t('library.addExercise.equipmentPlaceholder')}
                        />

                        <SelectInput
                            label={t('library.addExercise.modality')}
                            value={modality}
                            onChange={setModality}
                            options={modalityOptions}
                            placeholder={t('library.addExercise.modalityPlaceholder')}
                        />
                    </KeyboardAwareScrollView>
                </View>
            </TouchableWithoutFeedback>
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
    errorText: {
        ...typography.p4,
        color: '#EF4444',
        marginTop: 4,
        marginLeft: 16,
    },
});
