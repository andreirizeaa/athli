import React, { useEffect, useState, useRef, useCallback } from 'react';
import { StyleSheet, Text, View, Platform, TextInput, Alert, ActivityIndicator } from 'react-native';
import { ChevronLeft, Check, Plus, Repeat, ChevronDown, Link as LinkIcon } from 'lucide-react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams, useFocusEffect, useNavigation } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';

import { typography } from '@/constants/typography';
import { useThemePreference } from '@/stores';
import { useTranslations } from '@/stores';
import { IconButton } from '@/components/ui/icon-button';
import { InputBox, TextAreaInput } from '@/components/ui/form-inputs';
import { DropdownMenuWrapper } from '@/components/ui/dropdown-menu';
import { PressableScale } from 'pressto';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useModalCallbacks } from '@/stores';
import { ExerciseBuilderCard } from '@/components/features/workout/exercise-builder-card';
import { hexToRgba } from '@/utils/colorUtils';
import { type SectionType, SECTION_TYPES } from '@athli/shared-types';
import { Exercise } from '@/app/modals/workout/add-exercise-to-builder-modal';
import {
    type BuilderExercise,
    type BuilderSection,
    type BuilderItem,
    getDefaultColumns,
    buildSectionPayload,
} from '@/components/features/workout/workout-schema';
import {
    type ExerciseValidationError,
    type ValidationResult,
    validateExercises,
} from '@/components/features/workout/validation';
import { createSection, updateSection, getSectionById } from '@/services/coach/coach-section-service';
import { MOCK_EXERCISES } from '@/app/modals/workout/add-exercise-to-builder-modal';

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
        sectionId?: string; // For library sections (save to API)
        saveToLibrary?: string; // Flag to indicate this is a library section
        exercises?: string;
    }>();

    const { colors: themeColors } = useThemePreference();
    const { t } = useTranslations();
    const insets = useSafeAreaInsets();
    const { triggerSectionSelect, setExercisesSelectCallback, setExerciseSelectCallback, setReorderCallback, setReorderItems } = useModalCallbacks();
    const queryClient = useQueryClient();

    // Determine if this is a library section (save to API) or workout builder section (return to parent)
    const isLibrarySection = params.saveToLibrary === 'true' || params.sectionId !== undefined;

    // State management
    const [state, setState] = useState<SectionBuilderState>(() => createInitialState(params));
    const initialStateRef = useRef<SectionBuilderState | null>(null);
    const [isDirty, setIsDirty] = useState(false);
    const [validationErrors, setValidationErrors] = useState<ExerciseValidationError[]>([]);
    const [metadataErrors, setMetadataErrors] = useState({ durationError: false, roundsError: false });
    const [isLoadingData, setIsLoadingData] = useState(false);

    // Load section data from API when editing
    useEffect(() => {
        const loadSectionData = async () => {
            if (params.sectionId) {
                setIsLoadingData(true);
                try {
                    const sectionData = await getSectionById(params.sectionId);

                    // Extract exercises from the nested section data structure
                    const sectionItems = sectionData.section_data?.items || [];
                    const sectionItem = sectionItems.find((item: any) => item.itemType === 'section');

                    const sectionType = sectionItem?.data?.type || 'regular';
                    const exerciseData = sectionItem?.data?.exercises || [];

                    // Flatten exercises based on section type
                    const apiExercises: any[] = [];
                    const exerciseGroups: any[] = [];

                    if (sectionType === 'amrap' || sectionType === 'timed') {
                        // AMRAP/Timed: exercises is a flat array of RoundExercisePayload
                        // Each exercise has trackableField1/trackableField2, not sets array
                        exerciseData.forEach((ex: any) => {
                            apiExercises.push({
                                ...ex,
                                isSuperset: false,
                                // Create a single set from trackable fields for builder compatibility
                                sets: [{
                                    setNumber: 1,
                                    type: 'normal',
                                    trackableField1: ex.trackableField1,
                                    trackableField2: ex.trackableField2,
                                    restSec: ex.restSec,
                                }],
                            });
                        });
                        // No exercise groups for AMRAP/Timed
                        exerciseGroups.push(...exerciseData.map((ex: any) => ({ exercises: [ex], isSuperset: false })));
                    } else if (sectionType === 'circuits') {
                        // Circuits: exercises is array of CircuitExerciseGroupPayload
                        // Each group.exercises has a single 'set' field
                        exerciseData.forEach((group: any) => {
                            exerciseGroups.push(group);
                            (group.exercises || []).forEach((ex: any) => {
                                apiExercises.push({
                                    ...ex,
                                    isSuperset: group.isSuperset || false,
                                    // Convert single 'set' to 'sets' array for builder compatibility
                                    sets: ex.set ? [ex.set] : [],
                                });
                            });
                        });
                    } else {
                        // Regular/Auxiliary: exercises is array of ExerciseGroupPayload
                        // Each group.exercises has 'sets' array
                        exerciseData.forEach((group: any) => {
                            exerciseGroups.push(group);
                            if (group.exercises && Array.isArray(group.exercises)) {
                                group.exercises.forEach((ex: any) => {
                                    apiExercises.push({
                                        ...ex,
                                        isSuperset: group.isSuperset || false,
                                    });
                                });
                            }
                        });
                    }

                    console.log('Found exercises in section:', apiExercises.length, 'section type:', sectionType);

                    // Collect all unique exercise IDs
                    const exerciseIds = new Set<string>();
                    apiExercises.forEach((ex: any) => {
                        if (ex.prescribedExerciseId) {
                            exerciseIds.add(ex.prescribedExerciseId);
                        }
                    });

                    // Fetch exercise details from mock data
                    const exerciseDetailsMap = new Map<string, { name: string; imageUrl: string; exerciseType: string }>();
                    Array.from(exerciseIds).forEach((id) => {
                        const mockExercise = MOCK_EXERCISES.find(ex => ex.exerciseId === id);
                        if (mockExercise) {
                            exerciseDetailsMap.set(id, {
                                name: mockExercise.name,
                                imageUrl: mockExercise.imageUrl,
                                exerciseType: mockExercise.exerciseType,
                            });
                        } else {
                            // Fallback for exercises not in mock data
                            console.warn(`Exercise ${id} not found in mock data`);
                            exerciseDetailsMap.set(id, {
                                name: 'Unknown Exercise',
                                imageUrl: '',
                                exerciseType: 'weight_reps',
                            });
                        }
                    });

                    // Map API data to section builder state with hydrated exercise data
                    const exercises: BuilderExercise[] = apiExercises.map((ex: any, idx: number) => {
                        const details = exerciseDetailsMap.get(ex.prescribedExerciseId) || {
                            name: 'Unknown Exercise',
                            imageUrl: '',
                            exerciseType: 'weight_reps',
                        };

                        // Hydrate alternatives array - convert IDs to objects with name and imageUrl
                        const hydratedAlternatives = (ex.alternatives || []).map((altId: string) => {
                            const altExercise = MOCK_EXERCISES.find(mockEx => mockEx.exerciseId === altId);
                            return altExercise ? {
                                name: altExercise.name,
                                imageUrl: altExercise.imageUrl,
                            } : null;
                        }).filter(Boolean); // Remove null entries

                        // Extract setRestSec from the first set (applies to all sets)
                        const setRestSec = ex.sets && ex.sets.length > 0 && ex.sets[0].restSec !== undefined
                            ? ex.sets[0].restSec
                            : undefined;

                        return {
                            id: ex.prescribedExerciseId + '-' + Date.now() + '-' + idx,
                            exerciseId: ex.prescribedExerciseId,
                            name: details.name,
                            imageUrl: details.imageUrl,
                            exerciseType: details.exerciseType,
                            column1Type: ex.column1Label || 'Reps',
                            column2Type: ex.column2Label || 'kg',
                            sets: (ex.sets || []).map((set: any, setIdx: number) => ({
                                id: 'set-' + Date.now() + '-' + idx + '-' + setIdx,
                                setNumber: set.setNumber,
                                column1: set.trackableField1?.prescribed || '',
                                column2: set.trackableField2?.prescribed || '',
                                type: set.type === 'warmUp' ? 'W' : set.type === 'failure' ? 'F' : set.type === 'dropset' ? 'D' : 'R',
                                // Don't include rest in individual sets - it's stored at exercise level
                            })),
                            alternatives: hydratedAlternatives,
                            supersetGroupId: ex.supersetId || null,
                            notes: ex.notes || '',
                            tempo: ex.tempo || '',
                            eachSide: ex.eachSide || false,
                            setRestSec: setRestSec,
                            // Handle superset linking for UI
                            isSupersetNext: false, // Will be set based on next exercise
                        };
                    });

                    // Fix isSupersetNext based on adjacent exercises' supersetGroupId
                    exercises.forEach((ex, idx) => {
                        const nextEx = idx < exercises.length - 1 ? exercises[idx + 1] : null;
                        const isSupersetNext = nextEx && ex.supersetGroupId && ex.supersetGroupId === nextEx.supersetGroupId;
                        ex.isSupersetNext = isSupersetNext || false;
                    });

                    // Extract duration/rounds from nested section data (reuse sectionItem from above)
                    let duration = '';
                    let rounds = '';

                    if (sectionItem?.data) {
                        const data = sectionItem.data;
                        // AMRAP sections have durationSec (in seconds, convert to minutes for UI)
                        if (data.durationSec !== undefined) {
                            duration = String(Math.round(data.durationSec / 60));
                        }
                        // Timed/Circuits sections have targetRounds
                        if (data.targetRounds !== undefined) {
                            rounds = String(data.targetRounds);
                        }
                    }

                    const loadedState = {
                        name: sectionData.name,
                        sectionType: sectionData.section_type as SectionType,
                        duration,
                        rounds,
                        notes: sectionData.description || '',
                        exercises,
                    };

                    console.log('Loading section data:', {
                        name: sectionData.name,
                        type: sectionData.section_type,
                        sectionItemData: sectionItem?.data,
                        loadedDuration: loadedState.duration,
                        loadedRounds: loadedState.rounds,
                    });

                    setState(loadedState);
                    // Set initial state ref immediately after loading
                    initialStateRef.current = JSON.parse(JSON.stringify(loadedState));
                } catch (error) {
                    console.error('Failed to load section data:', error);
                    Alert.alert(
                        t('general.error'),
                        t('general.errorLoading'),
                        [{ text: t('general.ok') }]
                    );
                } finally {
                    setIsLoadingData(false);
                }
            } else if (!initialStateRef.current) {
                // For new sections (not loaded from API), set initial state ref from params
                initialStateRef.current = JSON.parse(JSON.stringify(state));
            }
        };

        loadSectionData();
    }, [params.sectionId, t]);

    // Track dirty state
    useEffect(() => {
        if (initialStateRef.current) {
            const dirty = !areStatesEqual(state, initialStateRef.current);
            setIsDirty(dirty);
        }
    }, [state]);

    // Don't sync metadata from cache - user edits directly in section-builder
    // The useFocusEffect was causing inputs to revert to cached values

    // Mutations for library sections (API saves)
    const createSectionMutation = useMutation({
        mutationFn: (sectionData: any) => createSection(sectionData),
        onSuccess: async () => {
            await queryClient.refetchQueries({ queryKey: ['sections'] });
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            if (router.canGoBack()) {
                router.back();
            }
        },
        onError: (error: Error) => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            Alert.alert(
                t('general.error'),
                error.message || t('general.errorSaving'),
                [{ text: t('general.ok') }]
            );
        },
    });

    const updateSectionMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: any }) => updateSection(id, data),
        onSuccess: async () => {
            await queryClient.refetchQueries({ queryKey: ['sections'] });
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            if (router.canGoBack()) {
                router.back();
            }
        },
        onError: (error: Error) => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            Alert.alert(
                t('general.error'),
                error.message || t('general.errorSaving'),
                [{ text: t('general.ok') }]
            );
        },
    });

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

    // Disable swipe-to-go-back gesture when there are unsaved changes
    const navigation = useNavigation();
    useEffect(() => {
        navigation.setOptions({
            gestureEnabled: !isDirty,
        });
    }, [navigation, isDirty]);

    const handleSave = useCallback(() => {
        if (!state.name.trim()) {
            Alert.alert(t('library.section.error'), t('library.section.nameRequired'));
            return;
        }

        // Validate section-type specific fields
        let sectionMetadataError = { durationError: false, roundsError: false };
        let hasMetadataError = false;

        if (state.sectionType === 'amrap') {
            const duration = parseInt(state.duration);
            if (!state.duration.trim() || isNaN(duration) || duration <= 0) {
                sectionMetadataError.durationError = true;
                hasMetadataError = true;
            }
        }

        if (state.sectionType === 'timed' || state.sectionType === 'circuits') {
            const rounds = parseInt(state.rounds);
            if (!state.rounds.trim() || isNaN(rounds) || rounds <= 0) {
                sectionMetadataError.roundsError = true;
                hasMetadataError = true;
            }
        }

        // Validate exercises if there are any
        let exerciseValidation: ValidationResult = { isValid: true, errors: [], emptySectionIds: [], errorMessage: null };
        if (state.exercises.length > 0) {
            exerciseValidation = validateExercises(state.exercises);
        }

        // If there are any errors, show the combined error message
        if (hasMetadataError || !exerciseValidation.isValid) {
            // Build combined error message
            let errorMessage = 'Please fix the following issues:\n\n';

            if (sectionMetadataError.durationError) {
                errorMessage += '• Duration is required for AMRAP sections\n';
            }
            if (sectionMetadataError.roundsError) {
                errorMessage += '• Rounds are required for this section type\n';
            }

            // Add exercise validation errors to the message
            if (!exerciseValidation.isValid && exerciseValidation.errorMessage) {
                const exerciseErrors = exerciseValidation.errorMessage
                    .replace('Please fix the following issues:\n\n', '');
                errorMessage += exerciseErrors;
            }

            setValidationErrors(exerciseValidation.errors);
            setMetadataErrors(sectionMetadataError);
            Alert.alert(t('library.section.error'), errorMessage);
            return;
        }

        // Clear any previous errors
        setValidationErrors([]);
        setMetadataErrors({ durationError: false, roundsError: false });

        if (isLibrarySection) {
            // Save to API as a library section
            console.log('[SECTION BUILDER] State exercises before building payload:', state.exercises.length, 'exercises');
            console.log('[SECTION BUILDER] State exercises detail:', JSON.stringify(state.exercises, null, 2));

            // Build a BuilderSection from state
            const builderSection: BuilderSection = {
                id: params.sectionId || `section-${Date.now()}`,
                type: 'section',
                name: state.name,
                sectionType: state.sectionType,
                duration: state.duration,
                rounds: state.rounds,
                notes: state.notes,
                exercises: state.exercises,
            };

            console.log('[SECTION BUILDER] BuilderSection exercises:', builderSection.exercises.length);

            // Use the buildSectionPayload function to convert to proper API format
            const sectionData = buildSectionPayload(builderSection);

            console.log('[SECTION BUILDER] Section data after buildSectionPayload:', JSON.stringify(sectionData, null, 2));

            const sectionPayload: any = {
                name: state.name,
                description: state.notes,
                sectionType: state.sectionType,
                section_data: {
                    items: [{
                        itemType: 'section' as const,
                        data: sectionData,
                    }],
                },
            };

            console.log('[SECTION BUILDER] Saving section payload:', JSON.stringify(sectionPayload, null, 2));

            if (params.sectionId) {
                // Update existing section
                updateSectionMutation.mutate({ id: params.sectionId, data: sectionPayload });
            } else {
                // Create new section
                createSectionMutation.mutate(sectionPayload);
            }
        } else {
            // Return to parent (workout builder) via callback
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
        }
    }, [state, params.editingId, params.sectionId, isLibrarySection, createSectionMutation, updateSectionMutation, triggerSectionSelect, router, t]);

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
            const ex = newExercises[index];
            const isLinking = !ex.isSupersetNext;

            if (isLinking) {
                // Linking: assign supersetGroupId to both current and next exercise
                const nextIndex = index + 1;
                if (nextIndex < newExercises.length) {
                    const nextEx = newExercises[nextIndex];

                    // Generate a shared superset group ID or use existing one
                    const supersetGroupId = ex.supersetGroupId || `superset-section-${Date.now()}`;

                    // Update current exercise
                    newExercises[index] = {
                        ...ex,
                        isSupersetNext: true,
                        supersetGroupId,
                    };

                    // Update next exercise with the same supersetGroupId
                    newExercises[nextIndex] = {
                        ...nextEx,
                        supersetGroupId,
                    };
                }
            } else {
                // Unlinking: remove supersetGroupId from both current and next
                const nextIndex = index + 1;

                // Update current exercise
                newExercises[index] = {
                    ...ex,
                    isSupersetNext: false,
                    supersetGroupId: null,
                };

                // Update next exercise to remove supersetGroupId (if it matches)
                if (nextIndex < newExercises.length) {
                    const nextEx = newExercises[nextIndex];
                    if (nextEx.supersetGroupId === ex.supersetGroupId) {
                        newExercises[nextIndex] = {
                            ...nextEx,
                            supersetGroupId: null,
                        };
                    }
                }
            }

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
                    <View style={styles.headerLeft}>
                        <IconButton
                            icon={{ sf: 'arrow.left', IconComponent: ChevronLeft }}
                            onPress={handleBack}
                            size="md"
                            color={themeColors.text}
                        />
                        <Text style={[styles.title, { color: themeColors.text }]} numberOfLines={1}>
                            {state.name || t('library.section.newSection')}
                        </Text>
                    </View>
                    <View style={styles.headerRight}>
                        <IconButton
                            icon={{ sf: 'checkmark', IconComponent: Check }}
                            onPress={handleSave}
                            size="md"
                            variant={canSave ? 'primary' : 'default'}
                            disabled={!canSave}
                            loading={createSectionMutation.isPending || updateSectionMutation.isPending}
                        />
                    </View>
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
                            onPress: () => {
                                const newType = type.value as SectionType;
                                setState(prev => {
                                    // If changing to amrap or timed, trim all exercises to one set each
                                    // These section types only support one set per exercise (values per round)
                                    if (newType === 'amrap' || newType === 'timed') {
                                        const trimmedExercises = prev.exercises.map(ex => ({
                                            ...ex,
                                            sets: ex.sets.length > 0 ? [ex.sets[0]] : ex.sets,
                                        }));
                                        return {
                                            ...prev,
                                            sectionType: newType,
                                            exercises: trimmedExercises,
                                        };
                                    }
                                    return { ...prev, sectionType: newType };
                                });
                            }
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
                                <View style={[
                                    styles.fieldRow,
                                    metadataErrors.durationError && {
                                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                                        borderWidth: 1,
                                        borderColor: '#EF4444',
                                        borderRadius: 8,
                                        marginHorizontal: 8,
                                        paddingHorizontal: 8,
                                    }
                                ]}>
                                    <View style={styles.labelContainer}>
                                        <Text style={[styles.fieldLabel, { color: metadataErrors.durationError ? '#EF4444' : themeColors.mutedText }]}>{t('library.section.duration')}</Text>
                                        <Text style={styles.requiredAsterisk}>*</Text>
                                    </View>
                                    <View style={[styles.dropdownValueRow, { flex: 1, justifyContent: 'flex-end' }]}>
                                        <TextInput
                                            value={state.duration}
                                            onChangeText={(text) => setState(prev => ({ ...prev, duration: text }))}
                                            placeholder="0"
                                            placeholderTextColor={themeColors.mutedText}
                                            keyboardType="number-pad"
                                            style={[styles.dropdownValue, { color: metadataErrors.durationError ? '#EF4444' : themeColors.text, textAlign: 'right', minWidth: 120, height: '100%' }]}
                                        />
                                        <Text style={[styles.dropdownValue, { color: themeColors.mutedText }]}>m</Text>
                                    </View>
                                </View>
                            </>
                        )}

                        {state.sectionType === 'timed' && (
                            <>
                                <View style={[styles.configDivider, { backgroundColor: themeColors.border }]} />
                                <View style={[
                                    styles.fieldRow,
                                    metadataErrors.roundsError && {
                                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                                        borderWidth: 1,
                                        borderColor: '#EF4444',
                                        borderRadius: 8,
                                        marginHorizontal: 8,
                                        paddingHorizontal: 8,
                                    }
                                ]}>
                                    <View style={styles.labelContainer}>
                                        <Text style={[styles.fieldLabel, { color: metadataErrors.roundsError ? '#EF4444' : themeColors.mutedText }]}>{t('library.section.rounds')}</Text>
                                        <Text style={styles.requiredAsterisk}>*</Text>
                                    </View>
                                    <View style={[styles.dropdownValueRow, { flex: 1, justifyContent: 'flex-end' }]}>
                                        <TextInput
                                            value={state.rounds}
                                            onChangeText={(text) => setState(prev => ({ ...prev, rounds: text }))}
                                            placeholder="0"
                                            placeholderTextColor={themeColors.mutedText}
                                            keyboardType="number-pad"
                                            style={[styles.dropdownValue, { color: metadataErrors.roundsError ? '#EF4444' : themeColors.text, textAlign: 'right', minWidth: 120, height: '100%' }]}
                                        />
                                    </View>
                                </View>
                            </>
                        )}

                        {state.sectionType === 'circuits' && (
                            <>
                                <View style={[styles.configDivider, { backgroundColor: themeColors.border }]} />
                                <View style={[
                                    styles.fieldRow,
                                    metadataErrors.roundsError && {
                                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                                        borderWidth: 1,
                                        borderColor: '#EF4444',
                                        borderRadius: 8,
                                        marginHorizontal: 8,
                                        paddingHorizontal: 8,
                                    }
                                ]}>
                                    <View style={styles.labelContainer}>
                                        <Text style={[styles.fieldLabel, { color: metadataErrors.roundsError ? '#EF4444' : themeColors.mutedText }]}>{t('library.section.rounds')}</Text>
                                        <Text style={styles.requiredAsterisk}>*</Text>
                                    </View>
                                    <View style={[styles.dropdownValueRow, { flex: 1, justifyContent: 'flex-end' }]}>
                                        <TextInput
                                            value={state.rounds}
                                            onChangeText={(text) => setState(prev => ({ ...prev, rounds: text }))}
                                            placeholder="0"
                                            placeholderTextColor={themeColors.mutedText}
                                            keyboardType="number-pad"
                                            style={[styles.dropdownValue, { color: metadataErrors.roundsError ? '#EF4444' : themeColors.text, textAlign: 'right', minWidth: 120, height: '100%' }]}
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

                {isLoadingData ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={themeColors.primary} />
                        <Text style={[styles.loadingText, { color: themeColors.mutedText }]}>
                            {t('library.section.loading')}
                        </Text>
                    </View>
                ) : state.exercises.length === 0 ? (
                    <Text style={[styles.emptyText, { color: themeColors.mutedText }]}>
                        {t('library.section.addExercisesHint')}
                    </Text>
                ) : null}

                {!isLoadingData && state.exercises.map((ex, index) => {
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
                                    setRestSec: ex.setRestSec,
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
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        gap: 8,
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    title: {
        ...typography.h6,
        flex: 1,
    },
    emptyText: {
        ...typography.p2,
        textAlign: 'center',
        marginTop: 32,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 60,
        gap: 12,
    },
    loadingText: {
        ...typography.p2,
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
