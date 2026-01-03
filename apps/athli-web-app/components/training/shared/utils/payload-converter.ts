import type { WorkoutProgramPayload, WorkoutItem, ExerciseGroupPayload, RegularExercisePayload } from '@/components/training/workout-schema';
import type { WorkoutSchema, WorkoutSchemaItem, ExerciseWithSuperset, WorkoutSection } from '@/components/training/shared/types/workout-builder.types';
import type { SetData } from '@/components/training/builder/exercise-card';
import { searchExercises } from '@/api/exercise/exercise-search';

/**
 * Creates a fallback exercise object when exercise is not found in the database
 * This ensures exercises are never silently dropped during conversion
 */
const createFallbackExercise = (exerciseId: string, exerciseType?: string) => ({
    exerciseId,
    name: exerciseId, // Use ID as name placeholder
    imageUrl: '',
    videoUrl: '',
    equipments: [],
    bodyParts: [],
    exerciseType: exerciseType || 'weight_reps',
    targetMuscles: [],
    secondaryMuscles: [],
    keywords: [],
    overview: '',
    instructions: [],
    exerciseTips: [],
    variations: [],
    relatedExerciseIds: [],
});

const cleanExerciseId = (payload: any): string => {
    // Use prescribedExerciseId (new schema) with fallback to id (legacy) and exerciseId
    const id = payload?.prescribedExerciseId || payload?.id || payload?.exerciseId || '';
    return id;
};

/**
 * Converts a payload format workout to builder format
 * Used when loading a workout from the backend
 */
export const convertPayloadToBuilderFormat = (payload: WorkoutProgramPayload): WorkoutSchema => {
    const items: WorkoutSchemaItem[] = [];

    if (!payload || !payload.items) {
        return { items: [] };
    }

    // Helper to extract prescribed value from MetricNumber pattern or handle legacy plain numbers
    const getMetricValue = (metric: any): string => {
        if (metric === null || metric === undefined) return '';
        if (typeof metric === 'object' && 'prescribed' in metric) {
            return metric.prescribed?.toString() || '';
        }
        return metric.toString();
    };

    // Helper to reconstruct dropset string from stages
    const getDropsetString = (stages: any[], field: 'reps' | 'weight'): string => {
        if (!stages || stages.length === 0) return '';
        return stages
            .map(s => {
                const val = field === 'reps' ? s.reps : s.weight;
                return getMetricValue(val);
            })
            .join('-');
    };

    payload.items.forEach((item: WorkoutItem) => {
        if (item.itemType === 'exercise') {
            // Convert top-level exercise group to builder format
            let exerciseGroup: ExerciseGroupPayload;

            // Check if it's already a group (has exercises array) or a single exercise
            if ('exercises' in (item.data as any)) {
                exerciseGroup = item.data as unknown as ExerciseGroupPayload;
            } else {
                // Wrap single exercise in a group
                exerciseGroup = {
                    isSuperset: false,
                    exercises: [item.data as unknown as RegularExercisePayload]
                };
            }

            if (!exerciseGroup || !exerciseGroup.exercises) return;

            exerciseGroup.exercises.forEach((exercisePayload) => {
                // Find exercise details from the exercise database, or use fallback
                const cleanedId = cleanExerciseId(exercisePayload);
                const exerciseDetails = searchExercises('').find((e) => e.exerciseId === cleanedId)
                    || createFallbackExercise(cleanedId, exercisePayload.exerciseType);

                // Convert sets from payload format to builder format (uses getMetricValue for MetricNumber pattern)
                const sets: SetData[] = exercisePayload.sets.map((set) => {
                    const isDropset = ('dropset' in set && set.dropset) || ('type' in set && set.type === 'dropset');

                    // Reconstruct reps string (handle dropsets)
                    let reps = set.exerciseType === 'distance_duration' ? '' : getMetricValue(set.reps);
                    if (isDropset && 'dropset' in set && set.dropset?.stages) {
                        reps = getDropsetString(set.dropset.stages, 'reps');
                    }

                    // Reconstruct weight string (handle dropsets)
                    let weight = set.exerciseType === 'weight_reps' ? getMetricValue(set.weight) : '';
                    if (isDropset && 'dropset' in set && set.dropset?.stages && set.exerciseType === 'weight_reps') {
                        // Check if weight varies across stages
                        const weightStr = getDropsetString(set.dropset.stages, 'weight');
                        // Use dropset string if it looks like there are multiple stages, otherwise fallback to main weight
                        if (weightStr.includes('-')) weight = weightStr;
                    }

                    // Reconstruct Left/Right Reps
                    let leftReps = 'leftReps' in set ? getMetricValue((set as any).leftReps) : '';
                    if (isDropset && 'leftDropset' in set && (set as any).leftDropset?.stages) {
                        leftReps = getDropsetString((set as any).leftDropset.stages, 'reps');
                    }

                    let rightReps = 'rightReps' in set ? getMetricValue((set as any).rightReps) : '';
                    if (isDropset && 'rightDropset' in set && (set as any).rightDropset?.stages) {
                        rightReps = getDropsetString((set as any).rightDropset.stages, 'reps');
                    }

                    return {
                        setNumber: set.setNumber,
                        type: isDropset ? 'dropset' : (set.type || 'normal'),
                        reps,
                        weight,
                        rest: set.restSec?.toString() || '',
                        distance: set.exerciseType === 'distance_duration' && 'distance' in set ? getMetricValue((set as any).distance) : '',
                        duration: set.exerciseType === 'distance_duration' && 'durationSec' in set ? getMetricValue((set as any).durationSec) : '',
                        leftReps,
                        rightReps
                    };
                });

                const exercise: ExerciseWithSuperset = {
                    ...exerciseDetails,
                    instanceId: `${cleanedId}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
                    supersetGroupId: exerciseGroup.isSuperset ? `superset_${Date.now()}_${Math.random().toString(36).slice(2, 8)}` : null,
                    sets,
                    notes: exercisePayload.notes || '',
                    tempo: exercisePayload.tempo || '',
                    rpe: exercisePayload.rpe || '',
                    heartRateZone: exercisePayload.heartRateZone || '',
                    eachSide: !!exercisePayload.eachSide,
                };

                items.push({
                    itemType: 'exercise',
                    exercise,
                });
            });
        } else if (item.itemType === 'section') {
            // Convert section to builder format
            const sectionPayload = item.data;

            const section: WorkoutSection = {
                id: sectionPayload.id,
                name: sectionPayload.name || '',
                type: sectionPayload.type,
                exercises: [],
                notes: sectionPayload.notes || '',
                ...(sectionPayload.type === 'amrap' && { roundDurationSec: sectionPayload.durationSec }),
                ...(sectionPayload.type === 'timed' && { targetRounds: sectionPayload.targetRounds }),
                ...(sectionPayload.type === 'circuits' && { targetRounds: sectionPayload.targetRounds }),
                ...(sectionPayload.type === 'auxiliary' && { category: sectionPayload.category }),
            };

            // Convert exercises within the section
            if ((sectionPayload.type === 'regular' || sectionPayload.type === 'auxiliary') && sectionPayload.exercises) {
                sectionPayload.exercises.forEach((group) => {
                    const supersetGroupId = group.isSuperset ? `superset_${sectionPayload.id}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}` : null;

                    group.exercises.forEach((exercisePayload) => {
                        // Find exercise details from the exercise database, or use fallback
                        const cleanedId = cleanExerciseId(exercisePayload);
                        const exerciseDetails = searchExercises('').find((e) => e.exerciseId === cleanedId)
                            || createFallbackExercise(cleanedId, exercisePayload.exerciseType);

                        const sets: SetData[] = exercisePayload.sets.map((set) => {
                            const isDropset = ('dropset' in set && set.dropset) || ('type' in set && set.type === 'dropset');

                            // Reconstruct reps string (handle dropsets)
                            let reps = set.exerciseType === 'distance_duration' ? '' : getMetricValue(set.reps);
                            if (isDropset && 'dropset' in set && set.dropset?.stages) {
                                reps = getDropsetString(set.dropset.stages, 'reps');
                            }

                            // Reconstruct weight string (handle dropsets)
                            let weight = set.exerciseType === 'weight_reps' ? getMetricValue(set.weight) : '';
                            if (isDropset && 'dropset' in set && set.dropset?.stages && set.exerciseType === 'weight_reps') {
                                const weightStr = getDropsetString(set.dropset.stages, 'weight');
                                if (weightStr.includes('-')) weight = weightStr;
                            }

                            // Reconstruct Left/Right Reps
                            let leftReps = 'leftReps' in set ? getMetricValue((set as any).leftReps) : '';
                            if (isDropset && 'leftDropset' in set && (set as any).leftDropset?.stages) {
                                leftReps = getDropsetString((set as any).leftDropset.stages, 'reps');
                            }

                            let rightReps = 'rightReps' in set ? getMetricValue((set as any).rightReps) : '';
                            if (isDropset && 'rightDropset' in set && (set as any).rightDropset?.stages) {
                                rightReps = getDropsetString((set as any).rightDropset.stages, 'reps');
                            }

                            return {
                                setNumber: set.setNumber,
                                type: isDropset ? 'dropset' : (set.type || 'normal'),
                                reps,
                                weight,
                                rest: set.restSec?.toString() || '',
                                distance: set.exerciseType === 'distance_duration' && 'distance' in set ? getMetricValue((set as any).distance) : '',
                                duration: set.exerciseType === 'distance_duration' && 'durationSec' in set ? getMetricValue((set as any).durationSec) : '',
                                leftReps,
                                rightReps
                            };
                        });

                        section.exercises!.push({
                            ...exerciseDetails,
                            instanceId: `${cleanedId}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
                            supersetGroupId,
                            sets,
                            notes: exercisePayload.notes || '',
                            tempo: exercisePayload.tempo || '',
                            rpe: exercisePayload.rpe || '',
                            heartRateZone: exercisePayload.heartRateZone || '',
                            eachSide: !!exercisePayload.eachSide,
                        });
                    });
                });
            } else if (sectionPayload.type === 'circuits' && sectionPayload.exercises) {
                sectionPayload.exercises.forEach((group) => {
                    const supersetGroupId = group.isSuperset ? `superset_${sectionPayload.id}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}` : null;

                    group.exercises.forEach((exercisePayload) => {
                        // Find exercise details from the exercise database, or use fallback
                        const cleanedId = cleanExerciseId(exercisePayload);
                        const exerciseDetails = searchExercises('').find((e) => e.exerciseId === cleanedId)
                            || createFallbackExercise(cleanedId, exercisePayload.exerciseType);

                        // For circuits, convert the single set to an array
                        // For circuits, convert the single set to an array
                        const setPayload = exercisePayload.set;
                        const isDropset = ('dropset' in setPayload && setPayload.dropset) || ('type' in setPayload && setPayload.type === 'dropset');

                        let reps = setPayload.exerciseType === 'distance_duration' ? '' : getMetricValue(setPayload.reps);
                        if (isDropset && 'dropset' in setPayload && setPayload.dropset?.stages) {
                            reps = getDropsetString(setPayload.dropset.stages, 'reps');
                        }

                        let weight = setPayload.exerciseType === 'weight_reps' ? getMetricValue(setPayload.weight) : '';
                        if (isDropset && 'dropset' in setPayload && setPayload.dropset?.stages && setPayload.exerciseType === 'weight_reps') {
                            const weightStr = getDropsetString(setPayload.dropset.stages, 'weight');
                            if (weightStr.includes('-')) weight = weightStr;
                        }

                        let leftReps = 'leftReps' in setPayload ? getMetricValue((setPayload as any).leftReps) : '';
                        if (isDropset && 'leftDropset' in setPayload && (setPayload as any).leftDropset?.stages) {
                            leftReps = getDropsetString((setPayload as any).leftDropset.stages, 'reps');
                        }

                        let rightReps = 'rightReps' in setPayload ? getMetricValue((setPayload as any).rightReps) : '';
                        if (isDropset && 'rightDropset' in setPayload && (setPayload as any).rightDropset?.stages) {
                            rightReps = getDropsetString((setPayload as any).rightDropset.stages, 'reps');
                        }

                        const sets: SetData[] = [{
                            setNumber: setPayload.setNumber,
                            type: isDropset ? 'dropset' : (setPayload.type || 'normal'),
                            reps,
                            weight,
                            rest: setPayload.restSec?.toString() || '',
                            distance: setPayload.exerciseType === 'distance_duration' && 'distance' in setPayload ? getMetricValue((setPayload as any).distance) : '',
                            duration: setPayload.exerciseType === 'distance_duration' && 'durationSec' in setPayload ? getMetricValue((setPayload as any).durationSec) : '',
                            leftReps,
                            rightReps
                        }];

                        section.exercises!.push({
                            ...exerciseDetails,
                            instanceId: `${cleanedId}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
                            supersetGroupId,
                            sets,
                            notes: exercisePayload.notes || '',
                            tempo: exercisePayload.tempo || '',
                            rpe: exercisePayload.rpe || '',
                            heartRateZone: exercisePayload.heartRateZone || '',
                            eachSide: !!exercisePayload.eachSide,
                        });
                    });
                });
            } else if ((sectionPayload.type === 'amrap' || sectionPayload.type === 'timed') && sectionPayload.exercises) {
                // For AMRAP and Timed sections, exercises don't have sets in the builder
                sectionPayload.exercises.forEach((exercisePayload) => {
                    // Find exercise details from the exercise database, or use fallback
                    const cleanedId = cleanExerciseId(exercisePayload);
                    const exerciseDetails = searchExercises('').find((e) => e.exerciseId === cleanedId)
                        || createFallbackExercise(cleanedId, exercisePayload.exerciseType);

                    section.exercises!.push({
                        ...exerciseDetails,
                        instanceId: `${cleanedId}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
                        supersetGroupId: null,
                        sets: [],
                        notes: exercisePayload.notes || '',
                        tempo: exercisePayload.tempo || '',
                        rpe: exercisePayload.rpe || '',
                        heartRateZone: exercisePayload.heartRateZone || '',
                        eachSide: !!exercisePayload.eachSide,
                    });
                });
            }

            items.push({
                itemType: 'section',
                section,
            });
        }
    });

    return { items };
};
