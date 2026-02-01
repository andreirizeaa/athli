import React, { useEffect, useState, useRef, useCallback } from 'react';
import { StyleSheet, Text, View, Platform, ActivityIndicator } from 'react-native';
import { Dialog } from '@/components/ui/dialog';
import { ChevronLeft, Check, Plus, Repeat, Link as LinkIcon } from 'lucide-react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams, useFocusEffect, useNavigation } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { typography } from '@/constants/typography';
import { haptics } from '@/utils/haptics';
import { useThemePreference, useColorScheme } from '@/stores';
import { useTranslations } from '@/stores';
import { IconButton } from '@/components/ui/icon-button';
import { InputBox, TextAreaInput, SectionTypeSelect } from '@/components/ui/form-inputs';
import { PressableScale } from 'pressto';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useModalCallbacks } from '@/stores';
import { ExerciseBuilderCard } from '@/components/features/workout/exercise-builder-card';
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
import { getExerciseById } from '@/services/musclewiki-service';

type SectionBuilderState = {
    name: string;
    sectionType: SectionType;
    duration: string;
    rounds: string;
    notes: string;
    exercises: BuilderExercise[];
    // Tabata/HIIT fields
    workSec: string;
    restSec: string;
    // EMOM fields
    intervalSec: string;
    durationMin: string;
};

const createInitialState = (params: {
    name?: string;
    sectionType?: string;
    duration?: string;
    rounds?: string;
    notes?: string;
    exercises?: string;
    workSec?: string;
    restSec?: string;
    intervalSec?: string;
    durationMin?: string;
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
        workSec: params.workSec || '',
        restSec: params.restSec || '',
        intervalSec: params.intervalSec || '',
        durationMin: params.durationMin || '',
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
        // Tabata/HIIT fields
        workSec?: string;
        restSec?: string;
        // EMOM fields
        intervalSec?: string;
        durationMin?: string;
    }>();

    const { colors: themeColors } = useThemePreference();
    const colorScheme = useColorScheme();
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
    const [metadataErrors, setMetadataErrors] = useState({
        durationError: false,
        roundsError: false,
        workSecError: false,
        restSecError: false,
        intervalSecError: false,
        durationMinError: false,
    });
    const [isLoadingData, setIsLoadingData] = useState(false);

    // Dialog states
    const [showErrorDialog, setShowErrorDialog] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [showDiscardDialog, setShowDiscardDialog] = useState(false);

    // Set initial state for new sections (not from API) on mount
    useEffect(() => {
        if (!params.sectionId && !initialStateRef.current) {
            initialStateRef.current = JSON.parse(JSON.stringify(state));
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Run once on mount

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
                    } else if (sectionType === 'tabata' || sectionType === 'hiit' || sectionType === 'emom') {
                        // Tabata/HIIT/EMOM: exercises is array of CircuitExerciseGroupPayload
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

                    // Fetch exercise details from MuscleWiki API
                    const exerciseDetailsMap = new Map<string, { name: string; imageUrl: string; exerciseType: string }>();
                    const fetchPromises = Array.from(exerciseIds).map(async (id) => {
                        try {
                            const exercise = await getExerciseById(id);
                            if (exercise) {
                                exerciseDetailsMap.set(id, {
                                    name: exercise.name,
                                    imageUrl: exercise.imageUrl,
                                    exerciseType: exercise.exerciseType,
                                });
                            } else {
                                console.warn(`Exercise ${id} not found in API`);
                                exerciseDetailsMap.set(id, {
                                    name: 'Unknown Exercise',
                                    imageUrl: '',
                                    exerciseType: 'weight_reps',
                                });
                            }
                        } catch (err) {
                            console.warn(`Failed to fetch exercise ${id}:`, err);
                            exerciseDetailsMap.set(id, {
                                name: 'Unknown Exercise',
                                imageUrl: '',
                                exerciseType: 'weight_reps',
                            });
                        }
                    });
                    await Promise.all(fetchPromises);

                    // Map API data to section builder state with hydrated exercise data
                    const exercises: BuilderExercise[] = apiExercises.map((ex: any, idx: number) => {
                        const details = exerciseDetailsMap.get(ex.prescribedExerciseId) || {
                            name: 'Unknown Exercise',
                            imageUrl: '',
                            exerciseType: 'weight_reps',
                        };

                        // Hydrate alternatives array - use the details from our map if available
                        // Note: alternatives are exercise IDs, we'll fetch their details from the map if they were loaded
                        const hydratedAlternatives = (ex.alternatives || []).map((altId: string) => {
                            const altDetails = exerciseDetailsMap.get(altId);
                            return altDetails ? {
                                name: altDetails.name,
                                imageUrl: altDetails.imageUrl,
                            } : null;
                        }).filter(Boolean); // Remove null entries

                        // Extract setRestSec from the first set (applies to all sets)
                        const setRestSec = ex.sets && ex.sets.length > 0 && ex.sets[0].restSec !== undefined
                            ? ex.sets[0].restSec
                            : undefined;

                        // Determine default column2Type based on section type
                        const isIntervalType = sectionType === 'tabata' || sectionType === 'hiit' || sectionType === 'emom' || sectionType === 'circuits';
                        const defaultColumn2Type = isIntervalType ? 'Optional' : 'kg';

                        return {
                            id: ex.prescribedExerciseId + '-' + Date.now() + '-' + idx,
                            exerciseId: ex.prescribedExerciseId,
                            name: details.name,
                            imageUrl: details.imageUrl,
                            exerciseType: details.exerciseType,
                            column1Type: ex.column1Label || 'Reps',
                            column2Type: ex.column2Label || defaultColumn2Type,
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

                    // Extract duration/rounds/config from nested section data (reuse sectionItem from above)
                    let duration = '';
                    let rounds = '';
                    let workSec = '';
                    let restSec = '';
                    let intervalSec = '';
                    let durationMin = '';

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
                        // Tabata/HIIT fields
                        if (data.workSec !== undefined) {
                            workSec = String(data.workSec);
                        }
                        if (data.restSec !== undefined) {
                            restSec = String(data.restSec);
                        }
                        if (data.rounds !== undefined && (sectionType === 'tabata' || sectionType === 'hiit' || sectionType === 'circuits')) {
                            rounds = String(data.rounds);
                        }
                        // EMOM fields
                        if (data.intervalSec !== undefined) {
                            intervalSec = String(data.intervalSec);
                        }
                        if (data.durationMin !== undefined) {
                            durationMin = String(data.durationMin);
                        }
                    }

                    const loadedState: SectionBuilderState = {
                        name: sectionData.name,
                        sectionType: sectionData.section_type as SectionType,
                        duration,
                        rounds,
                        notes: sectionData.description || '',
                        exercises,
                        workSec,
                        restSec,
                        intervalSec,
                        durationMin,
                    };

                    console.log('Loading section data:', {
                        name: sectionData.name,
                        type: sectionData.section_type,
                        sectionItemData: sectionItem?.data,
                        loadedDuration: loadedState.duration,
                        loadedRounds: loadedState.rounds,
                        loadedWorkSec: loadedState.workSec,
                        loadedRestSec: loadedState.restSec,
                        loadedIntervalSec: loadedState.intervalSec,
                        loadedDurationMin: loadedState.durationMin,
                    });

                    setState(loadedState);
                    // Set initial state ref immediately after loading
                    initialStateRef.current = JSON.parse(JSON.stringify(loadedState));
                } catch (error) {
                    console.error('Failed to load section data:', error);
                    setErrorMessage(t('general.errorLoading'));
                    setShowErrorDialog(true);
                } finally {
                    setIsLoadingData(false);
                }
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
            haptics.success();
            if (router.canGoBack()) {
                router.back();
            }
        },
        onError: (error: Error) => {
            haptics.error();
            setErrorMessage(error.message || t('general.errorSaving'));
            setShowErrorDialog(true);
        },
    });

    const updateSectionMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: any }) => updateSection(id, data),
        onSuccess: async () => {
            await queryClient.refetchQueries({ queryKey: ['sections'] });
            haptics.success();
            if (router.canGoBack()) {
                router.back();
            }
        },
        onError: (error: Error) => {
            haptics.error();
            setErrorMessage(error.message || t('general.errorSaving'));
            setShowErrorDialog(true);
        },
    });

    const handleDiscard = useCallback(() => {
        setShowDiscardDialog(false);
        // Set isDirty to false so the beforeRemove listener allows navigation
        setIsDirty(false);
        router.back();
    }, [router]);

    const showDiscardAlert = useCallback(() => {
        setShowDiscardDialog(true);
    }, []);

    // Disable swipe-to-go-back gesture when there are unsaved changes
    const navigation = useNavigation();
    useEffect(() => {
        navigation.setOptions({
            gestureEnabled: !isDirty,
        });
    }, [navigation, isDirty]);

    // Intercept hardware back button and other navigation events when dirty
    useEffect(() => {
        const unsubscribe = navigation.addListener('beforeRemove', (e) => {
            if (!isDirty) {
                // If not dirty, allow navigation
                return;
            }

            // Prevent default behavior of leaving the screen
            e.preventDefault();

            // Show discard dialog
            showDiscardAlert();
        });

        return unsubscribe;
    }, [navigation, isDirty, showDiscardAlert]);

    const handleSave = useCallback(() => {
        if (!state.name.trim()) {
            setErrorMessage(t('library.section.nameRequired'));
            setShowErrorDialog(true);
            return;
        }

        // Validate section-type specific fields
        let sectionMetadataError = {
            durationError: false,
            roundsError: false,
            workSecError: false,
            restSecError: false,
            intervalSecError: false,
            durationMinError: false,
        };
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

        // Validate Tabata/HIIT fields
        if (state.sectionType === 'tabata' || state.sectionType === 'hiit') {
            const workSecNum = parseInt(state.workSec);
            const restSecNum = parseInt(state.restSec);
            const roundsNum = parseInt(state.rounds);

            if (!state.workSec.trim() || isNaN(workSecNum) || workSecNum <= 0) {
                sectionMetadataError.workSecError = true;
                hasMetadataError = true;
            }
            if (!state.restSec.trim() || isNaN(restSecNum) || restSecNum < 0) {
                sectionMetadataError.restSecError = true;
                hasMetadataError = true;
            }
            if (!state.rounds.trim() || isNaN(roundsNum) || roundsNum <= 0) {
                sectionMetadataError.roundsError = true;
                hasMetadataError = true;
            }
        }

        // Validate EMOM fields
        if (state.sectionType === 'emom') {
            const intervalSecNum = parseInt(state.intervalSec);
            const durationMinNum = parseInt(state.durationMin);

            if (!state.intervalSec.trim() || isNaN(intervalSecNum) || intervalSecNum <= 0) {
                sectionMetadataError.intervalSecError = true;
                hasMetadataError = true;
            }
            if (!state.durationMin.trim() || isNaN(durationMinNum) || durationMinNum <= 0) {
                sectionMetadataError.durationMinError = true;
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
            let validationErrorMessage = 'Please fix the following issues:\n\n';

            if (sectionMetadataError.durationError) {
                validationErrorMessage += '• Duration is required for AMRAP sections\n';
            }
            if (sectionMetadataError.roundsError) {
                validationErrorMessage += '• Rounds are required for this section type\n';
            }
            if (sectionMetadataError.workSecError) {
                validationErrorMessage += '• Work duration is required\n';
            }
            if (sectionMetadataError.restSecError) {
                validationErrorMessage += '• Rest duration is required\n';
            }
            if (sectionMetadataError.intervalSecError) {
                validationErrorMessage += '• Interval is required for EMOM sections\n';
            }
            if (sectionMetadataError.durationMinError) {
                validationErrorMessage += '• Duration is required for EMOM sections\n';
            }

            // Add exercise validation errors to the message
            if (!exerciseValidation.isValid && exerciseValidation.errorMessage) {
                const exerciseErrors = exerciseValidation.errorMessage
                    .replace('Please fix the following issues:\n\n', '');
                validationErrorMessage += exerciseErrors;
            }

            setValidationErrors(exerciseValidation.errors);
            setMetadataErrors(sectionMetadataError);
            setErrorMessage(validationErrorMessage);
            setShowErrorDialog(true);
            return;
        }

        // Clear any previous errors
        setValidationErrors([]);
        setMetadataErrors({
            durationError: false,
            roundsError: false,
            workSecError: false,
            restSecError: false,
            intervalSecError: false,
            durationMinError: false,
        });

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
                workSec: state.workSec,
                restSec: state.restSec,
                intervalSec: state.intervalSec,
                durationMin: state.durationMin,
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
                workSec: state.workSec,
                restSec: state.restSec,
                intervalSec: state.intervalSec,
                durationMin: state.durationMin,
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
            // For interval-based sections (tabata, hiit, emom, circuits), override column2 to Optional
            const isIntervalSection = state.sectionType === 'tabata' || state.sectionType === 'hiit' || state.sectionType === 'emom' || state.sectionType === 'circuits';

            const items: BuilderExercise[] = newExercises.map((exercise, idx) => {
                const defaultColumns = getDefaultColumns(exercise.exerciseType, exercise.category);

                // Override column2 to Optional for interval-based sections
                const column2Type = isIntervalSection ? 'Optional' : defaultColumns.column2Type;
                // Use default values from category (e.g., Cardio: 30 minutes, Barbell: 10 reps)
                const col1Value = defaultColumns.column1Value || '';
                const col2Value = isIntervalSection ? '' : (defaultColumns.column2Value || '');

                return {
                    id: `${exercise.exerciseId}-${Date.now()}-${idx}`,
                    exerciseId: exercise.exerciseId,
                    name: exercise.name,
                    imageUrl: exercise.imageUrl,
                    exerciseType: exercise.exerciseType,
                    sets: [
                        { id: Math.random().toString(), setNumber: 1, column1: col1Value, column2: col2Value, type: 'R' as const },
                        { id: Math.random().toString(), setNumber: 2, column1: col1Value, column2: col2Value, type: 'R' as const },
                    ],
                    alternatives: [],
                    tempo: '',
                    eachSide: false,
                    column1Type: defaultColumns.column1Type,
                    column2Type,
                    equipments: exercise.equipments,
                    bodyParts: exercise.bodyParts,
                };
            });

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
            const currentExercise = newExercises[index];
            const updatedExercise = { ...currentExercise, ...updates };
            newExercises[index] = updatedExercise;

            // Find start and end of superset chain for syncing
            let start = index;
            while (start > 0 && newExercises[start - 1].isSupersetNext) {
                start--;
            }

            let end = index;
            while (end < newExercises.length - 1 && newExercises[end].isSupersetNext) {
                end++;
            }

            // Only sync if we're actually in a superset (more than one exercise in chain)
            const isInSuperset = end > start;

            // If sets are updated, check for superset syncing
            if (updates.sets && updates.sets.length !== currentExercise.sets.length && isInSuperset) {
                const targetSetCount = updates.sets.length;
                const sourceSets = updates.sets;

                // Apply set count to all exercises in chain (except the one that triggered the change)
                for (let i = start; i <= end; i++) {
                    if (i === index) continue;

                    const ex = newExercises[i];
                    let newSets = [...ex.sets];

                    if (newSets.length > targetSetCount) {
                        // Remove sets from the end
                        newSets = newSets.slice(0, targetSetCount);
                    } else {
                        // Add sets - copy type and column1 from source exercise's corresponding set
                        while (newSets.length < targetSetCount) {
                            const sourceSet = sourceSets[newSets.length];
                            newSets.push({
                                id: Math.random().toString(),
                                setNumber: newSets.length + 1,
                                column1: sourceSet?.column1 || '',
                                column2: '',
                                type: sourceSet?.type || 'R' as const,
                            });
                        }
                    }
                    newExercises[i] = { ...ex, sets: newSets };
                }
            }

            // If setRestSec changed and exercise is in a superset, sync rest to all exercises
            if (updates.setRestSec !== undefined && updates.setRestSec !== currentExercise.setRestSec && isInSuperset) {
                for (let i = start; i <= end; i++) {
                    if (i === index) continue;
                    newExercises[i] = { ...newExercises[i], setRestSec: updates.setRestSec };
                }
            }

            // If column1Type changed, sync to all exercises in superset (including resetting column1 values)
            if (updates.column1Type !== undefined && updates.column1Type !== currentExercise.column1Type && isInSuperset) {
                for (let i = start; i <= end; i++) {
                    if (i === index) continue;
                    const ex = newExercises[i];
                    // Reset column1 values in all sets when column type changes
                    const resetSets = ex.sets.map(s => ({ ...s, column1: '' }));
                    newExercises[i] = { ...ex, column1Type: updates.column1Type, sets: resetSets };
                }
            }

            // If column2Type changed, sync to all exercises in superset (including resetting column2 values)
            if (updates.column2Type !== undefined && updates.column2Type !== currentExercise.column2Type && isInSuperset) {
                for (let i = start; i <= end; i++) {
                    if (i === index) continue;
                    const ex = newExercises[i];
                    // Reset column2 values in all sets when column type changes
                    const resetSets = ex.sets.map(s => ({ ...s, column2: '' }));
                    newExercises[i] = { ...ex, column2Type: updates.column2Type, sets: resetSets };
                }
            }

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

                // For interval-based sections (tabata, hiit, emom, circuits), override column2 to Optional
                const isIntervalSection = prev.sectionType === 'tabata' || prev.sectionType === 'hiit' || prev.sectionType === 'emom' || prev.sectionType === 'circuits';
                const defaultColumns = getDefaultColumns(newExercise.exerciseType, newExercise.category);
                const column2Type = isIntervalSection ? 'Optional' : defaultColumns.column2Type;

                newExercises[index] = {
                    ...currentExercise,
                    exerciseId: newExercise.exerciseId,
                    name: newExercise.name,
                    imageUrl: newExercise.imageUrl,
                    exerciseType: newExercise.exerciseType,
                    column1Type: defaultColumns.column1Type,
                    column2Type,
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
                    const targetSetCount = ex.sets.length;
                    const sourceSets = ex.sets;

                    // Sync next exercise's sets to match current exercise
                    let newSets = [...nextEx.sets];
                    if (newSets.length !== targetSetCount) {
                        if (newSets.length > targetSetCount) {
                            newSets = newSets.slice(0, targetSetCount);
                        } else {
                            while (newSets.length < targetSetCount) {
                                const sourceSet = sourceSets[newSets.length];
                                newSets.push({
                                    id: Math.random().toString(),
                                    setNumber: newSets.length + 1,
                                    column1: sourceSet?.column1 || '',
                                    column2: '',
                                    type: sourceSet?.type || 'R' as const,
                                });
                            }
                        }
                    }

                    // Update current exercise
                    newExercises[index] = {
                        ...ex,
                        isSupersetNext: true,
                        supersetGroupId,
                    };

                    // Update next exercise with the same supersetGroupId, synced sets, rest, and column types
                    newExercises[nextIndex] = {
                        ...nextEx,
                        sets: newSets,
                        supersetGroupId,
                        setRestSec: ex.setRestSec, // Sync rest from top exercise
                        column1Type: ex.column1Type, // Sync column1 type from top exercise
                        column2Type: ex.column2Type, // Sync column2 type from top exercise
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
        <View style={[styles.container, { backgroundColor: themeColors.backgroundPrimary }]}>
            <View style={[styles.fixedHeader, { height: headerHeight }]}>
                <LinearGradient
                    colors={
                        colorScheme === 'dark'
                            ? ['rgba(0, 0, 0, 0.85)', 'rgba(0, 0, 0, 0.65)', 'rgba(0, 0, 0, 0.4)', 'rgba(0, 0, 0, 0.15)', 'rgba(0, 0, 0, 0.05)', 'rgba(0, 0, 0, 0)']
                            : ['rgba(255, 255, 255, 0.85)', 'rgba(255, 255, 255, 0.65)', 'rgba(255, 255, 255, 0.4)', 'rgba(255, 255, 255, 0.15)', 'rgba(255, 255, 255, 0.05)', 'rgba(255, 255, 255, 0)']
                    }
                    locations={[0, 0.2, 0.4, 0.65, 0.85, 1]}
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

                    <SectionTypeSelect
                        sectionType={state.sectionType}
                        onSectionTypeChange={(newType) => {
                            setState(prev => {
                                const isIntervalType = newType === 'tabata' || newType === 'hiit' || newType === 'emom' || newType === 'circuits';

                                // Start with current exercises
                                let updatedExercises = prev.exercises;

                                // If changing to amrap, timed, or circuits, trim all exercises to one set each
                                // These section types only support one set per exercise (values per round)
                                if (newType === 'amrap' || newType === 'timed' || newType === 'circuits') {
                                    updatedExercises = updatedExercises.map(ex => ({
                                        ...ex,
                                        sets: ex.sets.length > 0 ? [ex.sets[0]] : ex.sets,
                                    }));
                                }

                                // Update column2Type for interval sections
                                if (isIntervalType) {
                                    updatedExercises = updatedExercises.map(ex => ({
                                        ...ex,
                                        column2Type: 'Optional',
                                    }));
                                }

                                // Set default values for Tabata/HIIT/EMOM/Circuits
                                let updates: Partial<SectionBuilderState> = { sectionType: newType, exercises: updatedExercises };
                                if (newType === 'tabata') {
                                    updates.workSec = '20';
                                    updates.restSec = '10';
                                    updates.rounds = '8';
                                } else if (newType === 'hiit') {
                                    updates.workSec = '40';
                                    updates.restSec = '20';
                                    updates.rounds = '10';
                                } else if (newType === 'emom') {
                                    updates.intervalSec = '60';
                                    updates.durationMin = '10';
                                } else if (newType === 'circuits') {
                                    updates.rounds = '3';
                                }
                                return { ...prev, ...updates };
                            });
                        }}
                        duration={state.duration}
                        onDurationChange={(text) => setState(prev => ({ ...prev, duration: text }))}
                        rounds={state.rounds}
                        onRoundsChange={(text) => setState(prev => ({ ...prev, rounds: text }))}
                        workSec={state.workSec}
                        onWorkSecChange={(text) => setState(prev => ({ ...prev, workSec: text }))}
                        restSec={state.restSec}
                        onRestSecChange={(text) => setState(prev => ({ ...prev, restSec: text }))}
                        intervalSec={state.intervalSec}
                        onIntervalSecChange={(text) => setState(prev => ({ ...prev, intervalSec: text }))}
                        durationMin={state.durationMin}
                        onDurationMinChange={(text) => setState(prev => ({ ...prev, durationMin: text }))}
                        metadataErrors={metadataErrors}
                        required
                    />

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

                {!isLoadingData && state.exercises.length === 0 && (
                    <Text style={[styles.emptyText, { color: themeColors.mutedText }]}>
                        {t('library.section.addExercisesHint')}
                    </Text>
                )}

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
                                hideSetControls={state.sectionType !== 'regular'}
                                validationErrors={validationErrors}
                                onSwap={() => handleSwapExercise(index)}
                            />

                            {!isLast && canSupersetNext && state.sectionType === 'regular' && (
                                <View style={[
                                    styles.supersetConnector,
                                    { borderColor: themeColors.border },
                                    isLinkedToNext ? [styles.linkedConnector, { backgroundColor: themeColors.cardPrimary, borderColor: themeColors.cardSecondary, borderLeftWidth: 0.5, borderRightWidth: 0.5 }] : styles.unlinkedConnector
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
                                                    backgroundColor: isLinkedToNext ? themeColors.cardPrimary : themeColors.backgroundTertiary,
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

                            {!isLast && canSupersetNext && state.sectionType !== 'regular' && (
                                <View style={{ height: 8 }} />
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
                    backgroundColor: themeColors.surfacePrimary,
                    paddingBottom: insets.bottom + 12,
                }
            ]}>
                <View style={styles.bottomBarContent}>
                    <View style={[styles.countCircle, { backgroundColor: themeColors.primary }]}>
                        <Text style={[styles.countText, { color: themeColors.primaryForeground }]}>{totalExercises}</Text>
                    </View>

                    <View style={styles.buttonWrapper}>
                        <PressableScale
                            style={[styles.actionButton, { backgroundColor: themeColors.primary }]}
                            onPress={handleReorder}
                        >
                            <Repeat {...({ size: 18, color: themeColors.primaryForeground, style: styles.buttonIcon } as any)} />
                            <Text style={[styles.actionButtonText, { color: themeColors.primaryForeground }]}>{t('library.workout.reorder')}</Text>
                        </PressableScale>
                    </View>

                    <View style={styles.buttonWrapper}>
                        <PressableScale
                            style={[styles.actionButton, { backgroundColor: themeColors.primary }]}
                            onPress={handleAddExercise}
                        >
                            <Plus {...({ size: 18, color: themeColors.primaryForeground, style: styles.buttonIcon } as any)} />
                            <Text style={[styles.actionButtonText, { color: themeColors.primaryForeground }]}>{t('library.workout.add')}</Text>
                        </PressableScale>
                    </View>
                </View>
            </View>

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
                title={t('common.discardChanges')}
                message={t('common.discardChangesMessage')}
                buttons={[
                    { label: t('common.cancel'), onPress: () => setShowDiscardDialog(false), variant: 'secondary' },
                    { label: t('common.discard'), onPress: handleDiscard, variant: 'destructive' }
                ]}
            />

            {isLoadingData && (
                <View style={[styles.loadingOverlay, { backgroundColor: themeColors.backgroundPrimary }]}>
                    <ActivityIndicator size="large" color={themeColors.primary} />
                    <Text style={[styles.loadingText, { color: themeColors.mutedText }]}>
                        {t('library.section.loading')}
                    </Text>
                </View>
            )}
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
    fullWidthDivider: {
        height: 1,
        marginHorizontal: -16,
        marginBottom: 24,
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
    loadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 100,
        gap: 12,
    },
    loadingText: {
        ...typography.p2,
    },
    bottomBarContainer: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        marginTop: -24,
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
