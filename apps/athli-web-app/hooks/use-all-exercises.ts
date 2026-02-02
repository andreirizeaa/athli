'use client';

import { useQuery } from '@tanstack/react-query';
import { useMemo, useState, useCallback, useEffect, useDeferredValue } from 'react';
import { getAllExercises, type MuscleWikiExercise } from '@/api/musclewiki/musclewiki-service';

// ============================================================================
// TYPES
// ============================================================================

export type Exercise = {
  exerciseId: string;
  name: string;
  imageUrl: string;
  equipments: string[];
  bodyParts: string[];
  exerciseType: string;
  targetMuscles: string[];
  secondaryMuscles: string[];
  videoUrl: string;
  keywords: string[];
  overview: string;
  instructions: string[];
  exerciseTips: string[];
  variations: string[];
  relatedExerciseIds: string[];
  musclewikiId?: string;
  difficulty?: string;
  force?: string;
  mechanic?: string;
  category?: string;
  source: 'musclewiki' | 'custom';
  isCacheValid?: boolean;
  // Raw thumbnail URL from cache (not proxied yet)
  rawThumbnailUrl?: string;
};

export type ExerciseFilters = {
  muscles?: string[];
  categories?: string[];
  difficulties?: string[];
  forces?: string[];
  mechanics?: string[];
};

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Convert MuscleWiki thumbnail URL to our proxy URL
 * Only call this when displaying the image (lazy)
 */
export const getProxiedThumbnailUrl = (thumbnailUrl?: string): string => {
  if (!thumbnailUrl) {
    return '';
  }

  // Extract filename from MuscleWiki URL
  const match = thumbnailUrl.match(/\/og_images\/([^/]+)$/);
  if (match && match[1]) {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';
    return `${apiUrl}/api/v1/exercises/images/${match[1]}`;
  }

  return '';
};

/**
 * Transform MuscleWiki exercise to our unified format
 * Note: imageUrl is empty - use rawThumbnailUrl with useExerciseThumbnails hook for proper thumbnail loading
 */
const transformMuscleWikiExercise = (mwExercise: MuscleWikiExercise): Exercise => {
  return {
    exerciseId: mwExercise.musclewikiId || mwExercise.id,
    musclewikiId: mwExercise.musclewikiId,
    name: mwExercise.name,
    // Store raw thumbnail URL - will be proxied only when displayed
    rawThumbnailUrl: mwExercise.thumbnailUrl,
    imageUrl: '', // Lazy load actual image
    equipments: mwExercise.category ? [mwExercise.category] : [],
    bodyParts: mwExercise.targetMuscles.slice(0, 1),
    exerciseType: 'weight_reps',
    targetMuscles: mwExercise.targetMuscles || [],
    secondaryMuscles: [
      ...(mwExercise.synergistMuscles || []),
      ...(mwExercise.stabilizerMuscles || []),
    ],
    videoUrl: '',
    keywords: [
      mwExercise.name,
      mwExercise.category,
      mwExercise.difficulty,
      ...(mwExercise.targetMuscles || []),
    ].filter(Boolean) as string[],
    overview: '',
    instructions: mwExercise.instructions || [],
    exerciseTips: mwExercise.tips || [],
    variations: [],
    relatedExerciseIds: [],
    difficulty: mwExercise.difficulty,
    force: mwExercise.force,
    mechanic: mwExercise.mechanic,
    category: mwExercise.category,
    source: 'musclewiki',
    isCacheValid: mwExercise.isCacheValid,
  };
};

/**
 * Fuzzy matching for search
 */
const matchesQuery = (exercise: Exercise, query: string): boolean => {
  const normalizedQuery = query.toLowerCase().trim();
  if (!normalizedQuery) return true;

  const searchableText = [
    exercise.name,
    exercise.category,
    exercise.difficulty,
    ...exercise.targetMuscles,
    ...exercise.equipments,
    ...exercise.keywords,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return searchableText.includes(normalizedQuery);
};

/**
 * Apply filters to exercises
 */
const applyFilters = (exercises: Exercise[], filters?: ExerciseFilters): Exercise[] => {
  if (!filters) return exercises;

  let result = exercises;

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

  if (filters.forces?.length) {
    result = result.filter(
      (ex) => ex.force && filters.forces?.includes(ex.force)
    );
  }

  if (filters.mechanics?.length) {
    result = result.filter(
      (ex) => ex.mechanic && filters.mechanics?.includes(ex.mechanic)
    );
  }

  return result;
};

// ============================================================================
// HOOK
// ============================================================================

const PAGE_SIZE = 50;

/**
 * Hook to load ALL exercises once and do in-memory search/filter
 * 
 * Features:
 * - Loads all 1700+ exercises on first render (cached for 30 min)
 * - Search/filter happens instantly in-memory
 * - Returns paginated results (50 at a time) for display
 * - Infinite scroll support via loadMore()
 */
export function useAllExercises(
  searchQuery: string = '',
  filters?: ExerciseFilters,
  options?: { enabled?: boolean }
) {
  // Use deferred value for search - keeps input responsive while filtering happens in background
  const deferredQuery = useDeferredValue(searchQuery);

  // Track if we're waiting for deferred value to catch up
  const isSearching = searchQuery !== deferredQuery;

  // Track how many items to display
  const [displayCount, setDisplayCount] = useState(PAGE_SIZE);

  // Load ALL exercises once (cached for 14 days)
  const {
    data: allExercisesData,
    isLoading,
    error,
    isFetching,
  } = useQuery({
    queryKey: ['all-exercises'],
    queryFn: async () => {
      const result = await getAllExercises();
      return result.exercises.map(transformMuscleWikiExercise);
    },
    staleTime: 14 * 24 * 60 * 60 * 1000, // 14 days - exercises change infrequently
    gcTime: 14 * 24 * 60 * 60 * 1000, // 14 days
    enabled: options?.enabled !== false,
  });

  // Filter exercises in-memory (deferred to not block input)
  const filteredExercises = useMemo(() => {
    if (!allExercisesData) return [];

    // Apply search query
    let result = allExercisesData;
    if (deferredQuery) {
      result = result.filter((ex) => matchesQuery(ex, deferredQuery));
    }

    // Apply filters
    result = applyFilters(result, filters);

    return result;
  }, [allExercisesData, deferredQuery, filters]);

  // Reset display count when search/filters change
  useEffect(() => {
    setDisplayCount(PAGE_SIZE);
  }, [deferredQuery, filters]);

  // Get exercises to display (paginated)
  const displayedExercises = useMemo(() => {
    return filteredExercises.slice(0, displayCount);
  }, [filteredExercises, displayCount]);

  // Check if there are more to load
  const hasMore = displayCount < filteredExercises.length;

  // Load more handler
  const loadMore = useCallback(() => {
    if (hasMore) {
      setDisplayCount((prev) => prev + PAGE_SIZE);
    }
  }, [hasMore]);

  return {
    // Exercises to display (paginated)
    exercises: displayedExercises,
    // All filtered exercises (full dataset for lookups)
    allExercises: filteredExercises,
    // Total after filtering
    total: filteredExercises.length,
    // Total in cache
    totalCached: allExercisesData?.length || 0,
    // Loading states
    isLoading,
    isFetching,
    isSearching, // True when deferred value is catching up (input ahead of results)
    // Pagination
    hasMore,
    loadMore,
    // Error
    error,
  };
}

// ============================================================================
// PREFETCH HOOK (for global data provider)
// ============================================================================

/**
 * Lightweight hook that just prefetches all exercises into React Query cache.
 * Does not block the UI - runs in background.
 * Use this in GlobalDataProvider to warm the cache on app load.
 */
export function usePrefetchAllExercises(options?: { enabled?: boolean }) {
  useQuery({
    queryKey: ['all-exercises'],
    queryFn: async () => {
      const result = await getAllExercises();
      return result.exercises.map(transformMuscleWikiExercise);
    },
    staleTime: 14 * 24 * 60 * 60 * 1000, // 14 days - exercises change infrequently
    gcTime: 14 * 24 * 60 * 60 * 1000, // 14 days
    enabled: options?.enabled !== false,
  });
}

// ============================================================================
// EXERCISE LOOKUP HOOK
// ============================================================================

/**
 * Hook that provides a function to lookup exercises by ID from the cached data.
 * Use this when you need to resolve exercise IDs to full Exercise objects.
 * 
 * Usage:
 * ```tsx
 * const { findExerciseById, findExercisesByIds, allExercises } = useExerciseLookup();
 * const exercise = findExerciseById('some-id');
 * const exercises = findExercisesByIds(['id1', 'id2', 'id3']);
 * ```
 */
export function useExerciseLookup() {
  const { allExercises, isLoading } = useAllExercises('');

  // Create a memoized Map for O(1) lookups using full dataset
  const exerciseMap = useMemo(() => {
    return new Map((allExercises || []).map((e) => [e.exerciseId, e]));
  }, [allExercises]);

  // Lookup single exercise by ID
  const findExerciseById = useCallback(
    (id: string): Exercise | undefined => {
      return exerciseMap.get(id);
    },
    [exerciseMap]
  );

  // Lookup multiple exercises by IDs
  const findExercisesByIds = useCallback(
    (ids: string[]): Exercise[] => {
      return ids
        .map((id) => exerciseMap.get(id))
        .filter((e): e is Exercise => e !== undefined);
    },
    [exerciseMap]
  );

  return {
    findExerciseById,
    findExercisesByIds,
    allExercises,
    isLoading,
    exerciseMap,
  };
}
