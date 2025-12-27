import { Router } from 'express';
import { clientFilesController } from '../client-files.controller';
import { supabaseAuthenticate } from '../../../../middlewares/supabase-auth';
import multer from 'multer';

const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 50 * 1024 * 1024, // 50MB limit
    },
});

export const clientFileRouter = Router();

/**
 * @swagger
 * /api/v1/client/files:
 *   get:
 *     summary: Get client files
 *     tags: [Client Files]
 *     parameters:
 *       - in: header
 *         name: x-client-id
 *         schema: { type: string }
 *       - in: header
 *         name: x-coach-id
 *         schema: { type: string }
 *     responses: { 200: { description: 'Success' } }
 *   post:
 *     summary: Assign files to client (Coach only)
 *     tags: [Client Files]
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
 *     summary: Unassign files from client (Coach only)
 *     tags: [Client Files]
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
clientFileRouter.get('/', supabaseAuthenticate, clientFilesController.getFiles);
clientFileRouter.post('/', supabaseAuthenticate, clientFilesController.assignFile);
clientFileRouter.post('/upload', supabaseAuthenticate, upload.single('file'), clientFilesController.uploadFile);
clientFileRouter.delete('/', supabaseAuthenticate, clientFilesController.deleteAssignment);

/**
 * @swagger
 * /api/v1/client/files/{id}/url:
 *   get:
 *     summary: Get signed URL for file
 *     tags: [Client Files]
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
 */
clientFileRouter.get('/:id/url', supabaseAuthenticate, clientFilesController.getFileUrl);
