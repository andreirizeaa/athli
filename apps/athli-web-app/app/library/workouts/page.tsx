'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
import { ButtonGroup, ButtonGroupSeparator } from '@/components/ui/button-group';
import { Separator } from '@/components/ui/separator';
import { SidePanel } from '@/components/app/side-panel';
import { AssignAthletesList } from '@/components/app/assign-athletes-list';
import { DataGrid, type ColumnDefinition, type FilterDefinition } from '@/components/app/data-grid';
import { EmptyGridState } from '@/components/app/empty-grid-state';
import { Spinner } from '@/components/ui/spinner';
import { RequiredAsterisk } from '@/components/ui/required-asterisk';
import { cn } from '@/lib/utils';
import { exportToCSV } from '@/lib/csv-export';
import { generateWorkoutFromPrompt } from '@/lib/library/workouts/generate-exercise';
import { BasicInformation } from './new/basic-information';
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
  Clock,
  Wrench,
  Calendar,
  Hash,
  UserPlus,
  HelpCircle,
  Sparkles,
  BrainCog,
  Download,
  Settings,
  Star,
  User,
  Archive,
  Trash2,
} from 'lucide-react';

import type { Workout } from '@/components/app/app-shell';
import { mockWorkouts } from '@/components/app/app-shell';
import { starWorkouts, archiveWorkouts, deleteWorkouts } from '@/lib/library/workouts/workouts-service';

type ColumnId = 'description' | 'type' | 'totalExercises' | 'equipment' | 'created';

const COLUMN_ORDER: ColumnId[] = [
  'description',
  'type',
  'totalExercises',
  'equipment',
  'created',
];

// Column definitions will be created dynamically with translations

const getColumnWidth = (colId: ColumnId, format: 'class' | 'pixel' = 'class'): string => {
  const widths: Record<ColumnId, { class: string; pixel: string }> = {
    description: { class: 'min-w-[250px]', pixel: '250px' },
    type: { class: 'min-w-[140px]', pixel: '140px' },
    totalExercises: { class: 'min-w-[170px]', pixel: '170px' },
    equipment: { class: 'min-w-[200px]', pixel: '200px' },
    created: { class: 'min-w-[150px]', pixel: '150px' },
  };

  return widths[colId]?.[format] || (format === 'class' ? 'min-w-[130px]' : '130px');
};

const WorkoutsPage = () => {
  const t = useTranslations();
  const router = useRouter();
  const [selectedWorkouts, setSelectedWorkouts] = useState<Set<string>>(new Set());
  const [starredWorkouts, setStarredWorkouts] = useState<Set<string>>(new Set());
  const [columnOrder] = useState<ColumnId[]>(COLUMN_ORDER);
  const [visibleColumns] = useState<Set<string>>(new Set(COLUMN_ORDER));
  const [filteredCount, setFilteredCount] = useState<number>(mockWorkouts.length);
  const itemsPerPage = 25;
  const [isCreateWorkoutOpen, setIsCreateWorkoutOpen] = useState<boolean>(false);
  const [newWorkoutName, setNewWorkoutName] = useState<string>('');
  const [newWorkoutType, setNewWorkoutType] = useState<string>('');
  const [newDifficulty, setNewDifficulty] = useState<string>('all levels');
  const [newDescription, setNewDescription] = useState<string>('');
  const [newNameError, setNewNameError] = useState<string | null>(null);
  const [newTypeError, setNewTypeError] = useState<string | null>(null);
  const [newDifficultyError, setNewDifficultyError] = useState<string | null>(null);
  const [newSelectedBuilder, setNewSelectedBuilder] = useState<'standard' | 'ai' | null>('ai');
  const [isAssignWorkoutOpen, setIsAssignWorkoutOpen] = useState<boolean>(false);
  const [isAssignIndividualWorkoutOpen, setIsAssignIndividualWorkoutOpen] = useState<boolean>(false);
  const [selectedWorkoutForAssignment, setSelectedWorkoutForAssignment] = useState<Workout | null>(null);
  const [isCreateWorkoutStep2, setIsCreateWorkoutStep2] = useState<boolean>(false);
  const [aiPrompt, setAiPrompt] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isGeneratingStandard, setIsGeneratingStandard] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleToggleWorkout = (workoutId: string) => {
    setSelectedWorkouts((prev) => {
      const next = new Set(prev);
      if (next.has(workoutId)) {
        next.delete(workoutId);
      } else {
        next.add(workoutId);
      }
      return next;
    });
  };

  const handleNavigateToWorkout = (workoutId: string) => {
    router.push(`/library/workouts/${workoutId}/edit/standard`);
  };

  const handleNavigateToAthletes = () => {
    router.push('/athletes');
  };

  const handleOpenAssignWorkout = () => {
    setIsAssignWorkoutOpen(true);
  };

  const resetCreateWorkoutState = () => {
    setNewWorkoutName('');
    setNewWorkoutType('');
    setNewDifficulty('all levels');
    setNewDescription('');
    setNewNameError(null);
    setNewTypeError(null);
    setNewDifficultyError(null);
    setNewSelectedBuilder('ai');
    setIsCreateWorkoutStep2(false);
    setAiPrompt('');
    setSelectedFile(null);
    setIsDragging(false);
    setIsGenerating(false);
    setIsGeneratingStandard(false);
  };

  const handleOpenCreateWorkout = () => {
    resetCreateWorkoutState();
    setIsCreateWorkoutOpen(true);
  };

  const handleCloseCreateWorkout = () => {
    setIsCreateWorkoutOpen(false);
  };

  const handleCreateWorkoutContinue = async () => {
    if (!isCreateWorkoutStep2) {
      // Step 1: Validate and move to step 2 if AI builder selected
      if (!newWorkoutName.trim()) {
        setNewNameError(t('library.workoutNameRequired'));
        return;
      }
      if (!newWorkoutType) {
        setNewTypeError(t('library.workoutTypeRequired'));
        return;
      }
      if (!newDifficulty) {
        setNewDifficultyError(t('library.difficultyRequired'));
        return;
      }
      if (!newSelectedBuilder) {
        return;
      }

      // If AI builder, go to step 2
      if (newSelectedBuilder === 'ai') {
        setIsCreateWorkoutStep2(true);
        return;
      }

      // If standard builder, proceed directly to builder
      setIsGeneratingStandard(true);
      
      const meta = {
        title: newWorkoutName.trim(),
        description: newDescription.trim(),
        type: newWorkoutType.toLowerCase().replace(/\s+/g, '_'),
        difficulty: newDifficulty.toLowerCase().replace(/\s+/g, '_'),
        builder: newSelectedBuilder,
      };

      try {
        window.localStorage.setItem('oneninety_new_workout_meta', JSON.stringify(meta));
        // Set access flag for standard builder
        window.localStorage.setItem('oneninety_workout_builder_access', 'standard');
      } catch {
        // Ignore storage errors
      }

      // Wait 500ms before navigation
      setTimeout(() => {
        const targetPath = '/library/workouts/new/standard';
        router.push(targetPath);
        
        // Keep sidebar open during navigation, close after a brief delay
        setTimeout(() => {
          setIsCreateWorkoutOpen(false);
          setIsGeneratingStandard(false);
        }, 300);
      }, 500);
    } else {
      // Step 2: Generate AI workout and navigate to builder
      setIsGenerating(true);
      const prompt = aiPrompt.trim();

      const meta = {
        title: newWorkoutName.trim(),
        description: prompt,
        type: newWorkoutType.toLowerCase().replace(/\s+/g, '_'),
        difficulty: newDifficulty.toLowerCase().replace(/\s+/g, '_'),
        builder: newSelectedBuilder,
      };

      try {
        window.localStorage.setItem('oneninety_new_workout_meta', JSON.stringify(meta));
      } catch {
        // Ignore storage errors
      }

      // Store prompt and attachments for chat
      let pdfContent: string | null = null;
      if (selectedFile) {
        pdfContent = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            const arrayBuffer = e.target?.result as ArrayBuffer;
            // Convert ArrayBuffer to base64 string
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
      }

      const chatData = {
        prompt,
        pdfAttachment: pdfContent && selectedFile
          ? {
              name: selectedFile.name,
              data: pdfContent,
              type: selectedFile.type,
              size: selectedFile.size,
            }
          : null,
      };

      try {
        window.localStorage.setItem('oneninety_ai_workout_chat', JSON.stringify(chatData));
      } catch {
        // Ignore storage errors
      }

      let generated: any = null;
      try {
        generated = await generateWorkoutFromPrompt(prompt, pdfContent);
        // eslint-disable-next-line no-console
        console.log('AI generated workout', generated);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Failed to generate workout from AI', error);
        setIsGenerating(false);
        return;
      }

      if (generated) {
        try {
          window.localStorage.setItem('oneninety_ai_generated_workout', JSON.stringify(generated));
        } catch {
          // Ignore storage errors
        }
      } else {
        try {
          window.localStorage.removeItem('oneninety_ai_generated_workout');
        } catch {
          // Ignore storage errors
        }
      }

      try {
        // Set access flag for AI builder - ensure it's set before navigation
        window.localStorage.setItem('oneninety_workout_builder_access', 'ai');
        // Force a small delay to ensure localStorage is written
        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch {
        // Ignore storage errors
      }

      // Wait a bit longer before navigation to ensure everything is ready
      setTimeout(() => {
        const targetPath = '/library/workouts/new/ai';
        router.push(targetPath);
        
        // Keep sidebar open during navigation, close after a brief delay
        setTimeout(() => {
          setIsCreateWorkoutOpen(false);
          setIsGenerating(false);
        }, 300);
      }, 600);
    }
  };

  const handleCreateWorkoutBack = () => {
    setIsCreateWorkoutStep2(false);
  };

  const handleFileButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setSelectedFile(file);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Only set isDragging to false if we're leaving the drop zone entirely
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    const validFile = files.find((file) => file.type === 'application/pdf');

    if (validFile) {
      setSelectedFile(validFile);
    }
  };

  const handleUseExample = () => {
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

  const filteredColumnOrder = columnOrder.filter((colId) => visibleColumns.has(colId));

  const handleWorkoutRowKeyDown = (
    event: React.KeyboardEvent<HTMLTableRowElement>,
    workoutId: string
  ) => {
    if (event.key === 'Enter' || event.key === ' ') {
      const targetElement = event.target as HTMLElement;
      if (targetElement.closest('[data-no-row-link="true"]')) {
        return;
      }

      event.preventDefault();
      handleNavigateToWorkout(workoutId);
    }
  };

  const handleWorkoutRowClick = (
    event: React.MouseEvent<HTMLTableRowElement>,
    workoutId: string
  ) => {
    const targetElement = event.target as HTMLElement;
    if (targetElement.closest('[data-no-row-link="true"]')) {
      return;
    }

    handleNavigateToWorkout(workoutId);
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


  const uniqueTypes = Array.from(new Set(mockWorkouts.map((w) => w.type))).sort();

  // Create column definitions for DataGrid
  // Add "program" column for sorting (not in filteredColumnOrder so it won't render)
  const allColumns: ColumnDefinition<Workout>[] = [
    {
      id: 'program',
      label: t('library.workoutColumn'),
      icon: <FileText className="size-3" />,
      getSortValue: (row) => row.program.toLowerCase(),
      getSearchValue: (row) => row.program,
    },
    ...filteredColumnOrder.map((columnId): ColumnDefinition<Workout> => {
      switch (columnId) {
        case 'description':
          return {
            id: 'description',
            label: t('general.description'),
            icon: <FileText className="size-3" />,
            width: {
              class: getColumnWidth('description', 'class'),
              pixel: getColumnWidth('description', 'pixel'),
            },
            tooltip: t('library.briefOverviewWorkout'),
            getSortValue: (row) => row.description.toLowerCase(),
            getSearchValue: (row) =>
              `${row.program} ${row.description} ${row.type} ${row.equipment}`,
            renderCell: (row) => (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center h-full min-w-0 w-full">
                    <span className="text-sm truncate block min-w-0 w-full">{row.description}</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent
                  className="max-w-[250px] break-words"
                  side="top"
                  align="start"
                >
                  <p className="whitespace-pre-wrap">{row.description}</p>
                </TooltipContent>
              </Tooltip>
            ),
          };
        case 'type':
          return {
            id: 'type',
            label: t('general.type'),
            icon: <Tag className="size-3" />,
            width: {
              class: getColumnWidth('type', 'class'),
              pixel: getColumnWidth('type', 'pixel'),
            },
            tooltip: t('library.categoryStyleWorkout'),
            getSortValue: (row) => row.type.toLowerCase(),
            renderCell: (row) => (
              <div className="flex items-center h-full">
                <span className="text-sm">{row.type}</span>
              </div>
            ),
          };
        case 'totalExercises':
          return {
            id: 'totalExercises',
            label: t('library.totalExercises'),
            icon: <Hash className="size-3" />,
            width: {
              class: getColumnWidth('totalExercises', 'class'),
              pixel: getColumnWidth('totalExercises', 'pixel'),
            },
            tooltip: t('library.numberOfExercisesWorkout'),
            getSortValue: (row) => row.totalExercises,
            renderCell: (row) => (
              <div className="flex items-center w-full">
                <span className="text-sm">{row.totalExercises}</span>
              </div>
            ),
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
            tooltip: t('library.equipmentRequiredWorkout'),
            getSortValue: (row) => row.equipment.toLowerCase(),
            renderCell: (row) => (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center h-full min-w-0 w-full">
                    <span className="text-sm truncate block min-w-0 w-full">{row.equipment}</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent
                  className="max-w-[200px] break-words"
                  side="top"
                  align="start"
                >
                  <p>{row.equipment}</p>
                </TooltipContent>
              </Tooltip>
            ),
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
            tooltip: t('library.dateCreatedWorkout'),
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

  const columns: ColumnDefinition<Workout>[] = allColumns;

  // Create filter definitions
  const filters: FilterDefinition<Workout>[] = [
    {
      id: 'type',
      label: t('general.type'),
      icon: <Tag className="size-4" />,
      options: uniqueTypes.map((type) => ({ value: type, label: type })),
      getFilterValue: (row) => row.type,
    },
    {
      id: 'show',
      label: t('general.show'),
      icon: <Star className="size-4" />,
      options: [
        { value: 'starred', label: t('library.starred') },
        { value: 'unstarred', label: t('library.unstarred') },
      ],
      getFilterValue: (row) => (starredWorkouts.has(row.id) ? 'starred' : 'unstarred'),
    },
  ];

  const handleToggleStar = async (workoutId: string, e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation();
    try {
      await starWorkouts(workoutId);
      setStarredWorkouts((prev) => {
        const next = new Set(prev);
        if (next.has(workoutId)) {
          next.delete(workoutId);
        } else {
          next.add(workoutId);
        }
        return next;
      });
    } catch (error) {
      console.error('Failed to star workout:', error);
    }
  };

  const handleStarKeyDown = (workoutId: string, e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      e.stopPropagation();
      handleToggleStar(workoutId, e);
    }
  };

  const handleClearSelected = () => {
    setSelectedWorkouts(new Set());
  };

  const handleStarSelected = async () => {
    if (selectedWorkouts.size === 0) return;
    try {
      await starWorkouts(Array.from(selectedWorkouts));
      // Update starred state for selected workouts
      setStarredWorkouts((prev) => {
        const next = new Set(prev);
        selectedWorkouts.forEach((id) => {
          if (!next.has(id)) {
            next.add(id);
          }
        });
        return next;
      });
      // Clear selection after starring
      setSelectedWorkouts(new Set());
    } catch (error) {
      console.error('Failed to star workouts:', error);
    }
  };

  const handleArchiveSelected = async () => {
    if (selectedWorkouts.size === 0) return;
    try {
      await archiveWorkouts(Array.from(selectedWorkouts));
      // Clear selection after archiving
      setSelectedWorkouts(new Set());
    } catch (error) {
      console.error('Failed to archive workouts:', error);
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedWorkouts.size === 0) return;
    try {
      await deleteWorkouts(Array.from(selectedWorkouts));
      // Clear selection after deleting
      setSelectedWorkouts(new Set());
    } catch (error) {
      console.error('Failed to delete workouts:', error);
    }
  };

  const handleExportSelected = () => {
    if (selectedWorkouts.size === 0) return;
    const selectedWorkoutsData = mockWorkouts.filter((workout) =>
      selectedWorkouts.has(workout.id)
    );
    const exportData = selectedWorkoutsData.map((row) => ({
      Program: row.program,
      Description: row.description,
      Type: row.type,
      'Total Exercises': row.totalExercises,
      Equipment: row.equipment,
      Created: row.created,
    }));
    exportToCSV(exportData, 'selected-workouts.csv');
  };

  // Create first column renderer
  const renderFirstColumn = (workout: Workout, isSelected: boolean) => {
    const isStarred = starredWorkouts.has(workout.id);
    return (
      <div className="flex items-center gap-3 h-full w-full">
        <div className="flex items-center justify-center h-full" data-no-row-link="true">
          <Checkbox checked={isSelected} onCheckedChange={() => handleToggleWorkout(workout.id)} />
        </div>
        <span className="text-sm truncate flex-1 min-w-0">{workout.program}</span>
        <div className="flex items-center justify-end flex-shrink-0 gap-1" data-no-row-link="true">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedWorkoutForAssignment(workout);
                    setIsAssignIndividualWorkoutOpen(true);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      e.stopPropagation();
                      setSelectedWorkoutForAssignment(workout);
                      setIsAssignIndividualWorkoutOpen(true);
                    }
                  }}
                  className="p-1 rounded text-foreground hover:text-primary hover:bg-accent transition-colors"
                  aria-label={t('library.assignWorkoutToClient')}
                >
                  <User className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{t('library.assignWorkoutToClient')}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={(e) => handleToggleStar(workout.id, e)}
                  onKeyDown={(e) => handleStarKeyDown(workout.id, e)}
                  className="p-1 rounded text-foreground hover:text-primary hover:bg-accent transition-colors"
                  aria-label={t('library.starWorkout')}
                >
                  {isStarred ? (
                    <Star className="h-4 w-4 fill-primary text-primary" />
                  ) : (
                    <Star className="h-4 w-4" />
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{t('library.starWorkout')}</p>
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
            key={`select-all-workouts-${isAllSelected}`}
            checked={isAllSelected}
            onCheckedChange={onToggleAll}
            aria-label={t('library.selectAllWorkouts')}
          />
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <div className="flex items-center gap-2 cursor-pointer h-full flex-1">
              <FileText className="size-3 text-muted-foreground" />
              <span className="text-xs uppercase text-muted-foreground">{t('library.workoutColumn')}</span>
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
              <span className="flex-1">{t('library.sortAscending')}</span>
              {isAscending && <Check className="ml-2 size-4" />}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onSort('desc')}
              className={cn(isDescending && 'bg-accent')}
            >
              <ArrowDownWideNarrow className="size-4 mr-2" />
              <span className="flex-1">{t('library.sortDescending')}</span>
              {isDescending && <Check className="ml-2 size-4" />}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  };

  return (
    <div className="h-full w-full flex flex-col">
      <div className="w-full relative">
        <div className="px-4 flex items-center justify-between mb-2 mt-2">
          <div className="flex flex-col">
            <p className="text-sm text-foreground">
              {`${filteredCount} ${filteredCount === 1 ? t('library.workout') : t('library.workoutPlural')}`}
            </p>
          </div>
          <div>
            <ButtonGroup>
              <Button
                variant="ghost"
                onClick={handleOpenAssignWorkout}
                className="gap-2 border border-primary"
                aria-label={t('library.assignWorkout')}
              >
                <UserPlus className="size-4" />
                <span>{t('general.assign')}</span>
              </Button>
              <Button onClick={handleOpenCreateWorkout} className="gap-2" aria-label={t('library.createWorkout')}>
                <Plus className="size-4" />
                <span>{t('library.createWorkout')}</span>
              </Button>
            </ButtonGroup>
          </div>
        </div>
      </div>
      <DataGrid
        data={mockWorkouts}
        columns={columns}
        getRowId={(row) => row.id}
        gridKey="workouts"
        itemsPerPage={itemsPerPage}
        onFilteredDataChange={setFilteredCount}
        enableSearch={true}
        searchPlaceholder={t('library.searchPlaceholder')}
        filters={filters}
        enableEditColumns={true}
        enableExport={true}
        exportFileName="workouts.csv"
        exportDataTransform={(row) => ({
          Program: row.program,
          Description: row.description,
          Type: row.type,
          'Total Exercises': row.totalExercises,
          Equipment: row.equipment,
          Created: row.created,
        })}
        enableRowSelection={true}
        selectedRowIds={selectedWorkouts}
        onSelectionChange={setSelectedWorkouts}
        onRowClick={(row, event) => {
          const targetElement = event.target as HTMLElement;
          if (targetElement.closest('[data-no-row-link="true"]')) {
            return;
          }
          handleNavigateToWorkout(row.id);
        }}
        onRowKeyDown={(row, event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            const targetElement = event.target as HTMLElement;
            if (targetElement.closest('[data-no-row-link="true"]')) {
              return;
            }
            event.preventDefault();
            handleNavigateToWorkout(row.id);
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
                    aria-label={t('workouts.actions.clearSelectedAria')}
                  >
                    <X className="size-4" />
                    <span>
                      Clear {selectedWorkouts.size} selected
                    </span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{t('workouts.actions.clearSelected')}</p>
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
                    aria-label={t('workouts.actions.exportSelectedAria')}
                  >
                    <Download className="size-4" />
                    <span>{t('workouts.actions.export')}</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{t('workouts.actions.export')}</p>
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
                    aria-label={t('workouts.actions.starSelectedAria')}
                  >
                    <Star className="size-4" />
                    <span>{t('workouts.actions.starSelected')}</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{t('workouts.actions.starSelected')}</p>
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
                    aria-label={t('workouts.actions.archiveSelectedAria')}
                  >
                    <Archive className="size-4" />
                    <span>{t('workouts.actions.archiveSelected')}</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{t('workouts.actions.archiveSelected')}</p>
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
                    aria-label={t('workouts.actions.deleteSelectedAria')}
                  >
                    <Trash2 className="size-4" />
                    <span>{t('workouts.actions.deleteSelected')}</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{t('workouts.actions.deleteSelected')}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        }
        emptyMessage={t('library.noWorkoutsFound')}
        emptyState={
          <EmptyGridState
            title={t('workouts.emptyState.title')}
            subtitle={t('workouts.emptyState.subtitle')}
            action={
              <Button
                onClick={handleOpenCreateWorkout}
                aria-label={t('workouts.emptyState.startCreatingAria')}
              >
                {t('workouts.emptyState.startCreating')}
              </Button>
            }
          />
        }
        rowHeight="54px"
        stickyFirstColumn={true}
        firstColumnWidth="320px"
        firstColumnId="program"
        renderFirstColumn={renderFirstColumn}
        renderFirstColumnHeader={renderFirstColumnHeader}
        showPagination={true}
        gridPadding={true}
        compactPagination={true}
      />
      <SidePanel
        open={isCreateWorkoutOpen}
        onOpenChange={(open) => {
          if (!open && !isGenerating && !isGeneratingStandard) {
            setIsCreateWorkoutOpen(open);
            resetCreateWorkoutState();
          }
        }}
        title={t('library.newWorkout')}
        footer={
          <div className="flex w-full justify-start gap-2">
            <Button
              type="button"
              onClick={handleCreateWorkoutContinue}
              disabled={
                isGenerating ||
                isGeneratingStandard ||
                (isCreateWorkoutStep2
                  ? !aiPrompt.trim()
                  : !newWorkoutName.trim() ||
                    !newWorkoutType ||
                    !newDifficulty ||
                    !newSelectedBuilder)
              }
              aria-label={isCreateWorkoutStep2 ? t('library.generateWorkout') : t('general.continue')}
              className={cn(
                ((isCreateWorkoutStep2 && isGenerating) || (!isCreateWorkoutStep2 && isGeneratingStandard)) &&
                  'min-w-[120px] justify-center'
              )}
            >
              {isCreateWorkoutStep2 ? (
                isGenerating ? (
                  <Spinner className="h-4 w-4" />
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    {t('library.generate')}
                  </>
                )
              ) : isGeneratingStandard ? (
                <Spinner className="h-4 w-4" />
              ) : (
                t('general.continue')
              )}
            </Button>
            {isCreateWorkoutStep2 && (
              <Button
                type="button"
                variant="outline"
                onClick={handleCreateWorkoutBack}
                disabled={isGenerating || isGeneratingStandard}
                aria-label={t('library.backToWorkoutDetails')}
              >
                {t('general.back')}
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              onClick={handleCloseCreateWorkout}
              disabled={isGenerating || isGeneratingStandard}
              aria-label={t('library.cancelCreatingWorkout')}
            >
              {t('general.cancel')}
            </Button>
          </div>
        }
      >
        {!isCreateWorkoutStep2 ? (
          <BasicInformation
            workoutName={newWorkoutName}
            setWorkoutName={setNewWorkoutName}
            workoutType={newWorkoutType}
            setWorkoutType={setNewWorkoutType}
            difficulty={newDifficulty}
            setDifficulty={setNewDifficulty}
            description={newDescription}
            setDescription={setNewDescription}
            nameError={newNameError}
            setNameError={setNewNameError}
            typeError={newTypeError}
            setTypeError={setNewTypeError}
            difficultyError={newDifficultyError}
            setDifficultyError={setNewDifficultyError}
            selectedBuilder={newSelectedBuilder}
            setSelectedBuilder={setNewSelectedBuilder}
          />
        ) : (
          <div
            className="flex flex-col h-full relative"
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            {isDragging && (
              <div
                className="absolute inset-0 z-50 bg-background/95 backdrop-blur-sm border-2 border-dashed border-primary flex items-center justify-center pointer-events-auto"
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
              >
                  <div className="flex flex-col items-center gap-4 text-center">
                  <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-primary via-primary/90 to-primary/80 text-primary-foreground">
                    <FileText className="h-8 w-8" />
                  </div>
                  <div>
                    <p className="text-lg font-semibold">{t('library.dropPdfHere')}</p>
                    <p className="text-sm text-muted-foreground">{t('library.pdfFilesOnly')}</p>
                  </div>
                </div>
              </div>
            )}
            <div className="flex flex-col items-center gap-4 flex-shrink-0 pb-4">
              <div className="relative flex items-center justify-center py-8 px-8">
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary via-primary/90 to-primary/80 blur-sm opacity-30 -z-10"></div>
                <div className="relative z-10 inline-flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-primary via-primary/90 to-primary/80 text-primary-foreground shadow-lg">
                  <BrainCog className="h-10 w-10" />
                </div>
              </div>
              <h2 className="text-xl font-semibold text-center">{t('library.oneNinetyAiBuilder')}</h2>
              <p className="text-sm text-foreground text-center max-w-md">
                {t('library.dragDropPdf')}
              </p>
            </div>
            <div className="-mx-4 mb-2">
              <Separator className="w-full" />
            </div>
            <div className="flex-1 overflow-auto">
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 mb-1">
                  <div className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-primary via-primary/90 to-primary/80 text-primary-foreground">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <h3 className="text-sm font-semibold">
                    {t('library.letsBuildWorkout')}<RequiredAsterisk />
                  </h3>
                </div>
                <div className="relative">
                  <Textarea
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    rows={8}
                    className="resize-none text-sm min-h-[200px] pb-12"
                    placeholder={t('library.workoutPromptPlaceholder')}
                  />
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf"
                    onChange={handleFileChange}
                    className="hidden"
                    aria-label={t('library.selectPdfFile')}
                  />
                  <div className="absolute bottom-2 right-2 flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleUseExample}
                      className="h-7 px-3 text-xs"
                      aria-label={t('library.useExample')}
                    >
                      {t('library.useExample')}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleFileButtonClick}
                      className="h-7 px-3 text-xs gap-1.5"
                      aria-label={t('library.selectPdfFile')}
                    >
                      <FileText className="h-3.5 w-3.5" />
                      {t('messages.pdf')}
                    </Button>
                  </div>
                </div>
                {selectedFile && (
                  <div className="flex items-center gap-3 p-3 rounded-lg border bg-background">
                    <div className="flex items-center justify-center h-12 w-12 rounded-md bg-orange-100">
                      <FileText className="h-6 w-6 text-orange-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {selectedFile.name}
                      </p>
                      <p className="text-xs text-muted-foreground">{t('messages.pdf')}</p>
                    </div>
                    <button
                      type="button"
                      onClick={handleRemoveFile}
                      className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                      aria-label={t('library.removePdfFile')}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </SidePanel>
      <SidePanel
        open={isAssignWorkoutOpen}
        onOpenChange={setIsAssignWorkoutOpen}
        title={t('library.assignWorkout')}
      >
        <AssignAthletesList
          onAthleteSelected={(athleteId) => {
            setIsAssignWorkoutOpen(false);
            if (athleteId) {
              if (selectedWorkouts.size > 0) {
                // For bulk assign, navigate with preselected workout
                const firstWorkoutId = Array.from(selectedWorkouts)[0];
                const workout = mockWorkouts.find((w) => w.id === firstWorkoutId);
                if (workout) {
                  router.push(
                    `/athletes/${athleteId}/training-calendar?workoutId=${workout.id}&workoutName=${encodeURIComponent(workout.program)}&openModal=true`
                  );
                }
              } else {
                // Generic assign - just open the workout modal without preselection
                router.push(
                  `/athletes/${athleteId}/training-calendar?openModal=true&modalType=workout`
                );
              }
            }
          }}
        />
      </SidePanel>
      <SidePanel
        open={isAssignIndividualWorkoutOpen}
        onOpenChange={(open) => {
          setIsAssignIndividualWorkoutOpen(open);
          if (!open) {
            setSelectedWorkoutForAssignment(null);
          }
        }}
        title={selectedWorkoutForAssignment ? t('library.assigningWorkout', { name: selectedWorkoutForAssignment.program }) : t('library.assignWorkout')}
      >
        {selectedWorkoutForAssignment && (
          <AssignAthletesList
            navigateOnSelect={false}
            onAthleteSelected={(athleteId) => {
              if (athleteId) {
                setIsAssignIndividualWorkoutOpen(false);
                router.push(
                  `/athletes/${athleteId}/training-calendar?workoutId=${selectedWorkoutForAssignment.id}&workoutName=${encodeURIComponent(selectedWorkoutForAssignment.program)}&openModal=true`
                );
              }
            }}
          />
        )}
      </SidePanel>
    </div>
  );
};

export default WorkoutsPage;
