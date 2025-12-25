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
import { AssignAthletesList } from '@/components/app/assign-athletes-list';
import { DataGrid, type ColumnDefinition, type FilterDefinition } from '@/components/app/data-grid';
import { EmptyGridState } from '@/components/app/empty-grid-state';
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
  Archive,
  Trash2,
  Copy,
} from 'lucide-react';

import type { Program } from '@/components/app/app-shell';
import { mockPrograms } from '@/components/app/app-shell';
import { starPrograms, archivePrograms, deletePrograms, duplicateProgram } from '@/lib/api/coach/coach-program-service';

type ColumnId = 'description' | 'type' | 'length' | 'totalExercises' | 'equipment' | 'created';

const COLUMN_ORDER: ColumnId[] = [
  'description',
  'type',
  'length',
  'totalExercises',
  'equipment',
  'created',
];

const PROGRAM_COLUMN_DEFINITIONS = [
  { id: 'description', label: 'Description', icon: <FileText className="size-3" /> },
  { id: 'type', label: 'Type', icon: <Tag className="size-3" /> },
  { id: 'length', label: 'Length', icon: <Clock className="size-3" /> },
  { id: 'totalExercises', label: 'Total Exercises', icon: <Hash className="size-3" /> },
  { id: 'equipment', label: 'Equipment', icon: <Wrench className="size-3" /> },
  { id: 'created', label: 'Created', icon: <Calendar className="size-3" /> },
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
    created: { class: 'min-w-[150px]', pixel: '150px' },
  };

  return widths[colId]?.[format] || (format === 'class' ? 'min-w-[130px]' : '130px');
};

const ProgramsPage = () => {
  const t = useTranslations();
  const router = useRouter();
  const [selectedPrograms, setSelectedPrograms] = useState<Set<string>>(new Set());
  const [starredPrograms, setStarredPrograms] = useState<Set<string>>(new Set());
  const [programs, setPrograms] = useState<Program[]>(mockPrograms);
  const [columnOrder] = useState<ColumnId[]>(COLUMN_ORDER);
  const [visibleColumns] = useState<Set<string>>(new Set(COLUMN_ORDER));
  const [filteredCount, setFilteredCount] = useState<number>(mockPrograms.length);
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
  const [isAssignIndividualProgramOpen, setIsAssignIndividualProgramOpen] = useState<boolean>(false);
  const [selectedProgramForAssignment, setSelectedProgramForAssignment] = useState<Program | null>(null);
  const [isNavigating, setIsNavigating] = useState<boolean>(false);

  const handleToggleProgram = (programId: string) => {
    setSelectedPrograms((prev) => {
      const next = new Set(prev);
      if (next.has(programId)) {
        next.delete(programId);
      } else {
        next.add(programId);
      }
      return next;
    });
  };

  const handleNavigateToProgram = (programId: string) => {
    router.push(`/training/programs/${programId}/edit`);
  };

  const handleNavigateToAthletes = () => {
    router.push('/athletes');
  };

  const handleOpenAssignProgram = () => {
    setIsAssignProgramOpen(true);
  };

  const handleToggleStar = async (programId: string, e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation();
    try {
      await starPrograms(programId);
      setStarredPrograms((prev) => {
        const next = new Set(prev);
        if (next.has(programId)) {
          next.delete(programId);
        } else {
          next.add(programId);
        }
        return next;
      });
    } catch (error) {
      // Error handling - could show toast here
      console.error('Failed to star program:', error);
    }
  };

  const handleStarKeyDown = (programId: string, e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      e.stopPropagation();
      handleToggleStar(programId, e);
    }
  };

  const handleClearSelected = () => {
    setSelectedPrograms(new Set());
  };

  const handleStarSelected = async () => {
    if (selectedPrograms.size === 0) return;
    try {
      await starPrograms(Array.from(selectedPrograms));
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

  const handleArchiveSelected = async () => {
    if (selectedPrograms.size === 0) return;
    try {
      await archivePrograms(Array.from(selectedPrograms));
      // Clear selection after archiving
      setSelectedPrograms(new Set());
    } catch (error) {
      console.error('Failed to archive programs:', error);
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedPrograms.size === 0) return;
    try {
      await deletePrograms(Array.from(selectedPrograms));
      // Clear selection after deleting
      setSelectedPrograms(new Set());
    } catch (error) {
      console.error('Failed to delete programs:', error);
    }
  };

  const handleDuplicateSelected = async () => {
    if (selectedPrograms.size !== 1) return;
    const programId = Array.from(selectedPrograms)[0];
    const program = programs.find((p) => p.id === programId);
    if (!program) return;
    try {
      const duplicatedProgram = await duplicateProgram(programId, program);
      // Add the duplicated program to the list
      setPrograms((prev) => [...prev, duplicatedProgram]);
      // Clear selection after duplicating
      setSelectedPrograms(new Set());
    } catch (error) {
      console.error('Failed to duplicate program:', error);
    }
  };

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

  const handleCreateProgramContinue = () => {
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

    const meta = {
      name: newProgramName.trim(),
      type: newProgramType,
      difficulty: newProgramDifficulty,
      weeks: newProgramWeeks,
      description: newProgramDescription.trim(),
    };

    // Set localStorage synchronously before navigation
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem('oneninety_new_program_meta', JSON.stringify(meta));
        // Set access flag for program builder
        window.localStorage.setItem('oneninety_program_builder_access', 'true');
      } catch {
        // Ignore storage errors
      }
    }

    // Close side panel
    setIsCreateProgramOpen(false);

    // Navigate immediately - localStorage is synchronous so it's already set
    router.push('/training/programs/new');
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

  const uniqueTypes = Array.from(new Set(programs.map((w) => w.type))).sort();
  const uniqueLengths = Array.from(new Set(programs.map((w) => w.length))).sort((a, b) => {
    const aWeeks = parseInt(a.split(' ')[0]);
    const bWeeks = parseInt(b.split(' ')[0]);
    if (isNaN(aWeeks) || isNaN(bWeeks)) return a.localeCompare(b);
    return aWeeks - bWeeks;
  });

  // Create column definitions for DataGrid
  // Add "program" column for sorting (not in filteredColumnOrder so it won't render)
  const allColumns: ColumnDefinition<Program>[] = [
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
            tooltip: t('programs.columnTooltips.type'),
            getSortValue: (row) => row.type.toLowerCase(),
            renderCell: (row) => (
              <div className="flex items-center h-full">
                <span className="text-sm">{row.type}</span>
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
                <span className="text-sm">{row.length}</span>
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
            tooltip: t('programs.columnTooltips.equipment'),
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
            tooltip: t('programs.columnTooltips.created'),
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
      id: 'type',
      label: t('programs.filters.type'),
      icon: <Tag className="size-4" />,
      options: uniqueTypes.map((type) => ({ value: type, label: type })),
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
  ];

  // Create first column renderer
  const renderFirstColumn = (program: Program, isSelected: boolean) => {
    const isStarred = starredPrograms.has(program.id);
    return (
      <div className="flex items-center gap-3 h-full w-full">
        <div className="flex items-center justify-center h-full" data-no-row-link="true">
          <Checkbox checked={isSelected} onCheckedChange={() => handleToggleProgram(program.id)} />
        </div>
        <span className="text-sm truncate flex-1 min-w-0">{program.program}</span>
        <div className="flex items-center justify-end flex-shrink-0 gap-1" data-no-row-link="true">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedProgramForAssignment(program);
                    setIsAssignIndividualProgramOpen(true);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      e.stopPropagation();
                      setSelectedProgramForAssignment(program);
                      setIsAssignIndividualProgramOpen(true);
                    }
                  }}
                  className="p-1 rounded text-foreground hover:text-primary hover:bg-accent transition-colors"
                  aria-label={t('programs.actions.assignProgramToClient')}
                >
                  <User className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{t('programs.actions.assignProgramToClient')}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={(e) => handleToggleStar(program.id, e)}
                  onKeyDown={(e) => handleStarKeyDown(program.id, e)}
                  className="p-1 rounded text-foreground hover:text-primary hover:bg-accent transition-colors"
                  aria-label={t('programs.actions.starProgram')}
                >
                  {isStarred ? (
                    <Star className="h-4 w-4 fill-primary text-primary" />
                  ) : (
                    <Star className="h-4 w-4" />
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{t('programs.actions.starProgram')}</p>
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
  };

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
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    onClick={handleClearSelected}
                    className="gap-2"
                    aria-label={t('programs.actions.clearSelectedAria')}
                  >
                    <X className="size-4" />
                    <span>
                      Clear {selectedPrograms.size} selected
                    </span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{t('programs.actions.clearSelected')}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            {selectedPrograms.size === 1 && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      onClick={handleDuplicateSelected}
                      className="gap-2"
                      aria-label={t('programs.actions.duplicateAria')}
                    >
                      <Copy className="size-4" />
                      <span>{t('programs.actions.duplicate')}</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{t('programs.actions.duplicate')}</p>
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
                    aria-label={t('programs.actions.starSelectedAria')}
                  >
                    <Star className="size-4" />
                    <span>{t('programs.actions.starSelected')}</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{t('programs.actions.starSelected')}</p>
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
                    aria-label={t('programs.actions.archiveSelectedAria')}
                  >
                    <Archive className="size-4" />
                    <span>{t('programs.actions.archiveSelected')}</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{t('programs.actions.archiveSelected')}</p>
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
                    aria-label={t('programs.actions.deleteSelectedAria')}
                  >
                    <Trash2 className="size-4" />
                    <span>{t('programs.actions.deleteSelected')}</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{t('programs.actions.deleteSelected')}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
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
      <SidePanel
        open={isAssignProgramOpen}
        onOpenChange={setIsAssignProgramOpen}
        title={t('programs.actions.assignProgram')}
      >
        <AssignAthletesList
          onAthleteSelected={(athleteId) => {
            setIsAssignProgramOpen(false);
            if (athleteId) {
              if (selectedPrograms.size > 0) {
                // For bulk assign, navigate with preselected program
                const firstProgramId = Array.from(selectedPrograms)[0];
                const program = programs.find((p) => p.id === firstProgramId);
                if (program) {
                  router.push(
                    `/athletes/${athleteId}/training-calendar?programId=${program.id}&programName=${encodeURIComponent(program.program)}&openModal=true`
                  );
                }
              } else {
                // Generic assign - just open the program modal without preselection
                router.push(
                  `/athletes/${athleteId}/training-calendar?openModal=true&modalType=program`
                );
              }
            }
          }}
        />
      </SidePanel>
      <SidePanel
        open={isAssignIndividualProgramOpen}
        onOpenChange={(open) => {
          setIsAssignIndividualProgramOpen(open);
          if (!open) {
            setSelectedProgramForAssignment(null);
          }
        }}
        title={selectedProgramForAssignment ? t('programs.assigning.title', { name: selectedProgramForAssignment.program }) : t('programs.assigning.titleGeneric')}
      >
        {selectedProgramForAssignment && (
          <AssignAthletesList
            navigateOnSelect={false}
            onAthleteSelected={(athleteId) => {
              if (athleteId) {
                setIsAssignIndividualProgramOpen(false);
                router.push(
                  `/athletes/${athleteId}/training-calendar?programId=${selectedProgramForAssignment.id}&programName=${encodeURIComponent(selectedProgramForAssignment.program)}&openModal=true`
                );
              }
            }}
          />
        )}
      </SidePanel>
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
          <div className="flex w-full justify-start gap-2">
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
              className={cn(isNavigating && 'min-w-[120px] justify-center')}
            >
              {isNavigating ? <Spinner className="h-4 w-4" /> : t('programs.addProgram.continue')}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleCloseCreateProgram}
              aria-label={t('programs.addProgram.cancelAria')}
            >
              {t('programs.addProgram.cancel')}
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
              {t('programs.addProgram.description')} <span className="text-muted-foreground font-normal">{t('programs.addProgram.descriptionOptional')}</span>
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
