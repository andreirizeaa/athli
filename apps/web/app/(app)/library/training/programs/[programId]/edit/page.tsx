'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import { ProgramBuilder } from '../../components/program-builder';
import { getProgramById } from '@/api/coach/coach-program-service';
import { getWorkoutById, getWorkoutsByIds } from '@/api/coach/coach-workout-service';
import type { Workout } from '@/components/app/app-shell';
import type { Program } from '@/components/app/app-shell';
import { Loader2 } from 'lucide-react';

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
  const [programInitialData, setProgramInitialData] = useState<{
    workoutsByDay: { [week: number]: { [day: number]: Array<Workout & { id: string }> } };
    totalWeeks: number;
  } | null>(null);
  const programDataRef = useRef<any>(null);

  useEffect(() => {
    const fetchProgramAndProcess = async () => {
      try {
        const program = await getProgramById(programId);
        programDataRef.current = program;

        // Extract weeks from length (e.g., "12 weeks" -> 12)
        const weeksMatch = program.length.match(/(\d+)/);
        const weeksNum = weeksMatch ? parseInt(weeksMatch[1], 10) : 1;

        setProgramMeta({
          name: program.program,
          type: program.program_data?.type?.toLowerCase() || 'strength',
          difficulty: program.program_data?.difficulty?.toLowerCase() || 'intermediate',
          weeks: weeksNum.toString(),
          description: program.description,
        });

        // Process program data
        if (program && program.program_data && program.program_data.schema) {
          const schema = program.program_data.schema;
          const preFilledWorkouts: {
            [week: number]: { [day: number]: Array<Workout & { id: string }> };
          } = {};

          // Pre-fill workouts based on schema (which now contains full objects)
          (schema as any[]).forEach(({ day, workouts }: { day: number; workouts: any[] }) => {
            const week = Math.ceil(day / 7);
            const dayInWeek = ((day - 1) % 7) + 1;
            if (!preFilledWorkouts[week]) {
              preFilledWorkouts[week] = {};
            }
            if (!preFilledWorkouts[week][dayInWeek]) {
              preFilledWorkouts[week][dayInWeek] = [];
            }

            workouts.forEach((workoutData: any) => {
              // Calculate totalExercises from items if not provided
              let totalExercises = workoutData.totalExercises || 0;
              if (!totalExercises && workoutData.items) {
                totalExercises = (workoutData.items || []).reduce((total: number, item: any) => {
                  if (item.itemType === 'exercise') {
                    return total + 1;
                  } else if (item.itemType === 'section') {
                    const section = item.data;
                    if (section?.exercises) {
                      if (section.type === 'regular' || section.type === 'auxiliary' || section.type === 'tabata' || section.type === 'hiit' || section.type === 'emom') {
                        return total + section.exercises.reduce((sum: number, group: any) => sum + (group.exercises?.length || 0), 0);
                      } else {
                        return total + (section.exercises?.length || 0);
                      }
                    }
                  }
                  return total;
                }, 0);
              }

              // Ensure we have a valid workout object - accept workouts with title or items
              if (workoutData && (workoutData.title || workoutData.items)) {
                // Map the schema object back to our Workout type
                const workout: Workout & { id: string } = {
                  id: `${workoutData.id || 'temp'}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                  name: workoutData.title || 'Untitled Workout',
                  description: workoutData.description || '',
                  type: workoutData.type || 'strength',
                  difficulty: workoutData.difficulty || 'intermediate',
                  totalExercises: totalExercises,
                  equipment: workoutData.equipment || [],
                  created: '',
                  isFavourite: false,
                  items: workoutData.items || [],
                };
                preFilledWorkouts[week][dayInWeek].push(workout);
              }
            });
          });

          setProgramInitialData({
            workoutsByDay: preFilledWorkouts,
            totalWeeks: weeksNum,
          });
        } else {
          setProgramInitialData({
            workoutsByDay: {},
            totalWeeks: weeksNum
          });
        }

      } catch (error) {
        console.error('Failed to fetch program meta:', error);
        router.push('/library/training/programs');
      } finally {
        setIsLoading(false);
      }
    };

    if (programId) {
      fetchProgramAndProcess();
    }
  }, [programId, router]);


  if (isLoading) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <ProgramBuilder
      mode="edit"
      programId={programId}
      initialProgramMeta={programMeta}
      initialData={programInitialData}
    />
  );
};

export default EditProgramPage;
