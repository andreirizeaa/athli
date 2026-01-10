import { LucideIcon } from 'lucide-react-native';
import { COLUMN_OPTIONS, type SectionType } from '@/constants/training';

export type { ColumnValue } from '@/constants/training';
export { COLUMN_OPTIONS };

export type ExerciseSet = {
    id: string;
    column1: string;
    column2: string;
    type: 'R' | 'W' | 'F' | 'D';
};

export type WorkoutExercise = {
    id: string; // Instance ID for this card in the builder
    exerciseId: string; // ID of the exercise from the library
    name: string;
    imageUrl: string;
    exerciseType: string;
    sets: ExerciseSet[];
    column1Type: string;
    column2Type: string;
    notes?: string;
    alternatives: { id: string; name: string; imageUrl: string }[];
    tempo?: string;
    eachSide?: boolean;
    isSupersetNext?: boolean;
};

export type WorkoutSection = {
    id: string;
    type: 'section';
    name: string;
    sectionType: SectionType;
    duration?: string;
    rounds?: string;
    notes?: string;
    exercises: WorkoutExercise[];
};

export type WorkoutItem = WorkoutExercise | WorkoutSection;

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
