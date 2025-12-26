'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ProgramBuilder } from '../../components/program-builder';
import { getProgramById } from '@/api/coach/coach-program-service';
import { getWorkoutById } from '@/api/coach/coach-workout-service';
import type { Workout } from '@/components/app/app-shell';
import { Spinner } from '@/components/ui/spinner';

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
  const [isLoading, setIsLoading] = useState(true);
  const [programMeta, setProgramMeta] = useState<ProgramMeta | null>(null);

  useEffect(() => {
    const fetchProgram = async () => {
      try {
        const program = await getProgramById(programId);

        // Extract weeks from length (e.g., "12 weeks" -> 12)
        const weeksMatch = program.length.match(/(\d+)/);
        const weeksNum = weeksMatch ? parseInt(weeksMatch[1], 10) : 1;

        setProgramMeta({
          name: program.program,
          type: (program as any).type || '',
          difficulty: (program as any).difficulty || '',
          weeks: weeksNum.toString(),
          description: program.description,
        });
      } catch (error) {
        console.error('Failed to fetch program meta:', error);
        router.push('/training/programs');
      } finally {
        setIsLoading(false);
      }
    };

    if (programId) {
      fetchProgram();
    }
  }, [programId, router]);

  const loadProgramData = async () => {
    try {
      const program = await getProgramById(programId);
      if (!program || !program.program_data || !program.program_data.schema) {
        return { workoutsByDay: {}, totalWeeks: 1 };
      }

      const schema = program.program_data.schema;
      const weeksMatch = program.length.match(/(\d+)/);
      const weeksNum = weeksMatch ? parseInt(weeksMatch[1], 10) : 1;

      const preFilledWorkouts: {
        [week: number]: { [day: number]: Array<Workout & { id: string }> };
      } = {};

      // Fetch all unique workout IDs in the schema
      const allWorkoutIds = Array.from(new Set((schema as any[]).flatMap(s => s.workouts)));
      const workoutsMap = new Map<string, Workout>();

      // Fetch each workout (we could optimize this if the API supported bulk get)
      await Promise.all(allWorkoutIds.map(async (id) => {
        try {
          const w = await getWorkoutById(id);
          workoutsMap.set(id, w);
        } catch (e) {
          console.error(`Failed to fetch workout ${id}`, e);
        }
      }));

      // Pre-fill workouts based on schema
      (schema as any[]).forEach(({ day, workouts }) => {
        const week = Math.ceil(day / 7);
        const dayInWeek = ((day - 1) % 7) + 1;
        if (!preFilledWorkouts[week]) {
          preFilledWorkouts[week] = {};
        }
        if (!preFilledWorkouts[week][dayInWeek]) {
          preFilledWorkouts[week][dayInWeek] = [];
        }

        workouts.forEach((workoutId: string) => {
          const workout = workoutsMap.get(workoutId);
          if (workout) {
            preFilledWorkouts[week][dayInWeek].push({
              ...workout,
              id: `${workout.id}-${Date.now()}-${Math.random()}`,
            } as Workout & { id: string });
          }
        });
      });

      return {
        workoutsByDay: preFilledWorkouts,
        totalWeeks: weeksNum,
      };
    } catch (error) {
      console.error('Failed to load program data:', error);
      return null;
    }
  };

  if (isLoading) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <Spinner />
      </div>
    );
  }

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
