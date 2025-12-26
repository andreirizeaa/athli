import { Router } from 'express';

import { coachWorkoutsController } from '../../coach-workouts.controller';
import { supabaseAuthenticate } from '../../../../../middlewares/supabase-auth';

export const coachWorkoutRouter = Router();

/**
 * @swagger
 * /api/v1/coach/training/workouts:
 *   get:
 *     summary: Get coach workouts
 *     tags: [Coach]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Coach workouts retrieved successfully
 */
coachWorkoutRouter.get('/', supabaseAuthenticate, coachWorkoutsController.getWorkouts);

/**
 * @swagger
 * /api/v1/coach/training/workouts:
 *   post:
 *     summary: Create coach workout
 *     tags: [Coach]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: Coach workout created successfully
 *
 * /api/v1/coach/training/workouts/{id}:
 *   patch:
 *     summary: Update coach workout
 *     tags: [Coach]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Coach workout updated successfully
 *   delete:
 *     summary: Delete coach workout
 *     tags: [Coach]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Coach workout deleted successfully
 */
coachWorkoutRouter.post('/', supabaseAuthenticate, coachWorkoutsController.createWorkout);

coachWorkoutRouter.patch('/:id', supabaseAuthenticate, coachWorkoutsController.updateWorkout);

coachWorkoutRouter.delete('/:id', supabaseAuthenticate, coachWorkoutsController.deleteWorkout);

coachWorkoutRouter.post('/:id/duplicate', supabaseAuthenticate, coachWorkoutsController.duplicateWorkout);
