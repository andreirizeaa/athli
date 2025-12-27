'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
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
import { DataGrid, type ColumnDefinition, type FilterDefinition } from '@/components/app/data-grid';
import { EmptyGridState } from '@/components/app/empty-grid-state';
import { ConfirmDeleteDialog } from '@/components/app/confirm-delete-dialog';
import { cn } from '@/lib/general/utils';
import { exportToCSV } from '@/lib/general/csv-export';
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
  HelpCircle,
  Download,
  Settings,
  User,
  Star,
  Archive,
  Trash2,
} from 'lucide-react';

import type { Program } from '@/components/app/app-shell';
import { starPrograms, archivePrograms, deletePrograms } from '@/api/coach/coach-program-service';
import { getExercises, starExercises, archiveExercises, deleteExercises as deleteExercisesService, createExercise, editExercise, type Exercise } from '@/api/coach/coach-exercise-service';
import { AddExerciseSidePanel } from './add-exercise-side-panel';
import { EditExerciseSidePanel } from './edit-exercise-side-panel';
import { useTrainingData } from '../training-data-context';

type ColumnId = 'category' | 'muscleGroup' | 'modality' | 'equipment' | 'actions';

const COLUMN_ORDER: ColumnId[] = [
  'category',
  'muscleGroup',
  'modality',
  'equipment',
  'actions',
];
const filteredColumnOrder = COLUMN_ORDER.filter((colId) => colId !== 'actions');


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


const getColumnWidth = (colId: ColumnId, format: 'class' | 'pixel' = 'class'): string => {
  const widths: Record<ColumnId, { class: string; pixel: string }> = {
    category: { class: 'min-w-[140px]', pixel: '140px' },
    muscleGroup: { class: 'min-w-[150px]', pixel: '150px' },
    modality: { class: 'min-w-[140px]', pixel: '140px' },
    equipment: { class: 'min-w-[200px]', pixel: '200px' },
    actions: { class: 'w-[100px]', pixel: '100px' },
  };

  return widths[colId]?.[format] || (format === 'class' ? 'min-w-[130px]' : '130px');
};

const ExercisesPage = () => {
  const t = useTranslations();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { exercises: contextExercises, isLoadingExercises, refreshExercises } = useTrainingData();
  const [selectedExercises, setSelectedExercises] = useState<Set<string>>(new Set());
  const [starredExercises, setStarredExercises] = useState<Set<string>>(new Set());
  const [exercises, setExercises] = useState<Program[]>([]);
  const [columnOrder] = useState<ColumnId[]>(COLUMN_ORDER);
  const [visibleColumns] = useState<Set<string>>(new Set(COLUMN_ORDER));
  const [filteredCount, setFilteredCount] = useState<number>(0);
  const itemsPerPage = 25;
  const [isCreateExerciseOpen, setIsCreateExerciseOpen] = useState<boolean>(false);
  const [isEditExerciseOpen, setIsEditExerciseOpen] = useState<boolean>(false);
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);
  const [isAssignExerciseOpen, setIsAssignExerciseOpen] = useState<boolean>(false);
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState<boolean>(false);
  const [exerciseToDelete, setExerciseToDelete] = useState<string | null>(null);
  const [isAssignIndividualExerciseOpen, setIsAssignIndividualExerciseOpen] = useState<boolean>(false);
  const [selectedExerciseForAssignment, setSelectedExerciseForAssignment] = useState<Program | null>(null);

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

  const handleNavigateToExercise = async (exerciseId: string) => {
    try {
      const fetchedExercises = await getExercises();
      const exercise = fetchedExercises.find((ex) => ex.id === exerciseId);
      if (exercise) {
        setEditingExercise(exercise);
        setIsEditExerciseOpen(true);
      }
    } catch (error) {
      console.error('Failed to load exercise:', error);
    }
  };

  const handleNavigateToAthletes = () => {
    router.push('/athletes');
  };

  const handleOpenAssignExercise = () => {
    setIsAssignExerciseOpen(true);
  };

  // Map Exercise type from context to Program type for compatibility
  useEffect(() => {
    const mappedExercises: Program[] = contextExercises.map((ex) => ({
      id: ex.id,
      program: ex.name,
      description: ex.description || '',
      type: ex.category || '', // Map category to type for compatibility
      length: '', // Not used for exercises
      totalExercises: 0, // Not used for exercises
      equipment: ex.equipment || '',
      created: ex.created_at,
      category: ex.category || '',
      muscleGroup: (ex.muscle_group || []).join(', '), // Convert array to string for display
      muscleGroups: ex.muscle_group || [], // Keep array for filtering
      modality: ex.modality || '',
      videoLink: ex.video_link || '',
    }));
    setExercises(mappedExercises);
  }, [contextExercises]);

  // Handle exerciseId from URL params (e.g., from search)
  useEffect(() => {
    const exerciseId = searchParams.get('exerciseId');
    if (exerciseId && exercises.length > 0) {
      // Check if exercise exists
      const exercise = exercises.find((ex) => ex.id === exerciseId);
      if (exercise && editingExercise?.id !== exerciseId) {
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
  }, [searchParams, exercises, editingExercise, router]);

  const handleToggleStar = async (exerciseId: string, e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation();
    try {
      await starExercises(exerciseId, !starredExercises.has(exerciseId));
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
      await starExercises(Array.from(selectedExercises), true);
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
      await archiveExercises(Array.from(selectedExercises), true);
      // Refresh exercises after archiving
      await refreshExercises();
      // Clear selection after archiving
      setSelectedExercises(new Set());
    } catch (error) {
      console.error('Failed to archive exercises:', error);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedExercises.size === 0) return;
    try {
      await deleteExercisesService(Array.from(selectedExercises));
      // Refresh exercises after deleting
      await refreshExercises();
      // Clear selection after deleting
      setSelectedExercises(new Set());
    } catch (error) {
      console.error('Failed to delete exercises:', error);
    }
  };

  const handleConfirmSingleDelete = async () => {
    if (!exerciseToDelete) return;
    try {
      await deleteExercisesService([exerciseToDelete]);
      await refreshExercises();
      setExerciseToDelete(null);
    } catch (error) {
      console.error('Failed to delete exercise:', error);
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
    }));
    exportToCSV(exportData, 'selected-exercises.csv');
  };

  const handleOpenCreateExercise = () => {
    setIsCreateExerciseOpen(true);
  };

  const handleSaveExercise = async () => {
    await refreshExercises();
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

  const filteredColumnOrder = columnOrder.filter((colId) => visibleColumns.has(colId) && colId !== 'actions');

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

  // Add actions column
  const actionsColumn: ColumnDefinition<Program> = {
    id: 'actions',
    label: '',
    sortable: false,
    width: { class: 'w-[100px]', pixel: '100px' },
    renderCell: (row) => (
      <div className="flex items-center justify-end w-full" data-no-row-link="true">
        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => {
            e.stopPropagation();
            setExerciseToDelete(row.id);
          }}
          className="h-8 w-8 text-muted-foreground hover:text-destructive transition-colors"
          aria-label={`Delete ${row.program}`}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    ),
  };

  const columns: ColumnDefinition<Program>[] = [...allColumns, actionsColumn];

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
                    onClick={() => setIsBulkDeleteOpen(true)}
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

      <ConfirmDeleteDialog
        open={isBulkDeleteOpen}
        onOpenChange={setIsBulkDeleteOpen}
        onConfirm={handleBulkDelete}
        count={selectedExercises.size}
        itemType={t('exercises.title').toLowerCase()}
      />

      <ConfirmDeleteDialog
        open={exerciseToDelete !== null}
        onOpenChange={(open) => !open && setExerciseToDelete(null)}
        onConfirm={handleConfirmSingleDelete}
        itemName={exercises.find(e => e.id === exerciseToDelete)?.program}
        itemType="exercise"
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
      <AddExerciseSidePanel
        open={isCreateExerciseOpen}
        onOpenChange={(open) => {
          setIsCreateExerciseOpen(open);
        }}
        onSave={handleSaveExercise}
      />
      <EditExerciseSidePanel
        open={isEditExerciseOpen}
        onOpenChange={(open) => {
          setIsEditExerciseOpen(open);
          if (!open) {
            setEditingExercise(null);
          }
        }}
        exercise={editingExercise}
        onSave={handleSaveExercise}
      />
    </div>
  );
};

export default ExercisesPage;
