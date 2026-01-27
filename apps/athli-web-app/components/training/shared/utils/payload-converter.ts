import type { WorkoutProgramPayload, WorkoutItem, ExerciseGroupPayload, RegularExercisePayload } from '@/components/training/workout-schema';
import type { WorkoutSchema, WorkoutSchemaItem, ExerciseWithSuperset, WorkoutSection } from '@/components/training/shared/types/workout-builder.types';
import type { SetData } from '@/components/training/builder/exercise-card';
import type { Exercise } from '@/hooks/use-all-exercises';

// Type for the exercise lookup function (passed from hook)
export type ExerciseLookupFn = (id: string) => Exercise | undefined;

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
    source: 'musclewiki' as const,
});

const cleanExerciseId = (payload: any): string => {
    // Use prescribedExerciseId (new schema) with fallback to id (legacy) and exerciseId
    const id = payload?.prescribedExerciseId || payload?.id || payload?.exerciseId || '';
    return id;
};

/**
 * Converts a payload format workout to builder format
 * Used when loading a workout from the backend
 * 
 * @param payload - The workout payload from the backend
 * @param findExerciseById - Function to lookup exercise by ID from cached exercises
 */
export const convertPayloadToBuilderFormat = (
    payload: WorkoutProgramPayload,
    findExerciseById: ExerciseLookupFn
): WorkoutSchema => {
    console.log('[PAYLOAD CONVERTER] Input payload:', JSON.stringify(payload, null, 2));
    const items: WorkoutSchemaItem[] = [];

    if (!payload || !payload.items) {
        console.log('[PAYLOAD CONVERTER] No payload or items, returning empty');
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

    // Helper to map column label to SetData field name (matches exercise-card logic)
    const getFieldNameForLabel = (columnLabel: string): 'reps' | 'weight' | 'distance' | 'duration' | 'optional' | null => {
        if (!columnLabel) return null;
        const label = columnLabel.toLowerCase();
        if (label === 'reps' || label === 'rep') return 'reps';
        if (label === 'kg' || label === 'lbs' || label === 'lb') return 'weight';
        if (label === 'km' || label === 'm' || label === 'yards' || label === 'miles' || label === 'feet') return 'distance';
        if (label === 'minutes' || label === 'seconds') return 'duration';
        if (label === 'none') return null;
        // For optional columns (Heart Rate Zone, Tempo, RIR, RPE, etc.)
        return 'optional';
    };

    // Helper to convert a set payload to SetData, handling both legacy and new trackable field formats
    const convertSetToSetData = (set: any, exerciseType: string, column1Label?: string, column2Label?: string): SetData => {
        const isDropset = ('dropset' in set && set.dropset) || ('type' in set && set.type === 'dropset');

        // Initialize all values
        let reps = '';
        let weight = '';
        let distance = '';
        let duration = '';
        let optionalValue = '';

        // Get raw values from trackable fields
        const column1Value = set.trackableField1?.prescribed?.toString() || '';
        const column2Value = set.trackableField2?.prescribed?.toString() || '';

        // Determine field mapping based on column labels
        const field1 = column1Label ? getFieldNameForLabel(column1Label) : null;
        const field2 = column2Label ? getFieldNameForLabel(column2Label) : null;

        // If we have column labels, use them to map values to the correct fields
        if (column1Label && column1Value) {
            if (field1 === 'reps') reps = column1Value;
            else if (field1 === 'weight') weight = column1Value;
            else if (field1 === 'distance') distance = column1Value;
            else if (field1 === 'duration') duration = column1Value;
            else if (field1 === 'optional') optionalValue = column1Value;
            else {
                // Unknown label - default to reps for column 1
                reps = column1Value;
            }
        }

        if (column2Label && column2Value) {
            if (field2 === 'reps') reps = column2Value;
            else if (field2 === 'weight') weight = column2Value;
            else if (field2 === 'distance') distance = column2Value;
            else if (field2 === 'duration') duration = column2Value;
            else if (field2 === 'optional') optionalValue = column2Value;
            else {
                // Unknown label - default to weight for column 2
                weight = column2Value;
            }
        }

        // Fallback to legacy/exercise type-based logic if no column labels provided
        if (!column1Label && !column2Label) {
            // Reconstruct reps string (handle dropsets and new trackable field format)
            if (exerciseType !== 'distance_duration') {
                if ('reps' in set && set.reps !== undefined) {
                    reps = getMetricValue(set.reps);
                } else if (set.trackableField1?.prescribed !== undefined) {
                    reps = set.trackableField1.prescribed?.toString() || '';
                } else {
                    reps = getTrackableFieldValue(set, ['rep', 'reps']);
                }
            }

            // Reconstruct weight string (handle dropsets and new trackable field format)
            if (exerciseType === 'weight_reps') {
                if ('weight' in set && set.weight !== undefined) {
                    weight = getMetricValue(set.weight);
                } else if (set.trackableField2?.prescribed !== undefined) {
                    weight = set.trackableField2.prescribed?.toString() || '';
                } else {
                    weight = getTrackableFieldValue(set, ['weight', 'kg', 'lbs', 'lb']);
                }
            }

            // Handle distance/duration from trackable fields
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
        }

        // Handle dropset overrides
        if (isDropset && 'dropset' in set && set.dropset?.stages) {
            reps = getDropsetString(set.dropset.stages, 'reps');
            if (exerciseType === 'weight_reps') {
                const weightStr = getDropsetString(set.dropset.stages, 'weight');
                if (weightStr.includes('-')) weight = weightStr;
            }
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
                prescribed: optionalValue || set.optional?.prescribed || '',
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
                const exerciseDetails = findExerciseById(cleanedId)
                    || createFallbackExercise(cleanedId, (exercisePayload as any).exerciseType);

                // Get exercise type for set conversion
                const exerciseType = (exercisePayload as any).exerciseType || exerciseDetails.exerciseType || 'weight_reps';

                // Get column labels for proper trackable field mapping
                const column1Label = (exercisePayload as any).column1Label;
                const column2Label = (exercisePayload as any).column2Label;

                // Convert sets from payload format to builder format using the helper function
                const sets: SetData[] = exercisePayload.sets.map((set) => convertSetToSetData(set, exerciseType, column1Label, column2Label));

                const exercise: ExerciseWithSuperset = {
                    ...exerciseDetails,
                    instanceId: (exercisePayload as any).id || `${cleanedId}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
                    supersetGroupId: (exercisePayload as any).supersetId || null,
                    sets,
                    notes: exercisePayload.notes || '',
                    eachSide: !!exercisePayload.eachSide,
                    tempo: (exercisePayload as any).tempo || undefined,
                    alternatives: ((exercisePayload as any).alternatives || []).filter((a: any) => a != null),
                    column1Label: column1Label || undefined,
                    column2Label: column2Label || undefined,
                };

                items.push({
                    itemType: 'exercise',
                    exercise,
                });
            });
        } else if (item.itemType === 'section') {
            // Convert section to builder format
            const sectionPayload = item.data;
            console.log('[PAYLOAD CONVERTER] Processing section:', sectionPayload.name, 'Type:', sectionPayload.type);
            console.log('[PAYLOAD CONVERTER] Section exercises:', sectionPayload.exercises);

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
                console.log('[PAYLOAD CONVERTER] Converting regular/auxiliary section with', sectionPayload.exercises.length, 'exercise groups');
                sectionPayload.exercises.forEach((group) => {
                    group.exercises.forEach((exercisePayload) => {
                        // Find exercise details from the exercise database, or use fallback
                        const cleanedId = cleanExerciseId(exercisePayload);
                        console.log('[PAYLOAD CONVERTER] Processing exercise with ID:', cleanedId);
                        const exerciseDetails = findExerciseById(cleanedId)
                            || createFallbackExercise(cleanedId, (exercisePayload as any).exerciseType);

                        // Get exercise type for set conversion
                        const exerciseType = (exercisePayload as any).exerciseType || exerciseDetails.exerciseType || 'weight_reps';

                        // Get column labels for proper trackable field mapping
                        const column1Label = (exercisePayload as any).column1Label;
                        const column2Label = (exercisePayload as any).column2Label;

                        // Convert sets using the helper function
                        const sets: SetData[] = exercisePayload.sets.map((set) => convertSetToSetData(set, exerciseType, column1Label, column2Label));
                        console.log('[PAYLOAD CONVERTER] Converted', sets.length, 'sets for exercise');

                        // Extract alternatives from payload (filter out null values)
                        const alternatives = ((exercisePayload as any).alternatives || []).filter((a: any) => a != null);
                        console.log('[PAYLOAD CONVERTER] Alternatives for exercise:', cleanedId, alternatives);

                        const convertedExercise = {
                            ...exerciseDetails,
                            instanceId: (exercisePayload as any).id || `${cleanedId}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
                            supersetGroupId: (exercisePayload as any).supersetId || null,
                            sets,
                            notes: exercisePayload.notes || '',
                            eachSide: !!exercisePayload.eachSide,
                            tempo: (exercisePayload as any).tempo || undefined,
                            alternatives,
                            column1Label: column1Label || undefined,
                            column2Label: column2Label || undefined,
                        };
                        section.exercises!.push(convertedExercise);
                        console.log('[PAYLOAD CONVERTER] Added exercise to section, total exercises:', section.exercises!.length);
                    });
                });
                console.log('[PAYLOAD CONVERTER] Finished converting section, final exercise count:', section.exercises!.length);
            } else if (sectionPayload.type === 'circuits' && sectionPayload.exercises) {
                sectionPayload.exercises.forEach((group) => {
                    group.exercises.forEach((exercisePayload) => {
                        // Find exercise details from the exercise database, or use fallback
                        const cleanedId = cleanExerciseId(exercisePayload);
                        const exerciseDetails = findExerciseById(cleanedId)
                            || createFallbackExercise(cleanedId, (exercisePayload as any).exerciseType);

                        // Get exercise type for set conversion
                        const exerciseType = (exercisePayload as any).exerciseType || exerciseDetails.exerciseType || 'weight_reps';

                        // Get column labels for proper trackable field mapping
                        const column1Label = (exercisePayload as any).column1Label;
                        const column2Label = (exercisePayload as any).column2Label;

                        // For circuits, convert the single set to an array using the helper function
                        const setPayload = exercisePayload.set;
                        const sets: SetData[] = [convertSetToSetData(setPayload, exerciseType, column1Label, column2Label)];

                        section.exercises!.push({
                            ...exerciseDetails,
                            instanceId: (exercisePayload as any).id || `${cleanedId}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
                            supersetGroupId: (exercisePayload as any).supersetId || null,
                            sets,
                            notes: exercisePayload.notes || '',
                            eachSide: !!exercisePayload.eachSide,
                            tempo: (exercisePayload as any).tempo || undefined,
                            alternatives: ((exercisePayload as any).alternatives || []).filter((a: any) => a != null),
                            column1Label: column1Label || undefined,
                            column2Label: column2Label || undefined,
                        });
                    });
                });
            } else if ((sectionPayload.type === 'amrap' || sectionPayload.type === 'timed') && sectionPayload.exercises) {
                // For AMRAP and Timed sections, exercises have a single set with the trackable field values
                sectionPayload.exercises.forEach((exercisePayload) => {
                    // Find exercise details from the exercise database, or use fallback
                    const cleanedId = cleanExerciseId(exercisePayload);
                    const exerciseDetails = findExerciseById(cleanedId)
                        || createFallbackExercise(cleanedId, (exercisePayload as any).exerciseType);

                    // Extract column labels
                    const column1Label = (exercisePayload as any).column1Label || 'Reps';
                    const column2Label = (exercisePayload as any).column2Label || 'kg';

                    // Extract trackable field values
                    const trackableField1 = (exercisePayload as any).trackableField1;
                    const trackableField2 = (exercisePayload as any).trackableField2;

                    // Map trackable fields to set data based on column labels
                    const fieldName1 = getFieldNameForLabel(column1Label);
                    const fieldName2 = getFieldNameForLabel(column2Label);
                    const value1 = trackableField1?.prescribed?.toString() || '';
                    const value2 = trackableField2?.prescribed?.toString() || '';

                    // Create a single set with the trackable field values
                    const singleSet: SetData = {
                        setNumber: 1,
                        type: 'normal',
                        reps: fieldName1 === 'reps' ? value1 : (fieldName2 === 'reps' ? value2 : ''),
                        weight: fieldName1 === 'weight' ? value1 : (fieldName2 === 'weight' ? value2 : ''),
                        distance: fieldName1 === 'distance' ? value1 : (fieldName2 === 'distance' ? value2 : ''),
                        duration: fieldName1 === 'duration' ? value1 : (fieldName2 === 'duration' ? value2 : ''),
                        rest: (exercisePayload as any).restSec?.toString() || '90',
                        other: '',
                        optional: {
                            prescribed: fieldName1 === 'optional' ? value1 : (fieldName2 === 'optional' ? value2 : ''),
                            completed: '',
                        },
                    };

                    section.exercises!.push({
                        ...exerciseDetails,
                        instanceId: `${cleanedId}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
                        supersetGroupId: (exercisePayload as any).supersetId || null,
                        sets: [singleSet],
                        notes: exercisePayload.notes || '',
                        eachSide: !!exercisePayload.eachSide,
                        tempo: (exercisePayload as any).tempo || undefined,
                        alternatives: ((exercisePayload as any).alternatives || []).filter((a: any) => a != null),
                        column1Label,
                        column2Label,
                    });
                });
            }

            items.push({
                itemType: 'section',
                section,
            });
            console.log('[PAYLOAD CONVERTER] Added section to items');
        }
    });

    console.log('[PAYLOAD CONVERTER] Final converted schema:', JSON.stringify({ items }, null, 2));
    return { items };
};
