import { Request, Response } from 'express';
import { success, notFound, badRequest } from '../../../utils/http-response';
import { muscleWikiService } from '../../../services/musclewiki.service';
import { logger } from '../../../utils/logger';

/**
 * Exercise Controller
 *
 * Handles all exercise-related endpoints.
 * All MuscleWiki API calls go through the muscleWikiService which implements
 * cache-first approach and compliance logging.
 */
export const exercisesController = {
  /**
   * Search exercises from MuscleWiki cache
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
        limit = '50',
        offset = '0',
      } = req.query;

      const userId = (req as any).userId;
      const requestSource = req.headers['x-request-source'] as string || 'web_app';

      // Support both 'q' and 'search' for search term
      // Support both 'muscle' and 'muscles' for muscle filter
      const exercises = await muscleWikiService.searchExercises(
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
          exercises,
          total: exercises.length,
          limit: parseInt(limit as string, 10),
          offset: parseInt(offset as string, 10),
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
      const { id } = req.params;
      const userId = (req as any).userId;
      const requestSource = req.headers['x-request-source'] as string || 'web_app';

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
      const { id } = req.params;
      const userId = (req as any).userId;
      const requestSource = req.headers['x-request-source'] as string || 'web_app';

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
};
