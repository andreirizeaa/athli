'use client';

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
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
import { AssignTrainingToClientSidePanel } from '@/components/training/assign-training-to-client-side-panel';
import { SelectClientSidePanel } from '@/components/training/select-client-side-panel';
import { DataGrid, type ColumnDefinition, type FilterDefinition } from '@/components/app/data-grid';
import { EmptyGridState } from '@/components/app/empty-grid-state';
import { ConfirmDeleteDialog } from '@/components/app/confirm-delete-dialog';
import { Spinner } from '@/components/ui/spinner';
import { RequiredAsterisk } from '@/components/ui/required-asterisk';
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
  Trash2,
  Copy,
} from 'lucide-react';

import type { Workout } from '@/components/app/app-shell';
import { getWorkouts, starWorkouts, deleteWorkouts, duplicateWorkout, editWorkout, getWorkoutById } from '@/api/coach/coach-workout-service';
import { WorkoutBuilder } from './workout-builder';
import type { WorkoutProgramPayload } from '@/components/training/workout-schema';
import { toast } from 'sonner';
import { useTrainingData } from '../training-data-context';
import { CreateWorkoutSidePanel } from './components/create-workout-side-panel';


type ColumnId = 'description' | 'type' | 'difficulty' | 'totalExercises' | 'equipment' | 'actions';

const COLUMN_ORDER: ColumnId[] = [
  'description',
  'type',
  'difficulty',
  'totalExercises',
  'equipment',
  'actions',
];

// Column definitions will be created dynamically with translations

const getColumnWidth = (colId: ColumnId, format: 'class' | 'pixel' = 'class'): string => {
  const widths: Record<ColumnId, { class: string; pixel: string }> = {
    description: { class: 'min-w-[250px]', pixel: '250px' },
    type: { class: 'min-w-[140px]', pixel: '140px' },
    difficulty: { class: 'min-w-[140px]', pixel: '140px' },
    totalExercises: { class: 'min-w-[170px]', pixel: '170px' },
    equipment: { class: 'min-w-[200px]', pixel: '200px' },
    actions: { class: 'w-[100px]', pixel: '100px' },
  };

  return widths[colId]?.[format] || (format === 'class' ? 'min-w-[130px]' : '130px');
};

// Helper function to format workout type for display
const formatWorkoutType = (type: string): string => {
  if (!type) return '-';
  // Convert snake_case or kebab-case to Title Case
  return type
    .replace(/_/g, ' ')
    .replace(/-/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

// Helper function to format difficulty for display
const formatDifficulty = (difficulty: string): string => {
  if (!difficulty) return '-';
  // Convert all_levels to "All Levels", intermediate to "Intermediate", etc.
  if (difficulty === 'all_levels') return 'All Levels';
  return difficulty.charAt(0).toUpperCase() + difficulty.slice(1).toLowerCase();
};

const WorkoutsPage = () => {
  const t = useTranslations();
  const router = useRouter();
  const { workouts, isLoadingWorkouts, setWorkouts, refreshWorkouts } = useTrainingData();
  const [selectedWorkouts, setSelectedWorkouts] = useState<Set<string>>(new Set());
  const [starredWorkouts, setStarredWorkouts] = useState<Set<string>>(new Set());
  const [columnOrder] = useState<ColumnId[]>(COLUMN_ORDER);
  const [visibleColumns] = useState<Set<string>>(new Set(COLUMN_ORDER));
  const [filteredCount, setFilteredCount] = useState<number>(0);
  const [itemsPerPage] = useState<number>(25);
  const [isCreateWorkoutOpen, setIsCreateWorkoutOpen] = useState<boolean>(false);
  const [isAssignWorkoutOpen, setIsAssignWorkoutOpen] = useState<boolean>(false);
  const [isAssignIndividualWorkoutOpen, setIsAssignIndividualWorkoutOpen] = useState<boolean>(false);
  const [selectedWorkoutForAssignment, setSelectedWorkoutForAssignment] = useState<Workout | null>(null);
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState<boolean>(false);
  const [workoutToDelete, setWorkoutToDelete] = useState<string | null>(null);
  const [isWorkoutBuilderOpen, setIsWorkoutBuilderOpen] = useState<boolean>(false);
  const [selectedWorkoutForBuilder, setSelectedWorkoutForBuilder] = useState<Workout | null>(null);
  const [selectedWorkoutData, setSelectedWorkoutData] = useState<any>(null);
  const [isLoadingWorkoutData, setIsLoadingWorkoutData] = useState(false);

  // Helper to check if value is empty (null, undefined, empty string, 0, or empty array)
  const isEmpty = (value: any): boolean => {
    if (value === null || value === undefined || value === '' || value === 0) return true;
    if (Array.isArray(value) && value.length === 0) return true;
    return false;
  };

  useEffect(() => {
    // Initialize filteredCount and starred workouts from context data
    setFilteredCount(workouts.length);
    setFilteredCount(workouts.length);
    const starred = new Set(workouts.filter(w => w.isFavourite).map(w => w.id));
    setStarredWorkouts(starred);
  }, [workouts]);

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

  const handleNavigateToWorkout = async (workoutId: string) => {
    const workout = workouts.find(w => w.id === workoutId);
    if (workout) {
      // Open the dialog immediately and show loading inside
      setSelectedWorkoutForBuilder(workout);
      setSelectedWorkoutData(null);
      setIsLoadingWorkoutData(true);
      setIsWorkoutBuilderOpen(true);

      try {
        // Fetch full workout data including workout_data in background
        const fullWorkout = await getWorkoutById(workoutId);
        setSelectedWorkoutData(fullWorkout.workout_data);
      } catch (error) {
        console.error('Failed to fetch workout data:', error);
        toast.error(t('general.error'));
        setIsWorkoutBuilderOpen(false);
      } finally {
        setIsLoadingWorkoutData(false);
      }
    }
  };

  const handleNavigateToAthletes = () => {
    router.push('/athletes');
  };

  const handleOpenAssignWorkout = () => {
    setIsAssignWorkoutOpen(true);
  };

  const handleOpenCreateWorkout = () => {
    setIsCreateWorkoutOpen(true);
  };


  const filteredColumnOrder = columnOrder.filter((colId) => visibleColumns.has(colId) && colId !== 'actions');

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

  const formatDate = (dateStr: string | undefined): string => {
    if (!dateStr) return '-';
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


  const uniqueTypes = Array.from(new Set(workouts.map((w) => w.type))).sort();

  // Create column definitions for DataGrid
  // Add "program" column for sorting (not in filteredColumnOrder so it won't render)
  const allColumns: ColumnDefinition<Workout>[] = [
    {
      id: 'name',
      label: t('library.workoutColumn'),
      icon: <FileText className="size-3" />,
      getSortValue: (row) => row.name.toLowerCase(),
      getSearchValue: (row) => row.name,
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
              `${row.name} ${row.description} ${row.type} ${row.equipment}`,
            renderCell: (row) =>
              isEmpty(row.description) ? (
                <div className="flex items-center h-full min-w-0 w-full">
                  <span className="text-sm truncate block min-w-0 w-full">--</span>
                </div>
              ) : (
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
                <span className="text-sm">{isEmpty(row.type) ? '--' : formatWorkoutType(row.type)}</span>
              </div>
            ),
          };
        case 'difficulty':
          return {
            id: 'difficulty',
            label: t('general.difficulty'),
            icon: <Tag className="size-3" />,
            width: {
              class: getColumnWidth('difficulty', 'class'),
              pixel: getColumnWidth('difficulty', 'pixel'),
            },
            tooltip: t('workouts.columnTooltips.difficultyLevel'),
            getSortValue: (row) => row.difficulty.toLowerCase(),
            renderCell: (row) => (
              <div className="flex items-center h-full">
                <span className="text-sm">{isEmpty(row.difficulty) ? '--' : formatDifficulty(row.difficulty)}</span>
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
                <span className="text-sm">{isEmpty(row.totalExercises) ? '--' : row.totalExercises}</span>
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
            getSortValue: (row) => (Array.isArray(row.equipment) ? row.equipment.join(', ') : row.equipment).toLowerCase(),
            renderCell: (row) =>
              isEmpty(row.equipment) ? (
                <div className="flex items-center h-full min-w-0 w-full">
                  <span className="text-sm truncate block min-w-0 w-full">--</span>
                </div>
              ) : (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center h-full min-w-0 w-full">
                      <span className="text-sm truncate block min-w-0 w-full">
                        {Array.isArray(row.equipment) ? row.equipment.join(', ') : row.equipment}
                      </span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent
                    className="max-w-[200px] break-words"
                    side="top"
                    align="start"
                  >
                    <p>{Array.isArray(row.equipment) ? row.equipment.join(', ') : row.equipment}</p>
                  </TooltipContent>
                </Tooltip>
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

  // Add actions column
  const actionsColumn: ColumnDefinition<Workout> = useMemo(() => ({
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
            setWorkoutToDelete(row.id);
          }}
          className="h-8 w-8 text-muted-foreground hover:text-destructive transition-colors"
          aria-label={`Delete ${row.name}`}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    ),
  }), [t]);

  const columns: ColumnDefinition<Workout>[] = useMemo(() => [...allColumns, actionsColumn], [allColumns, actionsColumn]);

  // Create filter definitions
  const filters: FilterDefinition<Workout>[] = useMemo(() => [
    {
      id: 'type',
      label: t('general.type'),
      icon: <Tag className="size-4" />,
      options: uniqueTypes.map((type) => ({ value: type, label: formatWorkoutType(type) })),
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
  ], [t, uniqueTypes, starredWorkouts]);

  const handleToggleStar = async (workoutId: string, e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation();
    try {
      const isStarred = starredWorkouts.has(workoutId);
      await starWorkouts(workoutId, !isStarred);

      const workout = workouts.find((w) => w.id === workoutId);
      const workoutName = workout?.name || t('library.workout');

      setStarredWorkouts((prev) => {
        const next = new Set(prev);
        if (next.has(workoutId)) {
          next.delete(workoutId);
        } else {
          next.add(workoutId);
        }
        return next;
      });

      if (isStarred) {
        toast.success(t('workouts.detail.toast.unstarredSuccessfully', { name: workoutName }));
      } else {
        toast.success(t('workouts.detail.toast.starredSuccessfully', { name: workoutName }));
      }
    } catch (error) {
      console.error('Failed to star workout:', error);
      toast.error(t('general.error'));
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
      await starWorkouts(Array.from(selectedWorkouts), true);
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

      const selectedCount = selectedWorkouts.size;
      if (selectedCount === 1) {
        const workoutId = Array.from(selectedWorkouts)[0];
        const workout = workouts.find((w) => w.id === workoutId);
        const name = workout?.name || t('library.workout');
        toast.success(t('workouts.detail.toast.starredSuccessfully', { name }));
      } else {
        toast.success(t('workouts.detail.toast.starredBulkSuccessfully', { count: selectedCount }));
      }

      setSelectedWorkouts(new Set());
    } catch (error) {
      console.error('Failed to star workouts:', error);
    }
  };


  const handleBulkDelete = async () => {
    if (selectedWorkouts.size === 0) return;
    try {
      const idsToDelete = Array.from(selectedWorkouts);
      const deleteCount = idsToDelete.length;

      let singleItemName = '';
      if (deleteCount === 1) {
        const item = workouts.find(w => w.id === idsToDelete[0]);
        if (item) singleItemName = item.name;
      }

      await deleteWorkouts(idsToDelete);
      // Reload workouts after deleting
      await refreshWorkouts();

      if (deleteCount === 1 && singleItemName) {
        toast.success(t('workouts.detail.toast.deletedSuccessfully'));
      } else {
        toast.success(t('workouts.detail.toast.deletedBulkSuccessfully', { count: deleteCount }));
      }

      // Clear selection after deleting
      setSelectedWorkouts(new Set());
    } catch (error) {
      console.error('Failed to delete workouts:', error);
      toast.error('Failed to delete workouts');
    }
  };

  const handleConfirmSingleDelete = async () => {
    if (!workoutToDelete) return;
    try {
      const workout = workouts.find(w => w.id === workoutToDelete);
      await deleteWorkouts([workoutToDelete]);
      await refreshWorkouts();

      if (workout) {
        toast.success(t('workouts.detail.toast.deletedSuccessfully'));
      } else {
        toast.success(t('workouts.detail.toast.deletedSuccessfully'));
      }

      setWorkoutToDelete(null);
    } catch (error) {
      console.error('Failed to delete workout:', error);
      toast.error('Failed to delete workout');
    }
  };

  const [isBulkDuplicating, setIsBulkDuplicating] = useState<boolean>(false);

  const handleDuplicateSelected = async () => {
    if (selectedWorkouts.size !== 1) return;
    const workoutId = Array.from(selectedWorkouts)[0];
    const workout = workouts.find((w) => w.id === workoutId);
    if (!workout) return;
    handleDuplicateSelectedPerRow(workoutId, workout.name);
  };

  const handleDuplicateSelectedPerRow = async (workoutId: string, name: string) => {
    setIsBulkDuplicating(true);
    try {
      await duplicateWorkout(workoutId);
      // Reload workouts to show the duplicated one
      await refreshWorkouts();
      setSelectedWorkouts(new Set());
      toast.success(t('workouts.detail.toast.duplicatedSuccessfully', { name: name }));
    } catch (error) {
      console.error('Failed to duplicate workout:', error);
    } finally {
      setIsBulkDuplicating(false);
    }
  };

  // Create first column renderer
  const renderFirstColumn = useCallback((workout: Workout, isSelected: boolean) => {
    const isStarred = starredWorkouts.has(workout.id);
    return (
      <div className="flex items-center gap-3 h-full w-full">
        <div className="flex items-center justify-center h-full" data-no-row-link="true">
          <Checkbox checked={isSelected} onCheckedChange={() => handleToggleWorkout(workout.id)} />
        </div>
        <span className="text-sm truncate flex-1 min-w-0">{workout.name}</span>
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
  }, [starredWorkouts, handleToggleWorkout, handleToggleStar, handleStarKeyDown, t]);

  // Create first column header with sorting
  const renderFirstColumnHeader = useCallback(({
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
  }, [t]);

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
        data={workouts}
        columns={columns}
        getRowId={(row) => row.id}
        gridKey="workouts"
        itemsPerPage={itemsPerPage}
        onFilteredDataChange={setFilteredCount}
        enableSearch={true}
        searchPlaceholder={t('library.searchPlaceholder')}
        filters={filters}
        enableEditColumns={true}
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
                      {t('general.clearSelected', { count: selectedWorkouts.size })}
                    </span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{t('workouts.actions.clearSelected')}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            {/* RESTORED Duplicate Selected */}
            {selectedWorkouts.size === 1 && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      onClick={handleDuplicateSelected}
                      className="gap-2"
                      disabled={isBulkDuplicating}
                      aria-label={t('workouts.actions.duplicateAria')}
                    >
                      {isBulkDuplicating ? <Spinner className="size-4" /> : <Copy className="size-4" />}
                      <span>{t('workouts.actions.duplicate')}</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{t('workouts.actions.duplicate')}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
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
                    onClick={() => setIsBulkDeleteOpen(true)}
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
        firstColumnId="name"
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
        count={selectedWorkouts.size}
        itemType={t('workouts.title').toLowerCase()}
      />

      <ConfirmDeleteDialog
        open={workoutToDelete !== null}
        onOpenChange={(open) => !open && setWorkoutToDelete(null)}
        onConfirm={handleConfirmSingleDelete}
        itemName={workouts.find(w => w.id === workoutToDelete)?.name}
        itemType="workout"
      />

      <CreateWorkoutSidePanel
        open={isCreateWorkoutOpen}
        onOpenChange={setIsCreateWorkoutOpen}
      />
      <SelectClientSidePanel
        open={isAssignWorkoutOpen}
        onOpenChange={setIsAssignWorkoutOpen}
        title={t('library.assignWorkout')}
      />
      <AssignTrainingToClientSidePanel
        open={isAssignIndividualWorkoutOpen}
        onOpenChange={(open) => {
          setIsAssignIndividualWorkoutOpen(open);
          if (!open) {
            setSelectedWorkoutForAssignment(null);
          }
        }}
        selectedItem={selectedWorkoutForAssignment ? {
          type: 'workout',
          id: selectedWorkoutForAssignment.id,
          name: selectedWorkoutForAssignment.name
        } : null}
      />

      {selectedWorkoutForBuilder && (
        <WorkoutBuilder
          open={isWorkoutBuilderOpen}
          onOpenChange={setIsWorkoutBuilderOpen}
          initialData={selectedWorkoutData}
          isLoadingInitialData={isLoadingWorkoutData}
          meta={{
            title: selectedWorkoutForBuilder.name,
            description: selectedWorkoutForBuilder.description,
            type: selectedWorkoutForBuilder.type,
            difficulty: selectedWorkoutForBuilder.difficulty,
          }}
          onSaveSuccess={async (payload: WorkoutProgramPayload) => {
            if (selectedWorkoutForBuilder?.id) {
              try {
                await editWorkout(selectedWorkoutForBuilder.id, payload);
                await refreshWorkouts();
                toast.success('Workout updated successfully');
                setIsWorkoutBuilderOpen(false);
              } catch (error) {
                console.error('Failed to update workout:', error);
                toast.error('Failed to update workout');
              }
            }
          }}
        />
      )}
    </div>
  );
};

export default WorkoutsPage;
