'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ArrowUp, BrainCog, Dumbbell, FileText, Info, Link2, Link2Off, NotebookPen, Paperclip, Plus, Sparkles, Timer, Trash2, X } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { searchExercises, type Exercise } from '@/lib/library/exercises/exercise-search';
import type { GeneratedWorkout } from '@/lib/library/workouts/generate-exercise';
import { generateWorkoutFromPrompt, prompt } from '@/lib/library/workouts/generate-exercise';
import { toast } from 'sonner';
import { MOCK_WORKOUT_SCHEMA } from '@/lib/library/workouts/mock-workout-schema';
import type {
  ExerciseGroupPayload,
  ExerciseType,
  RegularExercisePayload,
  RoundExercisePayload,
  SetPayload,
  WorkoutProgramPayload,
  WorkoutSectionPayload,
} from '../workout-schema';
import type { SetData } from '../components/exercise-card';
import { ExerciseCard } from '../components/exercise-card';
import { ExerciseSelectionPanel } from '../components/exercise-selection-panel';
import { SectionSelectionPanel } from '../components/section-selection-panel';
import { EquipmentPanel } from '../components/equipment-panel';
import { OverviewPanel } from '../components/overview-panel';
import { VideoModal } from '../components/video-modal';
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
    type: 'regular' | 'amrap' | 'timed';
    exercises?: ExerciseWithSuperset[];
    roundDurationSec?: number;
    targetRounds?: number;
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

  const parseNumberOrNull = (value?: string): number | null => {
    if (!value) return null;
    const n = Number(value);
    return Number.isNaN(n) ? null : n;
  };

  const parseStages = (value?: string): number[] | null => {
    if (!value) return null;
    const parts = value
      .split('-')
      .map((part) => Number(part.trim()))
      .filter((n) => !Number.isNaN(n));
    return parts.length > 0 ? parts : null;
  };

  const mapSetDataToPayload = (set: SetData): SetPayload => {
    const isDropset = set.type === 'dropset';

    if (isDropset) {
      const weightStages = parseStages(set.weight);
      const repStages = parseStages(set.reps);

      return {
        setNumber: set.setNumber,
        isDropset: true,
        weight: null,
        reps: null,
        distance: parseNumberOrNull(set.distance),
        durationSec: parseNumberOrNull(set.duration),
        restSec: parseNumberOrNull(set.rest),
        weightStages,
        repStages,
      };
    }

    return {
      setNumber: set.setNumber,
      isDropset: false,
      weight: parseNumberOrNull(set.weight),
      reps: parseNumberOrNull(set.reps),
      distance: parseNumberOrNull(set.distance),
      durationSec: parseNumberOrNull(set.duration),
      restSec: parseNumberOrNull(set.rest),
      weightStages: null,
      repStages: null,
    };
  };

  const sections: WorkoutSectionPayload[] = workoutSchema.sections.map((section) => {
    if (section.type === 'regular') {
      const groups = groupExercisesBySupersetForPayload(section.exercises || []);

      const exercises: ExerciseGroupPayload[] = groups.map((group) => {
        const mapped = group.map<RegularExercisePayload>((exercise) => ({
          id: exercise.exerciseId,
          name: exercise.name,
          exerciseType: exercise.exerciseType as ExerciseType,
          sets: (exercise.sets || []).map(mapSetDataToPayload),
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
        name: exercise.name,
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

    const exercises: RoundExercisePayload[] = (section.exercises || []).map((exercise: any) => ({
      id: exercise.exerciseId ?? exercise.id,
      name: exercise.name,
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

type SetFieldValidation = {
  reps?: boolean;
  weight?: boolean;
  distance?: boolean;
  duration?: boolean;
  rest?: boolean;
};

type ValidationErrors = Record<string, Record<number, SetFieldValidation>>;

type SectionValidation = {
  missingConfig?: boolean;
  emptyExercises?: boolean;
};

type SectionValidationErrors = Record<string, SectionValidation>;

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
  const [draggedExercise, setDraggedExercise] = useState<Exercise | null>(null);
  const [dragOverSectionId, setDragOverSectionId] = useState<string | null>(null);
  const [dragOverSlot, setDragOverSlot] = useState<{
    sectionId: string;
    slotIndex: number;
  } | null>(null);
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const [sectionValidationErrors, setSectionValidationErrors] = useState<SectionValidationErrors>(
    {}
  );
  const [hasAttemptedSave, setHasAttemptedSave] = useState(false);
  const [isLoadingAiWorkout, setIsLoadingAiWorkout] = useState(false);
  const contentScrollRef = useRef<HTMLDivElement | null>(null);
  const pendingScrollTopRef = useRef<number | null>(null);
  const exerciseRefs = useRef<Map<string, HTMLDivElement>>(new Map());

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
    // Find the exercise by ID from the search results
    const exercise = searchExercises('').find((e) => e.exerciseId === exerciseId);
    if (exercise) {
      handleExerciseClick(exercise);
    } else {
      // If exercise not found, try to scroll using just the ID
      const exerciseRef = exerciseRefs.current.get(exerciseId);
      if (exerciseRef && contentScrollRef.current) {
        const scrollContainer = contentScrollRef.current;
        const containerRect = scrollContainer.getBoundingClientRect();
        const exerciseRect = exerciseRef.getBoundingClientRect();
        const scrollTop = scrollContainer.scrollTop;
        const exerciseTop = exerciseRect.top - containerRect.top + scrollTop;

        const targetScroll = exerciseTop - containerRect.height / 2 + exerciseRect.height / 2;
        scrollContainer.scrollTo({
          top: Math.max(0, targetScroll),
          behavior: 'smooth',
        });
      }
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

  const handleSectionSelect = (type: 'regular' | 'amrap' | 'timed') => {
    // Preserve current scroll position in the middle content column
    if (contentScrollRef.current) {
      pendingScrollTopRef.current = contentScrollRef.current.scrollTop;
    }

    const newSection = {
      id: `sec_${type}_${Date.now()}`,
      type,
      // All section types use `exercises` for the builder UI. For AMRAP/Timed,
      // these will later be mapped to flat round exercises in the payload.
      exercises: [] as ExerciseWithSuperset[],
    };

    onDirtyChange?.();
    setWorkoutSchema((prev) => ({
      ...prev,
      sections: [...prev.sections, newSection],
    }));
  };

  // After sections change (e.g. a new section is added), restore scroll position
  useLayoutEffect(() => {
    if (pendingScrollTopRef.current !== null && contentScrollRef.current) {
      contentScrollRef.current.scrollTop = pendingScrollTopRef.current;
      pendingScrollTopRef.current = null;
    }
  }, [workoutSchema.sections.length]);

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

  const getSectionDescription = (type: 'regular' | 'amrap' | 'timed'): string => {
    switch (type) {
      case 'regular':
        return 'Exercise for exercise. Follow the sets and reps specified.';
      case 'amrap':
        return 'Track the total amount of rounds completed in the allocated time.';
      case 'timed':
        return 'Track total duration until completion of assigned rounds.';
      default:
        return '';
    }
  };

  const handleDragStart = (exercise: Exercise) => {
    setDraggedExercise(exercise);
  };

  const handleDragEnd = () => {
    setDraggedExercise(null);
    setDragOverSectionId(null);
    setDragOverSlot(null);
  };

  const handleDragOver = (e: React.DragEvent, sectionId: string) => {
    e.preventDefault();
    setDragOverSectionId(sectionId);
  };

  const handleDragLeave = () => {
    setDragOverSectionId(null);
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
    setDraggedExercise(null);
    setDragOverSectionId(null);
    setDragOverSlot(null);
  };

  // Higher-level drop handler for the whole section content.
  // If the user drops over the general area (not directly on a slot),
  // use the last active slot as the insertion point so the order matches
  // where they released the drag.
  const handleSectionDrop = (e: React.DragEvent, sectionId: string) => {
    e.preventDefault();

    if (dragOverSlot && dragOverSlot.sectionId === sectionId) {
      // Delegate to slot-based drop so we respect the intended index.
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

  const handleSlotDragOver = (e: React.DragEvent, sectionId: string, slotIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (!draggedExercise) return;
    setDragOverSlot({ sectionId, slotIndex });
  };

  const handleSlotDragLeave = (_e: React.DragEvent) => {
    // Intentionally no-op to avoid flicker when moving within the slot.
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

    setDraggedExercise(null);
    setDragOverSectionId(null);
    setDragOverSlot(null);
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

  return (
    <div className="flex h-full">
      <div className="flex-[2] bg-background h-full overflow-hidden flex flex-col">
        <div className="px-4 pt-4 flex-shrink-0">
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
        </div>
        {builderMode === 'chat' && (
          <div
            className="flex flex-col flex-1 min-h-0 overflow-hidden relative"
            onDragEnter={handleChatDragEnter}
            onDragOver={handleChatDragOver}
            onDragLeave={handleChatDragLeave}
            onDrop={handleChatDrop}
          >
            {/* Drag and Drop Overlay */}
            {isDraggingOver && (
              <div className="absolute inset-0 z-50 bg-primary/10 backdrop-blur-sm border-2 border-dashed border-primary rounded-lg flex items-center justify-center">
                <div className="text-center px-8">
                  <div className="flex flex-col items-center gap-4">
                    <div className="flex items-center gap-2 text-primary">
                      <FileText className="h-8 w-8" />
                    </div>
                    <div>
                      <p className="text-lg font-semibold text-foreground">
                        Drop your PDF here
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        PDF files will be added to the message composer
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
              {/* Chat Messages */}
              <ScrollArea className="flex-1 min-h-0" ref={chatScrollRef}>
                <div className="flex flex-col gap-3 px-4 pt-4 pb-4">
                  {chatMessages.length === 0 ? (
                    <div className="flex flex-col items-center gap-4 py-8">
                      <div className="relative flex items-center justify-center py-8 px-8">
                        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-orange-400 via-amber-400 to-pink-400 blur-sm opacity-30 -z-10"></div>
                        <div className="relative z-10 inline-flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-orange-400 via-amber-400 to-pink-400 text-white shadow-lg">
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
                                  : 'bg-muted text-foreground',
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
                      <div className="max-w-[80%] rounded-xl px-3 py-2 bg-muted text-foreground">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full bg-foreground/40 animate-pulse" />
                          <div className="h-2 w-2 rounded-full bg-foreground/40 animate-pulse delay-75" />
                          <div className="h-2 w-2 rounded-full bg-foreground/40 animate-pulse delay-150" />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>
              {/* Chat Input */}
              <div className="px-4 pb-4 pt-4 flex-shrink-0">
                <div
                  ref={containerRef}
                  className={cn(
                    'relative flex bg-muted px-3 py-2 transition-all duration-700 ease-in-out',
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
                      'resize-none min-h-[36px] max-h-[120px] py-2 bg-muted dark:bg-muted border-0 focus-visible:ring-0 focus-visible:ring-offset-0 shadow-none focus-visible:bg-muted dark:focus-visible:bg-muted',
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
            <div className="flex-1 overflow-y-auto px-4 pb-4">
              <ExerciseSelectionPanel
                onExerciseClick={handleExerciseClick}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
              />
            </div>
          )}
          {builderMode === 'section' && (
            <div className="flex-1 overflow-y-auto px-4 pb-4">
              <SectionSelectionPanel onSectionSelect={handleSectionSelect} />
            </div>
          )}
      </div>
      <Separator orientation="vertical" />
      <div className="relative flex-[3.5] h-full">
        {isLoadingAiWorkout && (
          <div className="absolute inset-0 mt-[1px] bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              <p className="text-sm text-muted-foreground">Generating workout...</p>
            </div>
          </div>
        )}
        <div
          ref={contentScrollRef}
          className="p-4 h-full overflow-y-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-muted [&::-webkit-scrollbar-track]:bg-transparent"
          style={{
            scrollbarWidth: 'thin',
            scrollbarColor: 'hsl(var(--muted)) transparent',
          }}
        >
          {workoutSchema.sections.length > 0 ? (
            <div className="flex flex-col gap-4 w-full">
              {workoutSchema.sections.map((section) => (
                <div key={section.id} className="relative flex w-full items-stretch flex-shrink-0">
                  <Card className="bg-background w-full flex flex-col relative">
                    <CardHeader className="border-b p-0 pb-2">
                      <div className="flex items-center justify-between px-3 pt-1">
                        <CardTitle className="uppercase tracking-wide text-sm font-medium flex items-center gap-2">
                          {section.type}{' '}
                          <span className="font-normal text-xs">
                            ({section.exercises ? section.exercises.length : 0})
                          </span>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="size-4 text-foreground translate-y-[1px]" />
                            </TooltipTrigger>
                            <TooltipContent>{getSectionDescription(section.type)}</TooltipContent>
                          </Tooltip>
                        </CardTitle>
                        <div className="flex items-center gap-2">
                          {(section.type === 'amrap' || section.type === 'timed') && (
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
                                    setSectionValidationErrors((prev) => {
                                      const existing = prev[section.id];
                                      if (!existing || !existing.missingConfig) return prev;
                                      const nextSection = { ...existing };
                                      delete nextSection.missingConfig;
                                      const next: SectionValidationErrors = { ...prev };
                                      if (Object.keys(nextSection).length === 0) {
                                        delete next[section.id];
                                      } else {
                                        next[section.id] = nextSection;
                                      }
                                      return next;
                                    });
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
                    <CardContent
                      className="flex-1 flex flex-col px-3 py-1.5"
                      onDragOver={(e) => handleDragOver(e, section.id)}
                      onDragLeave={handleDragLeave}
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
                            {/* Slot before the first exercise */}
                            <div
                              onDragOver={(e) => handleSlotDragOver(e, section.id, 0)}
                              onDragLeave={handleSlotDragLeave}
                              onDrop={(e) => handleSlotDrop(e, section.id, 0)}
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
                                  <ExerciseCard
                                    exercise={exercise}
                                    isLinkedToPrev={isLinkedToPrev}
                                    isLinkedToNext={isLinkedToNext}
                                    onVideoClick={handleExerciseClick}
                                    sectionType={section.type}
                                    validationErrors={validationErrors[exercise.instanceId]}
                                    onClearValidationField={(setIndex, field) =>
                                      clearSetValidationField(exercise.instanceId, setIndex, field)
                                    }
                                    onExerciseChange={(newExercise) => {
                                      onDirtyChange?.();
                                      const castExercise = newExercise as ExerciseWithSuperset;
                                      recomputeExerciseValidation(
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

                                  {/* Slot between this exercise and the next */}
                                  <div
                                    onDragOver={(e) =>
                                      handleSlotDragOver(e, section.id, exerciseIndex + 1)
                                    }
                                    onDragLeave={handleSlotDragLeave}
                                    onDrop={(e) => handleSlotDrop(e, section.id, exerciseIndex + 1)}
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
                            <div className="flex justify-center">
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
                  </Card>
                </div>
              ))}
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
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>
      </div>
      <Separator orientation="vertical" />
      <div className="flex-[1.5] bg-background h-full overflow-y-auto">
        <div className="p-4">
          <EquipmentPanel sections={workoutSchema.sections} />
          <OverviewPanel
            sections={workoutSchema.sections.map((section) => ({
              id: section.id,
              type: section.type,
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
              return groupExercisesBySuperset(fullExercises);
            }}
            onExerciseClick={handleExerciseClickById}
          />
        </div>
      </div>
      <VideoModal
        open={isVideoModalOpen}
        onOpenChange={setIsVideoModalOpen}
        exercise={selectedExercise}
      />
    </div>
  );
};
