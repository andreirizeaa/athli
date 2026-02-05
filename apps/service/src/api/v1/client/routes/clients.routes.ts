import { Router } from 'express';
import { clientProfileController } from '../client-profile.controller';
import { supabaseAuthenticate } from '../../../../middlewares/supabase-auth';
import multer from 'multer';

const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 50 * 1024 * 1024, // 50MB limit
    },
});

export const clientBaseRouter = Router();

/**
 * @swagger
 * /api/v1/client:
 *   get:
 *     summary: Get client profile
 *     tags: [Client Profile]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Client profile retrieved successfully
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
 *                         profile:
 *                           $ref: '#/components/schemas/ClientProfile'
 */
clientBaseRouter.get('/', supabaseAuthenticate, clientProfileController.getProfile);

/**
 * @swagger
 * /api/v1/client:
 *   patch:
 *     summary: Update client profile
 *     tags: [Client Profile]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ClientProfile'
 *     responses:
 *       200:
 *         description: Client profile updated successfully
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
 *                         profile:
 *                           $ref: '#/components/schemas/ClientProfile'
 */
clientBaseRouter.patch('/', supabaseAuthenticate, upload.single('avatar'), clientProfileController.updateProfile);

