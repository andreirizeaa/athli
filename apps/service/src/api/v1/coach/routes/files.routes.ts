import { Router } from 'express';
import multer from 'multer';
import { coachFilesController } from '../coach-files.controller';
import { supabaseAuthenticate } from '../../../../middlewares/supabase-auth';

// Configure multer for memory storage
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 50 * 1024 * 1024, // 50MB limit
    },
});

export const coachFileRouter = Router();

// =============================================================================
// Folder Routes (must come before :id routes)
// =============================================================================

coachFileRouter.get('/folders', supabaseAuthenticate, coachFilesController.getFolders);
coachFileRouter.post('/folders', supabaseAuthenticate, coachFilesController.createFolder);
coachFileRouter.patch('/folders/:id', supabaseAuthenticate, coachFilesController.updateFolder);
coachFileRouter.delete('/folders/:id', supabaseAuthenticate, coachFilesController.deleteFolder);
coachFileRouter.get('/folders/:id/files', supabaseAuthenticate, coachFilesController.getFilesInFolder);

// =============================================================================
// File Routes
// =============================================================================

/**
 * @swagger
 * /api/v1/coach/files:
 *   get:
 *     summary: Get all coach files
 *     tags: [Coach Files]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Coach files retrieved successfully
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
 *                         files:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/CoachFile'
 */
coachFileRouter.get('/', supabaseAuthenticate, coachFilesController.getFiles);

/**
 * @swagger
 * /api/v1/coach/files:
 *   post:
 *     summary: Upload a new file
 *     tags: [Coach Files]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *               - filename
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *               filename:
 *                 type: string
 *               tags:
 *                 type: string
 *     responses:
 *       201:
 *         description: File uploaded successfully
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
 *                         file:
 *                           $ref: '#/components/schemas/CoachFile'
 */
coachFileRouter.post('/', supabaseAuthenticate, upload.single('file'), coachFilesController.uploadFile);

/**
 * @swagger
 * /api/v1/coach/files/link:
 *   post:
 *     summary: Create a new link (external URL)
 *     tags: [Coach Files]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - filename
 *               - url
 *             properties:
 *               filename:
 *                 type: string
 *               url:
 *                 type: string
 *     responses:
 *       201:
 *         description: Link created successfully
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
 *                         file:
 *                           $ref: '#/components/schemas/CoachFile'
 */
coachFileRouter.post('/link', supabaseAuthenticate, coachFilesController.createLink);

/**
 * @swagger
 * /api/v1/coach/files/{id}/url:
 *   get:
 *     summary: Get signed URL for file access
 *     tags: [Coach Files]
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
 *         description: Signed URL generated successfully
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
 *                         url:
 *                           type: string
 */
coachFileRouter.get('/:id/url', supabaseAuthenticate, coachFilesController.getFileUrl);

coachFileRouter.patch('/:id/move', supabaseAuthenticate, coachFilesController.moveFile);

/**
 * @swagger
 * /api/v1/coach/files/{id}:
 *   patch:
 *     summary: Update file metadata
 *     tags: [Coach Files]
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
 *             required:
 *               - filename
 *             properties:
 *               filename:
 *                 type: string
 *     responses:
 *       200:
 *         description: File updated successfully
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
 *                         file:
 *                           $ref: '#/components/schemas/CoachFile'
 */
coachFileRouter.patch('/:id', supabaseAuthenticate, coachFilesController.updateFile);

/**
 * @swagger
 * /api/v1/coach/files/{id}:
 *   delete:
 *     summary: Delete a file
 *     tags: [Coach Files]
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
 *         description: File deleted successfully
 */
coachFileRouter.delete('/:id', supabaseAuthenticate, coachFilesController.deleteFile);
