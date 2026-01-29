import { Request, Response } from 'express';
import { success, notFound, badRequest } from '../../../utils/http-response';
import { muscleWikiService } from '../../../services/musclewiki.service';
import { logger } from '../../../config/logger';

/**
 * Exercise Controller
 *
 * Handles all exercise-related endpoints.
 * All MuscleWiki API calls go through the muscleWikiService which implements
 * cache-first approach and compliance logging.
 */
export const exercisesController = {
  /**
   * Quick search exercises using MuscleWiki's /search endpoint
   * GET /exercises/search?q=
   * 
   * Optimized for search bar autocomplete - uses MuscleWiki's relevance-scored search
   */
  quickSearch: async (req: Request, res: Response) => {
    try {
      const { q, limit = '10' } = req.query;

      if (!q || typeof q !== 'string' || q.length < 2) {
        return success(res, {
          message: 'Query too short',
          data: { exercises: [], total: 0 },
        });
      }

      const userId = (req as any).userId;
      const requestSource = req.headers['x-request-source'] as string || 'web_app';

      const result = await muscleWikiService.quickSearch(
        q,
        Math.min(parseInt(limit as string, 10), 50), // Cap at 50
        requestSource,
        userId
      );

      success(res, {
        message: 'Search results retrieved successfully',
        data: {
          exercises: result.exercises,
          total: result.total,
        },
      });
    } catch (error) {
      logger.error({ error }, 'Failed to quick search exercises');
      badRequest(res, { message: 'Failed to search exercises' });
    }
  },

  /**
   * List/filter exercises from MuscleWiki cache
   * GET /exercises
   */
  searchExercises: async (req: Request, res: Response) => {
    try {
      const {
        q: searchTerm,
        search,
        category,
        difficulty,
        muscle,
        muscles,
        force,
        mechanic,
        grips,
        gender,
        limit = '100',
        offset = '0',
      } = req.query;

      const userId = (req as any).userId;
      const requestSource = req.headers['x-request-source'] as string || 'web_app';

      // Support both 'q' and 'search' for search term
      // Support both 'muscle' and 'muscles' for muscle filter
      const result = await muscleWikiService.searchExercises(
        {
          searchTerm: (searchTerm || search) as string,
          category: category as string,
          difficulty: difficulty as string,
          muscle: (muscle || muscles) as string,
          force: force as string,
          mechanic: mechanic as string,
          grips: grips as string,
          gender: gender as 'male' | 'female',
          limit: parseInt(limit as string, 10),
          offset: parseInt(offset as string, 10),
        },
        requestSource,
        userId
      );

      success(res, {
        message: 'Exercises retrieved successfully',
        data: {
          exercises: result.exercises,
          total: result.total,
          limit: parseInt(limit as string, 10),
          offset: parseInt(offset as string, 10),
          hasMore: (parseInt(offset as string, 10) + result.exercises.length) < result.total,
        },
      });
    } catch (error) {
      logger.error({ error }, 'Failed to search exercises');
      badRequest(res, { message: 'Failed to search exercises' });
    }
  },

  /**
   * Get a single exercise by ID
   * GET /exercises/:id
   */
  getExerciseById: async (req: Request, res: Response) => {
    try {
      const id = String(req.params.id);
      const userId = (req as any).userId;
      const requestSourceHeader = req.headers['x-request-source'];
      const requestSource = (Array.isArray(requestSourceHeader) ? requestSourceHeader[0] : requestSourceHeader) || 'web_app';

      const exercise = await muscleWikiService.getExerciseById(id, requestSource, userId);

      if (!exercise) {
        return notFound(res, { message: 'Exercise not found' });
      }

      success(res, {
        message: 'Exercise retrieved successfully',
        data: { exercise },
      });
    } catch (error) {
      logger.error({ error }, 'Failed to get exercise');
      badRequest(res, { message: 'Failed to get exercise' });
    }
  },

  /**
   * Get exercise video URLs (lazy loading)
   * GET /exercises/:id/videos
   */
  getExerciseVideos: async (req: Request, res: Response) => {
    try {
      const id = String(req.params.id);
      const userId = (req as any).userId;
      const requestSourceHeader = req.headers['x-request-source'];
      const requestSource = (Array.isArray(requestSourceHeader) ? requestSourceHeader[0] : requestSourceHeader) || 'web_app';

      const videos = await muscleWikiService.getExerciseVideos(id, requestSource, userId);

      if (!videos) {
        return notFound(res, { message: 'Exercise not found' });
      }

      success(res, {
        message: 'Exercise videos retrieved successfully',
        data: { videos },
      });
    } catch (error) {
      logger.error({ error }, 'Failed to get exercise videos');
      badRequest(res, { message: 'Failed to get exercise videos' });
    }
  },

  /**
   * Get ALL exercises from cache in a single request
   * GET /exercises/all
   * 
   * This endpoint returns all 1700+ exercises with their cached thumbnail URLs.
   * Frontend should call this once on app load and cache the results.
   * Search/filter then happens in-memory for instant results.
   */
  getAllExercises: async (_req: Request, res: Response) => {
    try {
      const result = await muscleWikiService.getAllExercises();

      success(res, {
        message: 'All exercises retrieved successfully',
        data: {
          exercises: result.exercises,
          total: result.total,
        },
      });
    } catch (error) {
      logger.error({ error }, 'Failed to get all exercises');
      badRequest(res, { message: 'Failed to get all exercises' });
    }
  },

  /**
   * Get available filter options
   * GET /exercises/filters
   */
  getFilterOptions: async (_req: Request, res: Response) => {
    try {
      const filters = await muscleWikiService.getAllFilterOptions();

      success(res, {
        message: 'Filter options retrieved successfully',
        data: { filters },
      });
    } catch (error) {
      logger.error({ error }, 'Failed to get filter options');
      badRequest(res, { message: 'Failed to get filter options' });
    }
  },

  /**
   * Get cache status (for monitoring)
   * GET /exercises/cache/status
   */
  getCacheStatus: async (_req: Request, res: Response) => {
    try {
      const status = await muscleWikiService.getCacheStatus();

      success(res, {
        message: 'Cache status retrieved successfully',
        data: { status },
      });
    } catch (error) {
      logger.error({ error }, 'Failed to get cache status');
      badRequest(res, { message: 'Failed to get cache status' });
    }
  },

  /**
   * Get compliance report (for auditing)
   * GET /exercises/compliance
   */
  getComplianceReport: async (req: Request, res: Response) => {
    try {
      const days = parseInt(req.query.days as string, 10) || 30;
      const report = await muscleWikiService.getComplianceReport(days);

      success(res, {
        message: 'Compliance report retrieved successfully',
        data: { report, periodDays: days },
      });
    } catch (error) {
      logger.error({ error }, 'Failed to get compliance report');
      badRequest(res, { message: 'Failed to get compliance report' });
    }
  },

  /**
   * Populate exercise cache with all MuscleWiki exercises
   * POST /exercises/cache/populate
   * 
   * This endpoint is called by the cron job/edge function to refresh the cache.
   * Requires a valid service token for authentication.
   */
  populateCache: async (req: Request, res: Response) => {
    try {
      // Verify service token from header
      const serviceToken = req.headers['x-service-token'];
      const expectedToken = process.env.CACHE_POPULATE_SERVICE_TOKEN;

      if (!expectedToken || serviceToken !== expectedToken) {
        logger.warn('Unauthorized cache populate attempt');
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const batchSize = parseInt(req.query.batch_size as string, 10) || 100;

      logger.info({ batchSize }, 'Starting cache population via API');

      const result = await muscleWikiService.populateAllExercises(batchSize);

      success(res, {
        message: 'Cache population complete',
        data: result,
      });
    } catch (error) {
      logger.error({ error }, 'Failed to populate cache');
      badRequest(res, { message: 'Failed to populate cache' });
    }
  },

  /**
   * Proxy MuscleWiki images with authentication
   * GET /exercises/images/:filename
   *
   * MuscleWiki images require RapidAPI authentication headers.
   * This endpoint proxies the request with proper auth.
   */
  proxyImage: async (req: Request, res: Response) => {
    try {
      const { filename } = req.params;

      if (!filename) {
        return badRequest(res, { message: 'Filename is required' });
      }

      // Validate filename to prevent path traversal
      if (filename.includes('..') || filename.includes('/')) {
        return badRequest(res, { message: 'Invalid filename' });
      }

      const apiKey = process.env.MUSCLEWIKI_API_KEY;
      const apiHost = process.env.MUSCLEWIKI_API_HOST;

      if (!apiKey || !apiHost) {
        logger.error('MuscleWiki API credentials not configured');
        return badRequest(res, { message: 'Image service unavailable' });
      }

      // Fetch image from MuscleWiki with auth headers
      const imageUrl = `https://${apiHost}/media/images/og_images/${filename}`;

      const response = await fetch(imageUrl, {
        headers: {
          'X-RapidAPI-Key': apiKey,
          'X-RapidAPI-Host': apiHost,
        },
      });

      if (!response.ok) {
        logger.warn({ status: response.status, filename }, 'Failed to fetch image from MuscleWiki');
        return res.status(response.status).send('Image not found');
      }

      // Get content type from response
      const contentType = response.headers.get('content-type') || 'image/jpeg';

      // Set cache headers (24 hours per MuscleWiki Terms)
      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'public, max-age=86400'); // 24 hours
      res.setHeader('X-Content-Source', 'musclewiki-proxy');
      // Allow cross-origin loading (web app is on different port)
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      res.setHeader('Access-Control-Allow-Origin', '*');

      // Stream the image data
      const arrayBuffer = await response.arrayBuffer();
      res.send(Buffer.from(arrayBuffer));
    } catch (error) {
      logger.error({ error }, 'Failed to proxy image');
      res.status(500).send('Failed to load image');
    }
  },

  /**
   * Bulk proxy MuscleWiki images with authentication
   * POST /exercises/images/bulk
   *
   * Fetches multiple images in a single request to avoid rate limiting.
   * Returns a map of filename -> base64 data URL.
   * Max 50 images per request.
   */
  proxyImagesBulk: async (req: Request, res: Response) => {
    try {
      const { filenames } = req.body;

      if (!Array.isArray(filenames) || filenames.length === 0) {
        return badRequest(res, { message: 'filenames array is required' });
      }

      // Limit to 50 images per request
      const limitedFilenames = filenames.slice(0, 50);

      const apiKey = process.env.MUSCLEWIKI_API_KEY;
      const apiHost = process.env.MUSCLEWIKI_API_HOST;

      if (!apiKey || !apiHost) {
        logger.error('MuscleWiki API credentials not configured');
        return badRequest(res, { message: 'Image service unavailable' });
      }

      // Fetch images in parallel with concurrency limit
      const concurrencyLimit = 10;
      const results: Record<string, string> = {};
      
      // Process in batches to limit concurrency
      for (let i = 0; i < limitedFilenames.length; i += concurrencyLimit) {
        const batch = limitedFilenames.slice(i, i + concurrencyLimit);
        
        const batchResults = await Promise.allSettled(
          batch.map(async (filename: string) => {
            // Validate filename
            if (typeof filename !== 'string' || filename.includes('..') || filename.includes('/')) {
              return { filename, data: null };
            }

            try {
              const imageUrl = `https://${apiHost}/media/images/og_images/${filename}`;
              const response = await fetch(imageUrl, {
                headers: {
                  'X-RapidAPI-Key': apiKey,
                  'X-RapidAPI-Host': apiHost,
                },
              });

              if (!response.ok) {
                return { filename, data: null };
              }

              const arrayBuffer = await response.arrayBuffer();
              const base64 = Buffer.from(arrayBuffer).toString('base64');
              const contentType = response.headers.get('content-type') || 'image/jpeg';
              
              return { filename, data: `data:${contentType};base64,${base64}` };
            } catch (error) {
              logger.warn({ error, filename }, 'Failed to fetch image in bulk');
              return { filename, data: null };
            }
          })
        );

        // Process results
        for (const result of batchResults) {
          if (result.status === 'fulfilled' && result.value.data) {
            results[result.value.filename] = result.value.data;
          }
        }
      }

      // Set cache headers
      res.setHeader('Cache-Control', 'public, max-age=86400'); // 24 hours
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      res.setHeader('Access-Control-Allow-Origin', '*');

      success(res, {
        message: 'Bulk images retrieved successfully',
        data: { images: results },
      });
    } catch (error) {
      logger.error({ error }, 'Failed to proxy bulk images');
      badRequest(res, { message: 'Failed to load images' });
    }
  },

  /**
   * Proxy MuscleWiki videos with authentication
   * GET /exercises/videos/stream/:filename
   *
   * MuscleWiki videos require RapidAPI authentication headers.
   * This endpoint proxies the request with proper auth.
   */
  proxyVideo: async (req: Request, res: Response) => {
    try {
      const { filename } = req.params;

      if (!filename) {
        return badRequest(res, { message: 'Filename is required' });
      }

      // Validate filename to prevent path traversal
      if (filename.includes('..') || filename.includes('/')) {
        return badRequest(res, { message: 'Invalid filename' });
      }

      const apiKey = process.env.MUSCLEWIKI_API_KEY;
      const apiHost = process.env.MUSCLEWIKI_API_HOST;

      if (!apiKey || !apiHost) {
        logger.error('MuscleWiki API credentials not configured');
        return badRequest(res, { message: 'Video service unavailable' });
      }

      // Fetch video from MuscleWiki with auth headers
      const videoUrl = `https://${apiHost}/media/videos/branded/${filename}`;

      const response = await fetch(videoUrl, {
        headers: {
          'X-RapidAPI-Key': apiKey,
          'X-RapidAPI-Host': apiHost,
        },
      });

      if (!response.ok) {
        logger.warn({ status: response.status, filename }, 'Failed to fetch video from MuscleWiki');
        return res.status(response.status).send('Video not found');
      }

      // Get content type from response
      const contentType = response.headers.get('content-type') || 'video/mp4';

      // Set headers for video streaming (transient caching only per MuscleWiki Terms)
      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'no-store'); // No persistent caching per Terms
      res.setHeader('X-Content-Source', 'musclewiki-proxy');
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      res.setHeader('Access-Control-Allow-Origin', '*');

      // Stream the video data
      const arrayBuffer = await response.arrayBuffer();
      res.send(Buffer.from(arrayBuffer));
    } catch (error) {
      logger.error({ error }, 'Failed to proxy video');
      res.status(500).send('Failed to load video');
    }
  },
};
