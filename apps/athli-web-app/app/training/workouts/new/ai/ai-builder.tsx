'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ArrowUp, BrainCog, Dumbbell, FileText, Info, Link2, Link2Off, NotebookPen, Paperclip, Plus, Repeat, Sparkles, Timer, Trash2, X } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/general/utils';
import { searchExercises, type Exercise } from '@/lib/api/exercise/exercise-search';
import type { GeneratedWorkout } from '@/lib/api/exercise/generate-exercise';
import { generateWorkoutFromPrompt, prompt } from '@/lib/api/exercise/generate-exercise';
import { toast } from 'sonner';
import { MOCK_WORKOUT_SCHEMA } from '@/constants/mock-workout-schema';
import { useExerciseDragDrop } from '../hooks/use-exercise-drag-drop';
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
} from '../workout-schema';
import type {
  SetFieldValidation,
  ValidationErrors,
  SectionValidationErrors
} from '../shared/types/workout-builder.types';
import type { SetData } from '../components/exercise-card';
import { ExerciseCard } from '../components/exercise-card';
import { ExerciseSelectionPanel } from '../components/exercise-selection-panel';
import { SectionSelectionPanel } from '../components/section-selection-panel';
import { EquipmentPanel } from '../components/equipment-panel';
import { OverviewPanel } from '../components/overview-panel';
import { VideoModal } from '../components/video-modal';
import { WorkoutSectionCard } from '../components/workout-section-card';
import { WorkoutAddSectionButton } from '../components/workout-add-section-button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

type ExerciseWithSuperset = Exercise & {
  supersetGroupId?: string | null;
  instanceId: string;
  sets?: SetData[];
  alternatives?: string[]; // Array of exercise IDs for alternative exercises
};

type ChatMessage = {
  id: string;
  text: string;
  isSent: boolean; // true for user, false for AI
  pdfAttachment?: {
    name: string;
    data: string; // base64
    type: string;
    size: number;
  } | null;
};

type WorkoutSchema = {
  sections: Array<{
    id: string;
    type: 'regular' | 'amrap' | 'timed' | 'circuits' | 'auxiliary';
    exercises?: ExerciseWithSuperset[];
    roundDurationSec?: number;
    targetRounds?: number;
    category?: 'warmup' | 'cooldown' | 'mobility';
  }>;
};

type WorkoutMeta = {
  title: string;
  description: string;
  type: string;
  difficulty: string;
};

type AiBuilderProps = {
  meta: WorkoutMeta | null;
  onDirtyChange?: () => void;
  saveSignal?: number;
  onSaveSuccess?: (payload: WorkoutProgramPayload) => void;
};

// Helper used only for payload building – groups consecutive exercises that share a superset id
const groupExercisesBySupersetForPayload = (exercises: ExerciseWithSuperset[]) => {
  const groups: Array<ExerciseWithSuperset[]> = [];
  let currentGroup: ExerciseWithSuperset[] = [];
  let currentGroupId: string | null = null;

  exercises.forEach((exercise) => {
    if (exercise.supersetGroupId) {
      if (exercise.supersetGroupId === currentGroupId) {
        currentGroup.push(exercise);
      } else {
        if (currentGroup.length > 0) {
          groups.push(currentGroup);
        }
        currentGroup = [exercise];
        currentGroupId = exercise.supersetGroupId;
      }
    } else {
      if (currentGroup.length > 0) {
        groups.push(currentGroup);
        currentGroup = [];
        currentGroupId = null;
      }
      groups.push([exercise]);
    }
  });

  if (currentGroup.length > 0) {
    groups.push(currentGroup);
  }

  return groups;
};

const buildWorkoutPayload = (
  workoutSchema: WorkoutSchema,
  meta: WorkoutMeta | null
): WorkoutProgramPayload | null => {
  if (!meta) {
    return null;
  }

  const parseNumberOrUndefined = (value?: string): number | undefined => {
    if (!value) return undefined;
    const n = Number(value);
    return Number.isNaN(n) ? undefined : n;
  };

  const parseNumberOrNull = (value?: string): number | null => {
    if (!value) return null;
    const n = Number(value);
    return Number.isNaN(n) ? null : n;
  };

  const mapSetDataToPayload = (
    exerciseType: ExerciseType,
    set: SetData
  ): SetPayload => {
    const base = {
      setNumber: set.setNumber,
      restSec: set.rest ? parseNumberOrNull(set.rest) : null,
    } as const;

    // distance_duration is always non-dropset, with either distance or durationSec
    if (exerciseType === 'distance_duration') {
      return {
        ...base,
        exerciseType: 'distance_duration',
        distance: set.distance ? parseNumberOrUndefined(set.distance) : undefined,
        durationSec: set.duration ? parseNumberOrUndefined(set.duration) : undefined,
      };
    }

    // Helper to parse "10-8-6" style strings into numbers
    const parseStages = (value?: string): number[] => {
      if (!value) return [];
      return value
        .split('-')
        .map((part) => Number(part.trim()))
        .filter((n) => !Number.isNaN(n));
    };

    // Dropset handling – presence of dropset implies dropset semantics
    if (set.type === 'dropset') {
      const repStages = parseStages(set.reps);
      const weightStages = exerciseType === 'weight_reps' ? parseStages(set.weight) : [];

      const stages = Array.from(
        { length: Math.max(repStages.length, weightStages.length) },
        (_v, index) => {
          const stage: { weight?: number; reps?: number } = {};
          if (repStages[index] != null) stage.reps = repStages[index];
          if (weightStages[index] != null) stage.weight = weightStages[index];
          return stage;
        }
      ).filter((s) => s.reps != null || s.weight != null);

      if (exerciseType === 'weight_reps') {
        return {
          ...base,
          exerciseType: 'weight_reps',
          weight: parseNumberOrNull(set.weight) ?? 0,
          reps: parseNumberOrNull(set.reps) ?? 0,
          dropset: { stages },
        };
      }

      // reps-only dropset
      return {
        ...base,
        exerciseType: 'reps',
        reps: parseNumberOrNull(set.reps) ?? 0,
        dropset: {
          stages: stages.map((s) => ({ reps: s.reps })),
        },
      };
    }

    // Non-dropset sets
    if (exerciseType === 'weight_reps') {
      return {
        ...base,
        exerciseType: 'weight_reps',
        weight: parseNumberOrNull(set.weight) ?? 0,
        reps: parseNumberOrNull(set.reps) ?? 0,
      };
    }

    // reps-only non-dropset
    return {
      ...base,
      exerciseType: 'reps',
      reps: parseNumberOrNull(set.reps) ?? 0,
    };
  };

  const sections: WorkoutSectionPayload[] = workoutSchema.sections.map((section) => {
    if (section.type === 'regular') {
      const groups = groupExercisesBySupersetForPayload(section.exercises || []);

      const exercises: ExerciseGroupPayload[] = groups.map((group) => {
        const mapped = group.map<RegularExercisePayload>((exercise) => ({
          id: exercise.exerciseId,
          exerciseType: exercise.exerciseType as ExerciseType,
          sets: (exercise.sets || []).map((set) => mapSetDataToPayload(exercise.exerciseType as ExerciseType, set)),
          alternatives: exercise.alternatives || [],
        }));

        const isSuperset = mapped.length > 1;

        return {
          isSuperset,
          exercises: mapped,
        };
      });

      return {
        id: section.id,
        type: 'regular',
        exercises,
      };
    }

    if (section.type === 'amrap') {
      const exercises: RoundExercisePayload[] = (section.exercises || []).map((exercise: any) => ({
        id: exercise.exerciseId ?? exercise.id,
        exerciseType: exercise.exerciseType,
        weight: exercise.weight ?? null,
        reps: exercise.reps ?? null,
        distance: exercise.distance ?? null,
        durationSec: exercise.durationSec ?? null,
        restSec: exercise.restSec ?? null,
      }));

      return {
        id: section.id,
        type: 'amrap',
        durationSec: section.roundDurationSec || 0,
        exercises,
      };
    }

    if (section.type === 'circuits') {
      const groups = groupExercisesBySupersetForPayload(section.exercises || []);

      const exercises: CircuitExerciseGroupPayload[] = groups.map((group) => {
        const mapped = group.map<CircuitExercisePayload>((exercise) => {
          // Circuits limit to one set per exercise - take only the first set
          const firstSet: SetData = exercise.sets && exercise.sets.length > 0
            ? exercise.sets[0]
            : {
              setNumber: 1,
              type: 'normal' as const,
              reps: '0',
              weight: '0',
              rest: '0',
            };

          return {
            id: exercise.exerciseId,
            exerciseType: exercise.exerciseType as ExerciseType,
            set: mapSetDataToPayload(exercise.exerciseType as ExerciseType, firstSet),
            alternatives: exercise.alternatives || [],
          };
        });

        const isSuperset = mapped.length > 1;

        return {
          isSuperset,
          exercises: mapped,
        };
      });

      return {
        id: section.id,
        type: 'circuits',
        targetRounds: section.targetRounds || 0,
        exercises,
      };
    }

    if (section.type === 'auxiliary') {
      const groups = groupExercisesBySupersetForPayload(section.exercises || []);

      const exercises: ExerciseGroupPayload[] = groups.map((group) => {
        const mapped = group.map<RegularExercisePayload>((exercise) => ({
          id: exercise.exerciseId,
          exerciseType: exercise.exerciseType as ExerciseType,
          sets: (exercise.sets || []).map((set) => mapSetDataToPayload(exercise.exerciseType as ExerciseType, set)),
          alternatives: exercise.alternatives || [],
        }));

        const isSuperset = mapped.length > 1;

        return {
          isSuperset,
          exercises: mapped,
        };
      });

      return {
        id: section.id,
        type: 'auxiliary',
        category: section.category || 'warmup',
        exercises,
      };
    }

    const exercises: RoundExercisePayload[] = (section.exercises || []).map((exercise: any) => ({
      id: exercise.exerciseId ?? exercise.id,
      exerciseType: exercise.exerciseType,
      weight: exercise.weight ?? null,
      reps: exercise.reps ?? null,
      distance: exercise.distance ?? null,
      durationSec: exercise.durationSec ?? null,
      restSec: exercise.restSec ?? null,
    }));

    return {
      id: section.id,
      type: 'timed',
      targetRounds: section.targetRounds || 0,
      exercises,
    };
  });

  // Extract unique equipment from all exercises
  const equipmentSet = new Set<string>();
  workoutSchema.sections.forEach((section) => {
    section.exercises?.forEach((exercise) => {
      exercise.equipments?.forEach((equipment) => {
        if (equipment && equipment.trim() !== '') {
          equipmentSet.add(equipment);
        }
      });
    });
  });
  const equipment = Array.from(equipmentSet).sort();

  return {
    title: meta.title,
    description: meta.description,
    type: meta.type,
    difficulty: meta.difficulty,
    equipment,
    sections,
  };
};

type SectionValidation = {
  missingConfig?: boolean;
  emptyExercises?: boolean;
};

export const AiBuilder = ({ meta, onDirtyChange, saveSignal, onSaveSuccess }: AiBuilderProps) => {
  const [workoutSchema, setWorkoutSchema] = useState<WorkoutSchema>({
    sections: [
      {
        id: `sec_regular_${Date.now()}`,
        type: 'regular',
        exercises: [],
      },
    ],
  });
  const [builderMode, setBuilderMode] = useState<'chat' | 'exercise' | 'section'>('chat');
  const [chatPrompt, setChatPrompt] = useState<string>('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [attachedPdf, setAttachedPdf] = useState<File | null>(null);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [dragCounter, setDragCounter] = useState(0);
  const [textareaHeight, setTextareaHeight] = useState(36);
  const [isMultiLine, setIsMultiLine] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);
  const chatTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [singleLineCharLimit, setSingleLineCharLimit] = useState(50);
  const containerRef = useRef<HTMLDivElement | null>(null);
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
  const [newSectionId, setNewSectionId] = useState<string | null>(null);
  const contentScrollRef = useRef<HTMLDivElement | null>(null);
  const pendingScrollTopRef = useRef<number | null>(null);
  const exerciseRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const sectionRefsLocal = useRef<Map<string, HTMLDivElement>>(new Map());

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
  } = useExerciseDragDrop();

  // Load shared mock schema in edit mode if no schema exists
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const accessFlag = window.localStorage.getItem('oneninety_workout_builder_access');
    const isEditMode = accessFlag === 'edit-ai';
    const hasNewWorkoutMeta = window.localStorage.getItem('oneninety_new_workout_meta');
    const aiGenerated = window.localStorage.getItem('oneninety_ai_generated_workout');

    // If we're in edit mode OR if we're not creating a new workout (no meta and no AI generated)
    // then we should load the schema
    if (isEditMode || (!hasNewWorkoutMeta && !aiGenerated)) {
      const savedSchema = window.localStorage.getItem('oneninety_workout_schema');

      // Only load mock schema if no saved schema and no AI generated workout
      if (!savedSchema && !aiGenerated) {
        // Load shared mock schema for edit mode
        window.localStorage.setItem('oneninety_workout_schema', JSON.stringify(MOCK_WORKOUT_SCHEMA));
        setWorkoutSchema(MOCK_WORKOUT_SCHEMA);
      } else if (savedSchema && !aiGenerated) {
        // Load saved schema if no AI generated workout
        try {
          const parsed = JSON.parse(savedSchema);
          setWorkoutSchema(parsed);
        } catch {
          // If parsing fails, use mock schema
          setWorkoutSchema(MOCK_WORKOUT_SCHEMA);
        }
      }
    }
  }, []);

  // Calculate single-line character limit based on container width
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const calculateCharLimit = () => {
      const container = containerRef.current;
      if (!container) return;

      // Get the container width
      const containerWidth = container.offsetWidth;

      // Account for container padding (px-3 = 12px on each side = 24px total)
      // In single-line mode: plus button (32px) + gap (8px) + send button (32px) + gap (8px) = ~80px
      // Add some buffer for spacing: ~100px total
      const availableWidth = containerWidth - 24 - 100;

      // Estimate character width
      // Use a conservative estimate of 7-8px per character for typical font
      // Account for different screen sizes - smaller screens = smaller font = smaller char width
      const isSmallScreen = containerWidth < 640; // sm breakpoint
      const estimatedCharWidth = isSmallScreen ? 6.5 : 7.5;
      const charLimit = Math.floor(availableWidth / estimatedCharWidth);

      // Set a minimum of 25 and maximum of 100 characters
      // Smaller minimum for mobile devices
      const minLimit = isSmallScreen ? 25 : 30;
      setSingleLineCharLimit(Math.max(minLimit, Math.min(100, charLimit)));
    };

    // Initial calculation with a small delay to ensure DOM is ready
    const timeoutId = setTimeout(calculateCharLimit, 100);

    const resizeObserver = new ResizeObserver(() => {
      // Debounce resize calculations
      setTimeout(calculateCharLimit, 50);
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    const handleResize = () => {
      setTimeout(calculateCharLimit, 50);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      clearTimeout(timeoutId);
      resizeObserver.disconnect();
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Load initial chat messages from localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const chatDataRaw = window.localStorage.getItem('oneninety_ai_workout_chat');
    if (chatDataRaw) {
      try {
        const chatData = JSON.parse(chatDataRaw);
        const initialMessages: ChatMessage[] = [];

        // Add user's initial prompt as a message
        if (chatData.prompt) {
          initialMessages.push({
            id: `msg_${Date.now()}_user`,
            text: chatData.prompt,
            isSent: true,
            pdfAttachment: chatData.pdfAttachment || null,
          });
        }

        setChatMessages(initialMessages);
      } catch {
        // Ignore parse errors
      }
    }
  }, []);

  // Scroll to bottom when new messages are added
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatMessages]);

  // Dynamically adjust textarea height based on content and character limit
  useEffect(() => {
    const textarea = chatTextareaRef.current;
    if (!textarea) return;

    const wasFocused = document.activeElement === textarea;
    const cursorPosition = textarea.selectionStart ?? textarea.value.length;

    const charCount = chatPrompt.length;

    // --- Decide mode (NO line measurements) ---

    // Always multi-line if a PDF is attached
    if (attachedPdf && !isMultiLine) {
      setIsMultiLine(true);
    }

    // Open multi-line when text exceeds the single-line char limit
    if (!attachedPdf && !isMultiLine && charCount > singleLineCharLimit) {
      setIsMultiLine(true);
    }

    // Only close multi-line when message is cleared (and no PDF)
    if (!attachedPdf && isMultiLine && charCount === 0) {
      setIsMultiLine(false);
    }

    // --- Apply sizing based on mode ---

    if (attachedPdf || isMultiLine) {
      textarea.style.width = '100%';
      textarea.style.height = 'auto';
      const maxHeight = 120;
      const minHeight = attachedPdf ? 60 : 36;
      const scrollHeight = textarea.scrollHeight;
      const newHeight = Math.max(minHeight, Math.min(scrollHeight, maxHeight));
      textarea.style.height = `${newHeight}px`;
      setTextareaHeight(newHeight);
    } else {
      const singleLineHeight = 36;
      textarea.style.width = '';
      textarea.style.height = `${singleLineHeight}px`;
      setTextareaHeight(singleLineHeight);
    }

    // Restore focus and cursor position if it was focused
    if (wasFocused) {
      Promise.resolve().then(() => {
        if (textarea && document.activeElement !== textarea) {
          textarea.focus();
          textarea.setSelectionRange(cursorPosition, cursorPosition);
        }
      });
    }
  }, [chatPrompt, attachedPdf, singleLineCharLimit, isMultiLine]);

  // Load AI generated workout on mount with gradual loading
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const aiGeneratedRaw = window.localStorage.getItem('oneninety_ai_generated_workout');
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
        if (section.type === 'regular') {
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
      window.localStorage.removeItem('oneninety_ai_generated_workout');
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to load AI generated workout', error);
    }
  }, []);

  const handleSendMessage = async () => {
    if (!chatPrompt.trim() && !attachedPdf) return;

    setIsSendingMessage(true);

    // Add user message
    let pdfAttachment: ChatMessage['pdfAttachment'] = null;
    if (attachedPdf) {
      pdfAttachment = await new Promise<ChatMessage['pdfAttachment']>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const arrayBuffer = e.target?.result as ArrayBuffer;
          const bytes = new Uint8Array(arrayBuffer);
          let binary = '';
          for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
          }
          const base64 = btoa(binary);
          resolve({
            name: attachedPdf.name,
            data: base64,
            type: attachedPdf.type,
            size: attachedPdf.size,
          });
        };
        reader.onerror = reject;
        reader.readAsArrayBuffer(attachedPdf);
      });
    }

    const userMessage: ChatMessage = {
      id: `msg_${Date.now()}_user`,
      text: chatPrompt.trim(),
      isSent: true,
      pdfAttachment,
    };

    setChatMessages((prev) => [...prev, userMessage]);
    setChatPrompt('');
    setAttachedPdf(null);
    setTextareaHeight(36);
    setIsMultiLine(false);

    // Call prompt function with current workout schema state
    try {
      const workoutSchemaJson = JSON.stringify(workoutSchema);
      await prompt(workoutSchemaJson);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to send prompt with workout schema', error);
    }

    // Simulate AI response (replace with actual API call)
    setTimeout(() => {
      const aiMessage: ChatMessage = {
        id: `msg_${Date.now()}_ai`,
        text: 'I\'ve updated your workout based on your request. The changes have been applied to your workout.',
        isSent: false,
      };
      setChatMessages((prev) => [...prev, aiMessage]);
      setIsSendingMessage(false);
    }, 1500);
  };

  const handleFileButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setAttachedPdf(file);
    }
  };

  const handleRemovePdf = () => {
    setAttachedPdf(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Handle drag and drop for PDF files in chat
  const handleChatDragEnter = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setDragCounter((prev) => prev + 1);
    if (event.dataTransfer.types.includes('Files')) {
      setIsDraggingOver(true);
    }
  };

  const handleChatDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setDragCounter((prev) => {
      const newCount = prev - 1;
      if (newCount === 0) {
        setIsDraggingOver(false);
      }
      return newCount;
    });
  };

  const handleChatDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (event.dataTransfer.types.includes('Files')) {
      event.dataTransfer.dropEffect = 'copy';
    }
  };

  const handleChatDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDraggingOver(false);
    setDragCounter(0);

    const files = Array.from(event.dataTransfer.files);
    if (files.length === 0) return;

    // Only handle PDF files
    const pdfFiles = files.filter(
      (file) => file.type === 'application/pdf' || file.name.endsWith('.pdf')
    );

    if (pdfFiles.length > 0) {
      const pdfFile = pdfFiles[0];
      setAttachedPdf(pdfFile);
    }
  };

  const handleExerciseClick = (exercise: Exercise) => {
    // First, try to scroll to the exercise if it exists in the middle area
    const exerciseRef = exerciseRefs.current.get(exercise.exerciseId);
    if (exerciseRef && contentScrollRef.current) {
      const scrollContainer = contentScrollRef.current;
      const containerRect = scrollContainer.getBoundingClientRect();
      const exerciseRect = exerciseRef.getBoundingClientRect();
      const scrollTop = scrollContainer.scrollTop;
      const exerciseTop = exerciseRect.top - containerRect.top + scrollTop;

      // Scroll to center the exercise in the viewport
      const targetScroll = exerciseTop - containerRect.height / 2 + exerciseRect.height / 2;
      scrollContainer.scrollTo({
        top: Math.max(0, targetScroll),
        behavior: 'smooth',
      });
    } else {
      // If exercise not found in middle area, open video modal
      setSelectedExercise(exercise);
      setIsVideoModalOpen(true);
    }
  };

  const handleExerciseClickById = (exerciseId: string) => {
    // Find which section contains this exercise
    const sectionContainingExercise = workoutSchema.sections.find((section) =>
      section.exercises?.some((ex) => ex.exerciseId === exerciseId)
    );

    // If the section is collapsed, expand it
    const wasCollapsed = sectionContainingExercise && collapsedSections.has(sectionContainingExercise.id);
    if (wasCollapsed && sectionContainingExercise) {
      setCollapsedSections((prev) => {
        const next = new Set(prev);
        next.delete(sectionContainingExercise.id);
        return next;
      });
    }

    // Flash the border by setting focused exercise ID
    setFocusedExerciseId(exerciseId);
    // Clear the flash after animation (1 second)
    setTimeout(() => {
      setFocusedExerciseId(null);
    }, 1000);

    // First, try to scroll to the exercise using the ref
    const scrollToExercise = () => {
      const exerciseRef = exerciseRefs.current.get(exerciseId);
      if (exerciseRef && contentScrollRef.current) {
        // Use requestAnimationFrame to ensure DOM is ready
        requestAnimationFrame(() => {
          const scrollContainer = contentScrollRef.current;
          if (!scrollContainer) return;

          const containerRect = scrollContainer.getBoundingClientRect();
          const exerciseRect = exerciseRef.getBoundingClientRect();
          const scrollTop = scrollContainer.scrollTop;
          const exerciseTop = exerciseRect.top - containerRect.top + scrollTop;

          const targetScroll = exerciseTop - containerRect.height / 2 + exerciseRect.height / 2;
          scrollContainer.scrollTo({
            top: Math.max(0, targetScroll),
            behavior: 'smooth',
          });
        });
      } else {
        // If ref not found, try to find exercise and use handleExerciseClick
        const exercise = searchExercises('').find((e) => e.exerciseId === exerciseId);
        if (exercise) {
          handleExerciseClick(exercise);
        }
      }
    };

    if (wasCollapsed) {
      // Wait for the section to expand (animation duration is 300ms)
      setTimeout(scrollToExercise, 350);
    } else {
      scrollToExercise();
    }
  };

  const recomputeExerciseValidation = (
    exerciseInstanceId: string,
    exerciseType: 'weight_reps' | 'reps' | 'distance_duration',
    sets: SetData[] | undefined
  ) => {
    // Do not show validation until the user has clicked Save at least once
    if (!hasAttemptedSave) {
      return;
    }

    setValidationErrors((prev) => {
      const next: ValidationErrors = { ...prev };
      const exerciseErrors: Record<number, SetFieldValidation> = {};

      if (sets && sets.length > 0) {
        sets.forEach((set, index) => {
          const setErrors: SetFieldValidation = {};

          const hasRest = !!set.rest && set.rest.trim() !== '';
          if (!hasRest) {
            setErrors.rest = true;
          }

          if (exerciseType === 'distance_duration') {
            const hasDistance = !!set.distance && set.distance.trim() !== '';
            const hasDuration = !!set.duration && set.duration.trim() !== '';

            if (!hasDistance && !hasDuration) {
              setErrors.distance = true;
              setErrors.duration = true;
            }
          } else {
            if (set.type === 'dropset') {
              // For dropsets, at least one drop stage is required in reps or weight
              const hasReps = !!set.reps && set.reps.trim() !== '';
              const hasWeight =
                exerciseType === 'weight_reps' && !!set.weight && set.weight.trim() !== '';
              if (!hasReps && !hasWeight) {
                setErrors.reps = true;
                if (exerciseType === 'weight_reps') {
                  setErrors.weight = true;
                }
              }
            } else {
              // Reps are required only for normal/warmUp (not dropset or failure)
              if (set.type !== 'failure') {
                const hasReps = !!set.reps && set.reps.trim() !== '';
                if (!hasReps) {
                  setErrors.reps = true;
                }
              }

              // Weight is required for all weight_reps sets except dropsets
              if (exerciseType === 'weight_reps') {
                const hasWeight = !!set.weight && set.weight.trim() !== '';
                if (!hasWeight) {
                  setErrors.weight = true;
                }
              }
            }
          }

          if (Object.keys(setErrors).length > 0) {
            exerciseErrors[index] = setErrors;
          }
        });
      }

      if (Object.keys(exerciseErrors).length === 0) {
        delete next[exerciseInstanceId];
      } else {
        next[exerciseInstanceId] = exerciseErrors;
      }

      return next;
    });
  };

  const clearSectionValidationField = (sectionId: string, field: 'missingConfig' | 'emptyExercises') => {
    setSectionValidationErrors((prev) => {
      const existing = prev[sectionId];
      if (!existing || !existing[field]) return prev;
      const nextSection = { ...existing };
      delete nextSection[field];
      const next: SectionValidationErrors = { ...prev };
      if (Object.keys(nextSection).length === 0) {
        delete next[sectionId];
      } else {
        next[sectionId] = nextSection;
      }
      return next;
    });
  };

  const clearSetValidationField = (
    exerciseInstanceId: string,
    setIndex: number,
    field: keyof SetFieldValidation
  ) => {
    setValidationErrors((prev) => {
      const exerciseErrors = prev[exerciseInstanceId];
      if (!exerciseErrors) return prev;

      const setErrors = exerciseErrors[setIndex];
      if (!setErrors || !setErrors[field]) return prev;

      const nextSetErrors: SetFieldValidation = { ...setErrors };
      delete nextSetErrors[field];

      const nextExerciseErrors: Record<number, SetFieldValidation> = { ...exerciseErrors };
      if (Object.keys(nextSetErrors).length === 0) {
        delete nextExerciseErrors[setIndex];
      } else {
        nextExerciseErrors[setIndex] = nextSetErrors;
      }

      const nextValidationErrors: ValidationErrors = { ...prev };
      if (Object.keys(nextExerciseErrors).length === 0) {
        delete nextValidationErrors[exerciseInstanceId];
      } else {
        nextValidationErrors[exerciseInstanceId] = nextExerciseErrors;
      }

      return nextValidationErrors;
    });
  };

  useEffect(() => {
    if (!saveSignal || saveSignal === 0) {
      return;
    }

    setHasAttemptedSave(true);

    const nextErrors: ValidationErrors = {};
    const nextSectionErrors: SectionValidationErrors = {};

    workoutSchema.sections.forEach((section) => {
      const sectionErrors: SectionValidation = {};

      if (section.type === 'amrap') {
        if (!section.roundDurationSec || section.roundDurationSec <= 0) {
          sectionErrors.missingConfig = true;
        }
      }

      if (section.type === 'timed') {
        if (!section.targetRounds || section.targetRounds <= 0) {
          sectionErrors.missingConfig = true;
        }
      }

      if (section.type === 'circuits') {
        if (!section.targetRounds || section.targetRounds <= 0) {
          sectionErrors.missingConfig = true;
        }
      }

      if (section.type === 'auxiliary') {
        if (!section.category) {
          sectionErrors.missingConfig = true;
        }
      }

      if (!section.exercises || section.exercises.length === 0) {
        sectionErrors.emptyExercises = true;
      }

      if (Object.keys(sectionErrors).length > 0) {
        nextSectionErrors[section.id] = sectionErrors;
      }

      section.exercises?.forEach((exercise) => {
        const sets = exercise.sets || [];

        sets.forEach((set, index) => {
          const setErrors: SetFieldValidation = {};

          const hasRest = !!set.rest && set.rest.trim() !== '';
          if (!hasRest) {
            setErrors.rest = true;
          }

          if (exercise.exerciseType === 'distance_duration') {
            const hasDistance = !!set.distance && set.distance.trim() !== '';
            const hasDuration = !!set.duration && set.duration.trim() !== '';

            if (!hasDistance && !hasDuration) {
              setErrors.distance = true;
              setErrors.duration = true;
            }
          } else {
            if (set.type === 'dropset') {
              // For dropsets, at least one drop stage is required in reps or weight
              const hasReps = !!set.reps && set.reps.trim() !== '';
              const hasWeight =
                exercise.exerciseType === 'weight_reps' && !!set.weight && set.weight.trim() !== '';
              if (!hasReps && !hasWeight) {
                setErrors.reps = true;
                if (exercise.exerciseType === 'weight_reps') {
                  setErrors.weight = true;
                }
              }
            } else {
              // Reps required only for non-dropset, non-failure sets
              if (set.type !== 'failure') {
                const hasReps = !!set.reps && set.reps.trim() !== '';
                if (!hasReps) {
                  setErrors.reps = true;
                }
              }

              // Weight required for all weight_reps sets except dropsets
              if (exercise.exerciseType === 'weight_reps') {
                const hasWeight = !!set.weight && set.weight.trim() !== '';
                if (!hasWeight) {
                  setErrors.weight = true;
                }
              }
            }
          }

          if (Object.keys(setErrors).length > 0) {
            if (!nextErrors[exercise.instanceId]) {
              nextErrors[exercise.instanceId] = {};
            }
            nextErrors[exercise.instanceId][index] = setErrors;
          }
        });
      });
    });

    if (Object.keys(nextErrors).length > 0 || Object.keys(nextSectionErrors).length > 0) {
      setValidationErrors(nextErrors);
      setSectionValidationErrors(nextSectionErrors);
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
  }, [saveSignal]);

  const handleSectionSelect = (type: 'regular' | 'amrap' | 'timed' | 'circuits' | 'auxiliary') => {
    const newSection = {
      id: `sec_${type}_${Date.now()}`,
      type,
      // All section types use `exercises` for the builder UI. For AMRAP/Timed/Circuits/Auxiliary,
      // these will later be mapped appropriately in the payload.
      exercises: [] as ExerciseWithSuperset[],
      ...(type === 'amrap' && { roundDurationSec: undefined }),
      ...(type === 'timed' && { targetRounds: undefined }),
      ...(type === 'circuits' && { targetRounds: undefined }),
      ...(type === 'auxiliary' && { category: undefined }),
    };

    onDirtyChange?.();
    setWorkoutSchema((prev) => ({
      ...prev,
      sections: [...prev.sections, newSection],
    }));

    // Set the new section ID to trigger scrolling
    setNewSectionId(newSection.id);
  };

  // Scroll to newly added section
  useEffect(() => {
    if (newSectionId && contentScrollRef.current) {
      // Use a small timeout to ensure the DOM has updated
      const timeoutId = setTimeout(() => {
        const sectionRef = sectionRefsLocal.current.get(newSectionId);
        if (sectionRef && contentScrollRef.current) {
          requestAnimationFrame(() => {
            const scrollContainer = contentScrollRef.current;
            if (!scrollContainer) return;

            const containerRect = scrollContainer.getBoundingClientRect();
            const sectionRect = sectionRef.getBoundingClientRect();
            const scrollTop = scrollContainer.scrollTop;
            const sectionTop = sectionRect.top - containerRect.top + scrollTop;

            const targetScroll = sectionTop - containerRect.height / 2 + sectionRect.height / 2;
            scrollContainer.scrollTo({
              top: Math.max(0, targetScroll),
              behavior: 'smooth',
            });

            setNewSectionId(null);
          });
        }
      }, 50);

      return () => clearTimeout(timeoutId);
    }
  }, [newSectionId, workoutSchema.sections.length]);

  const handleDeleteSection = (sectionId: string) => {
    onDirtyChange?.();
    setWorkoutSchema((prev) => {
      const updatedSections = prev.sections.filter((section) => section.id !== sectionId);
      // If no sections remain, switch to section mode
      if (updatedSections.length === 0) {
        setBuilderMode('section');
      }
      return {
        ...prev,
        sections: updatedSections,
      };
    });
  };

  const handleDeleteKeyDown = (e: React.KeyboardEvent, sectionId: string) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleDeleteSection(sectionId);
    }
  };

  const handleDeleteExerciseFromOverview = (sectionId: string, exerciseId: string) => {
    onDirtyChange?.();
    setWorkoutSchema((prev) => ({
      ...prev,
      sections: prev.sections.map((section) => {
        if (section.id === sectionId && section.exercises) {
          return {
            ...section,
            exercises: section.exercises.filter((exercise) => exercise.exerciseId !== exerciseId),
          };
        }
        return section;
      }),
    }));
  };

  const handleDeleteSupersetFromOverview = (sectionId: string, exerciseIds: string[]) => {
    onDirtyChange?.();
    setWorkoutSchema((prev) => ({
      ...prev,
      sections: prev.sections.map((section) => {
        if (section.id === sectionId && section.exercises) {
          const exerciseIdSet = new Set(exerciseIds);
          return {
            ...section,
            exercises: section.exercises.filter(
              (exercise) => !exerciseIdSet.has(exercise.exerciseId)
            ),
          };
        }
        return section;
      }),
    }));
  };

  // Helper function to group exercises by superset
  const groupExercisesBySuperset = (exercises: ExerciseWithSuperset[]) => {
    const groups: Array<ExerciseWithSuperset[]> = [];
    let currentGroup: ExerciseWithSuperset[] = [];
    let currentGroupId: string | null = null;

    exercises.forEach((exercise) => {
      if (exercise.supersetGroupId) {
        if (exercise.supersetGroupId === currentGroupId) {
          currentGroup.push(exercise);
        } else {
          if (currentGroup.length > 0) {
            groups.push(currentGroup);
          }
          currentGroup = [exercise];
          currentGroupId = exercise.supersetGroupId;
        }
      } else {
        if (currentGroup.length > 0) {
          groups.push(currentGroup);
          currentGroup = [];
          currentGroupId = null;
        }
        groups.push([exercise]);
      }
    });

    if (currentGroup.length > 0) {
      groups.push(currentGroup);
    }

    return groups;
  };

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

  // Fallback drop handler used for empty sections or when no specific slot is active.
  const handleDrop = (e: React.DragEvent, sectionId: string) => {
    e.preventDefault();
    if (draggedExercise) {
      onDirtyChange?.();
      setWorkoutSchema((prev) => ({
        ...prev,
        sections: prev.sections.map((section) => {
          if (section.id === sectionId) {
            const exercises = section.exercises || [];
            const exerciseWithSuperset: ExerciseWithSuperset = {
              ...draggedExercise,
              supersetGroupId: null,
              instanceId: `${draggedExercise.exerciseId}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            };
            return {
              ...section,
              exercises: [...exercises, exerciseWithSuperset],
            };
          }
          return section;
        }),
      }));

      // Clear empty-exercises validation for this section once an exercise is added
      setSectionValidationErrors((prev) => {
        const existing = prev[sectionId];
        if (!existing || !existing.emptyExercises) return prev;
        const nextSection = { ...existing };
        delete nextSection.emptyExercises;
        const next: SectionValidationErrors = { ...prev };
        if (Object.keys(nextSection).length === 0) {
          delete next[sectionId];
        } else {
          next[sectionId] = nextSection;
        }
        return next;
      });
    }
    handleDragEnd();
  };

  // Higher-level drop handler for the whole section content.
  // Uses the calculated nearest slot position for smart dropping
  const handleSectionDrop = (e: React.DragEvent, sectionId: string) => {
    e.preventDefault();

    if (dragOverSlot && dragOverSlot.sectionId === sectionId) {
      // Use the calculated slot position
      handleSlotDrop(e, sectionId, dragOverSlot.slotIndex);
      return;
    }

    // Fallback: no slot was active, so append to the end of the section.
    handleDrop(e, sectionId);
  };

  const handleAddExercise = (sectionId: string) => {
    const emptyExercise: ExerciseWithSuperset = {
      exerciseId: `empty_${Date.now()}`,
      name: '',
      imageUrl: '',
      videoUrl: '',
      equipments: [],
      bodyParts: [],
      exerciseType: 'weight_reps',
      targetMuscles: [],
      secondaryMuscles: [],
      keywords: [],
      overview: '',
      instructions: [],
      exerciseTips: [],
      variations: [],
      relatedExerciseIds: [],
      supersetGroupId: null,
      instanceId: `empty_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    };

    onDirtyChange?.();
    setWorkoutSchema((prev) => ({
      ...prev,
      sections: prev.sections.map((section) => {
        if (section.id === sectionId && section.exercises) {
          return {
            ...section,
            exercises: [...section.exercises, emptyExercise],
          };
        }
        return section;
      }),
    }));

    // Clear empty-exercises validation when a manual exercise is added
    setSectionValidationErrors((prev) => {
      const existing = prev[sectionId];
      if (!existing || !existing.emptyExercises) return prev;
      const nextSection = { ...existing };
      delete nextSection.emptyExercises;
      const next: SectionValidationErrors = { ...prev };
      if (Object.keys(nextSection).length === 0) {
        delete next[sectionId];
      } else {
        next[sectionId] = nextSection;
      }
      return next;
    });
  };

  const handleSlotDrop = (e: React.DragEvent, sectionId: string, slotIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (!draggedExercise) return;

    onDirtyChange?.();
    setWorkoutSchema((prev) => ({
      ...prev,
      sections: prev.sections.map((section) => {
        if (section.id !== sectionId) return section;

        const exercises = section.exercises || [];
        const exerciseWithSuperset: ExerciseWithSuperset = {
          ...draggedExercise,
          supersetGroupId: null,
          instanceId: `${draggedExercise.exerciseId}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        };

        const updatedExercises = [...exercises];
        const safeIndex = Math.min(Math.max(slotIndex, 0), updatedExercises.length);
        updatedExercises.splice(safeIndex, 0, exerciseWithSuperset);

        return {
          ...section,
          exercises: updatedExercises,
        };
      }),
    }));

    // Clear empty-exercises validation when an exercise is dropped into a section
    setSectionValidationErrors((prev) => {
      const existing = prev[sectionId];
      if (!existing || !existing.emptyExercises) return prev;
      const nextSection = { ...existing };
      delete nextSection.emptyExercises;
      const next: SectionValidationErrors = { ...prev };
      if (Object.keys(nextSection).length === 0) {
        delete next[sectionId];
      } else {
        next[sectionId] = nextSection;
      }
      return next;
    });

    handleDragEnd();
  };

  const handleSupersetLink = (sectionId: string, exerciseIndex: number) => {
    onDirtyChange?.();
    setWorkoutSchema((prev) => ({
      ...prev,
      sections: prev.sections.map((section) => {
        if (section.id === sectionId && section.exercises) {
          const exercises = [...section.exercises];
          const currentExercise = exercises[exerciseIndex];
          const nextExercise = exercises[exerciseIndex + 1];

          if (currentExercise && nextExercise) {
            // Determine the contiguous block we are (or will be) linking
            let start = exerciseIndex;
            let end = exerciseIndex + 1;

            // Extend upwards while part of any existing superset chain
            while (start > 0 && exercises[start - 1].supersetGroupId) {
              start -= 1;
            }

            // Extend downwards while part of any existing superset chain
            while (end < exercises.length - 1 && exercises[end + 1].supersetGroupId) {
              end += 1;
            }

            // Use an existing group id if present, otherwise create a new one
            const existingGroupId =
              currentExercise.supersetGroupId ||
              nextExercise.supersetGroupId ||
              exercises[start].supersetGroupId ||
              exercises[end].supersetGroupId;

            const supersetGroupId =
              existingGroupId || `superset_${sectionId}_${exerciseIndex}_${Date.now()}`;

            // Assign the same supersetGroupId to the entire contiguous block
            for (let i = start; i <= end; i += 1) {
              exercises[i] = {
                ...exercises[i],
                supersetGroupId,
              };
            }
          }

          return {
            ...section,
            exercises,
          };
        }
        return section;
      }),
    }));
  };

  const handleSupersetUnlink = (sectionId: string, exerciseIndex: number) => {
    onDirtyChange?.();
    setWorkoutSchema((prev) => ({
      ...prev,
      sections: prev.sections.map((section) => {
        if (section.id === sectionId && section.exercises) {
          const exercises = [...section.exercises];
          const currentExercise = exercises[exerciseIndex];
          const nextExercise = exercises[exerciseIndex + 1];

          if (
            currentExercise &&
            nextExercise &&
            currentExercise.supersetGroupId &&
            currentExercise.supersetGroupId === nextExercise.supersetGroupId
          ) {
            const groupId = currentExercise.supersetGroupId;

            // We want to break the chain only at the selected boundary:
            // - Keep the chain above exerciseIndex as one superset group
            // - Keep the chain below exerciseIndex+1 as a separate superset group (if 2+ cards)

            // Find contiguous segment ABOVE including exerciseIndex that belongs to this group
            let upperStart = exerciseIndex;
            while (upperStart > 0 && exercises[upperStart - 1].supersetGroupId === groupId) {
              upperStart -= 1;
            }
            const upperEnd = exerciseIndex;

            // Find contiguous segment BELOW starting at exerciseIndex + 1 that belongs to this group
            let lowerStart = exerciseIndex + 1;
            let lowerEnd = lowerStart;
            while (
              lowerEnd < exercises.length - 1 &&
              exercises[lowerEnd + 1].supersetGroupId === groupId
            ) {
              lowerEnd += 1;
            }

            // Upper segment stays with the original groupId (no change needed)

            // Lower segment becomes either a new superset group (if at least 2 exercises)
            // or is fully unlinked if it's only a single exercise.
            const lowerLength = lowerEnd - lowerStart + 1;
            const newGroupId =
              lowerLength >= 2 ? `superset_${sectionId}_${lowerStart}_${Date.now()}` : null;

            for (let i = lowerStart; i <= lowerEnd; i += 1) {
              exercises[i] = {
                ...exercises[i],
                supersetGroupId: newGroupId,
              };
            }
          }

          return {
            ...section,
            exercises,
          };
        }
        return section;
      }),
    }));
  };

  // Wrapper functions for slot drag handlers
  const handleSlotDragOver = (e: React.DragEvent, sectionId: string, slotIndex: number) => {
    // The hook's handleSectionDragOver automatically calculates the nearest slot
    // We just need to call it with the section info
    const section = workoutSchema.sections.find((s) => s.id === sectionId);
    if (section) {
      handleSectionDragOver(e, sectionId, section.exercises?.length || 0);
    }
  };

  const handleSlotDragLeave = (e: React.DragEvent) => {
    handleSectionDragLeave(e);
  };

  const handleSlotDropWrapper = (e: React.DragEvent, sectionId: string, slotIndex: number) => {
    handleSlotDrop(e, sectionId, slotIndex);
  };

  return (
    <div className="flex h-full max-h-full overflow-hidden min-h-0 bg-background p-2">
      <div className="flex-[1.5] p-2 h-full flex flex-col min-h-0">
        <Card className="relative h-full" style={{ height: '100%' }}>
          <CardContent className="absolute inset-0 p-4 overflow-y-auto flex flex-col">
            <Tabs
              value={builderMode}
              onValueChange={(value) => {
                if (value) setBuilderMode(value as 'chat' | 'exercise' | 'section');
              }}
            >
              <TabsList className="w-full">
                <TabsTrigger
                  value="chat"
                  className="flex-1 data-[state=active]:border-primary data-[state=active]:bg-primary/5 data-[state=active]:text-primary dark:data-[state=active]:border-primary dark:data-[state=active]:bg-primary/5 dark:data-[state=active]:text-primary"
                >
                  Chat
                </TabsTrigger>
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
            {builderMode === 'chat' && (
              <div
                className="flex-1 min-h-0 mt-4 flex flex-col overflow-hidden relative"
                onDragEnter={handleChatDragEnter}
                onDragOver={handleChatDragOver}
                onDragLeave={handleChatDragLeave}
                onDrop={handleChatDrop}
              >
                {/* Drag Overlay */}
                {isDraggingOver && (
                  <div className="absolute inset-0 z-50 flex items-center justify-center bg-primary/10 border-2 border-dashed border-primary rounded-lg pointer-events-none">
                    <p className="text-lg font-semibold text-primary">Drop PDF here</p>
                  </div>
                )}
                {/* Chat Messages - Scrollable - hidden when dragging */}
                <div
                  ref={chatScrollRef}
                  className={cn('flex-1 min-h-0 overflow-y-auto', isDraggingOver && 'opacity-0 pointer-events-none')}
                >
                  <div className="flex flex-col gap-3 px-4 pt-4 pb-4">
                    {chatMessages.length === 0 ? (
                      <div className="flex flex-col items-center gap-4 py-8">
                        <div className="relative flex items-center justify-center py-8 px-8">
                          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary via-primary/90 to-primary/80 blur-sm opacity-30 -z-10"></div>
                          <div className="relative z-10 inline-flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-primary via-primary/90 to-primary/80 text-primary-foreground shadow-lg">
                            <BrainCog className="h-10 w-10" />
                          </div>
                        </div>
                        <h2 className="text-xl font-semibold text-center">OneNinety AI Builder</h2>
                        <p className="text-sm text-foreground text-center max-w-md">
                          Ask for an auto-made workout, explain what you want to be included in yours and write in whatever form you wish.
                        </p>
                      </div>
                    ) : (
                      chatMessages.map((message, index) => {
                        const isLastInSequence =
                          index === chatMessages.length - 1 ||
                          chatMessages[index + 1]?.isSent !== message.isSent;

                        return (
                          <div
                            key={message.id}
                            className={cn(
                              'flex w-full flex-col',
                              message.isSent ? 'items-end' : 'items-start'
                            )}
                          >
                            {/* Message Text */}
                            {message.text.trim() && (
                              <div
                                className={cn(
                                  'max-w-[80%] rounded-xl px-3 py-2',
                                  message.isSent
                                    ? 'bg-primary/20 text-foreground'
                                    : 'bg-sidebar text-foreground',
                                  isLastInSequence && message.isSent && 'rounded-br-sm',
                                  isLastInSequence && !message.isSent && 'rounded-bl-sm'
                                )}
                              >
                                <p className="text-sm whitespace-pre-wrap break-words">
                                  {message.text}
                                </p>
                              </div>
                            )}
                            {/* PDF Attachment - Below message */}
                            {message.pdfAttachment && (
                              <div
                                className={cn(
                                  'mt-2 max-w-[80%] px-3 py-2 bg-background/50 border',
                                  message.isSent ? 'items-end' : 'items-start',
                                  isLastInSequence && message.isSent
                                    ? 'rounded-[18px] rounded-br-sm'
                                    : isLastInSequence && !message.isSent
                                      ? 'rounded-[18px] rounded-bl-sm'
                                      : 'rounded-[18px]'
                                )}
                              >
                                <div
                                  role="button"
                                  tabIndex={0}
                                  aria-label={`View ${message.pdfAttachment.name}`}
                                  className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
                                >
                                  <div className="flex items-center justify-center h-10 w-10 rounded-md bg-orange-100 dark:bg-orange-900/30 flex-shrink-0">
                                    <FileText className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-foreground truncate">
                                      {message.pdfAttachment.name}
                                    </p>
                                    <p className="text-xs text-muted-foreground">PDF</p>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                    {isSendingMessage && (
                      <div className="flex justify-start">
                        <div className="max-w-[80%] rounded-xl px-3 py-2 bg-sidebar text-foreground">
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full bg-foreground/40 animate-pulse" />
                            <div className="h-2 w-2 rounded-full bg-foreground/40 animate-pulse delay-75" />
                            <div className="h-2 w-2 rounded-full bg-foreground/40 animate-pulse delay-150" />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                {/* Chat Input - Fixed at bottom */}
                <div className={cn('flex-shrink-0', isDraggingOver && 'opacity-0 pointer-events-none')}>
                  <div
                    ref={containerRef}
                    className={cn(
                      'relative flex bg-sidebar px-3 py-2 transition-all duration-700 ease-in-out',
                      isMultiLine ? 'flex-col' : 'items-center'
                    )}
                    style={{ borderRadius: '28px' }}
                  >
                    {/* PDF Preview */}
                    {attachedPdf && (
                      <div
                        className="mb-2 px-3 py-2 bg-background/50"
                        style={{ borderRadius: '18px' }}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div
                            role="button"
                            tabIndex={0}
                            aria-label={`View ${attachedPdf.name}`}
                            className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer hover:opacity-80 transition-opacity"
                          >
                            <div className="flex items-center justify-center h-10 w-10 rounded-md bg-orange-100 dark:bg-orange-900/30 flex-shrink-0">
                              <FileText className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">
                                {attachedPdf.name}
                              </p>
                              <p className="text-xs text-muted-foreground">PDF</p>
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 flex-shrink-0"
                            onClick={handleRemovePdf}
                            aria-label="Remove PDF"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf"
                      onChange={handleFileChange}
                      className="hidden"
                      aria-label="Attach PDF"
                    />
                    {!isMultiLine ? (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 flex-shrink-0 rounded-full hover:bg-gray-200 dark:hover:bg-white/10"
                              onClick={handleFileButtonClick}
                              aria-label="Attach file"
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Attach files</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ) : null}
                    <Textarea
                      ref={chatTextareaRef}
                      placeholder="Type, dictate or upload a file..."
                      value={chatPrompt}
                      onChange={(e) => setChatPrompt(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      className={cn(
                        'resize-none min-h-[36px] max-h-[120px] py-2 bg-sidebar dark:bg-sidebar border-0 focus-visible:ring-0 focus-visible:ring-offset-0 shadow-none focus-visible:bg-sidebar dark:focus-visible:bg-sidebar',
                        isMultiLine ? 'w-full' : 'flex-1 min-w-0'
                      )}
                      aria-label="Type a message"
                      rows={1}
                    />
                    {isMultiLine ? (
                      <>
                        <div className="flex items-center justify-between gap-2 mt-1">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 flex-shrink-0 rounded-full hover:bg-gray-200 dark:hover:bg-white/10"
                                  onClick={handleFileButtonClick}
                                  aria-label="Attach file"
                                >
                                  <Plus className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Attach files</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          {chatPrompt.trim() || attachedPdf ? (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    onClick={handleSendMessage}
                                    disabled={isSendingMessage || (!chatPrompt.trim() && !attachedPdf)}
                                    className="gap-2 !bg-[#3f3c39] dark:!bg-foreground !text-background [&_svg]:!text-background hover:!bg-[#4a4642] dark:hover:!bg-foreground/90 h-8 w-8 p-0 rounded-full"
                                    aria-label="Send message"
                                  >
                                    <ArrowUp className="size-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Send message</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          ) : (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    onClick={handleSendMessage}
                                    className="gap-2 !bg-[#3f3c39] dark:!bg-foreground !text-background [&_svg]:!text-background hover:!bg-[#4a4642] dark:hover:!bg-foreground/90 h-8 w-8 p-0 rounded-full"
                                    aria-label="Send message"
                                  >
                                    <ArrowUp className="size-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Send message</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </div>
                      </>
                    ) : chatPrompt.trim() || attachedPdf ? (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              onClick={handleSendMessage}
                              disabled={isSendingMessage || (!chatPrompt.trim() && !attachedPdf)}
                              className="gap-2 !bg-[#3f3c39] dark:!bg-foreground !text-background [&_svg]:!text-background hover:!bg-[#4a4642] dark:hover:!bg-foreground/90 h-8 w-8 p-0 rounded-full"
                              aria-label="Send message"
                            >
                              <ArrowUp className="size-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Send message</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ) : (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              onClick={handleSendMessage}
                              className="gap-2 !bg-[#3f3c39] dark:!bg-foreground !text-background [&_svg]:!text-background hover:!bg-[#4a4642] dark:hover:!bg-foreground/90 h-8 w-8 p-0 rounded-full"
                              aria-label="Send message"
                            >
                              <ArrowUp className="size-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Send message</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </div>
                </div>
              </div>
            )}
            {builderMode === 'exercise' && (
              <div className="flex-1 min-h-0 mt-4">
                <ExerciseSelectionPanel
                  onExerciseClick={handleExerciseClick}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
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
      <div className="flex-[2.5] p-2 h-full flex flex-col min-h-0">
        <Card className="relative h-full" style={{ height: '100%' }}>
          {isLoadingAiWorkout && (
            <div className="absolute inset-0 mt-[1px] bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                <p className="text-sm text-muted-foreground">Generating workout...</p>
              </div>
            </div>
          )}
          <CardContent ref={contentScrollRef} className="absolute inset-0 p-4 overflow-y-auto">
            {workoutSchema.sections.length > 0 ? (
              <div className="flex flex-col gap-4 w-full min-h-0">
                {workoutSchema.sections.map((section) => {
                  const isCollapsed = collapsedSections.has(section.id);
                  return (
                    <div
                      key={section.id}
                      ref={(el) => {
                        if (el) {
                          sectionRefsLocal.current.set(section.id, el);
                        } else {
                          sectionRefsLocal.current.delete(section.id);
                        }
                      }}
                    >
                      <WorkoutSectionCard
                        section={section}
                        isCollapsed={isCollapsed}
                        onToggleCollapse={() => {
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
                        onDelete={() => handleDeleteSection(section.id)}
                        onSectionChange={(updates) => {
                          onDirtyChange?.();
                          setWorkoutSchema((prev) => ({
                            ...prev,
                            sections: prev.sections.map((sec) =>
                              sec.id === section.id ? { ...sec, ...updates } : sec
                            ),
                          }));
                        }}
                        onDirtyChange={onDirtyChange}
                        sectionValidationErrors={sectionValidationErrors}
                        exercises={section.exercises || []}
                        onExerciseChange={(exerciseIndex, exercise) => {
                          onDirtyChange?.();
                          recomputeExerciseValidation(
                            exercise.instanceId,
                            exercise.exerciseType as 'weight_reps' | 'reps' | 'distance_duration',
                            exercise.sets || []
                          );
                          setWorkoutSchema((prev) => ({
                            ...prev,
                            sections: prev.sections.map((sec) => {
                              if (sec.id === section.id && sec.exercises) {
                                const updatedExercises = [...sec.exercises];
                                updatedExercises[exerciseIndex] = exercise;
                                return { ...sec, exercises: updatedExercises };
                              }
                              return sec;
                            }),
                          }));
                        }}
                        onExerciseDelete={(exerciseIndex) => {
                          onDirtyChange?.();
                          setWorkoutSchema((prev) => ({
                            ...prev,
                            sections: prev.sections.map((sec) => {
                              if (sec.id === section.id && sec.exercises) {
                                return {
                                  ...sec,
                                  exercises: sec.exercises.filter((_, idx) => idx !== exerciseIndex),
                                };
                              }
                              return sec;
                            }),
                          }));
                        }}
                        onAddExercise={() => handleAddExercise(section.id)}
                        onSupersetLink={(exerciseIndex) => handleSupersetLink(section.id, exerciseIndex)}
                        onSupersetUnlink={(exerciseIndex) => handleSupersetUnlink(section.id, exerciseIndex)}
                        onDragOver={(e) => handleSectionDragOver(e, section.id, section.exercises?.length || 0)}
                        onDragLeave={handleSectionDragLeave}
                        onDrop={(e) => handleSectionDrop(e, section.id)}
                        onSlotDragOver={(e, slotIndex) => handleSlotDragOver(e, section.id, slotIndex)}
                        onSlotDragLeave={handleSlotDragLeave}
                        onSlotDrop={(e, slotIndex) => handleSlotDropWrapper(e, section.id, slotIndex)}
                        draggedExercise={draggedExercise}
                        dragOverSlot={dragOverSlot}
                        dragOverSectionId={dragOverSectionId}
                        onVideoClick={handleExerciseClick}
                        exerciseRefs={exerciseRefs}
                        focusedExerciseId={focusedExerciseId}
                        registerSectionRef={registerSectionRef}
                        onClearSectionValidation={clearSectionValidationField}
                      />
                    </div>
                  );
                })}
                <div className="flex items-center justify-center py-2">
                  <WorkoutAddSectionButton onSectionSelect={handleSectionSelect} size="sm" />
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full gap-4">
                <p className="text-muted-foreground text-center">
                  Add your first section to start building your workout.
                </p>
                <WorkoutAddSectionButton onSectionSelect={handleSectionSelect} variant="centered" size="default" />
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
              sections={workoutSchema.sections
                .filter((section) => section.type === 'regular' || section.type === 'amrap' || section.type === 'timed')
                .map((section) => ({
                  id: section.id,
                  type: section.type as 'regular' | 'amrap' | 'timed',
                  exercises: section.exercises?.map((exercise) => ({
                    exerciseId: exercise.exerciseId,
                    instanceId: exercise.instanceId,
                    name: exercise.name,
                    supersetGroupId: exercise.supersetGroupId,
                  })),
                }))}
              onSectionsChange={(sections) => {
                onDirtyChange?.();
                setWorkoutSchema((prev) => ({
                  ...prev,
                  sections: sections.map((section) => {
                    const originalSection = prev.sections.find((s) => s.id === section.id);
                    if (!originalSection) {
                      return {
                        id: section.id,
                        type: section.type,
                        exercises: section.exercises?.map((ex) => {
                          const found = searchExercises('').find((e) => e.exerciseId === ex.exerciseId);
                          return found
                            ? {
                              ...found,
                              instanceId: ex.instanceId,
                              supersetGroupId: ex.supersetGroupId,
                              sets: [],
                            }
                            : {
                              exerciseId: ex.exerciseId,
                              name: ex.name,
                              imageUrl: '',
                              videoUrl: '',
                              equipments: [],
                              bodyParts: [],
                              exerciseType: 'weight_reps',
                              targetMuscles: [],
                              secondaryMuscles: [],
                              keywords: [],
                              overview: '',
                              instructions: [],
                              exerciseTips: [],
                              variations: [],
                              relatedExerciseIds: [],
                              instanceId: ex.instanceId,
                              supersetGroupId: ex.supersetGroupId,
                              sets: [],
                            };
                        }),
                      };
                    }
                    return {
                      ...originalSection,
                      exercises: section.exercises?.map((ex) => {
                        const originalExercise = originalSection.exercises?.find(
                          (e) => e.instanceId === ex.instanceId
                        );
                        return originalExercise
                          ? {
                            ...originalExercise,
                            supersetGroupId: ex.supersetGroupId,
                          }
                          : {
                            ...searchExercises('').find((e) => e.exerciseId === ex.exerciseId) || {
                              exerciseId: ex.exerciseId,
                              name: ex.name,
                              imageUrl: '',
                              videoUrl: '',
                              equipments: [],
                              bodyParts: [],
                              exerciseType: 'weight_reps',
                              targetMuscles: [],
                              secondaryMuscles: [],
                              keywords: [],
                              overview: '',
                              instructions: [],
                              exerciseTips: [],
                              variations: [],
                              relatedExerciseIds: [],
                            },
                            instanceId: ex.instanceId,
                            supersetGroupId: ex.supersetGroupId,
                            sets: [],
                          };
                      }),
                    };
                  }),
                }));
              }}
              onDeleteSection={handleDeleteSection}
              onDeleteExercise={handleDeleteExerciseFromOverview}
              onDeleteSuperset={handleDeleteSupersetFromOverview}
              groupExercisesBySuperset={(exercises) => {
                const fullExercises = exercises.map((ex) => {
                  const section = workoutSchema.sections.find((s) =>
                    s.exercises?.some((e) => e.instanceId === ex.instanceId)
                  );
                  return section?.exercises?.find((e) => e.instanceId === ex.instanceId);
                }).filter((e): e is ExerciseWithSuperset => e !== undefined);
                return groupExercisesBySuperset(fullExercises) as any;
              }}
              onExerciseClick={handleExerciseClickById}
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
