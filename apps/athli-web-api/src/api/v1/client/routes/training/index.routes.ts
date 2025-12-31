import { Router } from 'express';
import { clientTrainingsController } from '../../client-trainings.controller';
import { supabaseAuthenticate } from '../../../../../middlewares/supabase-auth';

export const clientTrainingRouter = Router();

/**
 * @swagger
 * /api/v1/client/trainings/calendar:
 *   post:
 *     summary: Get client training calendar for a date range
 *     tags: [Client Trainings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - startDate
 *               - endDate
 *             properties:
 *               startDate:
 *                 type: string
 *                 format: date
 *                 description: Start date (YYYY-MM-DD)
 *                 example: "2025-12-15"
 *               endDate:
 *                 type: string
 *                 format: date
 *                 description: End date (YYYY-MM-DD)
 *                 example: "2026-01-11"
 *     responses:
 *       200:
 *         description: Training calendar retrieved successfully
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
 *                         calendar:
 *                           type: object
 *                           additionalProperties:
 *                             type: array
 */
clientTrainingRouter.post('/calendar', supabaseAuthenticate, clientTrainingsController.getTrainingCalendar);

/**
 * @swagger
 * /api/v1/client/trainings:
 *   get:
 *     summary: Get client training assignments
 *     tags: [Client Trainings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Client training retrieved successfully
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
 *                         assignments:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/ClientWorkout'
 */
clientTrainingRouter.get('/', supabaseAuthenticate, clientTrainingsController.getTrainings);

/**
 * @swagger
 * /api/v1/client/trainings/{id}:
 *   patch:
 *     summary: Update client training status
 *     tags: [Client Trainings]
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
 *               status:
 *                 type: string
 *                 enum: [pending, in_progress, completed]
 *     responses:
 *       200:
 *         description: Client training updated successfully
 */
clientTrainingRouter.patch('/:id', supabaseAuthenticate, clientTrainingsController.updateTrainingStatus);

/**
 * @swagger
 * /api/v1/client/trainings/assign-workout:
 *   post:
 *     summary: Assign a workout to client calendar
 *     tags: [Client Trainings]
 *     security:
 *       - bearerAuth: []
 */
clientTrainingRouter.post('/assign-workout', supabaseAuthenticate, clientTrainingsController.assignWorkout);

/**
 * @swagger
 * /api/v1/client/trainings/workout-instance:
 *   post:
 *     summary: Get a specific workout instance for a client
 *     tags: [Client Trainings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - workoutId
 *               - date
 *             properties:
 *               workoutId:
 *                 type: string
 *                 description: The ID of the workout
 *                 example: "some-workout-id"
 *               date:
 *                 type: string
 *                 format: date
 *                 description: The date of the workout instance (YYYY-MM-DD)
 *                 example: "2024-07-20"
 *     responses:
 *       200:
 *         description: Workout instance retrieved successfully
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
 *                         workoutInstance:
 *                           $ref: '#/components/schemas/ClientWorkoutInstance'
 */
clientTrainingRouter.post('/workout-instance', supabaseAuthenticate, clientTrainingsController.getWorkoutInstance);

/**
 * @swagger
 * /api/v1/client/trainings/{clientId}/workout/{workoutId}:
 *   delete:
 *     summary: Delete a workout from calendar
 *     tags: [Client Trainings]
 *     security:
 *       - bearerAuth: []
 */
clientTrainingRouter.delete('/:clientId/workout/:workoutId', supabaseAuthenticate, clientTrainingsController.deleteWorkout);

