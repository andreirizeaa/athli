/**
 * Mobile Workout Schema - Compatible with web app's workout-schema.ts
 * This ensures workouts created on mobile can be opened on web and vice versa
 */

import { SectionType } from '@/constants/training';

// ============================================================================
// Core Types (Re-export from shared package)
// ============================================================================

export * from '@athli/shared-types';

// ============================================================================
// Builder Types (Mobile-specific for builder UI state)
// ============================================================================

export type BuilderExerciseSet = {
    id: string;
    setNumber?: number; // Optional - computed from index when needed
    column1: string; // prescribed value for trackableField1
    column2: string; // prescribed value for trackableField2
    type: 'R' | 'W' | 'F' | 'D'; // Regular, Warmup, Failure, Dropset
    rest?: string;
};

export type BuilderExercise = {
    id: string; // Instance ID for this card in the builder
    exerciseId: string; // ID of the exercise from the library
    name: string;
    imageUrl: string;
    exerciseType: string;
    sets: BuilderExerciseSet[];
    column1Type: string;
    column2Type: string;
    notes?: string;
    alternatives: { id: string; name: string; imageUrl: string }[];
    tempo?: string;
    eachSide?: boolean;
    isSupersetNext?: boolean;
    supersetGroupId?: string | null;
    equipments?: string[]; // Preserved from library for payload extraction
    bodyParts?: string[];
    setRestSec?: number; // Rest time between sets in seconds
};

export type BuilderSection = {
    id: string;
    type: 'section';
    name: string;
    sectionType: SectionType;
    duration?: string;
    rounds?: string;
    notes?: string;
    exercises: BuilderExercise[];
};

export type BuilderItem = BuilderExercise | BuilderSection;

export type BuilderWorkoutMeta = {
    id: string | null;
    name: string;
    description: string;
    type: string;
    difficulty: string;
};

export type BuilderWorkoutState = {
    meta: BuilderWorkoutMeta;
    items: BuilderItem[];
};

// ============================================================================
// Helper Functions (Mobile-specific)
// ============================================================================

export const getDefaultColumns = (exerciseType: string) => {
    switch (exerciseType) {
        case 'weight_reps':
            return { column1Type: 'Reps', column2Type: 'kg' };
        case 'reps':
            return { column1Type: 'Reps', column2Type: 'None' };
        case 'distance_duration':
            return { column1Type: 'km', column2Type: 'minutes' };
        default:
            return { column1Type: 'Reps', column2Type: 'None' };
    }
};

/**
 * Checks if a builder item is a section
 */
export const isBuilderSection = (item: BuilderItem): item is BuilderSection => {
    return 'type' in item && item.type === 'section';
};

/**
 * Create an empty workout state
 */
export const createEmptyWorkoutState = (): BuilderWorkoutState => ({
    meta: {
        id: null,
        name: '',
        description: '',
        type: '',
        difficulty: 'all_levels',
    },
    items: [],
});

/**
 * Deep compare two workout states for equality
 */
export const areWorkoutStatesEqual = (
    state1: BuilderWorkoutState,
    state2: BuilderWorkoutState
): boolean => {
    return JSON.stringify(state1) === JSON.stringify(state2);
};

// ============================================================================
// Payload Builder Functions (convert builder state to API payload format)
// Re-import from shared types for consistency
// ============================================================================

import {
    createTrackableField,
    type SetPayload,
    type RoundExercisePayload,
    type RegularExercisePayload,
    type CircuitExercisePayload,
    type ExerciseGroupPayload,
    type CircuitExerciseGroupPayload,
    type WorkoutSectionPayload,
    type WorkoutItem,
    type WorkoutPayload,
    DEFAULT_EXECUTION_FIELDS,
} from '@athli/shared-types';

const parseNumber = (value?: string): number | null => {
    if (!value) return null;
    const n = Number(value);
    return Number.isNaN(n) ? null : n;
};

const mapSetTypeToPayload = (type: 'R' | 'W' | 'F' | 'D'): 'normal' | 'warmUp' | 'failure' | 'dropset' => {
    switch (type) {
        case 'W': return 'warmUp';
        case 'F': return 'failure';
        case 'D': return 'dropset';
        default: return 'normal';
    }
};

const mapBuilderSetToPayload = (
    set: BuilderExerciseSet,
    index: number,
    column1Type: string,
    column2Type: string,
    exerciseRestSec?: number
): SetPayload => ({
    setNumber: set.setNumber ?? (index + 1),
    type: mapSetTypeToPayload(set.type),
    restSec: parseNumber(set.rest) ?? exerciseRestSec ?? null,
    completed: false,
    skipped: false,
    trackableField1: createTrackableField(column1Type, set.column1 || null),
    trackableField2: createTrackableField(column2Type, set.column2 || null),
    dropset: null,
});

const groupExercisesBySuperset = (
    exercises: BuilderExercise[]
): BuilderExercise[][] => {
    const groups: BuilderExercise[][] = [];
    let currentGroup: BuilderExercise[] = [];

    exercises.forEach((exercise, index) => {
        currentGroup.push(exercise);

        // If this exercise is NOT supersetted to the next one, end the current group
        if (!exercise.isSupersetNext) {
            groups.push(currentGroup);
            currentGroup = [];
        }
    });

    // Push any remaining group
    if (currentGroup.length > 0) {
        groups.push(currentGroup);
    }

    return groups;
};

export const buildSectionPayload = (section: BuilderSection): WorkoutSectionPayload => {
    const groups = groupExercisesBySuperset(section.exercises);
    const sectionType = section.sectionType;

    if (sectionType === 'amrap') {
        const exercises: RoundExercisePayload[] = section.exercises.map((ex) => {
            const firstSet = ex.sets[0];
            return {
                prescribedExerciseId: ex.exerciseId,
                performedExerciseId: null,
                notes: ex.notes || null,
                completed: false,
                eachSide: ex.eachSide || false,
                tempo: ex.tempo || null,
                trackableField1: createTrackableField(ex.column1Type, firstSet?.column1 || null),
                trackableField2: createTrackableField(ex.column2Type, firstSet?.column2 || null),
                restSec: parseNumber(firstSet?.rest),
            };
        });

        return {
            id: section.id,
            name: section.name,
            type: 'amrap',
            durationSec: (parseNumber(section.duration) || 0) * 60, // Convert minutes to seconds
            actualDurationSec: null,
            roundsCompleted: null,
            exercises,
            notes: section.notes || null,
        };
    }

    if (sectionType === 'timed') {
        const exercises: RoundExercisePayload[] = section.exercises.map((ex) => {
            const firstSet = ex.sets[0];
            return {
                prescribedExerciseId: ex.exerciseId,
                performedExerciseId: null,
                notes: ex.notes || null,
                completed: false,
                eachSide: ex.eachSide || false,
                tempo: ex.tempo || null,
                trackableField1: createTrackableField(ex.column1Type, firstSet?.column1 || null),
                trackableField2: createTrackableField(ex.column2Type, firstSet?.column2 || null),
                restSec: parseNumber(firstSet?.rest),
            };
        });

        return {
            id: section.id,
            name: section.name,
            type: 'timed',
            targetRounds: parseNumber(section.rounds) || 0,
            actualRounds: null,
            totalDurationSec: null,
            exercises,
            notes: section.notes || null,
        };
    }

    if (sectionType === 'circuits') {
        const exerciseGroups: CircuitExerciseGroupPayload[] = groups.map((group) => ({
            isSuperset: group.length > 1,
            exercises: group.map((ex) => {
                const firstSet = ex.sets[0] || { id: '1', setNumber: 1, column1: '', column2: '', type: 'R' as const };
                return {
                    prescribedExerciseId: ex.exerciseId,
                    performedExerciseId: null,
                    alternatives: ex.alternatives.map((alt) => alt.id),
                    notes: ex.notes || null,
                    supersetId: ex.supersetGroupId || null,
                    eachSide: ex.eachSide || false,
                    tempo: ex.tempo || null,
                    column1Label: ex.column1Type,
                    column2Label: ex.column2Type,
                    set: mapBuilderSetToPayload(firstSet, 0, ex.column1Type, ex.column2Type, ex.setRestSec),
                };
            }),
        }));

        return {
            id: section.id,
            name: section.name,
            type: 'circuits',
            targetRounds: parseNumber(section.rounds) || 0,
            actualRounds: null,
            totalDurationSec: null,
            exercises: exerciseGroups,
            notes: section.notes || null,
        };
    }

    // Regular section (default)
    const exerciseGroups: ExerciseGroupPayload[] = groups.map((group) => ({
        isSuperset: group.length > 1,
        exercises: group.map((ex) => ({
            prescribedExerciseId: ex.exerciseId,
            performedExerciseId: null,
            sets: ex.sets.map((set, idx) => mapBuilderSetToPayload(set, idx, ex.column1Type, ex.column2Type, ex.setRestSec)),
            alternatives: ex.alternatives.map((alt) => alt.id),
            notes: ex.notes || null,
            supersetId: ex.supersetGroupId || null,
            eachSide: ex.eachSide || false,
            tempo: ex.tempo || null,
            column1Label: ex.column1Type,
            column2Label: ex.column2Type,
        })),
    }));

    return {
        id: section.id,
        name: section.name,
        type: 'regular',
        exercises: exerciseGroups,
        notes: section.notes || null,
    };
};

/**
 * Convert mobile builder state to API payload format
 * This payload is compatible with the web app's workout schema
 */
export const buildWorkoutPayload = (state: BuilderWorkoutState): WorkoutPayload => {
    const items: WorkoutItem[] = state.items.map((item) => {
        if (isBuilderSection(item)) {
            return {
                itemType: 'section' as const,
                data: buildSectionPayload(item),
            };
        } else {
            // Top-level exercise
            const ex = item;
            return {
                itemType: 'exercise' as const,
                data: {
                    prescribedExerciseId: ex.exerciseId,
                    performedExerciseId: null,
                    sets: ex.sets.map((set, idx) => mapBuilderSetToPayload(set, idx, ex.column1Type, ex.column2Type, ex.setRestSec)),
                    alternatives: ex.alternatives.map((alt) => alt.id),
                    notes: ex.notes || null,
                    supersetId: ex.supersetGroupId || null,
                    eachSide: ex.eachSide || false,
                    tempo: ex.tempo || null,
                    column1Label: ex.column1Type,
                    column2Label: ex.column2Type,
                } as RegularExercisePayload,
            };
        }
    });

    // Extract unique equipment
    const equipmentSet = new Set<string>();
    state.items.forEach((item) => {
        if (isBuilderSection(item)) {
            item.exercises.forEach((ex) => {
                ex.equipments?.forEach((eq) => {
                    if (eq && eq.trim()) equipmentSet.add(eq.trim());
                });
            });
        } else {
            item.equipments?.forEach((eq) => {
                if (eq && eq.trim()) equipmentSet.add(eq.trim());
            });
        }
    });

    // Calculate total exercises
    let totalExercises = 0;
    state.items.forEach((item) => {
        if (isBuilderSection(item)) {
            totalExercises += item.exercises.length;
        } else {
            totalExercises += 1;
        }
    });

    return {
        id: state.meta.id,
        name: state.meta.name,
        description: state.meta.description || '',
        type: state.meta.type || '',
        difficulty: state.meta.difficulty || 'all_levels',
        equipment: Array.from(equipmentSet).sort(),
        totalExercises,
        items,
        ...DEFAULT_EXECUTION_FIELDS,
    };
};
