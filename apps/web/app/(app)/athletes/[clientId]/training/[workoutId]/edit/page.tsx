'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Check, ChevronRight, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ButtonGroup } from '@/components/ui/button-group';
import { Separator } from '@/components/ui/separator';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { WorkoutBuilder } from '@/app/(app)/training/workouts/workout-builder';
import type { WorkoutProgramPayload } from '@/components/training/workout-schema';
import { DiscardChangesDialog } from '@/components/app/discard-changes-dialog';
import { mockWorkouts } from '@/components/app/app-shell';

type WorkoutMeta = {
  name: string;
  description: string;
  type: string;
  difficulty: string;
  builder?: 'standard' | 'ai' | null;
};

type TrainingCalendarViewState = {
  currentWeek: number;
  selectedWeek: string;
};

const MOCK_WORKOUT_SCHEMA = { items: [] };

const EditTrainingCalendarWorkoutPage = () => {
  const t = useTranslations();
  const router = useRouter();
  const params = useParams();
  // Support both clientId (athletes context) and contactId (inbox context)
  const clientId = (params.clientId as string) || (params.contactId as string);
  const workoutId = params.workoutId as string;
  const [workoutMeta, setWorkoutMeta] = useState<WorkoutMeta | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isDiscardDialogOpen, setIsDiscardDialogOpen] = useState(false);
  const [saveSignal, setSaveSignal] = useState(0);
  const [viewState, setViewState] = useState<TrainingCalendarViewState | null>(null);
  const [workoutDate, setWorkoutDate] = useState<string | null>(null);

  // Set schema and access flag synchronously before component renders
  if (typeof window !== 'undefined') {
    const savedSchema = window.localStorage.getItem('athli_workout_schema');
    if (!savedSchema) {
      // Set the shared mock schema if no schema exists
      window.localStorage.setItem('athli_workout_schema', JSON.stringify(MOCK_WORKOUT_SCHEMA));
    }

    // Set the access flag
    window.localStorage.setItem('athli_workout_builder_access', 'edit-standard');
  }

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Load view state from localStorage
    const viewStateRaw = window.localStorage.getItem('athli_training_calendar_view_state');
    if (viewStateRaw) {
      try {
        const parsed = JSON.parse(viewStateRaw) as TrainingCalendarViewState;
        setViewState(parsed);
      } catch {
        // If parsing fails, use defaults
        setViewState({ currentWeek: 1, selectedWeek: '2' });
      }
    } else {
      setViewState({ currentWeek: 1, selectedWeek: '2' });
    }

    // Load workout date from localStorage
    const dateKey = window.localStorage.getItem('athli_workout_date');
    if (dateKey) {
      setWorkoutDate(dateKey);
    }

    // Try to load meta from localStorage first (if coming from training calendar)
    const raw = window.localStorage.getItem('athli_new_workout_meta');
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as WorkoutMeta;
        setWorkoutMeta(parsed);
        return;
      } catch {
        // If parsing fails, fall through to load from workout data
      }
    }

    // If no meta in localStorage, load from workout data
    const workout = mockWorkouts.find((w) => w.id === workoutId);
    if (workout) {
      setWorkoutMeta({
        name: workout.name || 'Workout',
        description: workout.description || '',
        type: workout.type || 'Push',
        difficulty: 'Intermediate',
        builder: 'standard',
      });
    } else {
      // If workout not found, redirect back to training calendar
      router.push(`/athletes/${clientId}/training`);
    }
  }, [router, workoutId, clientId]);

  const navigateBackToTrainingCalendar = () => {
    if (viewState) {
      // Navigate back with view state preserved via URL params
      router.push(
        `/athletes/${clientId}/training?currentWeek=${viewState.currentWeek}&selectedWeek=${viewState.selectedWeek}`
      );
    } else {
      router.push(`/athletes/${clientId}/training`);
    }
  };

  const handleCancel = () => {
    if (hasUnsavedChanges) {
      setIsDiscardDialogOpen(true);
      return;
    }

    navigateBackToTrainingCalendar();
  };

  const handleConfirmDiscard = () => {
    setIsDiscardDialogOpen(false);
    setHasUnsavedChanges(false);
    navigateBackToTrainingCalendar();
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

    toast.success(t('workouts.edit.toast.updatedSuccessfully', { name: payload.name }), {
      style: {
        background: 'rgb(220 252 231)',
        color: 'rgb(20 83 45)',
        border: '1px solid rgb(187 247 208)',
      },
    });

    setHasUnsavedChanges(false);
    navigateBackToTrainingCalendar();
  };

  if (!workoutMeta) {
    return null;
  }

  const formatDate = (dateKey: string): string => {
    // dateKey is in YYYY-MM-DD format
    const [year, month, day] = dateKey.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[date.getMonth()]} ${day}, ${year}`;
  };

  const handleBreadcrumbClick = (path: string) => {
    if (hasUnsavedChanges) {
      setIsDiscardDialogOpen(true);
      return;
    }

    if (path === `/athletes/${clientId}/training`) {
      navigateBackToTrainingCalendar();
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
                    onClick={() => handleBreadcrumbClick(`/athletes/${clientId}/training`)}
                    className="cursor-pointer hover:bg-accent hover:text-accent-foreground px-0.5 py-0.5 rounded transition-colors text-foreground"
                  >
                    {t('athletes.profile.trainingCalendar')}
                  </BreadcrumbLink>
                </BreadcrumbItem>
                {workoutDate && (
                  <>
                    <BreadcrumbSeparator className="text-muted-foreground/60">
                      <ChevronRight className="h-2 w-2" />
                    </BreadcrumbSeparator>
                    <BreadcrumbItem>
                      <BreadcrumbPage className="font-semibold text-foreground px-0.5">
                        {formatDate(workoutDate)}
                      </BreadcrumbPage>
                    </BreadcrumbItem>
                  </>
                )}
                {workoutMeta.name && (
                  <>
                    <BreadcrumbSeparator className="text-muted-foreground/60">
                      <ChevronRight className="h-2 w-2" />
                    </BreadcrumbSeparator>
                    <BreadcrumbItem>
                      <BreadcrumbPage className="font-semibold text-foreground px-0.5">
                        {workoutMeta.name}
                      </BreadcrumbPage>
                    </BreadcrumbItem>
                  </>
                )}
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
        <WorkoutBuilder
          meta={workoutMeta}
          onDirtyChange={() => setHasUnsavedChanges(true)}
          saveSignal={saveSignal}
          onSaveSuccess={handleSaveSuccess}
          open={true}
          onOpenChange={() => { }}
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

export default EditTrainingCalendarWorkoutPage;

