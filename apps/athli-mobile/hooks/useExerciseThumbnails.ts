import { useEffect, useRef, useCallback, useMemo, useState } from 'react';
import { fetchBulkThumbnails } from '@/services/musclewiki-service';

// ============================================================================
// TYPES
// ============================================================================

type ThumbnailCache = Map<string, string>;
type PendingFetches = Set<string>;

// ============================================================================
// GLOBAL CACHE & STATE
// ============================================================================

// Global cache for thumbnails (persists across component remounts)
const globalThumbnailCache: ThumbnailCache = new Map();

// Track which filenames are currently being fetched to avoid duplicate requests
const pendingFetches: PendingFetches = new Set();

// Subscribers that want to be notified when cache updates
const cacheSubscribers = new Set<() => void>();

const notifySubscribers = () => {
  cacheSubscribers.forEach((callback) => callback());
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Extract filename from MuscleWiki thumbnail URL
 */
export const extractFilenameFromUrl = (thumbnailUrl?: string): string | null => {
  if (!thumbnailUrl) return null;
  const match = thumbnailUrl.match(/\/og_images\/([^/]+)$/);
  return match?.[1] || null;
};

/**
 * Get thumbnail URL from cache or return empty string (for loading state)
 */
export const getCachedThumbnailUrl = (thumbnailUrl?: string): string => {
  if (!thumbnailUrl) return '';

  const filename = extractFilenameFromUrl(thumbnailUrl);
  if (!filename) return '';

  const cached = globalThumbnailCache.get(filename);
  if (cached) return cached;

  // Return empty string while loading - UI should show loading state
  return '';
};

/**
 * Check if a thumbnail is already cached
 */
export const isThumbnailCached = (thumbnailUrl?: string): boolean => {
  if (!thumbnailUrl) return false;
  const filename = extractFilenameFromUrl(thumbnailUrl);
  return filename ? globalThumbnailCache.has(filename) : false;
};

// ============================================================================
// BULK FETCH LOGIC
// ============================================================================

/**
 * Fetch multiple thumbnails in bulk and cache them
 * Deduplicates requests and batches them efficiently
 */
const fetchAndCacheThumbnails = async (filenames: string[]): Promise<void> => {
  // Filter out already cached and pending filenames
  const toFetch = filenames.filter(
    (f) => !globalThumbnailCache.has(f) && !pendingFetches.has(f)
  );

  if (toFetch.length === 0) return;

  // Mark as pending
  toFetch.forEach((f) => pendingFetches.add(f));

  try {
    // Fetch in batches of 50
    const batchSize = 50;
    for (let i = 0; i < toFetch.length; i += batchSize) {
      const batch = toFetch.slice(i, i + batchSize);
      const results = await fetchBulkThumbnails(batch);

      // Cache results
      Object.entries(results).forEach(([filename, dataUrl]) => {
        if (dataUrl) {
          globalThumbnailCache.set(filename, dataUrl);
        }
      });

      // Notify subscribers of cache update
      notifySubscribers();
    }
  } finally {
    // Remove from pending
    toFetch.forEach((f) => pendingFetches.delete(f));
  }
};

// ============================================================================
// HOOK
// ============================================================================

type ExerciseWithThumbnail = {
  rawThumbnailUrl?: string;
};

/**
 * Hook to load exercise thumbnails in bulk
 *
 * Features:
 * - Batch loads visible thumbnails to avoid rate limiting
 * - Caches thumbnails globally (persists across component remounts)
 * - Deduplicates concurrent requests
 * - Returns a function to get cached thumbnail URLs
 *
 * Usage:
 * ```tsx
 * const { getThumbnailUrl, isLoading } = useExerciseThumbnails(exercises);
 *
 * // In render
 * <Image source={{ uri: getThumbnailUrl(exercise.rawThumbnailUrl) }} />
 * ```
 */
export const useExerciseThumbnails = <T extends ExerciseWithThumbnail>(
  exercises: T[],
  options?: {
    enabled?: boolean;
    maxVisible?: number;
  }
) => {
  const { enabled = true, maxVisible } = options || {};

  // State to trigger re-renders when cache updates
  const [, setCacheVersion] = useState(0);

  // Track if we're currently loading
  const [isLoading, setIsLoading] = useState(false);

  // Debounce timer ref
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Last fetched exercises ref to avoid re-fetching
  const lastFetchedRef = useRef<Set<string>>(new Set());

  // Subscribe to cache updates
  useEffect(() => {
    const handleCacheUpdate = () => {
      setCacheVersion((v) => v + 1);
    };

    cacheSubscribers.add(handleCacheUpdate);
    return () => {
      cacheSubscribers.delete(handleCacheUpdate);
    };
  }, []);

  // Extract filenames from exercises (memoized)
  // If maxVisible is specified, only fetch that many; otherwise fetch all
  const filenames = useMemo(() => {
    const exercisesToProcess = maxVisible ? exercises.slice(0, maxVisible) : exercises;
    return exercisesToProcess
      .map((ex) => extractFilenameFromUrl(ex.rawThumbnailUrl))
      .filter((f): f is string => f !== null);
  }, [exercises, maxVisible]);

  // Fetch thumbnails when exercises change
  useEffect(() => {
    if (!enabled || filenames.length === 0) return;

    // Check if we have new filenames to fetch
    const newFilenames = filenames.filter(
      (f) => !lastFetchedRef.current.has(f) && !globalThumbnailCache.has(f)
    );

    if (newFilenames.length === 0) return;

    // Clear existing debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Debounce to batch rapid changes
    debounceTimerRef.current = setTimeout(async () => {
      setIsLoading(true);

      // Mark as fetched
      newFilenames.forEach((f) => lastFetchedRef.current.add(f));

      await fetchAndCacheThumbnails(newFilenames);

      setIsLoading(false);
    }, 100);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [enabled, filenames]);

  // Function to get thumbnail URL for a given raw URL
  const getThumbnailUrl = useCallback((rawThumbnailUrl?: string): string => {
    return getCachedThumbnailUrl(rawThumbnailUrl);
  }, []);

  // Function to check if a specific thumbnail is still loading (not yet cached)
  const isThumbnailLoading = useCallback((rawThumbnailUrl?: string): boolean => {
    if (!rawThumbnailUrl) return false;
    const filename = extractFilenameFromUrl(rawThumbnailUrl);
    if (!filename) return false;
    // It's loading if it's not in cache yet and we have pending fetches
    return !globalThumbnailCache.has(filename) && (pendingFetches.has(filename) || isLoading);
  }, [isLoading]);

  // Count how many thumbnails are loaded
  const loadedCount = useMemo(() => {
    return filenames.filter((f) => globalThumbnailCache.has(f)).length;
  }, [filenames]);

  return {
    getThumbnailUrl,
    isThumbnailLoading,
    isLoading,
    loadedCount,
    totalCount: filenames.length,
  };
};

/**
 * Prefetch thumbnails for a list of exercises
 * Use this to warm the cache before the user scrolls
 */
export const prefetchExerciseThumbnails = async <T extends ExerciseWithThumbnail>(
  exercises: T[],
  maxCount = 50
): Promise<void> => {
  const filenames = exercises
    .slice(0, maxCount)
    .map((ex) => extractFilenameFromUrl(ex.rawThumbnailUrl))
    .filter((f): f is string => f !== null);

  await fetchAndCacheThumbnails(filenames);
};

// ============================================================================
// SINGLE THUMBNAIL FETCH
// ============================================================================

/**
 * Fetch a single thumbnail and cache it
 * Use this when dragging a single exercise into the builder
 * Returns the data URL immediately if cached, otherwise fetches and returns it
 */
export const fetchSingleThumbnail = async (rawThumbnailUrl?: string): Promise<string> => {
  if (!rawThumbnailUrl) return '';

  const filename = extractFilenameFromUrl(rawThumbnailUrl);
  if (!filename) return '';

  // Check if already cached
  const cached = globalThumbnailCache.get(filename);
  if (cached) return cached;

  // Check if already being fetched
  if (pendingFetches.has(filename)) {
    // Wait for the pending fetch to complete
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (!pendingFetches.has(filename)) {
          clearInterval(checkInterval);
          resolve(globalThumbnailCache.get(filename) || '');
        }
      }, 50);
      // Timeout after 5 seconds
      setTimeout(() => {
        clearInterval(checkInterval);
        resolve('');
      }, 5000);
    });
  }

  // Fetch the single thumbnail
  pendingFetches.add(filename);

  try {
    const results = await fetchBulkThumbnails([filename]);
    const dataUrl = results[filename];

    if (dataUrl) {
      globalThumbnailCache.set(filename, dataUrl);
      notifySubscribers();
      return dataUrl;
    }

    return '';
  } finally {
    pendingFetches.delete(filename);
  }
};

/**
 * Synchronously get thumbnail URL if cached, otherwise trigger async fetch
 * Returns empty string immediately but triggers background fetch
 * UI should show loading state when empty string is returned
 */
export const getThumbnailWithFetch = (rawThumbnailUrl?: string): string => {
  if (!rawThumbnailUrl) return '';

  const filename = extractFilenameFromUrl(rawThumbnailUrl);
  if (!filename) return '';

  // Check if already cached
  const cached = globalThumbnailCache.get(filename);
  if (cached) return cached;

  // Trigger background fetch (don't await)
  fetchSingleThumbnail(rawThumbnailUrl);

  // Return empty string - UI should show loading state
  return '';
};

// ============================================================================
// SINGLE THUMBNAIL HOOK (with cache subscription)
// ============================================================================

/**
 * Hook to get a single exercise thumbnail with automatic re-render on cache update
 * Use this when displaying a single exercise thumbnail that may need fetching
 *
 * @param rawThumbnailUrl - The raw MuscleWiki thumbnail URL
 * @returns Object with thumbnailUrl and isLoading state
 */
export const useSingleThumbnail = (rawThumbnailUrl?: string) => {
  const [cacheVersion, setCacheVersion] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  // Subscribe to cache updates
  useEffect(() => {
    const handleCacheUpdate = () => {
      setCacheVersion((v) => v + 1);
    };

    cacheSubscribers.add(handleCacheUpdate);
    return () => {
      cacheSubscribers.delete(handleCacheUpdate);
    };
  }, []);

  // Fetch thumbnail if not cached
  useEffect(() => {
    if (!rawThumbnailUrl) return;

    const filename = extractFilenameFromUrl(rawThumbnailUrl);
    if (!filename) return;

    // Skip if already cached
    if (globalThumbnailCache.has(filename)) return;

    // Fetch in background
    setIsLoading(true);
    fetchSingleThumbnail(rawThumbnailUrl).finally(() => {
      setIsLoading(false);
    });
  }, [rawThumbnailUrl]);

  // Include cacheVersion in dependencies so thumbnailUrl recomputes when cache updates
  const thumbnailUrl = useMemo(() => {
    return getCachedThumbnailUrl(rawThumbnailUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawThumbnailUrl, cacheVersion]);

  return {
    thumbnailUrl,
    isLoading,
  };
};
