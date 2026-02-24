import { Router } from 'express';
import { clientCheckInsController } from '../../client-check-ins.controller';
import { clientPdfController } from '../../client-pdf.controller';
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
 * /api/v1/client/forms/check-ins/create:
 *   post:
 *     summary: Create a client-specific check-in (not from library)
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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name: { type: string }
 *               description: { type: string }
 *               questions: { type: array }
 *               schedule_config: { type: object }
 *               cron_expression: { type: string }
 *     responses: { 201: { description: 'Created' } }
 */
clientCheckInRouter.post('/create', supabaseAuthenticate, clientCheckInsController.createCheckIn);

/**
 * @swagger
 * /api/v1/client/forms/check-ins/{id}:
 *   get:
 *     summary: Get a single check-in by ID
 *     tags: [Client Forms]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *       - in: header
 *         name: x-client-id
 *         required: true
 *         schema: { type: string }
 *       - in: header
 *         name: x-coach-id
 *         required: true
 *         schema: { type: string }
 *     responses: { 200: { description: 'Success' } }
 *   patch:
 *     summary: Update a check-in (questions, etc.)
 *     tags: [Client Forms]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *       - in: header
 *         name: x-client-id
 *         required: true
 *         schema: { type: string }
 *       - in: header
 *         name: x-coach-id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               questions: { type: array }
 *               name: { type: string }
 *               description: { type: string }
 *     responses: { 200: { description: 'Success' } }
 */
clientCheckInRouter.get('/:id', supabaseAuthenticate, clientCheckInsController.getCheckInById);
clientCheckInRouter.patch('/:id', supabaseAuthenticate, clientCheckInsController.updateCheckIn);

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
clientCheckInRouter.get('/:id/pdf', supabaseAuthenticate, clientPdfController.getCheckInPdf);
clientCheckInRouter.post('/:id/submit', supabaseAuthenticate, clientCheckInsController.submitCheckIn);

/**
 * @swagger
 * /api/v1/client/forms/check-ins/{id}/status:
 *   patch:
 *     summary: Update check-in status (publish/pause)
 *     tags: [Client Forms]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *       - in: header
 *         name: x-client-id
 *         required: true
 *         schema: { type: string }
 *       - in: header
 *         name: x-coach-id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status: { type: string, enum: [live, paused] }
 *     responses: { 200: { description: 'Success' } }
 */
clientCheckInRouter.patch('/:id/status', supabaseAuthenticate, clientCheckInsController.updateCheckInStatus);

/**
 * @swagger
 * /api/v1/client/forms/check-ins/{id}/logs:
 *   get:
 *     summary: Get all submission logs for a check-in assignment
 *     tags: [Client Forms]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *       - in: header
 *         name: x-client-id
 *         required: true
 *         schema: { type: string }
 *       - in: header
 *         name: x-coach-id
 *         required: true
 *         schema: { type: string }
 *     responses: { 200: { description: 'Success' } }
 */
clientCheckInRouter.get('/:id/logs', supabaseAuthenticate, clientCheckInsController.getCheckInLogs);

/**
 * @swagger
 * /api/v1/client/forms/check-ins/{id}/logs/{logId}:
 *   get:
 *     summary: Get a single check-in log with questions from parent
 *     tags: [Client Forms]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: logId
 *         required: true
 *         schema: { type: string }
 *       - in: header
 *         name: x-client-id
 *         required: true
 *         schema: { type: string }
 *       - in: header
 *         name: x-coach-id
 *         required: true
 *         schema: { type: string }
 *     responses: { 200: { description: 'Success' } }
 */
clientCheckInRouter.get('/:id/logs/:logId', supabaseAuthenticate, clientCheckInsController.getCheckInLog);

/**
 * @swagger
 * /api/v1/client/forms/check-ins/{id}/logs/{logId}/review:
 *   patch:
 *     summary: Add or update a coach review on a check-in log
 *     tags: [Client Forms]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: logId
 *         required: true
 *         schema: { type: string }
 *       - in: header
 *         name: x-client-id
 *         required: true
 *         schema: { type: string }
 *       - in: header
 *         name: x-coach-id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [review]
 *             properties:
 *               review: { type: string }
 *     responses: { 200: { description: 'Success' } }
 */
clientCheckInRouter.patch('/:id/logs/:logId/review', supabaseAuthenticate, clientCheckInsController.reviewCheckInLog);
