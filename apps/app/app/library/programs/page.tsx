'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
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
import { cn } from '@/lib/utils';
import DescriptionModal from './description-modal';
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
} from 'lucide-react';

import type { Program } from '@/components/app/app-shell';
import { mockPrograms } from '@/components/app/app-shell';

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
  const router = useRouter();
  const [selectedPrograms, setSelectedPrograms] = useState<Set<string>>(new Set());
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [lengthFilter, setLengthFilter] = useState<string | null>(null);
  const [columnOrder] = useState<ColumnId[]>(COLUMN_ORDER);
  const [visibleColumns] = useState<Set<string>>(new Set(COLUMN_ORDER));
  const [descriptionModalOpen, setDescriptionModalOpen] = useState<boolean>(false);
  const itemsPerPage = 25;
  const [selectedDescription, setSelectedDescription] = useState<{
    description: string;
    programName: string;
  } | null>(null);
  const [isCreateProgramOpen, setIsCreateProgramOpen] = useState<boolean>(false);
  const [newProgramName, setNewProgramName] = useState<string>('');
  const [newProgramType, setNewProgramType] = useState<string>('');
  const [newProgramDifficulty, setNewProgramDifficulty] = useState<string>('all levels');
  const [newProgramWeeks, setNewProgramWeeks] = useState<string>('');
  const [newProgramDescription, setNewProgramDescription] = useState<string>('');
  const [newProgramError, setNewProgramError] = useState<string | null>(null);
  const [newProgramTypeError, setNewProgramTypeError] = useState<string | null>(null);
  const [newProgramDifficultyError, setNewProgramDifficultyError] = useState<string | null>(null);
  const [newProgramBuilder, setNewProgramBuilder] = useState<'standard' | 'ai' | null>('ai');
  const [isAssignProgramOpen, setIsAssignProgramOpen] = useState<boolean>(false);

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
    router.push(`/library/programs/${programId}`);
  };

  const handleNavigateToAthletes = () => {
    router.push('/athletes');
  };

  const handleOpenAssignProgram = () => {
    setIsAssignProgramOpen(true);
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
    setNewProgramBuilder('ai');
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
      setNewProgramError('Program name is required');
      return;
    }

    if (!newProgramType) {
      setNewProgramTypeError('Program type is required');
      return;
    }

    if (!newProgramDifficulty) {
      setNewProgramDifficultyError('Difficulty is required');
      return;
    }

    if (!newProgramBuilder) {
      return;
    }

    setIsCreateProgramOpen(false);

    router.push('/library/programs/new');
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

  const handleDescriptionClick = (
    event: React.MouseEvent,
    description: string,
    programName: string
  ) => {
    event.stopPropagation();
    setSelectedDescription({ description, programName });
    setDescriptionModalOpen(true);
  };

  const handleDescriptionKeyDown = (
    event: React.KeyboardEvent,
    description: string,
    programName: string
  ) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      event.stopPropagation();
      setSelectedDescription({ description, programName });
      setDescriptionModalOpen(true);
    }
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

  const uniqueTypes = Array.from(new Set(mockPrograms.map((w) => w.type))).sort();
  const uniqueLengths = Array.from(new Set(mockPrograms.map((w) => w.length))).sort((a, b) => {
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
      label: 'Program',
      icon: <FileText className="size-3" />,
      getSortValue: (row) => row.program.toLowerCase(),
      getSearchValue: (row) => row.program,
    },
    ...filteredColumnOrder.map((columnId): ColumnDefinition<Program> => {
      switch (columnId) {
        case 'description':
          return {
            id: 'description',
            label: 'Description',
            icon: <FileText className="size-3" />,
            width: {
              class: getColumnWidth('description', 'class'),
              pixel: getColumnWidth('description', 'pixel'),
            },
            tooltip: 'A brief overview of the program',
            getSortValue: (row) => row.description.toLowerCase(),
            getSearchValue: (row) =>
              `${row.program} ${row.description} ${row.type} ${row.equipment}`,
            renderCell: (row) => (
              <div
                role="button"
                tabIndex={0}
                aria-label={`View full description for ${row.program}`}
                onClick={(e) => {
                  e.stopPropagation();
                  handleDescriptionClick(e, row.description, row.program);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    e.stopPropagation();
                    handleDescriptionClick(e, row.description, row.program);
                  }
                }}
                data-no-row-link="true"
                className="flex items-center h-full cursor-pointer hover:text-primary transition-colors min-w-0 w-full"
              >
                <span className="text-sm truncate block min-w-0 w-full">{row.description}</span>
              </div>
            ),
          };
        case 'type':
          return {
            id: 'type',
            label: 'Type',
            icon: <Tag className="size-3" />,
            width: {
              class: getColumnWidth('type', 'class'),
              pixel: getColumnWidth('type', 'pixel'),
            },
            tooltip: 'The category or style of the program',
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
            label: 'Length',
            icon: <Clock className="size-3" />,
            width: {
              class: getColumnWidth('length', 'class'),
              pixel: getColumnWidth('length', 'pixel'),
            },
            tooltip: 'The duration of the program',
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
            label: 'Total Exercises',
            icon: <Hash className="size-3" />,
            width: {
              class: getColumnWidth('totalExercises', 'class'),
              pixel: getColumnWidth('totalExercises', 'pixel'),
            },
            tooltip: 'The number of exercises in the program',
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
            label: 'Equipment',
            icon: <Wrench className="size-3" />,
            width: {
              class: getColumnWidth('equipment', 'class'),
              pixel: getColumnWidth('equipment', 'pixel'),
            },
            tooltip: 'The equipment required for this program',
            getSortValue: (row) => row.equipment.toLowerCase(),
            renderCell: (row) => {
              const equipmentList = row.equipment.split(', ').filter((item) => item.trim() !== '');
              return (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <div
                      role="button"
                      tabIndex={0}
                      aria-label={`View equipment for ${row.program}`}
                      data-no-row-link="true"
                      className="flex items-center h-full cursor-pointer hover:text-primary transition-colors min-w-0 w-full"
                      onClick={(e) => {
                        e.stopPropagation();
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          e.stopPropagation();
                        }
                      }}
                    >
                      <span className="text-sm truncate block min-w-0 w-full">{row.equipment}</span>
                    </div>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="start"
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                  >
                    {equipmentList.map((equipment, index) => (
                      <DropdownMenuItem key={index} className="cursor-default pointer-events-none">
                        {equipment}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              );
            },
          };
        case 'created':
          return {
            id: 'created',
            label: 'Created',
            icon: <Calendar className="size-3" />,
            width: {
              class: getColumnWidth('created', 'class'),
              pixel: getColumnWidth('created', 'pixel'),
            },
            tooltip: 'The date when the program was created',
            getSortValue: (row) => {
              const [day, month, year] = row.created.split('-').map(Number);
              return new Date(2000 + year, month - 1, day).getTime();
            },
            renderCell: (row) => (
              <div className="flex items-center h-full">
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
      label: 'Type',
      icon: <Tag className="size-4" />,
      options: [
        { value: 'all', label: 'All' },
        ...uniqueTypes.map((type) => ({ value: type, label: type })),
      ],
      getFilterValue: (row) => row.type,
      defaultValue: typeFilter,
    },
    {
      id: 'length',
      label: 'Length',
      icon: <Clock className="size-4" />,
      options: [
        { value: 'all', label: 'All' },
        ...uniqueLengths.map((length) => ({ value: length, label: length })),
      ],
      getFilterValue: (row) => row.length,
      defaultValue: lengthFilter,
    },
  ];

  // Create first column renderer
  const renderFirstColumn = (program: Program, isSelected: boolean) => {
    return (
      <div className="flex items-center gap-3 h-full">
        <div className="flex items-center justify-center h-full" data-no-row-link="true">
          <Checkbox checked={isSelected} onCheckedChange={() => handleToggleProgram(program.id)} />
        </div>
        <span className="text-sm truncate">{program.program}</span>
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
            checked={isAllSelected}
            onCheckedChange={onToggleAll}
            aria-label="Select all programs"
          />
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <div className="flex items-center gap-2 cursor-pointer h-full flex-1">
              <FileText className="size-3 text-muted-foreground" />
              <span className="text-xs uppercase text-muted-foreground">Program</span>
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
              <span className="flex-1">Sort ascending</span>
              {isAscending && <Check className="ml-2 size-4" />}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onSort('desc')}
              className={cn(isDescending && 'bg-accent')}
            >
              <ArrowDownWideNarrow className="size-4 mr-2" />
              <span className="flex-1">Sort descending</span>
              {isDescending && <Check className="ml-2 size-4" />}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  };

  return (
    <div className="h-full w-full flex flex-col">
      <DataGrid
        data={mockPrograms}
        columns={columns}
        getRowId={(row) => row.id}
        gridKey="programs"
        subtitle={(count) => `${count} ${count === 1 ? 'program' : 'programs'}`}
        itemsPerPage={itemsPerPage}
        enableSearch={true}
        searchPlaceholder="Search..."
        filters={filters}
        enableEditColumns={true}
        enableExport={true}
        exportFileName="programs.csv"
        exportDataTransform={(row) => ({
          Program: row.program,
          Description: row.description,
          Type: row.type,
          Length: row.length,
          'Total Exercises': row.totalExercises,
          Equipment: row.equipment,
          Created: row.created,
        })}
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
        customActions={
          <ButtonGroup>
            <Button
              variant="secondary"
              onClick={handleOpenAssignProgram}
              className="gap-2"
              aria-label="Assign program to athletes"
            >
              <UserPlus className="size-4" />
              <span>Assign</span>
            </Button>
            <ButtonGroupSeparator />
            <Button onClick={handleOpenCreateProgram} className="gap-2" aria-label="Create program">
              <Plus className="size-4" />
              <span>Create program</span>
            </Button>
          </ButtonGroup>
        }
        emptyMessage="No programs found."
        rowHeight="54px"
        stickyFirstColumn={true}
        firstColumnWidth="320px"
        firstColumnId="program"
        renderFirstColumn={renderFirstColumn}
        renderFirstColumnHeader={renderFirstColumnHeader}
        showPagination={true}
      />
      {selectedDescription && (
        <DescriptionModal
          open={descriptionModalOpen}
          onOpenChange={setDescriptionModalOpen}
          description={selectedDescription.description}
          programName={selectedDescription.programName}
        />
      )}
      <SidePanel
        open={isAssignProgramOpen}
        onOpenChange={setIsAssignProgramOpen}
        title="Assign program"
      >
        <AssignAthletesList onAthleteSelected={() => setIsAssignProgramOpen(false)} />
      </SidePanel>
      <SidePanel
        open={isCreateProgramOpen}
        onOpenChange={(open) => {
          setIsCreateProgramOpen(open);
          if (!open) {
            resetCreateProgramState();
          }
        }}
        title="New program"
        footer={
          <div className="flex w-full justify-start gap-2">
            <Button
              type="button"
              onClick={handleCreateProgramContinue}
              disabled={
                !newProgramName.trim() ||
                !newProgramType ||
                !newProgramDifficulty ||
                !newProgramBuilder
              }
              aria-label="Continue to builder"
            >
              Continue to builder
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={handleCloseCreateProgram}
              aria-label="Cancel creating program"
            >
              Cancel
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <label htmlFor="program-name" className="text-sm font-medium">
                Program Name <span className="text-destructive">*</span>
              </label>
              <Input
                id="program-name"
                type="text"
                placeholder="Name..."
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
                Type <span className="text-destructive">*</span>
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
                  <SelectValue placeholder="Select..." />
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
                Difficulty <span className="text-destructive">*</span>
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
                  <SelectValue placeholder="Select..." />
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
                Weeks
              </label>
              <Input
                id="program-weeks"
                type="number"
                inputMode="numeric"
                min={1}
                step={1}
                placeholder="Number of weeks"
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
              Description <span className="text-muted-foreground font-normal">(Optional)</span>
            </label>
            <Textarea
              id="program-description"
              value={newProgramDescription}
              onChange={(event) => setNewProgramDescription(event.target.value)}
              placeholder="Add a description for your program..."
              rows={4}
              className="resize-none"
            />
          </div>
          <div className="flex flex-col gap-2">
            <h3 className="text-sm font-medium">
              Select how you wish to start <span className="text-destructive">*</span>
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setNewProgramBuilder('ai')}
                className={cn(
                  'relative h-24 rounded-lg border border-input p-4 flex flex-col items-start justify-center gap-1.5 transition-colors text-left',
                  newProgramBuilder === 'ai'
                    ? 'border-primary bg-primary/5 shadow-sm'
                    : 'bg-background hover:bg-accent/30'
                )}
                aria-label="Use OneNinety AI to build program"
              >
                <p className="text-sm font-semibold mb-1">OneNinety AI</p>
                <p
                  className={cn(
                    'text-xs',
                    newProgramBuilder === 'ai' ? 'text-foreground/80' : 'text-muted-foreground'
                  )}
                >
                  AI Program Builder
                </p>
                <div
                  aria-hidden="true"
                  className={cn(
                    'absolute right-4 top-4 flex h-5 w-5 items-center justify-center rounded-full border-2',
                    newProgramBuilder === 'ai'
                      ? 'border-primary bg-primary/10'
                      : 'border-input bg-background'
                  )}
                >
                  <div
                    className={cn(
                      'h-2.5 w-2.5 rounded-full',
                      newProgramBuilder === 'ai' ? 'bg-primary' : 'bg-transparent'
                    )}
                  />
                </div>
              </button>
              <button
                type="button"
                onClick={() => setNewProgramBuilder('standard')}
                className={cn(
                  'relative h-24 rounded-lg border border-input p-4 flex flex-col items-start justify-center gap-1.5 transition-colors text-left',
                  newProgramBuilder === 'standard'
                    ? 'border-primary bg-primary/5 shadow-sm'
                    : 'bg-background hover:bg-accent/30'
                )}
                aria-label="Manually build program"
              >
                <p className="text-sm font-semibold mb-1">Standard Builder</p>
                <p
                  className={cn(
                    'text-xs',
                    newProgramBuilder === 'standard'
                      ? 'text-foreground/80'
                      : 'text-muted-foreground'
                  )}
                >
                  Manually build your program
                </p>
                <div
                  aria-hidden="true"
                  className={cn(
                    'absolute right-4 top-4 flex h-5 w-5 items-center justify-center rounded-full border-2',
                    newProgramBuilder === 'standard'
                      ? 'border-primary bg-primary/10'
                      : 'border-input bg-background'
                  )}
                >
                  <div
                    className={cn(
                      'h-2.5 w-2.5 rounded-full',
                      newProgramBuilder === 'standard' ? 'bg-primary' : 'bg-transparent'
                    )}
                  />
                </div>
              </button>
            </div>
          </div>
        </div>
      </SidePanel>
    </div>
  );
};

export default ProgramsPage;
