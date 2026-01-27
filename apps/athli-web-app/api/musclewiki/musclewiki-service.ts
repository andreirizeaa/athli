/**
 * MuscleWiki Service (Web App Client)
 *
 * This service calls the athli-web-api backend for all exercise data.
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
  maleVideoSideUrl?: string;
  femaleVideoFrontUrl?: string;
  femaleVideoSideUrl?: string;
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

/**
 * Search exercises via backend API
 *
 * @param filters - Search filters including category, muscle, difficulty, etc.
 * @param filters.gender - Filter for male or female specific exercise demonstrations
 */
export const searchExercises = async (
  filters: MuscleWikiSearchFilters = {}
): Promise<MuscleWikiExercise[]> => {
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
    const response = await apiFetch<ApiResponse<{ exercises: MuscleWikiExercise[] }>>(url, {
      headers: {
        'X-Request-Source': 'web_app',
      },
    });

    return response.data?.exercises || [];
  } catch (error) {
    console.error('Failed to search exercises:', error);
    return [];
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
 * Get exercise video URLs via backend API (lazy loading)
 */
export const getExerciseVideos = async (
  musclewikiId: string
): Promise<{
  maleVideoFrontUrl?: string;
  maleVideoSideUrl?: string;
  femaleVideoFrontUrl?: string;
  femaleVideoSideUrl?: string;
} | null> => {
  try {
    const response = await apiFetch<ApiResponse<{
      videos: {
        maleVideoFrontUrl?: string;
        maleVideoSideUrl?: string;
        femaleVideoFrontUrl?: string;
        femaleVideoSideUrl?: string;
      }
    }>>(`/exercises/${musclewikiId}/videos`, {
      headers: {
        'X-Request-Source': 'web_app',
      },
    });

    return response.data?.videos || null;
  } catch (error) {
    console.error('Failed to get exercise videos:', error);
    return null;
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
