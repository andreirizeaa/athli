'use client';

import { useParams } from 'next/navigation';
import { Separator } from '@/components/ui/separator';
import { mockWorkouts } from '../page';

const WorkoutDetailPage = () => {
  const params = useParams();
  const workoutId = params.workoutId as string;
  const workout = mockWorkouts.find((w) => w.id === workoutId);

  return (
    <div className="h-full w-full flex flex-col">
      <div className="w-full relative">
        <div className="px-4">
          <h1 className="text-[22px] font-semibold mb-2 mt-2">{workout?.program || 'Workout'}</h1>
        </div>
        <Separator className="absolute bottom-[-1px] left-0 right-0" />
      </div>
      <div className="w-full flex-1 overflow-auto px-4 py-4">{/* Workout detail content */}</div>
    </div>
  );
};

export default WorkoutDetailPage;
