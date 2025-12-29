'use client';

import React from 'react';
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  PointerSensor,
  KeyboardSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  restrictToVerticalAxis,
  restrictToFirstScrollableAncestor,
} from '@dnd-kit/modifiers';
import { CSS } from '@dnd-kit/utilities';
import { Target, GripVertical, Link2, Trash2 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/general/utils';
import type {
  ExerciseWithSuperset,
  WorkoutSection,
  WorkoutSchemaItem,
} from '../shared/types/workout-builder.types';

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
    };

type OverviewPanelProps = {
  items: WorkoutSchemaItem[];
  onItemsChange: (items: WorkoutSchemaItem[]) => void;
  onDeleteSection: (sectionId: string) => void;
  onDeleteExercise: (sectionId: string, exerciseId: string) => void;
  onDeleteTopLevelExercise: (instanceId: string) => void;
  onDeleteSuperset: (sectionId: string, exerciseIds: string[]) => void;
  groupExercisesBySuperset: (exercises: ExerciseWithSuperset[]) => ExerciseWithSuperset[][];
  onExerciseClick?: (exerciseId: string) => void;
};

const OverviewSectionCard = ({
  section,
  children,
  onDelete,
}: {
  section: WorkoutSection;
  children: React.ReactNode;
  onDelete: (sectionId: string) => void;
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `section-${section.id}`,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <div
        className={cn(
          'border border-primary rounded-lg bg-sidebar shadow-sm mb-2 select-none'
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
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(section.id);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  e.stopPropagation();
                  onDelete(section.id);
                }
              }}
              className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
              aria-label={`Delete ${section.type} section`}
              data-no-row-link="true"
            >
              <Trash2 className="size-3" />
            </button>
            <button
              type="button"
              {...attributes}
              {...listeners}
              onClick={(e) => e.stopPropagation()}
              className="cursor-grab active:cursor-grabbing p-0.5 rounded select-none text-muted-foreground hover:text-foreground"
              aria-label="Reorder section"
            >
              <GripVertical className="size-3" />
            </button>
          </div>
        </div>
        {children}
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
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `top-level-exercise-${exercise.instanceId}`,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <div className="flex items-center gap-2 rounded-md border bg-background px-3 py-1.5 text-xs shadow-sm">
        <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground flex-shrink-0" />
        <span className="text-xs flex-1 min-w-0 truncate">{exercise.name || 'Untitled exercise'}</span>
        {onExerciseClick && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onExerciseClick(exercise.exerciseId);
                }}
                className="p-1 rounded text-muted-foreground hover:text-primary hover:bg-accent transition-colors flex-shrink-0"
                aria-label="Focus exercise in view"
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
          aria-label={`Delete ${exercise.name || 'exercise'}`}
        >
          <Trash2 className="size-3" />
        </button>
        <button
          type="button"
          {...attributes}
          {...listeners}
          onClick={(e) => e.stopPropagation()}
          className="cursor-grab active:cursor-grabbing p-0.5 -mr-1 rounded select-none text-muted-foreground hover:text-foreground flex-shrink-0"
          aria-label="Reorder exercise"
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
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `exercise-|${sectionId}|${exercise.instanceId}`,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <div
        {...listeners}
        className={cn(
          'flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-xs select-none cursor-grab active:cursor-grabbing'
        )}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground flex-shrink-0" />
          <span className="text-xs flex-1 min-w-0">{exercise.name || 'Untitled exercise'}</span>
          {onExerciseClick && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onExerciseClick(exercise.exerciseId);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      e.stopPropagation();
                      onExerciseClick(exercise.exerciseId);
                    }
                  }}
                  onMouseDown={(e) => e.stopPropagation()}
                  className="p-1 rounded text-muted-foreground hover:text-primary hover:bg-accent transition-colors"
                  aria-label="Focus exercise in view"
                  data-no-row-link="true"
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
              onDelete(sectionId, exercise.exerciseId);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                e.stopPropagation();
                onDelete(sectionId, exercise.exerciseId);
              }
            }}
            onMouseDown={(e) => e.stopPropagation()}
            className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
            aria-label={`Delete ${exercise.name || 'exercise'}`}
            data-no-row-link="true"
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
  onDelete,
  onExerciseClick,
}: {
  sectionId: string;
  exercises: ExerciseWithSuperset[];
  onDelete: (sectionId: string, exerciseIds: string[]) => void;
  onExerciseClick?: (exerciseId: string) => void;
}) => {
  const firstExerciseId = exercises[0]?.instanceId;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `exercise-|${sectionId}|${firstExerciseId}`,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const exerciseNames = exercises.map((ex) => ex.name || 'Untitled exercise').join(', ');

  const handleDelete = (e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation();
    const exerciseIds = exercises.map((ex) => ex.exerciseId);
    onDelete(sectionId, exerciseIds);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      e.stopPropagation();
      handleDelete(e);
    }
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
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
                  {index < exercises.length - 1 && (
                    <div className="flex items-center justify-center py-0.5">
                      <Link2 className="size-3 text-muted-foreground" />
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
                      // Focus on the first exercise in the superset
                      onExerciseClick(exercises[0].exerciseId);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        e.stopPropagation();
                        onExerciseClick(exercises[0].exerciseId);
                      }
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                    className="p-1 rounded text-muted-foreground hover:text-primary hover:bg-accent transition-colors flex-shrink-0"
                    aria-label="Focus exercise in view"
                    data-no-row-link="true"
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
              onClick={handleDelete}
              onKeyDown={handleKeyDown}
              onMouseDown={(e) => e.stopPropagation()}
              className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors flex-shrink-0"
              aria-label={`Delete superset group: ${exerciseNames}`}
              data-no-row-link="true"
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

export const OverviewPanel = ({
  items,
  onItemsChange,
  onDeleteSection,
  onDeleteExercise,
  onDeleteTopLevelExercise,
  onDeleteSuperset,
  groupExercisesBySuperset,
  onExerciseClick,
}: OverviewPanelProps) => {
  // Extract sections from items for backward compatibility with existing logic
  const sections = items
    .filter((item): item is { itemType: 'section'; section: WorkoutSection } => item.itemType === 'section')
    .map((item) => item.section);

  // Extract top-level exercises
  const topLevelExercises = items
    .filter((item): item is { itemType: 'exercise'; exercise: ExerciseWithSuperset } => item.itemType === 'exercise')
    .map((item) => item.exercise);

  const onSectionsChange = (updatedSections: WorkoutSection[]) => {
    // Rebuild items array preserving top-level exercises
    const newItems: WorkoutSchemaItem[] = items.map((item) => {
      if (item.itemType === 'section') {
        const updatedSection = updatedSections.find((s) => s.id === item.section.id);
        if (updatedSection) {
          return { ...item, section: updatedSection };
        }
      }
      return item;
    });
    onItemsChange(newItems);
  };
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );
  const [activeOverviewItem, setActiveOverviewItem] = React.useState<ActiveOverviewItem | null>(
    null
  );

  const handleOverviewDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const activeId = active.id as string;

    if (activeId.startsWith('section-')) {
      const sectionId = activeId.replace('section-', '');
      setActiveOverviewItem({ type: 'section', sectionId });
      return;
    }

    if (activeId.startsWith('top-level-exercise-')) {
      const instanceId = activeId.replace('top-level-exercise-', '');
      setActiveOverviewItem({ type: 'topLevelExercise', instanceId });
      return;
    }

    if (activeId.startsWith('exercise-')) {
      const [, sectionId, exerciseId] = activeId.split('|');
      const section = sections.find((s) => s.id === sectionId);
      if (!section || !section.exercises) {
        return;
      }

      const exercises = section.exercises;
      const centerIndex = exercises.findIndex((ex) => ex.instanceId === exerciseId);
      if (centerIndex === -1) {
        return;
      }

      const groupId = exercises[centerIndex].supersetGroupId;
      let startIndex = centerIndex;
      let endIndex = centerIndex;

      if (groupId) {
        while (startIndex > 0 && exercises[startIndex - 1].supersetGroupId === groupId) {
          startIndex -= 1;
        }

        while (
          endIndex < exercises.length - 1 &&
          exercises[endIndex + 1].supersetGroupId === groupId
        ) {
          endIndex += 1;
        }
      }

      setActiveOverviewItem({
        type: 'exerciseGroup',
        sectionId,
        startIndex,
        length: endIndex - startIndex + 1,
      });
    }
  };

  const handleOverviewDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || !activeOverviewItem) {
      setActiveOverviewItem(null);
      return;
    }

    const activeId = active.id as string;
    const overId = over.id as string;

    if (activeOverviewItem.type === 'topLevelExercise') {
      const activeInstanceId = activeOverviewItem.instanceId;
      const activeItemIndex = items.findIndex(
        (item) => item.itemType === 'exercise' && item.exercise.instanceId === activeInstanceId
      );

      if (activeItemIndex === -1) {
        setActiveOverviewItem(null);
        return;
      }

      const activeItem = items[activeItemIndex];
      if (activeItem.itemType !== 'exercise') {
        setActiveOverviewItem(null);
        return;
      }

      // Check if dropping into a section or on section exercise
      if (overId.startsWith('exercise-|')) {
        // Dropping on a section exercise - move top-level exercise into that section
        const [, sectionId, targetExerciseId] = overId.split('|');
        const sectionIndex = items.findIndex(
          (item) => item.itemType === 'section' && item.section.id === sectionId
        );

        if (sectionIndex === -1) {
          setActiveOverviewItem(null);
          return;
        }

        const sectionItem = items[sectionIndex];
        if (sectionItem.itemType !== 'section') {
          setActiveOverviewItem(null);
          return;
        }

        // Find target exercise position
        const targetIndex = sectionItem.section.exercises?.findIndex(
          (ex) => ex.instanceId === targetExerciseId
        ) ?? -1;

        if (targetIndex === -1) {
          setActiveOverviewItem(null);
          return;
        }

        // Remove from top-level and add to section
        const newItems = items.filter((_, idx) => idx !== activeItemIndex);
        const updatedSection = { ...sectionItem.section };
        const exercises = [...(updatedSection.exercises || [])];
        exercises.splice(targetIndex, 0, activeItem.exercise);
        updatedSection.exercises = exercises;

        newItems[sectionIndex > activeItemIndex ? sectionIndex - 1 : sectionIndex] = {
          itemType: 'section',
          section: updatedSection,
        };

        onItemsChange(newItems);
        setActiveOverviewItem(null);
        return;
      }

      if (overId.startsWith('section-')) {
        // Dropping on a section - move top-level exercise into that section at the end
        const overSectionId = overId.replace('section-', '');
        const sectionIndex = items.findIndex(
          (item) => item.itemType === 'section' && item.section.id === overSectionId
        );

        if (sectionIndex === -1) {
          setActiveOverviewItem(null);
          return;
        }

        const sectionItem = items[sectionIndex];
        if (sectionItem.itemType !== 'section') {
          setActiveOverviewItem(null);
          return;
        }

        // Remove from top-level and add to section at the end
        const newItems = items.filter((_, idx) => idx !== activeItemIndex);
        const updatedSection = { ...sectionItem.section };
        updatedSection.exercises = [...(updatedSection.exercises || []), activeItem.exercise];

        newItems[sectionIndex > activeItemIndex ? sectionIndex - 1 : sectionIndex] = {
          itemType: 'section',
          section: updatedSection,
        };

        onItemsChange(newItems);
        setActiveOverviewItem(null);
        return;
      }

      if (overId.startsWith('top-level-exercise-')) {
        // Reordering within top-level exercises
        const overInstanceId = overId.replace('top-level-exercise-', '');
        const overItemIndex = items.findIndex(
          (item) => item.itemType === 'exercise' && item.exercise.instanceId === overInstanceId
        );

        if (overItemIndex === -1 || activeItemIndex === overItemIndex) {
          setActiveOverviewItem(null);
          return;
        }

        const newItems = arrayMove(items, activeItemIndex, overItemIndex);
        onItemsChange(newItems);
        setActiveOverviewItem(null);
        return;
      }

      setActiveOverviewItem(null);
      return;
    }

    if (activeOverviewItem.type === 'section') {
      const activeSectionId = activeOverviewItem.sectionId;
      const activeItemIndex = items.findIndex(
        (item) => item.itemType === 'section' && item.section.id === activeSectionId
      );

      if (activeItemIndex === -1) {
        setActiveOverviewItem(null);
        return;
      }

      let overItemIndex = -1;

      if (overId.startsWith('section-')) {
        const overSectionId = overId.replace('section-', '');
        overItemIndex = items.findIndex(
          (item) => item.itemType === 'section' && item.section.id === overSectionId
        );
      } else if (overId.startsWith('top-level-exercise-')) {
        const overInstanceId = overId.replace('top-level-exercise-', '');
        overItemIndex = items.findIndex(
          (item) => item.itemType === 'exercise' && item.exercise.instanceId === overInstanceId
        );
      }

      if (overItemIndex === -1 || activeItemIndex === overItemIndex) {
        setActiveOverviewItem(null);
        return;
      }

      const newItems = arrayMove(items, activeItemIndex, overItemIndex);
      onItemsChange(newItems);
      setActiveOverviewItem(null);
      return;
    }

    if (activeOverviewItem.type === 'exerciseGroup') {
      const sourceSectionId = activeOverviewItem.sectionId;
      const { startIndex, length } = activeOverviewItem;

      // Find source section in items
      const sourceSectionItemIndex = items.findIndex(
        (item) => item.itemType === 'section' && item.section.id === sourceSectionId
      );

      if (sourceSectionItemIndex === -1) {
        setActiveOverviewItem(null);
        return;
      }

      const sourceSectionItem = items[sourceSectionItemIndex];
      if (sourceSectionItem.itemType !== 'section' || !sourceSectionItem.section.exercises) {
        setActiveOverviewItem(null);
        return;
      }

      const sourceExercises = [...sourceSectionItem.section.exercises];

      if (
        startIndex < 0 ||
        startIndex >= sourceExercises.length ||
        startIndex + length > sourceExercises.length
      ) {
        setActiveOverviewItem(null);
        return;
      }

      const groupExercises = sourceExercises.slice(startIndex, startIndex + length);
      const groupExerciseIds = new Set(groupExercises.map((ex) => ex.exerciseId));

      // Check if dropping on top-level exercise - move to top-level
      if (overId.startsWith('top-level-exercise-')) {
        const overInstanceId = overId.replace('top-level-exercise-', '');
        const topLevelExerciseIndex = items.findIndex(
          (item) => item.itemType === 'exercise' && item.exercise.instanceId === overInstanceId
        );

        if (topLevelExerciseIndex === -1) {
          setActiveOverviewItem(null);
          return;
        }

        // Remove from section
        sourceExercises.splice(startIndex, length);
        const updatedSourceSection = {
          ...sourceSectionItem.section,
          exercises: sourceExercises,
        };

        // Add to top-level at the target position
        const newItems = [...items];
        newItems[sourceSectionItemIndex] = {
          itemType: 'section',
          section: updatedSourceSection,
        };

        // Insert exercises as top-level items at the target position
        groupExercises.forEach((exercise, idx) => {
          newItems.splice(topLevelExerciseIndex + idx, 0, {
            itemType: 'exercise',
            exercise,
          });
        });

        onItemsChange(newItems);
        setActiveOverviewItem(null);
        return;
      }

      // Check if dropping on section or section exercise
      let targetSectionId = sourceSectionId;
      let targetExerciseId: string | null = null;

      if (overId.startsWith('section-')) {
        targetSectionId = overId.replace('section-', '');
      } else if (overId.startsWith('exercise-|')) {
        const [, sectionId, exerciseId] = overId.split('|');
        targetSectionId = sectionId;
        targetExerciseId = exerciseId;
      } else {
        setActiveOverviewItem(null);
        return;
      }

      const targetSectionItemIndex = items.findIndex(
        (item) => item.itemType === 'section' && item.section.id === targetSectionId
      );

      if (targetSectionItemIndex === -1) {
        setActiveOverviewItem(null);
        return;
      }

      const targetSectionItem = items[targetSectionItemIndex];
      if (targetSectionItem.itemType !== 'section') {
        setActiveOverviewItem(null);
        return;
      }

      sourceExercises.splice(startIndex, length);

      if (targetExerciseId && groupExerciseIds.has(targetExerciseId)) {
        // Trying to drop on itself
        const updatedSourceSection = {
          ...sourceSectionItem.section,
          exercises: sourceExercises,
        };
        const newItems = [...items];
        newItems[sourceSectionItemIndex] = {
          itemType: 'section',
          section: updatedSourceSection,
        };
        onItemsChange(newItems);
        setActiveOverviewItem(null);
        return;
      }

      let targetExercises = [...(targetSectionItem.section.exercises || [])];
      let toIndex = targetExercises.length;

      if (targetExerciseId) {
        const existingIndex = targetExercises.findIndex((ex) => ex.instanceId === targetExerciseId);
        if (existingIndex !== -1) {
          toIndex = existingIndex;
        }
      }

      if (sourceSectionId === targetSectionId) {
        // Moving within same section
        targetExercises = [...sourceExercises];

        if (targetExerciseId) {
          const existingIndex = targetExercises.findIndex(
            (ex) => ex.instanceId === targetExerciseId
          );
          if (existingIndex !== -1) {
            toIndex = existingIndex;
          } else {
            toIndex = targetExercises.length;
          }
        } else {
          toIndex = targetExercises.length;
        }

        targetExercises.splice(toIndex, 0, ...groupExercises);

        const updatedSection = {
          ...sourceSectionItem.section,
          exercises: targetExercises,
        };

        const newItems = [...items];
        newItems[sourceSectionItemIndex] = {
          itemType: 'section',
          section: updatedSection,
        };

        onItemsChange(newItems);
      } else {
        // Moving between different sections
        targetExercises.splice(toIndex, 0, ...groupExercises);

        const updatedSourceSection = {
          ...sourceSectionItem.section,
          exercises: sourceExercises,
        };

        const updatedTargetSection = {
          ...targetSectionItem.section,
          exercises: targetExercises,
        };

        const newItems = [...items];
        newItems[sourceSectionItemIndex] = {
          itemType: 'section',
          section: updatedSourceSection,
        };
        newItems[targetSectionItemIndex] = {
          itemType: 'section',
          section: updatedTargetSection,
        };

        onItemsChange(newItems);
      }
    }

    setActiveOverviewItem(null);
  };

  return (
    <>
      <h2 className="text-left mb-3">Overview</h2>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleOverviewDragStart}
        onDragEnd={handleOverviewDragEnd}
        modifiers={[restrictToVerticalAxis, restrictToFirstScrollableAncestor]}
      >
        <SortableContext
          items={items.map((item) =>
            item.itemType === 'exercise'
              ? `top-level-exercise-${item.exercise.instanceId}`
              : `section-${item.section.id}`
          )}
          strategy={verticalListSortingStrategy}
        >
          <div className="flex flex-col gap-2">
            {items.length > 0 ? (
              items.map((item) => {
                if (item.itemType === 'exercise') {
                  return (
                    <OverviewTopLevelExerciseRow
                      key={item.exercise.instanceId}
                      exercise={item.exercise}
                      onDelete={onDeleteTopLevelExercise}
                      onExerciseClick={onExerciseClick}
                    />
                  );
                }

                // Section item
                const section = item.section;
                return (
                  <OverviewSectionCard
                    key={section.id}
                    section={section}
                    onDelete={onDeleteSection}
                  >
                    <div className="p-2 flex flex-col gap-1">
                      {section.exercises && section.exercises.length > 0 ? (
                        <SortableContext
                          items={section.exercises.map(
                            (exercise) => `exercise-|${section.id}|${exercise.instanceId}`
                          )}
                          strategy={verticalListSortingStrategy}
                        >
                          {groupExercisesBySuperset(section.exercises).map(
                            (exerciseGroup, groupIndex) => {
                              if (exerciseGroup.length > 1 && exerciseGroup[0]?.supersetGroupId) {
                                return (
                                  <OverviewSupersetRow
                                    key={`superset-${section.id}-${exerciseGroup[0].instanceId}-${groupIndex}`}
                                    sectionId={section.id}
                                    exercises={exerciseGroup}
                                    onDelete={onDeleteSuperset}
                                    onExerciseClick={onExerciseClick}
                                  />
                                );
                              }
                              return exerciseGroup.map((exercise, indexInGroup) => (
                                <OverviewExerciseRow
                                  key={`${exercise.instanceId}-${indexInGroup}`}
                                  sectionId={section.id}
                                  exercise={exercise}
                                  onDelete={onDeleteExercise}
                                  onExerciseClick={onExerciseClick}
                                />
                              ));
                            }
                          )}
                        </SortableContext>
                      ) : (
                        <div className="text-xs text-muted-foreground px-1 py-2">
                          No exercises yet.
                        </div>
                      )}
                    </div>
                  </OverviewSectionCard>
                );
              })
            ) : (
              <p className="text-xs text-muted-foreground">
                Exercises and sections will appear here once created.
              </p>
            )}
          </div>
        </SortableContext>
      </DndContext>
    </>
  );
};
