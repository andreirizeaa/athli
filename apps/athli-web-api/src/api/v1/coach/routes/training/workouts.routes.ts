import { Router } from 'express';

import { coachWorkoutsController } from '../../coach-workouts.controller';
import { supabaseAuthenticate } from '../../../../../middlewares/supabase-auth';

export const coachWorkoutRouter = Router();

/**
 * @swagger
 * /api/v1/coach/training/workouts:
 *   get:
 *     summary: Get coach workouts
 *     tags: [Coach Training]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Coach workouts retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         workouts:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/CoachWorkout'
 */
coachWorkoutRouter.get('/', supabaseAuthenticate, coachWorkoutsController.getWorkouts);

/**
 * @swagger
 * /api/v1/coach/training/workouts:
 *   post:
 *     summary: Create coach workout
 *     tags: [Coach Training]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateCoachWorkoutInput'
 *     responses:
 *       201:
 *         description: Coach workout created successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         workout:
 *                           $ref: '#/components/schemas/CoachWorkout'
 *
 * /api/v1/coach/training/workouts/{id}:
 *   patch:
 *     summary: Update coach workout
 *     tags: [Coach Training]
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
 *             properties:
 *               title: { type: 'string' }
 *               description: { type: 'string' }
 *               type: { type: 'string' }
 *               equipment: { type: 'string' }
 *               difficulty: { type: 'string' }
 *               workout_data: { type: 'object' }
 *               total_exercises: { type: 'integer' }
 *     responses:
 *       200:
 *         description: Coach workout updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         workout:
 *                           $ref: '#/components/schemas/CoachWorkout'
 *   delete:
 *     summary: Delete coach workout
 *     tags: [Coach Training]
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
 *
 * /api/v1/coach/training/workouts/{id}/duplicate:
 *   post:
 *     summary: Duplicate coach workout
 *     tags: [Coach Training]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       201:
 *         description: Coach workout duplicated successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         workout:
 *                           $ref: '#/components/schemas/CoachWorkout'
 */
coachWorkoutRouter.post('/', supabaseAuthenticate, coachWorkoutsController.createWorkout);

coachWorkoutRouter.patch('/:id', supabaseAuthenticate, coachWorkoutsController.updateWorkout);

coachWorkoutRouter.delete('/:id', supabaseAuthenticate, coachWorkoutsController.deleteWorkout);

coachWorkoutRouter.post('/:id/duplicate', supabaseAuthenticate, coachWorkoutsController.duplicateWorkout);
