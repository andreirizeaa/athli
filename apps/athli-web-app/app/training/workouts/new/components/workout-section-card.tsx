'use client';

import { ChevronDown, ChevronUp, Info, Link2, Link2Off, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { ExerciseCard } from './exercise-card';
import type { SetData } from './exercise-card';
import type { Exercise } from '@/lib/library/exercises/exercise-search';

type ExerciseWithSuperset = Exercise & {
  supersetGroupId?: string | null;
  instanceId: string;
  sets?: SetData[];
  alternatives?: string[];
};

type Section = {
  id: string;
  type: 'regular' | 'amrap' | 'timed' | 'circuits' | 'auxiliary';
  exercises?: ExerciseWithSuperset[];
  roundDurationSec?: number;
  targetRounds?: number;
  category?: 'warmup' | 'cooldown' | 'mobility';
};

type SectionValidationErrors = Record<string, {
  emptyExercises?: boolean;
  missingConfig?: boolean;
}>;

type ValidationErrors = Record<string, Record<string, Record<string, string>>>;

const getSectionDescription = (type: 'regular' | 'amrap' | 'timed' | 'circuits' | 'auxiliary'): string => {
  switch (type) {
    case 'regular':
      return 'Exercise for exercise. Follow the sets and reps specified.';
    case 'amrap':
      return 'Track the total amount of rounds completed in the allocated time.';
    case 'timed':
      return 'Track total duration until completion of assigned rounds.';
    case 'circuits':
      return 'Complete all exercises in the circuit for the specified number of rounds. One set per exercise.';
    case 'auxiliary':
      return 'Warm up, cool down, or mobility exercises. Follow the sets and reps specified.';
    default:
      return '';
  }
};

type WorkoutSectionCardProps = {
  section: Section;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onDelete: () => void;
  onSectionChange: (updates: Partial<Section>) => void;
  onDirtyChange?: () => void;
  sectionValidationErrors?: SectionValidationErrors;
  onClearSectionValidation?: (sectionId: string, field: 'missingConfig' | 'emptyExercises') => void;
  // Exercise-related handlers
  exercises: ExerciseWithSuperset[];
  onExerciseChange: (exerciseIndex: number, exercise: ExerciseWithSuperset) => void;
  onExerciseDelete: (exerciseIndex: number) => void;
  onAddExercise: () => void;
  onSupersetLink: (exerciseIndex: number) => void;
  onSupersetUnlink: (exerciseIndex: number) => void;
  // Drag and drop
  onDragOver?: (e: React.DragEvent) => void;
  onDragLeave?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
  onSlotDragOver?: (e: React.DragEvent, slotIndex: number) => void;
  onSlotDragLeave?: (e: React.DragEvent) => void;
  onSlotDrop?: (e: React.DragEvent, slotIndex: number) => void;
  draggedExercise?: Exercise | null;
  dragOverSlot?: { sectionId: string; slotIndex: number } | null;
  dragOverSectionId?: string | null;
  // Exercise card props
  onVideoClick: (exercise: Exercise) => void;
  validationErrors?: ValidationErrors;
  onClearValidationField?: (exerciseInstanceId: string, setIndex: number, field: string) => void;
  exerciseRefs?: React.MutableRefObject<Map<string, HTMLDivElement>>;
  focusedExerciseId?: string | null;
  registerSectionRef?: (sectionId: string, element: HTMLElement | null) => void;
};

export const WorkoutSectionCard = ({
  section,
  isCollapsed,
  onToggleCollapse,
  onDelete,
  onSectionChange,
  onDirtyChange,
  sectionValidationErrors = {},
  exercises,
  onExerciseChange,
  onExerciseDelete,
  onAddExercise,
  onSupersetLink,
  onSupersetUnlink,
  onDragOver,
  onDragLeave,
  onDrop,
  onSlotDragOver,
  onSlotDragLeave,
  onSlotDrop,
  draggedExercise,
  dragOverSlot,
  dragOverSectionId,
  onVideoClick,
  validationErrors = {},
  onClearValidationField,
  exerciseRefs,
  focusedExerciseId,
  registerSectionRef,
  onClearSectionValidation,
}: WorkoutSectionCardProps) => {
  const handleDeleteKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onDelete();
    }
  };

  return (
    <div className="relative flex w-full items-stretch flex-shrink-0 min-w-0">
      <Card className="bg-sidebar w-full flex flex-col relative min-w-0 border-primary p-0 rounded-xl">
        <CardHeader
          className={cn(
            'p-0 bg-primary/10 rounded-t-xl',
            isCollapsed && 'rounded-b-xl',
            !isCollapsed && 'border-b border-primary'
          )}
        >
          <div className="flex items-center justify-between px-3 py-2 pb-0">
            <div className="flex items-center gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-primary hover:text-primary hover:bg-primary/20"
                    onClick={onToggleCollapse}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onToggleCollapse();
                      }
                    }}
                    aria-label={isCollapsed ? 'Expand section' : 'Collapse section'}
                  >
                    {isCollapsed ? (
                      <ChevronDown className="size-4" />
                    ) : (
                      <ChevronUp className="size-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {isCollapsed ? 'Expand section' : 'Collapse section'}
                </TooltipContent>
              </Tooltip>
              <CardTitle className="uppercase tracking-wide text-sm font-medium flex items-center gap-2">
                {section.type}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="size-4 text-foreground -translate-y-[0.5px]" />
                  </TooltipTrigger>
                  <TooltipContent>{getSectionDescription(section.type)}</TooltipContent>
                </Tooltip>
              </CardTitle>
            </div>
            <div className="flex items-center gap-2">
              {section.type === 'auxiliary' && (
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-medium">Category</span>
                  <Select
                    value={section.category || ''}
                    onValueChange={(value) => {
                      onDirtyChange?.();
                      onSectionChange({
                        category: value as 'warmup' | 'cooldown' | 'mobility',
                      });
                      // Clear missing-config validation when category is selected
                      if (value) {
                        onClearSectionValidation?.(section.id, 'missingConfig');
                      }
                    }}
                  >
                    <SelectTrigger
                      className={cn(
                        'h-7 w-32 text-[11px]',
                        sectionValidationErrors[section.id]?.missingConfig &&
                          'border-destructive focus-visible:ring-destructive'
                      )}
                    >
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="warmup">Warm up</SelectItem>
                      <SelectItem value="cooldown">Cool down</SelectItem>
                      <SelectItem value="mobility">Mobility</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              {(section.type === 'amrap' || section.type === 'timed' || section.type === 'circuits') && (
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-medium">
                    {section.type === 'amrap' ? 'Time (s)' : 'Rounds'}
                  </span>
                  <Input
                    type="text"
                    inputMode="numeric"
                    value={
                      section.type === 'amrap'
                        ? section.roundDurationSec?.toString() || ''
                        : section.targetRounds?.toString() || ''
                    }
                    onChange={(e) => {
                      const value = e.target.value;
                      onDirtyChange?.();
                      if (section.type === 'amrap') {
                        onSectionChange({
                          roundDurationSec: value ? parseInt(value, 10) : undefined,
                        });
                      } else {
                        onSectionChange({
                          targetRounds: value ? parseInt(value, 10) : undefined,
                        });
                      }
                      // Clear missing-config validation for this section as soon as a value is entered
                      if (value && value.trim() !== '') {
                        onClearSectionValidation?.(section.id, 'missingConfig');
                      }
                    }}
                    className={cn(
                      'h-7 w-24 text-center text-[11px]',
                      sectionValidationErrors[section.id]?.missingConfig &&
                        'border-destructive focus-visible:ring-destructive'
                    )}
                    placeholder="-"
                  />
                </div>
              )}
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-destructive hover:border-destructive"
                onClick={onDelete}
                onKeyDown={handleDeleteKeyDown}
                aria-label={`Delete ${section.type} section`}
              >
                <Trash2 className="size-3" />
              </Button>
            </div>
          </div>
        </CardHeader>
        {!isCollapsed && (
          <div
            className="overflow-hidden transition-all duration-300 ease-in-out"
            style={{
              maxHeight: '10000px',
              opacity: 1,
            }}
          >
            <CardContent
              ref={(el) => registerSectionRef?.(section.id, el)}
              data-workout-section
              className="flex-1 flex flex-col px-3 py-1.5 pb-0"
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
            >
              <div
                className={cn(
                  'flex-1 w-full',
                  exercises && exercises.length > 0
                    ? 'flex flex-col gap-0'
                    : 'flex items-center justify-center'
                )}
              >
                {exercises && exercises.length > 0 ? (
                  <div className="w-full flex flex-col gap-0">
                    {/* Slot before the first exercise */}
                    <div
                      onDragOver={(e) => onSlotDragOver?.(e, 0)}
                      onDragLeave={onSlotDragLeave}
                      onDrop={(e) => onSlotDrop?.(e, 0)}
                      className={cn(
                        'transition-all w-full',
                        draggedExercise &&
                          dragOverSlot &&
                          dragOverSlot.sectionId === section.id &&
                          dragOverSlot.slotIndex === 0
                          ? 'my-1 min-h-14 border-2 border-dashed border-primary bg-primary/5 rounded-lg flex items-center justify-center text-primary text-sm'
                          : 'h-1'
                      )}
                    >
                      {draggedExercise &&
                        dragOverSlot &&
                        dragOverSlot.sectionId === section.id &&
                        dragOverSlot.slotIndex === 0 && (
                          <span>Drop your exercise here</span>
                        )}
                    </div>

                    {exercises.map((exercise, exerciseIndex) => {
                      const nextExercise = exercises?.[exerciseIndex + 1];
                      const prevExercise =
                        exerciseIndex > 0 ? exercises?.[exerciseIndex - 1] : null;

                      const isLinkedToNext = !!(
                        exercise.supersetGroupId &&
                        nextExercise?.supersetGroupId === exercise.supersetGroupId
                      );

                      const isLinkedToPrev = !!(
                        exercise.supersetGroupId &&
                        prevExercise?.supersetGroupId === exercise.supersetGroupId
                      );

                      const wrapperClasses = cn(
                        'flex flex-col',
                        isLinkedToNext ? 'gap-0' : 'gap-2',
                        exerciseIndex === 0
                          ? ''
                          : isLinkedToPrev
                            ? '-mt-px'
                            : isLinkedToNext
                              ? 'mt-0'
                              : 'mt-1'
                      );

                      return (
                        <div
                          key={exercise.instanceId}
                          ref={(el) => {
                            if (el && exerciseRefs) {
                              exerciseRefs.current.set(exercise.exerciseId, el);
                            } else if (!el && exerciseRefs) {
                              exerciseRefs.current.delete(exercise.exerciseId);
                            }
                          }}
                          className={wrapperClasses}
                        >
                          <div
                            className={cn(
                              focusedExerciseId === exercise.exerciseId &&
                                '[&>div]:!border-primary [&>div]:!border [&>div]:animate-pulse'
                            )}
                          >
                            <ExerciseCard
                              exercise={exercise}
                              isLinkedToPrev={isLinkedToPrev}
                              isLinkedToNext={isLinkedToNext}
                              onVideoClick={onVideoClick}
                              sectionType={section.type}
                              validationErrors={validationErrors[exercise.instanceId]}
                              onClearValidationField={(setIndex, field) =>
                                onClearValidationField?.(exercise.instanceId, setIndex, field)
                              }
                              onExerciseChange={(newExercise) => {
                                onExerciseChange(exerciseIndex, newExercise as ExerciseWithSuperset);
                              }}
                              onDelete={() => {
                                onExerciseDelete(exerciseIndex);
                              }}
                            />
                          </div>

                          {/* Slot between this exercise and the next */}
                          <div
                            onDragOver={(e) => onSlotDragOver?.(e, exerciseIndex + 1)}
                            onDragLeave={onSlotDragLeave}
                            onDrop={(e) => onSlotDrop?.(e, exerciseIndex + 1)}
                            className={cn(
                              'transition-all w-full',
                              draggedExercise &&
                                dragOverSlot &&
                                dragOverSlot.sectionId === section.id &&
                                dragOverSlot.slotIndex === exerciseIndex + 1
                                ? 'my-1 min-h-14 border-2 border-dashed border-primary bg-primary/5 rounded-lg flex items-center justify-center text-primary text-sm'
                                : isLinkedToNext
                                  ? 'h-0'
                                  : 'h-1'
                            )}
                          >
                            {draggedExercise &&
                              dragOverSlot &&
                              dragOverSlot.sectionId === section.id &&
                              dragOverSlot.slotIndex === exerciseIndex + 1 && (
                                <span>Drop your exercise here</span>
                              )}
                          </div>
                          {exercises &&
                            exerciseIndex < exercises.length - 1 && (
                              <>
                                {isLinkedToNext ? (
                                  <div className="relative flex items-center justify-center bg-background border-x py-1">
                                    <Separator className="absolute w-full" />
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      className="gap-1.5 bg-background z-10 text-xs h-7 px-2"
                                      onClick={() => onSupersetUnlink(exerciseIndex)}
                                    >
                                      <Link2Off className="size-3" />
                                      Unlink
                                    </Button>
                                  </div>
                                ) : (
                                  <div className="flex justify-center -mt-2 mb-2">
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      className="gap-1.5 text-xs h-7 px-2"
                                      onClick={() => onSupersetLink(exerciseIndex)}
                                    >
                                      <Link2 className="size-3" />
                                      Superset
                                    </Button>
                                  </div>
                                )}
                              </>
                            )}
                        </div>
                      );
                    })}
                    <div className="flex justify-center pb-3">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={onAddExercise}
                        className="gap-1.5 text-xs h-7 px-2"
                      >
                        <Plus className="size-3" />
                        Add Exercise
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div
                    className={cn(
                      'flex items-center justify-center w-full my-4 py-3 border-2 border-dashed rounded-lg transition-colors',
                      dragOverSectionId === section.id
                        ? 'border-primary bg-primary/5'
                        : sectionValidationErrors[section.id]?.emptyExercises
                          ? 'border-destructive bg-destructive/5'
                          : 'border-muted'
                    )}
                  >
                    <p className="text-muted-foreground text-sm text-center">
                      Drag exercises from
                      <br />
                      the left to add
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </div>
        )}
      </Card>
    </div>
  );
};
