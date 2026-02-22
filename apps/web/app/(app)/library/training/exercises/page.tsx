'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useTerminology } from '@/hooks/use-terminology';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useFeatureAccess } from '@/lib/permissions/feature-gate';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { ButtonGroup } from '@/components/ui/button-group';
import { Spinner } from '@/components/ui/spinner';
import { AssignTrainingToClientSidePanel } from '@/components/training/assign-training-to-client-side-panel';
import { DataGrid, type ColumnDefinition, type FilterDefinition } from '@/components/app/data-grid';
import { EmptyGridState } from '@/components/app/empty-grid-state';
import { ConfirmDeleteDialog } from '@/components/app/confirm-delete-dialog';
import { cn } from '@/lib/general/utils';
import {
  X,
  Check,
  ArrowUpNarrowWide,
  ArrowDownWideNarrow,
  Plus,
  FileText,
  Tag,
  Download,
  User,
  Star,
  Trash2,
  Copy,
  Dumbbell,
  Loader2,
} from 'lucide-react';

import type { Program } from '@/components/app/app-shell';
import { starPrograms, deletePrograms } from '@/api/coach/coach-program-service';
import { getExercises, starExercises, deleteExercises as deleteExercisesService, createExercise, editExercise, duplicateExercises, type Exercise } from '@/api/coach/coach-exercise-service';
import { exportToCSV } from '@/lib/general/csv-export';
import { toast } from 'sonner';
import { AddExerciseSidePanel } from './add-exercise-side-panel';
import { useTrainingData } from '../training-data-context';
import { useVideoThumbnails } from '@/hooks/use-video-thumbnail';
import {
  MUSCLEWIKI_CATEGORY_OPTIONS,
  MUSCLEWIKI_MUSCLE_OPTIONS,
  MUSCLEWIKI_DIFFICULTY_OPTIONS,
} from '@athli/shared-types';

type ColumnId = 'category' | 'muscleGroup' | 'difficulty' | 'actions';

const COLUMN_ORDER: ColumnId[] = [
  'category',
  'muscleGroup',
  'difficulty',
  'actions',
];
const filteredColumnOrder = COLUMN_ORDER.filter((colId) => colId !== 'actions');


const getColumnWidth = (colId: ColumnId, format: 'class' | 'pixel' = 'class'): string => {
  const widths: Record<ColumnId, { class: string; pixel: string }> = {
    category: { class: 'min-w-[140px]', pixel: '140px' },
    muscleGroup: { class: 'min-w-[150px]', pixel: '150px' },
    difficulty: { class: 'min-w-[140px]', pixel: '140px' },
    actions: { class: 'w-[100px]', pixel: '100px' },
  };

  return widths[colId]?.[format] || (format === 'class' ? 'min-w-[130px]' : '130px');
};

const ExercisesPage = () => {
  const t = useTranslations();
  const terminology = useTerminology();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { exercises: contextExercises, isLoadingExercises, refreshExercises } = useTrainingData();
  const { hasAccess: hasCustomExercisesAccess } = useFeatureAccess('custom_exercises');
  const [selectedExercises, setSelectedExercises] = useState<Set<string>>(new Set());
  const [starredExercises, setStarredExercises] = useState<Set<string>>(new Set());
  const [exercises, setExercises] = useState<Program[]>([]);
  const [columnOrder] = useState<ColumnId[]>(COLUMN_ORDER);
  const [visibleColumns] = useState<Set<string>>(new Set(COLUMN_ORDER));
  const [filteredCount, setFilteredCount] = useState<number>(0);
  const itemsPerPage = 25;
  const [isCreateExerciseOpen, setIsCreateExerciseOpen] = useState<boolean>(false);
  const [isUpgradeDialogOpen, setIsUpgradeDialogOpen] = useState<boolean>(false);
  const [isEditExerciseOpen, setIsEditExerciseOpen] = useState<boolean>(false);
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState<boolean>(false);
  const [exerciseToDelete, setExerciseToDelete] = useState<string | null>(null);
  const [isAssignIndividualExerciseOpen, setIsAssignIndividualExerciseOpen] = useState<boolean>(false);
  const [selectedExerciseForAssignment, setSelectedExerciseForAssignment] = useState<Program | null>(null);

  // Helper to check if value is empty (null, undefined, empty string, 0, or empty array)
  const isEmpty = (value: any): boolean => {
    if (value === null || value === undefined || value === '' || value === 0) return true;
    if (Array.isArray(value) && value.length === 0) return true;
    return false;
  };

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
    // Use contextExercises directly instead of re-fetching all exercises
    const exercise = contextExercises.find((ex) => ex.id === exerciseId);
    if (exercise) {
      setEditingExercise(exercise);
      setIsEditExerciseOpen(true);
    }
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
      totalWorkouts: 0,
      difficulty: ex.difficulty || '',
      equipment: '', // Removed - using category instead
      created: ex.created_at,
      category: ex.category || '',
      muscleGroup: (ex.muscle_group || []).join(', '), // Convert array to string for display
      muscleGroups: ex.muscle_group || [], // Keep array for filtering
      modality: '', // Removed
      videoLink: ex.video_link || '',
      isFavourite: ex.isFavourite || false,
    }));
    setExercises(mappedExercises);
  }, [contextExercises]);

  // Extract Supabase video URLs for thumbnail generation
  const supabaseVideoUrls = useMemo(() => {
    return exercises
      .map((ex) => (ex as any).videoLink as string | undefined)
      .filter((url): url is string => {
        if (!url) return false;
        try {
          const urlObj = new URL(url.trim());
          return urlObj.hostname.includes('supabase.co');
        } catch {
          return false;
        }
      });
  }, [exercises]);

  // Generate thumbnails for Supabase videos
  const { getThumbnailUrl: getSupabaseThumbnail, isThumbnailLoading: isSupabaseThumbnailLoading } = useVideoThumbnails(supabaseVideoUrls);

  // Handle exerciseId from URL params (e.g., from search)
  useEffect(() => {
    const exerciseId = searchParams.get('exerciseId');
    const shouldCreate = searchParams.get('create') === 'true';

    if (shouldCreate) {
      setIsCreateExerciseOpen(true);
      // Clear the query param
      window.history.replaceState({}, '', '/library/training/exercises');
      return;
    }

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
      const isStarred = starredExercises.has(exerciseId);
      await starExercises(exerciseId, !isStarred);

      const exercise = exercises.find((e) => e.id === exerciseId);
      const exerciseName = exercise?.program || t('exercises.exercise');

      setStarredExercises((prev) => {
        const next = new Set(prev);
        if (next.has(exerciseId)) {
          next.delete(exerciseId);
        } else {
          next.add(exerciseId);
        }
        return next;
      });

      if (isStarred) {
        toast.success(t('exercises.detail.toast.unstarredSuccessfully', { name: exerciseName }));
      } else {
        toast.success(t('exercises.detail.toast.starredSuccessfully', { name: exerciseName }));
      }
    } catch (error) {
      console.error('Failed to star exercise:', error);
      toast.error(t('general.error'));
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


  const handleBulkDelete = async () => {
    if (selectedExercises.size === 0) return;
    try {
      const idsToDelete = Array.from(selectedExercises);
      const deleteCount = idsToDelete.length;

      let singleItemName = '';
      if (deleteCount === 1) {
        const item = exercises.find(e => e.id === idsToDelete[0]);
        if (item) singleItemName = item.program;
      }

      await deleteExercisesService(idsToDelete);
      // Refresh exercises after deleting
      await refreshExercises();

      if (deleteCount === 1 && singleItemName) {
        toast.success(`Successfully deleted ${singleItemName}`);
      } else {
        toast.success(`Successfully deleted ${deleteCount} exercise${deleteCount === 1 ? '' : 's'}`);
      }

      // Clear selection after deleting
      setSelectedExercises(new Set());
    } catch (error) {
      console.error('Failed to delete exercises:', error);
      toast.error(t('toasts.failedDeleteExercises'));
    }
  };

  const handleConfirmSingleDelete = async () => {
    if (!exerciseToDelete) return;
    try {
      const exercise = exercises.find(e => e.id === exerciseToDelete);
      await deleteExercisesService([exerciseToDelete]);
      await refreshExercises();

      if (exercise) {
        toast.success(`Successfully deleted ${exercise.program}`);
      } else {
        toast.success(t('toasts.exerciseDeleted'));
      }

      setExerciseToDelete(null);
    } catch (error) {
      console.error('Failed to delete exercise:', error);
      toast.error(t('toasts.failedDeleteExercise'));
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

  const [isBulkDuplicating, setIsBulkDuplicating] = useState<boolean>(false);

  const handleDuplicateSelected = async () => {
    if (selectedExercises.size === 0) return;
    setIsBulkDuplicating(true);
    try {
      await duplicateExercises(Array.from(selectedExercises));
      await refreshExercises();
      toast.success(t('toasts.exercisesDuplicated'));
      setSelectedExercises(new Set());
    } catch (error) {
      console.error('Failed to duplicate exercises:', error);
      toast.error(t('toasts.failedDuplicateExercises'));
    } finally {
      setIsBulkDuplicating(false);
    }
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
  const allColumns: ColumnDefinition<Program>[] = useMemo(() => [
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
              const category = (row as any).category;
              if (isEmpty(category)) {
                return (
                  <div className="flex items-center h-full min-w-0 w-full">
                    <span className="text-sm truncate block min-w-0 w-full">--</span>
                  </div>
                );
              }
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
              if (isEmpty(muscleGroup)) {
                return (
                  <div className="flex items-center h-full min-w-0 w-full">
                    <span className="text-sm truncate block min-w-0 w-full">--</span>
                  </div>
                );
              }
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
        case 'difficulty':
          return {
            id: 'difficulty',
            label: t('exercises.columns.difficulty'),
            icon: <Tag className="size-3" />,
            width: {
              class: getColumnWidth('difficulty', 'class'),
              pixel: getColumnWidth('difficulty', 'pixel'),
            },
            tooltip: t('exercises.columnTooltips.difficulty'),
            getSortValue: (row) => {
              const difficulty = (row as any).difficulty || '';
              return difficulty.toLowerCase();
            },
            getSearchValue: (row) => {
              const difficulty = (row as any).difficulty || '';
              return `${row.program} ${difficulty}`;
            },
            renderCell: (row) => {
              const difficulty = (row as any).difficulty;
              if (isEmpty(difficulty)) {
                return (
                  <div className="flex items-center h-full min-w-0 w-full">
                    <span className="text-sm truncate block min-w-0 w-full">--</span>
                  </div>
                );
              }
              return (
                <div className="flex items-center h-full">
                  <span className="text-sm">{difficulty}</span>
                </div>
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
  ], [t, filteredColumnOrder]);

  // Add actions column
  const actionsColumn: ColumnDefinition<Program> = useMemo(() => ({
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
  }), [t]);

  const columns: ColumnDefinition<Program>[] = useMemo(() => [...allColumns, actionsColumn], [allColumns, actionsColumn]);

  // Create filter definitions - includes MuscleWiki filters for category, muscles, difficulty, etc.
  const filters: FilterDefinition<Program>[] = useMemo(() => [
    {
      id: 'category',
      label: t('exercises.columns.category'),
      icon: <Tag className="size-4" />,
      options: MUSCLEWIKI_CATEGORY_OPTIONS.map((cat) => ({ value: cat.value, label: cat.label })),
      getFilterValue: (row) => (row as any).category || '',
    },
    {
      id: 'muscleGroup',
      label: t('exercises.columns.muscleGroup'),
      icon: <User className="size-4" />,
      options: MUSCLEWIKI_MUSCLE_OPTIONS.map((group) => ({ value: group.value, label: group.label })),
      getFilterValue: (row) => {
        const muscleGroups = (row as any).muscleGroups || (row as any).muscleGroup?.split(',').map((g: string) => g.trim()) || [];
        const groupsArray = Array.isArray(muscleGroups) ? muscleGroups : [];
        // Return comma-separated string for filtering - the filter will check if value is in this string
        return groupsArray.join(',');
      },
    },
    {
      id: 'difficulty',
      label: t('exercises.columns.difficulty'),
      icon: <Tag className="size-4" />,
      options: MUSCLEWIKI_DIFFICULTY_OPTIONS.map((d) => ({ value: d.value, label: d.label })),
      getFilterValue: (row) => (row as any).difficulty || '',
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
  ], [t, starredExercises]);

  // Helper to check if URL is a Supabase storage URL (custom upload)
  const isSupabaseUrl = (url: string): boolean => {
    if (!url?.trim()) return false;
    try {
      const urlObj = new URL(url.trim());
      return urlObj.hostname.includes('supabase.co');
    } catch {
      return false;
    }
  };

  // Helper to extract video thumbnail from video link
  const getVideoThumbnail = (videoLink: string): string | null => {
    if (!videoLink?.trim()) return null;
    
    // YouTube patterns
    const youtubeRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const youtubeMatch = videoLink.match(youtubeRegex);
    if (youtubeMatch) {
      return `https://img.youtube.com/vi/${youtubeMatch[1]}/mqdefault.jpg`;
    }
    
    return null;
  };

  // Create first column renderer
  const renderFirstColumn = useCallback((exercise: Program, isSelected: boolean) => {
    const isStarred = starredExercises.has(exercise.id);
    const videoLink = (exercise as any).videoLink || '';
    const youtubeThumbnail = getVideoThumbnail(videoLink);
    const hasCustomVideo = isSupabaseUrl(videoLink);
    const supabaseThumbnail = hasCustomVideo ? getSupabaseThumbnail(videoLink) : null;
    const isLoadingThumbnail = hasCustomVideo && isSupabaseThumbnailLoading(videoLink);
    const thumbnailUrl = youtubeThumbnail || supabaseThumbnail;
    
    return (
      <div className="flex items-center gap-3 h-full w-full">
        <div className="flex items-center justify-center h-full" data-no-row-link="true">
          <Checkbox checked={isSelected} onCheckedChange={() => handleToggleExercise(exercise.id)} />
        </div>
        {/* Thumbnail or placeholder */}
        <div className="relative w-8 h-8 flex-shrink-0 rounded overflow-hidden bg-muted border border-border">
          {isLoadingThumbnail ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="size-4 text-muted-foreground animate-spin" />
            </div>
          ) : thumbnailUrl ? (
            <img
              src={thumbnailUrl}
              alt={exercise.program}
              className="absolute inset-0 w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <Dumbbell className="size-4 text-muted-foreground" />
            </div>
          )}
        </div>
        <span className="text-sm truncate flex-1 min-w-0">{exercise.program}</span>
        <div className="flex items-center justify-end flex-shrink-0 gap-1" data-no-row-link="true">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedExerciseForAssignment(exercise);
                    setIsAssignIndividualExerciseOpen(true);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      e.stopPropagation();
                      setSelectedExerciseForAssignment(exercise);
                      setIsAssignIndividualExerciseOpen(true);
                    }
                  }}
                  className="p-1 rounded text-foreground hover:text-primary hover:bg-accent transition-colors"
                  aria-label={`Assign exercise to ${terminology.singularLower}`}
                >
                  <User className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{terminology.assignToSingular}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
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
  }, [starredExercises, handleToggleExercise, handleToggleStar, handleStarKeyDown, t, getSupabaseThumbnail, isSupabaseThumbnailLoading]);

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
  }, [t]);

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
              <ButtonGroup>
              <Button onClick={() => {
                if (!hasCustomExercisesAccess) {
                  setIsUpgradeDialogOpen(true);
                  return;
                }
                handleOpenCreateExercise();
              }} className="gap-2" aria-label={t('exercises.actions.createExercise')}>
                <Plus className="size-4" />
                <span>{t('exercises.actions.createExercise')}</span>
              </Button>
            </ButtonGroup>
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
                      {t('general.clearSelected', { count: selectedExercises.size })}
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
                    onClick={handleDuplicateSelected}
                    className="gap-2"
                    disabled={isBulkDuplicating}
                    aria-label="Duplicate selected"
                  >
                    {isBulkDuplicating ? <Spinner className="size-4" /> : <Copy className="size-4" />}
                    <span>{t('common.duplicate')}</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{t('common.duplicateSelected')}</p>
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
                onClick={() => {
                  if (!hasCustomExercisesAccess) {
                    setIsUpgradeDialogOpen(true);
                    return;
                  }
                  handleStartCreating();
                }}
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
      <AssignTrainingToClientSidePanel
        open={isAssignIndividualExerciseOpen}
        onOpenChange={(open) => {
          setIsAssignIndividualExerciseOpen(open);
          if (!open) {
            setSelectedExerciseForAssignment(null);
          }
        }}
        selectedItem={selectedExerciseForAssignment ? {
          type: 'exercise',
          id: selectedExerciseForAssignment.id,
          name: selectedExerciseForAssignment.program
        } : null}
      />
      <AddExerciseSidePanel
        open={isCreateExerciseOpen}
        onOpenChange={(open) => {
          setIsCreateExerciseOpen(open);
        }}
        onSave={handleSaveExercise}
      />
      <AddExerciseSidePanel
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
      <AssignTrainingToClientSidePanel
        open={isAssignIndividualExerciseOpen}
        onOpenChange={(open) => {
          setIsAssignIndividualExerciseOpen(open);
          if (!open) {
            setSelectedExerciseForAssignment(null);
          }
        }}
        selectedItem={selectedExerciseForAssignment ? {
          type: 'exercise',
          id: selectedExerciseForAssignment.id,
          name: selectedExerciseForAssignment.program
        } : null}
      />

      {/* Upgrade Dialog */}
      <Dialog open={isUpgradeDialogOpen} onOpenChange={setIsUpgradeDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t('upgrade.toPro')}</DialogTitle>
            <DialogDescription>
              Create custom exercises with video demonstrations, muscle groups, and difficulty levels to build your personal exercise library.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsUpgradeDialogOpen(false)}>
              Maybe Later
            </Button>
            <Button onClick={() => router.push('/settings/billing')}>
              View Plans
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
  );
};

export default ExercisesPage;
