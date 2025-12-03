'use client';

import { useParams, useRouter } from 'next/navigation';
import { ProgramBuilder } from '../../components/program-builder';
import { mockPrograms, mockWorkouts } from '@/components/app/app-shell';
import type { Workout } from '@/components/app/app-shell';
import { MOCK_PROGRAM_SCHEMA } from '@/lib/library/programs/mock-program-schema';
import type { ProgramSchema } from '@/lib/library/programs/mock-program-schema';

type ProgramMeta = {
  name: string;
  type: string;
  difficulty: string;
  weeks: string;
  description: string;
};

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
    
    // Use saved schema if available, otherwise use the shared mock schema
    let schema: ProgramSchema;
    if (savedSchema) {
      try {
        schema = JSON.parse(savedSchema) as ProgramSchema;
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Error parsing program schema:', error);
        schema = MOCK_PROGRAM_SCHEMA;
        // Save the mock schema to localStorage for consistency
        window.localStorage.setItem(programSchemaKey, JSON.stringify(schema));
      }
    } else {
      // Use shared mock schema and save it to localStorage for consistency
      schema = MOCK_PROGRAM_SCHEMA;
      window.localStorage.setItem(programSchemaKey, JSON.stringify(schema));
    }
    
    const preFilledWorkouts: {
      [week: number]: { [day: number]: Array<Workout & { id: string }> };
    } = {};

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
