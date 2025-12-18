'use client';

import React from 'react';
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Target, GripVertical, Link2, Trash2 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

type ExerciseWithSuperset = {
  exerciseId: string;
  instanceId: string;
  name: string;
  exerciseType?: 'weight_reps' | 'reps' | 'distance_duration';
  equipments?: string[];
  supersetGroupId?: string | null;
  sets?: Array<{
    setNumber: number;
    type?: 'warmUp' | 'normal' | 'failure' | 'dropset';
    reps?: string;
    weight?: string;
    rest?: string;
    distance?: string;
    duration?: string;
  }>;
};

type Section = {
  id: string;
  type: 'regular' | 'amrap' | 'timed';
  exercises?: ExerciseWithSuperset[];
};

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
    };

type OverviewPanelProps = {
  sections: Section[];
  onSectionsChange: (sections: Section[]) => void;
  onDeleteSection: (sectionId: string) => void;
  onDeleteExercise: (sectionId: string, exerciseId: string) => void;
  onDeleteSuperset: (sectionId: string, exerciseIds: string[]) => void;
  groupExercisesBySuperset: (exercises: ExerciseWithSuperset[]) => ExerciseWithSuperset[][];
  onExerciseClick?: (exerciseId: string) => void;
};

const OverviewSectionCard = ({
  section,
  children,
  onDelete,
}: {
  section: Section;
  children: React.ReactNode;
  onDelete: (sectionId: string) => void;
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `section-${section.id}`,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <div
        className={cn(
          'border rounded-lg bg-sidebar shadow-sm mb-2 select-none',
          isDragging && 'opacity-80'
        )}
      >
        <div className="flex items-center justify-between px-3 py-2 border-b">
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
              <Trash2 className="size-4" />
            </button>
          </div>
          <button
            type="button"
            {...listeners}
            className="cursor-grab active:cursor-grabbing p-1 -mr-1 rounded select-none text-muted-foreground hover:text-foreground"
            aria-label="Reorder section"
          >
            <GripVertical className="size-4" />
          </button>
        </div>
        {children}
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
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <div
        {...listeners}
        className={cn(
          'flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-xs select-none cursor-grab active:cursor-grabbing',
          isDragging && 'opacity-80 shadow-sm'
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
          'rounded-md border bg-background text-xs select-none cursor-grab active:cursor-grabbing',
          isDragging && 'opacity-80 shadow-sm'
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
  sections,
  onSectionsChange,
  onDeleteSection,
  onDeleteExercise,
  onDeleteSuperset,
  groupExercisesBySuperset,
  onExerciseClick,
}: OverviewPanelProps) => {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 10 } }));
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
      >
        <SortableContext
          items={sections.map((section) => `section-${section.id}`)}
          strategy={verticalListSortingStrategy}
        >
          <div className="flex flex-col gap-3">
            {sections.length > 0 ? (
              sections.map((section) => (
                <OverviewSectionCard key={section.id} section={section} onDelete={onDeleteSection}>
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
            ) : (
              <p className="text-xs text-muted-foreground">
                Sections will appear here once created.
              </p>
            )}
          </div>
        </SortableContext>
      </DndContext>
    </>
  );
};
