'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Check, ChevronRight, X } from 'lucide-react';
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
import { AiBuilder } from '../../../new/ai/ai-builder';
import type { WorkoutProgramPayload } from '../../../new/workout-schema';
import { DiscardChangesDialog } from '../../../new/components/discard-changes-dialog';
import { mockWorkouts } from '@/components/app/app-shell';
import { MOCK_WORKOUT_SCHEMA } from '@/lib/library/workouts/mock-workout-schema';

type WorkoutMeta = {
  title: string;
  description: string;
  type: string;
  difficulty: string;
  builder?: 'standard' | 'ai' | null;
};

const EditAiWorkoutPage = () => {
  const t = useTranslations();
  const router = useRouter();
  const params = useParams();
  const workoutId = params.workoutId as string;
  const [workoutMeta, setWorkoutMeta] = useState<WorkoutMeta | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isDiscardDialogOpen, setIsDiscardDialogOpen] = useState(false);
  const [saveSignal, setSaveSignal] = useState(0);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Try to load meta from localStorage first (if coming from detail page)
    const raw = window.localStorage.getItem('oneninety_new_workout_meta');
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as WorkoutMeta;
        setWorkoutMeta(parsed);
        // Clear the access flag if it exists
        window.localStorage.removeItem('oneninety_workout_builder_access');
        return;
      } catch {
        // If parsing fails, fall through to load from workout data
      }
    }

    // If no meta in localStorage, load from workout data
    const workout = mockWorkouts.find((w) => w.id === workoutId);
    if (workout) {
      setWorkoutMeta({
        title: workout.program || 'Workout',
        description: workout.description || '',
        type: workout.type || 'Push',
        difficulty: 'Intermediate',
        builder: 'ai',
      });

      // Ensure workout schema is set in localStorage for edit mode
      // Only set if no AI generated workout exists and no saved schema
      const aiGenerated = window.localStorage.getItem('oneninety_ai_generated_workout');
      const savedSchema = window.localStorage.getItem('oneninety_workout_schema');
      if (!aiGenerated && !savedSchema) {
        // Set the shared mock schema if no schema exists
        window.localStorage.setItem('oneninety_workout_schema', JSON.stringify(MOCK_WORKOUT_SCHEMA));
      }

      // Set the access flag if not already set
      const accessFlag = window.localStorage.getItem('oneninety_workout_builder_access');
      if (!accessFlag || accessFlag !== 'edit-ai') {
        window.localStorage.setItem('oneninety_workout_builder_access', 'edit-ai');
      }
    } else {
      // If workout not found, redirect back
      router.push('/training/workouts');
    }
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

  if (!workoutMeta) {
    return null;
  }

  const handleBreadcrumbClick = (path: string) => {
    if (hasUnsavedChanges) {
      setIsDiscardDialogOpen(true);
      return;
    }

    if (path === '/library') {
      router.push('/library');
    } else if (path === '/training/workouts') {
      router.push('/training/workouts');
    }
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
                    onClick={() => handleBreadcrumbClick('/library')}
                    className="cursor-pointer hover:bg-accent hover:text-accent-foreground px-0.5 py-0.5 rounded transition-colors text-foreground"
                  >
                    {t('workouts.edit.breadcrumb.library')}
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
                  <BreadcrumbPage className="font-semibold text-foreground px-0.5">
                    {workoutMeta?.title || t('workouts.detail.breadcrumb.workout')}
                  </BreadcrumbPage>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="text-muted-foreground/60">
                  <ChevronRight className="h-2 w-2" />
                </BreadcrumbSeparator>
                <BreadcrumbItem>
                  <BreadcrumbPage className="font-semibold text-foreground px-0.5">
                    {t('workouts.edit.breadcrumb.editWorkout')}
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
            <h1 className="text-[22px] font-semibold truncate">{t('workouts.edit.title')}</h1>
          </div>
          <ButtonGroup className="flex-shrink-0">
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
        <AiBuilder
          meta={workoutMeta}
          onDirtyChange={() => setHasUnsavedChanges(true)}
          saveSignal={saveSignal}
          onSaveSuccess={handleSaveSuccess}
        />
      </div>
      <DiscardChangesDialog
        open={isDiscardDialogOpen}
        onCancel={() => setIsDiscardDialogOpen(false)}
        onConfirm={handleConfirmDiscard}
      />
    </div>
  );
};

export default EditAiWorkoutPage;

