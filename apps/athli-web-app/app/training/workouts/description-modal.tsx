'use client';

import React, { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

type PreviewExercise = {
  id: string;
  name: string;
  sets: string;
};

type PreviewSection = {
  id: string;
  type: 'regular' | 'amrap' | 'timed';
  exercises: PreviewExercise[];
};

type DescriptionModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  description: string;
  programName: string;
  workoutId: string;
};

const buildMockPreviewSections = (programName: string): PreviewSection[] => {
  return [
    {
      id: 'sec-1',
      type: 'regular',
      exercises: [
        {
          id: 'ex-1',
          name: `${programName} - Main lift`,
          sets: '3 x 8–10',
        },
        {
          id: 'ex-2',
          name: 'Accessory 1',
          sets: '3 x 10–12',
        },
        {
          id: 'ex-3',
          name: 'Accessory 2',
          sets: '3 x 12–15',
        },
      ],
    },
    {
      id: 'sec-2',
      type: 'timed',
      exercises: [
        {
          id: 'ex-4',
          name: 'Finisher circuit',
          sets: '10 min',
        },
      ],
    },
  ];
};

const DescriptionModal = ({
  open,
  onOpenChange,
  description,
  programName,
  workoutId,
}: DescriptionModalProps) => {
  const t = useTranslations();
  const router = useRouter();

  const previewSections = useMemo(() => buildMockPreviewSections(programName), [programName]);

  const handleClose = () => {
    onOpenChange(false);
  };

  const handleEditWorkout = () => {
    router.push(`/training/workouts/${workoutId}/edit/standard`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl sm:max-w-5xl h-[600px] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="text-base font-semibold truncate" title={programName}>
            {programName}
          </DialogTitle>
          <p className="mt-1 text-xs text-muted-foreground line-clamp-3 whitespace-pre-wrap">
            {description}
          </p>
        </DialogHeader>
        <div className="flex flex-1 min-h-0 gap-4 pt-3">
          <div className="flex-[3] h-full overflow-y-auto">
            <div className="flex flex-col gap-3">
              {previewSections.map((section) => (
                <Card key={section.id} className="bg-background flex flex-col">
                  <CardHeader className="px-3 py-2 border-b">
                    <CardTitle className="uppercase tracking-wide text-[11px] font-medium flex items-center gap-2">
                      {section.type}{' '}
                      <span className="font-normal text-[10px]">
                        ({section.exercises.length})
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-3 py-2">
                    <div className="flex flex-col gap-1">
                      {section.exercises.map((exercise) => (
                        <div
                          key={exercise.id}
                          className="flex items-center justify-between gap-2 rounded-md border bg-muted/60 px-2 py-1.5"
                        >
                          <div className="flex flex-col min-w-0">
                            <span
                              className="text-[11px] font-medium truncate"
                              title={exercise.name}
                            >
                              {exercise.name}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              {exercise.sets}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
          <div className="flex-[1.5] h-full overflow-y-auto border-l pl-4">
            <div className="flex flex-col gap-2">
              <h2 className="text-xs font-semibold uppercase tracking-wide">{t('workouts.descriptionModal.overview')}</h2>
              <div className="flex flex-col gap-2">
                {previewSections.map((section) => (
                  <Card
                    key={section.id}
                    className="border rounded-lg bg-card/80 shadow-sm flex flex-col"
                  >
                    <CardHeader className="px-3 py-2 border-b">
                      <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        {section.type}{' '}
                        <span className="font-normal">
                          ({section.exercises.length})
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent className="p-2 flex flex-col gap-1">
                      {section.exercises.map((exercise) => (
                        <div
                          key={exercise.id}
                          className="flex items-center gap-2 rounded-md border bg-background px-2 py-1"
                        >
                          <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground flex-shrink-0" />
                          <span className="text-[11px] flex-1 min-w-0 truncate">
                            {exercise.name}
                          </span>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 pt-3 flex-shrink-0 border-t mt-3 pt-3">
          <Button
            type="button"
            variant="secondary"
            onClick={handleEditWorkout}
            aria-label={t('workouts.descriptionModal.editWorkoutAria')}
          >
            {t('workouts.descriptionModal.editWorkout')}
          </Button>
          <Button type="button" onClick={handleClose} aria-label={t('workouts.descriptionModal.closeAria')}>
            {t('workouts.descriptionModal.close')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DescriptionModal;
