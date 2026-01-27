import { Router } from 'express';
import { exercisesController } from './exercises.controller';
import { supabaseAuthenticate } from '../../../middlewares/supabase-auth';

export const exercisesRouter = Router();

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
