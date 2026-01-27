import { Router } from 'express';
import { exercisesController } from './exercises.controller';
import { supabaseAuthenticate } from '../../../middlewares/supabase-auth';

export const exercisesRouter = Router();

/**
 * @swagger
 * /api/v1/exercises/search:
 *   get:
 *     summary: Quick search exercises using MuscleWiki's search endpoint
 *     tags: [Exercises]
 *     description: |
 *       Optimized for search bar autocomplete. Uses MuscleWiki's relevance-scored search.
 *       Minimum 2 characters required. Debounce on frontend recommended (300ms).
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *           minLength: 2
 *         description: Search query (minimum 2 characters)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *           maximum: 50
 *         description: Maximum results to return (1-50)
 *     responses:
 *       200:
 *         description: Search results retrieved successfully
 */
exercisesRouter.get('/search', exercisesController.quickSearch);

/**
 * @swagger
 * /api/v1/exercises/all:
 *   get:
 *     summary: Get ALL exercises from cache in a single request
 *     tags: [Exercises]
 *     description: |
 *       Returns all 1700+ exercises with their cached thumbnail URLs.
 *       Frontend should call this once on app load and cache the results.
 *       Search/filter then happens in-memory for instant results.
 *     responses:
 *       200:
 *         description: All exercises retrieved successfully
 */
exercisesRouter.get('/all', exercisesController.getAllExercises);

/**
 * @swagger
 * /api/v1/exercises/filters:
 *   get:
 *     summary: Get available filter options for exercises
 *     tags: [Exercises]
 *     responses:
 *       200:
 *         description: Filter options retrieved successfully
 */
exercisesRouter.get('/filters', exercisesController.getFilterOptions);

/**
 * @swagger
 * /api/v1/exercises/cache/status:
 *   get:
 *     summary: Get cache status for monitoring
 *     tags: [Exercises]
 *     responses:
 *       200:
 *         description: Cache status retrieved successfully
 */
exercisesRouter.get('/cache/status', exercisesController.getCacheStatus);

/**
 * @swagger
 * /api/v1/exercises/compliance:
 *   get:
 *     summary: Get compliance report for MuscleWiki API usage
 *     tags: [Exercises]
 *     parameters:
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *           default: 30
 *         description: Number of days to include in report
 *     responses:
 *       200:
 *         description: Compliance report retrieved successfully
 */
exercisesRouter.get('/compliance', exercisesController.getComplianceReport);

/**
 * @swagger
 * /api/v1/exercises/cache/populate:
 *   post:
 *     summary: Populate exercise cache with all MuscleWiki exercises
 *     tags: [Exercises]
 *     description: |
 *       Called by cron job to refresh the exercise cache.
 *       Requires X-Service-Token header with valid service token.
 *     parameters:
 *       - in: header
 *         name: X-Service-Token
 *         required: true
 *         schema:
 *           type: string
 *         description: Service authentication token
 *       - in: query
 *         name: batch_size
 *         schema:
 *           type: integer
 *           default: 100
 *         description: Number of exercises to fetch per API call
 *     responses:
 *       200:
 *         description: Cache population complete
 *       401:
 *         description: Unauthorized
 */
exercisesRouter.post('/cache/populate', exercisesController.populateCache);

/**
 * @swagger
 * /api/v1/exercises:
 *   get:
 *     summary: Search exercises from MuscleWiki
 *     tags: [Exercises]
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         description: Search term (alias for 'search')
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in exercise names and steps (min 2 characters)
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [band, barbell, bodyweight, bosu-ball, cables, cardio, dumbbells, kettlebells, machine, medicine-ball, plate, recovery, smith-machine, stretches, trx, vitruvian, yoga]
 *         description: Equipment category
 *       - in: query
 *         name: difficulty
 *         schema:
 *           type: string
 *           enum: [novice, intermediate, advanced]
 *         description: Difficulty level
 *       - in: query
 *         name: muscle
 *         schema:
 *           type: string
 *         description: Target muscle group (e.g., Biceps, Chest)
 *       - in: query
 *         name: force
 *         schema:
 *           type: string
 *           enum: [push, pull, static]
 *         description: Force type
 *       - in: query
 *         name: mechanic
 *         schema:
 *           type: string
 *           enum: [compound, isolation]
 *         description: Mechanic type
 *       - in: query
 *         name: grips
 *         schema:
 *           type: string
 *         description: Filter by grip types (e.g., Overhand, Underhand)
 *       - in: query
 *         name: gender
 *         schema:
 *           type: string
 *           enum: [male, female]
 *         description: Filter videos by gender for personalized exercise demonstrations
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *           maximum: 100
 *         description: Number of results to return (1-100)
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Offset for pagination
 *     responses:
 *       200:
 *         description: Exercises retrieved successfully
 */
exercisesRouter.get('/', exercisesController.searchExercises);

/**
 * @swagger
 * /api/v1/exercises/images/bulk:
 *   post:
 *     summary: Bulk fetch MuscleWiki images with authentication
 *     tags: [Exercises]
 *     description: |
 *       Fetches multiple images in a single request to avoid rate limiting.
 *       Returns a map of filename -> base64 data URL.
 *       Max 50 images per request.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - filenames
 *             properties:
 *               filenames:
 *                 type: array
 *                 items:
 *                   type: string
 *                 maxItems: 50
 *                 description: Array of image filenames to fetch
 *     responses:
 *       200:
 *         description: Bulk images retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 images:
 *                   type: object
 *                   additionalProperties:
 *                     type: string
 *                   description: Map of filename to base64 data URL
 *       400:
 *         description: Invalid request
 */
exercisesRouter.post('/images/bulk', exercisesController.proxyImagesBulk);

/**
 * @swagger
 * /api/v1/exercises/images/{filename}:
 *   get:
 *     summary: Proxy MuscleWiki images with authentication
 *     tags: [Exercises]
 *     description: |
 *       MuscleWiki images require RapidAPI authentication headers.
 *       This endpoint proxies image requests with proper authentication.
 *       Images are cached for 24 hours per MuscleWiki Terms of Use.
 *     parameters:
 *       - in: path
 *         name: filename
 *         required: true
 *         schema:
 *           type: string
 *         description: Image filename (e.g., og-male-Barbell-barbell-curl-front.jpg)
 *     responses:
 *       200:
 *         description: Image data
 *         content:
 *           image/jpeg:
 *             schema:
 *               type: string
 *               format: binary
 *       400:
 *         description: Invalid filename
 *       404:
 *         description: Image not found
 */
exercisesRouter.get('/images/:filename', exercisesController.proxyImage);

/**
 * @swagger
 * /api/v1/exercises/videos/stream/{filename}:
 *   get:
 *     summary: Proxy MuscleWiki videos with authentication
 *     tags: [Exercises]
 *     description: |
 *       MuscleWiki videos require RapidAPI authentication headers.
 *       This endpoint proxies video requests with proper authentication.
 *       Videos use transient caching only per MuscleWiki Terms of Use.
 *     parameters:
 *       - in: path
 *         name: filename
 *         required: true
 *         schema:
 *           type: string
 *         description: Video filename (e.g., Barbell-barbell-curl-male-front.mp4)
 *     responses:
 *       200:
 *         description: Video data
 *         content:
 *           video/mp4:
 *             schema:
 *               type: string
 *               format: binary
 *       400:
 *         description: Invalid filename
 *       404:
 *         description: Video not found
 */
exercisesRouter.get('/videos/stream/:filename', exercisesController.proxyVideo);

/**
 * @swagger
 * /api/v1/exercises/{id}:
 *   get:
 *     summary: Get a single exercise by MuscleWiki ID
 *     tags: [Exercises]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: MuscleWiki exercise ID
 *     responses:
 *       200:
 *         description: Exercise retrieved successfully
 *       404:
 *         description: Exercise not found
 */
exercisesRouter.get('/:id', exercisesController.getExerciseById);

/**
 * @swagger
 * /api/v1/exercises/{id}/videos:
 *   get:
 *     summary: Get exercise video URLs (lazy loading)
 *     tags: [Exercises]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: MuscleWiki exercise ID
 *     responses:
 *       200:
 *         description: Video URLs retrieved successfully
 *       404:
 *         description: Exercise not found
 */
exercisesRouter.get('/:id/videos', exercisesController.getExerciseVideos);
