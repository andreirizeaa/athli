/**
 * MuscleWiki Service
 *
 * This service handles all MuscleWiki API interactions with a strict cache-first approach.
 * All API calls are logged for compliance auditing.
 *
 * Environment Variables Required:
 * - MUSCLEWIKI_API_KEY: RapidAPI key for MuscleWiki
 * - MUSCLEWIKI_API_HOST: API host (default: musclewiki-api.p.rapidapi.com)
 */

import { getSupabaseClient } from './supabase.service';
import { logger } from '../utils/logger';

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
  searchTerm?: string;
  limit?: number;
  offset?: number;
};

type ApiAuditLogParams = {
  endpoint: string;
  method?: string;
  queryParams?: Record<string, any>;
  responseStatus?: number;
  responseSizeBytes?: number;
  exercisesReturned?: number;
  cacheHit: boolean;
  cacheMissReason?: string;
  requestSource?: string;
  userId?: string;
  requestDurationMs?: number;
  rateLimitRemaining?: number;
  rateLimitResetAt?: string;
};

// ============================================================================
// CONFIGURATION
// ============================================================================

const MUSCLEWIKI_API_BASE_URL = 'https://musclewiki-api.p.rapidapi.com';
const CACHE_DURATION_DAYS = 7;
const FILTER_CACHE_DURATION_DAYS = 30;

// ============================================================================
// INTERNAL HELPERS
// ============================================================================

/**
 * Get MuscleWiki API headers from environment variables
 */
const getApiHeaders = (): HeadersInit => {
  const apiKey = process.env.MUSCLEWIKI_API_KEY;
  const apiHost = process.env.MUSCLEWIKI_API_HOST || 'musclewiki-api.p.rapidapi.com';

  if (!apiKey) {
    throw new Error('MUSCLEWIKI_API_KEY environment variable is not set');
  }

  return {
    'X-RapidAPI-Key': apiKey,
    'X-RapidAPI-Host': apiHost,
    'Content-Type': 'application/json',
  };
};

/**
 * Log an API call to the audit table
 */
const logApiCall = async (params: ApiAuditLogParams): Promise<void> => {
  try {
    const supabase = getSupabaseClient();
    await supabase.rpc('log_musclewiki_api_call', {
      p_endpoint: params.endpoint,
      p_method: params.method || 'GET',
      p_query_params: params.queryParams ? JSON.stringify(params.queryParams) : null,
      p_response_status: params.responseStatus,
      p_response_size_bytes: params.responseSizeBytes,
      p_exercises_returned: params.exercisesReturned || 0,
      p_cache_hit: params.cacheHit,
      p_cache_miss_reason: params.cacheMissReason,
      p_request_source: params.requestSource || 'api',
      p_user_id: params.userId,
      p_request_duration_ms: params.requestDurationMs,
      p_rate_limit_remaining: params.rateLimitRemaining,
      p_rate_limit_reset_at: params.rateLimitResetAt,
    });
  } catch (error) {
    logger.error({ error }, 'Failed to log MuscleWiki API call');
  }
};

/**
 * Transform raw API response to our exercise format
 */
const transformApiExercise = (raw: any): Partial<MuscleWikiExercise> => {
  return {
    musclewikiId: raw.id?.toString() || raw.slug,
    name: raw.name || raw.exercise_name,
    nameAlternative: raw.name_alternative,
    slug: raw.slug,
    category: raw.category || raw.equipment,
    difficulty: raw.difficulty || raw.level,
    force: raw.force,
    mechanic: raw.mechanic,
    targetMuscles: Array.isArray(raw.target_muscles)
      ? raw.target_muscles.map((m: any) => m.name || m)
      : raw.target?.split(',').map((s: string) => s.trim()) || [],
    synergistMuscles: Array.isArray(raw.synergist_muscles)
      ? raw.synergist_muscles.map((m: any) => m.name || m)
      : [],
    stabilizerMuscles: Array.isArray(raw.stabilizer_muscles)
      ? raw.stabilizer_muscles.map((m: any) => m.name || m)
      : [],
    instructions: Array.isArray(raw.instructions)
      ? raw.instructions
      : raw.instructions?.split('\n').filter(Boolean) || [],
    tips: Array.isArray(raw.tips)
      ? raw.tips
      : raw.tips?.split('\n').filter(Boolean) || [],
    thumbnailUrl: raw.thumbnail_url || raw.image_url || raw.og_image,
    maleVideoFrontUrl: raw.male_video_front_url || raw.video_url_male_front,
    maleVideoSideUrl: raw.male_video_side_url || raw.video_url_male_side,
    femaleVideoFrontUrl: raw.female_video_front_url || raw.video_url_female_front,
    femaleVideoSideUrl: raw.female_video_side_url || raw.video_url_female_side,
    imageUrls: raw.images || raw.image_urls || [],
  };
};

/**
 * Transform database row to our exercise format
 */
const transformCachedExercise = (row: any): MuscleWikiExercise => {
  return {
    id: row.id,
    musclewikiId: row.musclewiki_id,
    name: row.name,
    nameAlternative: row.name_alternative,
    slug: row.slug,
    category: row.category,
    difficulty: row.difficulty,
    force: row.force,
    mechanic: row.mechanic,
    targetMuscles: row.target_muscles || [],
    synergistMuscles: row.synergist_muscles || [],
    stabilizerMuscles: row.stabilizer_muscles || [],
    instructions: row.instructions || [],
    tips: row.tips || [],
    thumbnailUrl: row.thumbnail_url,
    maleVideoFrontUrl: row.male_video_front_url,
    maleVideoSideUrl: row.male_video_side_url,
    femaleVideoFrontUrl: row.female_video_front_url,
    femaleVideoSideUrl: row.female_video_side_url,
    imageUrls: row.image_urls || [],
    isCacheValid: new Date(row.cache_expires_at) > new Date(),
    cachedAt: row.cached_at,
  };
};

// ============================================================================
// MUSCLEWIKI SERVICE CLASS
// ============================================================================

class MuscleWikiService {
  /**
   * Search exercises with cache-first approach
   */
  async searchExercises(
    filters: MuscleWikiSearchFilters = {},
    requestSource: string = 'api',
    userId?: string
  ): Promise<MuscleWikiExercise[]> {
    const supabase = getSupabaseClient();
    const startTime = Date.now();

    const {
      category,
      difficulty,
      muscle,
      searchTerm,
      limit = 50,
      offset = 0,
    } = filters;

    // Step 1: Try to get from cache
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

    const { data: cachedData, error: cacheError } = await query;

    if (!cacheError && cachedData && cachedData.length > 0) {
      // Cache hit - log and return
      await logApiCall({
        endpoint: '/exercises (cache)',
        cacheHit: true,
        exercisesReturned: cachedData.length,
        requestDurationMs: Date.now() - startTime,
        requestSource,
        userId,
      });

      return cachedData.map(transformCachedExercise);
    }

    // Step 2: Cache miss - check if we should fetch from API
    const apiKey = process.env.MUSCLEWIKI_API_KEY;
    if (!apiKey) {
      logger.warn('MUSCLEWIKI_API_KEY not configured, returning empty results');
      await logApiCall({
        endpoint: '/exercises',
        cacheHit: false,
        cacheMissReason: 'api_key_not_configured',
        exercisesReturned: 0,
        requestDurationMs: Date.now() - startTime,
        requestSource,
        userId,
      });
      return [];
    }

    // Step 3: Fetch from MuscleWiki API
    try {
      const queryParams: Record<string, string> = {};
      if (category) queryParams.category = category;
      if (difficulty) queryParams.difficulty = difficulty;
      if (muscle) queryParams.muscle = muscle;
      if (searchTerm) queryParams.search = searchTerm;

      const queryString = new URLSearchParams(queryParams).toString();
      const url = `${MUSCLEWIKI_API_BASE_URL}/exercises${queryString ? `?${queryString}` : ''}`;

      logger.info({ url, queryParams }, 'Fetching from MuscleWiki API');

      const response = await fetch(url, {
        method: 'GET',
        headers: getApiHeaders(),
      });

      const responseData = await response.json();
      const exercises = Array.isArray(responseData)
        ? responseData
        : responseData.exercises || responseData.data || [];

      // Log the API call
      await logApiCall({
        endpoint: '/exercises',
        queryParams,
        responseStatus: response.status,
        responseSizeBytes: JSON.stringify(responseData).length,
        exercisesReturned: exercises.length,
        cacheHit: false,
        cacheMissReason: cachedData?.length === 0 ? 'not_cached' : 'expired',
        requestDurationMs: Date.now() - startTime,
        rateLimitRemaining: parseInt(response.headers.get('x-ratelimit-remaining') || '0', 10),
        requestSource,
        userId,
      });

      // Step 4: Cache the results
      if (exercises.length > 0) {
        const cacheExpiry = new Date();
        cacheExpiry.setDate(cacheExpiry.getDate() + CACHE_DURATION_DAYS);

        for (const exercise of exercises) {
          const transformed = transformApiExercise(exercise);
          await supabase.from('musclewiki_exercise_cache').upsert(
            {
              musclewiki_id: transformed.musclewikiId,
              name: transformed.name,
              name_alternative: transformed.nameAlternative,
              slug: transformed.slug,
              category: transformed.category,
              difficulty: transformed.difficulty,
              force: transformed.force,
              mechanic: transformed.mechanic,
              target_muscles: transformed.targetMuscles,
              synergist_muscles: transformed.synergistMuscles,
              stabilizer_muscles: transformed.stabilizerMuscles,
              instructions: transformed.instructions,
              tips: transformed.tips,
              thumbnail_url: transformed.thumbnailUrl,
              male_video_front_url: transformed.maleVideoFrontUrl,
              male_video_side_url: transformed.maleVideoSideUrl,
              female_video_front_url: transformed.femaleVideoFrontUrl,
              female_video_side_url: transformed.femaleVideoSideUrl,
              image_urls: transformed.imageUrls,
              raw_data: exercise,
              cached_at: new Date().toISOString(),
              cache_expires_at: cacheExpiry.toISOString(),
            },
            { onConflict: 'musclewiki_id' }
          );
        }
      }

      // Return transformed exercises
      return exercises.slice(offset, offset + limit).map((ex: any) => ({
        id: '',
        ...transformApiExercise(ex),
        isCacheValid: true,
        cachedAt: new Date().toISOString(),
      })) as MuscleWikiExercise[];
    } catch (error) {
      logger.error({ error }, 'Failed to fetch from MuscleWiki API');
      await logApiCall({
        endpoint: '/exercises',
        cacheHit: false,
        cacheMissReason: 'api_error',
        requestDurationMs: Date.now() - startTime,
        requestSource,
        userId,
      });

      // Return stale cache if available
      const { data: staleData } = await supabase
        .from('musclewiki_exercise_cache')
        .select('*')
        .order('name')
        .range(offset, offset + limit - 1);

      if (staleData) {
        return staleData.map(transformCachedExercise);
      }

      return [];
    }
  }

  /**
   * Get a single exercise by MuscleWiki ID
   */
  async getExerciseById(
    musclewikiId: string,
    requestSource: string = 'api',
    userId?: string
  ): Promise<MuscleWikiExercise | null> {
    const supabase = getSupabaseClient();
    const startTime = Date.now();

    // Record access for analytics
    await supabase.rpc('record_musclewiki_exercise_access', {
      p_musclewiki_id: musclewikiId,
    });

    // Try cache first
    const { data: cached, error } = await supabase
      .from('musclewiki_exercise_cache')
      .select('*')
      .eq('musclewiki_id', musclewikiId)
      .single();

    if (!error && cached) {
      const exercise = transformCachedExercise(cached);

      if (exercise.isCacheValid) {
        await logApiCall({
          endpoint: `/exercises/${musclewikiId} (cache)`,
          cacheHit: true,
          exercisesReturned: 1,
          requestDurationMs: Date.now() - startTime,
          requestSource,
          userId,
        });
        return exercise;
      }
    }

    // Cache miss or expired - fetch from API if key available
    const apiKey = process.env.MUSCLEWIKI_API_KEY;
    if (!apiKey) {
      return cached ? transformCachedExercise(cached) : null;
    }

    try {
      const url = `${MUSCLEWIKI_API_BASE_URL}/exercises/${musclewikiId}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: getApiHeaders(),
      });

      if (!response.ok) {
        throw new Error(`API responded with ${response.status}`);
      }

      const data = await response.json();

      await logApiCall({
        endpoint: `/exercises/${musclewikiId}`,
        responseStatus: response.status,
        cacheHit: false,
        cacheMissReason: cached ? 'expired' : 'not_cached',
        exercisesReturned: 1,
        requestDurationMs: Date.now() - startTime,
        requestSource,
        userId,
      });

      // Update cache
      const transformed = transformApiExercise(data);
      const cacheExpiry = new Date();
      cacheExpiry.setDate(cacheExpiry.getDate() + CACHE_DURATION_DAYS);

      await supabase.from('musclewiki_exercise_cache').upsert(
        {
          musclewiki_id: transformed.musclewikiId,
          name: transformed.name,
          name_alternative: transformed.nameAlternative,
          slug: transformed.slug,
          category: transformed.category,
          difficulty: transformed.difficulty,
          force: transformed.force,
          mechanic: transformed.mechanic,
          target_muscles: transformed.targetMuscles,
          synergist_muscles: transformed.synergistMuscles,
          stabilizer_muscles: transformed.stabilizerMuscles,
          instructions: transformed.instructions,
          tips: transformed.tips,
          thumbnail_url: transformed.thumbnailUrl,
          male_video_front_url: transformed.maleVideoFrontUrl,
          male_video_side_url: transformed.maleVideoSideUrl,
          female_video_front_url: transformed.femaleVideoFrontUrl,
          female_video_side_url: transformed.femaleVideoSideUrl,
          image_urls: transformed.imageUrls,
          raw_data: data,
          cached_at: new Date().toISOString(),
          cache_expires_at: cacheExpiry.toISOString(),
        },
        { onConflict: 'musclewiki_id' }
      );

      return {
        id: '',
        ...transformed,
        isCacheValid: true,
        cachedAt: new Date().toISOString(),
      } as MuscleWikiExercise;
    } catch (error) {
      logger.error({ error, musclewikiId }, 'Failed to fetch exercise from API');
      return cached ? transformCachedExercise(cached) : null;
    }
  }

  /**
   * Get exercise video URLs - called only when user wants to watch
   */
  async getExerciseVideos(
    musclewikiId: string,
    requestSource: string = 'api',
    userId?: string
  ): Promise<{
    maleVideoFrontUrl?: string;
    maleVideoSideUrl?: string;
    femaleVideoFrontUrl?: string;
    femaleVideoSideUrl?: string;
  } | null> {
    const exercise = await this.getExerciseById(musclewikiId, requestSource, userId);
    if (!exercise) return null;

    return {
      maleVideoFrontUrl: exercise.maleVideoFrontUrl,
      maleVideoSideUrl: exercise.maleVideoSideUrl,
      femaleVideoFrontUrl: exercise.femaleVideoFrontUrl,
      femaleVideoSideUrl: exercise.femaleVideoSideUrl,
    };
  }

  /**
   * Get available filter options (cached)
   */
  async getFilterOptions(
    filterType: 'category' | 'muscle' | 'difficulty' | 'force' | 'mechanic'
  ): Promise<MuscleWikiFilterOption[]> {
    const supabase = getSupabaseClient();

    // Try cache first
    const { data: cached } = await supabase
      .from('musclewiki_filter_cache')
      .select('*')
      .eq('filter_type', filterType)
      .gt('cache_expires_at', new Date().toISOString())
      .order('sort_order');

    if (cached && cached.length > 0) {
      await logApiCall({
        endpoint: `/filters/${filterType} (cache)`,
        cacheHit: true,
      });

      return cached.map((row) => ({
        value: row.filter_value,
        label: row.display_label,
        type: row.filter_type,
      }));
    }

    // Fetch from API if key available
    const apiKey = process.env.MUSCLEWIKI_API_KEY;
    if (!apiKey) {
      return this.getDefaultFilterOptions(filterType);
    }

    try {
      const endpoint = filterType === 'muscle' ? '/muscles' : `/${filterType}s`;
      const url = `${MUSCLEWIKI_API_BASE_URL}${endpoint}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: getApiHeaders(),
      });

      const data = await response.json();
      const options = Array.isArray(data) ? data : data.data || [];

      await logApiCall({
        endpoint,
        responseStatus: response.status,
        cacheHit: false,
        cacheMissReason: 'not_cached',
      });

      // Cache the results
      const cacheExpiry = new Date();
      cacheExpiry.setDate(cacheExpiry.getDate() + FILTER_CACHE_DURATION_DAYS);

      for (let i = 0; i < options.length; i++) {
        const option = options[i];
        const value = typeof option === 'string' ? option : option.name || option.value;
        const label = typeof option === 'string' ? option : option.label || option.name || option.value;

        await supabase.from('musclewiki_filter_cache').upsert(
          {
            filter_type: filterType,
            filter_value: value,
            display_label: label,
            sort_order: i,
            cached_at: new Date().toISOString(),
            cache_expires_at: cacheExpiry.toISOString(),
          },
          { onConflict: 'filter_type,filter_value' }
        );
      }

      return options.map((opt: any) => ({
        value: typeof opt === 'string' ? opt : opt.name || opt.value,
        label: typeof opt === 'string' ? opt : opt.label || opt.name || opt.value,
        type: filterType,
      }));
    } catch (error) {
      logger.error({ error, filterType }, 'Failed to fetch filter options');
      return this.getDefaultFilterOptions(filterType);
    }
  }

  /**
   * Get all filter options at once
   */
  async getAllFilterOptions(): Promise<{
    categories: MuscleWikiFilterOption[];
    muscles: MuscleWikiFilterOption[];
    difficulties: MuscleWikiFilterOption[];
    forces: MuscleWikiFilterOption[];
    mechanics: MuscleWikiFilterOption[];
  }> {
    const [categories, muscles, difficulties, forces, mechanics] = await Promise.all([
      this.getFilterOptions('category'),
      this.getFilterOptions('muscle'),
      this.getFilterOptions('difficulty'),
      this.getFilterOptions('force'),
      this.getFilterOptions('mechanic'),
    ]);

    return { categories, muscles, difficulties, forces, mechanics };
  }

  /**
   * Get compliance report for API usage
   */
  async getComplianceReport(days: number = 30): Promise<{
    totalApiCalls: number;
    cacheHits: number;
    cacheMisses: number;
    cacheHitRate: number;
    avgResponseTimeMs: number;
    totalExercisesServed: number;
  }> {
    const supabase = getSupabaseClient();
    const { data } = await supabase.rpc('get_musclewiki_usage_stats', { p_days: days });

    const stats = data?.[0] || {};

    return {
      totalApiCalls: parseInt(stats.total_api_calls) || 0,
      cacheHits: parseInt(stats.cache_hits) || 0,
      cacheMisses: parseInt(stats.cache_misses) || 0,
      cacheHitRate: parseFloat(stats.cache_hit_rate) || 0,
      avgResponseTimeMs: parseFloat(stats.avg_response_time_ms) || 0,
      totalExercisesServed: parseInt(stats.total_exercises_served) || 0,
    };
  }

  /**
   * Get cache status
   */
  async getCacheStatus(): Promise<{
    totalCached: number;
    validCached: number;
    expiredCached: number;
  }> {
    const supabase = getSupabaseClient();

    const [totalResult, validResult] = await Promise.all([
      supabase.from('musclewiki_exercise_cache').select('id', { count: 'exact', head: true }),
      supabase
        .from('musclewiki_exercise_cache')
        .select('id', { count: 'exact', head: true })
        .gt('cache_expires_at', new Date().toISOString()),
    ]);

    return {
      totalCached: totalResult.count || 0,
      validCached: validResult.count || 0,
      expiredCached: (totalResult.count || 0) - (validResult.count || 0),
    };
  }

  /**
   * Default filter options (fallback)
   */
  private getDefaultFilterOptions(
    filterType: 'category' | 'muscle' | 'difficulty' | 'force' | 'mechanic'
  ): MuscleWikiFilterOption[] {
    const defaults: Record<string, MuscleWikiFilterOption[]> = {
      category: [
        { value: 'Barbell', label: 'Barbell', type: 'category' },
        { value: 'Dumbbell', label: 'Dumbbell', type: 'category' },
        { value: 'Machine', label: 'Machine', type: 'category' },
        { value: 'Cable', label: 'Cable', type: 'category' },
        { value: 'Bodyweight', label: 'Bodyweight', type: 'category' },
        { value: 'Kettlebell', label: 'Kettlebell', type: 'category' },
        { value: 'Band', label: 'Resistance Band', type: 'category' },
        { value: 'Other', label: 'Other', type: 'category' },
      ],
      muscle: [
        { value: 'Chest', label: 'Chest', type: 'muscle' },
        { value: 'Back', label: 'Back', type: 'muscle' },
        { value: 'Shoulders', label: 'Shoulders', type: 'muscle' },
        { value: 'Biceps', label: 'Biceps', type: 'muscle' },
        { value: 'Triceps', label: 'Triceps', type: 'muscle' },
        { value: 'Forearms', label: 'Forearms', type: 'muscle' },
        { value: 'Core', label: 'Core', type: 'muscle' },
        { value: 'Quadriceps', label: 'Quadriceps', type: 'muscle' },
        { value: 'Hamstrings', label: 'Hamstrings', type: 'muscle' },
        { value: 'Glutes', label: 'Glutes', type: 'muscle' },
        { value: 'Calves', label: 'Calves', type: 'muscle' },
        { value: 'Hip Flexors', label: 'Hip Flexors', type: 'muscle' },
      ],
      difficulty: [
        { value: 'Beginner', label: 'Beginner', type: 'difficulty' },
        { value: 'Intermediate', label: 'Intermediate', type: 'difficulty' },
        { value: 'Advanced', label: 'Advanced', type: 'difficulty' },
      ],
      force: [
        { value: 'Push', label: 'Push', type: 'force' },
        { value: 'Pull', label: 'Pull', type: 'force' },
        { value: 'Static', label: 'Static', type: 'force' },
      ],
      mechanic: [
        { value: 'Compound', label: 'Compound', type: 'mechanic' },
        { value: 'Isolation', label: 'Isolation', type: 'mechanic' },
      ],
    };

    return defaults[filterType] || [];
  }
}

// Export singleton instance
export const muscleWikiService = new MuscleWikiService();
