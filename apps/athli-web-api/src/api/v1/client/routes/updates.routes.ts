import { Router } from 'express';
import { clientUpdatesController } from '../client-updates.controller';
import { supabaseAuthenticate } from '../../../../middlewares/supabase-auth';

export const clientUpdateRouter = Router();

/**
 * @swagger
 * /api/v1/client/updates:
 *   get:
 *     summary: Get client updates
 *     tags: [Client Updates]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: header
 *         name: x-client-id
 *         schema: { type: string }
 *         description: Client ID (required for coach view)
 *     responses:
 *       200:
 *         description: Updates retrieved successfully
 */
clientUpdateRouter.get('/', supabaseAuthenticate, clientUpdatesController.getUpdates);

/**
 * @swagger
 * /api/v1/client/updates:
 *   post:
 *     summary: Create a new update
 *     tags: [Client Updates]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: header
 *         name: x-client-id
 *         required: true
 *         schema: { type: string }
 *         description: Client ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [update]
 *             properties:
 *               update: { type: string }
 *               update_timestamp: { type: string, format: date-time }
 *     responses:
 *       201:
 *         description: Update created successfully
 */
clientUpdateRouter.post('/', supabaseAuthenticate, clientUpdatesController.createUpdate);

/**
 * @swagger
 * /api/v1/client/updates/{id}:
 *   patch:
 *     summary: Update an existing update
 *     tags: [Client Updates]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *       - in: header
 *         name: x-client-id
 *         required: true
 *         schema: { type: string }
 *         description: Client ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               update: { type: string }
 *               update_timestamp: { type: string, format: date-time }
 *     responses:
 *       200:
 *         description: Update updated successfully
 */
clientUpdateRouter.patch('/:id', supabaseAuthenticate, clientUpdatesController.updateUpdate);

/**
 * @swagger
 * /api/v1/client/updates/{id}:
 *   delete:
 *     summary: Delete an update
 *     tags: [Client Updates]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *       - in: header
 *         name: x-client-id
 *         required: true
 *         schema: { type: string }
 *         description: Client ID
 *     responses:
 *       204:
 *         description: Update deleted successfully
 */
clientUpdateRouter.delete('/:id', supabaseAuthenticate, clientUpdatesController.deleteUpdate);

/**
 * @swagger
 * /api/v1/client/updates:
 *   delete:
 *     summary: Bulk delete updates
 *     tags: [Client Updates]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: header
 *         name: x-client-id
 *         required: true
 *         schema: { type: string }
 *         description: Client ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [updateIds]
 *             properties:
 *               updateIds:
 *                 type: array
 *                 items: { type: string }
 *     responses:
 *       204:
 *         description: Updates deleted successfully
 */
clientUpdateRouter.delete('/', supabaseAuthenticate, clientUpdatesController.bulkDeleteUpdates);
