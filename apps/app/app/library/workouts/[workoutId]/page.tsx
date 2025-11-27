'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ButtonGroup, ButtonGroupSeparator } from '@/components/ui/button-group';
import { toast } from 'sonner';
import { ChevronRight, ChevronDown, Edit, Trash2, X } from 'lucide-react';
import { mockWorkouts } from '@/components/app/app-shell';

const WorkoutDetailPage = () => {
  const router = useRouter();
  const params = useParams();
  const workoutId = params.workoutId as string;
  const workout = mockWorkouts.find((w) => w.id === workoutId);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const createMockWorkoutSchema = () => {
    return {
      sections: [
        {
          id: `sec_regular_${Date.now()}`,
          type: 'regular' as const,
          exercises: [
            {
              exerciseId: 'K6NnTv0',
              name: 'Bench Press',
              imageUrl: '/demo-img.png',
              equipments: ['Barbell'],
              bodyParts: ['Chest'],
              exerciseType: 'weight_reps',
              targetMuscles: ['Pectoralis Major Clavicular Head'],
              secondaryMuscles: ['Deltoid Anterior', 'Pectoralis Major Clavicular Head', 'Triceps Brachii'],
              videoUrl: '/demo-video.mp4',
              keywords: ['Chest workout with barbell', 'Barbell bench press exercise'],
              overview: 'The Bench Press is a classic strength training exercise.',
              instructions: ['Grip the barbell', 'Lower to chest', 'Push back up'],
              exerciseTips: ['Keep your back flat', 'Control the weight'],
              variations: [],
              relatedExerciseIds: [],
              instanceId: `inst_${Date.now()}_1`,
              sets: [
                {
                  setNumber: 1,
                  weight: 135,
                  reps: 10,
                  restSec: 60,
                },
                {
                  setNumber: 2,
                  weight: 135,
                  reps: 10,
                  restSec: 60,
                },
              ],
            },
            {
              exerciseId: 'ex_2',
              name: 'Squats',
              imageUrl: '/demo-img.png',
              equipments: ['Barbell'],
              bodyParts: ['Legs'],
              exerciseType: 'weight_reps',
              targetMuscles: ['Quadriceps'],
              secondaryMuscles: ['Glutes', 'Hamstrings'],
              videoUrl: '/demo-video.mp4',
              keywords: ['Leg workout', 'Squat exercise'],
              overview: 'Squats are a fundamental lower body exercise.',
              instructions: ['Stand with feet shoulder-width', 'Lower down', 'Push back up'],
              exerciseTips: ['Keep knees aligned', 'Maintain proper form'],
              variations: [],
              relatedExerciseIds: [],
              instanceId: `inst_${Date.now()}_2`,
              sets: [
                {
                  setNumber: 1,
                  weight: 185,
                  reps: 12,
                  restSec: 90,
                },
              ],
            },
          ],
        },
      ],
    };
  };

  const handleEditAi = () => {
    if (!workout) return;

    const mockSchema = createMockWorkoutSchema();
    const meta = {
      title: workout.program || 'Workout',
      description: workout.description || '',
      type: workout.type || 'Push',
      difficulty: 'Intermediate',
      builder: 'ai' as const,
    };

    if (typeof window !== 'undefined') {
      window.localStorage.setItem('oneninety_new_workout_meta', JSON.stringify(meta));
      window.localStorage.setItem('oneninety_workout_builder_access', 'edit-ai');
      window.localStorage.setItem('oneninety_workout_schema', JSON.stringify(mockSchema));
    }

    router.push(`/library/workouts/${workoutId}/edit/ai`);
  };

  const handleEditManual = () => {
    if (!workout) return;

    const mockSchema = createMockWorkoutSchema();
    const meta = {
      title: workout.program || 'Workout',
      description: workout.description || '',
      type: workout.type || 'Push',
      difficulty: 'Intermediate',
      builder: 'standard' as const,
    };

    if (typeof window !== 'undefined') {
      window.localStorage.setItem('oneninety_new_workout_meta', JSON.stringify(meta));
      window.localStorage.setItem('oneninety_workout_builder_access', 'edit-standard');
      window.localStorage.setItem('oneninety_workout_schema', JSON.stringify(mockSchema));
    }

    router.push(`/library/workouts/${workoutId}/edit/standard`);
  };

  const handleDelete = () => {
    setIsDeleteModalOpen(false);
    toast.success('Workout deleted successfully', {
      style: {
        background: 'rgb(220 252 231)',
        color: 'rgb(20 83 45)',
        border: '1px solid rgb(187 247 208)',
      },
    });
    router.push('/library/workouts');
  };

  const handleCancelDelete = () => {
    setIsDeleteModalOpen(false);
  };

  const handleDeleteKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setIsDeleteModalOpen(true);
    }
  };

  const handleEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
    }
  };

  return (
    <div className="h-full w-full flex flex-col">
      <div className="w-full relative">
        <div className="px-4 flex flex-col gap-1 mb-2 mt-2">
          <Breadcrumb>
            <BreadcrumbList className="text-xs gap-1">
              <BreadcrumbItem>
                <BreadcrumbLink
                  onClick={() => router.push('/library')}
                  className="cursor-pointer hover:bg-accent hover:text-accent-foreground px-0.5 py-0.5 rounded transition-colors text-foreground"
                >
                  Library
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="text-muted-foreground/60">
                <ChevronRight className="h-2 w-2" />
              </BreadcrumbSeparator>
              <BreadcrumbItem>
                <BreadcrumbLink
                  onClick={() => router.push('/library/workouts')}
                  className="cursor-pointer hover:bg-accent hover:text-accent-foreground px-0.5 py-0.5 rounded transition-colors text-foreground"
                >
                  Workouts
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="text-muted-foreground/60">
                <ChevronRight className="h-2 w-2" />
              </BreadcrumbSeparator>
              <BreadcrumbItem>
                <BreadcrumbPage className="font-semibold text-foreground px-0.5">
                  {workout?.program || 'Workout'}
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <h1 className="text-[22px] font-semibold">{workout?.program || 'Workout'}</h1>
        </div>
        <div className="absolute top-2 right-4 flex items-center gap-2">
          <DropdownMenu>
            <ButtonGroup>
              <Button
                variant="secondary"
                onClick={handleEditManual}
                onKeyDown={handleEditKeyDown}
                aria-label="Edit workout"
                tabIndex={0}
                className="gap-2"
              >
                <Edit className="size-4" />
                <span>Edit</span>
              </Button>
              <ButtonGroupSeparator />
              <DropdownMenuTrigger asChild>
                <Button variant="secondary" className="px-2" aria-label="Edit options">
                  <ChevronDown className="size-4" />
                </Button>
              </DropdownMenuTrigger>
            </ButtonGroup>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleEditAi}>
                OneNinety AI
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleEditManual}>
                Manual
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            variant="secondary"
            size="icon"
            onClick={() => setIsDeleteModalOpen(true)}
            onKeyDown={handleDeleteKeyDown}
            aria-label="Delete workout"
            tabIndex={0}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
        <Separator className="absolute bottom-[-1px] left-0 right-0" />
      </div>
      <div className="w-full flex-1 overflow-auto px-4 py-4">{/* Workout detail content */}</div>
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent
          className="w-full max-w-[500px] sm:max-w-[500px] flex flex-col"
          showCloseButton={false}
        >
          <DialogHeader className="flex-shrink-0">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-left">Delete</DialogTitle>
              <DialogClose asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6" aria-label="Close">
                  <X className="h-4 w-4" />
                </Button>
              </DialogClose>
            </div>
          </DialogHeader>
          <div className="flex-1 mt-4">
            <p className="text-sm text-muted-foreground">
              Are you sure you want to delete this workout? This action cannot be undone.
            </p>
          </div>
          <div className="flex items-center justify-end gap-3 pt-4">
            <Button type="button" onClick={handleCancelDelete}>
              Cancel
            </Button>
            <Button type="button" variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WorkoutDetailPage;
