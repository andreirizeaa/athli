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

    // Helper to extract value from trackable fields based on label (for new API format)
    const getTrackableFieldValue = (set: any, labels: string[]): string => {
        if (set.trackableField1 && labels.some(l => set.trackableField1.label?.toLowerCase().includes(l.toLowerCase()))) {
            return set.trackableField1.prescribed?.toString() || '';
        }
        if (set.trackableField2 && labels.some(l => set.trackableField2.label?.toLowerCase().includes(l.toLowerCase()))) {
            return set.trackableField2.prescribed?.toString() || '';
        }
        return '';
    };

    // Helper to convert a set payload to SetData, handling both legacy and new trackable field formats
    const convertSetToSetData = (set: any, exerciseType: string): SetData => {
        const isDropset = ('dropset' in set && set.dropset) || ('type' in set && set.type === 'dropset');

        // Reconstruct reps string (handle dropsets and new trackable field format)
        let reps = '';
        if (exerciseType !== 'distance_duration') {
            if ('reps' in set && set.reps !== undefined) {
                reps = getMetricValue(set.reps);
            } else {
                reps = getTrackableFieldValue(set, ['rep', 'reps']);
            }
        }
        if (isDropset && 'dropset' in set && set.dropset?.stages) {
            reps = getDropsetString(set.dropset.stages, 'reps');
        }

        // Reconstruct weight string (handle dropsets and new trackable field format)
        let weight = '';
        if (exerciseType === 'weight_reps') {
            if ('weight' in set && set.weight !== undefined) {
                weight = getMetricValue(set.weight);
            } else {
                weight = getTrackableFieldValue(set, ['weight', 'kg', 'lbs', 'lb']);
            }
        }
        if (isDropset && 'dropset' in set && set.dropset?.stages && exerciseType === 'weight_reps') {
            const weightStr = getDropsetString(set.dropset.stages, 'weight');
            if (weightStr.includes('-')) weight = weightStr;
        }

        // Reconstruct Left/Right Reps
        let leftReps = 'leftReps' in set ? getMetricValue(set.leftReps) : '';
        if (isDropset && 'leftDropset' in set && set.leftDropset?.stages) {
            leftReps = getDropsetString(set.leftDropset.stages, 'reps');
        }

        let rightReps = 'rightReps' in set ? getMetricValue(set.rightReps) : '';
        if (isDropset && 'rightDropset' in set && set.rightDropset?.stages) {
            rightReps = getDropsetString(set.rightDropset.stages, 'reps');
        }

        let leftWeight = '';
        if (isDropset && 'leftDropset' in set && set.leftDropset?.stages) {
            const w = getDropsetString(set.leftDropset.stages, 'weight');
            if (w.includes('-')) leftWeight = w;
        }

        let rightWeight = '';
        if (isDropset && 'rightDropset' in set && set.rightDropset?.stages) {
            const w = getDropsetString(set.rightDropset.stages, 'weight');
            if (w.includes('-')) rightWeight = w;
        }

        // Handle distance/duration from trackable fields
        let distance = '';
        let duration = '';
        if (exerciseType === 'distance_duration') {
            if ('distance' in set) {
                distance = getMetricValue(set.distance);
            } else {
                distance = getTrackableFieldValue(set, ['distance', 'km', 'mi', 'meter', 'm']);
            }
            if ('durationSec' in set) {
                duration = getMetricValue(set.durationSec);
            } else {
                duration = getTrackableFieldValue(set, ['duration', 'time', 'sec', 'min']);
            }
        }

        return {
            setNumber: set.setNumber,
            type: isDropset ? 'dropset' : (set.type || 'normal'),
            reps,
            weight,
            rest: set.restSec?.toString() || '',
            distance,
            duration,
            leftReps,
            rightReps,
            leftWeight,
            rightWeight,
            optional: {
                prescribed: set.optional?.prescribed || '',
                completed: set.optional?.completed || ''
            },
        };
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
                    || createFallbackExercise(cleanedId, (exercisePayload as any).exerciseType);

                // Get exercise type for set conversion
                const exerciseType = (exercisePayload as any).exerciseType || exerciseDetails.exerciseType || 'weight_reps';

                // Convert sets from payload format to builder format using the helper function
                const sets: SetData[] = exercisePayload.sets.map((set) => convertSetToSetData(set, exerciseType));

                const exercise: ExerciseWithSuperset = {
                    ...exerciseDetails,
                    instanceId: `${cleanedId}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
                    supersetGroupId: exerciseGroup.isSuperset ? `superset_${Date.now()}_${Math.random().toString(36).slice(2, 8)}` : null,
                    sets,
                    notes: exercisePayload.notes || '',
                    eachSide: !!exercisePayload.eachSide,
                    optionalColumnType: (exercisePayload as any).optionalColumnType || 'Optional',
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
                            || createFallbackExercise(cleanedId, (exercisePayload as any).exerciseType);

                        // Get exercise type for set conversion
                        const exerciseType = (exercisePayload as any).exerciseType || exerciseDetails.exerciseType || 'weight_reps';

                        // Convert sets using the helper function
                        const sets: SetData[] = exercisePayload.sets.map((set) => convertSetToSetData(set, exerciseType));

                        section.exercises!.push({
                            ...exerciseDetails,
                            instanceId: `${cleanedId}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
                            supersetGroupId,
                            sets,
                            notes: exercisePayload.notes || '',
                            eachSide: !!exercisePayload.eachSide,
                            optionalColumnType: (exercisePayload as any).optionalColumnType || 'Optional',
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
                            || createFallbackExercise(cleanedId, (exercisePayload as any).exerciseType);

                        // Get exercise type for set conversion
                        const exerciseType = (exercisePayload as any).exerciseType || exerciseDetails.exerciseType || 'weight_reps';

                        // For circuits, convert the single set to an array using the helper function
                        const setPayload = exercisePayload.set;
                        const sets: SetData[] = [convertSetToSetData(setPayload, exerciseType)];

                        section.exercises!.push({
                            ...exerciseDetails,
                            instanceId: `${cleanedId}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
                            supersetGroupId,
                            sets,
                            notes: exercisePayload.notes || '',
                            eachSide: !!exercisePayload.eachSide,
                            optionalColumnType: (exercisePayload as any).optionalColumnType || 'Optional',
                        });
                    });
                });
            } else if ((sectionPayload.type === 'amrap' || sectionPayload.type === 'timed') && sectionPayload.exercises) {
                // For AMRAP and Timed sections, exercises don't have sets in the builder
                sectionPayload.exercises.forEach((exercisePayload) => {
                    // Find exercise details from the exercise database, or use fallback
                    const cleanedId = cleanExerciseId(exercisePayload);
                    const exerciseDetails = searchExercises('').find((e) => e.exerciseId === cleanedId)
                        || createFallbackExercise(cleanedId, (exercisePayload as any).exerciseType);

                    section.exercises!.push({
                        ...exerciseDetails,
                        instanceId: `${cleanedId}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
                        supersetGroupId: null,
                        sets: [],
                        notes: exercisePayload.notes || '',
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
