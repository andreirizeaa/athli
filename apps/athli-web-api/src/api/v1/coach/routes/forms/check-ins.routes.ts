import { Router } from 'express';
import { coachCheckInsController } from '../../coach-check-ins.controller';
import { supabaseAuthenticate } from '../../../../../middlewares/supabase-auth';

export const coachCheckInRouter = Router();

/**
 * @swagger
 * /api/v1/coach/forms/check-ins:
 *   get:
 *     summary: Get coach check-ins
 *     tags: [Coach]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Coach check-ins retrieved successfully
 */
coachCheckInRouter.get('/', supabaseAuthenticate, coachCheckInsController.getCheckIns);

/**
 * @swagger
 * /api/v1/coach/forms/check-ins/{id}:
 *   get:
 *     summary: Get coach check-in by ID
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
 *         description: Coach check-in retrieved successfully
 */
coachCheckInRouter.get('/:id', supabaseAuthenticate, coachCheckInsController.getCheckInById);

/**
 * @swagger
 * /api/v1/coach/forms/check-ins/{id}:
 *   patch:
 *     summary: Update coach check-in
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
 *         description: Coach check-in updated successfully
 */
coachCheckInRouter.patch('/:id', supabaseAuthenticate, coachCheckInsController.updateCheckIn);

/**
 * @swagger
 * /api/v1/coach/forms/check-ins:
 *   post:
 *     summary: Create coach check-in
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
 *         description: Coach check-in created successfully
 */
coachCheckInRouter.post('/', supabaseAuthenticate, coachCheckInsController.createCheckIn);

/**
 * @swagger
 * /api/v1/coach/forms/check-ins/{id}:
 *   delete:
 *     summary: Delete coach check-in
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
 *         description: Coach check-in deleted successfully
 */
coachCheckInRouter.delete('/:id', supabaseAuthenticate, coachCheckInsController.deleteCheckIn);
