/**
 * MuscleWiki Service for Mobile App
 *
 * This service provides exercise data from MuscleWiki API with caching.
 * It uses a cache-first approach to minimize API calls.
 *
 * The caching is handled by the Supabase backend - this service reads
 * from the cached data.
 */

import { supabase } from './auth/supabase-auth';

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
  searchTerm?: string;
  limit?: number;
  offset?: number;
};

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Transform cached exercise data to our app format
 */
const transformCachedExercise = (row: any): Exercise => {
  return {
    exerciseId: row.musclewiki_id || row.id,
    musclewikiId: row.musclewiki_id,
    name: row.name,
    imageUrl: row.thumbnail_url || '',
    equipments: row.category ? [row.category] : [],
    bodyParts: (row.target_muscles || []).slice(0, 1),
    exerciseType: 'weight_reps',
    targetMuscles: row.target_muscles || [],
    secondaryMuscles: [...(row.synergist_muscles || []), ...(row.stabilizer_muscles || [])],
    videoUrl: row.male_video_front_url || '',
    keywords: [row.name, row.category, row.difficulty, ...(row.target_muscles || [])].filter(Boolean),
    overview: '',
    instructions: row.instructions || [],
    exerciseTips: row.tips || [],
    variations: [],
    relatedExerciseIds: [],
    difficulty: row.difficulty,
    force: row.force,
    mechanic: row.mechanic,
    category: row.category,
    maleVideoFrontUrl: row.male_video_front_url,
    maleVideoSideUrl: row.male_video_side_url,
    femaleVideoFrontUrl: row.female_video_front_url,
    femaleVideoSideUrl: row.female_video_side_url,
    source: 'musclewiki',
    isCacheValid: new Date(row.cache_expires_at) > new Date(),
  };
};

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Search exercises from MuscleWiki cache
 *
 * @param filters - Search and filter options
 * @returns Array of exercises
 */
export const searchExercises = async (filters: ExerciseFilters = {}): Promise<Exercise[]> => {
  const { category, difficulty, muscle, searchTerm, limit = 50, offset = 0 } = filters;

  let query = supabase
    .from('musclewiki_exercise_cache')
    .select('*')
    .gt('cache_expires_at', new Date().toISOString());

  if (category) {
    query = query.eq('category', category);
  }
  if (difficulty) {
    query = query.eq('difficulty', difficulty);
  }
  if (muscle) {
    query = query.contains('target_muscles', [muscle]);
  }
  if (searchTerm) {
    query = query.ilike('name', `%${searchTerm}%`);
  }

  query = query.order('name').range(offset, offset + limit - 1);

  const { data, error } = await query;

  if (error) {
    console.error('Failed to fetch exercises:', error);
    return [];
  }

  // Log cache hit
  try {
    await supabase.rpc('log_musclewiki_api_call', {
      p_endpoint: '/exercises (mobile cache)',
      p_cache_hit: true,
      p_exercises_returned: data?.length || 0,
      p_request_source: 'mobile_app',
    });
  } catch (logError) {
    console.warn('Failed to log API call:', logError);
  }

  return (data || []).map(transformCachedExercise);
};

/**
 * Get a single exercise by ID
 *
 * @param musclewikiId - The MuscleWiki exercise ID
 * @returns Exercise or null
 */
export const getExerciseById = async (musclewikiId: string): Promise<Exercise | null> => {
  // Record access for analytics
  try {
    await supabase.rpc('record_musclewiki_exercise_access', {
      p_musclewiki_id: musclewikiId,
    });
  } catch (error) {
    console.warn('Failed to record access:', error);
  }

  const { data, error } = await supabase
    .from('musclewiki_exercise_cache')
    .select('*')
    .eq('musclewiki_id', musclewikiId)
    .single();

  if (error || !data) {
    console.error('Failed to fetch exercise:', error);
    return null;
  }

  return transformCachedExercise(data);
};

/**
 * Get exercise video URLs
 * Called when user clicks to watch a video
 *
 * @param musclewikiId - The MuscleWiki exercise ID
 * @returns Video URLs or null
 */
export const getExerciseVideos = async (
  musclewikiId: string
): Promise<{
  maleVideoFrontUrl?: string;
  maleVideoSideUrl?: string;
  femaleVideoFrontUrl?: string;
  femaleVideoSideUrl?: string;
} | null> => {
  const { data, error } = await supabase
    .from('musclewiki_exercise_cache')
    .select('male_video_front_url, male_video_side_url, female_video_front_url, female_video_side_url')
    .eq('musclewiki_id', musclewikiId)
    .single();

  if (error || !data) {
    return null;
  }

  return {
    maleVideoFrontUrl: data.male_video_front_url,
    maleVideoSideUrl: data.male_video_side_url,
    femaleVideoFrontUrl: data.female_video_front_url,
    femaleVideoSideUrl: data.female_video_side_url,
  };
};

/**
 * Get available filter options from cache
 *
 * @param filterType - The type of filter (category, muscle, difficulty, etc.)
 * @returns Array of filter options
 */
export const getFilterOptions = async (
  filterType: 'category' | 'muscle' | 'difficulty' | 'force' | 'mechanic'
): Promise<{ value: string; label: string }[]> => {
  const { data, error } = await supabase
    .from('musclewiki_filter_cache')
    .select('filter_value, display_label')
    .eq('filter_type', filterType)
    .gt('cache_expires_at', new Date().toISOString())
    .order('sort_order');

  if (error || !data) {
    return getDefaultFilterOptions(filterType);
  }

  return data.map((row) => ({
    value: row.filter_value,
    label: row.display_label,
  }));
};

/**
 * Get all filter options at once
 */
export const getAllFilterOptions = async (): Promise<{
  categories: { value: string; label: string }[];
  muscles: { value: string; label: string }[];
  difficulties: { value: string; label: string }[];
  forces: { value: string; label: string }[];
  mechanics: { value: string; label: string }[];
}> => {
  const [categories, muscles, difficulties, forces, mechanics] = await Promise.all([
    getFilterOptions('category'),
    getFilterOptions('muscle'),
    getFilterOptions('difficulty'),
    getFilterOptions('force'),
    getFilterOptions('mechanic'),
  ]);

  return { categories, muscles, difficulties, forces, mechanics };
};

// ============================================================================
// FALLBACK OPTIONS
// ============================================================================

const getDefaultFilterOptions = (
  filterType: 'category' | 'muscle' | 'difficulty' | 'force' | 'mechanic'
): { value: string; label: string }[] => {
  const defaults: Record<string, { value: string; label: string }[]> = {
    category: [
      { value: 'Barbell', label: 'Barbell' },
      { value: 'Dumbbell', label: 'Dumbbell' },
      { value: 'Machine', label: 'Machine' },
      { value: 'Cable', label: 'Cable' },
      { value: 'Bodyweight', label: 'Bodyweight' },
      { value: 'Kettlebell', label: 'Kettlebell' },
    ],
    muscle: [
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
    difficulty: [
      { value: 'Beginner', label: 'Beginner' },
      { value: 'Intermediate', label: 'Intermediate' },
      { value: 'Advanced', label: 'Advanced' },
    ],
    force: [
      { value: 'Push', label: 'Push' },
      { value: 'Pull', label: 'Pull' },
      { value: 'Static', label: 'Static' },
    ],
    mechanic: [
      { value: 'Compound', label: 'Compound' },
      { value: 'Isolation', label: 'Isolation' },
    ],
  };

  return defaults[filterType] || [];
};
