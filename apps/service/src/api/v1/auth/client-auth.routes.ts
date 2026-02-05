import { Router } from 'express';
import { clientAuthController } from './client-auth.controller';
import { validate } from '../../../middlewares/validate';
import { registrationRateLimiter, authCheckRateLimiter } from '../../../middlewares/rate-limit';
import { z } from 'zod';

// Client-specific schemas
const acceptInviteSchema = z.object({
    body: z.object({
        inviteCode: z.string().min(1, 'Invite code is required'),
        email: z.string().email('Valid email is required'),
        password: z.string().min(8, 'Password must be at least 8 characters'),
        name: z.string().min(1, 'Name is required'),
    }),
});

const verifyClientLoginSchema = z.object({
    body: z.object({
        email: z.string().email('Valid email is required'),
    }),
});

export const clientAuthRouter = Router();

/**
 * @swagger
 * /api/v1/auth/client/invite/{code}:
 *   get:
 *     summary: Get coach info by invite code
 *     tags: [Auth - Client]
 *     parameters:
 *       - in: path
 *         name: code
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Coach info retrieved
 */
clientAuthRouter.get('/invite/:code', clientAuthController.getCoachByInviteCode);

/**
 * @swagger
 * /api/v1/auth/client/accept-invite:
 *   post:
 *     summary: Accept invitation and create client account
 *     tags: [Auth - Client]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - inviteCode
 *               - email
 *               - password
 *               - name
 *             properties:
 *               inviteCode:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               name:
 *                 type: string
 *     responses:
 *       201:
 *         description: Client account created
 */
clientAuthRouter.post('/accept-invite', registrationRateLimiter, validate(acceptInviteSchema), clientAuthController.acceptInvite);

/**
 * @swagger
 * /api/v1/auth/client/verify:
 *   post:
 *     summary: Verify if email belongs to a client
 *     tags: [Auth - Client]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: Client verified
 */
clientAuthRouter.post('/verify', authCheckRateLimiter, validate(verifyClientLoginSchema), clientAuthController.verifyClientLogin);
