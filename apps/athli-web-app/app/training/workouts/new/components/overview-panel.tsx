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
          <div className="flex items-center gap-2">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {section.type}{' '}
              <span className="font-normal">
                ({section.exercises ? section.exercises.length : 0})
              </span>
            </div>
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
          </div>
          <button
            type="button"
            {...attributes}
            {...listeners}
            onClick={(e) => e.stopPropagation()}
            className="cursor-grab active:cursor-grabbing p-0.5 -mr-1 rounded select-none text-muted-foreground hover:text-foreground"
            aria-label="Reorder section"
          >
            <GripVertical className="size-3" />
          </button>
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
      if (!overId.startsWith('top-level-exercise-')) {
        setActiveOverviewItem(null);
        return;
      }

      const activeInstanceId = activeOverviewItem.instanceId;
      const overInstanceId = overId.replace('top-level-exercise-', '');

      if (activeInstanceId === overInstanceId) {
        setActiveOverviewItem(null);
        return;
      }

      const oldIndex = topLevelExercises.findIndex((ex) => ex.instanceId === activeInstanceId);
      const newIndex = topLevelExercises.findIndex((ex) => ex.instanceId === overInstanceId);

      if (oldIndex === -1 || newIndex === -1) {
        setActiveOverviewItem(null);
        return;
      }

      // Reorder top-level exercises
      const reorderedExercises = arrayMove(topLevelExercises, oldIndex, newIndex);

      // Rebuild items array with reordered top-level exercises
      const newItems: WorkoutSchemaItem[] = items.map((item) => {
        if (item.itemType === 'exercise') {
          const index = topLevelExercises.findIndex((ex) => ex.instanceId === item.exercise.instanceId);
          if (index !== -1) {
            return { ...item, exercise: reorderedExercises[index] };
          }
        }
        return item;
      });

      onItemsChange(newItems);
      setActiveOverviewItem(null);
      return;
    }

    if (activeOverviewItem.type === 'section') {
      if (!overId.startsWith('section-')) {
        setActiveOverviewItem(null);
        return;
      }

      const activeSectionId = activeOverviewItem.sectionId;
      const overSectionId = overId.replace('section-', '');

      if (activeSectionId === overSectionId) {
        setActiveOverviewItem(null);
        return;
      }

      const oldIndex = sections.findIndex((s) => s.id === activeSectionId);
      const newIndex = sections.findIndex((s) => s.id === overSectionId);
      if (oldIndex === -1 || newIndex === -1) {
        setActiveOverviewItem(null);
        return;
      }

      onSectionsChange(arrayMove(sections, oldIndex, newIndex));
      setActiveOverviewItem(null);
      return;
    }

    if (activeOverviewItem.type === 'exerciseGroup') {
      let targetSectionId = activeOverviewItem.sectionId;
      let targetExerciseId: string | null = null;

      if (overId.startsWith('section-')) {
        targetSectionId = overId.replace('section-', '');
      } else if (overId.startsWith('exercise-')) {
        const [, sectionId, exerciseId] = overId.split('|');
        targetSectionId = sectionId;
        targetExerciseId = exerciseId;
      }

      const sourceSectionId = activeOverviewItem.sectionId;
      const { startIndex, length } = activeOverviewItem;

      const updatedSections = [...sections];
      const sourceSectionIndex = updatedSections.findIndex((s) => s.id === sourceSectionId);
      const targetSectionIndex = updatedSections.findIndex((s) => s.id === targetSectionId);
      if (sourceSectionIndex === -1 || targetSectionIndex === -1) {
        setActiveOverviewItem(null);
        return;
      }

      const sourceSection = updatedSections[sourceSectionIndex];
      const targetSection = updatedSections[targetSectionIndex];
      if (!sourceSection.exercises) {
        setActiveOverviewItem(null);
        return;
      }

      const sourceExercises = [...sourceSection.exercises];

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

      sourceExercises.splice(startIndex, length);

      if (targetExerciseId && groupExerciseIds.has(targetExerciseId)) {
        updatedSections[sourceSectionIndex] = {
          ...sourceSection,
          exercises: sourceExercises,
        };
        onSectionsChange(updatedSections);
        setActiveOverviewItem(null);
        return;
      }

      let targetExercises = [...(targetSection.exercises || [])];
      let toIndex = targetExercises.length;

      if (targetExerciseId) {
        const existingIndex = targetExercises.findIndex((ex) => ex.exerciseId === targetExerciseId);
        if (existingIndex !== -1) {
          toIndex = existingIndex;
        }
      }

      if (sourceSectionId === targetSectionId) {
        targetExercises = [...sourceExercises];

        if (targetExerciseId) {
          const existingIndex = targetExercises.findIndex(
            (ex) => ex.exerciseId === targetExerciseId
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

        updatedSections[sourceSectionIndex] = {
          ...sourceSection,
          exercises: targetExercises,
        };
      } else {
        targetExercises.splice(toIndex, 0, ...groupExercises);

        updatedSections[sourceSectionIndex] = {
          ...sourceSection,
          exercises: sourceExercises,
        };
        updatedSections[targetSectionIndex] = {
          ...targetSection,
          exercises: targetExercises,
        };
      }

      onSectionsChange(updatedSections);
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
          items={[
            ...topLevelExercises.map((ex) => `top-level-exercise-${ex.instanceId}`),
            ...sections.map((section) => `section-${section.id}`)
          ]}
          strategy={verticalListSortingStrategy}
        >
          <div className="flex flex-col gap-2">
            {/* Top-level exercises (outside sections) - individual cards with drag handles */}
            {topLevelExercises.map((exercise) => (
              <OverviewTopLevelExerciseRow
                key={exercise.instanceId}
                exercise={exercise}
                onDelete={onDeleteTopLevelExercise}
                onExerciseClick={onExerciseClick}
              />
            ))}

            {/* Sections */}
            {sections.length > 0 ? (
              sections.map((section) => (
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
              ))
            ) : topLevelExercises.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Exercises and sections will appear here once created.
              </p>
            ) : null}
          </div>
        </SortableContext>
      </DndContext>
    </>
  );
};
