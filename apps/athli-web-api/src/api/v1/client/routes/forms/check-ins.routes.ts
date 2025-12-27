import { Router } from 'express';
import { clientCheckInsController } from '../../client-check-ins.controller';
import { supabaseAuthenticate } from '../../../../../middlewares/supabase-auth';

export const clientCheckInRouter = Router();

/**
 * @swagger
 * /api/v1/client/forms/check-ins:
 *   get:
 *     summary: Get client check-in assignments
 *     tags: [Client Forms]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Client check-ins retrieved successfully
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
 *                             $ref: '#/components/schemas/ClientCheckIn'
 */
clientCheckInRouter.get('/', supabaseAuthenticate, clientCheckInsController.getCheckIns);

/**
 * @swagger
 * /api/v1/client/forms/check-ins/{id}/submit:
 *   post:
 *     summary: Submit a check-in
 *     tags: [Client Forms]
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
 *             $ref: '#/components/schemas/SubmitFormInput'
 *     responses:
 *       200:
 *         description: Check-in submitted successfully
 */
clientCheckInRouter.post('/:id/submit', supabaseAuthenticate, clientCheckInsController.submitCheckIn);

/**
 * @swagger
 * /api/v1/client/check-ins/{id}:
 *   delete:
 *     summary: Unassign (Hide) a check-in
 *     tags: [Client Forms]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Check-in unassigned successfully
 */
clientCheckInRouter.delete('/:id', supabaseAuthenticate, clientCheckInsController.deleteAssignment);
clientCheckInRouter.delete('/', supabaseAuthenticate, clientCheckInsController.deleteAssignment);
