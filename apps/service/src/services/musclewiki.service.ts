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
 * - MUSCLEWIKI_API_HOST: RapidAPI host for MuscleWiki
 */

import { getSupabaseClient } from './supabase.service';
import { logger } from '../config/logger';

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
  // Thumbnail URL stored with exercise metadata (30-day TTL like other metadata)
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
  grips?: string;
  searchTerm?: string;
  gender?: 'male' | 'female';
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
// Metadata (text including URLs): 30 days max
// Actual images: 24 hours (handled by HTTP Cache-Control in image proxy)
// Videos: NO caching allowed - transient only
const METADATA_CACHE_DAYS = 30;

// ============================================================================
// INTERNAL HELPERS
// ============================================================================

const getApiHeaders = (): HeadersInit => {
  const apiKey = process.env.MUSCLEWIKI_API_KEY;
  const apiHost = process.env.MUSCLEWIKI_API_HOST;

  if (!apiKey) {
    throw new Error('MUSCLEWIKI_API_KEY environment variable is not set');
  }

  if (!apiHost) {
    throw new Error('MUSCLEWIKI_API_HOST environment variable is not set');
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
const transformApiExercise = (raw: any): Partial<MuscleWikiExercise> & { thumbnailUrl?: string } => {
  // Get thumbnail from videos array (first og_image found)
  const thumbnailUrl = raw.videos?.[0]?.og_image || raw.thumbnail_url || raw.image_url || raw.og_image;

  return {
    musclewikiId: raw.id?.toString() || raw.slug,
    name: raw.name || raw.exercise_name,
    nameAlternative: raw.name_alternative,
    slug: raw.slug,
    category: raw.category || raw.equipment,
    difficulty: raw.difficulty || raw.level,
    force: raw.force,
    mechanic: raw.mechanic,
    // API uses 'primary_muscles' not 'target_muscles'
    targetMuscles: Array.isArray(raw.primary_muscles)
      ? raw.primary_muscles.map((m: any) => typeof m === 'string' ? m : m.name || m)
      : Array.isArray(raw.target_muscles)
        ? raw.target_muscles.map((m: any) => typeof m === 'string' ? m : m.name || m)
        : raw.target?.split(',').map((s: string) => s.trim()) || [],
    synergistMuscles: Array.isArray(raw.secondary_muscles)
      ? raw.secondary_muscles.map((m: any) => typeof m === 'string' ? m : m.name || m)
      : Array.isArray(raw.synergist_muscles)
        ? raw.synergist_muscles.map((m: any) => typeof m === 'string' ? m : m.name || m)
        : [],
    stabilizerMuscles: Array.isArray(raw.stabilizer_muscles)
      ? raw.stabilizer_muscles.map((m: any) => typeof m === 'string' ? m : m.name || m)
      : [],
    // API uses 'steps' not 'instructions'
    instructions: Array.isArray(raw.steps)
      ? raw.steps
      : Array.isArray(raw.instructions)
        ? raw.instructions
        : raw.instructions?.split('\n').filter(Boolean) || [],
    tips: Array.isArray(raw.tips)
      ? raw.tips
      : raw.tips?.split('\n').filter(Boolean) || [],
    // Thumbnail URL stored with exercise metadata
    thumbnailUrl,
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
    // Thumbnail URL now stored directly in exercise cache
    thumbnailUrl: row.thumbnail_url || row.thumbnailUrl || undefined,
    isCacheValid: new Date(row.cache_expires_at) > new Date(),
    cachedAt: row.cached_at,
  };
};

// ============================================================================
// MUSCLEWIKI SERVICE CLASS
// ============================================================================

class MuscleWikiService {
  /**
   * Search exercises - CACHE-FIRST approach
   * 
   * Strategy:
   * - Query the local Supabase cache first (all 1700+ exercises are pre-cached)
   * - This is instant, doesn't consume API quota, and works offline
   * - Only fall back to API if cache is empty (e.g., first run before population)
   */
  async searchExercises(
    filters: MuscleWikiSearchFilters = {},
    requestSource: string = 'api',
    userId?: string
  ): Promise<{ exercises: MuscleWikiExercise[]; total: number }> {
    const startTime = Date.now();

    // Always try cache first - it's faster and doesn't consume API quota
    const cacheResult = await this.searchFromCache(filters);
    
    if (cacheResult.exercises.length > 0 || cacheResult.total > 0) {
      logger.info({ 
        filters, 
        resultCount: cacheResult.exercises.length,
        total: cacheResult.total,
        durationMs: Date.now() - startTime 
      }, 'Exercises fetched from cache');
      
      await logApiCall({
        endpoint: '/exercises (cache)',
        queryParams: filters as Record<string, string>,
        cacheHit: true,
        exercisesReturned: cacheResult.exercises.length,
        requestDurationMs: Date.now() - startTime,
        requestSource,
        userId,
        contentType: 'metadata',
        complianceNote: 'Cache-first approach - no API call needed',
      });
      
      return cacheResult;
    }

    // Cache is empty - fall back to API (only happens if cache not populated)
    logger.warn('Cache empty, falling back to API');
    return this.fetchFromApi(filters, requestSource, userId, startTime);
  }

  /**
   * Fetch exercises from MuscleWiki API (fallback when cache is empty)
   */
  private async fetchFromApi(
    filters: MuscleWikiSearchFilters,
    requestSource: string,
    userId: string | undefined,
    startTime: number
  ): Promise<{ exercises: MuscleWikiExercise[]; total: number }> {
    const apiKey = process.env.MUSCLEWIKI_API_KEY;
    if (!apiKey) {
      logger.warn('MUSCLEWIKI_API_KEY not configured');
      return { exercises: [], total: 0 };
    }

    const {
      category,
      difficulty,
      muscle,
      force,
      mechanic,
      grips,
      searchTerm,
      gender,
      limit = 100,
      offset = 0,
    } = filters;

    try {
      const queryParams: Record<string, string> = {};
      if (category) queryParams.category = category;
      if (difficulty) queryParams.difficulty = difficulty;
      if (muscle) queryParams.muscles = muscle;
      if (force) queryParams.force = force;
      if (mechanic) queryParams.mechanic = mechanic;
      if (grips) queryParams.grips = grips;
      if (gender) queryParams.gender = gender;
      queryParams.limit = limit.toString();
      queryParams.offset = offset.toString();

      let rawExercises: any[] = [];
      let total = 0;

      if (searchTerm && searchTerm.length >= 2) {
        queryParams.q = searchTerm;
        const queryString = new URLSearchParams(queryParams).toString();
        const url = `${MUSCLEWIKI_API_BASE_URL}/search?${queryString}`;

        const response = await fetch(url, {
          method: 'GET',
          headers: getApiHeaders(),
        });

        if (!response.ok) {
          logger.warn({ status: response.status }, 'MuscleWiki search API error');
          return { exercises: [], total: 0 };
        }

        const responseData = await response.json();
        rawExercises = Array.isArray(responseData) ? responseData : [];
        total = rawExercises.length < limit ? offset + rawExercises.length : offset + rawExercises.length + 1;

        await logApiCall({
          endpoint: '/search',
          queryParams,
          responseStatus: response.status,
          responseSizeBytes: JSON.stringify(responseData).length,
          exercisesReturned: rawExercises.length,
          cacheHit: false,
          cacheMissReason: 'cache_empty_fallback',
          requestDurationMs: Date.now() - startTime,
          rateLimitRemaining: parseInt(response.headers.get('x-ratelimit-remaining') || '0', 10),
          requestSource,
          userId,
          contentType: 'metadata',
        });
      } else {
        const queryString = new URLSearchParams(queryParams).toString();
        const listUrl = `${MUSCLEWIKI_API_BASE_URL}/exercises?${queryString}`;

        const listResponse = await fetch(listUrl, {
          method: 'GET',
          headers: getApiHeaders(),
        });

        if (!listResponse.ok) {
          logger.warn({ status: listResponse.status }, 'MuscleWiki list API error');
          return { exercises: [], total: 0 };
        }

        const listData = await listResponse.json();
        const exerciseList = listData.results || [];
        total = listData.total || 0;

        await logApiCall({
          endpoint: '/exercises',
          queryParams,
          responseStatus: listResponse.status,
          responseSizeBytes: JSON.stringify(listData).length,
          exercisesReturned: exerciseList.length,
          cacheHit: false,
          cacheMissReason: 'cache_empty_fallback',
          requestDurationMs: Date.now() - startTime,
          rateLimitRemaining: parseInt(listResponse.headers.get('x-ratelimit-remaining') || '0', 10),
          requestSource,
          userId,
          contentType: 'metadata',
        });

        rawExercises = await this.hydrateExerciseDetails(exerciseList);
      }

      // Cache the results for future use
      const cacheExpiry = new Date();
      cacheExpiry.setDate(cacheExpiry.getDate() + METADATA_CACHE_DAYS);
      this.cacheExercises(rawExercises, cacheExpiry).catch(err => {
        logger.warn({ err }, 'Background cache update failed');
      });

      const exercises = rawExercises.map((ex: any) => {
        if (ex.fromCache) {
          return transformCachedExercise(ex);
        }
        return {
          id: '',
          ...transformApiExercise(ex),
          isCacheValid: true,
          cachedAt: new Date().toISOString(),
        } as MuscleWikiExercise;
      });

      return { exercises, total };
    } catch (error) {
      logger.error({ error }, 'Failed to fetch from MuscleWiki API');
      return { exercises: [], total: 0 };
    }
  }

  /**
   * Hydrate exercise details from cache or API
   * Uses cache for individual exercises when available, fetches from API otherwise
   */
  private async hydrateExerciseDetails(exerciseList: any[]): Promise<any[]> {
    const supabase = getSupabaseClient();
    const results: any[] = [];

    // Process in batches for better performance
    const BATCH_SIZE = 20;
    for (let i = 0; i < exerciseList.length; i += BATCH_SIZE) {
      const batch = exerciseList.slice(i, i + BATCH_SIZE);

      const batchPromises = batch.map(async (ex: any) => {
        const exerciseId = ex.id.toString();

        // Check cache first (now includes thumbnail_url)
        const { data: cached } = await supabase
          .from('musclewiki_exercise_cache')
          .select('*')
          .eq('musclewiki_id', exerciseId)
          .gt('cache_expires_at', new Date().toISOString())
          .single();

        if (cached) {
          return { ...cached, fromCache: true };
        }

        // Not in cache - fetch details from API
        try {
          const detailUrl = `${MUSCLEWIKI_API_BASE_URL}/exercises/${ex.id}`;
          const detailResponse = await fetch(detailUrl, {
            method: 'GET',
            headers: getApiHeaders(),
          });

          if (detailResponse.ok) {
            return await detailResponse.json();
          }

          // API failed, return minimal data from list
          return { id: ex.id, name: ex.name };
        } catch (err) {
          logger.warn({ exerciseId: ex.id, err }, 'Failed to fetch exercise details');
          return { id: ex.id, name: ex.name };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }

    return results;
  }

  /**
   * Cache exercises in background
   * Stores all metadata including thumbnail_url with 30-day TTL
   */
  private async cacheExercises(rawExercises: any[], cacheExpiry: Date): Promise<void> {
    const supabase = getSupabaseClient();

    for (const exercise of rawExercises) {
      if (exercise.fromCache) continue; // Skip already cached

      const transformed = transformApiExercise(exercise);
      if (!transformed.musclewikiId) continue;

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
          cached_at: new Date().toISOString(),
          cache_expires_at: cacheExpiry.toISOString(),
        },
        { onConflict: 'musclewiki_id' }
      );
    }
  }

  /**
   * Search exercises from local Supabase cache
   * Supports text search, filters, and pagination
   */
  private async searchFromCache(
    filters: MuscleWikiSearchFilters
  ): Promise<{ exercises: MuscleWikiExercise[]; total: number }> {
    const supabase = getSupabaseClient();
    const { category, difficulty, muscle, force, mechanic, searchTerm, limit = 100, offset = 0 } = filters;

    let query = supabase
      .from('musclewiki_exercise_cache')
      .select('*', { count: 'exact' })
      .gt('cache_expires_at', new Date().toISOString()); // Only non-expired entries

    // Apply filters
    if (category) query = query.eq('category', category);
    if (difficulty) query = query.eq('difficulty', difficulty);
    if (muscle) query = query.contains('target_muscles', [muscle]);
    if (force) query = query.eq('force', force);
    if (mechanic) query = query.eq('mechanic', mechanic);
    
    // Text search - search in name and name_alternative
    if (searchTerm && searchTerm.length >= 2) {
      query = query.or(`name.ilike.%${searchTerm}%,name_alternative.ilike.%${searchTerm}%`);
    }

    query = query.order('name').range(offset, offset + limit - 1);

    const { data: cachedData, count, error } = await query;

    if (error) {
      logger.error({ error }, 'Cache query failed');
      return { exercises: [], total: 0 };
    }

    if (cachedData && cachedData.length > 0) {
      // thumbnail_url is now included in the cache query directly
      const exercises = cachedData.map(transformCachedExercise);
      return { exercises, total: count || cachedData.length };
    }

    return { exercises: [], total: 0 };
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
        // thumbnail_url is now included in cached exercise
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
          thumbnail_url: transformed.thumbnailUrl,
          cached_at: new Date().toISOString(),
          cache_expires_at: cacheExpiry.toISOString(),
        },
        { onConflict: 'musclewiki_id' }
      );

      const exercise = {
        id: '',
        ...transformed,
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
   *
   * Returns only maleVideoFrontUrl - other video variants are not needed
   */
  async getExerciseVideos(
    musclewikiId: string,
    requestSource: string = 'api',
    userId?: string
  ): Promise<{ maleVideoFrontUrl?: string } | null> {
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

      // Return only male front video URL - NOT stored
      // API returns videos as array: [{url, angle, gender}, ...]
      const videos = data.videos || [];
      const findVideo = (gender: string, angle: string) =>
        videos.find((v: any) => v.gender === gender && v.angle === angle)?.url;

      return {
        maleVideoFrontUrl: findVideo('male', 'front') || data.male_video_front_url,
      };
    } catch (error) {
      logger.error({ error, musclewikiId }, 'Failed to fetch video URLs');
      return null;
    }
  }

  /**
   * Get ALL exercises from cache in a single optimized query
   * Returns all exercises with their cached thumbnail URLs
   * 
   * This is used for initial app load - frontend caches all exercises
   * and does in-memory search/filter for instant results
   */
  async getAllExercises(): Promise<{ exercises: MuscleWikiExercise[]; total: number }> {
    const supabase = getSupabaseClient();
    const startTime = Date.now();
    const BATCH_SIZE = 1000;

    // First, get the count
    const { count, error: countError } = await supabase
      .from('musclewiki_exercise_cache')
      .select('*', { count: 'exact', head: true })
      .gt('cache_expires_at', new Date().toISOString());

    if (countError) {
      logger.error({ error: countError }, 'Failed to get exercise count from cache');
      return { exercises: [], total: 0 };
    }

    const totalCount = count || 0;
    if (totalCount === 0) {
      logger.warn('No exercises in cache');
      return { exercises: [], total: 0 };
    }

    // Fetch exercises in batches (Supabase has 1000 row limit per query)
    const allExercises: any[] = [];
    const batchCount = Math.ceil(totalCount / BATCH_SIZE);

    for (let i = 0; i < batchCount; i++) {
      const from = i * BATCH_SIZE;
      const to = from + BATCH_SIZE - 1;

      const { data: batch, error } = await supabase
        .from('musclewiki_exercise_cache')
        .select('*')
        .gt('cache_expires_at', new Date().toISOString())
        .order('name')
        .range(from, to);

      if (error) {
        logger.error({ error, batch: i }, 'Failed to get exercise batch from cache');
        continue;
      }

      if (batch) {
        allExercises.push(...batch);
      }
    }

    if (allExercises.length === 0) {
      logger.warn('No exercises in cache after batch fetch');
      return { exercises: [], total: 0 };
    }

    // Transform exercises - thumbnail_url is now included directly in the cache
    const now = new Date();
    const transformedExercises = allExercises.map((row: any) => {
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
        isCacheValid: new Date(row.cache_expires_at) > now,
        cachedAt: row.cached_at,
      } as MuscleWikiExercise;
    });

    logger.info({
      exerciseCount: transformedExercises.length,
      durationMs: Date.now() - startTime,
    }, 'Loaded all exercises from cache');

    return { exercises: transformedExercises, total: totalCount };
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
    withThumbnails: number;
  }> {
    const supabase = getSupabaseClient();
    const now = new Date().toISOString();

    const [totalResult, validResult, withThumbnailsResult] = await Promise.all([
      supabase.from('musclewiki_exercise_cache').select('id', { count: 'exact', head: true }),
      supabase
        .from('musclewiki_exercise_cache')
        .select('id', { count: 'exact', head: true })
        .gt('cache_expires_at', now),
      supabase
        .from('musclewiki_exercise_cache')
        .select('id', { count: 'exact', head: true })
        .not('thumbnail_url', 'is', null),
    ]);

    return {
      totalCached: totalResult.count || 0,
      validCached: validResult.count || 0,
      expiredCached: (totalResult.count || 0) - (validResult.count || 0),
      withThumbnails: withThumbnailsResult.count || 0,
    };
  }

  private getDefaultFilterOptions(
    filterType: 'category' | 'muscle' | 'difficulty' | 'force' | 'mechanic'
  ): MuscleWikiFilterOption[] {
    // Values are capitalized as returned by the MuscleWiki API
    const defaults: Record<string, MuscleWikiFilterOption[]> = {
      category: [
        { value: 'Band', label: 'Band', type: 'category' },
        { value: 'Barbell', label: 'Barbell', type: 'category' },
        { value: 'Bodyweight', label: 'Bodyweight', type: 'category' },
        { value: 'Bosu-Ball', label: 'Bosu Ball', type: 'category' },
        { value: 'Cables', label: 'Cables', type: 'category' },
        { value: 'Cardio', label: 'Cardio', type: 'category' },
        { value: 'Dumbbells', label: 'Dumbbells', type: 'category' },
        { value: 'Kettlebells', label: 'Kettlebells', type: 'category' },
        { value: 'Machine', label: 'Machine', type: 'category' },
        { value: 'Medicine-Ball', label: 'Medicine Ball', type: 'category' },
        { value: 'Plate', label: 'Plate', type: 'category' },
        { value: 'Recovery', label: 'Recovery', type: 'category' },
        { value: 'Smith-Machine', label: 'Smith Machine', type: 'category' },
        { value: 'Stretches', label: 'Stretches', type: 'category' },
        { value: 'TRX', label: 'TRX', type: 'category' },
        { value: 'Vitruvian', label: 'Vitruvian', type: 'category' },
        { value: 'Yoga', label: 'Yoga', type: 'category' },
      ],
      muscle: [
        { value: 'Chest', label: 'Chest', type: 'muscle' },
        { value: 'Back', label: 'Back', type: 'muscle' },
        { value: 'Shoulders', label: 'Shoulders', type: 'muscle' },
        { value: 'Biceps', label: 'Biceps', type: 'muscle' },
        { value: 'Triceps', label: 'Triceps', type: 'muscle' },
        { value: 'Forearms', label: 'Forearms', type: 'muscle' },
        { value: 'Quadriceps', label: 'Quadriceps', type: 'muscle' },
        { value: 'Hamstrings', label: 'Hamstrings', type: 'muscle' },
        { value: 'Glutes', label: 'Glutes', type: 'muscle' },
        { value: 'Calves', label: 'Calves', type: 'muscle' },
        { value: 'Abs', label: 'Abs', type: 'muscle' },
        { value: 'Lower Back', label: 'Lower Back', type: 'muscle' },
        { value: 'Traps', label: 'Traps', type: 'muscle' },
        { value: 'Lats', label: 'Lats', type: 'muscle' },
      ],
      difficulty: [
        { value: 'Novice', label: 'Novice', type: 'difficulty' },
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

  /**
   * Quick search exercises - CACHE-FIRST approach
   * Optimized for search bar autocomplete - fast, local cache lookup
   * 
   * @param query - Search term (minimum 2 characters)
   * @param limit - Maximum results (default 10 for autocomplete)
   */
  async quickSearch(
    query: string,
    limit: number = 10,
    requestSource: string = 'api',
    userId?: string
  ): Promise<{ exercises: MuscleWikiExercise[]; total: number }> {
    const startTime = Date.now();

    if (!query || query.length < 2) {
      return { exercises: [], total: 0 };
    }

    // Always use cache for quick search - it's instant
    const cacheResult = await this.searchCache(query, limit);
    
    if (cacheResult.exercises.length > 0) {
      logger.info({ 
        query, 
        resultCount: cacheResult.exercises.length,
        durationMs: Date.now() - startTime 
      }, 'Quick search from cache');
      
      await logApiCall({
        endpoint: '/search (cache)',
        queryParams: { q: query, limit: limit.toString() },
        cacheHit: true,
        exercisesReturned: cacheResult.exercises.length,
        requestDurationMs: Date.now() - startTime,
        requestSource,
        userId,
        contentType: 'metadata',
        complianceNote: 'Cache-first quick search - no API call needed',
      });
      
      return cacheResult;
    }

    // Cache miss - try API as fallback (rare case - cache should have all exercises)
    const apiKey = process.env.MUSCLEWIKI_API_KEY;
    if (!apiKey) {
      return { exercises: [], total: 0 };
    }

    try {
      const queryParams = new URLSearchParams({
        q: query,
        limit: limit.toString(),
      });

      const url = `${MUSCLEWIKI_API_BASE_URL}/search?${queryParams.toString()}`;

      logger.info({ url, query, limit }, 'Quick search fallback to API');

      const response = await fetch(url, {
        method: 'GET',
        headers: getApiHeaders(),
      });

      if (!response.ok) {
        logger.warn({ status: response.status }, 'MuscleWiki search API error');
        return { exercises: [], total: 0 };
      }

      const responseData = await response.json();
      const rawExercises = Array.isArray(responseData) ? responseData : [];

      await logApiCall({
        endpoint: '/search (api fallback)',
        queryParams: { q: query, limit: limit.toString() },
        responseStatus: response.status,
        responseSizeBytes: JSON.stringify(responseData).length,
        exercisesReturned: rawExercises.length,
        cacheHit: false,
        cacheMissReason: 'cache_miss_quick_search',
        requestDurationMs: Date.now() - startTime,
        rateLimitRemaining: parseInt(response.headers.get('x-ratelimit-remaining') || '0', 10),
        requestSource,
        userId,
        contentType: 'metadata',
      });

      // Background cache update
      const cacheExpiry = new Date();
      cacheExpiry.setDate(cacheExpiry.getDate() + METADATA_CACHE_DAYS);
      this.cacheExercises(rawExercises, cacheExpiry).catch(err => {
        logger.warn({ err }, 'Background cache update failed');
      });

      const exercises = rawExercises.map((ex: any) => ({
        id: '',
        ...transformApiExercise(ex),
        isCacheValid: true,
        cachedAt: new Date().toISOString(),
      } as MuscleWikiExercise));

      return { exercises, total: exercises.length };
    } catch (error) {
      logger.error({ error }, 'Failed to quick search from MuscleWiki API');
      return this.searchCache(query, limit);
    }
  }

  /**
   * Search exercises in local cache (fallback when API unavailable)
   */
  private async searchCache(
    query: string,
    limit: number
  ): Promise<{ exercises: MuscleWikiExercise[]; total: number }> {
    const supabase = getSupabaseClient();

    const { data, count } = await supabase
      .from('musclewiki_exercise_cache')
      .select('*', { count: 'exact' })
      .ilike('name', `%${query}%`)
      .order('name')
      .limit(limit);

    if (data && data.length > 0) {
      // thumbnail_url is now included directly in the cache
      const exercises = data.map(transformCachedExercise);
      return { exercises, total: count || data.length };
    }

    return { exercises: [], total: 0 };
  }

  /**
   * Populate cache with ALL exercises from MuscleWiki API
   * This should be called by a cron job to keep the cache fresh
   * 
   * @param batchSize - Number of exercises to fetch per API call
   */
  async populateAllExercises(batchSize: number = 100): Promise<{
    totalFetched: number;
    totalCached: number;
    errors: number;
  }> {
    const supabase = getSupabaseClient();
    const apiKey = process.env.MUSCLEWIKI_API_KEY;

    if (!apiKey) {
      throw new Error('MUSCLEWIKI_API_KEY not configured');
    }

    let offset = 0;
    let totalFetched = 0;
    let totalCached = 0;
    let errors = 0;
    let hasMore = true;

    logger.info('Starting exercise cache population...');

    while (hasMore) {
      try {
        const queryParams = new URLSearchParams({
          limit: batchSize.toString(),
          offset: offset.toString(),
        });

        const listUrl = `${MUSCLEWIKI_API_BASE_URL}/exercises?${queryParams.toString()}`;

        const listResponse = await fetch(listUrl, {
          method: 'GET',
          headers: getApiHeaders(),
        });

        if (!listResponse.ok) {
          throw new Error(`API responded with ${listResponse.status}`);
        }

        const listData = await listResponse.json();
        const exerciseList = listData.results || [];
        const total = listData.total || 0;

        logger.info({ offset, count: exerciseList.length, total }, 'Fetched exercise batch');

        if (exerciseList.length === 0) {
          hasMore = false;
          break;
        }

        // Fetch details for each exercise in parallel batches
        const DETAIL_BATCH_SIZE = 10;
        for (let i = 0; i < exerciseList.length; i += DETAIL_BATCH_SIZE) {
          const batch = exerciseList.slice(i, i + DETAIL_BATCH_SIZE);

          const detailPromises = batch.map(async (ex: any) => {
            try {
              const detailUrl = `${MUSCLEWIKI_API_BASE_URL}/exercises/${ex.id}`;
              const detailResponse = await fetch(detailUrl, {
                method: 'GET',
                headers: getApiHeaders(),
              });

              if (detailResponse.ok) {
                return await detailResponse.json();
              }
              return null;
            } catch (err) {
              logger.warn({ exerciseId: ex.id, err }, 'Failed to fetch exercise details');
              errors++;
              return null;
            }
          });

          const details = await Promise.all(detailPromises);
          totalFetched += details.filter(d => d !== null).length;

          // Cache each exercise
          const cacheExpiry = new Date();
          cacheExpiry.setDate(cacheExpiry.getDate() + METADATA_CACHE_DAYS);

          for (const exercise of details) {
            if (!exercise) continue;

            try {
              const transformed = transformApiExercise(exercise);
              if (!transformed.musclewikiId) continue;

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
                  cached_at: new Date().toISOString(),
                  cache_expires_at: cacheExpiry.toISOString(),
                },
                { onConflict: 'musclewiki_id' }
              );

              totalCached++;
            } catch (err) {
              logger.warn({ exercise: exercise?.id, err }, 'Failed to cache exercise');
              errors++;
            }
          }

          // Small delay to respect rate limits
          await new Promise(resolve => setTimeout(resolve, 100));
        }

        offset += batchSize;
        hasMore = offset < total;
      } catch (error) {
        logger.error({ error, offset }, 'Failed to fetch exercise batch');
        errors++;
        hasMore = false;
      }
    }

    logger.info({ totalFetched, totalCached, errors }, 'Exercise cache population complete');

    return { totalFetched, totalCached, errors };
  }
}

export const muscleWikiService = new MuscleWikiService();
