import { Router } from 'express';
import { clientTrainingsController } from '../../client-trainings.controller';
import { supabaseAuthenticate } from '../../../../../middlewares/supabase-auth';

export const clientTrainingRouter = Router();

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
