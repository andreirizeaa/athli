import { Router } from 'express';
import { requireAuth } from '../../../middlewares/auth';
import { intercomJWTController } from './intercom.controller';

export const intercomRouter = Router();

/**
 * @swagger
 * /api/v1/intercom/jwt:
 *   get:
 *     summary: Generate Intercom JWT token
 *     tags: [Intercom]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: JWT token generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 jwt:
 *                   type: string
 *                   description: Intercom JWT token
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User not found
 *       500:
 *         description: Failed to generate JWT token
 */
intercomRouter.get('/jwt', ...requireAuth, intercomJWTController);

