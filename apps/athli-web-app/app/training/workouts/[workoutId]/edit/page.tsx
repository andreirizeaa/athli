'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Check, ChevronRight, X, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ButtonGroup, ButtonGroupSeparator } from '@/components/ui/button-group';
import { Separator } from '@/components/ui/separator';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { StandardBuilder } from '../../new/workout-builder';
import type { WorkoutProgramPayload } from '../../new/workout-schema';
import { DiscardChangesDialog } from '@/components/app/discard-changes-dialog';
import { getWorkoutById, updateWorkoutDetails, deleteWorkouts } from '@/api/coach/coach-workout-service';
import { EditWorkoutDetailsSidePanel } from '../../components/edit-workout-details-side-panel';
import { useTrainingData } from '../../../training-data-context';

type WorkoutMeta = {
  title: string;
  description: string;
  type: string;
  difficulty: string;
  builder?: 'standard' | 'ai' | null;
};

const EditStandardWorkoutPage = () => {
  const t = useTranslations();
  const router = useRouter();
  const params = useParams();
  const workoutId = params.workoutId as string;
  const { refreshWorkouts } = useTrainingData();
  const [workoutMeta, setWorkoutMeta] = useState<WorkoutMeta | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isDiscardDialogOpen, setIsDiscardDialogOpen] = useState(false);
  const [saveSignal, setSaveSignal] = useState(0);
  const [isEditDetailsOpen, setIsEditDetailsOpen] = useState(false);

  // Set access flag synchronously before component renders
  if (typeof window !== 'undefined') {
    // Set the access flag
    window.localStorage.setItem('athli_workout_builder_access', 'edit-standard');
  }

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Try to load meta from localStorage first (if coming from detail page)
    const raw = window.localStorage.getItem('athli_new_workout_meta');
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as WorkoutMeta;
        setWorkoutMeta(parsed);
        // Don't clear the access flag here - we need it for the builder
        return;
      } catch {
        // If parsing fails, fall through to load from workout data
      }
    }

    // If no meta in localStorage, load from workout data
    const fetchWorkout = async () => {
      try {
        const workout = await getWorkoutById(workoutId);
        setWorkoutMeta({
          title: workout.program || 'Workout',
          description: workout.description || '',
          type: workout.type || 'Push',
          difficulty: workout.difficulty || 'intermediate',
          builder: 'standard',
        });

        // Set the schema in localStorage for the builder
        if (workout.workout_data) {
          window.localStorage.setItem('athli_workout_schema', JSON.stringify(workout.workout_data));
        }
      } catch (error) {
        console.error('Failed to fetch workout:', error);
        router.push('/training/workouts');
      }
    };

    fetchWorkout();
  }, [router, workoutId]);

  const navigateBackToWorkouts = () => {
    router.push('/training/workouts');
  };

  const handleCancel = () => {
    if (hasUnsavedChanges) {
      setIsDiscardDialogOpen(true);
      return;
    }

    navigateBackToWorkouts();
  };

  const handleConfirmDiscard = () => {
    setIsDiscardDialogOpen(false);
    setHasUnsavedChanges(false);
    navigateBackToWorkouts();
  };

  const handleSaveClick = () => {
    // Signal the builder to attempt a save; builder will handle validation and call onSaveSuccess
    setSaveSignal((prev) => prev + 1);
  };

  const handleSaveSuccess = (payload: WorkoutProgramPayload) => {
    // Styled console.log with green background
    // eslint-disable-next-line no-console
    console.log(
      '%cWorkout payload',
      'background: #16a34a; color: white; padding: 4px 8px; border-radius: 4px;'
    );
    // eslint-disable-next-line no-console
    console.log(payload);

    toast.success(t('workouts.edit.toast.updatedSuccessfully', { name: payload.title }), {
      style: {
        background: 'rgb(220 252 231)',
        color: 'rgb(20 83 45)',
        border: '1px solid rgb(187 247 208)',
      },
    });

    setHasUnsavedChanges(false);
    navigateBackToWorkouts();
  };

  const handleSaveDetails = async (details: { title: string; type: string; difficulty: string; description: string }) => {
    // Update local state
    setWorkoutMeta((prev) => prev ? ({ ...prev, ...details }) : null);

    // Update backend immediately
    try {
      await updateWorkoutDetails(workoutId, details);
      toast.success(t('workouts.edit.toast.updatedSuccessfully', { name: details.title }));
    } catch (error) {
      console.error('Failed to update workout details:', error);
      toast.error('Failed to update details');
    }
  };

  const handleDeleteWorkout = async () => {
    try {
      await deleteWorkouts(workoutId);
      await refreshWorkouts();
      toast.success(t('workouts.detail.toast.deletedSuccessfully'));
      router.push('/training/workouts');
    } catch (error) {
      console.error('Failed to delete workout:', error);
      toast.error('Failed to delete workout');
    }
  };

  if (!workoutMeta) {
    return null;
  }

  const handleBreadcrumbClick = (path: string) => {
    if (hasUnsavedChanges) {
      setIsDiscardDialogOpen(true);
      return;
    }

    router.push(path);
  };

  return (
    <div className="h-full w-full flex flex-col">
      <div className="w-full relative">
        <div className="px-4 flex items-start justify-between gap-4 mb-2 mt-2">
          <div className="flex flex-col gap-1 flex-1 min-w-0">
            <Breadcrumb>
              <BreadcrumbList className="text-xs gap-1">
                <BreadcrumbItem>
                  <BreadcrumbLink
                    onClick={() => handleBreadcrumbClick('/training')}
                    className="cursor-pointer hover:bg-accent hover:text-accent-foreground px-0.5 py-0.5 rounded transition-colors text-foreground"
                  >
                    {t('sidebar.links.training')}
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="text-muted-foreground/60">
                  <ChevronRight className="h-2 w-2" />
                </BreadcrumbSeparator>
                <BreadcrumbItem>
                  <BreadcrumbLink
                    onClick={() => handleBreadcrumbClick('/training/workouts')}
                    className="cursor-pointer hover:bg-accent hover:text-accent-foreground px-0.5 py-0.5 rounded transition-colors text-foreground"
                  >
                    {t('workouts.edit.breadcrumb.workouts')}
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="text-muted-foreground/60">
                  <ChevronRight className="h-2 w-2" />
                </BreadcrumbSeparator>
                <BreadcrumbItem>
                  <BreadcrumbPage className="px-0.5 capitalize">
                    {t('general.edit')}
                  </BreadcrumbPage>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="text-muted-foreground/60">
                  <ChevronRight className="h-2 w-2" />
                </BreadcrumbSeparator>
                <BreadcrumbItem>
                  <BreadcrumbPage className="font-semibold text-foreground px-0.5">
                    {workoutMeta?.title || t('workouts.detail.breadcrumb.workout')}
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
            <h1 className="text-[22px] font-semibold truncate">Editing {workoutMeta?.title}</h1>
          </div>
          <ButtonGroup className="flex-shrink-0">
            <Button
              variant="ghost"
              onClick={() => setIsEditDetailsOpen(true)}
              className="gap-2 border border-primary"
            >
              <Pencil className="size-4" />
              <span>Edit details</span>
            </Button>
            <Button
              variant="ghost"
              onClick={handleCancel}
              className="gap-2 border border-primary"
              aria-label={t('workouts.edit.cancelAria')}
            >
              <X className="size-4" />
              <span>{t('workouts.edit.cancel')}</span>
            </Button>
            <Button onClick={handleSaveClick} className="gap-2" aria-label={t('workouts.edit.saveAria')}>
              <Check className="size-4" />
              <span>{t('workouts.edit.save')}</span>
            </Button>
          </ButtonGroup>
        </div>
        <Separator className="absolute bottom-[-1px] left-0 right-0" />
      </div>
      <div className="w-full flex-1 overflow-auto bg-sidebar">
        <StandardBuilder
          meta={workoutMeta}
          onDirtyChange={() => setHasUnsavedChanges(true)}
          saveSignal={saveSignal}
          onSaveSuccess={handleSaveSuccess}
        />
      </div>
      {workoutMeta && (
        <EditWorkoutDetailsSidePanel
          open={isEditDetailsOpen}
          onOpenChange={setIsEditDetailsOpen}
          workoutMeta={workoutMeta}
          onSave={handleSaveDetails}
          onDelete={handleDeleteWorkout}
        />
      )}
      <DiscardChangesDialog
        open={isDiscardDialogOpen}
        onCancel={() => setIsDiscardDialogOpen(false)}
        onConfirm={handleConfirmDiscard}
      />
    </div>
  );
};

export default EditStandardWorkoutPage;

