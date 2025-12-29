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
