'use client';

import { useRouter } from 'next/navigation';
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
import { StandardBuilder } from './standard-builder';
import type { WorkoutProgramPayload } from '../workout-schema';
import { DiscardChangesDialog } from '../components/discard-changes-dialog';

type WorkoutMeta = {
  title: string;
  description: string;
  type: string;
  difficulty: string;
  builder?: 'standard' | 'ai' | null;
};

const StandardWorkoutPage = () => {
  const t = useTranslations();
  const router = useRouter();
  const [workoutMeta, setWorkoutMeta] = useState<WorkoutMeta | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isDiscardDialogOpen, setIsDiscardDialogOpen] = useState(false);
  const [saveSignal, setSaveSignal] = useState(0);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // Check for access flag - if not present, redirect to workouts
    const accessFlag = window.localStorage.getItem('oneninety_workout_builder_access');
    if (accessFlag !== 'standard') {
      router.push('/library/workouts');
      return;
    }
    
    // Try to load meta from localStorage (if coming from create panel)
    const raw = window.localStorage.getItem('oneninety_new_workout_meta');
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as WorkoutMeta;
        setWorkoutMeta(parsed);
        // Clear the access flag after setting meta to prevent re-redirects
        window.localStorage.removeItem('oneninety_workout_builder_access');
        return;
      } catch {
        // If parsing fails, fall through to default values
      }
    }

    // If no meta in localStorage, use default values for new workout
    setWorkoutMeta({
      title: t('workouts.addWorkout.title'),
      description: '',
      type: 'Push',
      difficulty: 'Intermediate',
      builder: 'standard',
    });
    // Clear the access flag after setting default meta
    window.localStorage.removeItem('oneninety_workout_builder_access');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const navigateBackToWorkouts = () => {
    router.push('/library/workouts');
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

    toast.success(t('workouts.new.toast.savedSuccessfully', { name: payload.title, type: payload.type }), {
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
    } else if (path === '/library/workouts') {
      navigateBackToWorkouts();
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
                    {t('workouts.detail.breadcrumb.library')}
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="text-muted-foreground/60">
                  <ChevronRight className="h-2 w-2" />
                </BreadcrumbSeparator>
                <BreadcrumbItem>
                  <BreadcrumbLink
                    onClick={() => handleBreadcrumbClick('/library/workouts')}
                    className="cursor-pointer hover:bg-accent hover:text-accent-foreground px-0.5 py-0.5 rounded transition-colors text-foreground"
                  >
                    {t('workouts.detail.breadcrumb.workouts')}
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="text-muted-foreground/60">
                  <ChevronRight className="h-2 w-2" />
                </BreadcrumbSeparator>
                <BreadcrumbItem>
                  <BreadcrumbPage className="font-semibold text-foreground px-0.5">
                    {t('workouts.addWorkout.title')}
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
            <h1 className="text-[22px] font-semibold truncate">{t('workouts.addWorkout.title')}</h1>
          </div>
          <ButtonGroup className="flex-shrink-0">
            <Button
              variant="ghost"
              onClick={handleCancel}
              className="gap-2 border border-primary"
              aria-label={t('workouts.addWorkout.cancelAria')}
            >
              <X className="size-4" />
              <span>{t('workouts.addWorkout.cancel')}</span>
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
      <DiscardChangesDialog
        open={isDiscardDialogOpen}
        onCancel={() => setIsDiscardDialogOpen(false)}
        onConfirm={handleConfirmDiscard}
      />
    </div>
  );
};

export default StandardWorkoutPage;
