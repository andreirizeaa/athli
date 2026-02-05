/**
 * MuscleWiki Service (Web App Client)
 *
 * This service calls the service backend for all exercise data.
 * All MuscleWiki API interactions are handled by the backend with caching.
 */

import { apiFetch, type ApiResponse } from '@/api/api-client';

// ============================================================================
// TYPES
// ============================================================================

export type MuscleWikiExercise = {
  id: string;
  musclewikiId: string;
  name: string;
  nameAlternative?: string;
  slug?: string;
  category?: string;
  difficulty?: string;
  force?: string;
  mechanic?: string;
  targetMuscles: string[];
  synergistMuscles: string[];
  stabilizerMuscles: string[];
  instructions: string[];
  tips: string[];
  thumbnailUrl?: string;
  maleVideoFrontUrl?: string;
  imageUrls: string[];
  isCacheValid: boolean;
  cachedAt: string;
};

export type MuscleWikiFilterOption = {
  value: string;
  label: string;
  type: 'category' | 'muscle' | 'difficulty' | 'force' | 'mechanic';
};

export type MuscleWikiSearchFilters = {
  category?: string;
  difficulty?: string;
  muscle?: string;
  force?: string;
  mechanic?: string;
  grips?: string;
  searchTerm?: string;
  gender?: 'male' | 'female';
  limit?: number;
  offset?: number;
};

// ============================================================================
// PUBLIC API
// ============================================================================

export type MuscleWikiSearchResult = {
  exercises: MuscleWikiExercise[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
};

export type QuickSearchResult = {
  exercises: MuscleWikiExercise[];
  total: number;
};

export type AllExercisesResult = {
  exercises: MuscleWikiExercise[];
  total: number;
};

/**
 * Get ALL exercises from cache in a single request
 * Call this once on app load to populate the client-side cache
 * Search/filter then happens in-memory for instant results
 */
export const getAllExercises = async (): Promise<AllExercisesResult> => {
  try {
    const response = await apiFetch<ApiResponse<AllExercisesResult>>(
      '/exercises/all',
      {
        headers: {
          'X-Request-Source': 'web_app',
        },
      }
    );

    return response.data || { exercises: [], total: 0 };
  } catch (error) {
    console.error('Failed to get all exercises:', error);
    return { exercises: [], total: 0 };
  }
};

/**
 * Quick search exercises using MuscleWiki's /search endpoint
 * Optimized for search bar autocomplete - uses relevance-scored search
 * 
 * @param query - Search term (minimum 2 characters)
 * @param limit - Maximum results (default 10)
 */
export const quickSearchExercises = async (
  query: string,
  limit: number = 10
): Promise<QuickSearchResult> => {
  if (!query || query.length < 2) {
    return { exercises: [], total: 0 };
  }

  const params = new URLSearchParams({
    q: query,
    limit: limit.toString(),
  });

  try {
    const response = await apiFetch<ApiResponse<QuickSearchResult>>(
      `/exercises/search?${params.toString()}`,
      {
        headers: {
          'X-Request-Source': 'web_app',
        },
      }
    );

    return response.data || { exercises: [], total: 0 };
  } catch (error) {
    console.error('Failed to quick search exercises:', error);
    return { exercises: [], total: 0 };
  }
};

/**
 * List/filter exercises via backend API (for browsing with filters)
 *
 * @param filters - Search filters including category, muscle, difficulty, etc.
 * @param filters.gender - Filter for male or female specific exercise demonstrations
 */
export const searchExercises = async (
  filters: MuscleWikiSearchFilters = {}
): Promise<MuscleWikiSearchResult> => {
  const params = new URLSearchParams();

  if (filters.searchTerm) params.set('q', filters.searchTerm);
  if (filters.category) params.set('category', filters.category);
  if (filters.difficulty) params.set('difficulty', filters.difficulty);
  if (filters.muscle) params.set('muscle', filters.muscle);
  if (filters.force) params.set('force', filters.force);
  if (filters.mechanic) params.set('mechanic', filters.mechanic);
  if (filters.grips) params.set('grips', filters.grips);
  if (filters.gender) params.set('gender', filters.gender);
  if (filters.limit) params.set('limit', filters.limit.toString());
  if (filters.offset) params.set('offset', filters.offset.toString());

  const queryString = params.toString();
  const url = `/exercises${queryString ? `?${queryString}` : ''}`;

  try {
    const response = await apiFetch<ApiResponse<MuscleWikiSearchResult>>(url, {
      headers: {
        'X-Request-Source': 'web_app',
      },
    });

    return response.data || { exercises: [], total: 0, limit: 100, offset: 0, hasMore: false };
  } catch (error) {
    console.error('Failed to search exercises:', error);
    return { exercises: [], total: 0, limit: 100, offset: 0, hasMore: false };
  }
};

/**
 * Get a single exercise by ID via backend API
 */
export const getExerciseById = async (
  musclewikiId: string
): Promise<MuscleWikiExercise | null> => {
  try {
    const response = await apiFetch<ApiResponse<{ exercise: MuscleWikiExercise }>>(
      `/exercises/${musclewikiId}`,
      {
        headers: {
          'X-Request-Source': 'web_app',
        },
      }
    );

    return response.data?.exercise || null;
  } catch (error) {
    console.error('Failed to get exercise:', error);
    return null;
  }
};

/**
 * Convert a MuscleWiki video URL to our proxy URL
 */
const getProxiedVideoUrl = (videoUrl?: string): string | null => {
  if (!videoUrl) return null;
  // Extract filename from URL like: https://host/media/videos/branded/filename.mp4
  const match = videoUrl.match(/\/branded\/([^/]+)$/);
  if (match && match[1]) {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';
    return `${apiUrl}/api/v1/exercises/videos/stream/${match[1]}`;
  }
  return null;
};

/**
 * Get exercise video URLs via backend API (lazy loading)
 * Returns proxied URL that handles authentication
 */
export const getExerciseVideos = async (
  musclewikiId: string
): Promise<{ maleVideoFrontUrl?: string } | null> => {
  try {
    const response = await apiFetch<ApiResponse<{
      videos: {
        maleVideoFrontUrl?: string;
      }
    }>>(`/exercises/${musclewikiId}/videos`, {
      headers: {
        'X-Request-Source': 'web_app',
      },
    });

    const videos = response.data?.videos;
    if (!videos) return null;

    // Convert MuscleWiki video URL to proxy URL
    return {
      maleVideoFrontUrl: getProxiedVideoUrl(videos.maleVideoFrontUrl) || undefined,
    };
  } catch (error) {
    console.error('Failed to get exercise videos:', error);
    return null;
  }
};

/**
 * Bulk fetch exercise thumbnail images
 * Returns a map of filename -> base64 data URL
 * Max 50 images per request
 */
export const fetchBulkThumbnails = async (
  filenames: string[]
): Promise<Record<string, string>> => {
  if (!filenames.length) {
    return {};
  }

  try {
    const response = await apiFetch<ApiResponse<{ images: Record<string, string> }>>(
      '/exercises/images/bulk',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Request-Source': 'web_app',
        },
        body: JSON.stringify({ filenames }),
      }
    );

    return response.data?.images || {};
  } catch (error) {
    console.error('Failed to fetch bulk thumbnails:', error);
    return {};
  }
};

/**
 * Get all filter options via backend API
 */
export const getAllFilterOptions = async (): Promise<{
  categories: MuscleWikiFilterOption[];
  muscles: MuscleWikiFilterOption[];
  difficulties: MuscleWikiFilterOption[];
  forces: MuscleWikiFilterOption[];
  mechanics: MuscleWikiFilterOption[];
}> => {
  try {
    const response = await apiFetch<ApiResponse<{
      filters: {
        categories: MuscleWikiFilterOption[];
        muscles: MuscleWikiFilterOption[];
        difficulties: MuscleWikiFilterOption[];
        forces: MuscleWikiFilterOption[];
        mechanics: MuscleWikiFilterOption[];
      }
    }>>('/exercises/filters');

    return response.data?.filters || {
      categories: [],
      muscles: [],
      difficulties: [],
      forces: [],
      mechanics: [],
    };
  } catch (error) {
    console.error('Failed to get filter options:', error);
    return {
      categories: [],
      muscles: [],
      difficulties: [],
      forces: [],
      mechanics: [],
    };
  }
};

/**
 * Get filter options for a specific type
 */
export const getFilterOptions = async (
  filterType: 'category' | 'muscle' | 'difficulty' | 'force' | 'mechanic'
): Promise<MuscleWikiFilterOption[]> => {
  const allFilters = await getAllFilterOptions();

  switch (filterType) {
    case 'category':
      return allFilters.categories;
    case 'muscle':
      return allFilters.muscles;
    case 'difficulty':
      return allFilters.difficulties;
    case 'force':
      return allFilters.forces;
    case 'mechanic':
      return allFilters.mechanics;
    default:
      return [];
  }
};

/**
 * Get cache status for monitoring
 */
export const getCacheStatus = async (): Promise<{
  totalCached: number;
  validCached: number;
  expiredCached: number;
} | null> => {
  try {
    const response = await apiFetch<ApiResponse<{
      status: {
        totalCached: number;
        validCached: number;
        expiredCached: number;
      }
    }>>('/exercises/cache/status');

    return response.data?.status || null;
  } catch (error) {
    console.error('Failed to get cache status:', error);
    return null;
  }
};

/**
 * Get compliance report for auditing
 */
export const getComplianceReport = async (
  days: number = 30
): Promise<{
  totalApiCalls: number;
  cacheHits: number;
  cacheMisses: number;
  cacheHitRate: number;
  avgResponseTimeMs: number;
  totalExercisesServed: number;
} | null> => {
  try {
    const response = await apiFetch<ApiResponse<{
      report: {
        totalApiCalls: number;
        cacheHits: number;
        cacheMisses: number;
        cacheHitRate: number;
        avgResponseTimeMs: number;
        totalExercisesServed: number;
      }
    }>>(`/exercises/compliance?days=${days}`);

    return response.data?.report || null;
  } catch (error) {
    console.error('Failed to get compliance report:', error);
    return null;
  }
};
