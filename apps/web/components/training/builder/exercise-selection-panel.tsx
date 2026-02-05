'use client';

import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { Dumbbell, GripVertical, Grid2x2, List, Loader2, Play, Search, X, Filter } from 'lucide-react';
import { Card, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ButtonGroup } from '@/components/ui/button-group';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { MultiAsyncSelect } from '@/components/ui/multi-async-select';
import { cn } from '@/lib/general/utils';
import {
  useAllExercises,
  type Exercise,
  type ExerciseFilters,
} from '@/hooks/use-all-exercises';
import { useCoachExercises } from '@/hooks/use-coach-exercises';
import { useExerciseThumbnails } from '@/hooks/use-exercise-thumbnails';
import {
  MUSCLEWIKI_MUSCLE_OPTIONS,
  MUSCLEWIKI_CATEGORY_OPTIONS,
  MUSCLEWIKI_DIFFICULTY_OPTIONS,
} from '@athli/shared-types';

type ExerciseSelectionPanelProps = {
  onExerciseClick?: (exercise: Exercise) => void;
  onDragStart?: (exercise: Exercise) => void;
  onDragEnd?: () => void;
  activeExerciseIds?: Set<string>;
};

export const ExerciseSelectionPanel = ({
  onExerciseClick,
  onDragStart,
  onDragEnd,
  activeExerciseIds = new Set(),
}: ExerciseSelectionPanelProps) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewMode, setViewMode] = useState<'list' | 'card'>('list');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filters, setFilters] = useState<ExerciseFilters>({
    muscles: [],
    categories: [],
    difficulties: [],
    forces: [],
    mechanics: [],
  });

  // Load coach exercises
  const { exercises: coachExercises, isLoading: isLoadingCoach } = useCoachExercises();

  // Transform coach exercises to match Exercise type
  const transformedCoachExercises: Exercise[] = useMemo(() => {
    return coachExercises.map((ex) => ({
      exerciseId: ex.id,
      name: ex.name,
      imageUrl: '',
      equipments: ex.category ? [ex.category] : [],
      bodyParts: ex.muscle_group?.slice(0, 1) || [],
      exerciseType: 'weight_reps',
      targetMuscles: ex.muscle_group || [],
      secondaryMuscles: [],
      videoUrl: ex.video_link || '',
      keywords: [ex.name, ex.category, ex.difficulty, ...(ex.muscle_group || [])].filter(Boolean) as string[],
      overview: ex.description || '',
      instructions: [],
      exerciseTips: [],
      variations: [],
      relatedExerciseIds: [],
      difficulty: ex.difficulty,
      category: ex.category,
      source: 'custom' as const,
      rawThumbnailUrl: undefined,
    }));
  }, [coachExercises]);

  // Use the new hook that loads all exercises and filters in-memory
  const {
    exercises: musclewikiExercises,
    total,
    totalCached,
    isLoading: isLoadingMusclewiki,
    isSearching,
    hasMore,
    loadMore,
  } = useAllExercises(searchQuery, filters);

  // Filter coach exercises based on search and filters
  const filteredCoachExercises = useMemo(() => {
    let result = transformedCoachExercises;

    // Apply search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter((ex) =>
        ex.name.toLowerCase().includes(query) ||
        ex.category?.toLowerCase().includes(query) ||
        ex.targetMuscles.some((m) => m.toLowerCase().includes(query))
      );
    }

    // Apply filters
    if (filters.categories?.length) {
      result = result.filter(
        (ex) => ex.category && filters.categories?.includes(ex.category)
      );
    }

    if (filters.muscles?.length) {
      result = result.filter((ex) =>
        ex.targetMuscles.some((m) => filters.muscles?.includes(m))
      );
    }

    if (filters.difficulties?.length) {
      result = result.filter(
        (ex) => ex.difficulty && filters.difficulties?.includes(ex.difficulty)
      );
    }

    return result;
  }, [transformedCoachExercises, searchQuery, filters]);

  // Merge coach exercises at top, then MuscleWiki exercises
  const exerciseResults = useMemo(() => {
    return [...filteredCoachExercises, ...musclewikiExercises];
  }, [filteredCoachExercises, musclewikiExercises]);

  const isLoading = isLoadingCoach || isLoadingMusclewiki;

  // Use bulk thumbnail loading to avoid rate limiting
  // Since exerciseResults is already paginated (50 at a time), fetch thumbnails for all displayed exercises
  const { getThumbnailUrl, isThumbnailLoading } = useExerciseThumbnails(exerciseResults);

  // Reference for scroll container (used for infinite scroll)
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Infinite scroll - load more when near bottom
  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container || !hasMore) return;

    const { scrollTop, scrollHeight, clientHeight } = container;
    // Load more when within 200px of bottom
    if (scrollHeight - scrollTop - clientHeight < 200) {
      loadMore();
    }
  }, [hasMore, loadMore]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  const handleExerciseClick = (exercise: Exercise) => {
    if (onExerciseClick) {
      onExerciseClick(exercise);
    }
  };

  const activeFiltersCount = (filters.muscles?.length || 0) +
    (filters.categories?.length || 0) +
    (filters.difficulties?.length || 0) +
    (filters.forces?.length || 0) +
    (filters.mechanics?.length || 0);

  const clearFilters = () => {
    setFilters({
      muscles: [],
      categories: [],
      difficulties: [],
      forces: [],
      mechanics: [],
    });
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex-shrink-0">
        <div className="flex gap-1 w-full">
          <div className="relative flex-1">
            {isSearching ? (
              <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none animate-spin" />
            ) : (
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
            )}
            <Input
              type="text"
              placeholder="Search for exercises.."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={cn('pl-9 w-full pr-9')}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Clear search"
              >
                <X className="size-4" />
              </button>
            )}
          </div>

          <Popover open={isFilterOpen} onOpenChange={setIsFilterOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className={cn(
                  "group relative shrink-0",
                  isFilterOpen && "bg-muted"
                )}
                aria-label="Filter exercises"
              >
                <Filter className={cn("size-4", activeFiltersCount > 0 && "text-primary fill-primary/20")} />
                {activeFiltersCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-3 w-3 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">
                    {activeFiltersCount}
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[320px] p-4" align="end">
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium leading-none">Filters</h4>
                  <Button
                    variant="link"
                    size="sm"
                    className="h-auto p-0 text-primary"
                    onClick={clearFilters}
                  >
                    Clear filters
                  </Button>
                </div>

                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Muscle Group</Label>
                    <MultiAsyncSelect
                      options={[...MUSCLEWIKI_MUSCLE_OPTIONS]}
                      value={filters.muscles}
                      onValueChange={(val) => setFilters(prev => ({ ...prev, muscles: val }))}
                      placeholder="Select muscles..."
                      className="w-full"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Category</Label>
                    <MultiAsyncSelect
                      options={[...MUSCLEWIKI_CATEGORY_OPTIONS]}
                      value={filters.categories}
                      onValueChange={(val) => setFilters(prev => ({ ...prev, categories: val }))}
                      placeholder="Select categories..."
                      className="w-full"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Difficulty</Label>
                    <MultiAsyncSelect
                      options={[...MUSCLEWIKI_DIFFICULTY_OPTIONS]}
                      value={filters.difficulties}
                      onValueChange={(val) => setFilters(prev => ({ ...prev, difficulties: val }))}
                      placeholder="Select difficulties..."
                      className="w-full"
                    />
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
        <div className="mt-3 flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            {isLoading
              ? 'Loading exercises...'
              : isSearching
                ? 'Searching...'
                : total > 0
                  ? `${exerciseResults.length} of ${total} exercises`
                  : `${exerciseResults.length} ${exerciseResults.length === 1 ? 'exercise' : 'exercises'}`}
          </span>
          <ButtonGroup>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'outline'}
                  onClick={() => setViewMode('list')}
                  size="sm"
                  className={cn(
                    'h-7',
                    viewMode === 'list' && 'bg-primary text-primary-foreground'
                  )}
                  aria-label="List view"
                >
                  <List className="size-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>List view</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={viewMode === 'card' ? 'default' : 'outline'}
                  onClick={() => setViewMode('card')}
                  size="sm"
                  className={cn(
                    'h-7',
                    viewMode === 'card' && 'bg-primary text-primary-foreground'
                  )}
                  aria-label="Card view"
                >
                  <Grid2x2 className="size-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Card view</p>
              </TooltipContent>
            </Tooltip>
          </ButtonGroup>
        </div>
      </div>
      {viewMode === 'list' ? (
        <div
          ref={scrollContainerRef}
          className="flex flex-col gap-2 mt-4 overflow-y-auto flex-1 min-h-0 -mr-3 pr-3"
        >
          {exerciseResults.map((exercise) => (
            <Card
              key={exercise.exerciseId}
              draggable
              onDragStart={() => onDragStart?.(exercise)}
              onDragEnd={onDragEnd}
              role="button"
              tabIndex={0}
              className={cn(
                "cursor-grab active:cursor-grabbing transition-colors overflow-hidden min-h-[60px] h-[60px] rounded-md shadow-none group/card bg-card hover:border-primary border py-0 gap-0"
              )}
              onMouseEnter={(e) => {
                const target = e.target as HTMLElement;
                const isThumbnail = target.closest('.group\\/thumbnail');
                if (!isThumbnail) {
                  e.currentTarget.classList.add('bg-accent');
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.classList.remove('bg-accent');
              }}
              aria-label={`Select ${exercise.name} exercise`}
            >
              <div className="flex items-center gap-2 py-2 px-3 h-full">
                <div
                  className="relative w-12 h-12 flex-shrink-0 rounded cursor-pointer group/thumbnail"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleExerciseClick(exercise);
                  }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      e.stopPropagation();
                      handleExerciseClick(exercise);
                    }
                  }}
                  onMouseEnter={(e) => {
                    const card = e.currentTarget.closest('.group\\/card') as HTMLElement;
                    if (card) {
                      card.classList.remove('bg-accent');
                    }
                  }}
                  onMouseLeave={(e) => {
                    const card = e.currentTarget.closest('.group\\/card') as HTMLElement;
                    if (card) {
                      const relatedTarget = e.relatedTarget as HTMLElement;
                      if (!card.contains(relatedTarget)) {
                        card.classList.remove('bg-accent');
                      } else if (!relatedTarget?.closest('.group\\/thumbnail')) {
                        card.classList.add('bg-accent');
                      }
                    }
                  }}
                  aria-label={`Play video for ${exercise.name}`}
                >
                  {exercise.source === 'custom' ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-muted rounded">
                      <Dumbbell className="size-4 text-muted-foreground" />
                    </div>
                  ) : isThumbnailLoading(exercise.rawThumbnailUrl) ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-muted rounded">
                      <Loader2 className="size-4 text-muted-foreground animate-spin" />
                    </div>
                  ) : !getThumbnailUrl(exercise.rawThumbnailUrl) ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-muted rounded">
                      <Dumbbell className="size-4 text-muted-foreground" />
                    </div>
                  ) : (
                    <>
                      <img
                        src={getThumbnailUrl(exercise.rawThumbnailUrl)}
                        alt={exercise.name}
                        className="absolute inset-0 w-full h-full object-cover rounded"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover/thumbnail:bg-black/30 transition-colors rounded">
                        <div className="opacity-0 group-hover/thumbnail:opacity-100 transition-opacity bg-black/60 rounded-full p-1.5">
                          <Play className="size-3 text-white fill-white" />
                        </div>
                      </div>
                    </>
                  )}
                </div>
                <div className="flex-1 min-w-0 flex items-center gap-2">
                  <CardTitle className="text-sm font-medium truncate">{exercise.name}</CardTitle>
                  {exercise.source === 'custom' && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 flex-shrink-0 border-primary text-primary">
                      Custom
                    </Badge>
                  )}
                </div>
                <GripVertical className="size-4 text-muted-foreground flex-shrink-0" />
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div
          ref={scrollContainerRef}
          className="grid gap-3 mt-4 overflow-y-auto flex-1 min-h-0 items-start -mr-3 pr-3"
          style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', alignContent: 'start' }}
        >
          {exerciseResults.map((exercise) => (
            <Card
              key={exercise.exerciseId}
              draggable
              onDragStart={() => onDragStart?.(exercise)}
              onDragEnd={onDragEnd}
              role="button"
              tabIndex={0}
              className={cn(
                "cursor-grab active:cursor-grabbing overflow-hidden rounded-md shadow-none flex flex-col group/card p-0 gap-0 h-[135px] min-w-[100px] bg-card hover:border-primary border"
              )}
              aria-label={`Select ${exercise.name} exercise`}
            >
              <div className="relative w-full h-[80px] flex-shrink-0">
                {exercise.source === 'custom' ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-muted">
                    <Dumbbell className="size-6 text-muted-foreground" />
                  </div>
                ) : isThumbnailLoading(exercise.rawThumbnailUrl) ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-muted">
                    <Loader2 className="size-5 text-muted-foreground animate-spin" />
                  </div>
                ) : !getThumbnailUrl(exercise.rawThumbnailUrl) ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-muted">
                    <Dumbbell className="size-6 text-muted-foreground" />
                  </div>
                ) : (
                  <>
                    <img
                      src={getThumbnailUrl(exercise.rawThumbnailUrl)}
                      alt={exercise.name}
                      className="absolute inset-0 w-full h-full object-cover"
                      loading="lazy"
                    />
                    <div
                      className="absolute inset-0 flex items-center justify-center bg-black/0 hover:bg-black/30 transition-colors cursor-pointer group/video"
                      onClick={() => handleExerciseClick(exercise)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleExerciseClick(exercise);
                        }
                      }}
                      aria-label={`Play video for ${exercise.name}`}
                      onMouseEnter={(e) => {
                        const card = e.currentTarget.closest('.group\\/card') as HTMLElement;
                        if (card) {
                          card.classList.add('bg-accent');
                        }
                      }}
                      onMouseLeave={(e) => {
                        const card = e.currentTarget.closest('.group\\/card') as HTMLElement;
                        if (card) {
                          card.classList.remove('bg-accent');
                        }
                      }}
                    >
                      <div className="opacity-0 group-hover/video:opacity-100 transition-opacity bg-black/60 rounded-full p-2">
                        <Play className="size-4 text-white fill-white" />
                      </div>
                    </div>
                  </>
                )}
              </div>
              <div className="flex-1 flex-shrink-0 px-2 py-2 flex flex-col items-start min-h-0">
                <CardTitle className="text-sm font-medium line-clamp-2 break-words">{exercise.name}</CardTitle>
                {exercise.source === 'custom' && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 mt-1 border-primary text-primary">
                    Custom
                  </Badge>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

