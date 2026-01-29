'use client';

import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useQueryClient } from '@tanstack/react-query';
import Image from 'next/image';
import { ArrowDown, ArrowUp, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Dumbbell, Ellipsis, FileText, Info, Link2, Link2Off, Loader2, NotebookPen, Plus, Repeat, Save, Sparkles, Timer, Trash2, X, Check } from 'lucide-react';
import Lottie from 'lottie-react';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ButtonGroup } from '@/components/ui/button-group';
import { RequiredAsterisk } from '@/components/ui/required-asterisk';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { isEqual, cloneDeep } from 'lodash';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/general/utils';
import { WORKOUT_TYPES, DIFFICULTY_LEVELS } from '@athli/shared-types';
import { useExerciseLookup, type Exercise } from '@/hooks/use-all-exercises';
import { generateWorkoutFromPrompt, type GeneratedWorkout } from '@/api/exercise/generate-exercise';
import { toast } from 'sonner';
import { useExerciseDragDrop } from '@/components/training/hooks/use-exercise-drag-drop';
import type {
  WorkoutProgramPayload,
} from '@/components/training/workout-schema';
import type { SetData } from '@/components/training/builder/exercise-card';
import { ExerciseCard } from '@/components/training/builder/exercise-card';
import { ExerciseSelectionPanel } from '@/components/training/builder/exercise-selection-panel';
import { CoachSectionsSidebar } from '@/components/training/builder/coach-sections-sidebar';
import { InlineSectionCreator } from '@/components/training/builder/inline-section-creator';
import { getSectionById, createSection, type Section } from '@/api/coach/coach-section-service';
import { SectionType } from '@/app/training/sections/section-type-utils';

import { OverviewPanel } from '@/components/training/builder/overview-panel';
import { VideoModal } from '@/components/training/builder/video-modal';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ConfirmDeleteDialog } from '@/components/app/confirm-delete-dialog';
import { DiscardChangesDialog } from '@/components/app/discard-changes-dialog';
import type {
  ExerciseWithSuperset,
  WorkoutSchema,
  WorkoutSchemaItem,
  WorkoutSection,
  WorkoutMeta,
  SetFieldValidation,
  ValidationErrors,
  SectionValidationErrors,
} from '@/components/training/shared/types/workout-builder.types';
import {
  recomputeExerciseValidation as recomputeValidation,
  clearSetValidationField as clearFieldValidation,
  validateWorkoutSchema,
  clearEmptyExercisesError,
  clearMissingConfigError,
} from '@/components/training/shared/utils/validation';
import {
  buildWorkoutPayload,
  adaptSection,
} from '@/components/training/shared/utils/payload-builder';
import { buildSectionPayload } from '@athli/shared-types';
import {
  convertPayloadToBuilderFormat,
} from '@/components/training/shared/utils/payload-converter';
import {
  handleSectionSelect as selectSection,
  handleDeleteSection as deleteSection,
  getSectionDescription,
} from '@/components/training/shared/utils/section-handlers';
import {
  handleDeleteExerciseFromOverview as deleteExerciseFromOverview,
  handleDeleteSupersetFromOverview as deleteSupersetFromOverview,
  handleAddExercise as addExercise,
  handleAddTopLevelExercise as addTopLevelExercise,
  handleDeleteTopLevelExercise as deleteTopLevelExercise,
} from '@/components/training/shared/utils/exercise-handlers';
import {
  groupExercisesBySuperset,
  handleSupersetLink as linkSuperset,
  handleSupersetUnlink as unlinkSuperset,
  handleTopLevelSupersetLink as linkTopLevelSuperset,
  handleTopLevelSupersetUnlink as unlinkTopLevelSuperset,
} from '@/components/training/shared/utils/superset-handlers';
import {
  handleDrop as dropExercise,
  handleSlotDrop,
  handleTopLevelSlotDrop,
} from '@/components/training/shared/utils/drop-handlers';
import {
  handleExerciseClick as scrollToExercise,
  handleExerciseClickById,
} from '@/components/training/shared/utils/exercise-scroll';

type WorkoutBuilderProps = {
  meta: WorkoutMeta | null;
  initialData?: any; // Workout data to initialize the builder with
  isLoadingInitialData?: boolean; // True when initial data is being fetched
  onDirtyChange?: () => void;
  saveSignal?: number;
  onSaveSuccess?: (payload: WorkoutProgramPayload) => Promise<void> | void;
  onSaveError?: () => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDelete?: () => Promise<void> | void;
  initialAiMode?: boolean; // If true, open with AI builder mode active
};

export const WorkoutBuilder = ({
  meta,
  initialData,
  isLoadingInitialData = false,
  onDirtyChange,
  saveSignal,
  onSaveSuccess,
  onSaveError,
  open,
  onOpenChange,
  onDelete,
  initialAiMode = false,
}: WorkoutBuilderProps) => {
  const t = useTranslations();
  const isSectionMode = false;
  const router = useRouter();
  
  // Get exercise lookup function from cached exercises
  const { findExerciseById } = useExerciseLookup();
  const queryClient = useQueryClient();
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [pendingNavigationPath, setPendingNavigationPath] = useState<string | null>(null);

  // Store initial state for deep comparison
  const initialState = useRef<{
    schema: WorkoutSchema;
    name: string;
    type: string;
    difficulty: string;
    description: string;
  } | null>(null);

  const markDirty = () => {
    // Deprecated? We will use effect to track dirty state
    // But keeping it for manual triggers if needed, although effect covers most cases
    // actually, let's keep it but rely on effect for true dirty checking
    // setIsDirty(true); 
  };

  const [isSaving, setIsSaving] = useState(false);
  const [isOverviewOpen, setIsOverviewOpen] = useState(true);
  const [isTitleExpanded, setIsTitleExpanded] = useState(false);
  const [workoutTitle, setWorkoutTitle] = useState(meta?.name || '');
  const [workoutType, setWorkoutType] = useState(meta?.type || '');
  const [difficulty, setDifficulty] = useState(meta?.difficulty || 'all_levels');
  const [description, setDescription] = useState(meta?.description || '');

  // Initialize with empty items array (default for new workout)
  // OR use initialData if provided (converted from payload format)
  const getInitialSchema = (): WorkoutSchema => {
    // Priority 1: Use initialData prop if provided
    if (initialData) {
      // Check both top-level items and nested workout_data.items
      const data = initialData as any;
      const items = data.items?.length > 0
        ? data.items
        : data.workout_data?.items;

      if (items?.length > 0) {
        const payloadToConvert = {
          items,
          // Add dummy required fields to satisfy type check (converter only uses items)
          name: '',
          description: '',
          type: '',
          difficulty: '',
          equipment: [],
          totalExercises: 0,
          id: null,
          pre: { sleep: null, mood: null, energy: null, stress: null, soreness: null },
          post: {
            rating: null,
            intensity: null,
            sessionComments: null
          },
          completedSummary: {
            status: 'not_started',
            startedAt: null,
            completedAt: null,
            totalDurationMin: null,
            totalWeightLifted: null
          }
        } as WorkoutProgramPayload;

        const converted = convertPayloadToBuilderFormat(payloadToConvert, findExerciseById);
        return converted;
      }
    }

    // Default: empty workout
    return { items: [] };
  };

  const [workoutSchema, setWorkoutSchema] = useState<WorkoutSchema>(getInitialSchema());
  const [builderMode, setBuilderMode] = useState<'exercise' | 'section'>('exercise');
  const [selectedEquipmentGroups, setSelectedEquipmentGroups] = useState<string[]>([]);
  const [sectionToDelete, setSectionToDelete] = useState<WorkoutSection | null>(null);
  const [savingSectionId, setSavingSectionId] = useState<string | null>(null);
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

  // AI Builder state
  const [activeBuilder, setActiveBuilder] = useState<'ai' | 'manual'>(initialAiMode ? 'ai' : 'manual');
  const [aiPrompt, setAiPrompt] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDraggingAiFile, setIsDraggingAiFile] = useState<boolean>(false);
  const [isGeneratingAi, setIsGeneratingAi] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [aiAnimationData, setAiAnimationData] = useState<object | null>(null);

  // Load AI sphere animation
  useEffect(() => {
    fetch('/animations/ai-sphere-animation.json')
      .then(res => res.json())
      .then(data => setAiAnimationData(data))
      .catch(err => console.error('Failed to load AI animation:', err));
  }, []);

  // Scroll to creator when opened
  useEffect(() => {
    if (isCreatingSection && creatorRef.current) {
      creatorRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [isCreatingSection]);

  // Sync activeBuilder with initialAiMode when dialog opens
  useEffect(() => {
    if (open) {
      setActiveBuilder(initialAiMode ? 'ai' : 'manual');
    }
  }, [open, initialAiMode]);

  // Reset builder mode to 'exercise' when workout is empty
  useEffect(() => {
    if (workoutSchema.items.length === 0) {
      setBuilderMode('exercise');
    }
  }, [workoutSchema.items.length]);

  // Reset save loading status and reset schema when dialog opens
  const prevOpenRef = useRef(open);
  const prevIsLoadingRef = useRef(isLoadingInitialData);
  // Track whether we've initialized with actual data (not empty/null)
  const hasInitializedWithDataRef = useRef(false);

  // Reset save loading status and reset schema when dialog opens
  // ONLY run this when the dialog transitions from closed to open, OR if we strictly need to re-initialize (e.g. data loaded)
  // We avoid adding 'meta' or 'initialData' to the dependency array directly to prevent resets on prop updates during save (optimistic updates)
  useEffect(() => {
    const justOpened = open && !prevOpenRef.current;
    const dataLoaded = !isLoadingInitialData && prevIsLoadingRef.current && open;

    // Initialize if strictly just opened, OR if data just finished loading while open
    // We safeguard with !isDirty checks implicitly for dataLoaded case to avoid wiping work, 
    // although typically data load happens before user can edit much if loading spinner is shown.

    if (justOpened || dataLoaded) {
      setIsSaving(false);
      if (justOpened) {
        hasInitializedWithDataRef.current = false; // Reset the flag when dialog opens
      }

      let initialSchema: WorkoutSchema;

      // Reset schema based on initialData when dialog opens
      const data = initialData as any;
      const initialItems = data?.items?.length > 0
        ? data.items
        : data?.workout_data?.items;

      if (initialItems?.length > 0) {
        // Ensure we pass the structure expected by converter (it expects { items: [] })
        const payloadToConvert = {
          items: initialItems,
          // Add dummy required fields to satisfy type check (converter only uses items)
          name: '',
          description: '',
          type: '',
          difficulty: '',
          equipment: [],
          totalExercises: 0,
          id: null,
          pre: { sleep: null, mood: null, energy: null, stress: null, soreness: null },
          post: {
            rating: null,
            intensity: null,
            sessionComments: null
          },
          completedSummary: {
            status: 'not_started',
            startedAt: null,
            completedAt: null,
            totalDurationMin: null,
            totalWeightLifted: null
          }
        } as WorkoutProgramPayload;

        const converted = convertPayloadToBuilderFormat(payloadToConvert, findExerciseById);
        initialSchema = converted;
        setWorkoutSchema(converted);
        hasInitializedWithDataRef.current = true;
      } else {
        // New workout: start with empty items
        initialSchema = { items: [] };
        setWorkoutSchema({ items: [] });
      }

      // Capture initial state (deep clone to prevent reference issues)
      initialState.current = {
        schema: cloneDeep(initialSchema),
        name: meta?.name || '',
        type: meta?.type || '',
        difficulty: meta?.difficulty || 'all_levels',
        description: meta?.description || '',
      };

      setIsDirty(false);
      setHasAttemptedSave(false);
      setValidationErrors({});
      setSectionValidationErrors({});
      if (onDirtyChange) onDirtyChange();
    }

    prevOpenRef.current = open;
    prevIsLoadingRef.current = isLoadingInitialData;
  }, [open, isLoadingInitialData, initialData, meta, onDirtyChange]);

  // Handle async data arrival: when initialData arrives after dialog is already open
  // This handles the case where the parent doesn't use isLoadingInitialData
  useEffect(() => {
    // Only run if:
    // 1. Dialog is open
    // 2. We haven't initialized with data yet
    // 3. initialData is now available with items
    const data = initialData as any;
    const initialItems = data?.items?.length > 0
      ? data.items
      : data?.workout_data?.items;

    if (open && !hasInitializedWithDataRef.current && initialItems?.length > 0) {
      const payloadToConvert = {
        items: initialItems,
        name: '',
        description: '',
        type: '',
        difficulty: '',
        equipment: [],
        totalExercises: 0,
        id: null,
        pre: { sleep: null, mood: null, energy: null, stress: null, soreness: null },
        post: {
          rating: null,
          intensity: null,
          sessionComments: null
        },
        completedSummary: {
          status: 'not_started',
          startedAt: null,
          completedAt: null,
          totalDurationMin: null,
          totalWeightLifted: null
        }
      } as WorkoutProgramPayload;

      const converted = convertPayloadToBuilderFormat(payloadToConvert, findExerciseById);
      setWorkoutSchema(converted);
      hasInitializedWithDataRef.current = true;

      // Update initial state for dirty tracking (deep clone to prevent reference issues)
      initialState.current = {
        schema: cloneDeep(converted),
        name: meta?.name || '',
        type: meta?.type || '',
        difficulty: meta?.difficulty || 'all_levels',
        description: meta?.description || '',
      };

      setIsDirty(false);
      setHasAttemptedSave(false);
      setValidationErrors({});
      setSectionValidationErrors({});
    }
  }, [open, initialData, meta]);

  // Deep compare current state with initial state to determine isDirty
  useEffect(() => {
    if (!open || !initialState.current) return;

    const currentState = {
      schema: workoutSchema,
      name: workoutTitle,
      type: workoutType,
      difficulty: difficulty,
      description: description,
    };

    // Check if current state differs from initial state
    let isNowDirty = !isEqual(initialState.current, currentState);

    // Additional check: If the workout has exercises/sections added, it's dirty
    // This handles cases where the isEqual comparison might fail due to dynamically generated IDs
    const hasContentInItems = workoutSchema.items.length > 0;
    const initialHadContent = initialState.current.schema.items.length > 0;

    // If content was added/removed, mark as dirty
    if (hasContentInItems !== initialHadContent) {
      isNowDirty = true;
    }

    // Also mark dirty if items count changed
    if (workoutSchema.items.length !== initialState.current.schema.items.length) {
      isNowDirty = true;
    }

    // Also mark dirty if exercises count changed
    const getExerciseCount = (schema: WorkoutSchema) => {
      return schema.items.reduce((count, item) => {
        if (item.itemType === 'section') {
          return count + (item.section.exercises?.length || 0);
        }
        if (item.itemType === 'exercise') {
          return count + 1;
        }
        return count;
      }, 0);
    };

    if (getExerciseCount(workoutSchema) !== getExerciseCount(initialState.current.schema)) {
      isNowDirty = true;
    }

    // Also check if title or description changed
    if (workoutTitle !== initialState.current.name || description !== initialState.current.description) {
      isNowDirty = true;
    }

    if (isDirty !== isNowDirty) {
      setIsDirty(isNowDirty);
      if (isNowDirty) {
        onDirtyChange?.();
      }
    }
  }, [workoutSchema, workoutTitle, workoutType, difficulty, description, open, isDirty, onDirtyChange]);

  // Sync workout fields with meta
  useEffect(() => {
    if (meta) {
      if (meta.name) {
        setWorkoutTitle(meta.name);
      }
      if (meta.type) {
        setWorkoutType(meta.type);
      }
      if (meta.difficulty) {
        setDifficulty(meta.difficulty);
      }
      if (meta.description) {
        setDescription(meta.description);
      }
    }
  }, [meta]);



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

  const processGeneratedWorkout = (aiGenerated: GeneratedWorkout) => {
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
              const foundExercise = findExerciseById(ex.id);
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
                source: 'musclewiki' as const,
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
                  instanceId: ex.id,
                  supersetGroupId,
                  sets,
                },
              });
            });
          } else if (group.exercises && group.exercises.length > 0) {
            const ex = group.exercises[0];
            const foundExercise = findExerciseById(ex.id);
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
              source: 'musclewiki' as const,
            };

            const sets: SetData[] = (ex.sets || []).map((set: any) => ({
              setNumber: set.setNumber,
              type: set.type || (set.isDropset ? 'dropset' : 'normal'),
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
                instanceId: ex.id,
                supersetGroupId: null,
                sets,
              },
            });
          }
        });
      } else {
        section.exercises?.forEach((ex: any) => {
          const foundExercise = findExerciseById(ex.id);
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
            source: 'musclewiki' as const,
          };

          const sets: SetData[] = (ex.sets || []).map((set: any) => ({
            setNumber: set.setNumber,
            type: set.type || 'normal',
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
      markDirty();
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
          markDirty();
        }

        if (index === exercisesToAdd.length - 1) {
          setTimeout(() => {
            setIsLoadingAiWorkout(false);
          }, 100);
        }
      }, index * delayPerExercise);
    });
  };

  // NOTE: We no longer load from localStorage here.
  // The schema is initialized via the initialData prop in the useEffect above.
  // This prevents stale localStorage data from overwriting the current workout data.

  // Load AI generated workout on mount with gradual loading
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const aiGeneratedRaw = window.localStorage.getItem('athli_ai_generated_workout');
    if (!aiGeneratedRaw) return;

    try {
      const aiGenerated: GeneratedWorkout = JSON.parse(aiGeneratedRaw);
      processGeneratedWorkout(aiGenerated);
      window.localStorage.removeItem('athli_ai_generated_workout');
    } catch (error) {
      console.error('Failed to load AI generated workout', error);
    }
  }, [onDirtyChange]);

  // AI Generation logic
  // TODO: AI Workout Generation Integration
  // The AI needs the following context to generate valid workouts:
  //
  // 1. EXERCISE DATABASE CONTEXT:
  //    - Query the `musclewiki_exercise_cache` Supabase table for context 
  //    - AI must understand available exercise names and their corresponding IDs
  //    - Exercise IDs are CRITICAL - the AI must use exact IDs from the cache
  //
  // 2. PAYLOAD STRUCTURE:
  //    - AI must return a payload matching `WorkoutProgramPayload` from @packages/shared-types/src/workout-schema.ts
  //    - The payload should include a mix of:
  //      * Top-level exercises (itemType: 'exercise')
  //      * Sections (itemType: 'section') with types: 'regular', 'amrap', 'timed', 'circuits', 'auxiliary'
  //      * Supersets within sections (exercises sharing the same supersetId)
  //
  // 3. REQUIRED FIELDS:
  //    - Sets and exercises must include all neccesayr fields such as ids, setNumber, type, trackableField1, trackableField2, restSec
  //    - Sections need: id, name, type, notes, and type-specific fields (durationSec for amrap, targetRounds for timed/circuits)
  //
  // 4. VALIDATION:
  //    - All exercise IDs must exist in musclewiki_exercise_cache
  //    - Payload must be parseable by convertPayloadToBuilderFormat() and processGeneratedWorkout()
  //
  const handleAiGenerate = async () => {
    if (!aiPrompt.trim()) return;

    setIsGeneratingAi(true);
    let pdfContent: string | null = null;

    if (selectedFile) {
      try {
        pdfContent = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            const arrayBuffer = e.target?.result as ArrayBuffer;
            const bytes = new Uint8Array(arrayBuffer);
            let binary = '';
            for (let i = 0; i < bytes.byteLength; i++) {
              binary += String.fromCharCode(bytes[i]);
            }
            const base64 = btoa(binary);
            resolve(base64);
          };
          reader.onerror = reject;
          reader.readAsArrayBuffer(selectedFile);
        });
      } catch (error) {
        console.error('Error reading PDF:', error);
      }
    }

    try {
      const generated = await generateWorkoutFromPrompt(aiPrompt.trim(), pdfContent);
      if (generated) {
        processGeneratedWorkout(generated);
        setActiveBuilder('manual'); // Switch back to manual to see the results
      } else {
        toast.error('Failed to generate workout');
      }
    } catch (error) {
      console.error('Failed to generate workout from AI', error);
      toast.error('An error occurred during generation');
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const handleAiFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setSelectedFile(file);
    }
  };

  const handleRemoveAiFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleUseAiExample = () => {
    const examplePrompt = `Create a full-body strength and conditioning workout for intermediate level. Include:

- 3-4 compound exercises (squats, deadlifts, bench press variations)
- 2-3 accessory movements for arms and core
- 3-4 sets per exercise
- Progressive rep ranges (8-12 reps for strength, 12-15 for hypertrophy)
- 60-90 seconds rest between sets
- Total workout duration: 45-60 minutes

Focus on proper form and progressive overload.`;
    setAiPrompt(examplePrompt);
  };

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
      setCollapsedSections,
      findExerciseById
    );
  };

  const handleRecomputeExerciseValidation = (
    exerciseInstanceId: string,
    exerciseType: 'weight_reps' | 'reps' | 'distance_duration',
    sets: SetData[] | undefined,
    eachSide?: boolean
  ) => {
    setValidationErrors((prev) =>
      recomputeValidation(exerciseInstanceId, exerciseType, sets, hasAttemptedSave, prev, eachSide)
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



  const handleSave = async () => {
    setHasAttemptedSave(true);

    // Validate workout title is not empty
    if (!workoutTitle || workoutTitle.trim() === '') {
      toast.error('Please enter a workout name');
      if (onSaveError) onSaveError();
      return;
    }

    // Check for blank exercise cards (exercises without a selected exercise)
    const hasBlankExercises = workoutSchema.items.some((item) => {
      if (item.itemType === 'exercise') {
        // Check if exercise has no name (blank exercise card)
        return !item.exercise.name || item.exercise.name.trim() === '';
      }
      if (item.itemType === 'section') {
        // Check exercises within sections
        return item.section.exercises?.some(
          (ex) => !ex.name || ex.name.trim() === ''
        );
      }
      return false;
    });

    if (hasBlankExercises) {
      toast.error('Please select an exercise for all exercise cards');
      if (onSaveError) onSaveError();
      return;
    }

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

    // Use updated values from state
    const updatedMeta = meta ? {
      ...meta,
      name: workoutTitle,
      type: workoutType,
      difficulty: difficulty,
      description: description,
    } : null;
    const payload = buildWorkoutPayload(workoutSchema, updatedMeta);
    if (!payload) {
      toast.error('Workout details are missing');
      if (onSaveError) onSaveError();
      return;
    }

    if (onSaveSuccess) {
      setIsSaving(true);
      try {
        const result = onSaveSuccess(payload);
        // If onSaveSuccess returns a Promise, await it
        // The parent component handles showing toasts and closing the dialog
        if (result instanceof Promise) {
          await result;
          setIsSaving(false);
          setIsDirty(false);
          // Update initial state to match the saved state (deep clone to prevent reference issues)
          initialState.current = {
            schema: cloneDeep(workoutSchema),
            name: workoutTitle,
            type: workoutType,
            difficulty: difficulty,
            description: description,
          };
        } else {
          // If it doesn't return a Promise, the parent handles everything
          // Just reset loading state - parent will close dialog and show toast
          setIsSaving(false);
          setIsDirty(false);
          initialState.current = {
            schema: cloneDeep(workoutSchema),
            name: workoutTitle,
            type: workoutType,
            difficulty: difficulty,
            description: description,
          };
        }
      } catch (error) {
        setIsSaving(false);
        toast.error('Failed to save workout');
        if (onSaveError) onSaveError();
      }
    }
  };

  useEffect(() => {
    if (!saveSignal || saveSignal === 0) {
      return;
    }
    handleSave();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saveSignal]);

  const handleSectionSelect = (type: 'regular' | 'amrap' | 'timed' | 'circuits' | 'auxiliary') => {
    if (contentScrollRef.current) {
      pendingScrollTopRef.current = contentScrollRef.current.scrollTop;
    }

    setWorkoutSchema((prev) => selectSection(type, prev));
    markDirty();
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

  const handleCreateSection = (name: string, type: SectionType, config?: { roundDurationSec?: number; targetRounds?: number }) => {
    setWorkoutSchema((prev) => selectSection(type, prev, { name, ...config }));
    setIsCreatingSection(false);
    markDirty();
  };

  const handleNavigateRequest = (path: string) => {
    if (isDirty) {
      setPendingNavigationPath(path);
      setShowCloseConfirm(true);
    } else {
      onOpenChange(false);
      router.push(path);
    }
  };


  const handleDeleteSection = (sectionId: string) => {
    const result = deleteSection(sectionId, workoutSchema);
    setWorkoutSchema(result.schema);

    markDirty();
  };

  const handleSaveSectionToLibrary = async (section: WorkoutSection) => {
    setSavingSectionId(section.id);

    try {
      // Convert section to generic format using adapter
      const adaptedSection = adaptSection(section);

      // Use shared package's buildSectionPayload to convert to proper API format
      const sectionPayload = buildSectionPayload(adaptedSection);

      // Build section data with properly formatted exercises
      const sectionData = {
        name: section.name || section.type,
        description: section.notes || '',
        items: [
          {
            itemType: 'section' as const,
            data: sectionPayload,
          },
        ],
        sectionType: section.type,
        duration: section.roundDurationSec ? Math.round(section.roundDurationSec / 60) : undefined,
        rounds: section.targetRounds,
      };

      await createSection(sectionData as unknown as Parameters<typeof createSection>[0]);

      // Invalidate sections query to refresh the library
      await queryClient.invalidateQueries({ queryKey: ['coach-sections'] });

      toast.success('Section saved to library');
    } catch (error) {
      console.error('Error saving section to library:', error);
      toast.error('Failed to save section to library');
    } finally {
      setSavingSectionId(null);
    }
  };

  const handleDeleteExerciseFromOverview = (sectionId: string, exerciseId: string) => {
    setWorkoutSchema((prev) =>
      deleteExerciseFromOverview(sectionId, exerciseId, prev)
    );
    markDirty();
  };

  const handleDeleteSupersetFromOverview = (sectionId: string, exerciseIds: string[]) => {
    setWorkoutSchema((prev) =>
      deleteSupersetFromOverview(sectionId, exerciseIds, prev)
    );
    markDirty();
  };

  // Top-level drop handler
  const handleTopLevelDropHandler = (e: React.DragEvent) => {
    e.preventDefault();
    if (draggedExercise && dragOverTopLevelSlot !== null) {
      setWorkoutSchema((prev) => handleTopLevelSlotDrop(dragOverTopLevelSlot, draggedExercise, prev));
      markDirty();
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
        // Create new section object with loading state or minimal data
        const type = draggedSection.sectionType as any;
        // Use a temporary ID that we'll match against when the async fetch completes
        const tempId = `sec_${type}_${Date.now()}`;

        const newSection: WorkoutSection = {
          id: tempId,
          type: type || 'regular',
          exercises: [], // Initially empty, will be populated async
          name: draggedSection.program,
          isLoading: true, // Set loading state
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

        // Trigger async fetch to populate the section
        getSectionById(draggedSection.id).then((fullSection) => {
          // Logic similar to EditSectionPage to hydrate exercises
          let coreData = fullSection.section_data;
          if (coreData?.items && Array.isArray(coreData.items) && coreData.items.length > 0 && coreData.items[0].itemType === 'section') {
            coreData = coreData.items[0].data;
          }

          // Hydrate exercise details (name, image, etc.) from local DB
          if (coreData && coreData.exercises && Array.isArray(coreData.exercises)) {

            // Flatten exercises if nested (payload builder structure)
            const hasNestedExercises = coreData.exercises.some((ex: any) => ex.exercises && Array.isArray(ex.exercises));
            let exercisesToProcess = coreData.exercises;

            if (hasNestedExercises) {
              const flattenedExercises: any[] = [];
              coreData.exercises.forEach((group: any) => {
                const isSuperset = group.isSuperset;
                const supersetGroupId = isSuperset ? crypto.randomUUID() : undefined;

                if (group.exercises && Array.isArray(group.exercises)) {
                  group.exercises.forEach((ex: any) => {
                    flattenedExercises.push({
                      ...ex,
                      instanceId: crypto.randomUUID(),
                      supersetGroupId,
                    });
                  });
                }
              });
              exercisesToProcess = flattenedExercises;
            } else {
              // Ensure instanceId exists for already flat exercises
              exercisesToProcess = exercisesToProcess.map((ex: any) => ({
                ...ex,
                instanceId: ex.instanceId || crypto.randomUUID(),
              }));
            }

            coreData.exercises = exercisesToProcess.map((ex: any) => {
              // Use prescribedExerciseId for looking up exercise details (fallback to id for legacy data)
              const exerciseId = ex.prescribedExerciseId || ex.id || ex.exerciseId;
              const fullExercise = findExerciseById(exerciseId);
              const exerciseData = fullExercise ? {
                ...ex,
                // IMPORTANT: Set exerciseId from prescribedExerciseId (or legacy id field)
                // The builder expects 'exerciseId' as the exercise library ID
                exerciseId: exerciseId,
                name: fullExercise.name,
                imageUrl: fullExercise.imageUrl,
                videoUrl: fullExercise.videoUrl,
                equipments: fullExercise.equipments,
                bodyParts: fullExercise.bodyParts,
                targetMuscles: fullExercise.targetMuscles,
                secondaryMuscles: fullExercise.secondaryMuscles,
                keywords: fullExercise.keywords,
                overview: fullExercise.overview,
                instructions: fullExercise.instructions,
                exerciseTips: fullExercise.exerciseTips,
                variations: fullExercise.variations,
                relatedExerciseIds: fullExercise.relatedExerciseIds,
                // Required fields for Exercise type
                exerciseType: fullExercise.exerciseType || 'weight_reps',
                source: fullExercise.source || 'musclewiki',
                rawThumbnailUrl: fullExercise.rawThumbnailUrl,
                difficulty: fullExercise.difficulty,
                force: fullExercise.force,
                mechanic: fullExercise.mechanic,
                category: fullExercise.category,
              } : {
                ...ex,
                exerciseId: exerciseId,
                name: ex.name || exerciseId || 'Unknown Exercise',
                imageUrl: ex.imageUrl || '',
                videoUrl: ex.videoUrl || '',
                equipments: ex.equipments || [],
                bodyParts: ex.bodyParts || [],
                exerciseType: ex.exerciseType || 'weight_reps',
                targetMuscles: ex.targetMuscles || [],
                secondaryMuscles: ex.secondaryMuscles || [],
                keywords: ex.keywords || [],
                overview: ex.overview || '',
                instructions: ex.instructions || [],
                exerciseTips: ex.exerciseTips || [],
                variations: ex.variations || [],
                relatedExerciseIds: ex.relatedExerciseIds || [],
                // Required fields for Exercise type
                source: 'musclewiki' as const,
              };

              // Ensure set type is preserved (referencing previous fix)
              // Helper to extract prescribed value from MetricNumber pattern
              const getMetricValue = (metric: any): string => {
                if (metric === null || metric === undefined) return '';
                if (typeof metric === 'object' && 'prescribed' in metric) {
                  return metric.prescribed?.toString() || '';
                }
                return metric.toString();
              };

              if (exerciseData.sets && Array.isArray(exerciseData.sets)) {
                exerciseData.sets = exerciseData.sets.map((s: any) => ({
                  ...s,
                  type: s.type || 'normal',
                  // Handle both direct reps/weight fields and trackableField1/trackableField2 format
                  reps: getMetricValue(s.reps) || getMetricValue(s.trackableField1),
                  weight: getMetricValue(s.weight) || getMetricValue(s.trackableField2),
                  rest: s.rest !== null && s.rest !== undefined ? s.rest.toString() : (s.restSec !== null && s.restSec !== undefined ? s.restSec.toString() : ''), // Handle both rest and restSec if present
                  distance: getMetricValue(s.distance),
                  duration: s.duration !== null && s.duration !== undefined ? getMetricValue(s.duration) : getMetricValue(s.durationSec),
                }))
              }

              return exerciseData;
            });
          }

          // Normalize AMRAP/Timed/Circuits exercises to include sets
          if (coreData && (coreData.type === 'amrap' || coreData.type === 'timed' || coreData.type === 'circuits')) {
            if (coreData.exercises && Array.isArray(coreData.exercises)) {
              coreData.exercises = coreData.exercises.map((ex: any) => {
                if (ex.sets && ex.sets.length > 0) return ex;

                const getMetricVal = (metric: any): string => {
                  if (metric === null || metric === undefined) return '';
                  if (typeof metric === 'object' && 'prescribed' in metric) {
                    return metric.prescribed?.toString() || '';
                  }
                  return metric.toString();
                };

                const set = {
                  setNumber: 1,
                  type: 'normal',
                  reps: getMetricVal(ex.reps),
                  weight: getMetricVal(ex.weight),
                  rest: ex.restSec !== null && ex.restSec !== undefined ? ex.restSec.toString() : '',
                  distance: getMetricVal(ex.distance),
                  duration: getMetricVal(ex.durationSec),
                };

                return {
                  ...ex,
                  sets: [set]
                };
              });
            }
          }

          setWorkoutSchema(current => ({
            ...current,
            items: current.items.map(item => {
              // Find our specific inserted section by the temp ID
              if (item.itemType === 'section' && item.section.id === tempId) {
                return {
                  ...item,
                  section: {
                    ...item.section,
                    ...coreData,
                    id: tempId, // Keep temp ID or use real one? Real one might conflict if dragged twice. Keeping temp ID is safer for uniqueness in current session.
                    // Actually, we should probably generate a NEW unique ID for this instance in the workout
                    // but `tempId` is already unique for this session.
                    // Let's ensure the type is correct.
                    type: type || 'regular',
                    name: draggedSection.program,
                  }
                }
              }
              return item;
            })
          }));

          // Turn off loading state
          setWorkoutSchema(current => ({
            ...current,
            items: current.items.map(item => {
              if (item.itemType === 'section' && item.section.id === tempId) {
                return {
                  ...item,
                  section: {
                    ...item.section,
                    isLoading: false
                  }
                };
              }
              return item;
            })
          }));

        }).catch(err => {
          console.error("Failed to fetch section details", err);
          toast.error("Failed to load section exercises");
          // Turn off loading state even on error
          setWorkoutSchema(current => ({
            ...current,
            items: current.items.map(item => {
              if (item.itemType === 'section' && item.section.id === tempId) {
                return {
                  ...item,
                  section: {
                    ...item.section,
                    isLoading: false
                  }
                };
              }
              return item;
            })
          }));
        });

        return { ...prev, items: newItems };
      });
      markDirty();
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
      markDirty();
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
    markDirty();
    setSectionValidationErrors((prev) => clearEmptyExercisesError(sectionId, prev));
  };

  const handleAddTopLevelExercise = () => {
    setWorkoutSchema((prev) => addTopLevelExercise(prev));
    markDirty();
  };

  const handleSlotDropWrapper = (e: React.DragEvent, sectionId: string, slotIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (!draggedExercise) return;

    setWorkoutSchema((prev) =>
      handleSlotDrop(sectionId, slotIndex, draggedExercise, prev)
    );

    setSectionValidationErrors((prev) => clearEmptyExercisesError(sectionId, prev));

    markDirty();
    handleDragEnd();
  };

  const handleSupersetLink = (sectionId: string, exerciseIndex: number) => {
    setWorkoutSchema((prev) => linkSuperset(sectionId, exerciseIndex, prev));
    markDirty();
  };

  const handleSupersetUnlink = (sectionId: string, exerciseIndex: number) => {
    setWorkoutSchema((prev) => unlinkSuperset(sectionId, exerciseIndex, prev));
    markDirty();
  };

  const handleTopLevelSupersetLink = (itemIndex: number) => {
    setWorkoutSchema((prev) => linkTopLevelSuperset(itemIndex, prev));
    markDirty();
  };

  const handleTopLevelSupersetUnlink = (itemIndex: number) => {
    setWorkoutSchema((prev) => unlinkTopLevelSuperset(itemIndex, prev));
    markDirty();
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
    markDirty();
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
    markDirty();
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
    markDirty();
  };

  const handleMoveTopLevelExerciseDown = (itemIndex: number) => {
    if (itemIndex >= workoutSchema.items.length - 1) return; // Already at bottom

    setWorkoutSchema((prev) => {
      const items = [...prev.items];
      // Swap with immediate next item (any type)
      [items[itemIndex], items[itemIndex + 1]] = [items[itemIndex + 1], items[itemIndex]];
      return { ...prev, items };
    });
    markDirty();
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
                      className="h-7 w-7 text-foreground bg-background border-input shadow-none shrink-0"
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
                  disabled={isSectionMode}
                  className="h-7 flex-1 border-input bg-background text-sm focus-visible:ring-primary shadow-none"
                  placeholder={section.type ? (section.type.charAt(0).toUpperCase() + section.type.slice(1)) : 'Section'}
                  value={isSectionMode ? workoutTitle : (section.name || '')}
                  onChange={(e) => {
                    const newName = e.target.value;
                    markDirty();
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
                    // Sync to Top Title if in Section Mode
                    if (isSectionMode) {
                      setWorkoutTitle(newName);
                    }
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

                        markDirty();
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
                  <DropdownMenu open={savingSectionId === section.id ? false : undefined}>
                    <DropdownMenuTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-7 w-7 text-foreground bg-background border-input shadow-none shrink-0"
                        disabled={savingSectionId === section.id}
                      >
                        {savingSectionId === section.id ? (
                          <Loader2 className="size-3 animate-spin" />
                        ) : (
                          <Ellipsis className="size-3" />
                        )}
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
                        onClick={() => handleSaveSectionToLibrary(section)}
                      >
                        <Save className="size-4 mr-2" />
                        Save to library
                      </DropdownMenuItem>
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

          </CardHeader>
          {!isCollapsed && (
            <div className="overflow-hidden transition-all duration-300 ease-in-out" style={{ maxHeight: '10000px', opacity: 1 }}>
              <CardContent
                ref={(el) => registerSectionRef(section.id, el)}
                data-workout-section
                className="flex-1 flex flex-col px-3 pt-0.5 pb-0"
                onDragOver={(e) => handleSectionDragOver(e, section.id, section.exercises?.length || 0)}
                onDragLeave={handleSectionDragLeave}
                onDrop={(e) => handleSectionDrop(e, section.id)}
              >
                {/* Section Notes - Moved to Top of Content */}
                <div className="w-full relative mb-3 pt-1">
                  <Input
                    placeholder="Notes"
                    value={section.notes || ''}
                    className="w-full pr-8 border-input bg-background shadow-none"
                    onChange={(e) => {
                      const newNotes = e.target.value;
                      markDirty();
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
                  />
                  {section.notes && (
                    <button
                      type="button"
                      onClick={() => {
                        markDirty();
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
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                      aria-label="Clear notes"
                    >
                      <X className="size-3" />
                    </button>
                  )}
                </div>
                <div className={cn(
                  'flex-1 w-full',
                  section.exercises && section.exercises.length > 0 ? 'flex flex-col gap-0' : 'flex items-center justify-center',
                  section.isLoading ? 'min-h-[200px]' : ''
                )}>
                  {section.isLoading ? (
                    <div className="flex flex-col items-center justify-center gap-3">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      <p className="text-sm text-muted-foreground">Loading section...</p>
                    </div>
                  ) : section.exercises && section.exercises.length > 0 ? (
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
                                  markDirty();
                                  const castExercise = newExercise as ExerciseWithSuperset;
                                  handleRecomputeExerciseValidation(
                                    exercise.instanceId,
                                    castExercise.exerciseType as 'weight_reps' | 'reps' | 'distance_duration',
                                    castExercise.sets || [],
                                    castExercise.eachSide
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
                                  markDirty();
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
              markDirty();
              const castExercise = newExercise as ExerciseWithSuperset;
              handleRecomputeExerciseValidation(
                exercise.instanceId,
                castExercise.exerciseType as 'weight_reps' | 'reps' | 'distance_duration',
                castExercise.sets || [],
                castExercise.eachSide
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
              markDirty();
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
            ) : (draggedExercise || draggedSection) && dragOverTopLevelSlot === itemIndex + 1 ? (
              // Dragging and this is the drop slot - show drop zone (replaces superset button)
              <div className="h-14 my-2 border-2 border-dashed border-primary bg-primary/5 rounded-lg flex items-center justify-center text-primary text-sm transition-all duration-200">
                <span>{draggedSection ? 'Drop section here' : 'Drop exercise here'}</span>
              </div>
            ) : (
              // Show superset button (visible while dragging, only hidden when drop zone shows at this slot)
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
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          showCloseButton={false}
          className="!max-w-[95vw] sm:!max-w-[95vw] !w-[95vw] !h-[90vh] flex flex-col p-0 overflow-hidden ring-0 border-none outline-none bg-transparent shadow-none"
          onInteractOutside={(e) => {
            e.preventDefault();
            // Don't trigger discard dialog if we're showing delete confirmation
            if (showDeleteConfirm || sectionToDelete) {
              return;
            }
            if (isDirty) {
              setShowCloseConfirm(true);
            } else {
              onOpenChange(false);
            }
          }}
          onEscapeKeyDown={(e) => {
            e.preventDefault();
            // Don't trigger discard dialog if we're showing delete confirmation
            if (showDeleteConfirm || sectionToDelete) {
              return;
            }
            if (isDirty) {
              setShowCloseConfirm(true);
            } else {
              onOpenChange(false);
            }
          }}
        >
          <DialogTitle className="sr-only">Workout Builder</DialogTitle>
          <div className="flex-1 min-h-0 overflow-hidden">
            <div className="flex h-full max-h-full overflow-hidden min-h-0 bg-transparent gap-3">
              <div className="flex h-full overflow-hidden rounded-xl border bg-background shadow-sm flex-1 transition-all duration-500 ease-in-out">
                <div className="w-[40%] shrink-0 h-full flex flex-col min-h-0 border-r py-4 bg-muted/30">
                  {/* Main Builder Toggle */}
                  <div className="flex-shrink-0 px-4">
                    <ButtonGroup className="w-full">
                      <Button
                        variant={activeBuilder === 'ai' ? 'default' : 'outline'}
                        onClick={() => setActiveBuilder('ai')}
                        className={cn(
                          'flex-1 gap-2 h-9',
                          activeBuilder === 'ai' && 'bg-primary text-primary-foreground'
                        )}
                      >
                        <Sparkles className="size-4" />
                        <span>Athli AI</span>
                      </Button>
                      <Button
                        variant={activeBuilder === 'manual' ? 'default' : 'outline'}
                        onClick={() => setActiveBuilder('manual')}
                        className={cn(
                          'flex-1 gap-2 h-9',
                          activeBuilder === 'manual' && 'bg-primary text-primary-foreground'
                        )}
                      >
                        <NotebookPen className="size-4" />
                        <span>Manual</span>
                      </Button>
                    </ButtonGroup>
                  </div>

                  <div className="flex-1 overflow-hidden flex flex-col pt-4">
                    {activeBuilder === 'manual' ? (
                      <div className="flex flex-col px-4 h-full min-h-0 w-full">
                        <Tabs
                          value={builderMode}
                          onValueChange={(value) => {
                            if (value) setBuilderMode(value as 'exercise' | 'section');
                          }}
                          className="mb-4"
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

                        {builderMode === 'exercise' && (
                          <div className="flex-1 min-h-0">
                            <ExerciseSelectionPanel
                              onExerciseClick={handleExerciseClick}
                              onDragStart={handleDragStart}
                              onDragEnd={handleDragEnd}
                              activeExerciseIds={activeExerciseIds}
                            />
                          </div>
                        )}
                        {builderMode === 'section' && (
                          <div className="flex-1 min-h-0">
                            <CoachSectionsSidebar
                              onDragStart={handleSectionSourceDragStart}
                              onDragEnd={() => {
                                handleDragEnd();
                                setDraggedSection(null);
                              }}
                              onNavigateRequest={handleNavigateRequest}
                            />
                          </div>
                        )}
                      </div>
                    ) : (
                      <div
                        className="flex flex-col px-4 h-full min-h-0 w-full relative"
                        onDragEnter={(e) => {
                          if (selectedFile) return;
                          e.preventDefault();
                          e.stopPropagation();
                          setIsDraggingAiFile(true);
                        }}
                        onDragLeave={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                            setIsDraggingAiFile(false);
                          }
                        }}
                        onDragOver={(e) => {
                          if (selectedFile) return;
                          e.preventDefault();
                          e.stopPropagation();
                        }}
                        onDrop={(e) => {
                          if (selectedFile) return;
                          e.preventDefault();
                          e.stopPropagation();
                          setIsDraggingAiFile(false);
                          const files = Array.from(e.dataTransfer.files);
                          const validFile = files.find((file) => file.type === 'application/pdf');
                          if (validFile) {
                            setSelectedFile(validFile);
                          }
                        }}
                      >
                        {!selectedFile && isDraggingAiFile && (
                          <div
                            className="absolute inset-0 z-50 bg-background/95 backdrop-blur-sm border-2 border-dashed border-primary flex items-center justify-center pointer-events-auto rounded-lg"
                            onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setIsDraggingAiFile(true); }}
                            onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); }}
                            onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                            onDrop={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setIsDraggingAiFile(false);
                              const files = Array.from(e.dataTransfer.files);
                              const validFile = files.find((file) => file.type === 'application/pdf');
                              if (validFile) {
                                setSelectedFile(validFile);
                              }
                            }}
                          >
                            <div className="flex flex-col items-center gap-4 text-center">
                              <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-background/50 backdrop-blur-sm shadow-xl p-3 border border-white/20">
                                <Image
                                  src="/icons/pdf.png"
                                  alt="PDF"
                                  width={40}
                                  height={40}
                                  className="object-contain"
                                />
                              </div>
                              <div>
                                <p className="text-lg font-semibold">{t('library.dropPdfHere')}</p>
                                <p className="text-sm text-muted-foreground">{t('library.pdfFilesOnly')}</p>
                              </div>
                            </div>
                          </div>
                        )}
                        <div className="flex-col items-center gap-4 flex-shrink-0 pb-4 flex relative z-0 w-full">
                          <div className="relative flex items-center justify-center w-36 h-36 -mb-4">
                            {aiAnimationData && (
                              <Lottie
                                className="w-full h-full"
                                animationData={aiAnimationData}
                                loop
                                autoplay
                              />
                            )}
                          </div>
                          <h2 className="text-xl font-semibold text-center">{t('library.athliAiBuilder')}</h2>
                          <p className="text-sm text-foreground text-center max-w-md">
                            {t('library.dragDropPdf')}
                          </p>
                        </div>
                        <div className="flex-1 overflow-y-auto flex flex-col w-full">
                          <div className="flex-1 flex flex-col min-h-0 w-full">
                            <div className="flex flex-col gap-2 flex-1 min-h-0 w-full">
                              <div className="flex items-center gap-2 mb-1">
                                <div className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-primary via-primary/90 to-primary/80 text-primary-foreground">
                                  <Sparkles className="h-4 w-4" />
                                </div>
                                <h3 className="text-sm font-semibold">
                                  {t('library.letsBuildWorkout')}<RequiredAsterisk />
                                </h3>
                              </div>
                              <div className="relative flex-1 min-h-0 flex flex-col">
                                <Textarea
                                  value={aiPrompt}
                                  onChange={(e) => setAiPrompt(e.target.value)}
                                  className="resize-none text-sm flex-1 min-h-[200px] pb-12 bg-muted/30"
                                  placeholder={t('library.workoutPromptPlaceholder')}
                                />
                                <input
                                  ref={fileInputRef}
                                  type="file"
                                  accept=".pdf"
                                  onChange={handleAiFileChange}
                                  className="hidden"
                                  aria-label={t('library.selectPdfFile')}
                                />
                                {!aiPrompt.trim() && (
                                  <div className="absolute bottom-2 right-2 flex items-center gap-2">
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={handleUseAiExample}
                                      className="h-7 px-3 text-xs"
                                      aria-label={t('library.useExample')}
                                    >
                                      {t('library.useExample')}
                                    </Button>
                                    <Button
                                      type="button"
                                      size="sm"
                                      onClick={() => fileInputRef.current?.click()}
                                      disabled={!!selectedFile}
                                      className="h-7 px-3 text-xs gap-1.5"
                                      aria-label={t('library.selectPdfFile')}
                                    >
                                      <FileText className="h-3.5 w-3.5" />
                                      {t('messages.pdf')}
                                    </Button>
                                  </div>
                                )}
                              </div>
                              {selectedFile && (
                                <div className="flex items-center gap-2 p-2 rounded-lg border bg-background mt-2">
                                  <div className="flex items-center justify-center h-8 w-8 rounded-md bg-transparent flex-shrink-0">
                                    <Image
                                      src="/icons/pdf.png"
                                      alt="PDF"
                                      width={24}
                                      height={24}
                                      className="object-contain"
                                    />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-[11px] font-medium text-foreground truncate">
                                      {selectedFile.name}
                                    </p>
                                    <p className="text-[10px] text-muted-foreground">{t('messages.pdf')}</p>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={handleRemoveAiFile}
                                    className="flex-shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all p-1 rounded-md"
                                    aria-label={t('library.removePdfFile')}
                                  >
                                    <X className="h-4 w-4" />
                                  </button>
                                </div>
                              )}
                              <div className="pt-2 mt-auto pb-1">
                                <Button
                                  onClick={handleAiGenerate}
                                  disabled={isGeneratingAi || !aiPrompt.trim()}
                                  className="w-full gap-2 h-11 font-bold shadow-lg"
                                >
                                  {isGeneratingAi ? (
                                    <>
                                      <Loader2 className="h-5 w-5 animate-spin" />
                                      {t('library.generate')}
                                    </>
                                  ) : (
                                    <>
                                      <Sparkles className="h-5 w-5" />
                                      {t('library.generate')}
                                    </>
                                  )}
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <div className="w-[60%] flex flex-col h-full min-h-0">
                  <div className="flex-1 flex min-h-0">
                    <div className="flex-1 h-full flex flex-col min-h-0 relative">
                      {isLoadingAiWorkout && (
                        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center rounded-lg">
                          <div className="flex flex-col items-center gap-3">
                            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                            <p className="text-sm text-muted-foreground">Generating workout...</p>
                          </div>
                        </div>
                      )}
                      {isLoadingInitialData && (
                        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center rounded-lg">
                          <div className="flex flex-col items-center gap-3">
                            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                            <p className="text-sm text-muted-foreground">Loading workout...</p>
                          </div>
                        </div>
                      )}
                      {/* Fixed title container above exercise area */}
                      <div className="flex-shrink-0 w-full bg-background px-4 py-3">
                        <div className="flex items-center gap-2 w-full">
                          <Input
                            className="flex-1 h-9 text-sm shadow-none"
                            placeholder="Workout title"
                            value={workoutTitle}
                            onChange={(e) => {
                              const newTitle = e.target.value;
                              setWorkoutTitle(newTitle);
                              markDirty();

                              // Sync title to section name if in section mode
                              if (isSectionMode) {
                                setWorkoutSchema((prev) => ({
                                  ...prev,
                                  items: prev.items.map((item, idx) => {
                                    // Assuming the first item is the main section in section mode
                                    if (idx === 0 && item.itemType === 'section') {
                                      return {
                                        ...item,
                                        section: { ...item.section, name: newTitle },
                                      };
                                    }
                                    return item;
                                  }),
                                }));
                              }
                            }}
                          />
                          <Popover open={isTitleExpanded} onOpenChange={setIsTitleExpanded}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <PopoverTrigger asChild>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    className="h-9 w-9 shrink-0 border-input bg-background shadow-none"
                                    aria-label={isTitleExpanded ? 'Collapse' : 'Expand'}
                                  >
                                    {isTitleExpanded ? (
                                      <ChevronUp className="size-4" />
                                    ) : (
                                      <ChevronDown className="size-4" />
                                    )}
                                  </Button>
                                </PopoverTrigger>
                              </TooltipTrigger>
                              <TooltipContent>
                                {t('workouts.addWorkout.openWorkoutDetails')}
                              </TooltipContent>
                            </Tooltip>
                            <PopoverContent className="w-[600px] p-4" align="end">
                              <div className="flex flex-col gap-4">
                                {/* Type */}
                                <div className="flex flex-col gap-2">
                                  <label htmlFor="workout-type" className="text-sm font-medium">
                                    {t('workouts.addWorkout.type')}
                                  </label>
                                  <Select
                                    value={workoutType}
                                    onValueChange={(value) => {
                                      setWorkoutType(value);
                                      markDirty();
                                    }}
                                  >
                                    <SelectTrigger
                                      id="workout-type"
                                      className="w-full"
                                    >
                                      <SelectValue placeholder={t('workouts.addWorkout.typePlaceholder')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {WORKOUT_TYPES.map((type) => (
                                        <SelectItem key={type.value} value={type.value}>
                                          {type.label}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>

                                {/* Difficulty */}
                                <div className="flex flex-col gap-2">
                                  <label htmlFor="workout-difficulty" className="text-sm font-medium">
                                    {t('workouts.addWorkout.difficulty')}
                                  </label>
                                  <Select
                                    value={difficulty}
                                    onValueChange={(value) => {
                                      setDifficulty(value);
                                      markDirty();
                                    }}
                                  >
                                    <SelectTrigger
                                      id="workout-difficulty"
                                      className="w-full"
                                    >
                                      <SelectValue placeholder={t('workouts.addWorkout.difficultyPlaceholder')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {DIFFICULTY_LEVELS.map((level) => (
                                        <SelectItem key={level.value} value={level.value}>
                                          {level.label}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>

                                {/* Description */}
                                <div className="flex flex-col gap-2">
                                  <label htmlFor="workout-description" className="text-sm font-medium">
                                    {t('workouts.addWorkout.description')}
                                  </label>
                                  <Textarea
                                    id="workout-description"
                                    placeholder={t('workouts.addWorkout.descriptionPlaceholder')}
                                    value={description}
                                    onChange={(e) => {
                                      setDescription(e.target.value);
                                      markDirty();
                                    }}
                                    rows={5}
                                    className="resize-none"
                                  />
                                </div>
                              </div>
                            </PopoverContent>
                          </Popover>
                          {onDelete && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  className="h-9 w-9 shrink-0 border-input bg-background shadow-none"
                                  onClick={() => {
                                    console.log('WorkoutBuilder - Top Delete Button Clicked');
                                    setShowDeleteConfirm(true);
                                  }}
                                >
                                  <Trash2 className="size-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                {t('general.delete')}
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                      </div>
                      <div
                        ref={(el) => {
                          contentScrollRef.current = el;
                          registerTopLevelContainerRef(el);
                        }}
                        data-top-level-container
                        className="flex-1 p-4 overflow-y-auto"
                        onDragOver={(e) => hookHandleTopLevelDragOver(e, workoutSchema.items.length)}
                        onDragLeave={hookHandleTopLevelDragLeave}
                        onDrop={handleTopLevelDropHandler}
                      >
                        {isLoadingInitialData ? (
                          <div className="flex-1 flex items-center justify-center h-full">
                            <div className="flex flex-col items-center gap-3">
                              <Loader2 className="h-10 w-10 animate-spin text-primary" />
                            </div>
                          </div>
                        ) : workoutSchema.items.length > 0 ? (
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
                              // Note: The superset button area handles drop zones between exercises for BOTH exercises and sections
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
                                <div className="flex items-center gap-2 w-full">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="flex-1 gap-1.5 text-xs h-9 px-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                                    onClick={() => setIsCreatingSection(true)}
                                  >
                                    <Plus className="size-3" />
                                    <span>Create section</span>
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="flex-1 gap-1.5 text-xs h-9 px-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                                    onClick={handleAddTopLevelExercise}
                                  >
                                    <Plus className="size-3" />
                                    <span>Add exercise</span>
                                  </Button>
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center h-full gap-6 transition-all duration-200 relative p-4">
                            {/* Empty state content - hidden when dragging */}
                            {!(draggedExercise || draggedSection) && (
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
                                    className="gap-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                                    onClick={() => setIsCreatingSection(true)}
                                  >
                                    <Plus className="size-4" />
                                    <span>Create section</span>
                                  </Button>

                                  <Button
                                    type="button"
                                    variant="outline"
                                    className="gap-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground"
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
                      </div>
                    </div>

                  </div>
                  <div className="flex-shrink-0 border-t p-2 flex items-center justify-end gap-2 bg-background">
                    <Button variant="outline" onClick={() => {
                      if (isDirty) {
                        setShowCloseConfirm(true);
                      } else {
                        onOpenChange(false);
                      }
                    }}>
                      Cancel
                    </Button>
                    <Button onClick={handleSave} disabled={isSaving} className="gap-2">
                      {isSaving ? <Loader2 className="animate-spin size-4" /> : <Check className="size-4" />}
                      Save
                    </Button>
                  </div>
                </div>
              </div>
              <div
                className={cn(
                  "flex flex-col h-full min-h-0 transition-all duration-500 ease-in-out",
                  isOverviewOpen ? "w-[22%]" : "w-28"
                )}
                onClick={(e) => {
                  // Only trigger close if clicking on the container itself (dead zone), not on child elements
                  if (e.target === e.currentTarget) {
                    if (isDirty) {
                      setShowCloseConfirm(true);
                    } else {
                      onOpenChange(false);
                    }
                  }
                }}
              >
                {/* Toggle Button Area - Positioned at top */}
                <div
                  className="flex-shrink-0 flex flex-row items-center pt-2 pb-4 gap-2 justify-between px-2"
                  onClick={(e) => {
                    // Only trigger close if clicking on the container itself (dead zone), not on child elements
                    if (e.target === e.currentTarget) {
                      if (isDirty) {
                        setShowCloseConfirm(true);
                      } else {
                        onOpenChange(false);
                      }
                    }
                  }}
                >
                  {/* Close button - always visible */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-10 w-10 rounded-full border shadow-sm hover:bg-muted bg-background"
                        onClick={() => {
                          if (isDirty) {
                            setShowCloseConfirm(true);
                          } else {
                            onOpenChange(false);
                          }
                        }}
                      >
                        <X className="size-5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      <p>Close</p>
                    </TooltipContent>
                  </Tooltip>
                  {/* Toggle chevron - position changes based on overview state */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-10 w-10 rounded-full border shadow-sm hover:bg-muted bg-background"
                        onClick={() => setIsOverviewOpen(!isOverviewOpen)}
                      >
                        {isOverviewOpen ? <ChevronLeft className="size-5" /> : <ChevronRight className="size-5" />}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      <p>{isOverviewOpen ? "Collapse overview" : "Expand overview"}</p>
                    </TooltipContent>
                  </Tooltip>
                </div>

                {/* Overview Panel - Fills remaining space to align bottom with left section */}
                <div
                  className={cn(
                    "overflow-hidden rounded-xl border bg-background shadow-sm flex flex-col transition-all duration-500 ease-in-out origin-bottom min-h-0",
                    isOverviewOpen ? "flex-1 opacity-100" : "h-0 border-0 opacity-0 flex-shrink-0"
                  )}
                  onClick={(e) => {
                    // Only trigger close if clicking on the container itself (dead zone), not on child elements
                    if (e.target === e.currentTarget) {
                      if (isDirty) {
                        setShowCloseConfirm(true);
                      } else {
                        onOpenChange(false);
                      }
                    }
                  }}
                >
                  <div className="flex-1 overflow-y-auto px-2 py-4">
                    {isLoadingInitialData ? (
                      <div className="flex items-center justify-center h-full">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      </div>
                    ) : (
                      <OverviewPanel
                        items={workoutSchema.items}
                        onItemsChange={(items: WorkoutSchemaItem[]) => {
                          markDirty();
                          setWorkoutSchema((prev) => ({
                            ...prev,
                            items,
                          }));
                        }}
                        onDeleteSection={handleDeleteSection}
                        onDeleteExercise={handleDeleteExerciseFromOverview}
                        onDeleteTopLevelExercise={(instanceId: string) => {
                          setWorkoutSchema((prev) => deleteTopLevelExercise(instanceId, prev));
                          markDirty();
                        }}
                        onDeleteSuperset={handleDeleteSupersetFromOverview}
                        onDeleteTopLevelSuperset={(exerciseIds: string[]) => {
                          setWorkoutSchema((prev) => ({
                            ...prev,
                            items: prev.items.filter(
                              (item) => !(item.itemType === 'exercise' && exerciseIds.includes(item.exercise.instanceId))
                            ),
                          }));
                          markDirty();
                        }}
                        onUnlinkSuperset={handleSupersetUnlink}
                        onUnlinkTopLevelSuperset={handleTopLevelSupersetUnlink}
                        groupExercisesBySuperset={groupExercisesBySuperset as any}
                        onExerciseClick={handleExerciseClickByIdWrapper}
                        validationErrors={validationErrors}
                        isSectionMode={isSectionMode}
                      />
                    )}
                  </div>
                </div>
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
          </div>
        </DialogContent >
      </Dialog >
      <DiscardChangesDialog
        open={showCloseConfirm}
        onCancel={() => setShowCloseConfirm(false)}
        onConfirm={() => {
          setShowCloseConfirm(false);
          onOpenChange(false);
          if (pendingNavigationPath) {
            router.push(pendingNavigationPath);
            setPendingNavigationPath(null);
          }
        }}
      />
      <ConfirmDeleteDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        onConfirm={async () => {
          if (onDelete) {
            await onDelete();
            // The parent should handle closing/navigating after delete
          }
        }}
        title={t('workouts.deleteWorkout.title')}
        description={t('workouts.deleteWorkout.description')}
        confirmText={t('general.delete')}
        variant="default"
      />
    </>
  );
};
