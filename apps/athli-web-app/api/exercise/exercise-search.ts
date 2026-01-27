/**
 * Exercise Search Service
 *
 * This module provides exercise search functionality with MuscleWiki API integration.
 * Uses a cache-first approach to minimize API calls and comply with MuscleWiki's terms.
 *
 * The service:
 * 1. Fetches exercises from MuscleWiki cache (Supabase)
 * 2. Falls back to MuscleWiki API if cache miss
 * 3. Supports local coach-created exercises alongside MuscleWiki exercises
 */

import {
  searchExercises as searchMuscleWikiExercises,
  quickSearchExercises as quickSearchMuscleWiki,
  getExerciseById as getMuscleWikiExerciseById,
  getExerciseVideos as getMuscleWikiVideos,
  getAllFilterOptions,
  type MuscleWikiExercise,
  type MuscleWikiSearchFilters,
  type MuscleWikiSearchResult,
} from '@/api/musclewiki/musclewiki-service';

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
  // MuscleWiki-specific fields
  musclewikiId?: string;
  difficulty?: string;
  force?: string;
  mechanic?: string;
  category?: string;
  // Video URLs for lazy loading
  maleVideoFrontUrl?: string;
  maleVideoSideUrl?: string;
  femaleVideoFrontUrl?: string;
  femaleVideoSideUrl?: string;
  // Source tracking
  source: 'musclewiki' | 'custom';
  isCacheValid?: boolean;
  // Raw thumbnail URL from cache (not proxied yet) - use with useExerciseThumbnails hook
  rawThumbnailUrl?: string;
};

export type ExerciseFilters = {
  hideCustom?: boolean;
  hideMuscleWiki?: boolean;
  muscles?: string[];
  types?: string[];
  categories?: string[];
  difficulties?: string[];
  equipments?: string[];
  forces?: string[];
  mechanics?: string[];
};

export type ExerciseSearchResult = {
  exercises: Exercise[];
  total: number;
  fromCache: boolean;
  filters: {
    categories: { value: string; label: string }[];
    muscles: { value: string; label: string }[];
    difficulties: { value: string; label: string }[];
    forces: { value: string; label: string }[];
    mechanics: { value: string; label: string }[];
  };
};

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Transform MuscleWiki exercise to our unified format
 * Note: imageUrl is set to placeholder - use rawThumbnailUrl with useExerciseThumbnails hook
 */
const transformMuscleWikiExercise = (mwExercise: MuscleWikiExercise): Exercise => {
  return {
    exerciseId: mwExercise.musclewikiId || mwExercise.id,
    musclewikiId: mwExercise.musclewikiId,
    name: mwExercise.name,
    // Store raw thumbnail URL - will be bulk-loaded via useExerciseThumbnails hook
    rawThumbnailUrl: mwExercise.thumbnailUrl,
    imageUrl: '',
    equipments: mwExercise.category ? [mwExercise.category] : [],
    bodyParts: mwExercise.targetMuscles.slice(0, 1), // Primary body part
    exerciseType: 'weight_reps', // Default, could be inferred
    targetMuscles: mwExercise.targetMuscles,
    secondaryMuscles: [...mwExercise.synergistMuscles, ...mwExercise.stabilizerMuscles],
    videoUrl: mwExercise.maleVideoFrontUrl || '',
    keywords: [
      mwExercise.name,
      mwExercise.category,
      mwExercise.difficulty,
      ...mwExercise.targetMuscles,
    ].filter(Boolean) as string[],
    overview: '', // MuscleWiki doesn't have overview, could use instructions[0]
    instructions: mwExercise.instructions,
    exerciseTips: mwExercise.tips,
    variations: [],
    relatedExerciseIds: [],
    difficulty: mwExercise.difficulty,
    force: mwExercise.force,
    mechanic: mwExercise.mechanic,
    category: mwExercise.category,
    maleVideoFrontUrl: mwExercise.maleVideoFrontUrl,
    maleVideoSideUrl: mwExercise.maleVideoSideUrl,
    femaleVideoFrontUrl: mwExercise.femaleVideoFrontUrl,
    femaleVideoSideUrl: mwExercise.femaleVideoSideUrl,
    source: 'musclewiki',
    isCacheValid: mwExercise.isCacheValid,
  };
};

/**
 * Fuzzy matching for local search
 */
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

// ============================================================================
// PUBLIC API
// ============================================================================

export type ExerciseSearchPaginatedResult = {
  exercises: Exercise[];
  total: number;
  hasMore: boolean;
  limit: number;
  offset: number;
};

export type QuickSearchResult = {
  exercises: Exercise[];
  total: number;
};

/**
 * Quick search for exercises using MuscleWiki's /search endpoint
 * Optimized for search bar autocomplete with relevance-scored results
 * 
 * @param query - Search term (minimum 2 characters)
 * @param limit - Maximum results (default 10)
 * @returns QuickSearchResult with exercises
 */
export const quickSearchExercises = async (
  query: string,
  limit: number = 10
): Promise<QuickSearchResult> => {
  if (!query || query.length < 2) {
    return { exercises: [], total: 0 };
  }

  try {
    const result = await quickSearchMuscleWiki(query, limit);
    const exercises = result.exercises.map(transformMuscleWikiExercise);
    return { exercises, total: result.total };
  } catch (error) {
    console.error('Failed to quick search exercises:', error);
    return { exercises: [], total: 0 };
  }
};

/**
 * List/filter exercises from MuscleWiki cache
 * Use this for browsing with filters, NOT for search bar autocomplete
 *
 * @param query - Search query string (passed to backend for filtering)
 * @param filters - Filter options
 * @param options - Additional options like pagination
 * @returns ExerciseSearchPaginatedResult with exercises and metadata
 */
export const searchExercises = async (
  query: string = '',
  filters?: ExerciseFilters,
  options?: { limit?: number; offset?: number }
): Promise<ExerciseSearchPaginatedResult> => {
  const normalizedQuery = query.trim().toLowerCase();
  const limit = options?.limit || 100;
  const offset = options?.offset || 0;

  // Build MuscleWiki filter params
  const mwFilters: MuscleWikiSearchFilters = {
    searchTerm: normalizedQuery || undefined,
    limit,
    offset,
  };

  // Map our filters to MuscleWiki filters
  if (filters?.categories?.length) {
    mwFilters.category = filters.categories[0]; // MuscleWiki only supports single category
  }
  if (filters?.difficulties?.length) {
    mwFilters.difficulty = filters.difficulties[0];
  }
  if (filters?.muscles?.length) {
    mwFilters.muscle = filters.muscles[0];
  }

  // Fetch from MuscleWiki (cache-first approach happens inside the service)
  let muscleWikiResults: Exercise[] = [];
  let total = 0;
  let hasMore = false;

  if (!filters?.hideMuscleWiki) {
    try {
      const mwResult = await searchMuscleWikiExercises(mwFilters);
      muscleWikiResults = mwResult.exercises.map(transformMuscleWikiExercise);
      total = mwResult.total;
      hasMore = mwResult.hasMore;
    } catch (error) {
      console.error('Failed to fetch MuscleWiki exercises:', error);
    }
  }

  // Apply additional local filters that MuscleWiki doesn't support
  let results = muscleWikiResults;

  if (filters) {
    // Filter by equipment (MuscleWiki category maps to equipment)
    if (filters.equipments && filters.equipments.length > 0) {
      results = results.filter((ex) =>
        ex.equipments.some((eq) => filters.equipments?.includes(eq))
      );
    }

    // Filter by exercise type
    if (filters.types && filters.types.length > 0) {
      results = results.filter((ex) => filters.types?.includes(ex.exerciseType));
    }

    // Filter by force
    if (filters.forces && filters.forces.length > 0) {
      results = results.filter((ex) =>
        ex.force && filters.forces?.includes(ex.force)
      );
    }

    // Filter by mechanic
    if (filters.mechanics && filters.mechanics.length > 0) {
      results = results.filter((ex) =>
        ex.mechanic && filters.mechanics?.includes(ex.mechanic)
      );
    }

    // Additional muscle filtering (for muscles beyond the primary)
    if (filters.muscles && filters.muscles.length > 0) {
      results = results.filter((ex) =>
        ex.targetMuscles.some((m) => filters.muscles?.includes(m)) ||
        ex.bodyParts.some((bp) => filters.muscles?.includes(bp))
      );
    }
  }

  return {
    exercises: results,
    total,
    hasMore,
    limit,
    offset,
  };
};

/**
 * Get a single exercise by ID
 *
 * @param exerciseId - The exercise ID (MuscleWiki ID or custom ID)
 * @returns Exercise or null if not found
 */
export const getExerciseById = async (exerciseId: string): Promise<Exercise | null> => {
  // Try MuscleWiki first
  try {
    const mwExercise = await getMuscleWikiExerciseById(exerciseId);
    if (mwExercise) {
      return transformMuscleWikiExercise(mwExercise);
    }
  } catch (error) {
    console.error('Failed to fetch exercise from MuscleWiki:', error);
  }

  return null;
};

/**
 * Get exercise videos - call this only when user clicks to watch
 * This enables lazy loading of video URLs to minimize API calls
 *
 * @param exerciseId - The MuscleWiki exercise ID
 * @returns Video URLs or null
 */
export const getExerciseVideos = async (
  exerciseId: string
): Promise<{
  maleVideoFrontUrl?: string;
  maleVideoSideUrl?: string;
  femaleVideoFrontUrl?: string;
  femaleVideoSideUrl?: string;
} | null> => {
  return getMuscleWikiVideos(exerciseId);
};

/**
 * Get all available filter options
 * These are cached for 30 days to minimize API calls
 *
 * @returns Filter options for categories, muscles, difficulties, etc.
 */
export const getExerciseFilterOptions = async (): Promise<{
  categories: { value: string; label: string }[];
  muscles: { value: string; label: string }[];
  difficulties: { value: string; label: string }[];
  forces: { value: string; label: string }[];
  mechanics: { value: string; label: string }[];
}> => {
  try {
    const options = await getAllFilterOptions();
    return {
      categories: options.categories.map((c) => ({ value: c.value, label: c.label })),
      muscles: options.muscles.map((m) => ({ value: m.value, label: m.label })),
      difficulties: options.difficulties.map((d) => ({ value: d.value, label: d.label })),
      forces: options.forces.map((f) => ({ value: f.value, label: f.label })),
      mechanics: options.mechanics.map((m) => ({ value: m.value, label: m.label })),
    };
  } catch (error) {
    console.error('Failed to fetch filter options:', error);
    // Return defaults
    return {
      categories: [
        { value: 'Barbell', label: 'Barbell' },
        { value: 'Dumbbell', label: 'Dumbbell' },
        { value: 'Machine', label: 'Machine' },
        { value: 'Cable', label: 'Cable' },
        { value: 'Bodyweight', label: 'Bodyweight' },
      ],
      muscles: [
        { value: 'Chest', label: 'Chest' },
        { value: 'Back', label: 'Back' },
        { value: 'Shoulders', label: 'Shoulders' },
        { value: 'Biceps', label: 'Biceps' },
        { value: 'Triceps', label: 'Triceps' },
        { value: 'Quadriceps', label: 'Quadriceps' },
        { value: 'Hamstrings', label: 'Hamstrings' },
        { value: 'Glutes', label: 'Glutes' },
        { value: 'Core', label: 'Core' },
        { value: 'Calves', label: 'Calves' },
      ],
      difficulties: [
        { value: 'Beginner', label: 'Beginner' },
        { value: 'Intermediate', label: 'Intermediate' },
        { value: 'Advanced', label: 'Advanced' },
      ],
      forces: [
        { value: 'Push', label: 'Push' },
        { value: 'Pull', label: 'Pull' },
        { value: 'Static', label: 'Static' },
      ],
      mechanics: [
        { value: 'Compound', label: 'Compound' },
        { value: 'Isolation', label: 'Isolation' },
      ],
    };
  }
};

/**
 * Synchronous search for cached exercises only (client-side)
 * Use this for quick filtering in the UI without API calls
 *
 * @param exercises - Array of already-loaded exercises
 * @param query - Search query
 * @param filters - Filter options
 * @returns Filtered exercises
 */
export const filterExercisesLocally = (
  exercises: Exercise[],
  query: string = '',
  filters?: ExerciseFilters
): Exercise[] => {
  const normalizedQuery = query.trim().toLowerCase();

  let results = exercises;

  // Apply text search
  if (normalizedQuery) {
    results = results.filter((exercise) => {
      const matchesName = isFuzzyMatch(exercise.name, normalizedQuery);
      const matchesBodyPart = exercise.bodyParts.some((part) =>
        isFuzzyMatch(part, normalizedQuery)
      );
      const matchesEquipment = exercise.equipments.some((equipment) =>
        isFuzzyMatch(equipment, normalizedQuery)
      );
      const matchesTargetMuscle = exercise.targetMuscles.some((muscle) =>
        isFuzzyMatch(muscle, normalizedQuery)
      );
      const matchesKeyword = exercise.keywords.some((keyword) =>
        isFuzzyMatch(keyword, normalizedQuery)
      );

      return (
        matchesName ||
        matchesBodyPart ||
        matchesEquipment ||
        matchesTargetMuscle ||
        matchesKeyword
      );
    });
  }

  // Apply filters
  if (filters) {
    if (filters.hideCustom) {
      results = results.filter((ex) => ex.source === 'musclewiki');
    }

    if (filters.hideMuscleWiki) {
      results = results.filter((ex) => ex.source === 'custom');
    }

    if (filters.muscles && filters.muscles.length > 0) {
      results = results.filter(
        (ex) =>
          ex.targetMuscles.some((m) => filters.muscles?.includes(m)) ||
          ex.bodyParts.some((bp) => filters.muscles?.includes(bp))
      );
    }

    if (filters.types && filters.types.length > 0) {
      results = results.filter((ex) => filters.types?.includes(ex.exerciseType));
    }

    if (filters.categories && filters.categories.length > 0) {
      results = results.filter((ex) =>
        ex.category && filters.categories?.includes(ex.category)
      );
    }

    if (filters.equipments && filters.equipments.length > 0) {
      results = results.filter((ex) =>
        ex.equipments.some((eq) => filters.equipments?.includes(eq))
      );
    }

    if (filters.difficulties && filters.difficulties.length > 0) {
      results = results.filter((ex) =>
        ex.difficulty && filters.difficulties?.includes(ex.difficulty)
      );
    }

    if (filters.forces && filters.forces.length > 0) {
      results = results.filter((ex) =>
        ex.force && filters.forces?.includes(ex.force)
      );
    }

    if (filters.mechanics && filters.mechanics.length > 0) {
      results = results.filter((ex) =>
        ex.mechanic && filters.mechanics?.includes(ex.mechanic)
      );
    }
  }

  return results;
};
