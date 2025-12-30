'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
import { ButtonGroup, ButtonGroupSeparator } from '@/components/ui/button-group';
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
  Download,
  Settings,
  User,
  Star,
  Trash2,
  Copy,
} from 'lucide-react';

import type { Program } from '@/components/app/app-shell';
import { getPrograms, starPrograms, deletePrograms, duplicateProgram, createProgram, getProgramById } from '@/api/coach/coach-program-service';
import { toast } from 'sonner';
import { useTrainingData } from '../training-data-context';
import { ProgramNameCell } from './components/program-name-cell';

type ColumnId = 'description' | 'type' | 'length' | 'totalExercises' | 'equipment' | 'actions';

const COLUMN_ORDER: ColumnId[] = [
  'description',
  'type',
  'length',
  'totalExercises',
  'equipment',
  'actions',
];

const PROGRAM_COLUMN_DEFINITIONS = [
  { id: 'description', label: 'Description', icon: <FileText className="size-3" /> },
  { id: 'type', label: 'Type', icon: <Tag className="size-3" /> },
  { id: 'length', label: 'Length', icon: <Clock className="size-3" /> },
  { id: 'totalExercises', label: 'Total Exercises', icon: <Hash className="size-3" /> },
  { id: 'equipment', label: 'Equipment', icon: <Wrench className="size-3" /> },
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

const getColumnWidth = (colId: ColumnId, format: 'class' | 'pixel' = 'class'): string => {
  const widths: Record<ColumnId, { class: string; pixel: string }> = {
    description: { class: 'min-w-[250px]', pixel: '250px' },
    type: { class: 'min-w-[140px]', pixel: '140px' },
    length: { class: 'min-w-[130px]', pixel: '130px' },
    totalExercises: { class: 'min-w-[170px]', pixel: '170px' },
    equipment: { class: 'min-w-[200px]', pixel: '200px' },
    actions: { class: 'w-[100px]', pixel: '100px' },
  };

  return widths[colId]?.[format] || (format === 'class' ? 'min-w-[130px]' : '130px');
};

// Helper to check if value is empty (null, undefined, empty string, 0, or empty array)
const isEmpty = (value: any): boolean => {
  if (value === null || value === undefined || value === '' || value === 0) return true;
  if (Array.isArray(value) && value.length === 0) return true;
  return false;
};

// Helper function to format program type for display
const formatProgramType = (type: string): string => {
  if (!type) return '-';
  // Handle common abbreviations and special cases
  const abbreviations: Record<string, string> = {
    hiit: 'HIIT',
    amrap: 'AMRAP',
    crossfit: 'CrossFit',
    emom: 'EMOM',
  };

  if (abbreviations[type.toLowerCase()]) {
    return abbreviations[type.toLowerCase()];
  }

  // Convert snake_case or kebab-case to Title Case
  return type
    .replace(/_/g, ' ')
    .replace(/-/g, ' ')
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

const ProgramsPage = () => {
  const t = useTranslations();
  const router = useRouter();
  const { programs, isLoadingPrograms, setPrograms, refreshPrograms } = useTrainingData();
  const [selectedPrograms, setSelectedPrograms] = useState<Set<string>>(new Set());
  const [starredPrograms, setStarredPrograms] = useState<Set<string>>(new Set());
  const [columnOrder] = useState<ColumnId[]>(COLUMN_ORDER);
  const [visibleColumns] = useState<Set<string>>(new Set(COLUMN_ORDER));
  const [filteredCount, setFilteredCount] = useState<number>(0);
  const itemsPerPage = 25;
  const [isCreateProgramOpen, setIsCreateProgramOpen] = useState<boolean>(false);
  const [newProgramName, setNewProgramName] = useState<string>('');
  const [newProgramType, setNewProgramType] = useState<string>('');
  const [newProgramDifficulty, setNewProgramDifficulty] = useState<string>('all levels');
  const [newProgramWeeks, setNewProgramWeeks] = useState<string>('');
  const [newProgramDescription, setNewProgramDescription] = useState<string>('');
  const [newProgramError, setNewProgramError] = useState<string | null>(null);
  const [newProgramTypeError, setNewProgramTypeError] = useState<string | null>(null);
  const [newProgramDifficultyError, setNewProgramDifficultyError] = useState<string | null>(null);
  const [isAssignProgramOpen, setIsAssignProgramOpen] = useState<boolean>(false);
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState<boolean>(false);
  const [programToDelete, setProgramToDelete] = useState<string | null>(null);
  const [isAssignIndividualProgramOpen, setIsAssignIndividualProgramOpen] = useState<boolean>(false);
  const [selectedProgramForAssignment, setSelectedProgramForAssignment] = useState<Program | null>(null);
  const [isNavigating, setIsNavigating] = useState<boolean>(false);

  useEffect(() => {
    // Initialize filteredCount and starred programs from context data
    setFilteredCount(programs.length);
    const starred = new Set(programs.filter(p => p.isFavourite).map(p => p.id));
    setStarredPrograms(starred);
  }, [programs]);

  const handleToggleProgram = React.useCallback((programId: string) => {
    setSelectedPrograms((prev) => {
      const next = new Set(prev);
      if (next.has(programId)) {
        next.delete(programId);
      } else {
        next.add(programId);
      }
      return next;
    });
  }, []);

  const handleNavigateToProgram = React.useCallback((programId: string) => {
    router.push(`/training/programs/${programId}/edit`);
  }, [router]);

  const handleNavigateToAthletes = () => {
    router.push('/athletes');
  };

  const handleOpenAssignProgram = () => {
    setIsAssignProgramOpen(true);
  };

  const handleOpenAssignIndividualProgram = React.useCallback((program: Program) => {
    setSelectedProgramForAssignment(program);
    setIsAssignIndividualProgramOpen(true);
  }, []);

  const handleToggleStar = React.useCallback(async (programId: string, e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation();
    try {
      const isStarred = starredPrograms.has(programId);
      await starPrograms(programId, !isStarred);

      setStarredPrograms((prev) => {
        const next = new Set(prev);
        if (next.has(programId)) {
          next.delete(programId);
        } else {
          next.add(programId);
        }
        return next;
      });

      if (isStarred) {
        toast.success(t('programs.detail.toast.unstarredSuccessfully', { name: t('programs.program') }));
      } else {
        toast.success(t('programs.detail.toast.starredSuccessfully', { name: t('programs.program') }));
      }
    } catch (error) {
      console.error('Failed to star program:', error);
      toast.error(t('general.error'));
    }
  }, [starredPrograms, t]);

  const handleStarKeyDown = React.useCallback((programId: string, e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      e.stopPropagation();
      handleToggleStar(programId, e);
    }
  }, [handleToggleStar]);

  const handleClearSelected = () => {
    setSelectedPrograms(new Set());
  };

  const handleStarSelected = async () => {
    if (selectedPrograms.size === 0) return;
    try {
      await starPrograms(Array.from(selectedPrograms), true);
      // Update starred state for selected programs
      setStarredPrograms((prev) => {
        const next = new Set(prev);
        selectedPrograms.forEach((id) => {
          if (!next.has(id)) {
            next.add(id);
          }
        });
        return next;
      });
      // Clear selection after starring
      setSelectedPrograms(new Set());
    } catch (error) {
      console.error('Failed to star programs:', error);
    }
  };


  const handleBulkDelete = async () => {
    if (selectedPrograms.size === 0) return;
    try {
      const idsToDelete = Array.from(selectedPrograms);
      const deleteCount = idsToDelete.length;

      let singleItemName = '';
      if (deleteCount === 1) {
        const item = programs.find(p => p.id === idsToDelete[0]);
        if (item) singleItemName = item.program;
      }

      await deletePrograms(idsToDelete);
      // Reload programs after deleting
      await refreshPrograms();

      if (deleteCount === 1 && singleItemName) {
        toast.success(`Successfully deleted ${singleItemName}`);
      } else {
        toast.success(`Successfully deleted ${deleteCount} program${deleteCount === 1 ? '' : 's'}`);
      }

      // Clear selection after deleting
      setSelectedPrograms(new Set());
    } catch (error) {
      console.error('Failed to delete programs:', error);
      toast.error('Failed to delete programs');
    }
  };

  const handleConfirmSingleDelete = async () => {
    if (!programToDelete) return;
    try {
      const program = programs.find(p => p.id === programToDelete);
      await deletePrograms([programToDelete]);
      await refreshPrograms();

      if (program) {
        toast.success(`Successfully deleted ${program.program}`);
      } else {
        toast.success('Successfully deleted program');
      }

      setProgramToDelete(null);
    } catch (error) {
      console.error('Failed to delete program:', error);
      toast.error('Failed to delete program');
    }
  };

  const handleDuplicateSelected = async () => {
    if (selectedPrograms.size !== 1) return;
    const programId = Array.from(selectedPrograms)[0];
    const program = programs.find((p) => p.id === programId);
    if (!program) return;
    handleDuplicateSelectedPerRow(programId, program.program);
  };

  const [isBulkDuplicating, setIsBulkDuplicating] = useState<boolean>(false);

  const handleDuplicateSelectedPerRow = React.useCallback(async (programId: string, name: string) => {
    setIsBulkDuplicating(true);
    try {
      const fullProgram = await getProgramById(programId);
      await createProgram({
        name: fullProgram.program,
        description: fullProgram.description,
        type: fullProgram.type,
        difficulty: fullProgram.program_data.difficulty,
        weeks: fullProgram.program_data.weeks,
        schema: fullProgram.program_data.schema,
        days: fullProgram.program_data.days
      });
      // Reload programs to show the duplicated one
      await refreshPrograms();
      // Clear selection after duplicating
      setSelectedPrograms(new Set());
      toast.success(t('workouts.detail.toast.duplicatedSuccessfully', { name }));
    } catch (error) {
      console.error('Failed to duplicate program:', error);
    } finally {
      setIsBulkDuplicating(false);
    }
  }, [refreshPrograms, t]);

  const resetCreateProgramState = () => {
    setNewProgramName('');
    setNewProgramType('');
    setNewProgramDifficulty('all levels');
    setNewProgramWeeks('');
    setNewProgramDescription('');
    setNewProgramError(null);
    setNewProgramTypeError(null);
    setNewProgramDifficultyError(null);
    setIsNavigating(false);
  };

  const handleOpenCreateProgram = () => {
    resetCreateProgramState();
    setIsCreateProgramOpen(true);
  };

  const handleCloseCreateProgram = () => {
    setIsCreateProgramOpen(false);
  };

  const handleCreateProgramContinue = async () => {
    if (!newProgramName.trim()) {
      setNewProgramError(t('programs.addProgram.programNameRequiredError'));
      return;
    }

    if (!newProgramType) {
      setNewProgramTypeError(t('programs.addProgram.programTypeRequiredError'));
      return;
    }

    if (!newProgramDifficulty) {
      setNewProgramDifficultyError(t('programs.addProgram.difficultyRequiredError'));
      return;
    }

    setIsNavigating(true);

    const programData = {
      name: newProgramName.trim(),
      type: newProgramType,
      difficulty: newProgramDifficulty,
      weeks: newProgramWeeks || '1',
      description: newProgramDescription.trim(),
    };

    try {
      await createProgram(programData);
      toast.success(`Successfully created ${newProgramName}`);

      // Reload programs to show the new one
      await refreshPrograms();

      // Close side panel and reset state
      setIsCreateProgramOpen(false);
      resetCreateProgramState();
    } catch (error) {
      console.error('Failed to create program:', error);
      toast.error(t('programs.builder.saveFailed'));
    } finally {
      setIsNavigating(false);
    }
  };

  const handleProgramRowKeyDown = (
    event: React.KeyboardEvent<HTMLTableRowElement>,
    programId: string
  ) => {
    if (event.key === 'Enter' || event.key === ' ') {
      const targetElement = event.target as HTMLElement;
      if (targetElement.closest('[data-no-row-link="true"]')) {
        return;
      }

      event.preventDefault();
      handleNavigateToProgram(programId);
    }
  };

  const handleProgramRowClick = (
    event: React.MouseEvent<HTMLTableRowElement>,
    programId: string
  ) => {
    const targetElement = event.target as HTMLElement;
    if (targetElement.closest('[data-no-row-link="true"]')) {
      return;
    }

    handleNavigateToProgram(programId);
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

  const filteredColumnOrder = React.useMemo(() =>
    columnOrder.filter((colId) => visibleColumns.has(colId) && colId !== 'actions'),
    [columnOrder, visibleColumns]
  );

  const uniqueTypes = React.useMemo(() => Array.from(new Set(programs.map((w) => w.type))).sort(), [programs]);

  // Create column definitions for DataGrid
  // Add "program" column for sorting (not in filteredColumnOrder so it won't render)
  const allColumns: ColumnDefinition<Program>[] = React.useMemo(() => [
    {
      id: 'program',
      label: t('programs.columns.program'),
      icon: <FileText className="size-3" />,
      getSortValue: (row) => row.program.toLowerCase(),
      getSearchValue: (row) => row.program,
    },
    ...filteredColumnOrder.map((columnId): ColumnDefinition<Program> => {
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
            tooltip: t('programs.columnTooltips.description'),
            getSortValue: (row) => row.description.toLowerCase(),
            getSearchValue: (row) =>
              `${row.program} ${row.description} ${row.type} ${row.equipment}`,
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
            tooltip: t('programs.columnTooltips.type'),
            getSortValue: (row) => row.type.toLowerCase(),
            renderCell: (row) => (
              <div className="flex items-center h-full">
                <span className="text-sm">
                  {isEmpty(row.type) ? '--' : formatProgramType(row.type)}
                </span>
              </div>
            ),
          };
        case 'length':
          return {
            id: 'length',
            label: t('programs.columns.length'),
            icon: <Clock className="size-3" />,
            width: {
              class: getColumnWidth('length', 'class'),
              pixel: getColumnWidth('length', 'pixel'),
            },
            tooltip: t('programs.columnTooltips.length'),
            getSortValue: (row) => {
              const weeks = parseInt(row.length.split(' ')[0]);
              return isNaN(weeks) ? 0 : weeks;
            },
            renderCell: (row) => (
              <div className="flex items-center h-full">
                <span className="text-sm">
                  {isEmpty(row.length) ? '--' : row.length}
                </span>
              </div>
            ),
          };
        case 'totalExercises':
          return {
            id: 'totalExercises',
            label: t('programs.columns.totalExercises'),
            icon: <Hash className="size-3" />,
            width: {
              class: getColumnWidth('totalExercises', 'class'),
              pixel: getColumnWidth('totalExercises', 'pixel'),
            },
            tooltip: t('programs.columnTooltips.totalExercises'),
            getSortValue: (row) => row.totalExercises,
            renderCell: (row) => (
              <div className="flex items-center w-full">
                <span className="text-sm">
                  {isEmpty(row.totalExercises) ? '--' : row.totalExercises}
                </span>
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
            tooltip: t('programs.columnTooltips.equipment'),
            getSortValue: (row) => row.equipment.toLowerCase(),
            renderCell: (row) =>
              isEmpty(row.equipment) ? (
                <div className="flex items-center h-full min-w-0 w-full">
                  <span className="text-sm truncate block min-w-0 w-full">--</span>
                </div>
              ) : (
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
        default:
          return {
            id: columnId,
            label: columnId,
            getSortValue: () => '',
            renderCell: () => null,
          };
      }
    }),
  ], [filteredColumnOrder, t]);

  // Add actions column
  const actionsColumn: ColumnDefinition<Program> = React.useMemo(() => ({
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
            setProgramToDelete(row.id);
          }}
          className="h-8 w-8 text-muted-foreground hover:text-destructive transition-colors"
          aria-label={`Delete ${row.program}`}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    ),
  }), [t]);

  const columns: ColumnDefinition<Program>[] = React.useMemo(() => [...allColumns, actionsColumn], [allColumns, actionsColumn]);

  // Create filter definitions
  const filters: FilterDefinition<Program>[] = React.useMemo(() => [
    {
      id: 'type',
      label: t('programs.filters.type'),
      icon: <Tag className="size-4" />,
      options: uniqueTypes.map((type) => ({ value: type, label: formatProgramType(type) })),
      getFilterValue: (row) => row.type,
    },
    {
      id: 'show',
      label: t('general.show'),
      icon: <Star className="size-4" />,
      options: [
        { value: 'starred', label: t('programs.filters.starred') },
        { value: 'unstarred', label: t('programs.filters.unstarred') },
      ],
      getFilterValue: (row) => (starredPrograms.has(row.id) ? 'starred' : 'unstarred'),
    },
  ], [t, uniqueTypes, starredPrograms]);

  // Create first column renderer
  const renderFirstColumn = React.useCallback((program: Program, isSelected: boolean) => {
    const isStarred = starredPrograms.has(program.id);
    return (
      <ProgramNameCell
        program={program}
        isSelected={isSelected}
        isStarred={isStarred}
        onToggleProgram={handleToggleProgram}
        onAssign={handleOpenAssignIndividualProgram}
        onToggleStar={handleToggleStar}
        onStarKeyDown={handleStarKeyDown}
      />
    );
  }, [starredPrograms, handleToggleProgram, handleOpenAssignIndividualProgram, handleToggleStar, handleStarKeyDown]);

  // Create first column header with sorting
  const renderFirstColumnHeader = React.useCallback(({
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
            key={`select-all-programs-${isAllSelected}`}
            checked={isAllSelected}
            onCheckedChange={onToggleAll}
            aria-label={t('programs.actions.selectAllPrograms')}
          />
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <div className="flex items-center gap-2 cursor-pointer h-full flex-1">
              <FileText className="size-3 text-muted-foreground" />
              <span className="text-xs uppercase text-muted-foreground">{t('programs.columns.program')}</span>
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
              <span className="flex-1">{t('programs.actions.sortAscending')}</span>
              {isAscending && <Check className="ml-2 size-4" />}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onSort('desc')}
              className={cn(isDescending && 'bg-accent')}
            >
              <ArrowDownWideNarrow className="size-4 mr-2" />
              <span className="flex-1">{t('programs.actions.sortDescending')}</span>
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
              {`${filteredCount} ${filteredCount === 1 ? t('programs.program') : t('programs.programPlural')}`}
            </p>
          </div>
          <div>
            <ButtonGroup>
              <Button
                variant="ghost"
                onClick={handleOpenAssignProgram}
                className="gap-2 border border-primary"
                aria-label={t('programs.actions.assignProgram')}
              >
                <UserPlus className="size-4" />
                <span>{t('general.assign')}</span>
              </Button>
              <Button onClick={handleOpenCreateProgram} className="gap-2" aria-label={t('programs.actions.createProgram')}>
                <Plus className="size-4" />
                <span>{t('programs.actions.createProgram')}</span>
              </Button>
            </ButtonGroup>
          </div>
        </div>
      </div>
      <DataGrid
        data={programs}
        columns={columns}
        getRowId={(row) => row.id}
        gridKey="programs"
        itemsPerPage={itemsPerPage}
        onFilteredDataChange={setFilteredCount}
        enableSearch={true}
        searchPlaceholder={t('programs.searchPlaceholder')}
        filters={filters}
        enableEditColumns={true}
        enableRowSelection={true}
        selectedRowIds={selectedPrograms}
        onSelectionChange={setSelectedPrograms}
        onRowClick={(row, event) => {
          const targetElement = event.target as HTMLElement;
          if (targetElement.closest('[data-no-row-link="true"]')) {
            return;
          }
          handleNavigateToProgram(row.id);
        }}
        onRowKeyDown={(row, event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            const targetElement = event.target as HTMLElement;
            if (targetElement.closest('[data-no-row-link="true"]')) {
              return;
            }
            event.preventDefault();
            handleNavigateToProgram(row.id);
          }
        }}
        defaultColumnOrder={COLUMN_ORDER}
        defaultVisibleColumns={COLUMN_ORDER}
        selectionActions={
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              onClick={handleClearSelected}
              className="gap-2"
              aria-label={t('programs.actions.clearSelectedAria')}
              title={t('programs.actions.clearSelected')}
            >
              <X className="size-4" />
              <span>
                {t('general.clearSelected', { count: selectedPrograms.size })}
              </span>
            </Button>
            {/* RESTORED Duplicate Selected */}
            {selectedPrograms.size === 1 && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      onClick={handleDuplicateSelected}
                      className="gap-2"
                      disabled={isBulkDuplicating}
                      aria-label={t('programs.actions.duplicateAria')}
                      title={t('programs.actions.duplicate')}
                    >
                      {isBulkDuplicating ? <Spinner className="size-4" /> : <Copy className="size-4" />}
                      <span>{t('programs.actions.duplicate')}</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{t('programs.actions.duplicate')}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            <Button
              variant="ghost"
              onClick={handleStarSelected}
              className="gap-2"
              aria-label={t('programs.actions.starSelectedAria')}
              title={t('programs.actions.starSelected')}
            >
              <Star className="size-4" />
              <span>{t('programs.actions.starSelected')}</span>
            </Button>
            <Button
              variant="ghost"
              onClick={() => setIsBulkDeleteOpen(true)}
              className="gap-2 text-destructive hover:text-destructive"
              aria-label={t('programs.actions.deleteSelectedAria')}
              title={t('programs.actions.deleteSelected')}
            >
              <Trash2 className="size-4" />
              <span>{t('programs.actions.deleteSelected')}</span>
            </Button>
          </div>
        }
        emptyMessage={t('programs.emptyMessage')}
        emptyState={
          <EmptyGridState
            title={t('programs.emptyState.title')}
            subtitle={t('programs.emptyState.subtitle')}
            action={
              <Button
                onClick={handleOpenCreateProgram}
                aria-label={t('programs.emptyState.startCreatingAria')}
              >
                {t('programs.emptyState.startCreating')}
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

      <ConfirmDeleteDialog
        open={isBulkDeleteOpen}
        onOpenChange={setIsBulkDeleteOpen}
        onConfirm={handleBulkDelete}
        count={selectedPrograms.size}
        itemType={t('programs.title').toLowerCase()}
      />

      <ConfirmDeleteDialog
        open={programToDelete !== null}
        onOpenChange={(open) => !open && setProgramToDelete(null)}
        onConfirm={handleConfirmSingleDelete}
        itemName={programs.find(p => p.id === programToDelete)?.program}
        itemType="program"
      />
      <SelectClientSidePanel
        open={isAssignProgramOpen}
        onOpenChange={setIsAssignProgramOpen}
        title={t('programs.actions.assignProgram')}
      />
      <AssignTrainingToClientSidePanel
        open={isAssignIndividualProgramOpen}
        onOpenChange={(open) => {
          setIsAssignIndividualProgramOpen(open);
          if (!open) {
            setSelectedProgramForAssignment(null);
          }
        }}
        selectedItem={selectedProgramForAssignment ? {
          type: 'program',
          id: selectedProgramForAssignment.id,
          name: selectedProgramForAssignment.program
        } : null}
      />
      <SidePanel
        open={isCreateProgramOpen}
        onOpenChange={(open) => {
          if (!open && !isNavigating) {
            setIsCreateProgramOpen(open);
            resetCreateProgramState();
          }
        }}
        title={t('programs.addProgram.title')}
        footer={
          <div className="flex w-full justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleCloseCreateProgram}
              aria-label={t('programs.addProgram.cancelAria')}
            >
              {t('programs.addProgram.cancel')}
            </Button>
            <Button
              type="button"
              onClick={handleCreateProgramContinue}
              disabled={
                isNavigating ||
                !newProgramName.trim() ||
                !newProgramType ||
                !newProgramDifficulty
              }
              aria-label={t('programs.addProgram.continueAria')}
              className={cn('gap-2', isNavigating && 'min-w-[120px] justify-center')}
            >
              {isNavigating ? <Spinner className="size-4" /> : t('programs.addProgram.continue')}
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <label htmlFor="program-name" className="text-sm font-medium">
                {t('programs.addProgram.programName')}<RequiredAsterisk />
              </label>
              <Input
                id="program-name"
                type="text"
                placeholder={t('programs.addProgram.programNamePlaceholder')}
                value={newProgramName}
                onChange={(event) => {
                  setNewProgramName(event.target.value);
                  if (newProgramError) {
                    setNewProgramError(null);
                  }
                }}
                className="w-full"
                aria-invalid={!!newProgramError}
              />
              {newProgramError && <p className="text-sm text-destructive">{newProgramError}</p>}
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="program-type" className="text-sm font-medium">
                {t('programs.addProgram.type')}<RequiredAsterisk />
              </label>
              <Select
                value={newProgramType}
                onValueChange={(value) => {
                  setNewProgramType(value);
                  if (newProgramTypeError) {
                    setNewProgramTypeError(null);
                  }
                }}
              >
                <SelectTrigger
                  id="program-type"
                  className={cn(
                    'w-full',
                    newProgramTypeError && 'border-destructive aria-invalid:border-destructive'
                  )}
                  aria-invalid={!!newProgramTypeError}
                >
                  <SelectValue placeholder={t('general.select')} />
                </SelectTrigger>
                <SelectContent>
                  {PROGRAM_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {newProgramTypeError && (
                <p className="text-sm text-destructive">{newProgramTypeError}</p>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="program-difficulty" className="text-sm font-medium">
                {t('programs.addProgram.difficulty')}<RequiredAsterisk />
              </label>
              <Select
                value={newProgramDifficulty}
                onValueChange={(value) => {
                  setNewProgramDifficulty(value);
                  if (newProgramDifficultyError) {
                    setNewProgramDifficultyError(null);
                  }
                }}
              >
                <SelectTrigger
                  id="program-difficulty"
                  className={cn(
                    'w-full',
                    newProgramDifficultyError &&
                    'border-destructive aria-invalid:border-destructive'
                  )}
                  aria-invalid={!!newProgramDifficultyError}
                >
                  <SelectValue placeholder={t('general.select')} />
                </SelectTrigger>
                <SelectContent>
                  {PROGRAM_DIFFICULTY_LEVELS.map((level) => (
                    <SelectItem key={level} value={level.toLowerCase()}>
                      {level}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {newProgramDifficultyError && (
                <p className="text-sm text-destructive">{newProgramDifficultyError}</p>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="program-weeks" className="text-sm font-medium">
                {t('programs.addProgram.weeks')}
              </label>
              <Input
                id="program-weeks"
                type="number"
                inputMode="numeric"
                min={1}
                step={1}
                placeholder={t('programs.addProgram.weeksPlaceholder')}
                value={newProgramWeeks}
                onChange={(event) => {
                  const value = event.target.value.replace(/[^0-9]/g, '');
                  setNewProgramWeeks(value);
                }}
                className="w-full"
              />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="program-description" className="text-sm font-medium">
              {t('programs.addProgram.description')}
            </label>
            <Textarea
              id="program-description"
              value={newProgramDescription}
              onChange={(event) => setNewProgramDescription(event.target.value)}
              placeholder={t('programs.addProgram.descriptionPlaceholder')}
              rows={4}
              className="resize-none"
            />
          </div>
        </div>
      </SidePanel>
    </div>
  );
};

export default ProgramsPage;
