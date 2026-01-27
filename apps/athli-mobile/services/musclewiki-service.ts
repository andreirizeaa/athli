/**
 * MuscleWiki Service for Mobile App
 *
 * This service calls the athli-web-api backend for all exercise data.
 * All MuscleWiki API interactions are handled by the backend with caching.
 */

import { apiFetch, type ApiResponse } from '@/lib/api-client';

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
  maleVideoFrontUrl?: string;
  maleVideoSideUrl?: string;
  femaleVideoFrontUrl?: string;
  femaleVideoSideUrl?: string;
  source: 'musclewiki' | 'custom';
  isCacheValid?: boolean;
};

export type ExerciseFilters = {
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
// HELPERS
// ============================================================================

/**
 * Transform MuscleWiki exercise from API to app format
 */
const transformExercise = (mwExercise: MuscleWikiExercise): Exercise => {
  return {
    exerciseId: mwExercise.musclewikiId || mwExercise.id,
    musclewikiId: mwExercise.musclewikiId,
    name: mwExercise.name,
    imageUrl: mwExercise.thumbnailUrl || '',
    equipments: mwExercise.category ? [mwExercise.category] : [],
    bodyParts: mwExercise.targetMuscles.slice(0, 1),
    exerciseType: 'weight_reps',
    targetMuscles: mwExercise.targetMuscles,
    secondaryMuscles: [...mwExercise.synergistMuscles, ...mwExercise.stabilizerMuscles],
    videoUrl: mwExercise.maleVideoFrontUrl || '',
    keywords: [mwExercise.name, mwExercise.category, mwExercise.difficulty, ...mwExercise.targetMuscles].filter(Boolean) as string[],
    overview: '',
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

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Search exercises via backend API
 *
 * @param filters - Search filters including category, muscle, difficulty, etc.
 * @param filters.gender - Filter for male or female specific exercise demonstrations
 *                         Pass this based on the client's gender for personalized videos
 */
export const searchExercises = async (filters: ExerciseFilters = {}): Promise<Exercise[]> => {
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
        'X-Request-Source': 'mobile_app',
      },
    });

    const exercises = response.data?.exercises || [];
    return exercises.map(transformExercise);
  } catch (error) {
    console.error('Failed to search exercises:', error);
    return [];
  }
};

/**
 * Get a single exercise by ID via backend API
 */
export const getExerciseById = async (musclewikiId: string): Promise<Exercise | null> => {
  try {
    const response = await apiFetch<ApiResponse<{ exercise: MuscleWikiExercise }>>(
      `/exercises/${musclewikiId}`,
      {
        headers: {
          'X-Request-Source': 'mobile_app',
        },
      }
    );

    const exercise = response.data?.exercise;
    return exercise ? transformExercise(exercise) : null;
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
        'X-Request-Source': 'mobile_app',
      },
    });

    return response.data?.videos || null;
  } catch (error) {
    console.error('Failed to get exercise videos:', error);
    return null;
  }
};

/**
 * Get available filter options via backend API
 */
export const getFilterOptions = async (
  filterType: 'category' | 'muscle' | 'difficulty' | 'force' | 'mechanic'
): Promise<{ value: string; label: string }[]> => {
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
 * Get all filter options via backend API
 */
export const getAllFilterOptions = async (): Promise<{
  categories: { value: string; label: string }[];
  muscles: { value: string; label: string }[];
  difficulties: { value: string; label: string }[];
  forces: { value: string; label: string }[];
  mechanics: { value: string; label: string }[];
}> => {
  try {
    const response = await apiFetch<ApiResponse<{
      filters: {
        categories: { value: string; label: string }[];
        muscles: { value: string; label: string }[];
        difficulties: { value: string; label: string }[];
        forces: { value: string; label: string }[];
        mechanics: { value: string; label: string }[];
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
    // Return defaults on error - values are capitalized as returned by MuscleWiki API
    return {
      categories: [
        { value: 'Band', label: 'Band' },
        { value: 'Barbell', label: 'Barbell' },
        { value: 'Bodyweight', label: 'Bodyweight' },
        { value: 'Bosu-Ball', label: 'Bosu Ball' },
        { value: 'Cables', label: 'Cables' },
        { value: 'Cardio', label: 'Cardio' },
        { value: 'Dumbbells', label: 'Dumbbells' },
        { value: 'Kettlebells', label: 'Kettlebells' },
        { value: 'Machine', label: 'Machine' },
        { value: 'Medicine-Ball', label: 'Medicine Ball' },
        { value: 'Plate', label: 'Plate' },
        { value: 'Recovery', label: 'Recovery' },
        { value: 'Smith-Machine', label: 'Smith Machine' },
        { value: 'Stretches', label: 'Stretches' },
        { value: 'TRX', label: 'TRX' },
        { value: 'Vitruvian', label: 'Vitruvian' },
        { value: 'Yoga', label: 'Yoga' },
      ],
      muscles: [
        { value: 'Chest', label: 'Chest' },
        { value: 'Back', label: 'Back' },
        { value: 'Shoulders', label: 'Shoulders' },
        { value: 'Biceps', label: 'Biceps' },
        { value: 'Triceps', label: 'Triceps' },
        { value: 'Forearms', label: 'Forearms' },
        { value: 'Quadriceps', label: 'Quadriceps' },
        { value: 'Hamstrings', label: 'Hamstrings' },
        { value: 'Glutes', label: 'Glutes' },
        { value: 'Calves', label: 'Calves' },
        { value: 'Abs', label: 'Abs' },
        { value: 'Lower Back', label: 'Lower Back' },
        { value: 'Traps', label: 'Traps' },
        { value: 'Lats', label: 'Lats' },
      ],
      difficulties: [
        { value: 'Novice', label: 'Novice' },
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
