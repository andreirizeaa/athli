'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ButtonGroup, ButtonGroupSeparator } from '@/components/ui/button-group';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Calendar, Check, ChevronLeft, ChevronRight, Copy, Plus, Redo, Search, Trash2, Undo, X, Pencil, MoreHorizontal, Save, ChevronUp, ChevronDown, Eraser, Loader2 } from 'lucide-react';
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from '@dnd-kit/core';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { AddWorkoutSidePanel } from '@/app/training/workouts/components/add-workout-side-panel';
import { CreateWorkoutSidePanel } from '@/app/training/workouts/components/create-workout-side-panel';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/general/utils';
import type { Workout } from '@/components/app/app-shell';
import { getWorkouts, getWorkoutById } from '@/api/coach/coach-workout-service';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DiscardChangesDialog } from '@/components/app/discard-changes-dialog';
import { ConfirmDeleteDialog } from '@/components/app/confirm-delete-dialog';

import { createProgram, editProgram, deletePrograms, updateProgramDetails, type ProgramData } from '@/api/coach/coach-program-service';
import { toast } from 'sonner';
import { EditProgramDetailsSidePanel } from './edit-program-details-side-panel';
import { PROGRAM_TYPES, DIFFICULTY_LEVELS } from '@/lib/constants/training';
import { useTrainingData } from '../../training-data-context';
import { WorkoutBuilder } from '@/app/training/workouts/workout-builder';
import type { WorkoutPayload, WorkoutSectionPayload, WorkoutProgramPayload } from '@/components/training/workout-schema';
import { DEFAULT_EXECUTION_FIELDS } from '@/components/training/workout-schema';
import { Checkbox } from '@/components/ui/checkbox';
import { MultiSelectActionBar } from '@/components/app/multi-select-action-bar';

type ProgramMeta = {
  name: string;
  type: string;
  difficulty: string;
  weeks: string;
  description: string;
};

// Each day in the program can have multiple workout schemas
type ProgramSchema = Array<{
  day: number;
  workouts: WorkoutPayload[] // Full workout schemas instead of just IDs
}>;

// Helper component for draggable workout card
const DraggableWorkoutCard = ({
  workout,
  week,
  day,
  onDelete,
  onClick,
  onCopy,
  onSaveToLibrary,
  onCancelCopy,
  onToggleSelect,
  t,
  isDraggingGlobal,
  isCopySource,
  isCopyMode,
  isInLibrary,
  isMultiSelectMode,
  isMultiSelectCopyMode,
  isSelected,
}: {
  workout: Workout & { id: string };
  week: number;
  day: number;
  onDelete: (week: number, day: number, workoutId: string) => void;
  onClick: (week: number, day: number, workout: Workout & { id: string }) => void;
  onCopy: (week: number, day: number, workout: Workout & { id: string }) => void;
  onSaveToLibrary: (workout: Workout & { id: string }) => void;
  onCancelCopy: () => void;
  onToggleSelect: (week: number, day: number, workout: Workout & { id: string }) => void;
  t: any;
  isDraggingGlobal?: boolean;
  isCopySource?: boolean;
  isCopyMode?: boolean;
  isInLibrary?: boolean;
  isMultiSelectMode?: boolean;
  isMultiSelectCopyMode?: boolean;
  isSelected?: boolean;
}) => {
  const { attributes, listeners, setNodeRef, isDragging, transform, node } = useDraggable({
    id: `workout-${workout.id}`,
    data: {
      type: 'workout',
      workout,
      week,
      day,
    },
    disabled: isCopyMode || isMultiSelectMode || isMultiSelectCopyMode, // Disable dragging during copy mode or multi-select
  });

  // Get the original width from the node before it becomes fixed
  const originalWidth = node.current?.offsetWidth;

  const style: React.CSSProperties = {
    transform: transform
      ? `translate3d(${transform.x}px, ${transform.y}px, 0) rotate(3deg)`
      : undefined,
    transformOrigin: 'center center',
    position: 'relative',
    zIndex: transform ? 99999 : undefined,
    pointerEvents: isDragging ? 'none' : undefined,
    transition: isDragging ? 'none' : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...((isCopyMode || isMultiSelectMode || isMultiSelectCopyMode) ? {} : { ...attributes, ...listeners })}
      role="button"
      tabIndex={0}
      aria-label={t('programs.builder.viewDetailsForWorkout', { name: workout.name })}
      onClick={(e) => {
        e.stopPropagation();
        if (isDragging || isCopyMode || isMultiSelectCopyMode) return;
        // In multi-select mode, clicking the card toggles selection instead of opening details
        if (isMultiSelectMode) {
          onToggleSelect(week, day, workout);
          return;
        }
        onClick(week, day, workout);
      }}
      onKeyDown={(event) => {
        if (isCopyMode || isMultiSelectCopyMode) return;
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          event.stopPropagation();
          onClick(week, day, workout);
        }
      }}
      className={cn(
        'workout-card rounded-lg border border-border bg-background flex flex-col items-stretch justify-start p-0 overflow-hidden transition-transform duration-200',
        !isDraggingGlobal && !isCopyMode && !isMultiSelectMode && !isMultiSelectCopyMode && 'cursor-grab active:cursor-grabbing hover:border-primary/50',
        isDragging && 'opacity-0',
        isSelected && 'border-primary'
      )}
    >
      <div className="px-2 py-1 border-b border-border flex items-center justify-between gap-2 bg-muted/30 group/card-header">
        <span
          className="text-[11px] font-medium block truncate"
          title={workout.name}
        >
          {workout.name}
        </span>
        <div className="flex items-center gap-0.5">
          {/* Checkbox for multi-select - visible on hover or when in multi-select mode */}
          <div
            className={cn(
              "flex-shrink-0 transition-opacity",
              isMultiSelectMode || isSelected
                ? "opacity-100"
                : "opacity-0 group-hover/card-header:opacity-100",
              // Hide checkbox in regular copy mode, but keep visible for selected items in multi-select copy mode
              isCopyMode && "invisible",
              isMultiSelectCopyMode && !isSelected && "invisible"
            )}
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <Checkbox
              checked={isSelected}
              onCheckedChange={() => onToggleSelect(week, day, workout)}
              aria-label={t('programs.builder.multiSelect.selectWorkoutAria', { name: workout.name })}
              className="size-3.5"
              disabled={isMultiSelectCopyMode}
            />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "h-5 w-5 flex-shrink-0 -mr-1 text-muted-foreground hover:text-foreground",
                  isCopyMode && "invisible"
                )}
                onClick={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                disabled={isCopyMode}
              >
                <MoreHorizontal className="size-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40" onClick={(e) => e.stopPropagation()}>
              <DropdownMenuItem onClick={(e) => {
                e.stopPropagation();
                onCopy(week, day, workout);
              }}>
                <Copy className="mr-2 size-3.5" />
                <span>Copy</span>
              </DropdownMenuItem>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div>
                      <DropdownMenuItem
                        disabled={isInLibrary}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!isInLibrary) {
                            onSaveToLibrary(workout);
                          }
                        }}
                        className={isInLibrary ? 'opacity-50 cursor-not-allowed' : ''}
                      >
                        <Save className="mr-2 size-3.5" />
                        <span>Save to Library</span>
                      </DropdownMenuItem>
                    </div>
                  </TooltipTrigger>
                  {isInLibrary && (
                    <TooltipContent side="left">
                      <p>This workout is already saved</p>
                    </TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(week, day, workout.id);
                }}
              >
                <Trash2 className="mr-2 size-3.5" />
                <span>{t('general.delete')}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <div className="px-2 py-1 flex items-center justify-between">
        <span className="text-[10px] text-muted-foreground block">
          {workout.totalExercises}{' '}
          {workout.totalExercises === 1 ? t('athletes.trainingCalendar.exercise') : t('athletes.trainingCalendar.exercises')}
        </span>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div
                className={cn(
                  "h-5 w-5 -mr-1 rounded-full text-foreground flex items-center justify-center cursor-pointer hover:bg-primary/10 transition-colors",
                  (isCopyMode || isMultiSelectMode || isMultiSelectCopyMode) && "invisible"
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  if (!isCopyMode && !isMultiSelectMode && !isMultiSelectCopyMode) {
                    onClick(week, day, workout);
                  }
                }}
              >
                <Plus className="size-3" />
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>{t('athletes.trainingCalendar.addExercise')}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
};

// Helper component for droppable day card
const DroppableDayCard = ({
  week,
  day,
  dayNumber,
  workouts,
  isDragOver,
  isSourceDay,
  isDraggingGlobal,
  onOpenAddWorkout,
  onDeleteWorkout,
  onOpenWorkoutDetails,
  onCopyWorkout,
  onSaveToLibrary,
  onCancelCopy,
  onPasteWorkout,
  onCopyDayHover,
  onCopyDayLeave,
  t,
  isCopyMode,
  isCopySource,
  isHoveredForCopy,
  isShiftPressed,
  copiedWorkoutId,
  isPastedDay,
  checkIsInLibrary,
  isMultiSelectMode,
  isMultiSelectCopyMode,
  isMultiSelectHovered,
  onMultiSelectDayHover,
  onMultiSelectDayLeave,
  onMultiSelectPaste,
  onToggleWorkoutSelect,
  isWorkoutSelected,
}: {
  week: number;
  day: number;
  dayNumber: number;
  workouts: Array<Workout & { id: string }>;
  isDragOver: boolean;
  isSourceDay: boolean;
  isDraggingGlobal: boolean;
  onOpenAddWorkout: (day: number) => void;
  onDeleteWorkout: (week: number, day: number, workoutId: string) => void;
  onOpenWorkoutDetails: (week: number, day: number, workout: Workout & { id: string }) => void;
  onCopyWorkout: (week: number, day: number, workout: Workout & { id: string }) => void;
  onSaveToLibrary: (workout: Workout & { id: string }) => void;
  onCancelCopy: () => void;
  onPasteWorkout: (week: number, day: number) => void;
  onCopyDayHover: (week: number, day: number) => void;
  onCopyDayLeave: () => void;
  t: any;
  isCopyMode?: boolean;
  isCopySource?: boolean;
  isHoveredForCopy?: boolean;
  isShiftPressed?: boolean;
  copiedWorkoutId?: string;
  isPastedDay?: boolean;
  checkIsInLibrary?: (workoutId: string) => boolean;
  isMultiSelectMode?: boolean;
  isMultiSelectCopyMode?: boolean;
  isMultiSelectHovered?: boolean;
  onMultiSelectDayHover?: (week: number, day: number) => void;
  onMultiSelectDayLeave?: () => void;
  onMultiSelectPaste?: (week: number, day: number) => void;
  onToggleWorkoutSelect?: (week: number, day: number, workout: Workout & { id: string }) => void;
  isWorkoutSelected?: (week: number, day: number, workoutId: string) => boolean;
}) => {
  const { setNodeRef } = useDroppable({
    id: `day-${week}-${day}`,
    data: {
      type: 'day-drop-zone',
      week,
      day,
    },
  });

  return (
    <div
      ref={setNodeRef}
      onClick={() => {
        if (isCopyMode && !isPastedDay) {
          // In copy mode, clicking pastes the workout
          onPasteWorkout(week, day);
        } else if (isMultiSelectCopyMode && onMultiSelectPaste) {
          onMultiSelectPaste(week, day);
        } else if (!isCopyMode && !isMultiSelectCopyMode) {
          onOpenAddWorkout(dayNumber);
        }
      }}
      onMouseEnter={() => {
        if (isCopyMode && !isPastedDay) {
          onCopyDayHover(week, day);
        } else if (isMultiSelectCopyMode && onMultiSelectDayHover) {
          onMultiSelectDayHover(week, day);
        }
      }}
      onMouseLeave={() => {
        if (isCopyMode) {
          onCopyDayLeave();
        } else if (isMultiSelectCopyMode && onMultiSelectDayLeave) {
          onMultiSelectDayLeave();
        }
      }}
      className={cn(
        'group/day relative flex-1 bg-muted rounded-lg border border-border flex flex-col min-h-0 h-full transition-colors',
        !isCopyMode && !isMultiSelectCopyMode && 'cursor-pointer hover:[&:not(:has(.workout-card:hover))]:border-primary/50',
        isCopyMode && !isPastedDay && 'cursor-pointer hover:border-primary/50',
        isMultiSelectCopyMode && 'cursor-pointer hover:border-primary/50',
        isDragOver && 'border-primary/50'
      )}
    >
      <div className="px-3 py-[2px] border-b border-border flex-shrink-0 flex items-center justify-between">
        <span className="text-xs uppercase text-muted-foreground">{t('programs.builder.dayLabel', { number: dayNumber })}</span>
        {!isCopyMode && !isMultiSelectCopyMode && (
          <Button
            type="button"
            size="icon"
            className={cn(
              'h-4 w-4 -mr-1 rounded-full transition-opacity',
              isDragOver ? 'opacity-100' : 'opacity-0 group-hover/day:opacity-100 group-has-[.workout-card:hover]/day:opacity-0'
            )}
            aria-label={t('programs.builder.addWorkout.addAria')}
            onClick={(e) => {
              e.stopPropagation();
              onOpenAddWorkout(dayNumber);
            }}
          >
            <Plus className="size-3" />
          </Button>
        )}
      </div>
      <div className="flex-1 min-h-0 relative overflow-hidden">
        <div className={cn(
          "absolute inset-0 p-3",
          (isCopySource || isHoveredForCopy) ? "overflow-hidden" : "overflow-y-auto"
        )}>
          {workouts.length > 0 ? (
            <div className="flex flex-col gap-2 relative z-20">
              {workouts.map((workout) => (
                <DraggableWorkoutCard
                  key={workout.id}
                  workout={workout}
                  week={week}
                  day={day}
                  onDelete={onDeleteWorkout}
                  onClick={onOpenWorkoutDetails}
                  onCopy={onCopyWorkout}
                  onSaveToLibrary={onSaveToLibrary}
                  onCancelCopy={onCancelCopy}
                  onToggleSelect={onToggleWorkoutSelect || (() => { })}
                  t={t}
                  isDraggingGlobal={isDraggingGlobal}
                  isCopyMode={isCopyMode}
                  isCopySource={isCopyMode && copiedWorkoutId === workout.id}
                  isInLibrary={checkIsInLibrary ? checkIsInLibrary(workout.id) : false}
                  isMultiSelectMode={isMultiSelectMode}
                  isMultiSelectCopyMode={isMultiSelectCopyMode}
                  isSelected={isWorkoutSelected ? isWorkoutSelected(week, day, workout.id) : false}
                />
              ))}
            </div>
          ) : null}
        </div>

        {/* Source day overlay - shown below header */}
        {isCopySource && !isHoveredForCopy && !isPastedDay && (
          <div className="absolute inset-0 bg-muted z-30 flex flex-col items-center justify-center gap-2 p-2 rounded-b-lg">
            <span className="text-xs text-center text-muted-foreground">
              Hold shift to paste to multiple days
            </span>
            <Button
              variant="outline"
              size="sm"
              className="h-6 text-xs gap-1"
              onClick={(e) => {
                e.stopPropagation();
                onCancelCopy();
              }}
            >
              <X className="size-3" />
              Cancel
            </Button>
          </div>
        )}
        {/* Destination day overlay - shown below header */}
        {/* Destination day overlay - shown below header */}
        {isHoveredForCopy && (
          <div
            className="absolute inset-0 bg-muted z-30 flex flex-col items-center justify-center gap-2 p-2 rounded-b-lg cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              onPasteWorkout(week, day);
            }}
          >
            <Button
              variant="default"
              size="sm"
              className="gap-1 pointer-events-none"
            >
              <Copy className="size-3" />
              {isShiftPressed ? 'Paste' : 'Copy'}
            </Button>
          </div>
        )}
        {/* Multi-select copy destination overlay */}
        {isMultiSelectHovered && (
          <div
            className="absolute inset-0 bg-muted z-30 flex flex-col items-center justify-center gap-2 p-2 rounded-b-lg cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              if (onMultiSelectPaste) {
                onMultiSelectPaste(week, day);
              }
            }}
          >
            <Button
              variant="default"
              size="sm"
              className="gap-1 pointer-events-none"
            >
              <Copy className="size-3" />
              Copy
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

type ProgramBuilderProps = {
  mode: 'new' | 'edit';
  programId?: string;
  initialProgramMeta?: ProgramMeta | null;
  initialData?: {
    workoutsByDay: { [week: number]: { [day: number]: Array<Workout & { id: string }> } };
    totalWeeks: number;
  } | null;
};

export const ProgramBuilder = ({
  mode,
  programId,
  initialProgramMeta,
  initialData,
}: ProgramBuilderProps) => {
  const t = useTranslations();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { workouts: availableWorkouts, refreshPrograms, refreshWorkouts } = useTrainingData();
  const [programMeta, setProgramMeta] = useState<ProgramMeta | null>(initialProgramMeta || null);
  const [selectedWeek, setSelectedWeek] = useState<string>('1');
  const [currentWeek, setCurrentWeek] = useState<number>(1);
  const [totalWeeks, setTotalWeeks] = useState<number>(1);
  const [isAddWorkoutModalOpen, setIsAddWorkoutModalOpen] = useState<boolean>(false);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [workoutsByDay, setWorkoutsByDay] = useState<{
    [week: number]: { [day: number]: Array<Workout & { id: string }> };
  }>({});
  const [history, setHistory] = useState<Array<{
    workoutsByDay: { [week: number]: { [day: number]: Array<Workout & { id: string }> } };
    totalWeeks: number;
  }>>([{ workoutsByDay: {}, totalWeeks: 1 }]);
  const [historyIndex, setHistoryIndex] = useState<number>(0);
  const [isUndoRedo, setIsUndoRedo] = useState<boolean>(false);
  const [isDiscardDialogOpen, setIsDiscardDialogOpen] = useState<boolean>(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  const [initialState, setInitialState] = useState<{
    workoutsByDay: { [week: number]: { [day: number]: Array<Workout & { id: string }> } };
    totalWeeks: number;
  }>({ workoutsByDay: {}, totalWeeks: 1 });
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [selectedWorkoutDetails, setSelectedWorkoutDetails] = useState<{
    week: number;
    day: number;
    workout: Workout & { id: string };
  } | null>(null);
  const [draggedWorkout, setDraggedWorkout] = useState<{
    workout: Workout & { id: string };
    sourceWeek: number;
    sourceDay: number;
  } | null>(null);
  const [dragOverDay, setDragOverDay] = useState<{ week: number; day: number } | null>(null);
  const [weekToClear, setWeekToClear] = useState<number | null>(null);
  const [isSaveToLibraryOpen, setIsSaveToLibraryOpen] = useState(false);
  const [workoutToSave, setWorkoutToSave] = useState<WorkoutPayload | null>(null);

  // Paste lock to prevent double execution
  const isProcessingPaste = useRef(false);

  // Copy mode state
  const [isCopyMode, setIsCopyMode] = useState<boolean>(false);
  const [copiedWorkout, setCopiedWorkout] = useState<{
    workout: Workout & { id: string };
    sourceWeek: number;
    sourceDay: number;
  } | null>(null);
  const [isShiftPressed, setIsShiftPressed] = useState<boolean>(false);
  const [pastedDays, setPastedDays] = useState<Array<{ week: number; day: number }>>([]);
  const [hoveredCopyDay, setHoveredCopyDay] = useState<{ week: number; day: number } | null>(null);

  // Multi-select mode state
  const [isMultiSelectMode, setIsMultiSelectMode] = useState<boolean>(false);
  const [selectedWorkouts, setSelectedWorkouts] = useState<Array<{
    workout: Workout & { id: string };
    week: number;
    day: number;
  }>>([]);
  const [isMultiSelectCopyMode, setIsMultiSelectCopyMode] = useState<boolean>(false);
  const [multiSelectHoveredDay, setMultiSelectHoveredDay] = useState<{ week: number; day: number } | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );


  // Copy mode keyboard event handlers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Shift') {
        setIsShiftPressed(true);
      }
      if (e.key === 'Escape') {
        if (isCopyMode) {
          setIsCopyMode(false);
          setCopiedWorkout(null);
          setPastedDays([]);
          setHoveredCopyDay(null);
        }
        if (isMultiSelectMode || isMultiSelectCopyMode) {
          handleCancelMultiSelect();
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Shift') {
        setIsShiftPressed(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isCopyMode, isMultiSelectMode, isMultiSelectCopyMode]);

  // Exit copy mode when shift is released after pasting at least once
  useEffect(() => {
    if (isCopyMode && !isShiftPressed && pastedDays.length > 0) {
      setIsCopyMode(false);
      setCopiedWorkout(null);
      setPastedDays([]);
      setHoveredCopyDay(null);
    }
  }, [isCopyMode, isShiftPressed, pastedDays.length]);

  const [isEditDetailsOpen, setIsEditDetailsOpen] = useState(false);

  // Workout builder state for creating new workouts inline
  const [isWorkoutBuilderOpen, setIsWorkoutBuilderOpen] = useState(false);
  const [pendingWorkoutDay, setPendingWorkoutDay] = useState<number | null>(null);
  // State for editing an existing workout
  const [editingWorkout, setEditingWorkout] = useState<{
    week: number;
    day: number;
    workout: Workout & { id: string };
  } | null>(null);
  // Loading state for fetching workout data when opening builder
  const [isLoadingWorkoutData, setIsLoadingWorkoutData] = useState(false);
  const [fetchedWorkoutData, setFetchedWorkoutData] = useState<any>(null);


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

  const buildMockPreviewSections = (workout: Workout): PreviewSection[] => {
    return [
      {
        id: 'sec-1',
        type: 'regular',
        exercises: [
          {
            id: 'ex-1',
            name: `${workout.name} - Main lift`,
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

  const initializeEmptyWorkouts = (weeks: number) => {
    const workouts: { [week: number]: { [day: number]: Array<Workout & { id: string }> } } = {};
    for (let i = 1; i <= weeks; i++) {
      workouts[i] = {};
      for (let j = 1; j <= 7; j++) {
        workouts[i][j] = [];
      }
    }
    return workouts;
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (mode === 'new') {
      // Set default values for new program
      setProgramMeta({
        name: t('programs.builder.newProgram'),
        type: PROGRAM_TYPES[0].value,
        difficulty: DIFFICULTY_LEVELS[0].value,
        weeks: '',
        description: '',
      });
    } else if (mode === 'edit' && initialData) {
      // Load program data for edit mode
      setWorkoutsByDay(initialData.workoutsByDay);
      setTotalWeeks(initialData.totalWeeks);
      setHistory([{ workoutsByDay: initialData.workoutsByDay, totalWeeks: initialData.totalWeeks }]);
      setInitialState({ workoutsByDay: initialData.workoutsByDay, totalWeeks: initialData.totalWeeks });
    }
  }, [mode, router, initialData]);

  // Convert day number to week and day within week
  const getWeekAndDay = (dayNumber: number) => {
    const week = Math.ceil(dayNumber / 7);
    const day = ((dayNumber - 1) % 7) + 1;
    return { week, day };
  };

  // Convert week and day to day number
  const getDayNumber = (week: number, day: number) => {
    return (week - 1) * 7 + day;
  };

  const navigateBackToPrograms = () => {
    router.push('/training/programs');
  };

  // Check if there are unsaved changes
  const hasUnsavedChanges = () => {
    // Check if workouts have changed
    const currentWorkoutsStr = JSON.stringify(workoutsByDay);
    const initialWorkoutsStr = JSON.stringify(initialState.workoutsByDay);
    const workoutsChanged = currentWorkoutsStr !== initialWorkoutsStr;

    // Check if totalWeeks has changed
    const weeksChanged = totalWeeks !== initialState.totalWeeks;

    return workoutsChanged || weeksChanged;
  };

  const handleActionWithConfirmation = (action: () => void) => {
    if (hasUnsavedChanges()) {
      setPendingAction(() => action);
      setIsDiscardDialogOpen(true);
    } else {
      action();
    }
  };

  const handleConfirmDiscard = () => {
    setIsDiscardDialogOpen(false);
    if (pendingAction) {
      pendingAction();
      setPendingAction(null);
    }
  };

  const handleCancelDiscard = () => {
    setIsDiscardDialogOpen(false);
    setPendingAction(null);
  };

  const handleCancel = () => {
    handleActionWithConfirmation(() => {
      navigateBackToPrograms();
    });
  };

  const handleSave = async () => {
    if (!programMeta) return;

    setIsSaving(true);
    try {
      // Build the program schema: list of days with full workout schemas
      const programSchema: any[] = [];

      // Iterate through all days (1 to totalWeeks * 7)
      for (let dayNum = 1; dayNum <= totalWeeks * 7; dayNum++) {
        const { week, day } = getWeekAndDay(dayNum);
        const workouts = workoutsByDay[week]?.[day] || [];

        const workoutSchemas: any[] = workouts.map((workout) => {
          // Extract original workout ID from library workouts (format: {workoutId}-{timestamp}-{random})
          // For inline-created workouts, the ID starts with "inline-" so we don't include it
          const workoutIdParts = workout.id.split('-');
          const originalId = workoutIdParts[0] !== 'inline' ? workoutIdParts[0] : undefined;

          return {
            ...(originalId && { id: originalId }),
            title: workout.name,
            description: workout.description || '',
            type: workout.type,
            difficulty: workout.difficulty || 'intermediate',
            equipment: typeof workout.equipment === 'string' ? workout.equipment.split(',').map((e: string) => e.trim()).filter((e: string) => e) : (Array.isArray(workout.equipment) ? workout.equipment : []),
            totalExercises: workout.totalExercises,
            items: workout.workout_data?.items || [],
            ...DEFAULT_EXECUTION_FIELDS,
          };
        });

        if (workoutSchemas.length > 0) {
          programSchema.push({
            day: dayNum,
            workouts: workoutSchemas,
          });
        }
      }

      const programData: ProgramData = {
        name: programMeta.name,
        description: programMeta.description,
        type: programMeta.type,
        difficulty: programMeta.difficulty,
        weeks: totalWeeks.toString(),
        schema: programSchema,
      };

      if (mode === 'edit' && programId) {
        await editProgram(programId, programData);
      } else {
        await createProgram(programData);
      }

      toast.success(t('programs.new.toast.savedSuccessfully', { name: programMeta.name }));

      // Update initial state to reflect saved state
      setInitialState({ workoutsByDay, totalWeeks });

      // Invalidate programs cache to update the table
      await queryClient.invalidateQueries({ queryKey: ['coach-programs'] });

      // Navigate back to programs page
      router.push('/training/programs');
    } catch (error) {
      console.error('Failed to save program:', error);
      toast.error(t('programs.builder.toast.saveFailed'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveClick = async () => {
    await handleSave();
  };

  const handleBreadcrumbClick = (path: string) => {
    handleActionWithConfirmation(() => {
      router.push(path);
    });
  };

  const handlePreviousWeek = () => {
    const newWeek = currentWeek - 1;
    if (newWeek >= 1) {
      setCurrentWeek(newWeek);
    }
  };

  const handleNextWeek = () => {
    const weeksView = parseInt(selectedWeek, 10);
    const newWeek = currentWeek + 1;
    const maxStartWeek = Math.max(1, totalWeeks - weeksView + 1);
    if (newWeek <= maxStartWeek) {
      setCurrentWeek(newWeek);
    }
  };

  const handleAddWeek = () => {
    const newTotalWeeks = totalWeeks + 1;
    saveToHistory(workoutsByDay, newTotalWeeks);
    setTotalWeeks(newTotalWeeks);

    // If currently in 2 or 4 week view, switch to 1 week view
    if (selectedWeek === '2' || selectedWeek === '4') {
      setSelectedWeek('1');
    }
  };

  const handleDuplicateWeek = (weekNumber: number) => {
    const newTotalWeeks = totalWeeks + 1;
    const updatedWorkouts = { ...workoutsByDay };
    // Copy workouts from the week to duplicate to the new week
    if (workoutsByDay[weekNumber]) {
      updatedWorkouts[newTotalWeeks] = JSON.parse(
        JSON.stringify(workoutsByDay[weekNumber])
      );
    }
    saveToHistory(updatedWorkouts, newTotalWeeks);
    setTotalWeeks(newTotalWeeks);

    // If currently in 2 or 4 week view, switch to 1 week view
    if (selectedWeek === '2' || selectedWeek === '4') {
      setSelectedWeek('1');
    }

    toast.success(t('programs.builder.toast.weekDuplicated', { number: weekNumber }));
  };

  const handleInsertWeek = (afterWeek: number) => {
    const newTotalWeeks = totalWeeks + 1;
    const updatedWorkouts: {
      [week: number]: { [day: number]: Array<Workout & { id: string }> };
    } = {};

    // Shift weeks down
    Object.keys(workoutsByDay).forEach((weekKey) => {
      const week = parseInt(weekKey, 10);
      if (week <= afterWeek) {
        updatedWorkouts[week] = workoutsByDay[week];
      } else {
        updatedWorkouts[week + 1] = workoutsByDay[week];
      }
    });

    // Initialize the new week with empty days
    updatedWorkouts[afterWeek + 1] = {};
    for (let j = 1; j <= 7; j++) {
      updatedWorkouts[afterWeek + 1][j] = [];
    }

    saveToHistory(updatedWorkouts, newTotalWeeks);
    setWorkoutsByDay(updatedWorkouts);
    setTotalWeeks(newTotalWeeks);

    // If moving from single week view, we might want to stay on the current week or move to the new one
    // But if we are inserting, we usually want to see where we inserted.
    if (selectedWeek === '1') {
      setCurrentWeek(afterWeek + 1);
    }
  };

  const WeekDivider = ({ onClick, position = 'bottom' }: { onClick: () => void; position?: 'top' | 'bottom' | 'center' }) => {
    // Determine tooltip placement based on divider position
    const tooltipSide = position === 'top' ? 'bottom' : 'top';
    const sideOffset = position === 'center' ? undefined : 4;

    return (
      <div
        className="h-2 relative group flex items-center justify-center cursor-pointer z-40"
        onClick={onClick}
      >
        <div className="absolute inset-x-0 h-[2px] top-1/2 -translate-y-1/2 bg-transparent group-hover:bg-primary transition-colors duration-200" />
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div
                className={cn(
                  "absolute size-6 bg-primary text-primary-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-50",
                  position === 'top' && 'top-[calc(50%+1px)] rounded-b-md rounded-t-none',
                  position === 'bottom' && 'bottom-[calc(50%+1px)] rounded-t-md rounded-b-none',
                  position === 'center' && 'top-1/2 -translate-y-1/2 rounded-md'
                )}
              >
                <Plus className="size-4" />
              </div>
            </TooltipTrigger>
            <TooltipContent side={tooltipSide} sideOffset={sideOffset}>
              <p>Insert week</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    );
  };

  const handleDeleteWeek = (weekNumber: number) => {
    if (totalWeeks > 1) {
      const newTotalWeeks = totalWeeks - 1;
      // Remove workouts from the deleted week
      const updatedWorkouts = { ...workoutsByDay };
      delete updatedWorkouts[weekNumber];
      // Adjust week numbers for weeks after the deleted one
      const reindexedWorkouts: {
        [week: number]: { [day: number]: Array<Workout & { id: string }> };
      } = {};
      Object.keys(updatedWorkouts).forEach((weekKey) => {
        const week = parseInt(weekKey, 10);
        if (week < weekNumber) {
          reindexedWorkouts[week] = updatedWorkouts[week];
        } else if (week > weekNumber) {
          reindexedWorkouts[week - 1] = updatedWorkouts[week];
        }
      });
      saveToHistory(reindexedWorkouts, newTotalWeeks);
      setWorkoutsByDay(reindexedWorkouts);
      setTotalWeeks(newTotalWeeks);

      // Force switch to 1 week view if currently in 2 or 4 week view
      if (selectedWeek === '2' || selectedWeek === '4') {
        setSelectedWeek('1');
      }

      // Adjust current week if needed
      if (currentWeek > newTotalWeeks) {
        setCurrentWeek(Math.max(1, newTotalWeeks));
      }
      toast.success(`Week ${weekNumber} deleted successfully`);
    }
  };

  const handleClearWeek = () => {
    if (weekToClear === null) return;

    setWorkoutsByDay((prev) => {
      const updated = { ...prev };
      if (updated[weekToClear]) {
        // Clear all days in this week
        updated[weekToClear] = {};
        for (let j = 1; j <= 7; j++) {
          updated[weekToClear][j] = [];
        }
      }
      saveToHistory(updated);
      return updated;
    });

    toast.success(`Week ${weekToClear} cleared successfully`);
    setWeekToClear(null);
  };

  const handleSaveDetails = async (details: { name: string; type: string; difficulty: string; description: string }) => {
    // Update local state
    setProgramMeta((prev) => prev ? ({ ...prev, ...details }) : null);

    // If editing an existing program, update backend immediately
    if (mode === 'edit' && programId) {
      try {
        await updateProgramDetails(programId, details);
        toast.success(t('programs.edit.toast.updatedSuccessfully', { name: details.name }));
      } catch (error) {
        console.error('Failed to update program details:', error);
        toast.error('Failed to update details');
      }
    }
  };

  const handleDeleteProgram = async () => {
    if (programId) {
      try {
        await deletePrograms(programId);
        await refreshPrograms();
        toast.success(t('programs.delete.toast.success'));
        router.push('/training/programs');
      } catch (error) {
        console.error('Failed to delete program:', error);
        toast.error(t('programs.delete.toast.error'));
      }
    }
  };

  const saveToHistory = (
    workoutsState: {
      [week: number]: { [day: number]: Array<Workout & { id: string }> };
    },
    weeksState?: number
  ) => {
    if (isUndoRedo) return;
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push({
      workoutsByDay: JSON.parse(JSON.stringify(workoutsState)),
      totalWeeks: weeksState !== undefined ? weeksState : totalWeeks,
    });
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const handleOpenAddWorkoutModal = (day: number) => {
    setSelectedDay(day);
    setIsAddWorkoutModalOpen(true);
  };

  // Handler for "Create new workout" button in AddWorkoutSidePanel
  const handleCreateNewWorkout = () => {
    // Store the day for which we're creating the workout
    setPendingWorkoutDay(selectedDay);
    // Open the workout builder dialog
    setIsWorkoutBuilderOpen(true);
  };

  // Handler for saving a workout from the inline builder
  const handleSaveWorkoutFromBuilder = async (payload: WorkoutProgramPayload) => {
    if (pendingWorkoutDay === null) return;

    const { week, day } = getWeekAndDay(pendingWorkoutDay);

    // Create a workout object from the payload
    const newWorkout: Workout & { id: string } = {
      id: `inline-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: payload.title,
      description: payload.description || '',
      type: payload.type,
      difficulty: payload.difficulty || 'intermediate',
      length: '',
      totalExercises: payload.totalExercises,
      equipment: payload.equipment || [],
      created: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' }).replace(/\//g, '-'),
      isFavourite: false,
      workout_data: {
        // Metadata fields
        title: payload.title,
        description: payload.description || '',
        type: payload.type,
        difficulty: payload.difficulty || 'intermediate',
        equipment: payload.equipment || [],
        totalExercises: payload.totalExercises,
        items: payload.items || [],
        status: payload.status,
        startedAt: payload.startedAt,
        completedAt: payload.completedAt,
        totalDurationMin: payload.totalDurationMin,
        sessionComments: payload.sessionComments,
        totalWeightLifted: payload.totalWeightLifted,
        intensity: payload.intensity,
        readiness: payload.readiness,
        overallNotes: payload.overallNotes,
        rating: payload.rating,
      },
    };

    setWorkoutsByDay((prev) => {
      const updated = { ...prev };
      updated[week] = {
        ...(updated[week] || {}),
        [day]: [...(updated[week]?.[day] || []), newWorkout],
      };
      saveToHistory(updated);
      return updated;
    });

    // Close the builder dialog
    setIsWorkoutBuilderOpen(false);
    setPendingWorkoutDay(null);

    toast.success(`Workout "${payload.title}" added to program`);
  };

  const handleSaveEditedWorkout = (payload: WorkoutProgramPayload) => {
    if (!editingWorkout) return Promise.resolve();

    const { week, day, workout } = editingWorkout;

    setWorkoutsByDay((prev) => {
      const next = { ...prev };
      if (!next[week]) next[week] = {};
      if (!next[week][day]) next[week][day] = [];

      const currentWorkouts = next[week][day];
      const workoutIndex = currentWorkouts.findIndex((w) => w.id === workout.id);

      if (workoutIndex !== -1) {
        // Update existing workout
        const updatedWorkout = {
          ...currentWorkouts[workoutIndex],
          name: payload.title,
          description: payload.description || '',
          type: payload.type,
          difficulty: payload.difficulty || 'intermediate',
          equipment: payload.equipment || [],
          totalExercises: payload.totalExercises,
          workout_data: {
            // Metadata fields
            title: payload.title,
            description: payload.description || '',
            type: payload.type,
            difficulty: payload.difficulty || 'intermediate',
            equipment: payload.equipment || [],
            totalExercises: payload.totalExercises,
            items: payload.items || [],
            status: payload.status,
            startedAt: payload.startedAt,
            completedAt: payload.completedAt,
            totalDurationMin: payload.totalDurationMin,
            sessionComments: payload.sessionComments,
            totalWeightLifted: payload.totalWeightLifted,
            intensity: payload.intensity,
            readiness: payload.readiness,
            overallNotes: payload.overallNotes,
            rating: payload.rating,
          }
        };

        const nextWorkouts = [...currentWorkouts];
        nextWorkouts[workoutIndex] = updatedWorkout;
        next[week][day] = nextWorkouts;

        saveToHistory(next);
      }

      return next;
    });

    setIsWorkoutBuilderOpen(false);
    setEditingWorkout(null);
    toast.success('Workout updated');
    return Promise.resolve();
  };

  const handleSaveWorkoutFromPanel = async (workout: Workout, scheduleOption: string, config: string) => {
    if (!workout || selectedDay === null) return;

    // Fetch full workout data including workout_data
    let fullWorkout: Workout & { workout_data?: any };
    try {
      fullWorkout = await getWorkoutById(workout.id);
    } catch (error) {
      console.error('Failed to fetch full workout data:', error);
      // Fall back to using the workout without workout_data
      fullWorkout = workout;
    }

    // Helper to create a workout with a unique ID
    const createWorkoutInstance = () => ({
      ...fullWorkout,
      id: `${workout.id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    });

    setWorkoutsByDay((prev) => {
      const updated = { ...prev };

      if (scheduleOption === 'once') {
        const { week, day } = getWeekAndDay(selectedDay);
        updated[week] = {
          ...(updated[week] || {}),
          [day]: [...(updated[week]?.[day] || []), createWorkoutInstance()],
        };
      } else if (scheduleOption === 'every' && config) {
        const daysInterval = parseInt(config, 10);
        if (daysInterval > 0) {
          const maxDay = totalWeeks * 7;
          for (let dayNum = selectedDay; dayNum <= maxDay; dayNum += daysInterval) {
            const { week, day } = getWeekAndDay(dayNum);
            updated[week] = {
              ...(updated[week] || {}),
              [day]: [...(updated[week]?.[day] || []), createWorkoutInstance()],
            };
          }
        }
      } else if (scheduleOption === 'weekly' && config) {
        // config is day name (Monday, Tuesday etc)
        const daysMap: { [key: string]: number } = {
          'Monday': 0, 'Tuesday': 1, 'Wednesday': 2, 'Thursday': 3, 'Friday': 4, 'Saturday': 5, 'Sunday': 6
        };
        // Get day index (0-6) from config
        const targetDayIndex = daysMap[config];

        if (targetDayIndex !== undefined) {
          // Get the start date day index based on selected day (assuming day 1 is Monday for simplified logic)
          // Ideally use actual dates, but here we work with relative days 1..7
          // Let's assume day 1 = Monday, day 7 = Sunday
          const targetDay = targetDayIndex + 1; // 1-7

          for (let week = 1; week <= totalWeeks; week++) {
            // For each week, add to the target day
            // Only add if (week-1)*7 + targetDay >= selectedDay
            const dayNum = (week - 1) * 7 + targetDay;

            if (dayNum >= selectedDay) {
              updated[week] = {
                ...(updated[week] || {}),
                [targetDay]: [...(updated[week]?.[targetDay] || []), createWorkoutInstance()],
              };
            }
          }
        }
      }

      saveToHistory(updated);
      return updated;
    });

    // Close modal and reset
    setIsAddWorkoutModalOpen(false);
    setSelectedDay(null);
  };

  const handleDeleteWorkout = (week: number, day: number, workoutId: string) => {
    setWorkoutsByDay((prev) => {
      const weekData = prev[week];
      if (!weekData || !weekData[day]) return prev;
      const updated = {
        ...prev,
        [week]: {
          ...weekData,
          [day]: weekData[day].filter((w) => w.id !== workoutId),
        },
      };
      saveToHistory(updated);
      return updated;
    });
  };

  const handleOpenWorkoutDetails = (
    week: number,
    day: number,
    workout: Workout & { id: string },
  ) => {
    // Open the builder for editing - use workout data directly from state
    setEditingWorkout({ week, day, workout });
    setFetchedWorkoutData(workout.workout_data || { items: [] });
    setIsLoadingWorkoutData(false);
    setIsWorkoutBuilderOpen(true);
  };

  const handleCloseWorkoutDetails = () => {
    setSelectedWorkoutDetails(null);
  };

  const handleSaveToLibrary = (workout: Workout & { id: string }) => {
    // Convert Workout to WorkoutPayload for CreateWorkoutSidePanel
    const workoutPayload: WorkoutPayload = {
      title: workout.name,
      description: workout.description || '',
      type: workout.type,
      difficulty: workout.difficulty || 'intermediate',
      equipment: typeof workout.equipment === 'string' ? workout.equipment.split(',').map((e: string) => e.trim()).filter((e: string) => e) : (Array.isArray(workout.equipment) ? workout.equipment : []),
      totalExercises: workout.totalExercises,
      items: workout.workout_data?.items || [],
      ...DEFAULT_EXECUTION_FIELDS,
    };
    setWorkoutToSave(workoutPayload);
    setIsSaveToLibraryOpen(true);
  };

  // Format date from dd-mm-yy format to "7 Mar, 2025"
  const formatDate = (dateStr: string): string => {
    const [day, month, year] = dateStr.split('-');
    const date = new Date(2000 + parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10));
    const months = [
      t('programs.builder.months.jan'),
      t('programs.builder.months.feb'),
      t('programs.builder.months.mar'),
      t('programs.builder.months.apr'),
      t('programs.builder.months.may'),
      t('programs.builder.months.jun'),
      t('programs.builder.months.jul'),
      t('programs.builder.months.aug'),
      t('programs.builder.months.sep'),
      t('programs.builder.months.oct'),
      t('programs.builder.months.nov'),
      t('programs.builder.months.dec'),
    ];
    return `${date.getDate()} ${months[date.getMonth()]}, 20${year}`;
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      setIsUndoRedo(true);
      const newIndex = historyIndex - 1;
      const state = history[newIndex];
      setHistoryIndex(newIndex);
      setWorkoutsByDay(JSON.parse(JSON.stringify(state.workoutsByDay)));
      setTotalWeeks(state.totalWeeks);
      setTimeout(() => setIsUndoRedo(false), 0);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      setIsUndoRedo(true);
      const newIndex = historyIndex + 1;
      const state = history[newIndex];
      setHistoryIndex(newIndex);
      setWorkoutsByDay(JSON.parse(JSON.stringify(state.workoutsByDay)));
      setTotalWeeks(state.totalWeeks);
      setTimeout(() => setIsUndoRedo(false), 0);
    }
  };

  // Filter logic removed as it's handled in the side panel
  // Filter workouts based on search query
  const filteredWorkouts: Workout[] = [];

  // Calculate week range based on selected week view
  const getWeekRange = () => {
    const weeksView = parseInt(selectedWeek, 10);
    const startWeek = currentWeek;
    const endWeek = Math.min(currentWeek + weeksView - 1, totalWeeks);
    if (weeksView === 1) {
      return t('programs.builder.weekRange', { start: startWeek, total: totalWeeks });
    }
    return t('programs.builder.weekRangeMultiple', { start: startWeek, end: endWeek, total: totalWeeks });
  };

  // Drag and drop handlers
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const data = active.data.current;
    if (data?.type === 'workout') {
      setDraggedWorkout({
        workout: data.workout,
        sourceWeek: data.week,
        sourceDay: data.day,
      });
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { over } = event;
    if (!over) {
      setDragOverDay(null);
      return;
    }
    const data = over.data.current;
    if (data?.type === 'day-drop-zone') {
      setDragOverDay({ week: data.week, day: data.day });
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || !draggedWorkout) {
      setDraggedWorkout(null);
      setDragOverDay(null);
      return;
    }

    const overData = over.data.current;
    if (overData?.type === 'day-drop-zone') {
      const targetWeek = overData.week;
      const targetDay = overData.day;
      const { sourceWeek, sourceDay, workout } = draggedWorkout;

      // Don't do anything if dropping on the same day
      if (sourceWeek === targetWeek && sourceDay === targetDay) {
        setDraggedWorkout(null);
        setDragOverDay(null);
        return;
      }

      // Move workout from source to target
      setWorkoutsByDay((prev) => {
        const updated = { ...prev };

        // Remove from source
        if (updated[sourceWeek]?.[sourceDay]) {
          updated[sourceWeek] = {
            ...updated[sourceWeek],
            [sourceDay]: updated[sourceWeek][sourceDay].filter((w) => w.id !== workout.id),
          };
        }

        // Add to target
        if (!updated[targetWeek]) {
          updated[targetWeek] = {};
        }
        updated[targetWeek] = {
          ...updated[targetWeek],
          [targetDay]: [...(updated[targetWeek]?.[targetDay] || []), workout],
        };

        saveToHistory(updated);
        return updated;
      });
    }

    setDraggedWorkout(null);
    setDragOverDay(null);
  };

  // Copy mode handlers
  const handleStartCopyMode = (week: number, day: number, workout: Workout & { id: string }) => {
    setIsCopyMode(true);
    setCopiedWorkout({ workout, sourceWeek: week, sourceDay: day });
    setPastedDays([]);
    setHoveredCopyDay(null);
  };

  const handleCancelCopyMode = () => {
    setIsCopyMode(false);
    setCopiedWorkout(null);
    setPastedDays([]);
    setHoveredCopyDay(null);
  };

  const handlePasteWorkout = (week: number, day: number) => {
    if (!copiedWorkout || isProcessingPaste.current) return;

    isProcessingPaste.current = true;
    setTimeout(() => {
      isProcessingPaste.current = false;
    }, 300);

    // Create a new workout instance with a unique ID
    const newWorkout: Workout & { id: string } = {
      ...copiedWorkout.workout,
      id: `${copiedWorkout.workout.id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };

    setWorkoutsByDay((prev) => {
      const updated = { ...prev };
      if (!updated[week]) {
        updated[week] = {};
      }
      updated[week] = {
        ...updated[week],
        [day]: [...(updated[week]?.[day] || []), newWorkout],
      };
      saveToHistory(updated);
      return updated;
    });

    // Track pasted days
    setPastedDays((prev) => [...prev, { week, day }]);

    // Clear the hovered day to hide overlay after clicking
    setHoveredCopyDay(null);

    // If not holding shift, exit copy mode after single paste
    if (!isShiftPressed) {
      setIsCopyMode(false);
      setCopiedWorkout(null);
      setPastedDays([]);
    }
  };

  const handleCopyDayHover = (week: number, day: number) => {
    if (isCopyMode && copiedWorkout) {
      // Don't hover over source day
      if (copiedWorkout.sourceWeek === week && copiedWorkout.sourceDay === day) {
        setHoveredCopyDay(null);
        return;
      }
      // Don't hover over days that have already been pasted to
      if (pastedDays.some(pd => pd.week === week && pd.day === day)) {
        setHoveredCopyDay(null);
        return;
      }
      setHoveredCopyDay({ week, day });
    }
  };

  const handleCopyDayLeave = () => {
    setHoveredCopyDay(null);
  };

  // Multi-select handlers
  const handleToggleWorkoutSelection = (week: number, day: number, workout: Workout & { id: string }) => {
    setSelectedWorkouts(prev => {
      const isSelected = prev.some(
        (sw) => sw.workout.id === workout.id && sw.week === week && sw.day === day
      );

      if (isSelected) {
        // Deselect
        const newSelection = prev.filter(
          (sw) => !(sw.workout.id === workout.id && sw.week === week && sw.day === day)
        );

        // If no more selected, exit multi-select mode
        if (newSelection.length === 0) {
          setIsMultiSelectMode(false);
          setIsMultiSelectCopyMode(false);
        }

        return newSelection;
      } else {
        // Check if already exists (safety guard)
        const alreadyExists = prev.some(
          (sw) => sw.workout.id === workout.id && sw.week === week && sw.day === day
        );
        if (alreadyExists) {
          return prev;
        }

        // Select
        setIsMultiSelectMode(true);
        return [...prev, { workout, week, day }];
      }
    });
  };

  const handleCancelMultiSelect = () => {
    setIsMultiSelectMode(false);
    setIsMultiSelectCopyMode(false);
    setSelectedWorkouts([]);
    setMultiSelectHoveredDay(null);
  };

  const handleDeleteSelectedWorkouts = () => {
    setWorkoutsByDay((prev) => {
      const updated = { ...prev };
      selectedWorkouts.forEach(({ week, day, workout }) => {
        if (updated[week]?.[day]) {
          updated[week][day] = updated[week][day].filter((w) => w.id !== workout.id);
        }
      });
      saveToHistory(updated);
      return updated;
    });
    handleCancelMultiSelect();
  };

  const handleStartMultiSelectCopy = () => {
    setIsMultiSelectCopyMode(true);
    setMultiSelectHoveredDay(null);
  };

  const handleMultiSelectPaste = (targetWeek: number, targetDay: number) => {
    if (selectedWorkouts.length === 0 || isProcessingPaste.current) return;

    isProcessingPaste.current = true;
    setTimeout(() => {
      isProcessingPaste.current = false;
    }, 300);

    // Sort selected workouts by day number to maintain relative positions
    const sortedWorkouts = [...selectedWorkouts].sort((a, b) => {
      const aDayNum = getDayNumber(a.week, a.day);
      const bDayNum = getDayNumber(b.week, b.day);
      return aDayNum - bDayNum;
    });

    // Deduplicate based on workout.id + week + day
    const uniqueWorkouts = sortedWorkouts.filter((item, index, self) =>
      index === self.findIndex((t) => (
        t.workout.id === item.workout.id && t.week === item.week && t.day === item.day
      ))
    );

    if (uniqueWorkouts.length === 0) return;

    // Get the earliest day number from the selection
    const earliestDayNum = getDayNumber(uniqueWorkouts[0].week, uniqueWorkouts[0].day);
    const targetDayNum = getDayNumber(targetWeek, targetDay);

    // PRE-GENERATE all new workouts with their target positions BEFORE the state setter
    // This is critical - creating them inside the setter causes duplicates in StrictMode
    const workoutsToAdd: Array<{
      newWeek: number;
      newDay: number;
      newWorkout: Workout & { id: string };
    }> = [];

    uniqueWorkouts.forEach(({ workout, week, day }) => {
      // Calculate the offset from the earliest day
      const workoutDayNum = getDayNumber(week, day);
      const dayOffset = workoutDayNum - earliestDayNum;

      // Calculate the target day for this workout
      const newTargetDayNum = targetDayNum + dayOffset;
      const { week: newWeek, day: newDay } = getWeekAndDay(newTargetDayNum);

      // Only add if within bounds
      if (newWeek >= 1 && newWeek <= totalWeeks && newDay >= 1 && newDay <= 7) {
        // Create a new workout with a unique ID
        const newWorkout: Workout & { id: string } = {
          ...workout,
          id: `${workout.id.split('-')[0]}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        };

        workoutsToAdd.push({ newWeek, newDay, newWorkout });
      }
    });

    // Now update state with the pre-generated workouts
    setWorkoutsByDay((prev) => {
      const updated = { ...prev };

      workoutsToAdd.forEach(({ newWeek, newDay, newWorkout }) => {
        // Initialize the week if needed
        if (!updated[newWeek]) {
          updated[newWeek] = {};
        }

        // Check if this workout already exists (handles StrictMode double-invocation)
        const existingWorkouts = updated[newWeek]?.[newDay] || [];
        const alreadyExists = existingWorkouts.some(w => w.id === newWorkout.id);

        if (!alreadyExists) {
          // Add to the target day
          updated[newWeek][newDay] = [...existingWorkouts, newWorkout];
        }
      });

      saveToHistory(updated);
      return updated;
    });

    // Exit multi-select copy mode after paste
    handleCancelMultiSelect();
  };

  const handleMultiSelectDayHover = (week: number, day: number) => {
    if (isMultiSelectCopyMode) {
      setMultiSelectHoveredDay({ week, day });
    }
  };

  const handleMultiSelectDayLeave = () => {
    setMultiSelectHoveredDay(null);
  };

  // Check if a workout is selected
  const isWorkoutSelected = (week: number, day: number, workoutId: string): boolean => {
    return selectedWorkouts.some(
      (sw) => sw.workout.id === workoutId && sw.week === week && sw.day === day
    );
  };

  // Check if 2 weeks view is available
  const is2WeeksAvailable = totalWeeks % 2 === 0;
  // Check if 4 weeks view is available
  const is4WeeksAvailable = totalWeeks % 4 === 0;

  // Calculate number of rows based on selected week view
  const getRowsCount = () => {
    const weeksView = parseInt(selectedWeek, 10);
    return weeksView;
  };

  // Calculate days for each row
  const getDaysForRow = (rowIndex: number) => {
    // Determine the actual week number for this row based on the current scroll position (currentWeek)
    const weekNumber = currentWeek + rowIndex;
    // Calculate the start day number (1-based)
    // Week 1 starts at day 1, Week 2 starts at day 8, etc.
    const startDay = (weekNumber - 1) * 7 + 1;
    return Array.from({ length: 7 }, (_, i) => startDay + i);
  };

  if (!programMeta) {
    return null;
  }

  const pageTitle = mode === 'new'
    ? t('programs.builder.newProgram')
    : `Editing ${programMeta.name}`;

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
                    onClick={() => handleBreadcrumbClick('/training/programs')}
                    className="cursor-pointer hover:bg-accent hover:text-accent-foreground px-0.5 py-0.5 rounded transition-colors text-foreground"
                  >
                    {t('programs.detail.breadcrumb.programs')}
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="text-muted-foreground/60">
                  <ChevronRight className="h-2 w-2" />
                </BreadcrumbSeparator>
                <BreadcrumbItem>
                  <BreadcrumbPage className="px-0.5 font-semibold text-foreground">
                    {programMeta.name}
                  </BreadcrumbPage>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="text-muted-foreground/60">
                  <ChevronRight className="h-2 w-2" />
                </BreadcrumbSeparator>
                <BreadcrumbItem>
                  <BreadcrumbPage className="font-semibold text-foreground px-0.5 capitalize">
                    {mode === 'new' ? t('general.new') : t('general.edit')}
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
            <h1 className="text-[22px] font-semibold truncate">{pageTitle}</h1>
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
              aria-label={t('programs.builder.cancelAria')}
            >
              <X className="size-4" />
              <span>{t('programs.builder.cancel')}</span>
            </Button>
            <Button onClick={handleSaveClick} disabled={isSaving} className="gap-2" aria-label={t('programs.builder.saveAria')}>
              {isSaving ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Check className="size-4" />
              )}
              <span>{t('programs.builder.save')}</span>
            </Button>
          </ButtonGroup>
        </div>
        <Separator className="absolute bottom-[-1px] left-0 right-0" />
      </div>
      <div className="w-full relative">
        <div className="w-full px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={handlePreviousWeek}
                    disabled={currentWeek === 1}
                    className="h-8 w-8"
                    aria-label={t('programs.builder.previousWeekAria')}
                  >
                    <ChevronUp className="size-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{t('programs.builder.previousWeek')}</p>
                </TooltipContent>
              </Tooltip>

              <div className="flex items-center gap-2">
                <Calendar className="size-4 text-muted-foreground" />
                <span className="text-sm font-medium">{getWeekRange()}</span>
              </div>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={handleNextWeek}
                    disabled={
                      (() => {
                        const weeksView = parseInt(selectedWeek, 10);
                        const maxStartWeek = totalWeeks - weeksView + 1;
                        return currentWeek >= maxStartWeek;
                      })()
                    }
                    className="h-8 w-8"
                    aria-label={t('programs.builder.nextWeekAria')}
                  >
                    <ChevronDown className="size-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{t('programs.builder.nextWeek')}</p>
                </TooltipContent>
              </Tooltip>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddWeek}
                className="gap-2 h-8"
                aria-label={t('programs.builder.addWeekAria')}
              >
                <Plus className="size-4" />
                <span>{t('programs.builder.addWeek')}</span>
              </Button>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleUndo}
                    disabled={historyIndex <= 0}
                    className="h-8 w-8 p-0"
                    aria-label={t('programs.builder.undoAria')}
                  >
                    <Undo className="size-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{t('programs.builder.undo')}</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleRedo}
                    disabled={historyIndex >= history.length - 1}
                    className="h-8 w-8 p-0"
                    aria-label={t('programs.builder.redoAria')}
                  >
                    <Redo className="size-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{t('programs.builder.redo')}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <Tabs value={selectedWeek} onValueChange={setSelectedWeek}>
            <TabsList className="w-auto">
              <TabsTrigger
                value="1"
                className="data-[state=active]:border-primary data-[state=active]:bg-primary/5 data-[state=active]:text-primary dark:data-[state=active]:border-primary dark:data-[state=active]:bg-primary/5 dark:data-[state=active]:text-primary"
                title={t('programs.builder.showOneWeek')}
              >
                1 week
              </TabsTrigger>
              <TabsTrigger
                value="2"
                disabled={!is2WeeksAvailable}
                className="data-[state=active]:border-primary data-[state=active]:bg-primary/5 data-[state=active]:text-primary dark:data-[state=active]:border-primary dark:data-[state=active]:bg-primary/5 dark:data-[state=active]:text-primary disabled:opacity-50 disabled:cursor-not-allowed"
                title={
                  is2WeeksAvailable
                    ? t('programs.builder.showTwoWeeks')
                    : t('programs.builder.twoWeeksRequirement')
                }
              >
                2 weeks
              </TabsTrigger>
              <TabsTrigger
                value="4"
                disabled={!is4WeeksAvailable}
                className="data-[state=active]:border-primary data-[state=active]:bg-primary/5 data-[state=active]:text-primary dark:data-[state=active]:border-primary dark:data-[state=active]:bg-primary/5 dark:data-[state=active]:text-primary disabled:opacity-50 disabled:cursor-not-allowed"
                title={
                  is4WeeksAvailable
                    ? t('programs.builder.showFourWeeks')
                    : t('programs.builder.fourWeeksRequirement')
                }
              >
                4 weeks
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>


        {programMeta && (
          <EditProgramDetailsSidePanel
            open={isEditDetailsOpen}
            onOpenChange={setIsEditDetailsOpen}
            programMeta={programMeta}
            onSave={handleSaveDetails}
            onDelete={mode === 'edit' ? handleDeleteProgram : undefined}
          />
        )}

        <Separator className="absolute bottom-[-1px] left-0 right-0" />
      </div>
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className={cn("w-full flex-1 overflow-auto bg-background px-4 py-1", isShiftPressed && "select-none")}>
          <div className="h-full flex flex-col">
            {Array.from({ length: getRowsCount() }, (_, rowIndex) => {
              const weekNumber = currentWeek + rowIndex;
              const weekWorkouts = workoutsByDay[weekNumber] || {};
              const hasWorkoutsInWeek = Object.values(weekWorkouts).some(dayWorkouts => dayWorkouts.length > 0);

              return (
                <div key={rowIndex} className="flex flex-col flex-1 min-h-0">
                  {/* Divider above the first week in view to allow insertion before it */}
                  {rowIndex === 0 && (
                    <WeekDivider onClick={() => handleInsertWeek(weekNumber - 1)} position="top" />
                  )}
                  <div className="flex gap-1.5 flex-1 min-h-0">
                    <div className="w-8 bg-background rounded-md border border-border flex-shrink-0 flex flex-col justify-between py-1">
                      <div className="flex items-center justify-center pt-5 pb-0">
                        <span className="text-[10px] uppercase text-muted-foreground -rotate-90 whitespace-nowrap">
                          {t('programs.builder.weekLabel', { number: weekNumber })}
                        </span>
                      </div>
                      <div className="flex flex-col items-center gap-0 p-1 flex-shrink-0">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => setWeekToClear(weekNumber)}
                                disabled={!hasWorkoutsInWeek}
                                aria-label={t('programs.builder.clearWeekAria')}
                              >
                                <Eraser className="size-3" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{t('programs.builder.clearWeek')}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => handleDuplicateWeek(weekNumber)}
                                disabled={!hasWorkoutsInWeek}
                                aria-label={t('programs.builder.duplicateWeekAria')}
                              >
                                <Copy className="size-3" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{t('programs.builder.duplicateWeek')}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => handleDeleteWeek(weekNumber)}
                                disabled={totalWeeks === 1}
                                aria-label={t('programs.builder.deleteWeekAria')}
                              >
                                <Trash2 className="size-3" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="bottom">
                              <p>{t('programs.builder.deleteWeek')}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </div>
                    {getDaysForRow(rowIndex).map((day) => {
                      const { week, day: dayInWeek } = getWeekAndDay(day);
                      const workouts = workoutsByDay[week]?.[dayInWeek] || [];
                      const isDragOver = dragOverDay?.week === week && dragOverDay?.day === dayInWeek;
                      const isSourceDay = draggedWorkout?.sourceWeek === week && draggedWorkout?.sourceDay === dayInWeek;
                      const isCopySourceDay = copiedWorkout?.sourceWeek === week && copiedWorkout?.sourceDay === dayInWeek;
                      const isHoveredForCopy = hoveredCopyDay?.week === week && hoveredCopyDay?.day === dayInWeek;
                      const isPastedDay = pastedDays.some(pd => pd.week === week && pd.day === dayInWeek);

                      return (
                        <DroppableDayCard
                          key={day}
                          week={week}
                          day={dayInWeek}
                          dayNumber={day}
                          workouts={workouts}
                          isDragOver={isDragOver}
                          isSourceDay={isSourceDay}
                          isDraggingGlobal={!!draggedWorkout}
                          onOpenAddWorkout={handleOpenAddWorkoutModal}
                          onDeleteWorkout={handleDeleteWorkout}
                          onOpenWorkoutDetails={handleOpenWorkoutDetails}
                          onCopyWorkout={handleStartCopyMode}
                          onSaveToLibrary={handleSaveToLibrary}
                          onCancelCopy={handleCancelCopyMode}
                          onPasteWorkout={handlePasteWorkout}
                          onCopyDayHover={handleCopyDayHover}
                          onCopyDayLeave={handleCopyDayLeave}
                          t={t}
                          isCopyMode={isCopyMode}
                          isCopySource={isCopySourceDay}
                          isHoveredForCopy={isHoveredForCopy}
                          isShiftPressed={isShiftPressed}
                          copiedWorkoutId={copiedWorkout?.workout.id}
                          isPastedDay={isPastedDay}
                          checkIsInLibrary={(workoutId) => {
                            // Workouts added from library have IDs like "{libraryId}-{timestamp}-{random}"
                            // Inline-created workouts have IDs like "inline-{timestamp}-{random}"
                            // Check if workoutId starts with any library workout ID
                            return availableWorkouts.some(w => workoutId.startsWith(w.id));
                          }}
                          isMultiSelectMode={isMultiSelectMode}
                          isMultiSelectCopyMode={isMultiSelectCopyMode}
                          isMultiSelectHovered={multiSelectHoveredDay?.week === week && multiSelectHoveredDay?.day === dayInWeek}
                          onMultiSelectDayHover={handleMultiSelectDayHover}
                          onMultiSelectDayLeave={handleMultiSelectDayLeave}
                          onMultiSelectPaste={handleMultiSelectPaste}
                          onToggleWorkoutSelect={handleToggleWorkoutSelection}
                          isWorkoutSelected={isWorkoutSelected}
                        />
                      );
                    })}
                  </div>
                  {/* Always show divider after the week row to allow insertion */}
                  <WeekDivider
                    onClick={() => handleInsertWeek(weekNumber)}
                    position={rowIndex < getRowsCount() - 1 ? 'center' : 'bottom'}
                  />
                </div>
              );
            })}
          </div>
        </div>
        <DragOverlay>
          {draggedWorkout && (
            <div className="rounded-lg border border-border bg-background flex flex-col items-stretch justify-start p-0 overflow-hidden shadow-lg rotate-3">
              <div className="px-2 py-1 border-b border-border flex items-center justify-between gap-2 bg-muted/30">
                <span className="text-[11px] font-medium block truncate">
                  {draggedWorkout.workout.name}
                </span>
              </div>
              <div className="px-2 py-1">
                <span className="text-[10px] text-muted-foreground block">
                  {draggedWorkout.workout.totalExercises}{' '}
                  {draggedWorkout.workout.totalExercises === 1 ? t('athletes.trainingCalendar.exercise') : t('athletes.trainingCalendar.exercises')}
                </span>
              </div>
            </div>
          )}
        </DragOverlay>
      </DndContext>
      <AddWorkoutSidePanel
        open={isAddWorkoutModalOpen}
        onOpenChange={(open) => {
          setIsAddWorkoutModalOpen(open);
          if (!open) {
            setSelectedDay(null);
          }
        }}
        onSave={handleSaveWorkoutFromPanel}
        onCreateNewWorkout={handleCreateNewWorkout}
        workoutTitle={selectedDay ? t('programs.builder.addWorkout.titleDay', { day: selectedDay }) : undefined}
        mode="program"
        availableWorkouts={availableWorkouts}
      />
      <Dialog open={!!selectedWorkoutDetails} onOpenChange={(open) => !open && handleCloseWorkoutDetails()}>
        <DialogContent className="max-w-5xl sm:max-w-5xl h-[600px] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="flex-1 min-w-0">
              <span
                className="block truncate text-left"
                title={selectedWorkoutDetails?.workout.name || ''}
              >
                {selectedWorkoutDetails?.workout.name}
              </span>
            </DialogTitle>
          </DialogHeader>
          {selectedWorkoutDetails && (
            <>
              <Separator />
              <div className="flex flex-1 min-h-0 gap-4 pt-3">
                <div className="flex-[3] h-full overflow-y-auto">
                  <div className="flex flex-col gap-3">
                    <Card className="p-4 border rounded-lg bg-background">
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className="text-sm font-medium truncate"
                            title={selectedWorkoutDetails.workout.name}
                          >
                            {selectedWorkoutDetails.workout.name}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {formatDate(selectedWorkoutDetails.workout.created)}
                          </span>
                        </div>
                        {selectedWorkoutDetails.workout.description && (
                          <span className="text-xs text-muted-foreground line-clamp-3">
                            {selectedWorkoutDetails.workout.description}
                          </span>
                        )}
                        <div className="flex flex-wrap gap-1">
                          <Badge variant="secondary" className="text-xs">
                            {t('general.type')}: {selectedWorkoutDetails.workout.type}
                          </Badge>
                          {selectedWorkoutDetails.workout.equipment &&
                            (typeof selectedWorkoutDetails.workout.equipment === 'string' ? selectedWorkoutDetails.workout.equipment
                              .split(',')
                              .filter((item: string) => item.trim() !== '').length > 0 : false) && (
                              <Badge variant="secondary" className="text-xs">
                                {typeof selectedWorkoutDetails.workout.equipment === 'string' ? selectedWorkoutDetails.workout.equipment
                                  .split(',')
                                  .map((item: string) => item.trim())
                                  .filter((item: string) => item !== '')
                                  .join(', ') : ''}
                              </Badge>
                            )}
                        </div>
                      </div>
                    </Card>
                    {buildMockPreviewSections(selectedWorkoutDetails.workout).map((section) => (
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
                <Separator orientation="vertical" className="h-full" />
                <div className="flex-[1.5] h-full overflow-y-auto">
                  <div className="flex flex-col gap-2">
                    <h2 className="text-xs font-semibold uppercase tracking-wide">{t('programs.builder.overview')}</h2>
                    <div className="flex flex-col gap-2">
                      {buildMockPreviewSections(selectedWorkoutDetails.workout).map((section) => (
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
            </>
          )}
        </DialogContent>
      </Dialog>
      <DiscardChangesDialog
        open={isDiscardDialogOpen}
        onCancel={handleCancelDiscard}
        onConfirm={handleConfirmDiscard}
      />
      <ConfirmDeleteDialog
        open={weekToClear !== null}
        onOpenChange={(open) => !open && setWeekToClear(null)}
        onConfirm={handleClearWeek}
        title={weekToClear !== null ? t('programs.builder.clearWeekConfirmTitle', { number: weekToClear }) : ''}
        description={weekToClear !== null ? t('programs.builder.clearWeekConfirmDescription', { number: weekToClear }) : ''}
        confirmText={t('programs.builder.clearWeekAction')}
        variant="default"
      />
      <CreateWorkoutSidePanel
        open={isSaveToLibraryOpen}
        onOpenChange={setIsSaveToLibraryOpen}
        initialData={workoutToSave || undefined}
        onSuccess={() => {
          setIsSaveToLibraryOpen(false);
          setWorkoutToSave(null);
          refreshPrograms();
        }}
      />
      {/* Inline workout builder for creating new workouts */}
      <WorkoutBuilder
        open={isWorkoutBuilderOpen}
        onOpenChange={(open) => {
          setIsWorkoutBuilderOpen(open);
          if (!open) {
            setPendingWorkoutDay(null);
            setEditingWorkout(null);
            setFetchedWorkoutData(null);
            setIsLoadingWorkoutData(false);
          }
        }}
        meta={editingWorkout ? {
          title: editingWorkout.workout.name,
          type: editingWorkout.workout.type,
          difficulty: editingWorkout.workout.difficulty || 'intermediate',
          description: editingWorkout.workout.description || '',
        } : {
          title: '',
          type: '',
          difficulty: 'Intermediate',
          description: '',
        }}
        initialData={editingWorkout ? fetchedWorkoutData : undefined}
        isLoadingInitialData={isLoadingWorkoutData}
        saveSignal={0}
        onSaveSuccess={editingWorkout ? handleSaveEditedWorkout : handleSaveWorkoutFromBuilder}
        onSaveError={() => { }}
        onDirtyChange={() => { }}
      />
      <MultiSelectActionBar
        selectedCount={selectedWorkouts.length}
        isVisible={isMultiSelectMode || isMultiSelectCopyMode}
        isCopyMode={isMultiSelectCopyMode}
        onDelete={handleDeleteSelectedWorkouts}
        onCopy={handleStartMultiSelectCopy}
        onCancel={handleCancelMultiSelect}
      />
    </div>
  );
};
