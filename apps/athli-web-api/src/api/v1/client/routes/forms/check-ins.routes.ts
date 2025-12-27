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
 *     parameters:
 *       - in: header
 *         name: x-client-id
 *         schema: { type: string }
 *       - in: header
 *         name: x-coach-id
 *         schema: { type: string }
 *     responses: { 200: { description: 'Success' } }
 *   post:
 *     summary: Assign check-ins to client (Coach only)
 *     tags: [Client Forms]
 *     parameters:
 *       - in: header
 *         name: x-client-id
 *         required: true
 *         schema: { type: string }
 *       - in: header
 *         name: x-coach-id
 *         required: true
 *         schema: { type: string }
 *   delete:
 *     summary: Unassign check-ins from client (Coach only)
 *     tags: [Client Forms]
 *     parameters:
 *       - in: header
 *         name: x-client-id
 *         required: true
 *         schema: { type: string }
 *       - in: header
 *         name: x-coach-id
 *         required: true
 *         schema: { type: string }
 */
clientCheckInRouter.get('/', supabaseAuthenticate, clientCheckInsController.getCheckIns);
clientCheckInRouter.post('/', supabaseAuthenticate, clientCheckInsController.assignCheckIn);
clientCheckInRouter.delete('/', supabaseAuthenticate, clientCheckInsController.deleteAssignment);

/**
 * @swagger
 * /api/v1/client/forms/check-ins/{id}/submit:
 *   post:
 *     summary: Submit a check-in
 *     tags: [Client Forms]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *       - in: header
 *         name: x-client-id
 *         schema: { type: string }
 *       - in: header
 *         name: x-coach-id
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SubmitFormInput'
 *     responses: { 200: { description: 'Success' } }
 */
clientCheckInRouter.post('/:id/submit', supabaseAuthenticate, clientCheckInsController.submitCheckIn);
