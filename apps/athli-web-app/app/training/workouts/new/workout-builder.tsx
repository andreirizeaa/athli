'use client';

import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, ChevronDown, ChevronUp, Dumbbell, Ellipsis, Info, Link2, Link2Off, NotebookPen, Plus, Repeat, Sparkles, Timer, Trash2, X } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  WorkoutProgramPayload,
} from './workout-schema';
import type { SetData } from './components/exercise-card';
import { ExerciseCard } from './components/exercise-card';
import { ExerciseSelectionPanel } from './components/exercise-selection-panel';
import { CoachSectionsSidebar } from './components/coach-sections-sidebar';
import { InlineSectionCreator } from './components/inline-section-creator';
import type { Section } from '@/api/coach/coach-section-service';
import { SectionType } from '@/app/training/sections/section-type-utils';

import { OverviewPanel } from './components/overview-panel';
import { VideoModal } from './components/video-modal';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ConfirmDeleteDialog } from '@/components/app/confirm-delete-dialog';
import type {
  ExerciseWithSuperset,
  WorkoutSchema,
  WorkoutSchemaItem,
  WorkoutSection,
  WorkoutMeta,
  SetFieldValidation,
  ValidationErrors,
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
  handleAddTopLevelExercise as addTopLevelExercise,
  handleDeleteTopLevelExercise as deleteTopLevelExercise,
} from './shared/utils/exercise-handlers';
import {
  groupExercisesBySuperset,
  handleSupersetLink as linkSuperset,
  handleSupersetUnlink as unlinkSuperset,
  handleTopLevelSupersetLink as linkTopLevelSuperset,
  handleTopLevelSupersetUnlink as unlinkTopLevelSuperset,
} from './shared/utils/superset-handlers';
import {
  handleDrop as dropExercise,
  handleSlotDrop,
  handleTopLevelSlotDrop,
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
  onSaveError?: () => void;
  mode?: 'workout' | 'section'; // Mode: workout (default) or section
  sectionType?: 'regular' | 'amrap' | 'timed' | 'circuits' | 'auxiliary'; // Required when mode is 'section'
};

export const StandardBuilder = ({
  meta,
  onDirtyChange,
  saveSignal,
  onSaveSuccess,
  onSaveError,
  mode = 'workout',
  sectionType,
}: StandardBuilderProps) => {
  const isSectionMode = mode === 'section';

  // Initialize with empty items array (no required default section)
  // OR initialize with a single section when in section mode
  const getInitialSchema = (): WorkoutSchema => {
    if (typeof window === 'undefined') {
      if (isSectionMode && sectionType) {
        // Create initial section for section mode
        return {
          items: [{
            itemType: 'section' as const,
            section: {
              id: `section_${Date.now()}`,
              type: sectionType,
              exercises: [],
              ...(sectionType === 'amrap' && { roundDurationSec: undefined }),
              ...(sectionType === 'timed' && { targetRounds: undefined }),
              ...(sectionType === 'circuits' && { targetRounds: undefined }),
              ...(sectionType === 'auxiliary' && { category: 'warmup' }),
            },
          }],
        };
      }
      return { items: [] };
    }

    const accessFlag = window.localStorage.getItem('athli_workout_builder_access');
    if (accessFlag === 'edit-standard') {
      try {
        const savedSchema = window.localStorage.getItem('athli_workout_schema');
        if (savedSchema) {
          const parsed = JSON.parse(savedSchema);
          // Handle both old (sections) and new (items) format
          if (parsed.items && parsed.items.length > 0) {
            return parsed;
          }
          // Legacy format with sections - convert to items
          if (parsed.sections && parsed.sections.length > 0) {
            const legacyItems: WorkoutSchemaItem[] = parsed.sections.map((section: any) => ({
              itemType: 'section' as const,
              section: section,
            }));
            return { items: legacyItems };
          }
        }
      } catch (error) {
        console.error('Error parsing workout schema from localStorage:', error);
      }
    }

    // For section mode, always start with one section
    if (isSectionMode && sectionType) {
      return {
        items: [{
          itemType: 'section' as const,
          section: {
            id: `section_${Date.now()}`,
            type: sectionType,
            exercises: [],
            ...(sectionType === 'amrap' && { roundDurationSec: undefined }),
            ...(sectionType === 'timed' && { targetRounds: undefined }),
            ...(sectionType === 'circuits' && { targetRounds: undefined }),
            ...(sectionType === 'auxiliary' && { category: 'warmup' }),
          },
        }],
      };
    }

    return { items: [] };
  };

  const [workoutSchema, setWorkoutSchema] = useState<WorkoutSchema>(getInitialSchema());
  const [builderMode, setBuilderMode] = useState<'exercise' | 'section'>('exercise');
  const [selectedEquipmentGroups, setSelectedEquipmentGroups] = useState<string[]>([]);
  const [sectionToDelete, setSectionToDelete] = useState<WorkoutSection | null>(null);
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
  const [isCreatingSection, setIsCreatingSection] = useState(false);
  const creatorRef = useRef<HTMLDivElement>(null);

  // Scroll to creator when opened
  useEffect(() => {
    if (isCreatingSection && creatorRef.current) {
      creatorRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [isCreatingSection]);

  // Reset builder mode to 'exercise' when workout is empty
  useEffect(() => {
    if (workoutSchema.items.length === 0) {
      setBuilderMode('exercise');
    }
  }, [workoutSchema.items.length]);

  const {
    draggedExercise,
    draggedSection,
    setDraggedSection,
    dragOverSectionId,
    dragOverSlot,
    dragOverTopLevelSlot,
    handleDragStart,
    handleDragEnd,
    handleSectionDragOver,
    handleSectionDragLeave,
    handleTopLevelDragOver: hookHandleTopLevelDragOver,
    handleTopLevelDragLeave: hookHandleTopLevelDragLeave,
    registerSectionRef,
    registerTopLevelContainerRef,
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
        try {
          const parsed = JSON.parse(savedSchema);
          // Handle new format with items
          if (parsed.items && parsed.items.length > 0) {
            setWorkoutSchema(parsed);
            return;
          }
          // Handle legacy format with sections
          if (parsed.sections && parsed.sections.length > 0) {
            const legacyItems: WorkoutSchemaItem[] = parsed.sections.map((section: any) => ({
              itemType: 'section' as const,
              section: section,
            }));
            setWorkoutSchema({ items: legacyItems });
            return;
          }
        } catch (error) {
          console.error('Error parsing workout schema from localStorage:', error);
        }
      }
    }
  }, []);

  // Load AI generated workout on mount with gradual loading
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const aiGeneratedRaw = window.localStorage.getItem('athli_ai_generated_workout');
    if (!aiGeneratedRaw) return;

    try {
      const aiGenerated: GeneratedWorkout = JSON.parse(aiGeneratedRaw);

      // Convert AI generated sections to items format
      const sectionsWithStructure: WorkoutSchemaItem[] = aiGenerated.sections.map((section: any) => {
        const sectionData: WorkoutSection = {
          id: section.id as string,
          type: section.type as 'regular' | 'amrap' | 'timed' | 'circuits' | 'auxiliary',
          exercises: [] as ExerciseWithSuperset[],
          ...(section.type === 'amrap' && { roundDurationSec: section.roundDurationSec }),
          ...(section.type === 'timed' && { targetRounds: section.targetRounds }),
          ...(section.type === 'circuits' && { targetRounds: section.targetRounds }),
          ...(section.type === 'auxiliary' && { category: section.category }),
        };
        return {
          itemType: 'section' as const,
          section: sectionData,
        };
      });

      // Set items structure first
      setWorkoutSchema({ items: sectionsWithStructure });

      // Collect all exercises to add gradually
      const exercisesToAdd: Array<{
        sectionId: string;
        exercise: ExerciseWithSuperset;
      }> = [];

      aiGenerated.sections.forEach((section: any) => {
        if (section.type === 'regular' || section.type === 'auxiliary' || section.type === 'circuits') {
          section.exercises?.forEach((group: any) => {
            if (group.isSuperset && group.exercises) {
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

                const sets: SetData[] = (ex.sets || []).map((set: any) => ({
                  setNumber: set.setNumber,
                  type: set.isDropset ? 'dropset' : 'normal',
                  reps: set.isDropset && set.repStages ? set.repStages.join('-') : set.reps?.toString() || '',
                  weight: set.isDropset && set.weightStages ? set.weightStages.join('-') : set.weight?.toString() || '',
                  rest: set.restSec?.toString() || '',
                  distance: set.distance?.toString() || '',
                  duration: set.durationSec?.toString() || '',
                }));

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

              const sets: SetData[] = (ex.sets || []).map((set: any) => ({
                setNumber: set.setNumber,
                type: set.isDropset ? 'dropset' : 'normal',
                reps: set.isDropset && set.repStages ? set.repStages.join('-') : set.reps?.toString() || '',
                weight: set.isDropset && set.weightStages ? set.weightStages.join('-') : set.weight?.toString() || '',
                rest: set.restSec?.toString() || '',
                distance: set.distance?.toString() || '',
                duration: set.durationSec?.toString() || '',
              }));

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

            const sets: SetData[] = (ex.sets || []).map((set: any) => ({
              setNumber: set.setNumber,
              type: 'normal',
              reps: set.reps?.toString() || '',
              weight: set.weight?.toString() || '',
              rest: set.restSec?.toString() || '',
              distance: set.distance?.toString() || '',
              duration: set.durationSec?.toString() || '',
            }));

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

      // Mark as dirty if there are items or exercises to add
      if (sectionsWithStructure.length > 0 || exercisesToAdd.length > 0) {
        onDirtyChange?.();
      }

      // Calculate delay per exercise
      const totalDuration = 5000;
      const delayPerExercise = exercisesToAdd.length > 0 ? totalDuration / exercisesToAdd.length : 0;

      // Show loading overlay
      setIsLoadingAiWorkout(true);

      // Add exercises gradually
      exercisesToAdd.forEach((item, index) => {
        setTimeout(() => {
          setWorkoutSchema((prev) => ({
            ...prev,
            items: prev.items.map((schemaItem) => {
              if (schemaItem.itemType === 'section' && schemaItem.section.id === item.sectionId) {
                return {
                  ...schemaItem,
                  section: {
                    ...schemaItem.section,
                    exercises: [...(schemaItem.section.exercises || []), item.exercise],
                  },
                };
              }
              return schemaItem;
            }),
          }));

          if (index === 0) {
            onDirtyChange?.();
          }

          if (index === exercisesToAdd.length - 1) {
            setTimeout(() => {
              setIsLoadingAiWorkout(false);
            }, 100);
          }
        }, index * delayPerExercise);
      });

      window.localStorage.removeItem('athli_ai_generated_workout');
    } catch (error) {
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

  // Extract sections from items for handleExerciseClickById
  const getSectionsFromItems = () => {
    return workoutSchema.items
      .filter((item): item is { itemType: 'section'; section: WorkoutSection } => item.itemType === 'section')
      .map((item) => item.section);
  };

  const handleExerciseClickByIdWrapper = (exerciseId: string) => {
    handleExerciseClickById(
      exerciseId,
      getSectionsFromItems(),
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
      if (onSaveError) onSaveError();
      return;
    }

    setValidationErrors({});
    setSectionValidationErrors({});

    const payload = buildWorkoutPayload(workoutSchema, meta);
    if (!payload) {
      toast.error('Workout details are missing');
      if (onSaveError) onSaveError();
      return;
    }

    if (onSaveSuccess) {
      onSaveSuccess(payload);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saveSignal]);

  const handleSectionSelect = (type: 'regular' | 'amrap' | 'timed' | 'circuits' | 'auxiliary') => {
    if (contentScrollRef.current) {
      pendingScrollTopRef.current = contentScrollRef.current.scrollTop;
    }

    setWorkoutSchema((prev) => selectSection(type, prev));
    onDirtyChange?.();
  };

  // After items change, restore scroll position
  useLayoutEffect(() => {
    if (pendingScrollTopRef.current !== null && contentScrollRef.current) {
      contentScrollRef.current.scrollTop = pendingScrollTopRef.current;
      pendingScrollTopRef.current = null;
    }
  }, [workoutSchema.items.length]);

  const handleSectionSourceDragStart = (section: Section) => {
    setDraggedSection(section);
  };

  const handleCreateSection = (name: string, type: SectionType) => {
    setWorkoutSchema((prev) => selectSection(type, prev, { name: name }));
    setIsCreatingSection(false);
    onDirtyChange?.();
  };

  const handleDeleteSection = (sectionId: string) => {
    const result = deleteSection(sectionId, workoutSchema);
    setWorkoutSchema(result.schema);

    onDirtyChange?.();
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

  // Top-level drop handler
  const handleTopLevelDropHandler = (e: React.DragEvent) => {
    e.preventDefault();
    if (draggedExercise && dragOverTopLevelSlot !== null) {
      setWorkoutSchema((prev) => handleTopLevelSlotDrop(dragOverTopLevelSlot, draggedExercise, prev));
      onDirtyChange?.();
    } else if (draggedSection && dragOverTopLevelSlot !== null) {
      // Handle dropping a section from the sidebar
      // We insert a NEW section at the slot index
      // We'll map the coach section structure to a new workout section
      // NOTE: Deep copy of exercises is complex. For now, we just create the section container with name/type.
      // User requirement: "drag sections into the wokrout area"

      // We'll reuse selectSection logic but insert at specific index?
      // selectSection appends to end. We need "insert at index".
      // Let's manually implement insertion logic here similar to slot drop.

      setWorkoutSchema((prev) => {
        // Create new section object
        const type = draggedSection.sectionType as any;
        const newSection: WorkoutSection = {
          id: `sec_${type}_${Date.now()}`,
          type: type || 'regular',
          exercises: [], // TODO: If we need to clone exercises, we need to fetch full section details. Sidebar section only has metadata.
          // Assuming metadata only for now as per "one card for each section" usage in sidebar usually implies template usage.
          name: draggedSection.program,
        };

        const newItem: WorkoutSchemaItem = {
          itemType: 'section',
          section: newSection,
        };

        const newItems = [...prev.items];
        // If dropping at index N, we splice it in.
        // dragOverTopLevelSlot is strictly for "top level items".
        if (dragOverTopLevelSlot >= newItems.length) {
          newItems.push(newItem);
        } else {
          newItems.splice(dragOverTopLevelSlot, 0, newItem);
        }

        return { ...prev, items: newItems };
      });
      onDirtyChange?.();
    }
    handleDragEnd();
    setDraggedSection(null);
  };

  // Section drop handlers
  const handleDrop = (e: React.DragEvent, sectionId: string) => {
    e.preventDefault();
    if (draggedExercise) {
      setWorkoutSchema((prev) =>
        dropExercise(sectionId, draggedExercise, prev)
      );
      onDirtyChange?.();
      setSectionValidationErrors((prev) => clearEmptyExercisesError(sectionId, prev));
    }
    handleDragEnd();
  };

  const handleSectionDrop = (e: React.DragEvent, sectionId: string) => {
    e.preventDefault();

    // Prevent dropping a section INTO another section
    if (draggedSection) {
      return;
    }

    if (dragOverSlot && dragOverSlot.sectionId === sectionId) {
      handleSlotDropWrapper(e, sectionId, dragOverSlot.slotIndex);
      return;
    }

    handleDrop(e, sectionId);
  };

  const handleAddExercise = (sectionId: string) => {
    setWorkoutSchema((prev) => addExercise(sectionId, prev));
    onDirtyChange?.();
    setSectionValidationErrors((prev) => clearEmptyExercisesError(sectionId, prev));
  };

  const handleAddTopLevelExercise = () => {
    setWorkoutSchema((prev) => addTopLevelExercise(prev));
    onDirtyChange?.();
  };

  const handleSlotDropWrapper = (e: React.DragEvent, sectionId: string, slotIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (!draggedExercise) return;

    setWorkoutSchema((prev) =>
      handleSlotDrop(sectionId, slotIndex, draggedExercise, prev)
    );

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

  const handleTopLevelSupersetLink = (itemIndex: number) => {
    setWorkoutSchema((prev) => linkTopLevelSuperset(itemIndex, prev));
    onDirtyChange?.();
  };

  const handleTopLevelSupersetUnlink = (itemIndex: number) => {
    setWorkoutSchema((prev) => unlinkTopLevelSuperset(itemIndex, prev));
    onDirtyChange?.();
  };

  // Move handlers for exercises within sections
  const handleMoveExerciseUp = (sectionId: string, exerciseIndex: number) => {
    if (exerciseIndex === 0) return; // Can't move up if already at top

    setWorkoutSchema((prev) => ({
      ...prev,
      items: prev.items.map((item) => {
        if (item.itemType === 'section' && item.section.id === sectionId && item.section.exercises) {
          const exercises = [...item.section.exercises];
          // Swap with previous exercise
          [exercises[exerciseIndex - 1], exercises[exerciseIndex]] = [exercises[exerciseIndex], exercises[exerciseIndex - 1]];
          return {
            ...item,
            section: { ...item.section, exercises },
          };
        }
        return item;
      }),
    }));
    onDirtyChange?.();
  };

  const handleMoveExerciseDown = (sectionId: string, exerciseIndex: number, totalExercises: number) => {
    if (exerciseIndex === totalExercises - 1) return; // Can't move down if already at bottom

    setWorkoutSchema((prev) => ({
      ...prev,
      items: prev.items.map((item) => {
        if (item.itemType === 'section' && item.section.id === sectionId && item.section.exercises) {
          const exercises = [...item.section.exercises];
          // Swap with next exercise
          [exercises[exerciseIndex], exercises[exerciseIndex + 1]] = [exercises[exerciseIndex + 1], exercises[exerciseIndex]];
          return {
            ...item,
            section: { ...item.section, exercises },
          };
        }
        return item;
      }),
    }));
    onDirtyChange?.();
  };

  // Move handlers for top-level exercises
  const handleMoveTopLevelExerciseUp = (itemIndex: number) => {
    if (itemIndex <= 0) return; // Already at top

    setWorkoutSchema((prev) => {
      const items = [...prev.items];
      // Swap with immediate previous item (any type)
      [items[itemIndex - 1], items[itemIndex]] = [items[itemIndex], items[itemIndex - 1]];
      return { ...prev, items };
    });
    onDirtyChange?.();
  };

  const handleMoveTopLevelExerciseDown = (itemIndex: number) => {
    if (itemIndex >= workoutSchema.items.length - 1) return; // Already at bottom

    setWorkoutSchema((prev) => {
      const items = [...prev.items];
      // Swap with immediate next item (any type)
      [items[itemIndex], items[itemIndex + 1]] = [items[itemIndex + 1], items[itemIndex]];
      return { ...prev, items };
    });
    onDirtyChange?.();
  };

  const activeExerciseIds = useMemo(() => {
    const activeIds = new Set<string>();
    workoutSchema.items.forEach((item) => {
      if (item.itemType === 'exercise' && item.exercise) {
        if (item.exercise.exerciseId) {
          activeIds.add(item.exercise.exerciseId);
        }
      } else if (item.itemType === 'section' && item.section) {
        item.section.exercises?.forEach((exercise) => {
          if (exercise?.exerciseId) {
            activeIds.add(exercise.exerciseId);
          }
        });
      }
    });
    return activeIds;
  }, [workoutSchema]);

  // Get sections for equipment and overview panels
  const sectionsForPanels = getSectionsFromItems();

  // Render a section item
  const renderSectionItem = (section: WorkoutSection, itemIndex: number) => {
    const isCollapsed = collapsedSections.has(section.id);
    return (
      <div key={section.id} data-top-level-item className="relative flex w-full items-stretch flex-shrink-0 min-w-0">
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
            <div className="flex items-center justify-between px-3 py-2 pb-0 gap-1">
              <div className="flex items-center gap-1 flex-1">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-foreground bg-background border-input shadow-none shrink-0"
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
                      aria-label={isCollapsed ? 'Expand section' : 'Collapse section'}
                    >
                      {isCollapsed ? <ChevronDown className="size-4" /> : <ChevronUp className="size-4" />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {isCollapsed ? 'Expand section' : 'Collapse section'}
                  </TooltipContent>
                </Tooltip>
                <Input
                  className="h-7 flex-1 border-input bg-background text-sm focus-visible:ring-primary shadow-none"
                  placeholder={section.type ? (section.type.charAt(0).toUpperCase() + section.type.slice(1)) : 'Section'}
                  value={section.name || ''}
                  onChange={(e) => {
                    const newName = e.target.value;
                    onDirtyChange?.();
                    setWorkoutSchema((prev) => ({
                      ...prev,
                      items: prev.items.map((item) => {
                        if (item.itemType === 'section' && item.section.id === section.id) {
                          return {
                            ...item,
                            section: { ...item.section, name: newName },
                          };
                        }
                        return item;
                      }),
                    }));
                  }}
                />
                {section.type && (
                  <Badge variant="outline" className="h-7 px-2 text-xs font-bold capitalize bg-background text-foreground border-input rounded-md shadow-none">
                    {section.type}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-1">
                {(section.type === 'amrap' || section.type === 'timed' || section.type === 'circuits') && (
                  <div className="relative flex items-center">
                    <span className="absolute left-2 text-[10px] uppercase font-medium text-muted-foreground pointer-events-none">
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
                        const rawValue = e.target.value;
                        // Only allow digits
                        const value = rawValue.replace(/\D/g, '');

                        onDirtyChange?.();
                        setWorkoutSchema((prev) => ({
                          ...prev,
                          items: prev.items.map((item) => {
                            if (item.itemType === 'section' && item.section.id === section.id) {
                              if (section.type === 'amrap') {
                                return {
                                  ...item,
                                  section: {
                                    ...item.section,
                                    roundDurationSec: value ? parseInt(value, 10) : undefined,
                                  },
                                };
                              }
                              return {
                                ...item,
                                section: {
                                  ...item.section,
                                  targetRounds: value ? parseInt(value, 10) : undefined,
                                },

                              };
                            }
                            return item;
                          }),
                        }));
                        if (value && value.trim() !== '') {
                          setSectionValidationErrors((prev) => clearMissingConfigError(section.id, prev));
                        }
                      }}
                      className={cn(
                        'h-7 w-28 text-center text-[11px] bg-background border-input shadow-none',
                        section.type === 'amrap' ? 'pl-14' : 'pl-12',
                        sectionValidationErrors[section.id]?.missingConfig && 'border-destructive focus-visible:ring-destructive'
                      )}
                      placeholder="-"
                    />
                  </div>
                )}
                {/* Hide actions in section mode */}
                {!isSectionMode && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-foreground bg-background border-input shadow-none shrink-0"
                      >
                        <Ellipsis className="size-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {itemIndex > 0 && (
                        <DropdownMenuItem onClick={() => handleMoveTopLevelExerciseUp(itemIndex)}>
                          <ArrowUp className="size-4 mr-2" />
                          Move up
                        </DropdownMenuItem>
                      )}
                      {itemIndex < workoutSchema.items.length - 1 && (
                        <DropdownMenuItem onClick={() => handleMoveTopLevelExerciseDown(itemIndex)}>
                          <ArrowDown className="size-4 mr-2" />
                          Move down
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem
                        onClick={() => setSectionToDelete(section)}
                      >
                        <Trash2 className="size-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>
            {/* Section Notes */}
            {!isCollapsed && (
              <div className="px-3 pb-2 w-full relative">
                <Input
                  placeholder="Notes"
                  value={section.notes || ''}
                  onChange={(e) => {
                    const newNotes = e.target.value;
                    onDirtyChange?.();
                    setWorkoutSchema((prev) => ({
                      ...prev,
                      items: prev.items.map((item) => {
                        if (item.itemType === 'section' && item.section.id === section.id) {
                          return {
                            ...item,
                            section: { ...item.section, notes: newNotes },
                          };
                        }
                        return item;
                      }),
                    }));
                  }}
                  className="w-full text-xs h-7 border-input bg-background shadow-none pr-8"
                />
                {section.notes && (
                  <button
                    type="button"
                    onClick={() => {
                      onDirtyChange?.();
                      setWorkoutSchema((prev) => ({
                        ...prev,
                        items: prev.items.map((item) => {
                          if (item.itemType === 'section' && item.section.id === section.id) {
                            return {
                              ...item,
                              section: { ...item.section, notes: '' },
                            };
                          }
                          return item;
                        }),
                      }));
                    }}
                    className="absolute right-5 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                    aria-label="Clear notes"
                  >
                    <X className="size-3" />
                  </button>
                )}
              </div>
            )}
          </CardHeader>
          {!isCollapsed && (
            <div className="overflow-hidden transition-all duration-300 ease-in-out" style={{ maxHeight: '10000px', opacity: 1 }}>
              <CardContent
                ref={(el) => registerSectionRef(section.id, el)}
                data-workout-section
                className="flex-1 flex flex-col px-3 py-1.5 pb-0"
                onDragOver={(e) => handleSectionDragOver(e, section.id, section.exercises?.length || 0)}
                onDragLeave={handleSectionDragLeave}
                onDrop={(e) => handleSectionDrop(e, section.id)}
              >
                <div className={cn(
                  'flex-1 w-full',
                  section.exercises && section.exercises.length > 0 ? 'flex flex-col gap-0' : 'flex items-center justify-center'
                )}>
                  {section.exercises && section.exercises.length > 0 ? (
                    <div className="w-full flex flex-col gap-0">
                      {/* Drop zone before first exercise */}
                      <div
                        className={cn(
                          'w-full',
                          draggedExercise && dragOverSlot && dragOverSlot.sectionId === section.id && dragOverSlot.slotIndex === 0
                            ? 'my-1 min-h-14 border-2 border-dashed border-primary bg-primary/5 rounded-lg flex items-center justify-center text-primary text-sm'
                            : 'h-0'
                        )}
                      >
                        {draggedExercise && dragOverSlot && dragOverSlot.sectionId === section.id && dragOverSlot.slotIndex === 0 && (
                          <span>Drop your exercise here</span>
                        )}
                      </div>

                      {section.exercises.map((exercise, exerciseIndex) => {
                        const nextExercise = section.exercises?.[exerciseIndex + 1];
                        const prevExercise = exerciseIndex > 0 ? section.exercises?.[exerciseIndex - 1] : null;

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
                          exerciseIndex === 0 ? '' : isLinkedToPrev ? '-mt-px' : isLinkedToNext ? 'mt-0' : 'mt-1'
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
                              className={cn(focusedExerciseId === exercise.exerciseId && "[&>div]:!border-primary [&>div]:!border [&>div]:animate-pulse")}
                            >
                              <ExerciseCard
                                key={`${exercise.instanceId}-${exercise.sets?.length || 0}`}
                                exercise={exercise}
                                isLinkedToPrev={isLinkedToPrev}
                                isLinkedToNext={isLinkedToNext}
                                onVideoClick={handleExerciseClick}
                                sectionType={section.type}
                                validationErrors={validationErrors[exercise.instanceId]}
                                hasSupersetError={validationErrors[exercise.instanceId]?.supersetMismatch}
                                onClearValidationField={(setIndex, field) =>
                                  handleClearSetValidationField(exercise.instanceId, setIndex, field)
                                }
                                onMoveUp={exerciseIndex > 0 ? () => handleMoveExerciseUp(section.id, exerciseIndex) : undefined}
                                onMoveDown={exerciseIndex < (section.exercises?.length || 0) - 1 ? () => handleMoveExerciseDown(section.id, exerciseIndex, section.exercises?.length || 0) : undefined}
                                canMoveUp={exerciseIndex > 0}
                                canMoveDown={exerciseIndex < (section.exercises?.length || 0) - 1}
                                onExerciseChange={(newExercise) => {
                                  onDirtyChange?.();
                                  const castExercise = newExercise as ExerciseWithSuperset;
                                  handleRecomputeExerciseValidation(
                                    exercise.instanceId,
                                    castExercise.exerciseType as 'weight_reps' | 'reps' | 'distance_duration',
                                    castExercise.sets || []
                                  );

                                  setWorkoutSchema((prev) => ({
                                    ...prev,
                                    items: prev.items.map((item) => {
                                      if (item.itemType === 'section' && item.section.id === section.id && item.section.exercises) {
                                        const updatedExercises: ExerciseWithSuperset[] = [...item.section.exercises];
                                        updatedExercises[exerciseIndex] = {
                                          ...castExercise,
                                          supersetGroupId: exercise.supersetGroupId,
                                        };
                                        return {
                                          ...item,
                                          section: { ...item.section, exercises: updatedExercises },
                                        };
                                      }
                                      return item;
                                    }),
                                  }));
                                }}
                                onDelete={() => {
                                  onDirtyChange?.();
                                  setWorkoutSchema((prev) => ({
                                    ...prev,
                                    items: prev.items.map((item) => {
                                      if (item.itemType === 'section' && item.section.id === section.id && item.section.exercises) {
                                        const updatedExercises = item.section.exercises.filter((_, idx) => idx !== exerciseIndex);
                                        return {
                                          ...item,
                                          section: { ...item.section, exercises: updatedExercises },
                                        };
                                      }
                                      return item;
                                    }),
                                  }));
                                }}
                              />
                            </div>

                            {/* Drop zone between exercises OR superset button */}
                            {section.exercises && exerciseIndex < section.exercises.length - 1 && (
                              <>
                                {isLinkedToNext ? (
                                  // Linked superset - show unlink button (no drop zone even when dragging)
                                  <div className={cn(
                                    "relative flex items-center justify-center bg-background py-1",
                                    // Add red borders on left/right if superset has error
                                    validationErrors[exercise.instanceId]?.supersetMismatch
                                      ? "border-x-2 border-x-destructive"
                                      : "border-x"
                                  )}>
                                    <Separator className="absolute w-full" />
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      className="gap-1.5 bg-background z-10 text-xs h-7 px-2"
                                      onClick={() => handleSupersetUnlink(section.id, exerciseIndex)}
                                    >
                                      <Link2Off className="size-3" />
                                      Unlink
                                    </Button>
                                  </div>
                                ) : draggedExercise && dragOverSlot && dragOverSlot.sectionId === section.id && dragOverSlot.slotIndex === exerciseIndex + 1 ? (
                                  // Dragging and this is the drop slot - show drop zone
                                  <div className="my-2 min-h-14 border-2 border-dashed border-primary bg-primary/5 rounded-lg flex items-center justify-center text-primary text-sm transition-all duration-200">
                                    <span>Drop your exercise here</span>
                                  </div>
                                ) : (
                                  // Show superset button (visible even when dragging, unless drop zone is showing here)
                                  <div className="flex justify-center my-2">
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      className="gap-1.5 text-xs h-7 px-2"
                                      onClick={() => handleSupersetLink(section.id, exerciseIndex)}
                                    >
                                      <Link2 className="size-3" />
                                      Superset
                                    </Button>
                                  </div>
                                )}
                              </>
                            )}

                            {/* Drop zone after the last exercise */}
                            {section.exercises && exerciseIndex === section.exercises.length - 1 && draggedExercise && dragOverSlot && dragOverSlot.sectionId === section.id && dragOverSlot.slotIndex === exerciseIndex + 1 && (
                              <div className="my-2 min-h-14 border-2 border-dashed border-primary bg-primary/5 rounded-lg flex items-center justify-center text-primary text-sm transition-all duration-200">
                                <span>Drop your exercise here</span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                      <div className="flex justify-center py-3">
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
                        'flex flex-col items-center justify-center w-full transition-all duration-200 my-4 py-2 border-2 border-dashed rounded-lg min-h-[120px] gap-3',
                        dragOverSectionId === section.id
                          ? 'border-primary bg-primary/5'
                          : sectionValidationErrors[section.id]?.emptyExercises
                            ? 'border-destructive bg-destructive/5'
                            : 'border-muted-foreground/30 hover:border-primary/50'
                      )}
                    >
                      {dragOverSectionId === section.id ? (
                        <p className="text-primary font-medium text-sm text-center">
                          Drop your exercise here
                        </p>
                      ) : (
                        <>
                          <p className="text-muted-foreground text-sm text-center">
                            Drag exercises from the left or
                          </p>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="gap-1.5 h-8 px-3"
                            onClick={() => handleAddExercise(section.id)}
                          >
                            <Plus className="size-3.5" />
                            Add Exercise
                          </Button>
                        </>
                      )}
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

  // Render a top-level exercise item
  const renderExerciseItem = (exercise: ExerciseWithSuperset, itemIndex: number) => {
    const nextItem = workoutSchema.items[itemIndex + 1];
    const prevItem = itemIndex > 0 ? workoutSchema.items[itemIndex - 1] : null;

    const isLinkedToNext = !!(
      exercise.supersetGroupId &&
      nextItem?.itemType === 'exercise' &&
      nextItem.exercise.supersetGroupId === exercise.supersetGroupId
    );

    const isLinkedToPrev = !!(
      exercise.supersetGroupId &&
      prevItem?.itemType === 'exercise' &&
      prevItem.exercise.supersetGroupId === exercise.supersetGroupId
    );

    // Can move if not at start/end of items list
    const canMoveUp = itemIndex > 0;
    const canMoveDown = itemIndex < workoutSchema.items.length - 1;

    return (
      <div
        key={exercise.instanceId}
        data-top-level-item
        ref={(el) => {
          if (el) {
            exerciseRefs.current.set(exercise.exerciseId, el);
          } else {
            exerciseRefs.current.delete(exercise.exerciseId);
          }
        }}
        className={cn(
          'flex flex-col',
          isLinkedToNext ? 'gap-0' : 'gap-2',
          itemIndex === 0 ? '' : isLinkedToPrev ? '-mt-px' : 'mt-1'
        )}
      >
        <div
          data-exercise-card
          className={cn(focusedExerciseId === exercise.exerciseId && "[&>div]:!border-primary [&>div]:!border [&>div]:animate-pulse")}
        >
          <ExerciseCard
            key={`${exercise.instanceId}-${exercise.sets?.length || 0}`}
            exercise={exercise}
            isLinkedToPrev={isLinkedToPrev}
            isLinkedToNext={isLinkedToNext}
            onVideoClick={handleExerciseClick}
            sectionType="regular"
            validationErrors={validationErrors[exercise.instanceId]}
            hasSupersetError={validationErrors[exercise.instanceId]?.supersetMismatch}
            onClearValidationField={(setIndex, field) =>
              handleClearSetValidationField(exercise.instanceId, setIndex, field)
            }
            onMoveUp={canMoveUp ? () => handleMoveTopLevelExerciseUp(itemIndex) : undefined}
            onMoveDown={canMoveDown ? () => handleMoveTopLevelExerciseDown(itemIndex) : undefined}
            canMoveUp={canMoveUp}
            canMoveDown={canMoveDown}
            onExerciseChange={(newExercise) => {
              onDirtyChange?.();
              const castExercise = newExercise as ExerciseWithSuperset;
              handleRecomputeExerciseValidation(
                exercise.instanceId,
                castExercise.exerciseType as 'weight_reps' | 'reps' | 'distance_duration',
                castExercise.sets || []
              );

              setWorkoutSchema((prev) => ({
                ...prev,
                items: prev.items.map((item, idx) => {
                  if (idx === itemIndex && item.itemType === 'exercise') {
                    return {
                      ...item,
                      exercise: {
                        ...castExercise,
                        supersetGroupId: exercise.supersetGroupId,
                      },
                    };
                  }
                  return item;
                }),
              }));
            }}
            onDelete={() => {
              onDirtyChange?.();
              setWorkoutSchema((prev) => deleteTopLevelExercise(exercise.instanceId, prev));
            }}
          />
        </div>

        {/* Show superset link/unlink button or drop zone for adjacent exercise items */}
        {nextItem?.itemType === 'exercise' && (
          <>
            {isLinkedToNext ? (
              // Linked superset - show unlink button (always visible, even when dragging)
              <div className={cn(
                "relative flex items-center justify-center bg-background py-1 -mb-2",
                // Add red borders on left/right if superset has error
                validationErrors[exercise.instanceId]?.supersetMismatch
                  ? "border-x-2 border-x-destructive"
                  : "border-x"
              )}>
                <Separator className="absolute w-full" />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5 bg-background z-10 text-xs h-7 px-2"
                  onClick={() => handleTopLevelSupersetUnlink(itemIndex)}
                >
                  <Link2Off className="size-3" />
                  Unlink
                </Button>
              </div>
            ) : draggedExercise && dragOverTopLevelSlot === itemIndex + 1 ? (
              // Dragging and this is the drop slot - show drop zone
              <div className="h-14 my-2 border-2 border-dashed border-primary bg-primary/5 rounded-lg flex items-center justify-center text-primary text-sm transition-all duration-200">
                <span>Drop exercise here</span>
              </div>
            ) : (
              // Show superset button (visible even when dragging, unless drop zone is showing here)
              <div className="flex justify-center my-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-xs h-7 px-2"
                  onClick={() => handleTopLevelSupersetLink(itemIndex)}
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
  };

  return (
    <div className="flex h-full max-h-full overflow-hidden min-h-0 bg-background p-2">
      <div className="flex-[1.5] p-2 h-full flex flex-col min-h-0">
        <Card className="relative h-full" style={{ height: '100%' }}>
          <CardContent className="absolute inset-0 p-4 overflow-y-auto flex flex-col">
            {/* Hide tabs in section mode - only show exercise panel */}
            {!isSectionMode && (
              <Tabs
                value={builderMode}
                onValueChange={(value) => {
                  if (value) setBuilderMode(value as 'exercise' | 'section');
                }}
              >
                <TabsList className="w-full">
                  <TabsTrigger
                    value="exercise"
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
            )}
            {(builderMode === 'exercise' || isSectionMode) && (
              <div className={cn("flex-1 min-h-0", !isSectionMode && "mt-4")}>
                <ExerciseSelectionPanel
                  onExerciseClick={handleExerciseClick}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                  activeExerciseIds={activeExerciseIds}
                />
              </div>
            )}
            {builderMode === 'section' && !isSectionMode && (
              <div className="flex-1 min-h-0 mt-4">
                <CoachSectionsSidebar onDragStart={handleSectionSourceDragStart} />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      <div className="flex-[3.25] p-2 h-full flex flex-col min-h-0">
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
            ref={(el) => {
              contentScrollRef.current = el;
              registerTopLevelContainerRef(el);
            }}
            data-top-level-container
            className="absolute inset-0 p-4 overflow-y-auto"
            onDragOver={(e) => hookHandleTopLevelDragOver(e, workoutSchema.items.length)}
            onDragLeave={hookHandleTopLevelDragLeave}
            onDrop={handleTopLevelDropHandler}
          >
            {workoutSchema.items.length > 0 ? (
              <div className="flex flex-col gap-2 w-full min-h-0">
                {workoutSchema.items.map((item, itemIndex) => {
                  const nextItem = workoutSchema.items[itemIndex + 1];
                  const prevItem = itemIndex > 0 ? workoutSchema.items[itemIndex - 1] : null;

                  // Check if this item is linked to previous or next
                  const isLinkedToPrev = !!(
                    item.itemType === 'exercise' &&
                    prevItem?.itemType === 'exercise' &&
                    item.exercise?.supersetGroupId &&
                    prevItem.exercise?.supersetGroupId === item.exercise.supersetGroupId
                  );

                  const isLinkedToNext = !!(
                    item.itemType === 'exercise' &&
                    nextItem?.itemType === 'exercise' &&
                    item.exercise?.supersetGroupId &&
                    nextItem.exercise?.supersetGroupId === item.exercise.supersetGroupId
                  );

                  // Check if current/prev/next items are sections
                  const isSection = item.itemType === 'section';
                  const isPrevSection = prevItem?.itemType === 'section';
                  const isNextSection = nextItem?.itemType === 'section';

                  // Check if there's a superset button area that will handle the drop zone
                  const hasSupersetButtonAfter = item.itemType === 'exercise' && nextItem?.itemType === 'exercise';

                  // Determine where drop zones CAN appear:
                  // - Before: not if linked to previous, AND not if previous item is an exercise (superset area handles it)
                  //   Special case: allow before sections if there's no previous item (top of list)
                  // - After: not if linked to next, AND not if superset button area exists (it handles the drop zone internally)
                  const canShowDropZoneBefore = !isLinkedToPrev && prevItem?.itemType !== 'exercise' && (!isSection || !prevItem);
                  const canShowDropZoneAfter = !isLinkedToNext && !hasSupersetButtonAfter;

                  // ONLY ONE drop zone appears at a time - the one matching dragOverTopLevelSlot
                  // Priority: "after" drop zones take precedence over "before" drop zones to avoid duplicates
                  const isDraggingSomething = draggedExercise || draggedSection;
                  const isPrevItemShowingDropZoneAfter = isDraggingSomething && dragOverTopLevelSlot === itemIndex && prevItem;
                  // Sections can drop anywhere at top level but not between exercises in superset or inside sections
                  const showDropZoneBefore = isDraggingSomething && dragOverTopLevelSlot === itemIndex && canShowDropZoneBefore && !isPrevItemShowingDropZoneAfter;
                  const showDropZoneAfter = isDraggingSomething && dragOverTopLevelSlot === itemIndex + 1 && canShowDropZoneAfter;

                  // Add extra spacing around sections
                  const extraTopMargin = isSection && isPrevSection ? 'mt-2' : isSection && prevItem ? 'mt-4' : '';
                  const extraBottomMargin = isSection && isNextSection ? 'mb-2' : isSection && nextItem ? 'mb-4' : '';

                  return (
                    <React.Fragment key={item.itemType === 'section' ? item.section.id : item.exercise.instanceId}>
                      {/* Drop zone before this item - ONLY if this is the nearest slot and NOT inside a section */}
                      {showDropZoneBefore && (
                        <div className="h-14 mb-1 border-2 border-dashed border-primary bg-primary/5 rounded-lg flex items-center justify-center text-primary text-sm transition-all duration-200">
                          <span>{draggedSection ? 'Drop section here' : 'Drop exercise here'}</span>
                        </div>
                      )}

                      {/* Render the item (section or exercise) with extra spacing */}
                      <div className={cn(extraTopMargin, extraBottomMargin)}>
                        {item.itemType === 'section'
                          ? (item.section ? renderSectionItem(item.section, itemIndex) : null)
                          : (item.exercise ? renderExerciseItem(item.exercise, itemIndex) : null)
                        }
                      </div>

                      {/* Drop zone after this item - ONLY if this is the nearest slot and NOT in superset area */}
                      {showDropZoneAfter && (
                        <div className="h-14 mt-1 border-2 border-dashed border-primary bg-primary/5 rounded-lg flex items-center justify-center text-primary text-sm transition-all duration-200">
                          <span>{draggedSection ? 'Drop section here' : 'Drop exercise here'}</span>
                        </div>
                      )}
                    </React.Fragment>
                  );
                })}
                {/* Hide "Add exercise" and "Add section" buttons in section mode */}
                {!isSectionMode && (
                  <div className="flex flex-col gap-2 py-2 w-full">
                    {isCreatingSection && (
                      <div ref={creatorRef} className="w-full mb-2">
                        <InlineSectionCreator
                          onCreate={handleCreateSection}
                          onCancel={() => setIsCreatingSection(false)}
                        />
                      </div>
                    )}
                    <div className="flex items-center justify-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="gap-1.5 text-xs h-7 px-2"
                        onClick={handleAddTopLevelExercise}
                      >
                        <Plus className="size-3" />
                        <span>Add exercise</span>
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="gap-1.5 text-xs h-7 px-2"
                        onClick={() => setIsCreatingSection(true)}
                      >
                        <Plus className="size-3" />
                        <span>Create section</span>
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full gap-6 transition-all duration-200 relative p-4">
                {/* Empty state content - hidden when dragging */}
                {!(dragOverTopLevelSlot === 0 && draggedExercise) && (
                  <div className="flex flex-col items-center gap-6 text-center w-full max-w-3xl">
                    <div className="flex flex-col gap-3 max-w-md mx-auto">
                      <h3 className="text-4xl font-bold">Start building your workout</h3>
                      <p className="text-l font-semibold text-muted-foreground">
                        Add exercises or create sections to organize your training
                      </p>
                    </div>

                    {isCreatingSection && (
                      <div ref={creatorRef} className="w-full mb-4">
                        <InlineSectionCreator
                          onCreate={handleCreateSection}
                          onCancel={() => setIsCreatingSection(false)}
                        />
                      </div>
                    )}

                    <div className="flex gap-2 items-center justify-center w-full">
                      <Button
                        type="button"
                        variant="outline"
                        className="gap-2"
                        onClick={() => setIsCreatingSection(true)}
                      >
                        <Plus className="size-4" />
                        <span>Create section</span>
                      </Button>

                      <Button
                        type="button"
                        className="gap-2"
                        onClick={handleAddTopLevelExercise}
                      >
                        <Plus className="size-4" />
                        <span>Add exercise</span>
                      </Button>
                    </div>
                  </div>
                )}

                {/* Drag overlay - shown when dragging */}
                {(draggedExercise || draggedSection) && (
                  <div className="absolute inset-0 border-2 border-dashed rounded-lg border-primary bg-primary/5 flex items-center justify-center">
                    <p className="text-primary font-medium text-lg">
                      {draggedExercise ? 'Drop your exercise here' : 'Drop your section here'}
                    </p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      <div className="flex-[1.25] p-2 h-full flex flex-col min-h-0">
        <Card className="relative h-full" style={{ height: '100%' }}>
          <CardContent className="absolute inset-0 p-4 overflow-y-auto">

            <OverviewPanel
              items={workoutSchema.items}
              onItemsChange={(items: WorkoutSchemaItem[]) => {
                onDirtyChange?.();
                setWorkoutSchema((prev) => ({
                  ...prev,
                  items,
                }));
              }}
              onDeleteSection={handleDeleteSection}
              onDeleteExercise={handleDeleteExerciseFromOverview}
              onDeleteTopLevelExercise={(instanceId: string) => {
                setWorkoutSchema((prev) => deleteTopLevelExercise(instanceId, prev));
                onDirtyChange?.();
              }}
              onDeleteSuperset={handleDeleteSupersetFromOverview}
              onDeleteTopLevelSuperset={(exerciseIds: string[]) => {
                setWorkoutSchema((prev) => ({
                  ...prev,
                  items: prev.items.filter(
                    (item) => !(item.itemType === 'exercise' && exerciseIds.includes(item.exercise.instanceId))
                  ),
                }));
                onDirtyChange?.();
              }}
              onUnlinkSuperset={handleSupersetUnlink}
              onUnlinkTopLevelSuperset={handleTopLevelSupersetUnlink}
              groupExercisesBySuperset={groupExercisesBySuperset as any}
              onExerciseClick={handleExerciseClickByIdWrapper}
              validationErrors={validationErrors}
              isSectionMode={isSectionMode}
            />
          </CardContent>
        </Card>
      </div>
      <VideoModal
        open={isVideoModalOpen}
        onOpenChange={setIsVideoModalOpen}
        exercise={selectedExercise}
      />
      <ConfirmDeleteDialog
        open={!!sectionToDelete}
        onOpenChange={(open) => !open && setSectionToDelete(null)}
        onConfirm={() => {
          if (sectionToDelete) {
            handleDeleteSection(sectionToDelete.id);
            setSectionToDelete(null);
          }
        }}
        itemName={sectionToDelete?.name || sectionToDelete?.type.charAt(0).toUpperCase() + (sectionToDelete?.type.slice(1) || '') + ' section'}
        itemType="section"
        variant="default"
      />
    </div >
  );
};
