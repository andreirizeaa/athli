'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { ButtonGroup } from '@/components/ui/button-group';
import { Spinner } from '@/components/ui/spinner';
import { DataGrid, type ColumnDefinition, type FilterDefinition } from '@/components/app/data-grid';
import { EmptyGridState } from '@/components/app/empty-grid-state';
import { ConfirmDeleteDialog } from '@/components/app/confirm-delete-dialog';
import { cn } from '@/lib/general/utils';
import { CreateSectionSidePanel } from './components/create-section-side-panel';
import { formatSectionType, type SectionType } from './section-type-utils';
import {
  X,
  Check,
  ArrowUpNarrowWide,
  ArrowDownWideNarrow,
  Plus,
  FileText,
  Tag,
  Hash,
  Star,
  Trash2,
  Copy,
} from 'lucide-react';

import type { Section } from '@/api/coach/coach-section-service';
import { starSections, deleteSections, duplicateSection, createSection, getSectionById, updateSection } from '@/api/coach/coach-section-service';
import { toast } from 'sonner';
import { useTrainingData } from '../training-data-context';
import { SectionBuilder } from './section-builder';
import type { WorkoutProgramPayload } from '@/components/training/workout-schema';
import { DEFAULT_EXECUTION_FIELDS } from '@/components/training/workout-schema';

type ColumnId = 'description' | 'sectionType' | 'totalExercises' | 'created' | 'actions';

const COLUMN_ORDER: ColumnId[] = [
  'description',
  'sectionType',
  'totalExercises',
  'created',
  'actions',
];

const getColumnWidth = (colId: ColumnId, format: 'class' | 'pixel' = 'class'): string => {
  const widths: Record<ColumnId, { class: string; pixel: string }> = {
    description: { class: 'min-w-[250px]', pixel: '250px' },
    sectionType: { class: 'min-w-[140px]', pixel: '140px' },
    totalExercises: { class: 'min-w-[170px]', pixel: '170px' },
    created: { class: 'min-w-[130px]', pixel: '130px' },
    actions: { class: 'w-[100px]', pixel: '100px' },
  };

  return widths[colId]?.[format] || (format === 'class' ? 'min-w-[130px]' : '130px');
};

const SectionsPage = () => {
  const t = useTranslations();
  const router = useRouter();
  const { sections, isLoadingSections, setSections, refreshSections } = useTrainingData();
  const [selectedSections, setSelectedSections] = useState<Set<string>>(new Set());
  const [starredSections, setStarredSections] = useState<Set<string>>(new Set());
  const [filteredCount, setFilteredCount] = useState<number>(0);
  const [isCreateSectionOpen, setIsCreateSectionOpen] = useState<boolean>(false);
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState<boolean>(false);
  const [sectionToDelete, setSectionToDelete] = useState<string | null>(null);
  const [isSectionBuilderOpen, setIsSectionBuilderOpen] = useState<boolean>(false);
  const [selectedSectionForBuilder, setSelectedSectionForBuilder] = useState<Section | null>(null);
  const [selectedSectionData, setSelectedSectionData] = useState<any>(null);
  const itemsPerPage = 25;

  // Helper to check if value is empty (null, undefined, empty string, 0, or empty array)
  const isEmpty = (value: any): boolean => {
    if (value === null || value === undefined || value === '' || value === 0) return true;
    if (Array.isArray(value) && value.length === 0) return true;
    return false;
  };

  useEffect(() => {
    // Initialize filteredCount and starred sections from context data
    setFilteredCount(sections.length);
    const starred = new Set(sections.filter(s => s.isFavourite).map(s => s.id));
    setStarredSections(starred);
  }, [sections]);

  const handleToggleSection = (sectionId: string) => {
    setSelectedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  };

  const [isLoadingSectionData, setIsLoadingSectionData] = useState(false);

  const handleNavigateToSection = async (sectionId: string) => {
    const section = sections.find(s => s.id === sectionId);
    if (section) {
      // Open the dialog immediately and show loading inside
      setSelectedSectionForBuilder(section);
      setSelectedSectionData(null);
      setIsLoadingSectionData(true);
      setIsSectionBuilderOpen(true);

      try {
        // Fetch full section data including section_data in background
        const fullSection = await getSectionById(sectionId);
        setSelectedSectionData(fullSection.section_data);
      } catch (error) {
        console.error('Failed to fetch section data:', error);
        toast.error(t('general.error'));
        setIsSectionBuilderOpen(false);
      } finally {
        setIsLoadingSectionData(false);
      }
    }
  };

  const handleToggleStar = async (sectionId: string, e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation();
    try {
      const isStarred = starredSections.has(sectionId);
      await starSections(sectionId, !isStarred);

      const section = sections.find((s) => s.id === sectionId);
      const sectionName = section?.program || 'Section';

      setStarredSections((prev) => {
        const next = new Set(prev);
        if (next.has(sectionId)) {
          next.delete(sectionId);
        } else {
          next.add(sectionId);
        }
        return next;
      });

      if (isStarred) {
        toast.success(t('library.sections.toast.unstarredWithNameSuccessfully', { name: sectionName }));
      } else {
        toast.success(t('library.sections.toast.starredWithNameSuccessfully', { name: sectionName }));
      }
    } catch (error) {
      console.error('Failed to star section:', error);
      toast.error(t('general.error'));
    }
  };

  const handleStarKeyDown = (sectionId: string, e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      e.stopPropagation();
      handleToggleStar(sectionId, e);
    }
  };

  const handleDeleteSection = async (sectionId: string) => {
    // Optimistic update: Remove locally first
    setSections((prev) => prev.filter((s) => s.id !== sectionId));

    // Create promise for the deletion
    const deletePromise = async () => {
      await deleteSections(sectionId);
      await refreshSections();
    };

    toast.promise(deletePromise(), {
      loading: t('library.sections.toast.deleting'),
      success: t('library.sections.toast.deletedSuccessfully', { name: 'Section' }), // Generic name since we might lose reference
      error: (err) => {
        // Revert optimistic update on error (fetch fresh data)
        refreshSections();
        return t('library.sections.toast.failedToDelete');
      },
    });
  };

  const handleBulkDelete = async () => {
    if (selectedSections.size === 0) return;
    try {
      const idsToDelete = Array.from(selectedSections);
      const deleteCount = idsToDelete.length;

      await deleteSections(idsToDelete);
      await refreshSections();

      if (deleteCount === 1) {
        toast.success(t('library.sections.toast.deletedSuccessfully'));
      } else {
        toast.success(t('library.sections.toast.deletedBulkSuccessfully', { count: deleteCount }));
      }

      setSelectedSections(new Set());
      setIsBulkDeleteOpen(false);
    } catch (error) {
      console.error('Failed to delete sections:', error);
      toast.error(t('general.error'));
    }
  };

  const handleCreateSection = async (data: { title: string; description: string; sectionType: SectionType }) => {
    try {
      await createSection({
        id: null,
        name: data.title,
        description: data.description,
        sectionType: data.sectionType,
        type: data.sectionType,
        difficulty: '',
        equipment: [],
        totalExercises: 0,
        items: [],
        ...DEFAULT_EXECUTION_FIELDS,
      });

      await refreshSections();
      setIsCreateSectionOpen(false);

      toast.success(t('library.sections.toast.savedSuccessfully', {
        name: data.title,
        type: formatSectionType(data.sectionType)
      }), {
        style: {
          background: 'rgb(220 252 231)',
          color: 'rgb(20 83 45)',
          border: '1px solid rgb(187 247 208)',
        },
      });
    } catch (error) {
      console.error('Failed to create section:', error);
      toast.error(t('general.error'));
    }
  };

  const handleClearSelected = () => {
    setSelectedSections(new Set());
  };

  const handleStarSelected = async () => {
    if (selectedSections.size === 0) return;
    try {
      await starSections(Array.from(selectedSections), true);
      setStarredSections((prev) => {
        const next = new Set(prev);
        selectedSections.forEach((id) => {
          if (!next.has(id)) {
            next.add(id);
          }
        });
        return next;
      });
      setSelectedSections(new Set());
      toast.success(t('library.sections.toast.starredSuccessfully'));
    } catch (error) {
      console.error('Failed to star sections:', error);
      toast.error(t('general.error'));
    }
  };

  const handleDuplicateSelected = async () => {
    if (selectedSections.size !== 1) return;
    const sectionId = Array.from(selectedSections)[0];
    const section = sections.find((s) => s.id === sectionId);
    if (!section) return;
    handleDuplicateSelectedPerRow(sectionId, section.program);
  };

  const [isBulkDuplicating, setIsBulkDuplicating] = useState<boolean>(false);

  const handleDuplicateSelectedPerRow = async (sectionId: string, name: string) => {
    setIsBulkDuplicating(true);
    try {
      await duplicateSection(sectionId);
      await refreshSections();
      setSelectedSections(new Set());
      toast.success(t('library.sections.toast.duplicatedSuccessfully', { name }));
    } catch (error) {
      console.error('Failed to duplicate section:', error);
      toast.error(t('general.error'));
    } finally {
      setIsBulkDuplicating(false);
    }
  };

  const uniqueTypes = Array.from(new Set(sections.map((s) => s.sectionType))).sort();

  // Create column definitions for DataGrid
  const filteredColumnOrder = COLUMN_ORDER.filter((colId) => colId !== 'actions');

  const allColumns: ColumnDefinition<Section>[] = [
    {
      id: 'program',
      label: t('library.sections.section'),
      icon: <FileText className="size-3" />,
      getSortValue: (row) => row.program.toLowerCase(),
      getSearchValue: (row) => row.program,
    },
    ...filteredColumnOrder.map((columnId): ColumnDefinition<Section> => {
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
            tooltip: t('library.sections.tooltips.description'),
            getSortValue: (row) => row.description.toLowerCase(),
            getSearchValue: (row) => `${row.program} ${row.description} ${row.sectionType}`,
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
                  <TooltipContent className="max-w-[250px] break-words" side="top" align="start">
                    <p className="whitespace-pre-wrap">{row.description}</p>
                  </TooltipContent>
                </Tooltip>
              ),
          };
        case 'sectionType':
          return {
            id: 'sectionType',
            label: t('library.sections.sectionType'),
            icon: <Tag className="size-3" />,
            width: {
              class: getColumnWidth('sectionType', 'class'),
              pixel: getColumnWidth('sectionType', 'pixel'),
            },
            tooltip: t('library.sections.tooltips.sectionType'),
            getSortValue: (row) => row.sectionType.toLowerCase(),
            renderCell: (row) => (
              <div className="flex items-center h-full">
                <span className="text-sm">
                  {isEmpty(row.sectionType) ? '--' : formatSectionType(row.sectionType as SectionType)}
                </span>
              </div>
            ),
          };
        case 'totalExercises':
          return {
            id: 'totalExercises',
            label: t('library.sections.exercises'),
            icon: <Hash className="size-3" />,
            width: {
              class: getColumnWidth('totalExercises', 'class'),
              pixel: getColumnWidth('totalExercises', 'pixel'),
            },
            tooltip: t('library.sections.tooltips.totalExercises'),
            getSortValue: (row) => row.totalExercises,
            renderCell: (row) => (
              <div className="flex items-center w-full">
                <span className="text-sm">{isEmpty(row.totalExercises) ? '--' : row.totalExercises}</span>
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

  // Add actions column
  const actionsColumn: ColumnDefinition<Section> = useMemo(() => ({
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
            setSectionToDelete(row.id);
          }}
          className="h-8 w-8 text-muted-foreground hover:text-destructive transition-colors"
          aria-label={t('library.sections.actions.deleteAria')}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    ),
  }), [t]);

  const columns: ColumnDefinition<Section>[] = useMemo(() => [...allColumns, actionsColumn], [allColumns, actionsColumn]);

  // Create filter definitions
  const filters: FilterDefinition<Section>[] = useMemo(() => [
    {
      id: 'sectionType',
      label: t('library.sections.sectionType'),
      icon: <Tag className="size-4" />,
      options: uniqueTypes.map((type) => ({ value: type, label: formatSectionType(type as SectionType) })),
      getFilterValue: (row) => row.sectionType,
    },
    {
      id: 'show',
      label: t('general.show'),
      icon: <Star className="size-4" />,
      options: [
        { value: 'starred', label: t('library.starred') },
        { value: 'unstarred', label: t('library.unstarred') },
      ],
      getFilterValue: (row) => (starredSections.has(row.id) ? 'starred' : 'unstarred'),
    },
  ], [t, uniqueTypes, starredSections]);

  // Create first column renderer
  const renderFirstColumn = useCallback((section: Section, isSelected: boolean) => {
    const isStarred = starredSections.has(section.id);
    return (
      <div className="flex items-center gap-3 h-full w-full">
        <div className="flex items-center justify-center h-full" data-no-row-link="true">
          <Checkbox checked={isSelected} onCheckedChange={() => handleToggleSection(section.id)} />
        </div>
        <span className="text-sm truncate flex-1 min-w-0">{section.program}</span>
        <div className="flex items-center justify-end flex-shrink-0 gap-1" data-no-row-link="true">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={(e) => handleToggleStar(section.id, e)}
                  onKeyDown={(e) => handleStarKeyDown(section.id, e)}
                  className="p-1 rounded text-foreground hover:text-primary hover:bg-accent transition-colors"
                  aria-label={t('library.sections.actions.starAria')}
                >
                  {isStarred ? (
                    <Star className="h-4 w-4 fill-primary text-primary" />
                  ) : (
                    <Star className="h-4 w-4" />
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{t('library.sections.actions.starAria')}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    );
  }, [starredSections, handleToggleSection, handleToggleStar, handleStarKeyDown, t]);

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
            key={`select-all-sections-${isAllSelected}`}
            checked={isAllSelected}
            onCheckedChange={onToggleAll}
            aria-label="Select all sections"
          />
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <div className="flex items-center gap-2 cursor-pointer h-full flex-1">
              <FileText className="size-3 text-muted-foreground" />
              <span className="text-xs uppercase text-muted-foreground">{t('library.sections.section')}</span>
              {isAscending && <ArrowUpNarrowWide className="size-3 text-muted-foreground" />}
              {isDescending && <ArrowDownWideNarrow className="size-3 text-muted-foreground" />}
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={() => onSort('asc')} className={cn(isAscending && 'bg-accent')}>
              <ArrowUpNarrowWide className="size-4 mr-2" />
              <span className="flex-1">{t('library.sections.sorting.ascending')}</span>
              {isAscending && <Check className="ml-2 size-4" />}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onSort('desc')} className={cn(isDescending && 'bg-accent')}>
              <ArrowDownWideNarrow className="size-4 mr-2" />
              <span className="flex-1">{t('library.sections.sorting.descending')}</span>
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
              {`${filteredCount} ${filteredCount === 1 ? t('library.sections.section') : t('library.sections.title')}`}
            </p>
          </div>
          <div>
            <ButtonGroup>
              <Button onClick={() => setIsCreateSectionOpen(true)} className="gap-2" aria-label="Create section">
                <Plus className="size-4" />
                <span>{t('library.sections.actions.newSection')}</span>
              </Button>
            </ButtonGroup>
          </div>
        </div>
      </div>
      <DataGrid
        data={sections}
        columns={columns}
        getRowId={(row) => row.id}
        gridKey="sections"
        itemsPerPage={itemsPerPage}
        onFilteredDataChange={setFilteredCount}
        enableSearch={true}
        searchPlaceholder={t('library.sections.searchPlaceholder')}
        filters={filters}
        enableEditColumns={true}
        enableRowSelection={true}
        selectedRowIds={selectedSections}
        onSelectionChange={setSelectedSections}
        onRowClick={(row, event) => {
          const targetElement = event.target as HTMLElement;
          if (targetElement.closest('[data-no-row-link="true"]')) {
            return;
          }
          handleNavigateToSection(row.id);
        }}
        onRowKeyDown={(row, event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            const targetElement = event.target as HTMLElement;
            if (targetElement.closest('[data-no-row-link="true"]')) {
              return;
            }
            event.preventDefault();
            handleNavigateToSection(row.id);
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
                    aria-label={t('general.clearSelected', { count: selectedSections.size })}
                  >
                    <X className="size-4" />
                    <span>{t('library.sections.actions.clearSelected', { count: selectedSections.size })}</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{t('general.clearSelected', { count: selectedSections.size })}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            {/* RESTORED Duplicate Selected */}
            {selectedSections.size === 1 && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" onClick={handleDuplicateSelected} className="gap-2" disabled={isBulkDuplicating} aria-label={t('library.sections.actions.duplicateAria')}>
                      {isBulkDuplicating ? <Spinner className="size-4" /> : <Copy className="size-4" />}
                      <span>{t('library.sections.actions.duplicate')}</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{t('library.sections.actions.duplicate')}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" onClick={handleStarSelected} className="gap-2" aria-label={t('library.sections.actions.starSelectedAria')}>
                    <Star className="size-4" />
                    <span>{t('library.sections.actions.starSelected')}</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{t('library.sections.actions.starSelectedAria')}</p>
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
                    aria-label={t('general.delete')}
                  >
                    <Trash2 className="size-4" />
                    <span>{t('general.delete')}</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{t('general.delete')}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        }
        emptyMessage={t('library.sections.emptyMessage')}
        emptyState={
          <EmptyGridState
            title={t('library.sections.emptyState.title')}
            subtitle={t('library.sections.emptyState.subtitle')}
            action={
              <Button onClick={() => setIsCreateSectionOpen(true)}>
                {t('library.sections.emptyState.action')}
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
        count={selectedSections.size}
        itemType="section"
      />

      <ConfirmDeleteDialog
        open={sectionToDelete !== null}
        onOpenChange={(open) => !open && setSectionToDelete(null)}
        onConfirm={() => {
          if (sectionToDelete) {
            handleDeleteSection(sectionToDelete);
          }
        }}
        itemName={sections.find((s) => s.id === sectionToDelete)?.program}
        itemType="section"
      />

      <CreateSectionSidePanel
        isOpen={isCreateSectionOpen}
        onClose={() => setIsCreateSectionOpen(false)}
        onCreateSection={handleCreateSection}
      />

      {selectedSectionForBuilder && (
        <SectionBuilder
          open={isSectionBuilderOpen}
          onOpenChange={setIsSectionBuilderOpen}
          sectionType={selectedSectionForBuilder.sectionType as 'regular' | 'amrap' | 'timed' | 'circuits' | 'auxiliary'}
          initialData={selectedSectionData}
          isLoadingInitialData={isLoadingSectionData}
          meta={{
            name: selectedSectionForBuilder.program,
            description: selectedSectionForBuilder.description,
            type: '',
            difficulty: '',
          }}
          onSaveSuccess={async (payload: WorkoutProgramPayload) => {
            if (selectedSectionForBuilder?.id) {
              try {
                await updateSection(selectedSectionForBuilder.id, payload);
                await refreshSections();
                toast.success(t('library.sections.toast.savedSuccessfully', { name: selectedSectionForBuilder.program, type: '' }));
                setIsSectionBuilderOpen(false);
              } catch (error) {
                console.error('Failed to update section:', error);
                toast.error(t('general.error'));
              }
            }
          }}
          onDelete={() => {
            if (selectedSectionForBuilder?.id) {
              handleDeleteSection(selectedSectionForBuilder.id);
              setIsSectionBuilderOpen(false);
            }
          }}
        />
      )}
    </div>
  );
};

export default SectionsPage;
