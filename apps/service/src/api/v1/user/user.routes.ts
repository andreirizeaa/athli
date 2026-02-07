import { Router } from 'express';
import multer from 'multer';
import { userController } from './user.controller';
import { validate } from '../../../middlewares/validate';
import { supabaseAuthenticate } from '../../../middlewares/supabase-auth';
import { updateProfileSchema, ensureClientProfileSchema, newClientSchema } from './user.schemas';

const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 50 * 1024 * 1024, // 50MB limit
    },
});

export const userRouter = Router();

/**
 * @swagger
 * /api/v1/user/me:
 *   get:
 *     summary: Get current user profile
 *     tags: [User]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: User profile retrieved successfully
 */
userRouter.get('/me', supabaseAuthenticate, userController.getProfile);

/**
 * @swagger
 * /api/v1/user/me:
 *   patch:
 *     summary: Update user profile
 *     tags: [User]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               profilePictureUrl:
 *                 type: string
 *     responses:
 *       200:
 *         description: Profile updated successfully
 */
userRouter.patch('/me', supabaseAuthenticate, upload.single('avatar'), validate(updateProfileSchema), userController.updateProfile);

/**
 * @swagger
 * /api/v1/user/ensure-client-profile:
 *   post:
 *     summary: Ensure client profile exists for current user
 *     tags: [User]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - coachId
 *             properties:
 *               coachId:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       200:
 *         description: Client profile ready
 */
userRouter.post('/ensure-client-profile', supabaseAuthenticate, validate(ensureClientProfileSchema), userController.ensureClientProfile);

/**
 * @swagger
 * /api/v1/user/ensure-coach-profile:
 *   post:
 *     summary: Ensure coach profile exists for current user
 *     tags: [User]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Coach profile ready
 */
userRouter.post('/ensure-coach-profile', supabaseAuthenticate, userController.ensureCoachProfile);

/**
 * @swagger
 * /api/v1/user/fetch/{id}:
 *   get:
 *     summary: Get user by ID (public endpoint)
 *     tags: [User]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: User profile retrieved successfully
 */
userRouter.get('/fetch/:id', userController.fetchUser);

/**
 * @swagger
 * /api/v1/user/delete-account:
 *   delete:
 *     summary: Delete user account
 *     tags: [User]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Account deleted successfully
 */
userRouter.delete('/delete-account', supabaseAuthenticate, userController.deleteAccount);

/**
 * @swagger
 * /api/v1/user/new-client:
 *   post:
 *     summary: Handle new client signup
 *     tags: [User]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - coachId
 *             properties:
 *               coachId:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       200:
 *         description: Client profile ready
 */
userRouter.post('/new-client', supabaseAuthenticate, userController.newClient);

/**
 * @swagger
 * /api/v1/user/generate-avatar:
 *   post:
 *     summary: Generate default avatar for user
 *     description: Generates a default avatar for users without profile pictures (e.g., Apple OAuth)
 *     tags: [User]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userName
 *             properties:
 *               userName:
 *                 type: string
 *                 description: User's name for generating initials
 *     responses:
 *       200:
 *         description: Avatar generated successfully
 */
userRouter.post('/mark-connected', supabaseAuthenticate, userController.markConnected);

userRouter.post('/generate-avatar', supabaseAuthenticate, userController.generateAvatar);

/**
 * @swagger
 * /api/v1/user/seed-demo-data:
 *   post:
 *     summary: Seed demo client data for a new coach
 *     description: Creates a demo client with sample data for coaches to explore the platform. Idempotent - only seeds if no demo client exists.
 *     tags: [User]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Demo data seeded successfully (or already exists)
 */
userRouter.post('/seed-demo-data', supabaseAuthenticate, userController.seedDemoData);
