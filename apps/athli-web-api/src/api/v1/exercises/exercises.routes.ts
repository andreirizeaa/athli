import { Router } from 'express';
import { exercisesController } from './exercises.controller';

export const exercisesRouter = Router();

/**
 * @swagger
 * /api/v1/exercises:
 *   get:
 *     summary: Get all exercises
 *     tags: [Exercises]
 *     responses:
 *       200:
 *         description: Exercises retrieved successfully
 */
exercisesRouter.get('/', exercisesController.getExercises);
