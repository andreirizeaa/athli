import React, { useEffect, useState, useRef, useCallback } from 'react';
import { StyleSheet, Text, View, Platform, Keyboard, ActivityIndicator } from 'react-native';
import { Dialog } from '@/components/ui/dialog';
import { ChevronLeft, Check, Repeat, Plus, Dumbbell, Layers, Link as LinkIcon, Pencil } from 'lucide-react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams, useFocusEffect, useNavigation } from 'expo-router';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';


import { typography } from '@/constants/typography';
import { haptics } from '@/utils/haptics';
import { useThemePreference, useColorScheme } from '@/stores';
import { useTranslations } from '@/stores';
import { IconButton } from '@/components/ui/icon-button';
import { PressableScale } from 'pressto';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useModalCallbacks } from '@/stores';
import { ExerciseBuilderCard } from '@/components/features/workout/exercise-builder-card';
import { SectionBuilderCard } from '@/components/features/workout/section-builder-card';
import { Exercise } from '@/app/modals/workout/add-exercise-to-builder-modal';
import {
    type BuilderWorkoutState,
    type BuilderExercise,
    type BuilderSection,
    type BuilderItem,
    createEmptyWorkoutState,
    areWorkoutStatesEqual,
    getDefaultColumns,
    isBuilderSection,
    buildWorkoutPayload,
    buildSectionPayload,
    type WorkoutItem,
    type WorkoutProgramPayload,
} from '@/components/features/workout/workout-schema';
import {
    type ExerciseValidationError,
    validateWorkoutItems,
} from '@/components/features/workout/validation';
import { createWorkout, editWorkout, getWorkoutById } from '@/services/coach/coach-workout-service';
import { assignWorkout, getClientWorkoutInstance } from '@/services/client/client-training-service';
import { useClientDetailStore } from '@/stores';
import { getExerciseById as getCoachExerciseById } from '@/services/coach/coach-exercise-service';
import { createSection } from '@/services/coach/coach-section-service';
import { getExerciseById as getMuscleWikiExerciseById } from '@/services/musclewiki-service';

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
    'new': {
        id: 'new',
        name: '',
        description: '',
        type: '',
        difficulty: 'all_levels',
    },
};

export default function WorkoutDetailScreen() {
    const router = useRouter();
    const params = useLocalSearchParams<{
        id: string;
        name?: string;
        description?: string;
        type?: string;
        difficulty?: string;
        // Client workout context - when editing a workout from client training
        clientId?: string;
        clientWorkoutDate?: string;
        coachId?: string; // Coach ID passed from training screen
        workoutPayload?: string; // Full workout data as JSON string (avoids refetch)
    }>();

    // Determine if we're editing a client's workout instance vs a library workout
    const isClientWorkout = !!params.clientId && !!params.clientWorkoutDate;
    const { colors: themeColors } = useThemePreference();
    const colorScheme = useColorScheme();
    const { t } = useTranslations();
    const insets = useSafeAreaInsets();

    const { setExercisesSelectCallback, setSectionSelectCallback, setExerciseSelectCallback, setReorderCallback, setReorderItems, setMetadataUpdateCallback } = useModalCallbacks();
    const queryClient = useQueryClient();

    // Workout state management - Initialize with params for immediate display
    const [workoutState, setWorkoutState] = useState<BuilderWorkoutState>(() => {
        const isNew = params.id === 'new';
        return {
            meta: {
                id: isNew ? null : params.id,
                name: params.name || '',
                description: params.description || '',
                type: params.type || '',
                difficulty: params.difficulty || 'all_levels',
            },
            items: [],
        };
    });
    const initialStateRef = useRef<BuilderWorkoutState | null>(null);
    const [isDirty, setIsDirty] = useState(false);
    const [validationErrors, setValidationErrors] = useState<ExerciseValidationError[]>([]);
    const [emptySectionIds, setEmptySectionIds] = useState<string[]>([]);
    const [isLoadingData, setIsLoadingData] = useState(false);

    // Dialog states
    const [showErrorDialog, setShowErrorDialog] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [showDiscardDialog, setShowDiscardDialog] = useState(false);
    const [showSuccessDialog, setShowSuccessDialog] = useState(false);
    const [showAddDialog, setShowAddDialog] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');

    // Mutation for creating workout
    const createMutation = useMutation({
        mutationFn: createWorkout,
        onSuccess: async () => {
            await queryClient.refetchQueries({ queryKey: ['workouts'] });
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

    // Mutation for updating workout (library workout)
    const editMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: any }) => editWorkout(id, data),
        onSuccess: async () => {
            await queryClient.refetchQueries({ queryKey: ['workouts'] });
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

    // Get coachId for client workout saves - prefer from params (passed from training screen)
    const storeCoachId = useClientDetailStore((state) => state.coachId);
    const coachId = params.coachId || storeCoachId;
    const refreshTrainingSection = useClientDetailStore((state) => state.refreshSection);

    // Mutation for updating client workout instance (not library)
    const clientWorkoutMutation = useMutation({
        mutationFn: async ({ payload }: { payload: WorkoutProgramPayload }) => {
            if (!params.clientId || !params.clientWorkoutDate || !coachId) {
                throw new Error('Missing client context for save');
            }
            return assignWorkout({
                clientId: params.clientId,
                coachId,
                date: params.clientWorkoutDate,
                workoutId: params.id,
                workoutPayload: { ...payload, id: params.id },
                isNew: false,
            });
        },
        onSuccess: async () => {
            // Refresh client training data
            refreshTrainingSection('training');
            // Also invalidate client-specific queries
            queryClient.invalidateQueries({ queryKey: ['client-workout-instance', params.clientId] });
            queryClient.invalidateQueries({ queryKey: ['client-training-calendar', params.clientId] });
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

    // Mutation for creating section from workout builder
    const saveSectionMutation = useMutation({
        mutationFn: createSection,
        onSuccess: async () => {
            await queryClient.refetchQueries({ queryKey: ['sections'] });
            haptics.success();
            setSuccessMessage(t('library.section.savedSuccessfully'));
            setShowSuccessDialog(true);
        },
        onError: (error: Error) => {
            haptics.error();
            setErrorMessage(error.message || t('general.errorSaving'));
            setShowErrorDialog(true);
        },
    });

    // Load workout data from API when editing
    useEffect(() => {
        const loadWorkoutData = async () => {
            if (params.id && params.id !== 'new') {
                setIsLoadingData(true);
                try {
                    let workoutData: any;

                    // If workoutPayload is provided, use it directly (no API fetch needed)
                    if (params.workoutPayload) {
                        try {
                            const parsedPayload = JSON.parse(params.workoutPayload);
                            console.log('[WorkoutDetailScreen] Using provided workout payload:', {
                                id: parsedPayload.id,
                                name: parsedPayload.name || parsedPayload.workout,
                                hasItems: !!parsedPayload.items,
                                itemsCount: parsedPayload.items?.length || 0,
                            });

                            // Items are at top level in the payload
                            const workoutItems = parsedPayload.items || [];

                            workoutData = {
                                id: parsedPayload.id || params.id,
                                name: parsedPayload.name || parsedPayload.workout || params.name,
                                description: parsedPayload.description || params.description,
                                type: parsedPayload.type || params.type,
                                difficulty: parsedPayload.difficulty || params.difficulty,
                                workout_data: {
                                    items: workoutItems,
                                },
                            };
                        } catch (parseError) {
                            console.error('[WorkoutDetailScreen] Failed to parse workout payload:', parseError);
                            // Fall through to fetch from API
                        }
                    }

                    // If no payload or parsing failed, fetch from API
                    if (!workoutData && isClientWorkout && params.clientId && params.clientWorkoutDate && coachId) {
                        // For client workouts, fetch from client training table (not library)
                        console.log('[WorkoutDetailScreen] Fetching client workout instance:', {
                            clientId: params.clientId,
                            coachId,
                            date: params.clientWorkoutDate,
                            workoutId: params.id,
                        });
                        const clientWorkout = await getClientWorkoutInstance(
                            params.clientId,
                            coachId,
                            params.clientWorkoutDate,
                            params.id
                        );
                        console.log('[WorkoutDetailScreen] Raw client workout response:', {
                            hasData: !!clientWorkout,
                            keys: clientWorkout ? Object.keys(clientWorkout) : [],
                            hasItems: !!clientWorkout?.items,
                            hasWorkoutData: !!clientWorkout?.workout_data,
                            hasNestedItems: !!clientWorkout?.workout_data?.items,
                            itemsLength: clientWorkout?.items?.length || 0,
                            nestedItemsLength: clientWorkout?.workout_data?.items?.length || 0,
                        });

                        // Items can be at top level OR nested under workout_data
                        // Handle both API response formats
                        const workoutItems = clientWorkout?.items ||
                            clientWorkout?.workout_data?.items ||
                            [];

                        console.log('[WorkoutDetailScreen] Resolved workout items:', {
                            count: workoutItems.length,
                            firstItem: workoutItems[0] ? {
                                itemType: workoutItems[0].itemType,
                                hasData: !!workoutItems[0].data,
                            } : null,
                        });

                        // Transform client workout instance format to match expected structure
                        workoutData = {
                            id: clientWorkout?.id || params.id,
                            name: clientWorkout?.name || clientWorkout?.workout || params.name,
                            description: clientWorkout?.description || params.description,
                            type: clientWorkout?.type || params.type,
                            difficulty: clientWorkout?.difficulty || params.difficulty,
                            workout_data: {
                                items: workoutItems,
                            },
                        };
                        console.log('[WorkoutDetailScreen] Loaded client workout instance:', {
                            id: workoutData.id,
                            name: workoutData.name,
                            itemsCount: workoutData.workout_data?.items?.length || 0,
                            hasTopLevelItems: !!clientWorkout?.items,
                            hasNestedItems: !!clientWorkout?.workout_data?.items,
                        });
                    } else if (!workoutData) {
                        // For library workouts, fetch from coach's workout library
                        workoutData = await getWorkoutById(params.id);
                        console.log('[WorkoutDetailScreen] Loaded workout data from library:', {
                            id: params.id,
                            name: workoutData.name,
                            type: workoutData.type,
                            difficulty: workoutData.difficulty,
                            hasWorkoutData: !!workoutData.workout_data,
                            itemsCount: workoutData.workout_data?.items?.length || 0,
                        });
                    }
                    console.log('[WorkoutDetailScreen] Processing workout data:', {
                        id: params.id,
                        name: workoutData.name,
                        type: workoutData.type,
                        difficulty: workoutData.difficulty,
                        hasWorkoutData: !!workoutData.workout_data,
                        itemsCount: workoutData.workout_data?.items?.length || 0,
                        fullData: workoutData,
                    });
                    console.log('[WorkoutDetailScreen] Workout items:', JSON.stringify(workoutData.workout_data?.items, null, 2));
                    if (workoutData.workout_data && workoutData.workout_data.items && workoutData.workout_data.items.length > 0) {
                        // Map set type from API format to builder format
                        const mapSetType = (type: string): 'R' | 'W' | 'F' | 'D' => {
                            const typeMap: Record<string, 'R' | 'W' | 'F' | 'D'> = {
                                'normal': 'R',
                                'warmUp': 'W',
                                'failure': 'F',
                                'dropset': 'D',
                            };
                            return typeMap[type] || 'R';
                        };

                        // Collect all unique exercise IDs from the workout data
                        const collectExerciseIds = (items: any[]): string[] => {
                            const ids = new Set<string>();
                            items.forEach((item: any) => {
                                if (item.itemType === 'exercise' && item.data?.prescribedExerciseId) {
                                    ids.add(item.data.prescribedExerciseId);
                                    (item.data.alternatives || []).forEach((altId: string) => ids.add(altId));
                                } else if (item.itemType === 'section' && item.data?.exercises) {
                                    // Handle different section exercise structures
                                    const sectionExercises = item.data.exercises || [];
                                    sectionExercises.forEach((groupOrEx: any) => {
                                        // Could be exercise group (regular/tabata/hiit/emom) or direct exercise (amrap/timed)
                                        if (groupOrEx.prescribedExerciseId) {
                                            ids.add(groupOrEx.prescribedExerciseId);
                                            (groupOrEx.alternatives || []).forEach((altId: string) => ids.add(altId));
                                        } else if (groupOrEx.exercises) {
                                            groupOrEx.exercises.forEach((ex: any) => {
                                                if (ex.prescribedExerciseId) {
                                                    ids.add(ex.prescribedExerciseId);
                                                    (ex.alternatives || []).forEach((altId: string) => ids.add(altId));
                                                }
                                            });
                                        }
                                    });
                                }
                            });
                            return Array.from(ids);
                        };

                        const exerciseIds = collectExerciseIds(workoutData.workout_data.items);
                        
                        // Pre-fetch all exercise details from MuscleWiki API
                        const exerciseDetailsMap = new Map<string, { name: string; imageUrl: string; exerciseType: string }>();
                        const fetchPromises = exerciseIds.map(async (id) => {
                            try {
                                const exercise = await getMuscleWikiExerciseById(id);
                                if (exercise) {
                                    exerciseDetailsMap.set(id, {
                                        name: exercise.name,
                                        imageUrl: exercise.imageUrl,
                                        exerciseType: exercise.exerciseType,
                                    });
                                } else {
                                    exerciseDetailsMap.set(id, {
                                        name: id || 'Exercise',
                                        imageUrl: '',
                                        exerciseType: 'weight_reps',
                                    });
                                }
                            } catch (err) {
                                console.warn(`Failed to fetch exercise ${id}:`, err);
                                exerciseDetailsMap.set(id, {
                                    name: id || 'Exercise',
                                    imageUrl: '',
                                    exerciseType: 'weight_reps',
                                });
                            }
                        });
                        await Promise.all(fetchPromises);

                        // Helper to get exercise details from pre-fetched map
                        const getExerciseDetails = (exerciseId: string) => {
                            const details = exerciseDetailsMap.get(exerciseId);
                            return {
                                name: details?.name || exerciseId || 'Exercise',
                                imageUrl: details?.imageUrl || '',
                                exerciseType: details?.exerciseType || 'weight_reps',
                            };
                        };

                        // Helper to normalize Heart Rate Zone values from web format to mobile format
                        // Web: "Z1: 50-60% of max HR" -> Mobile: "Zone 1"
                        const normalizeHeartRateZone = (value: string, columnType: string): string => {
                            if (columnType !== 'Heart Rate Zone' || !value) return value;

                            // Check if it's web format (e.g., "Z1: 50-60% of max HR")
                            const webFormatMatch = value.match(/^Z(\d):/);
                            if (webFormatMatch) {
                                const zoneNumber = webFormatMatch[1];
                                return `Zone ${zoneNumber}`;
                            }

                            // Already in mobile format or unrecognized - return as is
                            return value;
                        };

                        // Helper to transform exercise data to builder format
                        const transformExercise = (data: any): BuilderExercise => {
                            const exerciseDetails = getExerciseDetails(data.prescribedExerciseId);

                            // Transform alternatives from IDs to exercise objects
                            const transformedAlternatives = (data.alternatives || []).map((altId: string) => {
                                const altExercise = getExerciseDetails(altId);
                                return {
                                    id: altId,
                                    exerciseId: altId,
                                    name: altExercise.name,
                                    imageUrl: altExercise.imageUrl,
                                    exerciseType: altExercise.exerciseType,
                                };
                            });

                            console.log('[WorkoutDetailScreen] Transform alternatives:', {
                                originalAlternatives: data.alternatives,
                                transformedAlternatives,
                            });

                            // Get column types
                            const column1Type = data.column1Label || 'Reps';
                            const column2Type = data.column2Label || 'kg';

                            // Get rest time from first set for exercise-level rest display
                            const firstSetRestSec = data.sets?.[0]?.restSec;

                            return {
                                id: data.id || `exercise-${Date.now()}`, // Use instance ID from payload
                                exerciseId: data.prescribedExerciseId || '',
                                name: exerciseDetails.name,
                                imageUrl: exerciseDetails.imageUrl,
                                exerciseType: exerciseDetails.exerciseType,
                                sets: (data.sets || []).map((set: any, idx: number) => ({
                                    id: `set-${idx}`,
                                    setNumber: set.setNumber || idx + 1,
                                    column1: normalizeHeartRateZone(set.trackableField1?.prescribed || '', column1Type),
                                    column2: normalizeHeartRateZone(set.trackableField2?.prescribed || '', column2Type),
                                    type: mapSetType(set.type),
                                    rest: set.restSec ? set.restSec.toString() : undefined,
                                })),
                                column1Type,
                                column2Type,
                                notes: data.notes || '',
                                alternatives: transformedAlternatives,
                                tempo: data.tempo || '',
                                eachSide: data.eachSide || false,
                                isSupersetNext: false, // Will be fixed after all items are transformed
                                supersetGroupId: data.supersetId || null, // Add superset group ID
                                setRestSec: firstSetRestSec || undefined,
                            };
                        };

                        // Transform API payload format to builder format
                        const transformedItems: BuilderItem[] = workoutData.workout_data.items.map((item: any) => {
                            if (item.itemType === 'exercise') {
                                return transformExercise(item.data);
                            } else if (item.itemType === 'section') {
                                // Handle section transformation
                                const data = item.data;
                                let sectionExercises: BuilderExercise[] = [];

                                // Transform exercises based on section type
                                if (data.type === 'regular' || data.type === 'auxiliary') {
                                    // Regular/Auxiliary sections have exercise groups (potentially supersets)
                                    const allExercises = (data.exercises || []).flatMap((group: any) =>
                                        (group.exercises || []).map((ex: any) => transformExercise(ex))
                                    );
                                    // Fix isSupersetNext based on adjacent exercises
                                    sectionExercises = allExercises.map((ex: any, idx: number) => {
                                        const nextEx = idx < allExercises.length - 1 ? allExercises[idx + 1] : null;
                                        const isSupersetNext = nextEx && ex.supersetGroupId && ex.supersetGroupId === nextEx.supersetGroupId;
                                        return { ...ex, isSupersetNext: isSupersetNext || false };
                                    });
                                } else if (data.type === 'tabata' || data.type === 'hiit' || data.type === 'emom' || data.type === 'circuits') {
                                    // Tabata/HIIT/EMOM/Circuits have exercise groups, each exercise has a single 'set' field
                                    const allExercises = (data.exercises || []).flatMap((group: any) =>
                                        (group.exercises || []).map((ex: any) => {
                                            // Convert single 'set' to 'sets' array for transformExercise
                                            const exerciseWithSets = {
                                                ...ex,
                                                sets: ex.set ? [ex.set] : [],
                                            };
                                            return transformExercise(exerciseWithSets);
                                        })
                                    );
                                    // Fix isSupersetNext based on adjacent exercises
                                    sectionExercises = allExercises.map((ex: any, idx: number) => {
                                        const nextEx = idx < allExercises.length - 1 ? allExercises[idx + 1] : null;
                                        const isSupersetNext = nextEx && ex.supersetGroupId && ex.supersetGroupId === nextEx.supersetGroupId;
                                        return { ...ex, isSupersetNext: isSupersetNext || false };
                                    });
                                } else if (data.type === 'amrap' || data.type === 'timed') {
                                    // AMRAP/Timed sections have a flat array of exercises
                                    const allExercises = (data.exercises || []).map((ex: any) => {
                                        const exerciseDetails = getExerciseDetails(ex.prescribedExerciseId);

                                        // Transform alternatives from IDs to exercise objects
                                        const transformedAlternatives = (ex.alternatives || []).map((altId: string) => {
                                            const altExercise = getExerciseDetails(altId);
                                            return {
                                                id: altId,
                                                exerciseId: altId,
                                                name: altExercise.name,
                                                imageUrl: altExercise.imageUrl,
                                                exerciseType: altExercise.exerciseType,
                                            };
                                        });

                                        // Get column types
                                        const column1Type = ex.column1Label || 'Reps';
                                        const column2Type = ex.column2Label || 'kg';

                                        // Create a single set for AMRAP/Timed exercises with the trackable field values
                                        const singleSet = {
                                            id: 'set-1',
                                            setNumber: 1,
                                            column1: normalizeHeartRateZone(ex.trackableField1?.prescribed || '', column1Type),
                                            column2: normalizeHeartRateZone(ex.trackableField2?.prescribed || '', column2Type),
                                            type: 'R' as const,
                                            rest: ex.restSec ? ex.restSec.toString() : undefined,
                                        };

                                        return {
                                            id: ex.id || `exercise-${Date.now()}`, // Use instance ID from payload
                                            exerciseId: ex.prescribedExerciseId || '',
                                            name: exerciseDetails.name,
                                            imageUrl: exerciseDetails.imageUrl,
                                            exerciseType: ex.exerciseType || exerciseDetails.exerciseType,
                                            sets: [singleSet],
                                            column1Type,
                                            column2Type,
                                            notes: ex.notes || '',
                                            alternatives: transformedAlternatives,
                                            tempo: ex.tempo || '',
                                            eachSide: ex.eachSide || false,
                                            isSupersetNext: false, // Will be fixed below
                                            supersetGroupId: ex.supersetId || null, // Add superset group ID
                                            setRestSec: ex.restSec || undefined,
                                        } as BuilderExercise;
                                    });
                                    // Fix isSupersetNext based on adjacent exercises
                                    sectionExercises = allExercises.map((ex: any, idx: number) => {
                                        const nextEx = idx < allExercises.length - 1 ? allExercises[idx + 1] : null;
                                        const isSupersetNext = nextEx && ex.supersetGroupId && ex.supersetGroupId === nextEx.supersetGroupId;
                                        return { ...ex, isSupersetNext: isSupersetNext || false };
                                    });
                                }

                                // Map config values based on section type
                                let sectionDuration: string | undefined;
                                let sectionRounds: string | undefined;
                                let sectionWorkSec: string | undefined;
                                let sectionRestSec: string | undefined;
                                let sectionIntervalSec: string | undefined;
                                let sectionDurationMin: string | undefined;

                                // AMRAP sections have durationSec (in seconds, convert to minutes for UI)
                                if (data.durationSec !== undefined && data.type === 'amrap') {
                                    sectionDuration = String(Math.round(data.durationSec / 60));
                                }

                                // Timed sections use targetRounds
                                if (data.targetRounds !== undefined) {
                                    sectionRounds = String(data.targetRounds);
                                }

                                // Circuits/Tabata/HIIT use rounds directly
                                if (data.rounds !== undefined && (data.type === 'circuits' || data.type === 'tabata' || data.type === 'hiit')) {
                                    sectionRounds = String(data.rounds);
                                }

                                // Tabata/HIIT fields
                                if (data.workSec !== undefined) {
                                    sectionWorkSec = String(data.workSec);
                                }
                                if (data.restSec !== undefined && (data.type === 'tabata' || data.type === 'hiit')) {
                                    sectionRestSec = String(data.restSec);
                                }

                                // EMOM fields
                                if (data.intervalSec !== undefined) {
                                    sectionIntervalSec = String(data.intervalSec);
                                }
                                if (data.durationMin !== undefined) {
                                    sectionDurationMin = String(data.durationMin);
                                }

                                return {
                                    id: data.id || `section-${Date.now()}`,
                                    type: 'section' as const,
                                    name: data.name || '',
                                    sectionType: data.type || 'regular',
                                    duration: sectionDuration,
                                    rounds: sectionRounds,
                                    notes: data.notes || '',
                                    exercises: sectionExercises,
                                    workSec: sectionWorkSec,
                                    restSec: sectionRestSec,
                                    intervalSec: sectionIntervalSec,
                                    durationMin: sectionDurationMin,
                                } as BuilderSection;
                            }
                            return null;
                        }).filter(Boolean) as BuilderItem[];

                        // Fix isSupersetNext for top-level exercises (not in sections)
                        const fixedItems = transformedItems.map((item, idx) => {
                            if (!isBuilderSection(item)) {
                                const ex = item as BuilderExercise;
                                const nextItem = idx < transformedItems.length - 1 ? transformedItems[idx + 1] : null;
                                if (nextItem && !isBuilderSection(nextItem)) {
                                    const nextEx = nextItem as BuilderExercise;
                                    const isSupersetNext = ex.supersetGroupId && ex.supersetGroupId === nextEx.supersetGroupId;
                                    return { ...ex, isSupersetNext: isSupersetNext || false };
                                }
                                return { ...ex, isSupersetNext: false };
                            }
                            return item;
                        });

                        // Update state with the loaded workout schema
                        const loadedState: BuilderWorkoutState = {
                            meta: {
                                id: params.id,
                                name: workoutData.name,
                                description: workoutData.description || '',
                                type: workoutData.type || '',
                                difficulty: workoutData.difficulty || 'all_levels',
                            },
                            items: fixedItems,
                        };
                        setWorkoutState(loadedState);
                        // Set initial state for dirty tracking (must happen after data loads)
                        initialStateRef.current = JSON.parse(JSON.stringify(loadedState));
                    } else {
                        // No items found - just update the meta data
                        console.log('[WorkoutDetailScreen] No workout items found, updating meta only');
                        const loadedState: BuilderWorkoutState = {
                            meta: {
                                id: params.id,
                                name: workoutData.name || params.name || '',
                                description: workoutData.description || params.description || '',
                                type: workoutData.type || params.type || '',
                                difficulty: workoutData.difficulty || params.difficulty || 'all_levels',
                            },
                            items: [],
                        };
                        setWorkoutState(loadedState);
                        // Set initial state for dirty tracking (must happen after data loads)
                        initialStateRef.current = JSON.parse(JSON.stringify(loadedState));
                    }
                } catch (error) {
                    console.error('Failed to load workout data:', error);
                    setErrorMessage(t('general.errorLoading'));
                    setShowErrorDialog(true);
                } finally {
                    setIsLoadingData(false);
                }
            }
        };

        loadWorkoutData();
    }, [params.id, params.clientId, params.clientWorkoutDate, params.coachId, isClientWorkout, storeCoachId, t]);

    // TODO: Fetch exercise details after workout data is loaded
    // Currently disabled because exercises in the workout data use placeholder IDs
    // that don't exist in the database yet. Re-enable this once real exercise IDs are used.
    // useEffect(() => {
    //     const fetchExerciseDetails = async () => {
    //         // Collect all unique exercise IDs from the workout
    //         const exerciseIds = new Set<string>();

    //         workoutState.items.forEach(item => {
    //             if (isBuilderSection(item)) {
    //                 // Collect exercise IDs from section
    //                 item.exercises.forEach(ex => {
    //                     if (ex.exerciseId && !ex.name) { // Only fetch if we don't have the name yet
    //                         exerciseIds.add(ex.exerciseId);
    //                     }
    //                 });
    //             } else {
    //                 // Top-level exercise
    //                 if (item.exerciseId && !item.name) {
    //                     exerciseIds.add(item.exerciseId);
    //                 }
    //             }
    //         });

    //         if (exerciseIds.size === 0) return; // No exercises to fetch

    //         // Fetch all exercise details
    //         try {
    //             const exerciseDetailsMap = new Map<string, { name: string; imageUrl: string; exerciseType: string }>();

    //             await Promise.all(
    //                 Array.from(exerciseIds).map(async (id) => {
    //                     try {
    //                         const exercise = await getExerciseById(id);
    //                         exerciseDetailsMap.set(id, {
    //                             name: exercise.name,
    //                             imageUrl: '',
    //                             exerciseType: 'weight_reps',
    //                         });
    //                     } catch (error) {
    //                         console.error(`Failed to fetch exercise ${id}:`, error);
    //                     }
    //                 })
    //             );

    //             // Update workout state with exercise details
    //             setWorkoutState(prev => ({
    //                 ...prev,
    //                 items: prev.items.map(item => {
    //                     if (isBuilderSection(item)) {
    //                         return {
    //                             ...item,
    //                             exercises: item.exercises.map(ex => {
    //                                 const details = exerciseDetailsMap.get(ex.exerciseId);
    //                                 if (details) {
    //                                     return { ...ex, ...details };
    //                                 }
    //                                 return ex;
    //                             }),
    //                         };
    //                     } else {
    //                         const details = exerciseDetailsMap.get(item.exerciseId);
    //                         if (details) {
    //                             return { ...item, ...details };
    //                         }
    //                         return item;
    //                     }
    //                 }),
    //             }));
    //         } catch (error) {
    //             console.error('Failed to fetch exercise details:', error);
    //         }
    //     };

    //     if (workoutState.items.length > 0 && params.id && params.id !== 'new') {
    //         fetchExerciseDetails();
    //     }
    // }, [workoutState.items.length, params.id]);

    // Set initial state for NEW workouts immediately on mount
    useEffect(() => {
        if (params.id === 'new' && !initialStateRef.current) {
            initialStateRef.current = JSON.parse(JSON.stringify(workoutState));
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Empty deps - run once on mount

    // Note: For EXISTING workouts, initialStateRef is set directly in loadWorkoutData after data loads

    // Track dirty state
    useEffect(() => {
        if (initialStateRef.current) {
            const dirty = !areWorkoutStatesEqual(workoutState, initialStateRef.current);
            setIsDirty(dirty);
        }
    }, [workoutState]);

    // Sync metadata changes when returning from edit modal
    useFocusEffect(
        useCallback(() => {
            // Only sync if we have an existing workout ID (not a new workout)
            if (workoutState.meta.id && workoutState.meta.id !== 'new') {
                // Get the latest workout data from the query cache
                const cachedWorkouts = queryClient.getQueryData<any[]>(['workouts']);
                if (cachedWorkouts) {
                    const updatedWorkout = cachedWorkouts.find(w => w.id === workoutState.meta.id);
                    if (updatedWorkout) {
                        // Check if metadata has changed
                        const metadataChanged =
                            updatedWorkout.name !== workoutState.meta.name ||
                            updatedWorkout.description !== workoutState.meta.description ||
                            updatedWorkout.type !== workoutState.meta.type ||
                            updatedWorkout.difficulty !== workoutState.meta.difficulty;

                        if (metadataChanged) {
                            // Update only the metadata, preserve items
                            setWorkoutState(prev => ({
                                ...prev,
                                meta: {
                                    ...prev.meta,
                                    name: updatedWorkout.name,
                                    description: updatedWorkout.description || '',
                                    type: updatedWorkout.type || '',
                                    difficulty: updatedWorkout.difficulty || '',
                                }
                            }));
                            // Update ONLY the meta part of initialStateRef (preserves items tracking)
                            if (initialStateRef.current) {
                                initialStateRef.current.meta = {
                                    ...initialStateRef.current.meta,
                                    name: updatedWorkout.name,
                                    description: updatedWorkout.description || '',
                                    type: updatedWorkout.type || '',
                                    difficulty: updatedWorkout.difficulty || '',
                                };
                            }
                        }
                    }
                }
            }
        }, [workoutState.meta.id, queryClient])
    );

    // Handle section select callback
    useEffect(() => {
        setSectionSelectCallback((section: BuilderSection) => {
            setWorkoutState(prev => {
                const existingIndex = prev.items.findIndex(item => item.id === section.id);
                if (existingIndex !== -1) {
                    const newItems = [...prev.items];
                    newItems[existingIndex] = section;
                    return { ...prev, items: newItems };
                }
                return { ...prev, items: [...prev.items, section] };
            });
        });
    }, [setSectionSelectCallback]);

    const handleDiscard = useCallback(() => {
        setShowDiscardDialog(false);
        // Set isDirty to false so the beforeRemove listener allows navigation
        setIsDirty(false);
        if (router.canGoBack()) {
            router.back();
        }
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

    const handleBackPress = useCallback(() => {
        if (isDirty) {
            showDiscardAlert();
        } else {
            if (router.canGoBack()) {
                router.back();
            }
        }
    }, [isDirty, router, showDiscardAlert]);

    const handleEditMetadata = useCallback(() => {
        // Build the full workout payload to pass to the modal
        // For client workouts, we need to include items so the save doesn't lose exercise data
        const workoutPayload = isClientWorkout ? buildWorkoutPayload(workoutState) : null;
        
        // Set callback to update local state when modal saves
        setMetadataUpdateCallback((metadata) => {
            setWorkoutState(prev => ({
                ...prev,
                meta: {
                    ...prev.meta,
                    name: metadata.name,
                    description: metadata.description,
                    type: metadata.type,
                    difficulty: metadata.difficulty,
                },
            }));
            // Update ONLY the meta part of initialStateRef (preserves items tracking)
            if (initialStateRef.current) {
                initialStateRef.current.meta = {
                    ...initialStateRef.current.meta,
                    name: metadata.name,
                    description: metadata.description,
                    type: metadata.type,
                    difficulty: metadata.difficulty,
                };
            }
        });
        
        router.push({
            pathname: '/modals/library/add-workout-modal',
            params: {
                editingId: workoutState.meta.id,
                name: workoutState.meta.name,
                description: workoutState.meta.description || '',
                type: workoutState.meta.type || '',
                difficulty: workoutState.meta.difficulty || '',
                // Pass client context if editing a client workout
                ...(isClientWorkout && {
                    clientId: params.clientId,
                    clientWorkoutDate: params.clientWorkoutDate,
                    coachId: coachId,
                    // Pass full workout payload as JSON so modal can include items in save
                    workoutPayloadJson: JSON.stringify(workoutPayload),
                }),
            },
        });
    }, [router, workoutState, isClientWorkout, params.clientId, params.clientWorkoutDate, coachId, setMetadataUpdateCallback]);

    const handleSave = useCallback(() => {
        // Debug: Log params and isClientWorkout determination
        console.log('[WorkoutDetailScreen] handleSave called');
        console.log('[WorkoutDetailScreen] params:', {
            id: params.id,
            clientId: params.clientId,
            clientWorkoutDate: params.clientWorkoutDate,
            coachId: params.coachId,
        });
        console.log('[WorkoutDetailScreen] isClientWorkout:', isClientWorkout);
        console.log('[WorkoutDetailScreen] coachId (resolved):', coachId);

        if (!workoutState.meta.name) {
            setErrorMessage(t('library.workout.nameRequired'));
            setShowErrorDialog(true);
            return;
        }

        // Validate all exercises
        const validation = validateWorkoutItems(workoutState.items);
        if (!validation.isValid) {
            setValidationErrors(validation.errors);
            setEmptySectionIds(validation.emptySectionIds);
            setErrorMessage(validation.errorMessage || t('library.workout.validationError'));
            setShowErrorDialog(true);
            return;
        }

        // Clear any previous errors
        setValidationErrors([]);
        setEmptySectionIds([]);

        // Build the payload for API
        const payload = buildWorkoutPayload(workoutState);
        console.log('Saving workout payload:', JSON.stringify(payload, null, 2));

        // Call API to save workout
        if (isClientWorkout) {
            // Save to client's training instance (not library)
            console.log('[WorkoutDetailScreen] Saving client workout instance with:', {
                clientId: params.clientId,
                coachId,
                date: params.clientWorkoutDate,
                workoutId: params.id,
            });
            clientWorkoutMutation.mutate({ payload });
        } else if (workoutState.meta.id && workoutState.meta.id !== 'new') {
            // Update existing library workout
            console.log('[WorkoutDetailScreen] Saving to library workout (editMutation) with id:', workoutState.meta.id);
            editMutation.mutate({ id: workoutState.meta.id, data: payload });
        } else {
            // Create new library workout
            console.log('[WorkoutDetailScreen] Creating new library workout');
            createMutation.mutate(payload);
        }
    }, [workoutState, createMutation, editMutation, clientWorkoutMutation, isClientWorkout, params, coachId, t]);

    const handleReorder = () => {
        // Set up callback to receive reordered items
        setReorderCallback((reorderedItems) => {
            setWorkoutState(prev => ({
                ...prev,
                items: reorderedItems,
            }));
        });

        // Store items for the reorder screen to access
        setReorderItems(workoutState.items);

        router.push('/library/workout/reorder');
    };

    const handleAddExercise = () => {
        setExercisesSelectCallback((exercises: Exercise[]) => {
            const newExercises: BuilderExercise[] = exercises.map((exercise, idx) => {
                const defaultColumns = getDefaultColumns(exercise.exerciseType, exercise.category);

                const col1Value = defaultColumns.column1Value || '';
                const col2Value = defaultColumns.column2Value || '';

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
                    column2Type: defaultColumns.column2Type,
                    equipments: exercise.equipments,
                    bodyParts: exercise.bodyParts,
                };
            });
            setWorkoutState(prev => ({
                ...prev,
                items: [...prev.items, ...newExercises],
            }));
        });

        router.push({
            pathname: '/modals/workout/add-exercise-to-builder-modal',
            params: { multiple: 'true' }
        });
    };

    const handleSwapExercise = (index: number) => {
        setExerciseSelectCallback((newExercise: Exercise) => {
            setWorkoutState(prev => {
                const newItems = [...prev.items];
                const currentExercise = newItems[index] as BuilderExercise;

                newItems[index] = {
                    ...currentExercise,
                    exerciseId: newExercise.exerciseId,
                    name: newExercise.name,
                    imageUrl: newExercise.imageUrl,
                    exerciseType: newExercise.exerciseType,
                    ...getDefaultColumns(newExercise.exerciseType, newExercise.category),
                };

                return { ...prev, items: newItems };
            });
        });

        router.push({
            pathname: '/modals/workout/add-exercise-to-builder-modal',
            params: { multiple: 'false', title: 'Swap Exercise' }
        });
    };

    const handleAddSection = () => {
        router.push('/modals/workout/add-section-to-builder-modal');
    };

    const handleUpdateExercise = (index: number, updates: Partial<BuilderExercise>) => {
        setWorkoutState(prev => {
            const newItems = [...prev.items];
            const currentItem = newItems[index];

            if (isBuilderSection(currentItem)) {
                return prev; // Don't update sections here
            }

            const currentExercise = currentItem as BuilderExercise;
            const updatedExercise = { ...currentExercise, ...updates } as BuilderExercise;
            newItems[index] = updatedExercise;

            // Find start and end of superset chain for syncing
            let start = index;
            while (start > 0) {
                const prevItem = newItems[start - 1];
                if (isBuilderSection(prevItem)) break;
                if (!(prevItem as BuilderExercise).isSupersetNext) break;
                start--;
            }

            let end = index;
            while (end < newItems.length - 1) {
                const curr = newItems[end];
                if (isBuilderSection(curr)) break;
                if (!(curr as BuilderExercise).isSupersetNext) break;

                const next = newItems[end + 1];
                if (isBuilderSection(next)) break;

                end++;
            }

            // Only sync if we're actually in a superset (more than one exercise in chain)
            const isInSuperset = end > start;

            // If sets are updated, sync set count
            if (updates.sets && updates.sets.length !== currentExercise.sets.length && isInSuperset) {
                const targetSetCount = updates.sets.length;
                const sourceSets = updates.sets;

                // Apply set count to all in chain (except index which is already updated)
                for (let i = start; i <= end; i++) {
                    if (i === index) continue;

                    const ex = newItems[i] as BuilderExercise;
                    let newSets = [...ex.sets];

                    if (newSets.length > targetSetCount) {
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
                    newItems[i] = { ...ex, sets: newSets } as BuilderExercise;
                }
            }

            // If setRestSec changed, sync rest to all exercises in superset
            if (updates.setRestSec !== undefined && updates.setRestSec !== currentExercise.setRestSec && isInSuperset) {
                for (let i = start; i <= end; i++) {
                    if (i === index) continue;
                    const ex = newItems[i] as BuilderExercise;
                    newItems[i] = { ...ex, setRestSec: updates.setRestSec } as BuilderExercise;
                }
            }

            // If column1Type changed, sync to all exercises in superset (including resetting column1 values)
            if (updates.column1Type !== undefined && updates.column1Type !== currentExercise.column1Type && isInSuperset) {
                for (let i = start; i <= end; i++) {
                    if (i === index) continue;
                    const ex = newItems[i] as BuilderExercise;
                    // Reset column1 values in all sets when column type changes
                    const resetSets = ex.sets.map(s => ({ ...s, column1: '' }));
                    newItems[i] = { ...ex, column1Type: updates.column1Type, sets: resetSets } as BuilderExercise;
                }
            }

            // If column2Type changed, sync to all exercises in superset (including resetting column2 values)
            if (updates.column2Type !== undefined && updates.column2Type !== currentExercise.column2Type && isInSuperset) {
                for (let i = start; i <= end; i++) {
                    if (i === index) continue;
                    const ex = newItems[i] as BuilderExercise;
                    // Reset column2 values in all sets when column type changes
                    const resetSets = ex.sets.map(s => ({ ...s, column2: '' }));
                    newItems[i] = { ...ex, column2Type: updates.column2Type, sets: resetSets } as BuilderExercise;
                }
            }

            return { ...prev, items: newItems };
        });
    };

    const handleDeleteItem = (index: number) => {
        setWorkoutState(prev => ({
            ...prev,
            items: prev.items.filter((_, i) => i !== index),
        }));
    };

    const handleEditSection = (index: number) => {
        const section = workoutState.items[index] as BuilderSection;
        router.push({
            pathname: '/library/workout/section-builder',
            params: {
                name: section.name,
                sectionType: section.sectionType,
                duration: section.duration || '',
                rounds: section.rounds || '',
                notes: section.notes || '',
                editingId: section.id,
                exercises: JSON.stringify(section.exercises),
                // Tabata/HIIT fields
                workSec: section.workSec || '',
                restSec: section.restSec || '',
                // EMOM fields
                intervalSec: section.intervalSec || '',
                durationMin: section.durationMin || '',
            }
        });
    };

    const toggleSuperset = (index: number) => {
        setWorkoutState(prev => {
            const newItems = [...prev.items];
            const ex = newItems[index] as BuilderExercise;

            const isLinking = !ex.isSupersetNext;

            if (isLinking) {
                // Check next item and sync sets + assign supersetGroupId
                const nextIndex = index + 1;
                if (nextIndex < newItems.length) {
                    const nextItem = newItems[nextIndex];
                    if (!isBuilderSection(nextItem)) {
                        const nextEx = nextItem as BuilderExercise;
                        const targetSetCount = ex.sets.length;
                        const sourceSets = ex.sets;

                        // Generate a shared superset group ID
                        const supersetGroupId = ex.supersetGroupId || `superset-${Date.now()}`;

                        // Sync B to A if set counts differ - copy values from source
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

                        // Update current exercise with superset flag and group ID
                        newItems[index] = {
                            ...ex,
                            isSupersetNext: true,
                            supersetGroupId,
                        };

                        // Update next exercise with same group ID, synced sets, rest, and column types
                        newItems[nextIndex] = {
                            ...nextEx,
                            sets: newSets,
                            supersetGroupId,
                            setRestSec: ex.setRestSec, // Sync rest from top exercise
                            column1Type: ex.column1Type, // Sync column1 type from top exercise
                            column2Type: ex.column2Type, // Sync column2 type from top exercise
                        } as BuilderExercise;
                    }
                }
            } else {
                // Unlinking - clear supersetGroupId from this exercise
                // Also clear from next exercise if it was part of the chain
                newItems[index] = {
                    ...ex,
                    isSupersetNext: false,
                    supersetGroupId: null,
                };

                const nextIndex = index + 1;
                if (nextIndex < newItems.length) {
                    const nextItem = newItems[nextIndex];
                    if (!isBuilderSection(nextItem)) {
                        const nextEx = nextItem as BuilderExercise;
                        // Only clear if previous exercise was the only link to this superset
                        const prevIndex = index - 1;
                        const hasPrevLink = prevIndex >= 0 &&
                            !isBuilderSection(newItems[prevIndex]) &&
                            (newItems[prevIndex] as BuilderExercise).isSupersetNext;

                        if (!hasPrevLink) {
                            newItems[nextIndex] = {
                                ...nextEx,
                                supersetGroupId: null,
                            } as BuilderExercise;
                        }
                    }
                }
            }

            return { ...prev, items: newItems };
        });
    };

    const handleMoveUp = (index: number) => {
        if (index === 0) return;
        setWorkoutState(prev => {
            const newItems = [...prev.items];
            [newItems[index - 1], newItems[index]] = [newItems[index], newItems[index - 1]];
            return { ...prev, items: newItems };
        });
    };

    const handleMoveDown = (index: number) => {
        if (index === workoutState.items.length - 1) return;
        setWorkoutState(prev => {
            const newItems = [...prev.items];
            [newItems[index], newItems[index + 1]] = [newItems[index + 1], newItems[index]];
            return { ...prev, items: newItems };
        });
    };

    const handleSaveSection = (index: number) => {
        const section = workoutState.items[index] as BuilderSection;

        // Use buildSectionPayload to ensure correct format for all section types
        const sectionData = buildSectionPayload(section);

        // Create the payload matching the createSection service format
        const sectionPayload: any = {
            name: section.name,
            description: section.notes || '',
            sectionType: section.sectionType,
            section_data: {
                items: [
                    {
                        itemType: 'section' as const,
                        data: sectionData,
                    }
                ],
            },
        };

        console.log('[handleSaveSection] Saving section with payload:', JSON.stringify(sectionPayload, null, 2));
        saveSectionMutation.mutate(sectionPayload);
    };

    const handleOpenAddDialog = useCallback(() => {
        setShowAddDialog(true);
    }, []);

    const handleAddExerciseFromDialog = useCallback(() => {
        setShowAddDialog(false);
        handleAddExercise();
    }, [handleAddExercise]);

    const handleAddSectionFromDialog = useCallback(() => {
        setShowAddDialog(false);
        handleAddSection();
    }, [handleAddSection]);

    const canSave = isDirty;
    const items = workoutState.items;

    const totalExercises = workoutState.items.reduce((acc, item) => {
        if (isBuilderSection(item)) {
            return acc + (item.exercises?.length || 0);
        }
        return acc + 1;
    }, 0);

    const BottomBar = (
        <View style={styles.bottomBarWrapper}>
            <View style={[styles.bottomBarDivider, { backgroundColor: themeColors.border }]} />
            <View
                style={[
                    styles.bottomBarContainer,
                    { backgroundColor: themeColors.surfacePrimary },
                ]}
            >
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
                        onPress={handleOpenAddDialog}
                    >
                        <Plus {...({ size: 18, color: themeColors.primaryForeground, style: styles.buttonIcon } as any)} />
                        <Text style={[styles.actionButtonText, { color: themeColors.primaryForeground }]}>{t('library.workout.add')}</Text>
                    </PressableScale>
                </View>
            </View>
            <View
                style={[
                    styles.bottomBarSafeAreaFill,
                    {
                        height: insets.bottom,
                        backgroundColor: themeColors.surfacePrimary,
                    },
                ]}
            />
        </View>
    );

    const headerHeight = Platform.OS === 'android' ? 56 + insets.top : 56;
    const gradientHeight = headerHeight + 12;

    return (
        <View style={[styles.container, { backgroundColor: themeColors.backgroundPrimary }]}>
            {/* Fixed Header Gradient */}
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
                {/* Header - Left-aligned title layout that scrolls with content */}
                <View style={styles.header}>
                    <View style={styles.headerLeft}>
                        <IconButton
                            icon={{ sf: 'arrow.left', IconComponent: ChevronLeft }}
                            onPress={handleBackPress}
                            size="md"
                            color={themeColors.text}
                        />
                        <Text
                            style={[styles.title, { color: themeColors.text }]}
                            numberOfLines={1}
                            ellipsizeMode="tail"
                        >
                            {workoutState.meta.name || t('library.workout.newWorkout')}
                        </Text>
                    </View>
                    <View style={styles.headerRight}>
                        <IconButton
                            icon={{ sf: 'pencil', IconComponent: Pencil }}
                            onPress={handleEditMetadata}
                            size="md"
                            color={themeColors.text}
                        />
                        <IconButton
                            icon={{ sf: 'checkmark', IconComponent: Check }}
                            onPress={handleSave}
                            size="md"
                            variant={canSave ? 'primary' : 'default'}
                            disabled={!canSave}
                            loading={createMutation.isPending || editMutation.isPending || clientWorkoutMutation.isPending}
                        />
                    </View>
                </View>

                {/* Page Content */}
                {isLoadingData ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={themeColors.primary} />
                        <Text style={[styles.loadingText, { color: themeColors.mutedText }]}>
                            {t('library.workout.loading')}
                        </Text>
                    </View>
                ) : items.length === 0 ? (
                    <Text style={[styles.emptyText, { color: themeColors.mutedText }]}>
                        {t('library.workout.emptyBuilder')}
                    </Text>
                ) : null}

                {!isLoadingData && items.map((item, index) => {
                    const isLast = index === items.length - 1;

                    if (isBuilderSection(item)) {
                        return (
                            <React.Fragment key={item.id}>
                                <SectionBuilderCard
                                    section={{
                                        id: item.id,
                                        type: 'section',
                                        name: item.name,
                                        sectionType: item.sectionType,
                                        duration: item.duration,
                                        rounds: item.rounds,
                                        notes: item.notes,
                                        exercises: item.exercises.map(ex => ({
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
                                        })),
                                    }}
                                    onDelete={() => handleDeleteItem(index)}
                                    onEdit={() => handleEditSection(index)}
                                    onSaveSection={() => handleSaveSection(index)}
                                    canMoveUp={index > 0}
                                    canMoveDown={index < items.length - 1}
                                    onMoveUp={() => handleMoveUp(index)}
                                    onMoveDown={() => handleMoveDown(index)}
                                    hasError={emptySectionIds.includes(item.id)}
                                />
                                {!isLast && <View style={{ height: 16 }} />}
                            </React.Fragment>
                        );
                    }

                    const ex = item as BuilderExercise;
                    const nextItem = index < items.length - 1 ? items[index + 1] : null;
                    const isLinkedToPrev = index > 0 && !isBuilderSection(items[index - 1]) && (items[index - 1] as BuilderExercise).isSupersetNext;
                    const isLinkedToNext = ex.isSupersetNext;

                    // Can only superset if next item exists and is an exercise
                    const canSupersetNext = nextItem && !isBuilderSection(nextItem);

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
                                onDelete={() => handleDeleteItem(index)}
                                isLinkedToPrev={isLinkedToPrev}
                                isLinkedToNext={isLinkedToNext}
                                canMoveUp={index > 0}
                                canMoveDown={index < items.length - 1}
                                onMoveUp={() => handleMoveUp(index)}
                                onMoveDown={() => handleMoveDown(index)}
                                validationErrors={validationErrors}
                                onSwap={() => handleSwapExercise(index)}
                            />

                            {!isLast && (
                                canSupersetNext ? (
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
                                                <LinkIcon {...({ size: 14, color: isLinkedToNext ? themeColors.primary : themeColors.text } as any)} />
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
                                ) : (
                                    <View style={{ height: 16 }} />
                                )
                            )}
                        </React.Fragment>
                    );
                })}
            </KeyboardAwareScrollView>
            {BottomBar}

            <Dialog
                visible={showErrorDialog}
                onClose={() => setShowErrorDialog(false)}
                title={t('general.error')}
                message={errorMessage}
                showCloseIcon={false}
                buttons={[{ label: t('general.ok'), onPress: () => setShowErrorDialog(false), variant: 'primary' }]}
            />

            <Dialog
                visible={showSuccessDialog}
                onClose={() => setShowSuccessDialog(false)}
                title={t('general.success')}
                message={successMessage}
                showCloseIcon={false}
                buttons={[{ label: t('general.ok'), onPress: () => setShowSuccessDialog(false), variant: 'primary' }]}
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

            <Dialog
                visible={showAddDialog}
                onClose={() => setShowAddDialog(false)}
                title={t('library.workout.add')}
                buttonLayout="vertical"
                buttons={[
                    { label: t('library.workout.addExercise'), onPress: handleAddExerciseFromDialog, variant: 'primary' },
                    { label: t('library.workout.addSection'), onPress: handleAddSectionFromDialog, variant: 'secondary' }
                ]}
            />
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
    headerActionContainer: {
        width: 36,
        height: 36,
        alignItems: 'center',
        justifyContent: 'center',
    },
    title: {
        ...typography.h6,
        flex: 1,
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
    bottomBarWrapper: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
    },
    bottomBarDivider: {
        height: 1,
    },
    bottomBarContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        marginTop: -24,
        gap: 12,
    },
    bottomBarSafeAreaFill: {
        width: '100%',
    },
    countCircle: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    countText: {
        ...typography.h6,
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
