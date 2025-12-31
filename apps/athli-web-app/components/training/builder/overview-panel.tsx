'use client';

import React from 'react';
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  DragOverEvent,
  PointerSensor,
  KeyboardSensor,
  closestCorners,
  useSensor,
  useSensors,
  DragOverlay,
  useDndContext,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import {
  restrictToVerticalAxis,
  restrictToFirstScrollableAncestor,
} from '@dnd-kit/modifiers';
import { Target, GripVertical, Link2, Link2Off, Trash2 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/general/utils';
import type {
  ExerciseWithSuperset,
  WorkoutSection,
  WorkoutSchemaItem,
  ValidationErrors,
} from '@/components/training/shared/types/workout-builder.types';

type ActiveOverviewItem =
  | {
    type: 'section';
    sectionId: string;
  }
  | {
    type: 'exerciseGroup';
    sectionId: string;
    startIndex: number;
    length: number;
  }
  | {
    type: 'topLevelExercise';
    instanceId: string;
  }
  | {
    type: 'topLevelSuperset';
    instanceId: string;
    length: number;
  };


type OverviewPanelProps = {
  items: WorkoutSchemaItem[];
  onItemsChange: (items: WorkoutSchemaItem[]) => void;
  onDeleteSection: (sectionId: string) => void;
  onDeleteExercise: (sectionId: string, exerciseId: string) => void;
  onDeleteTopLevelExercise: (instanceId: string) => void;
  onDeleteSuperset: (sectionId: string, exerciseIds: string[]) => void;
  onDeleteTopLevelSuperset?: (exerciseIds: string[]) => void;
  onUnlinkSuperset?: (sectionId: string, exerciseIndex: number) => void;
  onUnlinkTopLevelSuperset?: (itemIndex: number) => void;
  groupExercisesBySuperset: (exercises: ExerciseWithSuperset[]) => ExerciseWithSuperset[][];
  onExerciseClick?: (exerciseId: string) => void;
  validationErrors?: ValidationErrors;
  isSectionMode?: boolean; // If true, hide delete/drag icons for the section container
};

// DropGap: A gap between cards that can optionally show a centered drop line
const DropGap = ({
  id,
  data,
  isActive,
  isDisabled,
}: {
  id: string;
  data: any;
  isActive: boolean;
  isDisabled?: boolean;
}) => {
  const { setNodeRef, isOver } = useDroppable({
    id,
    data,
    disabled: isDisabled,
  });

  const showLine = isActive || isOver;

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "relative w-full flex-shrink-0 transition-all",
        // Making the hit area larger (12px) but the visual height smaller if needed
        "h-3"
      )}
    >
      {showLine && (
        <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-0.5 bg-primary z-20 pointer-events-none">
          <div className="absolute top-1/2 left-0 -translate-y-1/2 h-2 w-2 rounded-full bg-primary shadow-sm" />
          <div className="absolute top-1/2 right-0 -translate-y-1/2 h-2 w-2 rounded-full bg-primary shadow-sm" />
        </div>
      )}
    </div>
  );
};

// ... OverviewSectionCard updated: opacity logic removed
const OverviewSectionCard = ({
  section,
  children,
  onDelete,
  hideDragAndDelete = false,
}: {
  section: WorkoutSection;
  children: React.ReactNode;
  onDelete: (sectionId: string) => void;
  hideDragAndDelete?: boolean;
}) => {
  const { attributes, listeners, setNodeRef, isDragging } = useSortable({
    id: `section-${section.id}`,
    data: { type: 'section', section },
    disabled: hideDragAndDelete, // Disable dragging in section mode
  });

  const { setNodeRef: setDroppableRef } = useDroppable({
    id: `section-droppable-${section.id}`,
    data: { type: 'section-container', sectionId: section.id },
  });

  const style = {
    // opacity removed
    position: 'relative' as const,
    transform: 'none',
    transition: 'none',
  };

  return (
    <div ref={setNodeRef} style={style} className="relative">
      <div
        className={cn(
          'border border-primary rounded-lg bg-sidebar shadow-sm select-none relative transition-colors',
          // Removed opacity-50
        )}
      >
        <div
          className="flex items-center justify-between px-3 py-2 border-b border-primary bg-primary/10 rounded-t-lg"
        >
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {section.type}{' '}
            <span className="font-normal">
              ({section.exercises ? section.exercises.length : 0})
            </span>
          </div>
          {/* Hide delete and drag buttons when hideDragAndDelete is true */}
          {!hideDragAndDelete && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(section.id);
                }}
                className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
              >
                <Trash2 className="size-3" />
              </button>
              <button
                type="button"
                {...attributes}
                {...listeners}
                onClick={(e) => e.stopPropagation()}
                className="cursor-grab active:cursor-grabbing p-0.5 rounded select-none text-muted-foreground hover:text-foreground"
              >
                <GripVertical className="size-3" />
              </button>
            </div>
          )}
        </div>
        <div ref={setDroppableRef} className="min-h-[10px]">
          {children}
        </div>
      </div>
    </div>
  );
};

const OverviewTopLevelExerciseRow = ({
  exercise,
  onDelete,
  onExerciseClick,
}: {
  exercise: ExerciseWithSuperset;
  onDelete: (instanceId: string) => void;
  onExerciseClick?: (exerciseId: string) => void;
}) => {
  const { attributes, listeners, setNodeRef, isDragging } = useSortable({
    id: `top-level-exercise-${exercise.instanceId}`,
    data: { type: 'top-level-exercise', instanceId: exercise.instanceId },
  });

  const style = {
    // opacity removed
    position: 'relative' as const,
    transform: 'none',
    transition: 'none',
  };

  return (
    <div ref={setNodeRef} style={style} className="relative">
      <div className="flex items-center gap-2 rounded-md border bg-background px-3 py-1.5 text-xs shadow-sm">
        <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground flex-shrink-0" />
        <span className="text-xs flex-1 min-w-0 truncate">{exercise.name || 'Untitled exercise'}</span>
        {onExerciseClick && exercise?.exerciseId && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onExerciseClick(exercise.exerciseId);
                }}
                className="p-1 rounded text-muted-foreground hover:text-primary hover:bg-accent transition-colors flex-shrink-0"
              >
                <Target className="size-3" />
              </button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Focus exercise in view</p>
            </TooltipContent>
          </Tooltip>
        )}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(exercise.instanceId);
          }}
          className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors flex-shrink-0"
        >
          <Trash2 className="size-3" />
        </button>
        <button
          type="button"
          {...attributes}
          {...listeners}
          onClick={(e) => e.stopPropagation()}
          className="cursor-grab active:cursor-grabbing p-0.5 -mr-1 rounded select-none text-muted-foreground hover:text-foreground flex-shrink-0"
        >
          <GripVertical className="size-3" />
        </button>
      </div>
    </div>
  );
};

const OverviewExerciseRow = ({
  sectionId,
  exercise,
  onDelete,
  onExerciseClick,
}: {
  sectionId: string;
  exercise: ExerciseWithSuperset;
  onDelete: (sectionId: string, exerciseId: string) => void;
  onExerciseClick?: (exerciseId: string) => void;
}) => {
  const { attributes, listeners, setNodeRef, isDragging } = useSortable({
    id: `exercise-|${sectionId}|${exercise.instanceId}`,
    data: { type: 'section-exercise', sectionId, instanceId: exercise.instanceId },
  });

  const style = {
    // opacity removed
    position: 'relative' as const,
    transform: 'none',
    transition: 'none',
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} className="relative">
      <div
        {...listeners}
        className={cn(
          'flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-xs select-none cursor-grab active:cursor-grabbing'
        )}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground flex-shrink-0" />
          <span className="text-xs flex-1 min-w-0">{exercise.name || 'Untitled exercise'}</span>
          {onExerciseClick && exercise?.exerciseId && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onExerciseClick(exercise.exerciseId);
                  }}
                  onMouseDown={(e) => e.stopPropagation()}
                  className="p-1 rounded text-muted-foreground hover:text-primary hover:bg-accent transition-colors"
                >
                  <Target className="size-3" />
                </button>
              </TooltipTrigger>
              <TooltipContent><p>Focus exercise in view</p></TooltipContent>
            </Tooltip>
          )}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (exercise?.exerciseId) {
                onDelete(sectionId, exercise.exerciseId);
              }
            }}
            onMouseDown={(e) => e.stopPropagation()}
            className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
          >
            <Trash2 className="size-3" />
          </button>
        </div>
        <div className="flex-shrink-0">
          <GripVertical className="size-3 text-muted-foreground" />
        </div>
      </div>
    </div>
  );
};

const OverviewSupersetRow = ({
  sectionId,
  exercises,
  exerciseStartIndex,
  onDelete,
  onUnlink,
  onExerciseClick,
  validationErrors,
}: {
  sectionId: string;
  exercises: ExerciseWithSuperset[];
  exerciseStartIndex: number;
  onDelete: (sectionId: string, exerciseIds: string[]) => void;
  onUnlink?: (sectionId: string, exerciseIndex: number) => void;
  onExerciseClick?: (exerciseId: string) => void;
  validationErrors?: ValidationErrors;
}) => {
  const firstExerciseId = exercises[0]?.instanceId;
  const { attributes, listeners, setNodeRef, isDragging } = useSortable({
    id: `exercise-|${sectionId}|${firstExerciseId}`,
    data: {
      type: 'section-superset',
      sectionId,
      instanceId: firstExerciseId,
      length: exercises.length
    },
  });

  const style = {
    // opacity removed
    position: 'relative' as const,
    transform: 'none',
    transition: 'none',
  };

  const exerciseNames = exercises.map((ex) => ex.name || 'Untitled exercise').join(', ');

  const handleDelete = (e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation();
    const exerciseIds = exercises.map((ex) => ex.exerciseId).filter((id): id is string => !!id);
    if (exerciseIds.length > 0) {
      onDelete(sectionId, exerciseIds);
    }
  };
  const handleUnlink = (e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation();
    if (onUnlink) onUnlink(sectionId, exerciseStartIndex);
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} className="relative">
      <div
        {...listeners}
        className={cn(
          'rounded-md border bg-background text-xs select-none cursor-grab active:cursor-grabbing'
        )}
      >
        <div className="flex items-start justify-between px-3 py-2.5">
          <div className="flex items-start gap-2 flex-1 min-w-0">
            <div className="flex flex-col gap-1 flex-1 min-w-0">
              {exercises.map((exercise, index) => (
                <div key={exercise.instanceId} className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground flex-shrink-0" />
                    <span className="text-xs flex-1">{exercise.name || 'Untitled exercise'}</span>
                  </div>
                  {index < exercises.length - 1 && onUnlink && (
                    <div className="flex items-center justify-center py-0.5">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            onClick={handleUnlink}
                            onMouseDown={(e) => e.stopPropagation()}
                            className="p-0.5 rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                          >
                            <Link2Off className="size-3" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent><p>Unlink superset</p></TooltipContent>
                      </Tooltip>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {onExerciseClick && exercises.length > 0 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onExerciseClick(exercises[0].exerciseId);
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                    className="p-1 rounded text-muted-foreground hover:text-primary hover:bg-accent transition-colors flex-shrink-0"
                  >
                    <Target className="size-3" />
                  </button>
                </TooltipTrigger>
                <TooltipContent><p>Focus exercise in view</p></TooltipContent>
              </Tooltip>
            )}
            <button
              type="button"
              onClick={handleDelete}
              onMouseDown={(e) => e.stopPropagation()}
              className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors flex-shrink-0"
            >
              <Trash2 className="size-3" />
            </button>
            <GripVertical className="size-3 text-muted-foreground flex-shrink-0" />
          </div>
        </div>
      </div>
    </div>
  );
};

const OverviewTopLevelSupersetRow = ({
  exercises,
  itemStartIndex,
  onDelete,
  onUnlink,
  onExerciseClick,
  validationErrors,
}: {
  exercises: ExerciseWithSuperset[];
  itemStartIndex: number;
  onDelete?: (exerciseIds: string[]) => void;
  onUnlink?: (itemIndex: number) => void;
  onExerciseClick?: (exerciseId: string) => void;
  validationErrors?: ValidationErrors;
}) => {
  const firstExerciseId = exercises[0]?.instanceId;
  const { attributes, listeners, setNodeRef, isDragging } = useSortable({
    id: `top-level-exercise-${firstExerciseId}`,
    data: {
      type: 'top-level-superset',
      instanceId: firstExerciseId,
      length: exercises.length
    },
  });

  const style = {
    // opacity removed
    position: 'relative' as const,
    transform: 'none',
    transition: 'none',
  };

  const exerciseNames = exercises.map((ex) => ex.name || 'Untitled exercise').join(', ');

  const handleDelete = (e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation();
    if (onDelete) {
      const exerciseIds = exercises.map((ex) => ex.instanceId);
      onDelete(exerciseIds);
    }
  };
  const handleUnlink = (e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation();
    if (onUnlink) onUnlink(itemStartIndex);
  };

  return (
    <div ref={setNodeRef} style={style} className="relative">
      <div
        {...attributes}
        {...listeners}
        className={cn(
          'rounded-md border bg-background text-xs select-none cursor-grab active:cursor-grabbing'
        )}
      >
        <div className="flex items-start justify-between px-3 py-2.5">
          <div className="flex-1 min-w-0">
            <div className="flex flex-col gap-1">
              {exercises.map((exercise, index) => (
                <div key={exercise.instanceId} className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground flex-shrink-0" />
                    <span className="text-xs flex-1">{exercise.name || 'Untitled exercise'}</span>
                  </div>
                  {index < exercises.length - 1 && onUnlink && (
                    <div className="flex items-center justify-center py-0.5">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            onClick={handleUnlink}
                            onMouseDown={(e) => e.stopPropagation()}
                            className="p-0.5 rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                          >
                            <Link2Off className="size-3" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent><p>Unlink superset</p></TooltipContent>
                      </Tooltip>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {onExerciseClick && exercises?.[0]?.exerciseId && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onExerciseClick(exercises[0].exerciseId);
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                    className="p-1 rounded text-muted-foreground hover:text-primary hover:bg-accent transition-colors flex-shrink-0"
                  >
                    <Target className="size-3" />
                  </button>
                </TooltipTrigger>
                <TooltipContent><p>Focus exercise in view</p></TooltipContent>
              </Tooltip>
            )}
            <button
              type="button"
              onClick={handleDelete}
              onMouseDown={(e) => e.stopPropagation()}
              className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors flex-shrink-0"
            >
              <Trash2 className="size-3" />
            </button>
            <button
              type="button"
              onClick={(e) => e.stopPropagation()}
              className="cursor-grab active:cursor-grabbing p-0.5 -mr-1 rounded select-none text-muted-foreground hover:text-foreground flex-shrink-0"
            >
              <GripVertical className="size-3" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};


export const OverviewPanel = ({ items, onItemsChange, groupExercisesBySuperset, onDeleteSection, onDeleteExercise, onDeleteTopLevelExercise, onDeleteSuperset, onDeleteTopLevelSuperset, onUnlinkSuperset, onUnlinkTopLevelSuperset, onExerciseClick, validationErrors, isSectionMode = false }: OverviewPanelProps) => {

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const [activeOverviewItem, setActiveOverviewItem] = React.useState<ActiveOverviewItem | null>(null);
  const [activeGapId, setActiveGapId] = React.useState<string | null>(null);

  // ... (useMemos)
  const sections = React.useMemo(() =>
    items
      .filter((item): item is { itemType: 'section'; section: WorkoutSection } => item.itemType === 'section')
      .map((item) => item.section),
    [items]
  );

  const topLevelExercises = React.useMemo(() =>
    items
      .filter((item): item is { itemType: 'exercise'; exercise: ExerciseWithSuperset } => item.itemType === 'exercise')
      .map((item) => item.exercise),
    [items]
  );

  const handleOverviewDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const activeId = active.id as string;

    if (activeId.startsWith('section-')) {
      setActiveOverviewItem({ type: 'section', sectionId: activeId.replace('section-', '') });
    } else if (activeId.startsWith('top-level-exercise-')) {
      const instanceId = activeId.replace('top-level-exercise-', '');
      const data = active.data.current;
      if (data && data.type === 'top-level-superset') {
        setActiveOverviewItem({ type: 'topLevelSuperset', instanceId, length: data.length || 0 });
      } else {
        setActiveOverviewItem({ type: 'topLevelExercise', instanceId });
      }
    } else if (activeId.startsWith('exercise-|')) {
      const [, sectionId, exerciseId] = activeId.split('|');
      const section = items
        .filter((i): i is { itemType: 'section'; section: WorkoutSection } => i.itemType === 'section')
        .find(i => i.section.id === sectionId)?.section;

      if (section?.exercises) {
        const exercises = section.exercises;
        const centerIndex = exercises.findIndex((ex) => ex.instanceId === exerciseId);
        if (centerIndex !== -1) {
          const groupId = exercises[centerIndex].supersetGroupId;
          let startIndex = centerIndex, endIndex = centerIndex;
          if (groupId) {
            while (startIndex > 0 && exercises[startIndex - 1].supersetGroupId === groupId) startIndex--;
            while (endIndex < exercises.length - 1 && exercises[endIndex + 1].supersetGroupId === groupId) endIndex++;
          }
          setActiveOverviewItem({
            type: 'exerciseGroup',
            sectionId,
            startIndex,
            length: endIndex - startIndex + 1,
          });
        }
      }
    }
  };

  const handleOverviewDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) {
      setActiveGapId(null);
      return;
    }

    if (active.id === over.id) {
      setActiveGapId(null);
      return;
    }

    const overId = String(over.id);

    // 1. If strictly over a gap, activate it
    if (overId.startsWith('gap-')) {
      setActiveGapId(overId);
      return;
    }

    // 2. If over an Item, snap to nearest gap
    // Items are: section-{id}, top-level-exercise-{id}, exercise-|{secId}|{exId}
    // We need to parse items to find their index and determine 'before' or 'after' gap.

    const overRect = over.rect;
    if (!overRect) return;

    // Calculate mouse Y relative to center
    let currentPointerY: number;
    if (active.rect.current.translated) {
      currentPointerY = active.rect.current.translated.top + active.rect.current.translated.height / 2;
    } else {
      currentPointerY = overRect.top + overRect.height / 2;
    }

    const overCenterY = overRect.top + overRect.height / 2;
    const isTopHalf = currentPointerY < overCenterY;

    // Helper to find gap ID based on item context
    // This logic relies on consistent naming conventions for gaps used in render

    let targetGapId = null;

    if (overId.startsWith('section-')) {
      // It's a section card.
      // If we are dragging another section, we drop before/after this section (Root Level Gaps)
      // If we are dragging an exercise, we might be dropping INSIDE the section or around it.
      // However, usually 'inside' is handled by the droppable area inside the card.
      // But let's simplify: if hovering the generic Section Card Item (Sortable), we treat it as "Root Level Position".
      // To drop *inside*, the user should drag over the internal droppable or the gaps *inside* the section.

      const sectionId = overId.replace('section-', '');
      const idx = items.findIndex(i => i.itemType === 'section' && i.section.id === sectionId);
      if (idx !== -1) {
        // Gap logic: Gap K is before Item K. Gap K+1 is after Item K.
        const gapIndex = isTopHalf ? idx : idx + 1;
        targetGapId = `gap-root-${gapIndex}`;
      }

    } else if (overId.startsWith('top-level-exercise-')) {
      // Root level exercise
      const instanceId = overId.replace('top-level-exercise-', '');
      const idx = items.findIndex(i => i.itemType === 'exercise' && i.exercise.instanceId === instanceId);
      if (idx !== -1) {
        let actualGapIndex = isTopHalf ? idx : idx + 1;

        // Check for superset grouping if we are calculating "after" (or generally to be safe)
        // If the item is part of a superset, "after" should mean "after the whole group" because visually it's one row
        const exItem = items[idx];
        if (exItem.itemType === 'exercise' && exItem.exercise.supersetGroupId) {
          const groupId = exItem.exercise.supersetGroupId;

          if (isTopHalf) {
            // If top half, we want the start of the group
            let start = idx;
            while (start > 0) {
              const prev = items[start - 1];
              if (prev.itemType === 'exercise' && prev.exercise.supersetGroupId === groupId) {
                start--;
              } else {
                break;
              }
            }
            actualGapIndex = start;
          } else {
            // If bottom half, we want the end of the group
            let end = idx;
            while (end < items.length - 1) {
              const next = items[end + 1];
              if (next.itemType === 'exercise' && next.exercise.supersetGroupId === groupId) {
                end++;
              } else {
                break;
              }
            }
            actualGapIndex = end + 1;
          }
        }

        targetGapId = `gap-root-${actualGapIndex}`;
      }
    } else if (overId.startsWith('exercise-|')) {
      // Exercise inside a section
      const [, secId, exId] = overId.split('|');
      const secItem = items.find(i => i.itemType === 'section' && i.section.id === secId);
      if (secItem && secItem.itemType === 'section') {
        // We need to find the *flat index* of this exercise group within the section's rendered list
        // This is tricky because of superset grouping.
        // Let's rely on the data passed to the Sortable Item which might help, or recalculate.

        // Simplified: Find the group index in the section
        const section = secItem.section;
        if (section.exercises) {
          const groups = groupExercisesBySuperset(section.exercises);
          // Find which group contains exId
          const groupIndex = groups.findIndex(g => g.some(e => e.instanceId === exId));
          if (groupIndex !== -1) {
            const gapIndex = isTopHalf ? groupIndex : groupIndex + 1;
            targetGapId = `gap-section-${secId}-${gapIndex}`;
          }
        }
      }
    } else if (overId.startsWith('section-droppable-')) {
      // Dropping into empty section or explicitly on the container
      const secId = overId.replace('section-droppable-', '');
      // If empty, target gap 0
      // If empty, target gap 0
      targetGapId = `gap-section-${secId}-0`;
    }

    // Force strict check: if we are dragging a section, we CANNOT target a section-level gap
    if (active.id.toString().startsWith('section-') && targetGapId && targetGapId.includes('gap-section-')) {
      targetGapId = null;
    }

    setActiveGapId(targetGapId);
  };

  const handleOverviewDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveOverviewItem(null);
    setActiveGapId(null);

    if (!over) return;

    // Check if dropped on a gap
    const overId = String(over.id);
    let targetData = over.data.current;

    // If dropped on an item but NOT a gap, try to infer the gap from the activeGapId state if it matches the proximity
    // (This acts as a fallback if the user releases mouse *near* a gap but technically over an item)
    if (!overId.startsWith('gap-') && activeGapId) {
      // We trust the activeGapId calculation from DragOver
      // But we need to reconstruct the data for that gap since we don't have the gap's data object here directly
      // ACTUALLY: We can just parse the activeGapId string since we encode info in it.
      // gap-root-{index}
      // gap-section-{secId}-{index}

      if (activeGapId.startsWith('gap-root-')) {
        const index = parseInt(activeGapId.replace('gap-root-', ''), 10);
        targetData = { type: 'gap', level: 'root', index };
      } else if (activeGapId.startsWith('gap-section-')) {
        const parts = activeGapId.split('-'); // gap, section, {id}, {index}
        // id might contain dashes? standard UUIDs do.
        // gap-section-UUID-INDEX
        // Last part is index.
        const indexStr = parts.pop();
        const index = parseInt(indexStr || '0', 10);
        const secId = parts.slice(2).join('-');
        targetData = { type: 'gap', level: 'section', sectionId: secId, index };
      }
    }

    // If still no valid target gap data, abort
    if (!targetData || targetData.type !== 'gap') return;

    const sourceId = String(active.id);
    if (sourceId === overId) return;

    // 1. Extract Source Items
    let sourceList: WorkoutSchemaItem[] = JSON.parse(JSON.stringify(items));
    let movedItems: ExerciseWithSuperset[] = [];
    let payloadType: 'exercise' | 'superset' | 'section' = 'exercise';

    // REMOVAL LOGIC
    if (sourceId.startsWith('section-')) {
      payloadType = 'section';
      const sectionId = sourceId.replace('section-', '');
      const idx = sourceList.findIndex(i => i.itemType === 'section' && i.section.id === sectionId);
      if (idx !== -1) {
        movedItems = []; // It's a section, handled differently
        const [removed] = sourceList.splice(idx, 1);
        // We'll handle section reordering separately if needed, or unify.
        // For now, let's say 'movedItems' is empty and we carry the section object differently?
        // Actually, let's separate Section Move vs Exercise Move.

        // Re-insert section
        if (targetData.level === 'root') {
          let insertIndex = targetData.index;
          // Adjust index if we removed from before the target
          if (idx < insertIndex) insertIndex--;

          sourceList.splice(insertIndex, 0, removed);
          onItemsChange(sourceList);
          return;
        } else {
          // Trying to drop section inside a section? Not allowed.
          return;
        }
      }
    } else if (sourceId.startsWith('top-level-exercise-')) {
      const id = sourceId.replace('top-level-exercise-', '');
      const idx = sourceList.findIndex(i => i.itemType === 'exercise' && i.exercise.instanceId === id);

      if (idx !== -1) {
        const item = sourceList[idx];
        if (item.itemType !== 'exercise') return;
        const ex = item.exercise;
        if (ex.supersetGroupId) {
          payloadType = 'superset';
          let start = idx;
          while (start > 0) {
            const prevItem = sourceList[start - 1];
            if (prevItem.itemType === 'exercise' && prevItem.exercise?.supersetGroupId === ex.supersetGroupId) {
              start--;
            } else {
              break;
            }
          }
          const group: ExerciseWithSuperset[] = [];
          let curr = start;
          while (curr < sourceList.length) {
            const currItem = sourceList[curr];
            if (currItem.itemType === 'exercise' && currItem.exercise?.supersetGroupId === ex.supersetGroupId) {
              group.push(currItem.exercise);
              curr++;
            } else {
              break;
            }
          }
          movedItems = group;
          sourceList.splice(start, group.length);
        } else {
          movedItems.push(ex);
          sourceList.splice(idx, 1);
        }
      }
    } else if (sourceId.startsWith('exercise-|')) {
      const [, secId, exId] = sourceId.split('|');
      const secIdx = sourceList.findIndex(i => i.itemType === 'section' && i.section.id === secId);
      if (secIdx !== -1) {
        const secItem = sourceList[secIdx];
        if (secItem.itemType !== 'section') return;
        const sec = secItem.section;
        const exIdx = sec.exercises?.findIndex((e: ExerciseWithSuperset) => e.instanceId === exId) ?? -1;
        if (exIdx !== -1 && sec.exercises) {
          const ex = sec.exercises[exIdx];
          if (ex.supersetGroupId) {
            payloadType = 'superset';
            const group = sec.exercises.filter((e: ExerciseWithSuperset) => e.supersetGroupId === ex.supersetGroupId);
            movedItems = group;
            sec.exercises = sec.exercises.filter((e: ExerciseWithSuperset) => e.supersetGroupId !== ex.supersetGroupId);
          } else {
            movedItems = [ex];
            sec.exercises.splice(exIdx, 1);
          }
        }
        sourceList[secIdx] = { itemType: 'section', section: { ...sec } };
      }
    }

    if (movedItems.length === 0 && payloadType !== 'section') return;

    // INSERTION LOGIC using targetData (Gap)
    if (targetData.level === 'root') {
      let insertIndex = targetData.index;

      // Adjust index if we removed from root and the removed index was < insertIndex
      // For exercises, we need to know where they came from.
      // Simplified: The gap index is based on the list state *before* drop. 
      // If we removed items from *before* the gap, the insertion point shifts.
      // However, we just mutated 'sourceList' by removing items.
      // If we compute removal first, the index might be wrong if we don't account for it.

      // Let's re-calculate:
      // 'targetData.index' is the index in the OLD list.
      // We need the index in the NEW list (sourceList).

      // If source was distinct (e.g. from section to root), we just insert at index.
      // If source was root and moved within root:
      //    Old Index < Target Index: We removed from before, so we insert at Target - 1 (or -length).
      //    Old Index > Target Index: We removed from after, so insert at Target.

      // To do this robustly:
      // We need the original index of the moved item.
      // Let's go back and capture it during removal.

      // ...Actually, simpler heuristic for drag/drop within same list:
      // references usually handle this, but with explicit indexes it's manual.

      // Let's assume 'targetData.index' is intended destination.
      // We need to know how many items were removed from "before" this destination in the 'sourceList'.

      // Optimization:
      // 1. Calculate insertion index in the *original* list.
      // 2. Remove items.
      // 3. Adjust insertion index.

      // BUT 'sourceList' is already mutated above.
      // Let's simply reconstruct.

      // It is safer to:
      // 1. Identify what to move.
      // 2. Identify where to put it.
      // 3. Execute.

      // Re-do removal logic to capture original indices?
      // Wait, DndKit 'over.id' is based on current render.
      // So targetData.index is 100% correct relative to the *visible* list at start of drag.

      /* 
         Example: [A, B, C, D]
         Move A to after C (Gap 3).
         Remove A -> [B, C, D].
         Original Target Gap Index = 3.
         Since A was at 0 (< 3), we decrement target: 3 - 1 = 2.
         Insert at 2 -> [B, C, A, D]. Correct.
         
         Example: [A, B, C, D]
         Move C to before A (Gap 0).
         Remove C -> [A, B, D].
         Original Target Gap 0.
         C was at 2 (> 0). No decrement.
         Insert at 0 -> [C, A, B, D]. Correct.
      */

      const count = movedItems.length;

      // If moving within root (top-level to top-level), adjust index if we removed from before the insertion point
      if (sourceId.startsWith('top-level-') && targetData.level === 'root') {
        const rawId = sourceId.replace('top-level-exercise-', '');
        const originalIdx = items.findIndex(i => i.itemType === 'exercise' && i.exercise.instanceId === rawId);

        if (originalIdx !== -1 && originalIdx < targetData.index) {
          insertIndex -= count;
        }
      }

      const newItemsWrapped = movedItems
        .filter(ex => !!ex)
        .map(ex => ({ itemType: 'exercise' as const, exercise: ex }));
      sourceList.splice(insertIndex, 0, ...newItemsWrapped);

    } else if (targetData.level === 'section') {
      const secId = targetData.sectionId;
      const secIdx = sourceList.findIndex(i => i.itemType === 'section' && i.section.id === secId);
      if (secIdx !== -1) {
        const secItem = sourceList[secIdx];
        if (secItem.itemType !== 'section') return;
        const sec = secItem.section;
        const newExercises = [...(sec.exercises || [])];
        let insertIndex = targetData.index;

        // Same adjustment logic applies if we moved FROM this same section
        if (sourceId.startsWith('exercise-|' + secId)) {
          // Moved from within SAME section
          const [, sId, exId] = sourceId.split('|');
          // Recover original index from 'items' (immutable param)
          const oldSecItem = items.find(i => i.itemType === 'section' && i.section.id === secId);
          if (oldSecItem && oldSecItem.itemType === 'section' && oldSecItem.section.exercises) {
            // We need the index of the Group if using groups, or flat index?
            // Review Render Loop:
            // DropGap indices in section are based on GROUPS.
            // "groups.forEach..." -> gapIndex refers to GROUP index.

            // So 'insertIndex' is a GROUP index.
            // We need to convert that to a flat exercise index for splicing 'newExercises'.

            // 1. Reconstruct groups from 'newExercises' (content AFTER removal)
            // This is hard because we need to insert into the flattened array at the correct spot.

            // Alternative:
            // Since we know the target is "Before Group X" or "After Group Y".
            // We can just find the flat index of the start of Group X.

            // Let's use the 'items' (original) to map 'targetData.index' (Group Index) to a Flat Index.
            // originalGroups = groupExercises(oldSection.exercises)
            // If targetData.index == 0 -> Flat Index 0.
            // If targetData.index == K -> Sum of lengths of groups 0..K-1.

            const originalGroups = groupExercisesBySuperset(oldSecItem.section.exercises);
            // originalFlatInsertionIndex
            let originalFlatIdx = 0;
            for (let i = 0; i < targetData.index; i++) {
              originalFlatIdx += originalGroups[i]?.length || 0;
            }

            // Now we check if we removed from *before* this point in the flat list.
            const exToRemoveId = sourceId.split('|')[2];
            const originalExIdx = oldSecItem.section.exercises.findIndex(e => e.instanceId === exToRemoveId);

            // If we removed from before, we shift active insertion point
            if (originalExIdx !== -1 && originalExIdx < originalFlatIdx) {
              originalFlatIdx -= movedItems.length;
            }

            insertIndex = originalFlatIdx;
          }
        } else {
          // Moved from elsewhere. No adjustment needed, but we need to map Group Index to Flat Index of handling 'sourceList' section content.
          // Wait, 'sourceList' has the section *without* the moved items (if they were in it? No, handled above).

          // If we moved from OUTSIDE this section, 'newExercises' is just raw list.
          // We calculate insertion point based on CURRENT content of 'sourceList' section? 
          // No, based on Rendered mapping.
          // Rendered Gaps correspond to structure in 'items'.

          // Map Group Index -> Flat Index using 'items' (snapshot).
          const oldSecItem = items.find(i => i.itemType === 'section' && i.section.id === secId);
          if (oldSecItem && oldSecItem.itemType === 'section' && oldSecItem.section.exercises) {
            const originalGroups = groupExercisesBySuperset(oldSecItem.section.exercises);
            let flatIdx = 0;
            for (let i = 0; i < targetData.index; i++) {
              flatIdx += originalGroups[i]?.length || 0;
            }
            insertIndex = flatIdx;
          }
        }

        newExercises.splice(insertIndex, 0, ...movedItems);
        sourceList[secIdx] = { itemType: 'section', section: { ...sec, exercises: newExercises } };
      }
    }

    onItemsChange(sourceList);
  };





  const rootSortableIds = React.useMemo(() => {
    return items.map((item) => {
      if (item.itemType === 'exercise') {
        return `top-level-exercise-${item.exercise.instanceId}`;
      } else {
        return `section-${item.section.id}`;
      }
    });
  }, [items]);

  return (
    <>
      <h2 className="text-left mb-0 px-1 pb-2">Overview</h2>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleOverviewDragStart}
        onDragOver={handleOverviewDragOver}
        onDragEnd={handleOverviewDragEnd}
        modifiers={[restrictToVerticalAxis, restrictToFirstScrollableAncestor]}
      >
        <SortableContext
          items={rootSortableIds}
          strategy={verticalListSortingStrategy}
        >
          <div className="flex flex-col px-1 pt-0 pb-20 min-h-[500px]" id="root-droppable">
            {items.length > 0 ? (
              (() => {
                const renderedItems: React.ReactElement[] = [];
                let itemIndex = 0;

                // Add initial gap (before first item)
                if (!isSectionMode) {
                  renderedItems.push(
                    <DropGap
                      key="gap-root-0"
                      id={`gap-root-0`}
                      data={{ type: 'gap', level: 'root', index: 0 }}
                      isActive={activeGapId === 'gap-root-0'}
                    />
                  );
                }

                while (itemIndex < items.length) {
                  const item = items[itemIndex];

                  if (item.itemType === 'exercise') {
                    const exercise = item.exercise;
                    if (exercise.supersetGroupId) {
                      const supersetExercises: ExerciseWithSuperset[] = [exercise];
                      let nextIndex = itemIndex + 1;
                      while (
                        nextIndex < items.length &&
                        items[nextIndex].itemType === 'exercise' &&
                        (items[nextIndex] as { itemType: 'exercise'; exercise: ExerciseWithSuperset }).exercise.supersetGroupId === exercise.supersetGroupId
                      ) {
                        supersetExercises.push((items[nextIndex] as { itemType: 'exercise'; exercise: ExerciseWithSuperset }).exercise);
                        nextIndex++;
                      }
                      renderedItems.push(
                        <OverviewTopLevelSupersetRow
                          key={`top-level-superset-${exercise.instanceId}`}
                          exercises={supersetExercises}
                          itemStartIndex={itemIndex}
                          onDelete={onDeleteTopLevelSuperset}
                          onUnlink={onUnlinkTopLevelSuperset}
                          onExerciseClick={onExerciseClick}
                          validationErrors={validationErrors}
                        />
                      );
                      itemIndex = nextIndex;
                    } else {
                      renderedItems.push(
                        <OverviewTopLevelExerciseRow
                          key={exercise.instanceId}
                          exercise={exercise}
                          onDelete={onDeleteTopLevelExercise}
                          onExerciseClick={onExerciseClick}
                        />
                      );
                      itemIndex++;
                    }
                  } else {
                    const section = item.section;
                    const sectionSortableIds: string[] = [];
                    if (section.exercises) {
                      const groups = groupExercisesBySuperset(section.exercises);
                      groups.forEach(group => {
                        if (group.length > 0) {
                          sectionSortableIds.push(`exercise-|${section.id}|${group[0].instanceId}`);
                        }
                      });
                    }

                    renderedItems.push(
                      <OverviewSectionCard
                        key={section.id}
                        section={section}
                        onDelete={onDeleteSection}
                        hideDragAndDelete={isSectionMode}
                      >
                        <SortableContext items={sectionSortableIds} strategy={verticalListSortingStrategy}>
                          <div className="px-2 py-0 flex flex-col min-h-[50px]">
                            {section.exercises && section.exercises.length > 0 ? (
                              (() => {
                                const sectionContent: React.ReactElement[] = [];
                                const groups = groupExercisesBySuperset(section.exercises);
                                let exerciseIndex = 0;
                                let sectionGapIndex = 0;

                                // Initial gap inside section
                                sectionContent.push(
                                  <DropGap
                                    key={`gap-section-${section.id}-0`}
                                    id={`gap-section-${section.id}-0`}
                                    data={{ type: 'gap', level: 'section', sectionId: section.id, index: 0 }}
                                    isActive={activeGapId === `gap-section-${section.id}-0`}
                                    isDisabled={activeOverviewItem?.type === 'section'}
                                  />
                                );
                                sectionGapIndex++;

                                groups.forEach((exerciseGroup, groupIndex) => {
                                  const groupStartIndex = exerciseIndex;
                                  exerciseIndex += exerciseGroup.length;

                                  if (exerciseGroup.length > 1 && exerciseGroup[0]?.supersetGroupId) {
                                    sectionContent.push(
                                      <OverviewSupersetRow
                                        key={`superset-${section.id}-${exerciseGroup[0].instanceId}-${groupIndex}`}
                                        sectionId={section.id}
                                        exercises={exerciseGroup}
                                        exerciseStartIndex={groupStartIndex}
                                        onDelete={onDeleteSuperset}
                                        onUnlink={onUnlinkSuperset}
                                        onExerciseClick={onExerciseClick}
                                        validationErrors={validationErrors}
                                      />
                                    );
                                  } else {
                                    exerciseGroup.forEach((exercise, indexInGroup) => {
                                      sectionContent.push(
                                        <OverviewExerciseRow
                                          key={`${exercise.instanceId}-${indexInGroup}`}
                                          sectionId={section.id}
                                          exercise={exercise}
                                          onDelete={onDeleteExercise}
                                          onExerciseClick={onExerciseClick}
                                        />
                                      );
                                    });
                                  }

                                  sectionContent.push(
                                    <DropGap
                                      key={`gap-section-${section.id}-${sectionGapIndex}`}
                                      id={`gap-section-${section.id}-${sectionGapIndex}`}
                                      data={{ type: 'gap', level: 'section', sectionId: section.id, index: sectionGapIndex }}
                                      isActive={activeGapId === `gap-section-${section.id}-${sectionGapIndex}`}
                                      isDisabled={activeOverviewItem?.type === 'section'}
                                    />
                                  );
                                  sectionGapIndex++;
                                });

                                return sectionContent;
                              })()
                            ) : (
                              // For empty sections, show instruction + a gap
                              <>
                                <DropGap
                                  key={`gap-section-${section.id}-0`}
                                  id={`gap-section-${section.id}-0`}
                                  data={{ type: 'gap', level: 'section', sectionId: section.id, index: 0 }}
                                  isActive={activeGapId === `gap-section-${section.id}-0`}
                                  isDisabled={activeOverviewItem?.type === 'section'}
                                />
                                <div className="text-xs text-muted-foreground px-1 py-2 italic text-center opacity-50 pointer-events-none min-h-[20px]">
                                </div>
                              </>
                            )}
                          </div>
                        </SortableContext>
                      </OverviewSectionCard>
                    );
                    itemIndex++;
                  }

                  // Add gap after this item (using the CURRENT itemIndex which points to the next item)
                  if (!isSectionMode) {
                    renderedItems.push(
                      <DropGap
                        key={`gap-root-${itemIndex}`}
                        id={`gap-root-${itemIndex}`}
                        data={{ type: 'gap', level: 'root', index: itemIndex }}
                        isActive={activeGapId === `gap-root-${itemIndex}`}
                      />
                    );
                  }
                }

                return renderedItems;
              })()
            ) : (
              // If completely empty, show one gap
              <>
                {!isSectionMode && (
                  <DropGap
                    key="gap-root-0"
                    id="gap-root-0"
                    data={{ type: 'gap', level: 'root', index: 0 }}
                    isActive={activeGapId === 'gap-root-0'}
                  />
                )}
                <p className="text-xs text-muted-foreground">
                  Exercises and sections will appear here once created.
                </p>
              </>
            )}
          </div>
        </SortableContext>

        {/* Invisible DragOverlay */}
        <DragOverlay dropAnimation={null}>
          {null}
        </DragOverlay>
      </DndContext>
    </>
  );
};
