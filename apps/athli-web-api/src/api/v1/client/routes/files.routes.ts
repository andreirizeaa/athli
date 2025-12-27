import { Router } from 'express';
import { clientFilesController } from '../client-files.controller';
import { supabaseAuthenticate } from '../../../../middlewares/supabase-auth';

export const clientFileRouter = Router();

/**
 * @swagger
 * /api/v1/client/files:
 *   get:
 *     summary: Get client files
 *     tags: [Client Files]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Client files retrieved successfully
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
 *                             type: object
 *                             properties:
 *                               id: { type: 'string' }
 *                               file:
 *                                 type: object
 *                                 properties:
 *                                   id: { type: 'string' }
 *                                   name: { type: 'string' }
 *                                   file_url: { type: 'string' }
 */
clientFileRouter.get('/', supabaseAuthenticate, clientFilesController.getFiles);

/**
 * @swagger
 * /api/v1/client/files/{id}/url:
 *   get:
 *     summary: Get signed URL for file
 *     tags: [Client Files]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: URL generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     url: { type: string }
 */
clientFileRouter.get('/:id/url', supabaseAuthenticate, clientFilesController.getFileUrl);

/**
 * @swagger
 * /api/v1/client/files:
 *   post:
 *     summary: Assign files to client
 *     tags: [Client Files]
 *   delete:
 *     summary: Unassign files from client
 *     tags: [Client Files]
 */
clientFileRouter.post('/', supabaseAuthenticate, clientFilesController.assignFile);
clientFileRouter.delete('/', supabaseAuthenticate, clientFilesController.deleteAssignment);
