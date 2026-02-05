import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useDebounce } from './use-debounce';
import { quickSearchExercises, type Exercise } from '@/api/exercise/exercise-search';

const DEFAULT_LIMIT = 10;
const DEBOUNCE_MS = 300;

/**
 * Hook for quick search in the exercise search bar
 * Uses the MuscleWiki /search endpoint for relevance-scored results
 * Debounced to prevent API overload (300ms)
 */
export function useExerciseQuickSearch(
  searchQuery: string,
  options?: { enabled?: boolean; limit?: number }
) {
  // Debounce search query to prevent API overload
  const debouncedQuery = useDebounce(searchQuery, DEBOUNCE_MS);
  const limit = options?.limit || DEFAULT_LIMIT;

  const {
    data,
    isLoading,
    error,
    isFetching,
  } = useQuery({
    queryKey: ['exercise-quick-search', debouncedQuery, limit],
    queryFn: async () => {
      return quickSearchExercises(debouncedQuery, limit);
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    enabled: options?.enabled !== false && debouncedQuery.length >= 2,
  });

  const exercises = useMemo(() => {
    return data?.exercises || [];
  }, [data?.exercises]);

  const total = data?.total || 0;

  return {
    exercises,
    total,
    isLoading,
    isFetching,
    error,
    // Indicate if we're waiting for debounce
    isPending: searchQuery !== debouncedQuery && searchQuery.length >= 2,
  };
}
