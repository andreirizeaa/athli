/**
 * MuscleWiki Service
 *
 * This service handles all MuscleWiki API interactions with STRICT compliance
 * to the MuscleWiki API Terms of Use.
 *
 * COMPLIANCE REQUIREMENTS (MuscleWiki API Terms):
 *
 * Section 3 - Caching Rules:
 *   - Metadata (text only): May be cached for up to 30 days
 *   - Thumbnails & bodymap images: May be cached for up to 24 hours
 *   - Videos: Transient caching only (NO persistent storage)
 *
 * Section 2 - Media Content Restrictions:
 *   - NO downloading/storing video files
 *   - NO storing video URLs persistently
 *   - Videos must be streamed directly from MuscleWiki
 *
 * Section 8 - Attribution:
 *   - Must display "Powered by MuscleWiki" in UI
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
  // Thumbnail fetched separately with 24h cache
  thumbnailUrl?: string;
  // Videos NOT stored - fetched fresh each time per Terms Section 3
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
  contentType?: 'metadata' | 'thumbnail' | 'video';
  complianceNote?: string;
};

// ============================================================================
// CONFIGURATION - Compliant with MuscleWiki Terms Section 3
// ============================================================================

const MUSCLEWIKI_API_BASE_URL = 'https://musclewiki-api.p.rapidapi.com';

// Per MuscleWiki Terms Section 3:
const METADATA_CACHE_DAYS = 7;      // Max allowed: 30 days
const THUMBNAIL_CACHE_HOURS = 24;   // Max allowed: 24 hours
// Videos: NO caching allowed - transient only

// ============================================================================
// INTERNAL HELPERS
// ============================================================================

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
 * NOTE: Video URLs are NOT extracted/stored per Terms Section 2 & 3
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
    // NOTE: Video URLs intentionally NOT stored per MuscleWiki Terms
  };
};

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
    // Thumbnail fetched separately
    thumbnailUrl: undefined,
    isCacheValid: new Date(row.cache_expires_at) > new Date(),
    cachedAt: row.cached_at,
  };
};

// ============================================================================
// MUSCLEWIKI SERVICE CLASS
// ============================================================================

class MuscleWikiService {
  /**
   * Search exercises - caches METADATA ONLY (up to 30 days per Terms)
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

    // Try metadata cache first
    let query = supabase
      .from('musclewiki_exercise_cache')
      .select('*')
      .gt('cache_expires_at', new Date().toISOString());

    if (category) query = query.eq('category', category);
    if (difficulty) query = query.eq('difficulty', difficulty);
    if (muscle) query = query.contains('target_muscles', [muscle]);
    if (searchTerm) query = query.ilike('name', `%${searchTerm}%`);

    query = query.order('name').range(offset, offset + limit - 1);

    const { data: cachedData, error: cacheError } = await query;

    if (!cacheError && cachedData && cachedData.length > 0) {
      await logApiCall({
        endpoint: '/exercises (metadata cache)',
        cacheHit: true,
        exercisesReturned: cachedData.length,
        requestDurationMs: Date.now() - startTime,
        requestSource,
        userId,
        contentType: 'metadata',
        complianceNote: 'Metadata served from cache (within 30 day limit)',
      });

      // Transform and fetch thumbnails separately (24h cache)
      const exercises = cachedData.map(transformCachedExercise);
      await this.attachThumbnails(exercises);
      return exercises;
    }

    // Cache miss - fetch from API
    const apiKey = process.env.MUSCLEWIKI_API_KEY;
    if (!apiKey) {
      logger.warn('MUSCLEWIKI_API_KEY not configured');
      return [];
    }

    try {
      const queryParams: Record<string, string> = {};
      if (category) queryParams.category = category;
      if (difficulty) queryParams.difficulty = difficulty;
      if (muscle) queryParams.muscle = muscle;
      if (searchTerm) queryParams.search = searchTerm;

      const queryString = new URLSearchParams(queryParams).toString();
      const url = `${MUSCLEWIKI_API_BASE_URL}/exercises${queryString ? `?${queryString}` : ''}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: getApiHeaders(),
      });

      const responseData = await response.json();
      const rawExercises = Array.isArray(responseData)
        ? responseData
        : responseData.exercises || responseData.data || [];

      await logApiCall({
        endpoint: '/exercises',
        queryParams,
        responseStatus: response.status,
        responseSizeBytes: JSON.stringify(responseData).length,
        exercisesReturned: rawExercises.length,
        cacheHit: false,
        cacheMissReason: cachedData?.length === 0 ? 'not_cached' : 'expired',
        requestDurationMs: Date.now() - startTime,
        rateLimitRemaining: parseInt(response.headers.get('x-ratelimit-remaining') || '0', 10),
        requestSource,
        userId,
        contentType: 'metadata',
      });

      // Cache METADATA ONLY (no video URLs) per Terms Section 3
      const cacheExpiry = new Date();
      cacheExpiry.setDate(cacheExpiry.getDate() + METADATA_CACHE_DAYS);

      for (const exercise of rawExercises) {
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
            // NO video URLs stored per Terms
            cached_at: new Date().toISOString(),
            cache_expires_at: cacheExpiry.toISOString(),
          },
          { onConflict: 'musclewiki_id' }
        );

        // Cache thumbnail separately with 24h TTL
        const thumbnailUrl = exercise.thumbnail_url || exercise.image_url || exercise.og_image;
        if (thumbnailUrl) {
          await this.cacheThumbnail(transformed.musclewikiId!, thumbnailUrl);
        }
      }

      const exercises = rawExercises.slice(offset, offset + limit).map((ex: any) => ({
        id: '',
        ...transformApiExercise(ex),
        isCacheValid: true,
        cachedAt: new Date().toISOString(),
      })) as MuscleWikiExercise[];

      await this.attachThumbnails(exercises);
      return exercises;
    } catch (error) {
      logger.error({ error }, 'Failed to fetch from MuscleWiki API');
      return [];
    }
  }

  /**
   * Get single exercise by ID
   */
  async getExerciseById(
    musclewikiId: string,
    requestSource: string = 'api',
    userId?: string
  ): Promise<MuscleWikiExercise | null> {
    const supabase = getSupabaseClient();
    const startTime = Date.now();

    await supabase.rpc('record_musclewiki_exercise_access', {
      p_musclewiki_id: musclewikiId,
    });

    const { data: cached, error } = await supabase
      .from('musclewiki_exercise_cache')
      .select('*')
      .eq('musclewiki_id', musclewikiId)
      .single();

    if (!error && cached) {
      const exercise = transformCachedExercise(cached);

      if (exercise.isCacheValid) {
        await logApiCall({
          endpoint: `/exercises/${musclewikiId} (metadata cache)`,
          cacheHit: true,
          exercisesReturned: 1,
          requestDurationMs: Date.now() - startTime,
          requestSource,
          userId,
          contentType: 'metadata',
        });
        await this.attachThumbnails([exercise]);
        return exercise;
      }
    }

    // Fetch from API
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
        contentType: 'metadata',
      });

      // Cache metadata
      const transformed = transformApiExercise(data);
      const cacheExpiry = new Date();
      cacheExpiry.setDate(cacheExpiry.getDate() + METADATA_CACHE_DAYS);

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
          cached_at: new Date().toISOString(),
          cache_expires_at: cacheExpiry.toISOString(),
        },
        { onConflict: 'musclewiki_id' }
      );

      // Cache thumbnail with 24h TTL
      const thumbnailUrl = data.thumbnail_url || data.image_url || data.og_image;
      if (thumbnailUrl) {
        await this.cacheThumbnail(transformed.musclewikiId!, thumbnailUrl);
      }

      const exercise = {
        id: '',
        ...transformed,
        thumbnailUrl,
        isCacheValid: true,
        cachedAt: new Date().toISOString(),
      } as MuscleWikiExercise;

      return exercise;
    } catch (error) {
      logger.error({ error, musclewikiId }, 'Failed to fetch exercise from API');
      return cached ? transformCachedExercise(cached) : null;
    }
  }

  /**
   * Get exercise video URLs - ALWAYS fetched fresh from API
   * Per MuscleWiki Terms Section 3: Videos require transient caching only
   * We do NOT store video URLs in our database
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
    const startTime = Date.now();

    // COMPLIANCE: Always fetch fresh from API - no caching of video URLs
    const apiKey = process.env.MUSCLEWIKI_API_KEY;
    if (!apiKey) {
      logger.warn('MUSCLEWIKI_API_KEY not configured for video fetch');
      return null;
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
        endpoint: `/exercises/${musclewikiId}/videos`,
        responseStatus: response.status,
        cacheHit: false,
        cacheMissReason: 'video_no_cache_per_terms',
        requestDurationMs: Date.now() - startTime,
        requestSource,
        userId,
        contentType: 'video',
        complianceNote: 'Video URLs fetched fresh per MuscleWiki Terms Section 3 (transient only)',
      });

      // Return video URLs directly - NOT stored
      return {
        maleVideoFrontUrl: data.male_video_front_url || data.video_url_male_front,
        maleVideoSideUrl: data.male_video_side_url || data.video_url_male_side,
        femaleVideoFrontUrl: data.female_video_front_url || data.video_url_female_front,
        femaleVideoSideUrl: data.female_video_side_url || data.video_url_female_side,
      };
    } catch (error) {
      logger.error({ error, musclewikiId }, 'Failed to fetch video URLs');
      return null;
    }
  }

  /**
   * Cache thumbnail URL with strict 24-hour TTL per Terms Section 3
   */
  private async cacheThumbnail(musclewikiId: string, thumbnailUrl: string): Promise<void> {
    try {
      const supabase = getSupabaseClient();
      await supabase.rpc('cache_musclewiki_thumbnail', {
        p_musclewiki_id: musclewikiId,
        p_thumbnail_url: thumbnailUrl,
      });
    } catch (error) {
      logger.warn({ error, musclewikiId }, 'Failed to cache thumbnail');
    }
  }

  /**
   * Get thumbnail from 24-hour cache
   */
  private async getThumbnail(musclewikiId: string): Promise<string | null> {
    try {
      const supabase = getSupabaseClient();
      const { data } = await supabase.rpc('get_musclewiki_thumbnail', {
        p_musclewiki_id: musclewikiId,
      });
      return data || null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Attach thumbnails to exercises from 24h cache
   */
  private async attachThumbnails(exercises: MuscleWikiExercise[]): Promise<void> {
    for (const exercise of exercises) {
      if (exercise.musclewikiId) {
        exercise.thumbnailUrl = await this.getThumbnail(exercise.musclewikiId) || undefined;
      }
    }
  }

  /**
   * Get filter options (metadata - 30 day cache allowed)
   */
  async getFilterOptions(
    filterType: 'category' | 'muscle' | 'difficulty' | 'force' | 'mechanic'
  ): Promise<MuscleWikiFilterOption[]> {
    const supabase = getSupabaseClient();

    const { data: cached } = await supabase
      .from('musclewiki_filter_cache')
      .select('*')
      .eq('filter_type', filterType)
      .gt('cache_expires_at', new Date().toISOString())
      .order('sort_order');

    if (cached && cached.length > 0) {
      return cached.map((row) => ({
        value: row.filter_value,
        label: row.display_label,
        type: row.filter_type,
      }));
    }

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

      // Cache for 30 days (max allowed per Terms)
      const cacheExpiry = new Date();
      cacheExpiry.setDate(cacheExpiry.getDate() + 30);

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
      ],
      muscle: [
        { value: 'Chest', label: 'Chest', type: 'muscle' },
        { value: 'Back', label: 'Back', type: 'muscle' },
        { value: 'Shoulders', label: 'Shoulders', type: 'muscle' },
        { value: 'Biceps', label: 'Biceps', type: 'muscle' },
        { value: 'Triceps', label: 'Triceps', type: 'muscle' },
        { value: 'Quadriceps', label: 'Quadriceps', type: 'muscle' },
        { value: 'Hamstrings', label: 'Hamstrings', type: 'muscle' },
        { value: 'Glutes', label: 'Glutes', type: 'muscle' },
        { value: 'Core', label: 'Core', type: 'muscle' },
        { value: 'Calves', label: 'Calves', type: 'muscle' },
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

export const muscleWikiService = new MuscleWikiService();
