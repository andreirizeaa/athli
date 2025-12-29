'use client';

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, ChevronUp, Dumbbell, Info, Link2, Link2Off, NotebookPen, Plus, Repeat, Sparkles, Timer, Trash2 } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/general/utils';
import { searchExercises, type Exercise } from '@/api/exercise/exercise-search';
import type { GeneratedWorkout } from '@/api/exercise/generate-exercise';
import { toast } from 'sonner';
import { useExerciseDragDrop } from './hooks/use-exercise-drag-drop';
import type {
  CircuitExerciseGroupPayload,
  CircuitExercisePayload,
  ExerciseGroupPayload,
  ExerciseType,
  RegularExercisePayload,
  RoundExercisePayload,
  SetPayload,
  WorkoutProgramPayload,
  WorkoutSectionPayload,
} from './workout-schema';
import type { SetData } from './components/exercise-card';
import { ExerciseCard } from './components/exercise-card';
import { ExerciseSelectionPanel } from './components/exercise-selection-panel';
import { SectionSelectionPanel } from './components/section-selection-panel';
import { EquipmentPanel } from './components/equipment-panel';
import { OverviewPanel } from './components/overview-panel';
import { VideoModal } from './components/video-modal';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type {
  ExerciseWithSuperset,
  WorkoutSchema,
  WorkoutMeta,
  SetFieldValidation,
  ValidationErrors,
  SectionValidation,
  SectionValidationErrors,
} from './shared/types/workout-builder.types';
import {
  recomputeExerciseValidation as recomputeValidation,
  clearSetValidationField as clearFieldValidation,
  validateWorkoutSchema,
  clearEmptyExercisesError,
  clearMissingConfigError,
} from './shared/utils/validation';
import {
  buildWorkoutPayload,
  groupExercisesBySupersetForPayload,
} from './shared/utils/payload-builder';
import {
  handleSectionSelect as selectSection,
  handleDeleteSection as deleteSection,
  getSectionDescription,
} from './shared/utils/section-handlers';
import {
  handleDeleteExerciseFromOverview as deleteExerciseFromOverview,
  handleDeleteSupersetFromOverview as deleteSupersetFromOverview,
  handleAddExercise as addExercise,
} from './shared/utils/exercise-handlers';
import {
  groupExercisesBySuperset,
  handleSupersetLink as linkSuperset,
  handleSupersetUnlink as unlinkSuperset,
} from './shared/utils/superset-handlers';
import {
  handleDrop as dropExercise,
  handleSlotDrop,
} from './shared/utils/drop-handlers';
import {
  handleExerciseClick as scrollToExercise,
  handleExerciseClickById,
} from './shared/utils/exercise-scroll';

type StandardBuilderProps = {
  meta: WorkoutMeta | null;
  onDirtyChange?: () => void;
  saveSignal?: number;
  onSaveSuccess?: (payload: WorkoutProgramPayload) => void;
};

export const StandardBuilder = ({
  meta,
  onDirtyChange,
  saveSignal,
  onSaveSuccess,
}: StandardBuilderProps) => {
  // Initialize with schema from localStorage if available (for edit mode)
  const getInitialSchema = (): WorkoutSchema => {
    if (typeof window === 'undefined') {
      return {
        sections: [
          {
            id: `sec_regular_${Date.now()}`,
            type: 'regular',
            exercises: [],
          },
        ],
      };
    }

    const accessFlag = window.localStorage.getItem('athli_workout_builder_access');
    if (accessFlag === 'edit-standard') {
      try {
        const savedSchema = window.localStorage.getItem('athli_workout_schema');
        if (savedSchema) {
          const parsed = JSON.parse(savedSchema);
          if (parsed.sections && parsed.sections.length > 0 && parsed.sections.some((s: any) => s.exercises && s.exercises.length > 0)) {
            return parsed;
          }
        }
      } catch (error) {
        console.error('Error parsing workout schema from localStorage:', error);
      }
      // Return empty schema if no saved schema found or error
      return {
        sections: [
          {
            id: `sec_regular_${Date.now()}`,
            type: 'regular',
            exercises: [],
          },
        ],
      };
    }

    return {
      sections: [
        {
          id: `sec_regular_${Date.now()}`,
          type: 'regular',
          exercises: [],
        },
      ],
    };
  };

  const [workoutSchema, setWorkoutSchema] = useState<WorkoutSchema>(getInitialSchema());
  const [builderMode, setBuilderMode] = useState<'exercise' | 'section'>('exercise');
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const [sectionValidationErrors, setSectionValidationErrors] = useState<SectionValidationErrors>(
    {}
  );
  const [hasAttemptedSave, setHasAttemptedSave] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  const [focusedExerciseId, setFocusedExerciseId] = useState<string | null>(null);
  const [isLoadingAiWorkout, setIsLoadingAiWorkout] = useState(false);
  const contentScrollRef = useRef<HTMLDivElement | null>(null);
  const pendingScrollTopRef = useRef<number | null>(null);
  const exerciseRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // Use the shared drag-drop hook
  const {
    draggedExercise,
    dragOverSectionId,
    dragOverSlot,
    handleDragStart,
    handleDragEnd,
    handleSectionDragOver,
    handleSectionDragLeave,
    registerSectionRef,
  } = useExerciseDragDrop({
    onExpandSection: (sectionId) => {
      // Expand the section when dragging over it
      setCollapsedSections((prev) => {
        const next = new Set(prev);
        next.delete(sectionId);
        return next;
      });
    },
  });

  // Load shared mock schema in edit mode if no schema exists
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const accessFlag = window.localStorage.getItem('athli_workout_builder_access');
    const isEditMode = accessFlag === 'edit-standard';

    if (isEditMode) {
      const savedSchema = window.localStorage.getItem('athli_workout_schema');
      if (savedSchema) {
        // Load saved schema
        try {
          const parsed = JSON.parse(savedSchema);
          // Only update if schema has sections with exercises
          if (parsed.sections && parsed.sections.length > 0 && parsed.sections.some((s: any) => s.exercises && s.exercises.length > 0)) {
            setWorkoutSchema(parsed);
            return;
          }
        } catch (error) {
          // If parsing fails, fall through to use mock schema
          console.error('Error parsing workout schema from localStorage:', error);
        }
      }

      // If no valid schema, use mock schema
      // MOCK_WORKOUT_SCHEMA is no longer used. The initial schema is handled by getInitialSchema.
      // This useEffect now only attempts to load a saved schema if in edit mode.
      // If no valid saved schema is found, the default initial schema (empty regular section) will be used.
    }
  }, []);

  // Load AI generated workout on mount with gradual loading
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const aiGeneratedRaw = window.localStorage.getItem('athli_ai_generated_workout');
    if (!aiGeneratedRaw) return;

    try {
      const aiGenerated: GeneratedWorkout = JSON.parse(aiGeneratedRaw);

      // First, create all sections without exercises
      const sectionsWithStructure = aiGenerated.sections.map((section: any) => {
        if (section.type === 'regular') {
          return {
            id: section.id as string,
            type: 'regular' as const,
            exercises: [] as ExerciseWithSuperset[],
          };
        } else if (section.type === 'auxiliary') {
          return {
            id: section.id,
            type: 'auxiliary' as const,
            exercises: [] as ExerciseWithSuperset[],
            category: section.category,
          };
        } else if (section.type === 'circuits') {
          return {
            id: section.id,
            type: 'circuits' as const,
            exercises: [] as ExerciseWithSuperset[],
            targetRounds: section.targetRounds,
          };
        } else {
          return {
            id: section.id,
            type: section.type as 'amrap' | 'timed',
            exercises: [] as ExerciseWithSuperset[],
            roundDurationSec: section.roundDurationSec,
            targetRounds: section.targetRounds,
          };
        }
      });

      // Set sections structure first
      setWorkoutSchema({ sections: sectionsWithStructure });

      // Collect all exercises to add gradually
      const exercisesToAdd: Array<{
        sectionId: string;
        exercise: ExerciseWithSuperset;
      }> = [];

      aiGenerated.sections.forEach((section: any) => {
        if (section.type === 'regular' || section.type === 'auxiliary' || section.type === 'circuits') {
          section.exercises?.forEach((group: any) => {
            if (group.isSuperset && group.exercises) {
              // Create superset group
              const supersetGroupId = `superset_${section.id}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

              group.exercises.forEach((ex: any) => {
                const foundExercise = searchExercises('').find((e) => e.exerciseId === ex.id);
                const exercise = foundExercise || {
                  exerciseId: ex.id,
                  name: ex.name,
                  imageUrl: '',
                  videoUrl: '',
                  equipments: ex.equipment || [],
                  bodyParts: [],
                  exerciseType: ex.exerciseType,
                  targetMuscles: [],
                  secondaryMuscles: [],
                  keywords: [],
                  overview: '',
                  instructions: [],
                  exerciseTips: [],
                  variations: [],
                  relatedExerciseIds: [],
                };

                const sets: SetData[] = (ex.sets || []).map((set: any) => {
                  const setData: SetData = {
                    setNumber: set.setNumber,
                    type: set.isDropset ? 'dropset' : 'normal',
                    reps:
                      set.isDropset && set.repStages
                        ? set.repStages.join('-')
                        : set.reps?.toString() || '',
                    weight:
                      set.isDropset && set.weightStages
                        ? set.weightStages.join('-')
                        : set.weight?.toString() || '',
                    rest: set.restSec?.toString() || '',
                    distance: set.distance?.toString() || '',
                    duration: set.durationSec?.toString() || '',
                  };
                  return setData;
                });

                exercisesToAdd.push({
                  sectionId: section.id,
                  exercise: {
                    ...exercise,
                    instanceId: `${ex.id}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
                    supersetGroupId,
                    sets,
                  },
                });
              });
            } else if (group.exercises && group.exercises.length > 0) {
              // Single exercise
              const ex = group.exercises[0];
              const foundExercise = searchExercises('').find((e) => e.exerciseId === ex.id);
              const exercise = foundExercise || {
                exerciseId: ex.id,
                name: ex.name,
                imageUrl: '',
                videoUrl: '',
                equipments: ex.equipment || [],
                bodyParts: [],
                exerciseType: ex.exerciseType,
                targetMuscles: [],
                secondaryMuscles: [],
                keywords: [],
                overview: '',
                instructions: [],
                exerciseTips: [],
                variations: [],
                relatedExerciseIds: [],
              };

              const sets: SetData[] = (ex.sets || []).map((set: any) => {
                const setData: SetData = {
                  setNumber: set.setNumber,
                  type: set.isDropset ? 'dropset' : 'normal',
                  reps:
                    set.isDropset && set.repStages
                      ? set.repStages.join('-')
                      : set.reps?.toString() || '',
                  weight:
                    set.isDropset && set.weightStages
                      ? set.weightStages.join('-')
                      : set.weight?.toString() || '',
                  rest: set.restSec?.toString() || '',
                  distance: set.distance?.toString() || '',
                  duration: set.durationSec?.toString() || '',
                };
                return setData;
              });

              exercisesToAdd.push({
                sectionId: section.id,
                exercise: {
                  ...exercise,
                  instanceId: `${ex.id}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
                  supersetGroupId: null,
                  sets,
                },
              });
            }
          });
        } else {
          // AMRAP or Timed section
          section.exercises?.forEach((ex: any) => {
            const foundExercise = searchExercises('').find((e) => e.exerciseId === ex.id);
            const exercise = foundExercise || {
              exerciseId: ex.id,
              name: ex.name,
              imageUrl: '',
              videoUrl: '',
              equipments: ex.equipment || [],
              bodyParts: [],
              exerciseType: ex.exerciseType,
              targetMuscles: [],
              secondaryMuscles: [],
              keywords: [],
              overview: '',
              instructions: [],
              exerciseTips: [],
              variations: [],
              relatedExerciseIds: [],
            };

            const sets: SetData[] = (ex.sets || []).map((set: any) => {
              const setData: SetData = {
                setNumber: set.setNumber,
                type: 'normal',
                reps: set.reps?.toString() || '',
                weight: set.weight?.toString() || '',
                rest: set.restSec?.toString() || '',
                distance: set.distance?.toString() || '',
                duration: set.durationSec?.toString() || '',
              };
              return setData;
            });

            exercisesToAdd.push({
              sectionId: section.id,
              exercise: {
                ...exercise,
                instanceId: `${ex.id}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
                supersetGroupId: null,
                sets,
              },
            });
          });
        }
      });

      // Mark as dirty if there are multiple sections, non-regular sections, or any exercises
      // (anything beyond a single blank regular section is a change)
      const hasMultipleSections = sectionsWithStructure.length > 1;
      const hasNonRegularSections = sectionsWithStructure.some((s) => s.type !== 'regular');
      const hasExercises = exercisesToAdd.length > 0;

      if (hasMultipleSections || hasNonRegularSections || hasExercises) {
        onDirtyChange?.();
      }

      // Calculate delay per exercise (5 seconds total / number of exercises)
      const totalDuration = 5000; // 5 seconds
      const delayPerExercise =
        exercisesToAdd.length > 0 ? totalDuration / exercisesToAdd.length : 0;

      // Show loading overlay
      setIsLoadingAiWorkout(true);

      // Add exercises gradually
      exercisesToAdd.forEach((item, index) => {
        setTimeout(() => {
          setWorkoutSchema((prev) => {
            const updated = {
              ...prev,
              sections: prev.sections.map((sec) => {
                if (sec.id === item.sectionId) {
                  return {
                    ...sec,
                    exercises: [...(sec.exercises || []), item.exercise],
                  };
                }
                return sec;
              }),
            };
            // Mark as dirty when first exercise is added
            if (index === 0) {
              onDirtyChange?.();
            }
            return updated;
          });

          // Hide loading overlay after last exercise is added
          if (index === exercisesToAdd.length - 1) {
            setTimeout(() => {
              setIsLoadingAiWorkout(false);
            }, 100);
          }
        }, index * delayPerExercise);
      });

      // Clear the localStorage after loading starts
      window.localStorage.removeItem('athli_ai_generated_workout');
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to load AI generated workout', error);
    }
  }, [onDirtyChange]);

  const handleExerciseClick = (exercise: Exercise) => {
    scrollToExercise(
      exercise,
      exerciseRefs,
      contentScrollRef,
      (ex) => {
        setSelectedExercise(ex);
        setIsVideoModalOpen(true);
      }
    );
  };

  const handleExerciseClickByIdWrapper = (exerciseId: string) => {
    handleExerciseClickById(
      exerciseId,
      workoutSchema.sections,
      collapsedSections,
      exerciseRefs,
      contentScrollRef,
      setFocusedExerciseId,
      setCollapsedSections
    );
  };

  const handleRecomputeExerciseValidation = (
    exerciseInstanceId: string,
    exerciseType: 'weight_reps' | 'reps' | 'distance_duration',
    sets: SetData[] | undefined
  ) => {
    setValidationErrors((prev) =>
      recomputeValidation(exerciseInstanceId, exerciseType, sets, hasAttemptedSave, prev)
    );
  };

  const handleClearSetValidationField = (
    exerciseInstanceId: string,
    setIndex: number,
    field: keyof SetFieldValidation
  ) => {
    setValidationErrors((prev) =>
      clearFieldValidation(exerciseInstanceId, setIndex, field, prev)
    );
  };

  useEffect(() => {
    if (!saveSignal || saveSignal === 0) {
      return;
    }

    setHasAttemptedSave(true);

    const { exerciseErrors, sectionErrors } = validateWorkoutSchema(workoutSchema);

    if (Object.keys(exerciseErrors).length > 0 || Object.keys(sectionErrors).length > 0) {
      setValidationErrors(exerciseErrors);
      setSectionValidationErrors(sectionErrors);
      toast.error('Please fill out all fields');
      return;
    }

    setValidationErrors({});
    setSectionValidationErrors({});

    const payload = buildWorkoutPayload(workoutSchema, meta);
    if (!payload) {
      toast.error('Workout details are missing');
      return;
    }

    if (onSaveSuccess) {
      onSaveSuccess(payload);
    }
  }, [saveSignal, workoutSchema, meta, onSaveSuccess]);

  const handleSectionSelect = (type: 'regular' | 'amrap' | 'timed' | 'circuits' | 'auxiliary') => {
    // Preserve current scroll position in the middle content column
    if (contentScrollRef.current) {
      pendingScrollTopRef.current = contentScrollRef.current.scrollTop;
    }

    setWorkoutSchema((prev) => selectSection(type, prev));
    onDirtyChange?.();
  };

  // After sections change (e.g. a new section is added), restore scroll position
  useLayoutEffect(() => {
    if (pendingScrollTopRef.current !== null && contentScrollRef.current) {
      contentScrollRef.current.scrollTop = pendingScrollTopRef.current;
      pendingScrollTopRef.current = null;
    }
  }, [workoutSchema.sections.length]);

  const handleDeleteSection = (sectionId: string) => {
    const result = deleteSection(sectionId, workoutSchema);
    setWorkoutSchema(result.schema);
    if (result.shouldSwitchToSectionMode) {
      setBuilderMode('section');
    }
    onDirtyChange?.();
  };

  const handleDeleteKeyDown = (e: React.KeyboardEvent, sectionId: string) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleDeleteSection(sectionId);
    }
  };

  const handleDeleteExerciseFromOverview = (sectionId: string, exerciseId: string) => {
    setWorkoutSchema((prev) =>
      deleteExerciseFromOverview(sectionId, exerciseId, prev)
    );
    onDirtyChange?.();
  };

  const handleDeleteSupersetFromOverview = (sectionId: string, exerciseIds: string[]) => {
    setWorkoutSchema((prev) =>
      deleteSupersetFromOverview(sectionId, exerciseIds, prev)
    );
    onDirtyChange?.();
  };

  // Fallback drop handler used for empty sections or when no specific slot is active.
  const handleDrop = (e: React.DragEvent, sectionId: string) => {
    e.preventDefault();
    if (draggedExercise) {
      setWorkoutSchema((prev) =>
        dropExercise(sectionId, draggedExercise, prev)
      );
      onDirtyChange?.();

      // Clear empty-exercises validation for this section once an exercise is added
      setSectionValidationErrors((prev) => clearEmptyExercisesError(sectionId, prev));
    }
    handleDragEnd();
  };

  // Higher-level drop handler for the whole section content.
  // Uses the calculated nearest slot position for smart dropping
  const handleSectionDrop = (e: React.DragEvent, sectionId: string) => {
    e.preventDefault();

    if (dragOverSlot && dragOverSlot.sectionId === sectionId) {
      // Use the calculated slot position
      handleSlotDropWrapper(e, sectionId, dragOverSlot.slotIndex);
      return;
    }

    // Fallback: no slot was active, so append to the end of the section.
    handleDrop(e, sectionId);
  };

  const handleAddExercise = (sectionId: string) => {
    setWorkoutSchema((prev) => addExercise(sectionId, prev));
    onDirtyChange?.();

    // Clear empty-exercises validation when a manual exercise is added
    setSectionValidationErrors((prev) => clearEmptyExercisesError(sectionId, prev));
  };

  const handleSlotDropWrapper = (e: React.DragEvent, sectionId: string, slotIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (!draggedExercise) return;

    setWorkoutSchema((prev) =>
      handleSlotDrop(sectionId, slotIndex, draggedExercise, prev)
    );

    // Clear empty-exercises validation when an exercise is dropped into a section
    setSectionValidationErrors((prev) => clearEmptyExercisesError(sectionId, prev));

    onDirtyChange?.();
    handleDragEnd();
  };

  const handleSupersetLink = (sectionId: string, exerciseIndex: number) => {
    setWorkoutSchema((prev) => linkSuperset(sectionId, exerciseIndex, prev));
    onDirtyChange?.();
  };

  const handleSupersetUnlink = (sectionId: string, exerciseIndex: number) => {
    setWorkoutSchema((prev) => unlinkSuperset(sectionId, exerciseIndex, prev));
    onDirtyChange?.();
  };

  const activeExerciseIds = useMemo(() => {
    const activeIds = new Set<string>();
    workoutSchema.sections.forEach((section) => {
      section.exercises?.forEach((exercise) => {
        if (exercise.exerciseId) {
          activeIds.add(exercise.exerciseId);
        }
      });
    });
    return activeIds;
  }, [workoutSchema]);

  return (
    <div className="flex h-full max-h-full overflow-hidden min-h-0 bg-background p-2">
      <div className="flex-[1] p-2 h-full flex flex-col min-h-0">
        <Card className="relative h-full" style={{ height: '100%' }}>
          <CardContent className="absolute inset-0 p-4 overflow-y-auto flex flex-col">
            <Tabs
              value={builderMode}
              onValueChange={(value) => {
                if (value) setBuilderMode(value as 'exercise' | 'section');
              }}
            >
              <TabsList className="w-full">
                <TabsTrigger
                  value="exercise"
                  disabled={workoutSchema.sections.length === 0}
                  className="flex-1 data-[state=active]:border-primary data-[state=active]:bg-primary/5 data-[state=active]:text-primary dark:data-[state=active]:border-primary dark:data-[state=active]:bg-primary/5 dark:data-[state=active]:text-primary"
                >
                  Exercises
                </TabsTrigger>
                <TabsTrigger
                  value="section"
                  className="flex-1 data-[state=active]:border-primary data-[state=active]:bg-primary/5 data-[state=active]:text-primary dark:data-[state=active]:border-primary dark:data-[state=active]:bg-primary/5 dark:data-[state=active]:text-primary"
                >
                  Sections
                </TabsTrigger>
              </TabsList>
            </Tabs>
            {builderMode === 'exercise' && (
              <div className="flex-1 min-h-0 mt-4">
                <ExerciseSelectionPanel
                  onExerciseClick={handleExerciseClick}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                  activeExerciseIds={activeExerciseIds}
                />
              </div>
            )}
            {builderMode === 'section' && (
              <div className="flex-1 min-h-0 mt-4">
                <SectionSelectionPanel onSectionSelect={handleSectionSelect} />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      <div className="flex-[3] p-2 h-full flex flex-col min-h-0">
        <Card className="relative h-full" style={{ height: '100%' }}>
          {isLoadingAiWorkout && (
            <div className="absolute inset-0 mt-[1px] bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                <p className="text-sm text-muted-foreground">Generating workout...</p>
              </div>
            </div>
          )}
          <CardContent
            ref={contentScrollRef}
            className="absolute inset-0 p-4 overflow-y-auto"
          >
            {workoutSchema.sections.length > 0 ? (
              <div className="flex flex-col gap-4 w-full min-h-0">
                {workoutSchema.sections.map((section) => {
                  const isCollapsed = collapsedSections.has(section.id);
                  return (
                    <div key={section.id} className="relative flex w-full items-stretch flex-shrink-0 min-w-0">
                      <Card
                        className={cn(
                          "bg-sidebar w-full flex flex-col relative min-w-0 border-primary p-0 rounded-xl transition-all",
                          isCollapsed && draggedExercise && dragOverSectionId === section.id && "ring-2 ring-primary bg-primary/5"
                        )}
                        onDragOver={(e) => {
                          if (isCollapsed) {
                            handleSectionDragOver(e, section.id, section.exercises?.length || 0);
                          }
                        }}
                        onDragLeave={(e) => {
                          if (isCollapsed) {
                            handleSectionDragLeave(e);
                          }
                        }}
                        onDrop={(e) => {
                          if (isCollapsed) {
                            handleSectionDrop(e, section.id);
                          }
                        }}
                      >
                        <CardHeader className={cn(
                          "p-0 bg-primary/10 rounded-t-xl",
                          isCollapsed && "rounded-b-xl",
                          !isCollapsed && "border-b border-primary"
                        )}>
                          <div className="flex items-center justify-between px-3 py-2 pb-0">
                            <div className="flex items-center gap-2">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 text-primary hover:text-primary hover:bg-primary/20"
                                    onClick={() => {
                                      setCollapsedSections((prev) => {
                                        const next = new Set(prev);
                                        if (next.has(section.id)) {
                                          next.delete(section.id);
                                        } else {
                                          next.add(section.id);
                                        }
                                        return next;
                                      });
                                    }}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault();
                                        setCollapsedSections((prev) => {
                                          const next = new Set(prev);
                                          if (next.has(section.id)) {
                                            next.delete(section.id);
                                          } else {
                                            next.add(section.id);
                                          }
                                          return next;
                                        });
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
                                      setWorkoutSchema((prev) => ({
                                        ...prev,
                                        sections: prev.sections.map((sec) => {
                                          if (sec.id === section.id) {
                                            return {
                                              ...sec,
                                              category: value as 'warmup' | 'cooldown' | 'mobility',
                                            };
                                          }
                                          return sec;
                                        }),
                                      }));

                                      // Clear missing-config validation when category is selected
                                      if (value) {
                                        setSectionValidationErrors((prev) =>
                                          clearMissingConfigError(section.id, prev)
                                        );
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
                                      setWorkoutSchema((prev) => ({
                                        ...prev,
                                        sections: prev.sections.map((sec) => {
                                          if (sec.id === section.id) {
                                            if (section.type === 'amrap') {
                                              return {
                                                ...sec,
                                                roundDurationSec: value
                                                  ? parseInt(value, 10)
                                                  : undefined,
                                              };
                                            }
                                            return {
                                              ...sec,
                                              targetRounds: value ? parseInt(value, 10) : undefined,
                                            };
                                          }
                                          return sec;
                                        }),
                                      }));

                                      // Clear missing-config validation for this section as soon as a value is entered
                                      if (value && value.trim() !== '') {
                                        setSectionValidationErrors((prev) =>
                                          clearMissingConfigError(section.id, prev)
                                        );
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
                                onClick={() => handleDeleteSection(section.id)}
                                onKeyDown={(e) => handleDeleteKeyDown(e, section.id)}
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
                              ref={(el) => registerSectionRef(section.id, el)}
                              data-workout-section
                              className="flex-1 flex flex-col px-3 py-1.5 pb-0"
                              onDragOver={(e) => handleSectionDragOver(e, section.id, section.exercises?.length || 0)}
                              onDragLeave={handleSectionDragLeave}
                              onDrop={(e) => handleSectionDrop(e, section.id)}
                            >
                              <div
                                className={cn(
                                  'flex-1 w-full',
                                  section.exercises && section.exercises.length > 0
                                    ? 'flex flex-col gap-0'
                                    : 'flex items-center justify-center'
                                )}
                              >
                                {section.exercises && section.exercises.length > 0 ? (
                                  <div className="w-full flex flex-col gap-0">
                                    {/* Drop zone before the first exercise */}
                                    <div
                                      className={cn(
                                        'w-full',
                                        draggedExercise &&
                                          dragOverSlot &&
                                          dragOverSlot.sectionId === section.id &&
                                          dragOverSlot.slotIndex === 0
                                          ? 'my-1 min-h-14 border-2 border-dashed border-primary bg-primary/5 rounded-lg flex items-center justify-center text-primary text-sm'
                                          : 'h-0'
                                      )}
                                    >
                                      {draggedExercise &&
                                        dragOverSlot &&
                                        dragOverSlot.sectionId === section.id &&
                                        dragOverSlot.slotIndex === 0 && (
                                          <span>Drop your exercise here</span>
                                        )}
                                    </div>

                                    {section.exercises.map((exercise, exerciseIndex) => {
                                      const nextExercise = section.exercises?.[exerciseIndex + 1];
                                      const prevExercise =
                                        exerciseIndex > 0 ? section.exercises?.[exerciseIndex - 1] : null;

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
                                            if (el) {
                                              exerciseRefs.current.set(exercise.exerciseId, el);
                                            } else {
                                              exerciseRefs.current.delete(exercise.exerciseId);
                                            }
                                          }}
                                          className={wrapperClasses}
                                        >
                                          <div
                                            data-exercise-card
                                            className={cn(
                                              focusedExerciseId === exercise.exerciseId && "[&>div]:!border-primary [&>div]:!border [&>div]:animate-pulse"
                                            )}
                                          >
                                            <ExerciseCard
                                              exercise={exercise}
                                              isLinkedToPrev={isLinkedToPrev}
                                              isLinkedToNext={isLinkedToNext}
                                              onVideoClick={handleExerciseClick}
                                              sectionType={section.type}
                                              validationErrors={validationErrors[exercise.instanceId]}
                                              onClearValidationField={(setIndex, field) =>
                                                handleClearSetValidationField(exercise.instanceId, setIndex, field)
                                              }
                                              onExerciseChange={(newExercise) => {
                                                onDirtyChange?.();
                                                const castExercise = newExercise as ExerciseWithSuperset;
                                                handleRecomputeExerciseValidation(
                                                  exercise.instanceId,
                                                  castExercise.exerciseType as
                                                  | 'weight_reps'
                                                  | 'reps'
                                                  | 'distance_duration',
                                                  castExercise.sets || []
                                                );
                                                setWorkoutSchema((prev) => ({
                                                  ...prev,
                                                  sections: prev.sections.map((sec) => {
                                                    if (sec.id === section.id && sec.exercises) {
                                                      const updatedExercises: ExerciseWithSuperset[] = [
                                                        ...sec.exercises,
                                                      ];
                                                      updatedExercises[exerciseIndex] = {
                                                        ...castExercise,
                                                        supersetGroupId: exercise.supersetGroupId,
                                                      };
                                                      return {
                                                        ...sec,
                                                        exercises: updatedExercises,
                                                      };
                                                    }
                                                    return sec;
                                                  }),
                                                }));
                                              }}
                                              onDelete={() => {
                                                onDirtyChange?.();
                                                setWorkoutSchema((prev) => ({
                                                  ...prev,
                                                  sections: prev.sections.map((sec) => {
                                                    if (sec.id === section.id && sec.exercises) {
                                                      const updatedExercises = sec.exercises.filter(
                                                        (_, idx) => idx !== exerciseIndex
                                                      );
                                                      return {
                                                        ...sec,
                                                        exercises: updatedExercises,
                                                      };
                                                    }
                                                    return sec;
                                                  }),
                                                }));
                                              }}
                                            />
                                          </div>

                                          {/* Drop zone between exercises */}
                                          <div
                                            className={cn(
                                              'w-full',
                                              draggedExercise &&
                                                dragOverSlot &&
                                                dragOverSlot.sectionId === section.id &&
                                                dragOverSlot.slotIndex === exerciseIndex + 1
                                                ? 'my-1 min-h-14 border-2 border-dashed border-primary bg-primary/5 rounded-lg flex items-center justify-center text-primary text-sm'
                                                : 'h-0'
                                            )}
                                          >
                                            {draggedExercise &&
                                              dragOverSlot &&
                                              dragOverSlot.sectionId === section.id &&
                                              dragOverSlot.slotIndex === exerciseIndex + 1 && (
                                                <span>Drop your exercise here</span>
                                              )}
                                          </div>
                                          {section.exercises &&
                                            exerciseIndex < section.exercises.length - 1 && (
                                              <>
                                                {isLinkedToNext ? (
                                                  <div className="relative flex items-center justify-center bg-background border-x py-1">
                                                    <Separator className="absolute w-full" />
                                                    <Button
                                                      type="button"
                                                      variant="outline"
                                                      size="sm"
                                                      className="gap-1.5 bg-background z-10 text-xs h-7 px-2"
                                                      onClick={() =>
                                                        handleSupersetUnlink(section.id, exerciseIndex)
                                                      }
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
                                                      onClick={() =>
                                                        handleSupersetLink(section.id, exerciseIndex)
                                                      }
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
                                        onClick={() => handleAddExercise(section.id)}
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
                })}
                <div className="flex items-center justify-center py-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="gap-1.5 text-xs h-7 px-2"
                        aria-label="Add new section"
                      >
                        <Plus className="size-3" />
                        <span>Add section</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                      <DropdownMenuItem onClick={() => handleSectionSelect('auxiliary')}>
                        <Sparkles className="mr-2 size-4 text-foreground" />
                        Warm up / Cool down / Mobility
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleSectionSelect('regular')}>
                        <Dumbbell className="mr-2 size-4 text-foreground" />
                        Regular
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleSectionSelect('amrap')}>
                        <NotebookPen className="mr-2 size-4 text-foreground" />
                        AMRAP
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleSectionSelect('timed')}>
                        <Timer className="mr-2 size-4 text-foreground" />
                        Timed
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleSectionSelect('circuits')}>
                        <Repeat className="mr-2 size-4 text-foreground" />
                        Circuits
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full gap-4">
                <p className="text-muted-foreground text-center">
                  Add your first section to start building your workout.
                </p>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className="gap-2"
                      aria-label="Add new section"
                    >
                      <Plus className="size-4" />
                      <span>Add section</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="center">
                    <DropdownMenuItem onClick={() => handleSectionSelect('auxiliary')}>
                      <Sparkles className="mr-2 size-4 text-foreground" />
                      Warm up / Cool down / Mobility
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleSectionSelect('regular')}>
                      <Dumbbell className="mr-2 size-4 text-foreground" />
                      Regular
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleSectionSelect('amrap')}>
                      <NotebookPen className="mr-2 size-4 text-foreground" />
                      AMRAP
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleSectionSelect('timed')}>
                      <Timer className="mr-2 size-4 text-foreground" />
                      Timed
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleSectionSelect('circuits')}>
                      <Repeat className="mr-2 size-4 text-foreground" />
                      Circuits
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      <div className="flex-[1] p-2 h-full flex flex-col min-h-0">
        <Card className="relative h-full" style={{ height: '100%' }}>
          <CardContent className="absolute inset-0 p-4 overflow-y-auto">
            <EquipmentPanel sections={workoutSchema.sections} />
            <OverviewPanel
              sections={workoutSchema.sections as any}
              onSectionsChange={(sections) => {
                onDirtyChange?.();
                setWorkoutSchema((prev) => ({ ...prev, sections: sections as any }));
              }}
              onDeleteSection={handleDeleteSection}
              onDeleteExercise={handleDeleteExerciseFromOverview}
              onDeleteSuperset={handleDeleteSupersetFromOverview}
              groupExercisesBySuperset={groupExercisesBySuperset as any}
              onExerciseClick={handleExerciseClickByIdWrapper}
            />
          </CardContent>
        </Card>
      </div>
      <VideoModal
        open={isVideoModalOpen}
        onOpenChange={setIsVideoModalOpen}
        exercise={selectedExercise}
      />
    </div>
  );
};
