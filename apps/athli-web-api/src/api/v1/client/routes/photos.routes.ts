import { Router } from 'express';
import multer from 'multer';
import { clientPhotosController } from '../client-photos.controller';
import { supabaseAuthenticate } from '../../../../middlewares/supabase-auth';

// Configure multer for memory storage
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
    },
});

export const clientPhotoRouter = Router();

// ... (existing GET)

clientPhotoRouter.get('/', supabaseAuthenticate, clientPhotosController.getPhotos);

clientPhotoRouter.post('/check', supabaseAuthenticate, clientPhotosController.checkExistingPhotos);

/**
 * @swagger
 * /api/v1/client/photos:
 *   post:
 *     summary: Upload client progress photo
 *     tags: [Client Photos]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [file, category]
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *               category: { type: 'string' }
 *         application/json:
 *           schema:
 *             type: object
 *             required: [photo_url]
 *             properties:
 *               photo_url: { type: 'string' }
 *               category: { type: 'string' }
 *     responses:
 *       201:
 *         description: Progress photo uploaded successfully
 */
clientPhotoRouter.post(
    '/',
    supabaseAuthenticate,
    upload.fields([
        { name: 'front', maxCount: 1 },
        { name: 'side', maxCount: 1 },
        { name: 'back', maxCount: 1 },
    ]),
    clientPhotosController.uploadPhoto
);

/**
 * @swagger
 * /api/v1/client/photos/{id}:
 *   delete:
 *     summary: Delete client progress photo
 *     tags: [Client Photos]
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
 *         description: Progress photo deleted successfully
 */
clientPhotoRouter.delete('/:id', supabaseAuthenticate, clientPhotosController.deletePhoto);

/**
 * @swagger
 * /api/v1/client/photos/{id}/{angle}:
 *   delete:
 *     summary: Delete a specific photo angle (front, back, or side)
 *     tags: [Client Photos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: angle
 *         required: true
 *         schema:
 *           type: string
 *           enum: [front, back, side]
 *     responses:
 *       204:
 *         description: Photo angle deleted successfully
 */
clientPhotoRouter.delete('/:id/:angle', supabaseAuthenticate, clientPhotosController.deletePhotoAngle);
