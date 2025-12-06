'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { SidePanel } from '@/components/app/side-panel';
import { AssignAthletesList } from '@/components/app/assign-athletes-list';
import { MultiAsyncSelect } from '@/components/ui/multi-async-select';
import { RequiredAsterisk } from '@/components/ui/required-asterisk';
import { DataGrid, type ColumnDefinition, type FilterDefinition } from '@/components/app/data-grid';
import { EmptyGridState } from '@/components/app/empty-grid-state';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import { exportToCSV } from '@/lib/csv-export';
import {
  Search,
  X,
  Check,
  ArrowUpNarrowWide,
  ArrowDownWideNarrow,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Plus,
  FileText,
  Tag,
  Wrench,
  Calendar,
  HelpCircle,
  Download,
  Settings,
  User,
  Star,
  Archive,
  Trash2,
} from 'lucide-react';

import type { Program } from '@/components/app/app-shell';
import { starPrograms, archivePrograms, deletePrograms } from '@/lib/library/programs/programs-service';
import { getExercises, starExercises, archiveExercises, deleteExercises as deleteExercisesService, createExercise, editExercise } from '@/lib/library/exercises/exercises-service';

type ColumnId = 'category' | 'muscleGroup' | 'modality' | 'equipment' | 'created';

const COLUMN_ORDER: ColumnId[] = [
  'category',
  'muscleGroup',
  'modality',
  'equipment',
  'created',
];


const PROGRAM_TYPES = [
  'Weightlifting',
  'Bodyweight',
  'Cardio',
  'HIIT',
  'CrossFit',
  'Running',
  'Cycling',
  'Swimming',
  'Yoga',
  'Pilates',
  'Combination',
] as const;

const PROGRAM_DIFFICULTY_LEVELS = ['All levels', 'Beginner', 'Intermediate', 'Advanced'] as const;

const EXERCISE_CATEGORIES = ['Weight & Reps', 'Reps', 'Distance / Duration'] as const;

const MUSCLE_GROUPS = [
  'Chest',
  'Back',
  'Shoulders',
  'Biceps',
  'Triceps',
  'Forearms',
  'Abs',
  'Obliques',
  'Quadriceps',
  'Hamstrings',
  'Glutes',
  'Calves',
  'Traps',
  'Lats',
  'Delts',
  'Full Body',
] as const;

const EQUIPMENT_OPTIONS = [
  'Barbell',
  'Dumbbell',
  'Kettlebell',
  'Cable Machine',
  'Machine',
  'Resistance Band',
  'Bodyweight',
  'Medicine Ball',
  'TRX',
  'Pulley',
  'Smith Machine',
  'Plate Loaded',
  'Free Weights',
] as const;

const MODALITY_OPTIONS = [
  'Strength',
  'Power',
  'Agility',
  'Plyos',
  'Mobility',
  'Endurance',
  'Cardio',
  'Flexibility',
  'Balance',
  'Stability',
  'Speed',
  'Coordination',
] as const;

const extractVideoId = (url: string): { id: string; type: 'youtube' | 'vimeo' | null } => {
  if (!url.trim()) {
    return { id: '', type: null };
  }

  // YouTube patterns
  const youtubeRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
  const youtubeMatch = url.match(youtubeRegex);
  if (youtubeMatch) {
    return { id: youtubeMatch[1], type: 'youtube' };
  }

  // Vimeo patterns
  const vimeoRegex = /(?:vimeo\.com\/)(?:.*\/)?(\d+)/;
  const vimeoMatch = url.match(vimeoRegex);
  if (vimeoMatch) {
    return { id: vimeoMatch[1], type: 'vimeo' };
  }

  return { id: '', type: null };
};

const getColumnWidth = (colId: ColumnId, format: 'class' | 'pixel' = 'class'): string => {
  const widths: Record<ColumnId, { class: string; pixel: string }> = {
    category: { class: 'min-w-[140px]', pixel: '140px' },
    muscleGroup: { class: 'min-w-[150px]', pixel: '150px' },
    modality: { class: 'min-w-[140px]', pixel: '140px' },
    equipment: { class: 'min-w-[200px]', pixel: '200px' },
    created: { class: 'min-w-[150px]', pixel: '150px' },
  };

  return widths[colId]?.[format] || (format === 'class' ? 'min-w-[130px]' : '130px');
};

const ExercisesPage = () => {
  const t = useTranslations();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selectedExercises, setSelectedExercises] = useState<Set<string>>(new Set());
  const [starredExercises, setStarredExercises] = useState<Set<string>>(new Set());
  const [exercises, setExercises] = useState<Program[]>([]);
  const [isLoadingExercises, setIsLoadingExercises] = useState<boolean>(true);
  const [columnOrder] = useState<ColumnId[]>(COLUMN_ORDER);
  const [visibleColumns] = useState<Set<string>>(new Set(COLUMN_ORDER));
  const [filteredCount, setFilteredCount] = useState<number>(0);
  const itemsPerPage = 25;
  const [isCreateExerciseOpen, setIsCreateExerciseOpen] = useState<boolean>(false);
  const [editingExerciseId, setEditingExerciseId] = useState<string | null>(null);
  const [originalExerciseData, setOriginalExerciseData] = useState<{
    name: string;
    instructions: string;
    videoLink: string;
    category: string;
    muscleGroups: string[];
    equipment: string;
    modality: string;
  } | null>(null);
  const [exerciseName, setExerciseName] = useState<string>('');
  const [exerciseInstructions, setExerciseInstructions] = useState<string>('');
  const [videoLink, setVideoLink] = useState<string>('');
  const [vimeoThumbnail, setVimeoThumbnail] = useState<string | null>(null);
  const [isLoadingVimeoThumbnail, setIsLoadingVimeoThumbnail] = useState<boolean>(false);
  const [category, setCategory] = useState<string>('');
  const [muscleGroups, setMuscleGroups] = useState<string[]>([]);
  const [equipment, setEquipment] = useState<string>('');
  const [modality, setModality] = useState<string>('');
  const [exerciseNameError, setExerciseNameError] = useState<string | null>(null);
  const [exerciseInstructionsError, setExerciseInstructionsError] = useState<string | null>(null);
  const [videoLinkError, setVideoLinkError] = useState<string | null>(null);
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [muscleGroupsError, setMuscleGroupsError] = useState<string | null>(null);
  const [equipmentError, setEquipmentError] = useState<string | null>(null);
  const [modalityError, setModalityError] = useState<string | null>(null);
  const [isAssignExerciseOpen, setIsAssignExerciseOpen] = useState<boolean>(false);
  const [isAssignIndividualExerciseOpen, setIsAssignIndividualExerciseOpen] = useState<boolean>(false);
  const [selectedExerciseForAssignment, setSelectedExerciseForAssignment] = useState<Program | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const handleToggleExercise = (exerciseId: string) => {
    setSelectedExercises((prev) => {
      const next = new Set(prev);
      if (next.has(exerciseId)) {
        next.delete(exerciseId);
      } else {
        next.add(exerciseId);
      }
      return next;
    });
  };

  const handleNavigateToExercise = (exerciseId: string) => {
    const exercise = exercises.find((ex) => ex.id === exerciseId);
    if (exercise) {
      setEditingExerciseId(exerciseId);
      populateFormFromExercise(exercise);
      setIsCreateExerciseOpen(true);
    }
  };

  const handleNavigateToAthletes = () => {
    router.push('/athletes');
  };

  const handleOpenAssignExercise = () => {
    setIsAssignExerciseOpen(true);
  };

  const loadExercises = async () => {
    setIsLoadingExercises(true);
    try {
      const fetchedExercises = await getExercises();
      // Map Exercise type to Program type for compatibility
      const mappedExercises: Program[] = fetchedExercises.map((ex) => ({
        id: ex.id,
        program: ex.program,
        description: ex.description,
        type: ex.category, // Map category to type for compatibility
        length: '', // Not used for exercises
        totalExercises: 0, // Not used for exercises
        equipment: ex.equipment,
        created: ex.created,
        category: ex.category,
        muscleGroup: ex.muscleGroup.join(', '), // Convert array to string for display
        muscleGroups: ex.muscleGroup, // Keep array for filtering
        modality: ex.modality,
        videoLink: ex.videoLink,
      }));
      setExercises(mappedExercises);
    } catch (error) {
      console.error('Failed to load exercises:', error);
    } finally {
      setIsLoadingExercises(false);
    }
  };

  useEffect(() => {
    loadExercises();
  }, []);

  // Handle exerciseId from URL params (e.g., from search)
  useEffect(() => {
    const exerciseId = searchParams.get('exerciseId');
    if (exerciseId && exercises.length > 0) {
      // Check if exercise exists
      const exercise = exercises.find((ex) => ex.id === exerciseId);
      if (exercise && editingExerciseId !== exerciseId) {
        // Only open if it's a different exercise than currently being edited
        handleNavigateToExercise(exerciseId);
        // Remove exerciseId from URL to clean it up
        const newSearchParams = new URLSearchParams(searchParams.toString());
        newSearchParams.delete('exerciseId');
        const newUrl = newSearchParams.toString()
          ? `${window.location.pathname}?${newSearchParams.toString()}`
          : window.location.pathname;
        router.replace(newUrl);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, exercises, editingExerciseId, router]);

  const handleToggleStar = async (exerciseId: string, e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation();
    try {
      await starExercises(exerciseId);
      setStarredExercises((prev) => {
        const next = new Set(prev);
        if (next.has(exerciseId)) {
          next.delete(exerciseId);
        } else {
          next.add(exerciseId);
        }
        return next;
      });
    } catch (error) {
      // Error handling - could show toast here
      console.error('Failed to star exercise:', error);
    }
  };

  const handleStarKeyDown = (exerciseId: string, e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      e.stopPropagation();
      handleToggleStar(exerciseId, e);
    }
  };

  const handleClearSelected = () => {
    setSelectedExercises(new Set());
  };

  const handleStarSelected = async () => {
    if (selectedExercises.size === 0) return;
    try {
      await starExercises(Array.from(selectedExercises));
      // Update starred state for selected exercises
      setStarredExercises((prev) => {
        const next = new Set(prev);
        selectedExercises.forEach((id) => {
          if (!next.has(id)) {
            next.add(id);
          }
        });
        return next;
      });
      // Clear selection after starring
      setSelectedExercises(new Set());
    } catch (error) {
      console.error('Failed to star exercises:', error);
    }
  };

  const handleArchiveSelected = async () => {
    if (selectedExercises.size === 0) return;
    try {
      await archiveExercises(Array.from(selectedExercises));
      // Refresh exercises after archiving
      loadExercises();
      // Clear selection after archiving
      setSelectedExercises(new Set());
    } catch (error) {
      console.error('Failed to archive exercises:', error);
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedExercises.size === 0) return;
    try {
      await deleteExercisesService(Array.from(selectedExercises));
      // Refresh exercises after deleting
      loadExercises();
      // Clear selection after deleting
      setSelectedExercises(new Set());
    } catch (error) {
      console.error('Failed to delete exercises:', error);
    }
  };

  const handleExportSelected = () => {
    if (selectedExercises.size === 0) return;
    const selectedExercisesData: Program[] = [];
    const exportData = selectedExercisesData.map((row) => ({
      Exercise: row.program,
      Category: (row as any).category || '',
      'Muscle Group': (row as any).muscleGroup || '',
      Modality: (row as any).modality || '',
      Equipment: (row as any).equipment || row.equipment || '',
      Created: row.created,
    }));
    exportToCSV(exportData, 'selected-exercises.csv');
  };

  const resetCreateExerciseState = () => {
    setExerciseName('');
    setExerciseInstructions('');
    setVideoLink('');
    setVimeoThumbnail(null);
    setIsLoadingVimeoThumbnail(false);
    setCategory('');
    setMuscleGroups([]);
    setEquipment('');
    setModality('');
    setExerciseNameError(null);
    setExerciseInstructionsError(null);
    setVideoLinkError(null);
    setCategoryError(null);
    setMuscleGroupsError(null);
    setEquipmentError(null);
    setModalityError(null);
    setIsSaving(false);
    setEditingExerciseId(null);
    setOriginalExerciseData(null);
  };

  const populateFormFromExercise = (exercise: Program) => {
    const muscleGroupsArray = (exercise as any).muscleGroups || 
      ((exercise as any).muscleGroup?.split(',').map((g: string) => g.trim()) || []);
    
    setExerciseName(exercise.program);
    setExerciseInstructions(exercise.description);
    setVideoLink((exercise as any).videoLink || '');
    setCategory((exercise as any).category || '');
    setMuscleGroups(muscleGroupsArray);
    setEquipment(exercise.equipment);
    setModality((exercise as any).modality || '');
    
    // Store original data for change detection
    setOriginalExerciseData({
      name: exercise.program,
      instructions: exercise.description,
      videoLink: (exercise as any).videoLink || '',
      category: (exercise as any).category || '',
      muscleGroups: muscleGroupsArray,
      equipment: exercise.equipment,
      modality: (exercise as any).modality || '',
    });
  };

  const hasFormChanged = (): boolean => {
    if (!originalExerciseData || !editingExerciseId) {
      return false;
    }

    return (
      exerciseName.trim() !== originalExerciseData.name.trim() ||
      exerciseInstructions.trim() !== originalExerciseData.instructions.trim() ||
      videoLink.trim() !== originalExerciseData.videoLink.trim() ||
      category !== originalExerciseData.category ||
      JSON.stringify([...muscleGroups].sort()) !== JSON.stringify([...originalExerciseData.muscleGroups].sort()) ||
      equipment !== originalExerciseData.equipment ||
      modality !== originalExerciseData.modality
    );
  };

  // Fetch Vimeo thumbnail when video link changes
  useEffect(() => {
    const { id, type } = extractVideoId(videoLink);
    
    if (id && type === 'vimeo') {
      setIsLoadingVimeoThumbnail(true);
      setVimeoThumbnail(null);
      
      fetch(`https://vimeo.com/api/oembed.json?url=${encodeURIComponent(videoLink)}`)
        .then((response) => {
          if (!response.ok) {
            throw new Error('Failed to fetch Vimeo thumbnail');
          }
          return response.json();
        })
        .then((data) => {
          if (data.thumbnail_url) {
            setVimeoThumbnail(data.thumbnail_url);
          }
        })
        .catch((error) => {
          console.error('Error fetching Vimeo thumbnail:', error);
          setVimeoThumbnail(null);
        })
        .finally(() => {
          setIsLoadingVimeoThumbnail(false);
        });
    } else {
      setVimeoThumbnail(null);
      setIsLoadingVimeoThumbnail(false);
    }
  }, [videoLink]);

  const handleOpenCreateExercise = () => {
    resetCreateExerciseState();
    setEditingExerciseId(null);
    setIsCreateExerciseOpen(true);
  };

  const handleCloseCreateExercise = () => {
    setIsCreateExerciseOpen(false);
  };

  const handleSaveExercise = async () => {
    let hasError = false;

    if (!exerciseName.trim()) {
      setExerciseNameError(t('exercises.addExercise.exerciseNameRequiredError'));
      hasError = true;
    } else {
      setExerciseNameError(null);
    }

    if (!exerciseInstructions.trim()) {
      setExerciseInstructionsError(t('exercises.addExercise.instructionsRequiredError'));
      hasError = true;
    } else {
      setExerciseInstructionsError(null);
    }

    if (!videoLink.trim()) {
      setVideoLinkError(t('exercises.addExercise.videoLinkRequiredError'));
      hasError = true;
    } else {
      const { id, type } = extractVideoId(videoLink);
      if (!id || !type) {
        setVideoLinkError(t('exercises.addExercise.videoLinkInvalidError'));
        hasError = true;
      } else {
        setVideoLinkError(null);
      }
    }

    if (!category) {
      setCategoryError(t('exercises.addExercise.categoryRequiredError'));
      hasError = true;
    } else {
      setCategoryError(null);
    }

    if (muscleGroups.length === 0) {
      setMuscleGroupsError(t('exercises.addExercise.muscleGroupsRequiredError'));
      hasError = true;
    } else {
      setMuscleGroupsError(null);
    }

    if (!equipment) {
      setEquipmentError(t('exercises.addExercise.equipmentRequiredError'));
      hasError = true;
    } else {
      setEquipmentError(null);
    }

    if (!modality) {
      setModalityError(t('exercises.addExercise.modalityRequiredError'));
      hasError = true;
    } else {
      setModalityError(null);
    }

    if (hasError) {
      return;
    }

    setIsSaving(true);

    try {
      const exerciseData = {
        name: exerciseName.trim(),
        instructions: exerciseInstructions.trim(),
        videoLink: videoLink.trim() || undefined,
        category,
        muscleGroups,
        equipment,
        modality,
      };

      if (editingExerciseId) {
        // Edit mode
        await editExercise(editingExerciseId, exerciseData);
      } else {
        // Create mode
        await createExercise(exerciseData);
      }
      
      // Refresh exercises list
      await loadExercises();

      // Close side panel after successful save
      setIsCreateExerciseOpen(false);
      resetCreateExerciseState();
    } catch (error) {
      console.error('Failed to save exercise:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleExerciseRowKeyDown = (
    event: React.KeyboardEvent<HTMLTableRowElement>,
    exerciseId: string
  ) => {
    if (event.key === 'Enter' || event.key === ' ') {
      const targetElement = event.target as HTMLElement;
      if (targetElement.closest('[data-no-row-link="true"]')) {
        return;
      }

      event.preventDefault();
      handleNavigateToExercise(exerciseId);
    }
  };

  const handleExerciseRowClick = (
    event: React.MouseEvent<HTMLTableRowElement>,
    exerciseId: string
  ) => {
    const targetElement = event.target as HTMLElement;
    if (targetElement.closest('[data-no-row-link="true"]')) {
      return;
    }

    handleNavigateToExercise(exerciseId);
  };

  const formatDate = (dateStr: string): string => {
    const [day, month, year] = dateStr.split('-');
    const date = new Date(2000 + parseInt(year), parseInt(month) - 1, parseInt(day));
    const months = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];
    return `${months[date.getMonth()]} ${date.getDate()}, 20${year}`;
  };


  const isFuzzyMatch = (text: string, query: string): boolean => {
    const normalizedText = text.toLowerCase();
    const normalizedQuery = query.toLowerCase().trim();

    if (!normalizedQuery) {
      return true;
    }

    if (normalizedText.includes(normalizedQuery)) {
      return true;
    }

    let textIndex = 0;
    let queryIndex = 0;

    while (textIndex < normalizedText.length && queryIndex < normalizedQuery.length) {
      if (normalizedText[textIndex] === normalizedQuery[queryIndex]) {
        queryIndex += 1;
      }
      textIndex += 1;
    }

    return queryIndex === normalizedQuery.length;
  };

  const filteredColumnOrder = columnOrder.filter((colId) => visibleColumns.has(colId));

  // Create column definitions for DataGrid
  // Add "exercise" column for sorting (not in filteredColumnOrder so it won't render)
  const allColumns: ColumnDefinition<Program>[] = [
    {
      id: 'exercise',
      label: t('exercises.columns.exercise'),
      icon: <FileText className="size-3" />,
      getSortValue: (row) => row.program.toLowerCase(),
      getSearchValue: (row) => row.program,
    },
    ...filteredColumnOrder.map((columnId): ColumnDefinition<Program> => {
      switch (columnId) {
        case 'category':
          return {
            id: 'category',
            label: t('exercises.columns.category'),
            icon: <Tag className="size-3" />,
            width: {
              class: getColumnWidth('category', 'class'),
              pixel: getColumnWidth('category', 'pixel'),
            },
            tooltip: t('exercises.columnTooltips.category'),
            getSortValue: (row) => {
              const category = (row as any).category || '';
              return category.toLowerCase();
            },
            getSearchValue: (row) => {
              const category = (row as any).category || '';
              return `${row.program} ${category}`;
            },
            renderCell: (row) => {
              const category = (row as any).category || '';
              return (
              <div className="flex items-center h-full">
                  <span className="text-sm">{category}</span>
              </div>
              );
            },
          };
        case 'muscleGroup':
          return {
            id: 'muscleGroup',
            label: t('exercises.columns.muscleGroup'),
            icon: <User className="size-3" />,
            width: {
              class: getColumnWidth('muscleGroup', 'class'),
              pixel: getColumnWidth('muscleGroup', 'pixel'),
            },
            tooltip: t('exercises.columnTooltips.muscleGroup'),
            getSortValue: (row) => {
              const muscleGroup = (row as any).muscleGroup || '';
              return muscleGroup.toLowerCase();
            },
            getSearchValue: (row) => {
              const muscleGroup = (row as any).muscleGroup || '';
              return `${row.program} ${muscleGroup}`;
            },
            renderCell: (row) => {
              const muscleGroup = (row as any).muscleGroup || '';
              return (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center h-full min-w-0 w-full">
                      <span className="text-sm truncate block min-w-0 w-full">{muscleGroup}</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent
                  className="max-w-[200px] break-words"
                  side="top"
                  align="start"
                >
                  <p>{muscleGroup}</p>
                </TooltipContent>
              </Tooltip>
              );
            },
          };
        case 'modality':
          return {
            id: 'modality',
            label: t('exercises.columns.modality'),
            icon: <Wrench className="size-3" />,
            width: {
              class: getColumnWidth('modality', 'class'),
              pixel: getColumnWidth('modality', 'pixel'),
            },
            tooltip: t('exercises.columnTooltips.modality'),
            getSortValue: (row) => {
              const modality = (row as any).modality || '';
              return modality.toLowerCase();
            },
            getSearchValue: (row) => {
              const modality = (row as any).modality || '';
              return `${row.program} ${modality}`;
            },
            renderCell: (row) => {
              const modality = (row as any).modality || '';
              return (
                <div className="flex items-center h-full">
                  <span className="text-sm">{modality}</span>
              </div>
              );
            },
          };
        case 'equipment':
          return {
            id: 'equipment',
            label: t('general.equipment'),
            icon: <Wrench className="size-3" />,
            width: {
              class: getColumnWidth('equipment', 'class'),
              pixel: getColumnWidth('equipment', 'pixel'),
            },
            tooltip: t('exercises.columnTooltips.equipment'),
            getSortValue: (row) => {
              const equipment = (row as any).equipment || row.equipment || '';
              return equipment.toLowerCase();
            },
            getSearchValue: (row) => {
              const equipment = (row as any).equipment || row.equipment || '';
              return `${row.program} ${equipment}`;
            },
            renderCell: (row) => {
              const equipment = (row as any).equipment || row.equipment || '';
              return (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center h-full min-w-0 w-full">
                      <span className="text-sm truncate block min-w-0 w-full">{equipment}</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent
                  className="max-w-[200px] break-words"
                  side="top"
                  align="start"
                >
                    <p>{equipment}</p>
                </TooltipContent>
              </Tooltip>
              );
            },
          };
        case 'created':
          return {
            id: 'created',
            label: t('general.created'),
            icon: <Calendar className="size-3" />,
            width: {
              class: getColumnWidth('created', 'class'),
              pixel: getColumnWidth('created', 'pixel'),
            },
            tooltip: t('exercises.columnTooltips.created'),
            getSortValue: (row) => {
              const [day, month, year] = row.created.split('-').map(Number);
              return new Date(2000 + year, month - 1, day).getTime();
            },
            renderCell: (row) => (
              <div className="flex items-center h-full w-full pr-6">
                <span className="text-sm">{formatDate(row.created)}</span>
              </div>
            ),
          };
        default:
          return {
            id: columnId,
            label: columnId,
            getSortValue: () => '',
            renderCell: () => null,
          };
      }
    }),
  ];

  const columns: ColumnDefinition<Program>[] = allColumns;

  // Create filter definitions
  const filters: FilterDefinition<Program>[] = [
    {
      id: 'category',
      label: t('exercises.columns.category'),
      icon: <Tag className="size-4" />,
      options: EXERCISE_CATEGORIES.map((category) => ({ value: category, label: category })),
      getFilterValue: (row) => (row as any).category || '',
    },
    {
      id: 'muscleGroup',
      label: t('exercises.columns.muscleGroup'),
      icon: <User className="size-4" />,
      options: MUSCLE_GROUPS.map((group) => ({ value: group, label: group })),
      getFilterValue: (row) => {
        const muscleGroups = (row as any).muscleGroups || (row as any).muscleGroup?.split(',').map((g: string) => g.trim()) || [];
        const groupsArray = Array.isArray(muscleGroups) ? muscleGroups : [];
        // Return comma-separated string for filtering - the filter will check if value is in this string
        return groupsArray.join(',');
      },
    },
    {
      id: 'modality',
      label: t('exercises.columns.modality'),
      icon: <Wrench className="size-4" />,
      options: MODALITY_OPTIONS.map((modality) => ({ value: modality, label: modality })),
      getFilterValue: (row) => (row as any).modality || '',
    },
    {
      id: 'show',
      label: t('general.show'),
      icon: <Star className="size-4" />,
      options: [
        { value: 'starred', label: t('exercises.filters.starred') },
        { value: 'unstarred', label: t('exercises.filters.unstarred') },
      ],
      getFilterValue: (row) => (starredExercises.has(row.id) ? 'starred' : 'unstarred'),
    },
  ];

  // Create first column renderer
  const renderFirstColumn = (exercise: Program, isSelected: boolean) => {
    const isStarred = starredExercises.has(exercise.id);
    return (
      <div className="flex items-center gap-3 h-full w-full">
        <div className="flex items-center justify-center h-full" data-no-row-link="true">
          <Checkbox checked={isSelected} onCheckedChange={() => handleToggleExercise(exercise.id)} />
        </div>
        <span className="text-sm truncate flex-1 min-w-0">{exercise.program}</span>
        <div className="flex items-center justify-end flex-shrink-0 gap-1" data-no-row-link="true">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={(e) => handleToggleStar(exercise.id, e)}
                  onKeyDown={(e) => handleStarKeyDown(exercise.id, e)}
                  className="p-1 rounded text-foreground hover:text-primary hover:bg-accent transition-colors"
                  aria-label={t('exercises.actions.starExercise')}
                >
                  {isStarred ? (
                    <Star className="h-4 w-4 fill-primary text-primary" />
                  ) : (
                    <Star className="h-4 w-4" />
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{t('exercises.actions.starExercise')}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    );
  };

  // Create first column header with sorting
  const renderFirstColumnHeader = ({
    isSorted,
    isAscending,
    isDescending,
    onSort,
    isAllSelected,
    onToggleAll,
    enableRowSelection,
  }: {
    isSorted: boolean;
    isAscending: boolean;
    isDescending: boolean;
    onSort: (direction: 'asc' | 'desc') => void;
    isAllSelected: boolean;
    onToggleAll: () => void;
    enableRowSelection: boolean;
  }) => {
    return (
      <div className="flex items-center gap-3 h-full w-full">
        {enableRowSelection && (
          <Checkbox
            key={`select-all-exercises-${isAllSelected}`}
            checked={isAllSelected}
            onCheckedChange={onToggleAll}
            aria-label={t('exercises.actions.selectAllExercises')}
          />
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <div className="flex items-center gap-2 cursor-pointer h-full flex-1">
              <FileText className="size-3 text-muted-foreground" />
              <span className="text-xs uppercase text-muted-foreground">{t('exercises.columns.exercise')}</span>
              {isAscending && <ArrowUpNarrowWide className="size-3 text-muted-foreground" />}
              {isDescending && <ArrowDownWideNarrow className="size-3 text-muted-foreground" />}
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem
              onClick={() => onSort('asc')}
              className={cn(isAscending && 'bg-accent')}
            >
              <ArrowUpNarrowWide className="size-4 mr-2" />
              <span className="flex-1">{t('exercises.actions.sortAscending')}</span>
              {isAscending && <Check className="ml-2 size-4" />}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onSort('desc')}
              className={cn(isDescending && 'bg-accent')}
            >
              <ArrowDownWideNarrow className="size-4 mr-2" />
              <span className="flex-1">{t('exercises.actions.sortDescending')}</span>
              {isDescending && <Check className="ml-2 size-4" />}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  };

  const handleStartCreating = () => {
    resetCreateExerciseState();
    setIsCreateExerciseOpen(true);
  };

  return (
    <div className="h-full w-full flex flex-col">
      <div className="w-full relative">
        <div className="px-4 flex items-center justify-between mb-2 mt-2">
          <div className="flex flex-col">
            <p className="text-sm text-foreground">
              {`${filteredCount} ${filteredCount === 1 ? t('exercises.exercise') : t('exercises.exercisePlural')}`}
            </p>
          </div>
          <div>
            <Button onClick={handleOpenCreateExercise} className="gap-2" aria-label={t('exercises.actions.createExercise')}>
              <Plus className="size-4" />
              <span>{t('exercises.actions.createExercise')}</span>
            </Button>
          </div>
        </div>
      </div>
      <DataGrid
        data={exercises}
        columns={columns}
        getRowId={(row) => row.id}
        gridKey="exercises"
        itemsPerPage={itemsPerPage}
        onFilteredDataChange={setFilteredCount}
        enableSearch={true}
        searchPlaceholder={t('exercises.searchPlaceholder')}
        filters={filters}
        enableEditColumns={true}
        enableExport={true}
        exportFileName="exercises.csv"
        exportDataTransform={(row) => ({
          Exercise: row.program,
          Category: (row as any).category || '',
          'Muscle Group': (row as any).muscleGroup || '',
          Modality: (row as any).modality || '',
          Equipment: (row as any).equipment || row.equipment || '',
          Created: row.created,
        })}
        enableRowSelection={true}
        selectedRowIds={selectedExercises}
        onSelectionChange={setSelectedExercises}
        onRowClick={(row, event) => {
          const targetElement = event.target as HTMLElement;
          if (targetElement.closest('[data-no-row-link="true"]')) {
            return;
          }
          handleNavigateToExercise(row.id);
        }}
        onRowKeyDown={(row, event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            const targetElement = event.target as HTMLElement;
            if (targetElement.closest('[data-no-row-link="true"]')) {
              return;
            }
            event.preventDefault();
            handleNavigateToExercise(row.id);
          }
        }}
        defaultColumnOrder={COLUMN_ORDER}
        defaultVisibleColumns={COLUMN_ORDER}
        selectionActions={
          <div className="flex items-center gap-1">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    onClick={handleClearSelected}
                    className="gap-2"
                    aria-label={t('exercises.actions.clearSelectedAria')}
                  >
                    <X className="size-4" />
                    <span>
                      Clear {selectedExercises.size} selected
                    </span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{t('exercises.actions.clearSelected')}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    onClick={handleExportSelected}
                    className="gap-2"
                    aria-label={t('exercises.actions.exportSelectedAria')}
                  >
                    <Download className="size-4" />
                    <span>{t('exercises.actions.export')}</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{t('exercises.actions.export')}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    onClick={handleStarSelected}
                    className="gap-2"
                    aria-label={t('exercises.actions.starSelectedAria')}
                  >
                    <Star className="size-4" />
                    <span>{t('exercises.actions.starSelected')}</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{t('exercises.actions.starSelected')}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    onClick={handleArchiveSelected}
                    className="gap-2"
                    aria-label={t('exercises.actions.archiveSelectedAria')}
                  >
                    <Archive className="size-4" />
                    <span>{t('exercises.actions.archiveSelected')}</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{t('exercises.actions.archiveSelected')}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    onClick={handleDeleteSelected}
                    className="gap-2 text-destructive hover:text-destructive"
                    aria-label={t('exercises.actions.deleteSelectedAria')}
                  >
                    <Trash2 className="size-4" />
                    <span>{t('exercises.actions.deleteSelected')}</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{t('exercises.actions.deleteSelected')}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        }
        emptyMessage={t('exercises.emptyMessage')}
        emptyState={
          <EmptyGridState
            title={t('exercises.emptyState.title')}
            subtitle={t('exercises.emptyState.subtitle')}
            action={
              <Button
                onClick={handleStartCreating}
                aria-label={t('exercises.emptyState.startCreatingAria')}
              >
                {t('exercises.emptyState.startCreating')}
              </Button>
            }
          />
        }
        rowHeight="54px"
        stickyFirstColumn={true}
        firstColumnWidth="320px"
        firstColumnId="exercise"
        renderFirstColumn={renderFirstColumn}
        renderFirstColumnHeader={renderFirstColumnHeader}
        showPagination={true}
        gridPadding={true}
        compactPagination={true}
      />
      <SidePanel
        open={isAssignExerciseOpen}
        onOpenChange={setIsAssignExerciseOpen}
        title={t('exercises.actions.assignExercise')}
      >
        <AssignAthletesList
          onAthleteSelected={(athleteId) => {
            setIsAssignExerciseOpen(false);
            if (athleteId) {
              if (selectedExercises.size > 0) {
                // For bulk assign, navigate with preselected exercise
                const firstExerciseId = Array.from(selectedExercises)[0];
                const exercise = exercises.find((p) => p.id === firstExerciseId);
                if (exercise) {
                  router.push(
                    `/athletes/${athleteId}/training-calendar?exerciseId=${exercise.id}&exerciseName=${encodeURIComponent(exercise.program)}&openModal=true`
                  );
                }
              } else {
                // Generic assign - just open the exercise modal without preselection
                router.push(
                  `/athletes/${athleteId}/training-calendar?openModal=true&modalType=exercise`
                );
              }
            }
          }}
        />
      </SidePanel>
      <SidePanel
        open={isAssignIndividualExerciseOpen}
        onOpenChange={(open) => {
          setIsAssignIndividualExerciseOpen(open);
          if (!open) {
            setSelectedExerciseForAssignment(null);
          }
        }}
        title={selectedExerciseForAssignment ? t('exercises.assigning.title', { name: selectedExerciseForAssignment.program }) : t('exercises.assigning.titleGeneric')}
      >
        {selectedExerciseForAssignment && (
          <AssignAthletesList
            navigateOnSelect={false}
            onAthleteSelected={(athleteId) => {
              if (athleteId) {
                setIsAssignIndividualExerciseOpen(false);
                router.push(
                  `/athletes/${athleteId}/training-calendar?exerciseId=${selectedExerciseForAssignment.id}&exerciseName=${encodeURIComponent(selectedExerciseForAssignment.program)}&openModal=true`
                );
              }
            }}
          />
        )}
      </SidePanel>
      <SidePanel
        open={isCreateExerciseOpen}
        onOpenChange={(open) => {
            setIsCreateExerciseOpen(open);
          if (!open) {
            resetCreateExerciseState();
          }
        }}
        onOpenAutoFocus={(e) => {
          // Prevent auto-focus when opening
          e.preventDefault();
        }}
        title={editingExerciseId ? t('exercises.addExercise.editTitle') : t('exercises.addExercise.title')}
        footer={
          <div className="flex w-full justify-start gap-2">
            <Button
              type="button"
              onClick={handleSaveExercise}
              disabled={isSaving || (editingExerciseId ? !hasFormChanged() : false)}
              aria-label={t('exercises.addExercise.saveAria')}
              className={cn(isSaving && 'min-w-[120px] justify-center')}
            >
              {isSaving ? <Spinner className="h-4 w-4" /> : t('general.save')}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleCloseCreateExercise}
              disabled={isSaving}
              aria-label={t('exercises.addExercise.cancelAria')}
            >
              {t('general.cancel')}
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <label htmlFor="exercise-name" className="text-sm font-medium">
                {t('exercises.addExercise.exerciseName')}<RequiredAsterisk />
              </label>
              <Input
                id="exercise-name"
                type="text"
                placeholder={t('exercises.addExercise.exerciseNamePlaceholder')}
              value={exerciseName}
                onChange={(event) => {
                setExerciseName(event.target.value);
                if (exerciseNameError) {
                  setExerciseNameError(null);
                  }
                }}
                className="w-full"
              aria-invalid={!!exerciseNameError}
              />
            {exerciseNameError && <p className="text-sm text-destructive">{exerciseNameError}</p>}
            </div>

            <div className="flex flex-col gap-2">
            <label htmlFor="exercise-instructions" className="text-sm font-medium">
              {t('exercises.addExercise.instructions')}<RequiredAsterisk />
            </label>
            <Textarea
              id="exercise-instructions"
              value={exerciseInstructions}
              onChange={(event) => {
                setExerciseInstructions(event.target.value);
                if (exerciseInstructionsError) {
                  setExerciseInstructionsError(null);
                }
              }}
              placeholder={t('exercises.addExercise.instructionsPlaceholder')}
              rows={3}
              className="resize-none"
              aria-invalid={!!exerciseInstructionsError}
            />
            {exerciseInstructionsError && (
              <p className="text-sm text-destructive">{exerciseInstructionsError}</p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="video-link" className="text-sm font-medium">
              {t('exercises.addExercise.videoLink')}<RequiredAsterisk />
            </label>
            <div className="relative">
              <Input
                id="video-link"
                type="text"
                placeholder={t('exercises.addExercise.videoLinkPlaceholder')}
                value={videoLink}
                onChange={(event) => {
                  setVideoLink(event.target.value);
                  if (videoLinkError) {
                    setVideoLinkError(null);
                  }
                }}
                className={cn('w-full pr-8', videoLinkError && 'border-destructive aria-invalid:border-destructive')}
                aria-invalid={!!videoLinkError}
              />
              {videoLink && (
                <button
                  type="button"
                  onClick={() => {
                    setVideoLink('');
                    setVimeoThumbnail(null);
                    setIsLoadingVimeoThumbnail(false);
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                  aria-label={t('exercises.addExercise.clearVideoLink')}
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            {(() => {
              const { id, type } = extractVideoId(videoLink);
              if (id && type === 'youtube') {
                return (
                  <div className="mt-2">
                    <a
                      href={videoLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block"
                    >
                      <img
                        src={`https://img.youtube.com/vi/${id}/maxresdefault.jpg`}
                        alt="Video thumbnail"
                        className="w-full rounded-md border border-border"
                        onError={(e) => {
                          // Fallback to hqdefault if maxresdefault fails
                          const target = e.target as HTMLImageElement;
                          target.src = `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
                        }}
                      />
                    </a>
                  </div>
                );
              }
              if (id && type === 'vimeo') {
                if (isLoadingVimeoThumbnail) {
                  return (
                    <div className="mt-2">
                      <div className="w-full aspect-video rounded-md border border-border bg-muted flex items-center justify-center">
                        <Spinner className="h-4 w-4" />
                      </div>
                    </div>
                  );
                }
                
                if (vimeoThumbnail) {
                  return (
                    <div className="mt-2">
                      <a
                        href={videoLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block"
                      >
                        <img
                          src={vimeoThumbnail}
                          alt="Video thumbnail"
                          className="w-full rounded-md border border-border"
                        />
                      </a>
                    </div>
                  );
                }
                
                return (
                  <div className="mt-2">
                    <div className="w-full aspect-video rounded-md border border-border bg-muted flex items-center justify-center">
                      <p className="text-sm text-muted-foreground">
                        {t('exercises.addExercise.vimeoThumbnailPlaceholder')}
                      </p>
                    </div>
                  </div>
                );
              }
              return null;
            })()}
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="category" className="text-sm font-medium">
              {t('exercises.addExercise.category')}<RequiredAsterisk />
              </label>
              <Select
              value={category}
                onValueChange={(value) => {
                setCategory(value);
                if (categoryError) {
                  setCategoryError(null);
                  }
                }}
              >
                <SelectTrigger
                id="category"
                className={cn('w-full', categoryError && 'border-destructive aria-invalid:border-destructive')}
                aria-invalid={!!categoryError}
                >
                  <SelectValue placeholder={t('general.select')} />
                </SelectTrigger>
                <SelectContent>
                {EXERCISE_CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            {categoryError && <p className="text-sm text-destructive">{categoryError}</p>}
            </div>

            <div className="flex flex-col gap-2">
            <label htmlFor="muscle-groups" className="text-sm font-medium">
              {t('exercises.addExercise.muscleGroups')}<RequiredAsterisk />
            </label>
            <MultiAsyncSelect
              options={MUSCLE_GROUPS.map((group) => ({ label: group, value: group }))}
              value={muscleGroups}
              onValueChange={(values) => {
                setMuscleGroups(values);
                if (muscleGroupsError) {
                  setMuscleGroupsError(null);
                }
              }}
              placeholder={t('exercises.addExercise.muscleGroupsPlaceholder')}
              searchPlaceholder={t('exercises.addExercise.searchMuscleGroups')}
              className={cn(muscleGroupsError && 'border-destructive')}
            />
            {muscleGroupsError && <p className="text-sm text-destructive">{muscleGroupsError}</p>}
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="equipment" className="text-sm font-medium">
              {t('exercises.addExercise.equipment')}<RequiredAsterisk />
              </label>
              <Select
              value={equipment}
                onValueChange={(value) => {
                setEquipment(value);
                if (equipmentError) {
                  setEquipmentError(null);
                  }
                }}
              >
                <SelectTrigger
                id="equipment"
                className={cn('w-full', equipmentError && 'border-destructive aria-invalid:border-destructive')}
                aria-invalid={!!equipmentError}
                >
                  <SelectValue placeholder={t('general.select')} />
                </SelectTrigger>
                <SelectContent>
                {EQUIPMENT_OPTIONS.map((eq) => (
                  <SelectItem key={eq} value={eq}>
                    {eq}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            {equipmentError && <p className="text-sm text-destructive">{equipmentError}</p>}
            </div>

            <div className="flex flex-col gap-2">
            <label htmlFor="modality" className="text-sm font-medium">
              {t('exercises.addExercise.modality')}<RequiredAsterisk />
              </label>
            <Select
              value={modality}
              onValueChange={(value) => {
                setModality(value);
                if (modalityError) {
                  setModalityError(null);
                }
              }}
            >
              <SelectTrigger
                id="modality"
                className={cn('w-full', modalityError && 'border-destructive aria-invalid:border-destructive')}
                aria-invalid={!!modalityError}
              >
                <SelectValue placeholder={t('general.select')} />
              </SelectTrigger>
              <SelectContent>
                {MODALITY_OPTIONS.map((mod) => (
                  <SelectItem key={mod} value={mod}>
                    {mod}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {modalityError && <p className="text-sm text-destructive">{modalityError}</p>}
          </div>
        </div>
      </SidePanel>
    </div>
  );
};

export default ExercisesPage;
