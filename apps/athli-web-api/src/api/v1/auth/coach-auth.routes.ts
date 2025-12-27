import { Router } from 'express';
import { coachAuthController } from './coach-auth.controller';
import { validate } from '../../../middlewares/validate';
import { registerSchema, googleAuthSchema } from './auth.schemas';

export const coachAuthRouter = Router();

/**
 * @swagger
 * /api/v1/auth/coach/register:
 *   post:
 *     summary: Register a new coach account
 *     tags: [Auth - Coach]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - name
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               name:
 *                 type: string
 *     responses:
 *       201:
 *         description: Coach registered successfully
 */
coachAuthRouter.post('/register', validate(registerSchema), coachAuthController.register);

/**
 * @swagger
 * /api/v1/auth/coach/google:
 *   post:
 *     summary: Google OAuth login/registration for coaches
 *     tags: [Auth - Coach]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - credential
 *             properties:
 *               credential:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 */
coachAuthRouter.post('/google', validate(googleAuthSchema), coachAuthController.googleAuth);
