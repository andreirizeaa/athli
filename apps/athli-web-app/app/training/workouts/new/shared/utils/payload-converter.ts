import type { WorkoutProgramPayload, WorkoutItem, ExerciseGroupPayload } from '../../workout-schema';
import type { WorkoutSchema, WorkoutSchemaItem, ExerciseWithSuperset, WorkoutSection } from '../types/workout-builder.types';
import type { SetData } from '../../components/exercise-card';
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

/**
 * Converts a payload format workout to builder format
 * Used when loading a workout from the backend
 */
export const convertPayloadToBuilderFormat = (payload: WorkoutProgramPayload): WorkoutSchema => {
    const items: WorkoutSchemaItem[] = [];

    if (!payload || !payload.items) {
        return { items: [] };
    }

    payload.items.forEach((item: WorkoutItem) => {
        if (item.itemType === 'exercise') {
            // Convert top-level exercise group to builder format
            const exerciseGroup = item.data as ExerciseGroupPayload;

            if (!exerciseGroup || !exerciseGroup.exercises) return;

            exerciseGroup.exercises.forEach((exercisePayload) => {
                // Find exercise details from the exercise database, or use fallback
                const exerciseDetails = searchExercises('').find((e) => e.exerciseId === exercisePayload.id)
                    || createFallbackExercise(exercisePayload.id, exercisePayload.exerciseType);

                // Convert sets from payload format to builder format
                const sets: SetData[] = exercisePayload.sets.map((set) => ({
                    setNumber: set.setNumber,
                    type: ('dropset' in set && set.dropset) ? 'dropset' : 'normal',
                    reps: set.exerciseType === 'distance_duration' ? '' : set.reps?.toString() || '',
                    weight: set.exerciseType === 'weight_reps' ? set.weight?.toString() || '' : '',
                    rest: set.restSec?.toString() || '',
                    distance: set.exerciseType === 'distance_duration' && 'distance' in set ? (set as any).distance?.toString() || '' : '',
                    duration: set.exerciseType === 'distance_duration' && 'durationSec' in set ? (set as any).durationSec?.toString() || '' : '',
                }));

                const exercise: ExerciseWithSuperset = {
                    ...exerciseDetails,
                    instanceId: `${exercisePayload.id}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
                    supersetGroupId: exerciseGroup.isSuperset ? `superset_${Date.now()}_${Math.random().toString(36).slice(2, 8)}` : null,
                    sets,
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
                type: sectionPayload.type,
                exercises: [],
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
                        const exerciseDetails = searchExercises('').find((e) => e.exerciseId === exercisePayload.id)
                            || createFallbackExercise(exercisePayload.id, exercisePayload.exerciseType);

                        const sets: SetData[] = exercisePayload.sets.map((set) => ({
                            setNumber: set.setNumber,
                            type: ('dropset' in set && set.dropset) ? 'dropset' : 'normal',
                            reps: set.exerciseType === 'distance_duration' ? '' : set.reps?.toString() || '',
                            weight: set.exerciseType === 'weight_reps' ? set.weight?.toString() || '' : '',
                            rest: set.restSec?.toString() || '',
                            distance: set.exerciseType === 'distance_duration' && 'distance' in set ? (set as any).distance?.toString() || '' : '',
                            duration: set.exerciseType === 'distance_duration' && 'durationSec' in set ? (set as any).durationSec?.toString() || '' : '',
                        }));

                        section.exercises.push({
                            ...exerciseDetails,
                            instanceId: `${exercisePayload.id}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
                            supersetGroupId,
                            sets,
                        });
                    });
                });
            } else if (sectionPayload.type === 'circuits' && sectionPayload.exercises) {
                sectionPayload.exercises.forEach((group) => {
                    const supersetGroupId = group.isSuperset ? `superset_${sectionPayload.id}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}` : null;

                    group.exercises.forEach((exercisePayload) => {
                        // Find exercise details from the exercise database, or use fallback
                        const exerciseDetails = searchExercises('').find((e) => e.exerciseId === exercisePayload.id)
                            || createFallbackExercise(exercisePayload.id, exercisePayload.exerciseType);

                        // For circuits, convert the single set to an array
                        const sets: SetData[] = [{
                            setNumber: exercisePayload.set.setNumber,
                            type: ('dropset' in exercisePayload.set && exercisePayload.set.dropset) ? 'dropset' : 'normal',
                            reps: exercisePayload.set.exerciseType === 'distance_duration' ? '' : exercisePayload.set.reps?.toString() || '',
                            weight: exercisePayload.set.exerciseType === 'weight_reps' ? exercisePayload.set.weight?.toString() || '' : '',
                            rest: exercisePayload.set.restSec?.toString() || '',
                            distance: exercisePayload.set.exerciseType === 'distance_duration' && 'distance' in exercisePayload.set ? (exercisePayload.set as any).distance?.toString() || '' : '',
                            duration: exercisePayload.set.exerciseType === 'distance_duration' && 'durationSec' in exercisePayload.set ? (exercisePayload.set as any).durationSec?.toString() || '' : '',
                        }];

                        section.exercises.push({
                            ...exerciseDetails,
                            instanceId: `${exercisePayload.id}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
                            supersetGroupId,
                            sets,
                        });
                    });
                });
            } else if ((sectionPayload.type === 'amrap' || sectionPayload.type === 'timed') && sectionPayload.exercises) {
                // For AMRAP and Timed sections, exercises don't have sets in the builder
                sectionPayload.exercises.forEach((exercisePayload) => {
                    // Find exercise details from the exercise database, or use fallback
                    const exerciseDetails = searchExercises('').find((e) => e.exerciseId === exercisePayload.id)
                        || createFallbackExercise(exercisePayload.id, exercisePayload.exerciseType);

                    section.exercises.push({
                        ...exerciseDetails,
                        instanceId: `${exercisePayload.id}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
                        supersetGroupId: null,
                        sets: [],
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
