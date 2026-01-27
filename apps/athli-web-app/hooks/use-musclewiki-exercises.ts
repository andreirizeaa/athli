import { useInfiniteQuery } from '@tanstack/react-query';
import { useMemo, useCallback } from 'react';
import { useDebounce } from './use-debounce';
import { searchExercises, type Exercise, type ExerciseFilters, type ExerciseSearchPaginatedResult } from '@/api/exercise/exercise-search';

const DEFAULT_LIMIT = 100;

export function useMuscleWikiExercises(
  searchQuery: string = '',
  filters?: ExerciseFilters,
  options?: { enabled?: boolean; limit?: number }
) {
  // Debounce search query (300ms)
  const debouncedQuery = useDebounce(searchQuery, 300);
  const limit = options?.limit || DEFAULT_LIMIT;

  // Stable filter key for React Query
  const filterKey = useMemo(() => JSON.stringify(filters || {}), [filters]);

  const {
    data,
    isLoading,
    error,
    isFetching,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['musclewiki-exercises', debouncedQuery, filterKey, limit],
    queryFn: async ({ pageParam = 0 }): Promise<ExerciseSearchPaginatedResult> => {
      return searchExercises(debouncedQuery, filters, {
        limit,
        offset: pageParam,
      });
    },
    getNextPageParam: (lastPage) => {
      if (!lastPage.hasMore) return undefined;
      return lastPage.offset + lastPage.limit;
    },
    initialPageParam: 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: options?.enabled !== false,
  });

  // Flatten all pages into a single array of exercises
  const exercises = useMemo(() => {
    if (!data?.pages) return [];
    return data.pages.flatMap((page) => page.exercises);
  }, [data?.pages]);

  // Total count from the first page
  const total = data?.pages?.[0]?.total || 0;

  // Load more handler
  const loadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  return {
    exercises,
    total,
    isLoading,
    isFetching,
    isFetchingNextPage,
    hasNextPage: hasNextPage ?? false,
    loadMore,
    error,
  };
}
