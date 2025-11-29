'use client';

import { useParams, useRouter } from 'next/navigation';
import { ProgramBuilder } from '../../components/program-builder';
import { mockPrograms, mockWorkouts } from '@/components/app/app-shell';
import type { Workout } from '@/components/app/app-shell';

type ProgramMeta = {
  name: string;
  type: string;
  difficulty: string;
  weeks: string;
  description: string;
};

type ProgramSchema = Array<{ day: number; workouts: string[] }>;

const EditProgramPage = () => {
  const router = useRouter();
  const params = useParams();
  const programId = params.programId as string;
  const program = mockPrograms.find((p) => p.id === programId);

  const loadProgramData = async () => {
    if (!program) {
      router.push('/library/programs');
      return null;
    }

    // Extract weeks from length (e.g., "12 weeks" -> 12)
    const weeksMatch = program.length.match(/(\d+)/);
    const weeksNum = weeksMatch ? parseInt(weeksMatch[1], 10) : 1;

    // Load program schema from localStorage (for now, we'll use a mock structure)
    // In a real app, this would come from a database/API
    const programSchemaKey = `oneninety_program_schema_${programId}`;
    const savedSchema = window.localStorage.getItem(programSchemaKey);
    
    const preFilledWorkouts: {
      [week: number]: { [day: number]: Array<Workout & { id: string }> };
    } = {};

    if (savedSchema) {
      try {
        const schema: ProgramSchema = JSON.parse(savedSchema);
        
        // Pre-fill workouts based on schema
        schema.forEach(({ day, workouts }) => {
          const week = Math.ceil(day / 7);
          const dayInWeek = ((day - 1) % 7) + 1;
          if (!preFilledWorkouts[week]) {
            preFilledWorkouts[week] = {};
          }
          if (!preFilledWorkouts[week][dayInWeek]) {
            preFilledWorkouts[week][dayInWeek] = [];
          }

          // Find workouts by ID and add them
          workouts.forEach((workoutId) => {
            const workout = mockWorkouts.find((w) => w.id === workoutId);
            if (workout) {
              preFilledWorkouts[week][dayInWeek].push({
                ...workout,
                id: `${workout.id}-${Date.now()}-${Math.random()}`,
              });
            }
          });
        });
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Error parsing program schema:', error);
      }
    }

    return {
      workoutsByDay: preFilledWorkouts,
      totalWeeks: weeksNum,
    };
  };

  // Extract weeks from length (e.g., "12 weeks" -> 12)
  const weeksMatch = program?.length.match(/(\d+)/);
  const weeksNum = weeksMatch ? parseInt(weeksMatch[1], 10) : 1;

  const programMeta: ProgramMeta | null = program
    ? {
        name: program.program,
        type: program.type,
        difficulty: '', // Not available in Program type
        weeks: weeksNum.toString(),
        description: program.description,
      }
    : null;

  return (
    <ProgramBuilder
      mode="edit"
      programId={programId}
      initialProgramMeta={programMeta}
      onLoadProgramData={loadProgramData}
    />
  );
};

export default EditProgramPage;
