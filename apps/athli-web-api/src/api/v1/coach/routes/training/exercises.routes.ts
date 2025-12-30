import { Router } from 'express';

import { coachExercisesController } from '../../coach-exercises.controller';
import { supabaseAuthenticate } from '../../../../../middlewares/supabase-auth';

export const coachExerciseRouter = Router();

/**
 * @swagger
 * /api/v1/coach/training/exercises:
 *   get:
 *     summary: Get coach exercises
 *     tags: [Coach Training]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Coach exercises retrieved successfully
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
 *                         exercises:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/CoachExercise'
 */
coachExerciseRouter.get('/', supabaseAuthenticate, coachExercisesController.getExercises);

/**
 * @swagger
 * /api/v1/coach/training/exercises/{id}:
 *   patch:
 *     summary: Update coach exercise
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
 *               name: { type: 'string' }
 *               description: { type: 'string' }
 *               category: { type: 'string' }
 *               muscle_group: { type: 'string' }
 *               equipment: { type: 'string' }
 *               modality: { type: 'string' }
 *               video_link: { type: 'string' }
 *     responses:
 *       200:
 *         description: Coach exercise updated successfully
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
 *                         exercise:
 *                           $ref: '#/components/schemas/CoachExercise'
 */
coachExerciseRouter.patch('/:id', supabaseAuthenticate, coachExercisesController.updateExercise);

/**
 * @swagger
 * /api/v1/coach/training/exercises:
 *   post:
 *     summary: Create coach exercise
 *     tags: [Coach Training]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateCoachExerciseInput'
 *     responses:
 *       201:
 *         description: Coach exercise created successfully
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
 *                         exercise:
 *                           $ref: '#/components/schemas/CoachExercise'
 *
 * /api/v1/coach/training/exercises/{id}:
 *   delete:
 *     summary: Delete coach exercise
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
 *         description: Coach exercise deleted successfully
 */
coachExerciseRouter.post('/', supabaseAuthenticate, coachExercisesController.createExercise);
coachExerciseRouter.get('/:id', supabaseAuthenticate, coachExercisesController.getExerciseById);
coachExerciseRouter.delete('/:id', supabaseAuthenticate, coachExercisesController.deleteExercise);
coachExerciseRouter.post('/:id/duplicate', supabaseAuthenticate, coachExercisesController.duplicateExercise);
coachExerciseRouter.patch('/:id/toggle-favorite', supabaseAuthenticate, coachExercisesController.toggleFavorite);
